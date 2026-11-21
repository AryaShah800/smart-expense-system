import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import User from "../models/user.js";
import { startDb, stopDb, stubEmail, createUser } from "./helpers/setup.js";

const email = stubEmail();
before(startDb);
after(async () => {
  email.restore();
  await stopDb();
});

const cookieOf = (res) => (res.headers["set-cookie"] || []).find((c) => c.startsWith("jwt="));

test("signup creates an unverified user, emails an OTP and never returns it", async () => {
  const res = await request(app).post("/api/users/signup").send({ username: "newbie", email: "newbie@test.dev", password: "Passw0rd!" });
  assert.equal(res.status, 201);
  assert.equal(JSON.stringify(res.body).includes("otp"), false);
  const user = await User.findOne({ email: "newbie@test.dev" });
  assert.equal(user.isVerified, false);
  assert.notEqual(user.password, "Passw0rd!", "password must be hashed");
  assert.match(user.otp, /^\d{6}$/);
  assert.ok(email.sent.some((m) => m.to[0].email === "newbie@test.dev" && m.htmlContent.includes(user.otp)));
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

  const wrong = await request(app).post("/api/users/verify-otp").send({ email: user.email, otp: user.otp === "000000" ? "111111" : "000000" });
  assert.equal(wrong.status, 400);

  await User.updateOne({ _id: user._id }, { otpExpires: new Date(Date.now() - 1000) });
  const expired = await request(app).post("/api/users/verify-otp").send({ email: user.email, otp: user.otp });
  assert.equal(expired.status, 400);

  await User.updateOne({ _id: user._id }, { otpExpires: new Date(Date.now() + 60000) });
  const ok = await request(app).post("/api/users/verify-otp").send({ email: user.email, otp: user.otp });
  assert.equal(ok.status, 200);
  assert.equal("token" in ok.body, false, "JWT must not appear in the JSON body");
  assert.match(cookieOf(ok), /HttpOnly/i);
  assert.equal((await User.findById(user._id)).isVerified, true);
  assert.equal((await User.findById(user._id)).otp, undefined, "OTP is cleared once used");
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
  assert.match(after.otp, /^\d{6}$/);
  assert.ok(after.otpExpires > before.otpExpires - 1, "expiry is reset");
  assert.ok(email.sent.at(-1).htmlContent.includes(after.otp));

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
