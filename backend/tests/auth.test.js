import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import express from "express";
import app from "../app.js";
import User from "../models/user.js";
import { generateOtp, hashOtp, otpMatches } from "../utils/otp.js";
import { startDb, stopDb, stubEmail, createUser } from "./helpers/setup.js";

const email = stubEmail();
before(startDb);
after(async () => {
  email.restore();
  await stopDb();
});

const cookieOf = (res) => (res.headers["set-cookie"] || []).find((c) => c.startsWith("jwt="));
const emailedOtp = (addr) => email.sent.findLast((m) => m.to[0].email === addr).htmlContent.match(/\b\d{6}\b/)[0];

test("generateOtp always returns a six-digit string", () => {
  for (let i = 0; i < 1000; i++) assert.match(generateOtp(), /^[1-9]\d{5}$/);
});

test("otpMatches validates candidates and supports hashed and legacy codes", () => {
  const otp = "123456";
  assert.match(hashOtp(otp), /^[a-f0-9]{64}$/);
  for (const stored of [hashOtp(otp), otp]) {
    assert.equal(otpMatches(stored, otp), true);
    for (const candidate of [undefined, null, 123456, {}, [otp], "", "12345", "1234567", "abcdef", "123456\n", "654321"]) {
      assert.equal(otpMatches(stored, candidate), false);
    }
  }
  for (const stored of [undefined, null, 123456, {}, "", "12345", "g".repeat(64), "a".repeat(63)]) {
    assert.equal(otpMatches(stored, otp), false);
  }
});

test("signup creates an unverified user, emails an OTP and never returns it", async () => {
  const res = await request(app).post("/api/users/signup").send({ username: "newbie", email: "newbie@test.dev", password: "Passw0rd!" });
  assert.equal(res.status, 201);
  assert.equal(JSON.stringify(res.body).includes("otp"), false);
  const user = await User.findOne({ email: "newbie@test.dev" });
  assert.equal(user.isVerified, false);
  assert.notEqual(user.password, "Passw0rd!", "password must be hashed");
  const otp = emailedOtp(user.email);
  assert.notEqual(user.otp, otp);
  assert.match(user.otp, /^[a-f0-9]{64}$/);
  assert.equal(user.otp, hashOtp(otp));
});

test("signup rejects a duplicate email or username", async () => {
  await request(app).post("/api/users/signup").send({ username: "dupe", email: "dupe@test.dev", password: "Passw0rd!" });
  const res = await request(app).post("/api/users/signup").send({ username: "other", email: "dupe@test.dev", password: "Passw0rd!" });
  assert.equal(res.status, 400);
});

test("login is refused until the email is verified", async () => {
  await request(app).post("/api/users/signup").send({ username: "unverified", email: "unverified@test.dev", password: "Passw0rd!" });
  const res = await request(app).post("/api/users/login").send({ email: "unverified@test.dev", password: "Passw0rd!" });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /verify/i);
});

test("verify-otp rejects a wrong or expired code, and accepts the right one with a cookie only", async () => {
  await request(app).post("/api/users/signup").send({ username: "verifyme", email: "verifyme@test.dev", password: "Passw0rd!" });
  const user = await User.findOne({ email: "verifyme@test.dev" });
  const otp = emailedOtp(user.email);
  assert.notEqual(user.otp, otp);
  assert.match(user.otp, /^[a-f0-9]{64}$/);

  const wrong = await request(app).post("/api/users/verify-otp").send({ email: user.email, otp: "000000" });
  assert.equal(wrong.status, 400);

  await User.updateOne({ _id: user._id }, { otpExpires: new Date(Date.now() - 1000) });
  const expired = await request(app).post("/api/users/verify-otp").send({ email: user.email, otp });
  assert.equal(expired.status, 400);

  await User.updateOne({ _id: user._id }, { otpExpires: new Date(Date.now() + 60000) });
  const ok = await request(app).post("/api/users/verify-otp").send({ email: user.email, otp });
  assert.equal(ok.status, 200);
  assert.equal("token" in ok.body, false, "JWT must not appear in the JSON body");
  assert.match(cookieOf(ok), /HttpOnly/i);
  assert.equal((await User.findById(user._id)).isVerified, true);
  assert.equal((await User.findById(user._id)).otp, undefined, "OTP is cleared once used");
  assert.equal((await User.findById(user._id)).otpExpires, undefined, "OTP expiry is cleared once used");
});

test("verify-otp accepts a pending legacy plaintext code", async () => {
  await User.create({ username: "legacy", email: "legacy@test.dev", password: "unused", otp: "123456", otpExpires: new Date(Date.now() + 60000) });
  const res = await request(app).post("/api/users/verify-otp").send({ email: "legacy@test.dev", otp: "123456" });
  assert.equal(res.status, 200);
  assert.equal((await User.findOne({ email: "legacy@test.dev" })).otp, undefined);
});

test("login sets an httpOnly cookie, returns no token, and /me works with it", async () => {
  const { agent, email: addr } = await createUser(app);
  const me = await agent.get("/api/users/me");
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, addr);
  assert.equal("password" in me.body.user, false);

  const fresh = await request(app).post("/api/users/login").send({ email: addr, password: "Passw0rd!" });
  assert.equal("token" in fresh.body, false);
  assert.match(cookieOf(fresh), /HttpOnly/i);
});

test("wrong password and unknown email give the same message (no account enumeration)", async () => {
  const { email: addr } = await createUser(app);
  const wrongPw = await request(app).post("/api/users/login").send({ email: addr, password: "nope" });
  const unknown = await request(app).post("/api/users/login").send({ email: "ghost@test.dev", password: "nope" });
  assert.equal(wrongPw.status, 400);
  assert.equal(unknown.status, 400);
  assert.equal(wrongPw.body.message, unknown.body.message);
});

test("protected routes return 401 without a cookie or with a forged one", async () => {
  assert.equal((await request(app).get("/api/users/me")).status, 401);
  const forged = jwt.sign({ _id: "000000000000000000000001" }, "wrong-secret");
  assert.equal((await request(app).get("/api/users/me").set("Cookie", `jwt=${forged}`)).status, 401);
});

test("logout clears the cookie and the session stops working", async () => {
  const { agent } = await createUser(app);
  const out = await agent.post("/api/users/logout");
  assert.equal(out.status, 200);
  assert.match(cookieOf(out), /jwt=;/);
  assert.equal((await agent.get("/api/users/me")).status, 401);
});

test("the 6th failed login for an account is rate limited with HTTP 429", async () => {
  const { email: addr } = await createUser(app);
  for (let i = 1; i <= 5; i++) {
    assert.equal((await request(app).post("/api/users/login").send({ email: addr, password: "bad" })).status, 400);
  }
  const sixth = await request(app).post("/api/users/login").send({ email: addr, password: "bad" });
  assert.equal(sixth.status, 429);
  // even the right password is blocked while the window is full
  assert.equal((await request(app).post("/api/users/login").send({ email: addr, password: "Passw0rd!" })).status, 429);
});

test("OTP guessing is rate limited", async () => {
  await request(app).post("/api/users/signup").send({ username: "guessed", email: "guessed@test.dev", password: "Passw0rd!" });
  const statuses = [];
  for (let i = 0; i < 6; i++) {
    statuses.push((await request(app).post("/api/users/verify-otp").send({ email: "guessed@test.dev", otp: String(100000 + i) })).status);
  }
  assert.deepEqual(statuses.slice(0, 5), [400, 400, 400, 400, 400]);
  assert.equal(statuses[5], 429);
});

test("socket-token is a short-lived JWT for the caller and needs a session", async () => {
  assert.equal((await request(app).get("/api/users/socket-token")).status, 401);
  const { agent, user } = await createUser(app);
  const res = await agent.get("/api/users/socket-token");
  assert.equal(res.status, 200);
  const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
  assert.equal(decoded._id, user._id.toString());
  assert.ok(decoded.exp - decoded.iat <= 120, "token should live 2 minutes at most");
});

test("the debug OTP route does not exist unless explicitly enabled", async () => {
  const res = await request(app).get("/api/users/debug/otp").query({ email: "newbie@test.dev" });
  assert.equal(res.status, 404);
});

test("debug OTP returns the last emailed code only when enabled and clears it after verification", async () => {
  process.env.ENABLE_DEBUG_OTP = "true";
  try {
    const { default: routes } = await import("../routes/user.js?debug-otp-test");
    const debugApp = express();
    debugApp.use(express.json());
    debugApp.use("/api/users", routes);
    const addr = "debug@test.dev";
    // Codes created while debug mode was disabled were never cached.
    const uncached = await request(debugApp).get("/api/users/debug/otp").query({ email: "newbie@test.dev" });
    assert.equal(uncached.status, 200);
    assert.equal(uncached.body.otp, undefined);
    assert.equal((await request(debugApp).post("/api/users/signup").send({ username: "debug", email: addr, password: "Passw0rd!" })).status, 201);
    for (let i = 0; i < 2; i++) {
      const res = await request(debugApp).get("/api/users/debug/otp").query({ email: addr });
      assert.equal(res.status, 200);
      assert.equal(res.body.otp, emailedOtp(addr));
      assert.notEqual((await User.findOne({ email: addr })).otp, res.body.otp);
      if (i === 0) assert.equal((await request(debugApp).post("/api/users/resend-otp").send({ email: addr })).status, 200);
    }
    assert.equal((await request(debugApp).post("/api/users/verify-otp").send({ email: addr, otp: emailedOtp(addr) })).status, 200);
    const cleared = await request(debugApp).get("/api/users/debug/otp").query({ email: addr });
    assert.equal(cleared.body.otp, undefined);
    delete process.env.ENABLE_DEBUG_OTP;
    assert.equal((await request(debugApp).get("/api/users/debug/otp").query({ email: addr })).status, 404);
  } finally {
    delete process.env.ENABLE_DEBUG_OTP;
  }
});

test("responses carry security headers and oversized bodies are rejected", async () => {
  const res = await request(app).get("/");
  assert.equal(res.headers["x-content-type-options"], "nosniff");
  assert.equal(res.headers["x-powered-by"], undefined);
  const big = await request(app).post("/api/users/login").send({ email: "a@b.c", password: "x".repeat(60 * 1024) });
  assert.equal(big.status, 413);
});

test("signup fails cleanly and creates no account when the email provider is down", async () => {
  email.failing = true;
  try {
    const res = await request(app).post("/api/users/signup").send({ username: "nomail", email: "nomail@test.dev", password: "Passw0rd!" });
    assert.equal(res.status, 500);
    assert.equal(await User.countDocuments({ email: "nomail@test.dev" }), 0, "no half-created, unverifiable account");
  } finally {
    email.failing = false;
  }
});

test("resend-otp issues a fresh code for unverified users only", async () => {
  await request(app).post("/api/users/signup").send({ username: "resender", email: "resender@test.dev", password: "Passw0rd!" });
  const before = await User.findOne({ email: "resender@test.dev" });
  const sentBefore = email.sent.length;

  const res = await request(app).post("/api/users/resend-otp").send({ email: "resender@test.dev" });
  assert.equal(res.status, 200);
  assert.equal(email.sent.length, sentBefore + 1);
  const after = await User.findOne({ email: "resender@test.dev" });
  const otp = emailedOtp(after.email);
  assert.notEqual(after.otp, otp);
  assert.match(after.otp, /^[a-f0-9]{64}$/);
  assert.equal(after.otp, hashOtp(otp));
  assert.ok(after.otpExpires > before.otpExpires - 1, "expiry is reset");
  assert.equal((await request(app).post("/api/users/verify-otp").send({ email: after.email, otp })).status, 200);

  assert.equal((await request(app).post("/api/users/resend-otp").send({ email: "ghost@test.dev" })).status, 400);
  const { email: verifiedEmail } = await createUser(app);
  assert.equal((await request(app).post("/api/users/resend-otp").send({ email: verifiedEmail })).status, 400, "already verified");
});

test("resend-otp is rate limited per account", async () => {
  await request(app).post("/api/users/signup").send({ username: "spammed", email: "spammed@test.dev", password: "Passw0rd!" });
  const statuses = [];
  for (let i = 0; i < 6; i++) statuses.push((await request(app).post("/api/users/resend-otp").send({ email: "spammed@test.dev" })).status);
  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
});
