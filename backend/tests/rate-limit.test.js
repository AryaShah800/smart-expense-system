import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { loginLimiter, verifyOtpLimiter } from "../middlewares/rateLimiters.js";

async function startApp() {
  const app = express();
  app.use(express.json());
  app.post("/login", loginLimiter(), (req, res) =>
    req.body.password === "right" ? res.json({ ok: true }) : res.status(400).json({ message: "Invalid credentials" })
  );
  app.post("/verify-otp", verifyOtpLimiter(), (req, res) => res.status(400).json({ message: "Invalid or expired OTP" }));
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://localhost:${server.address().port}`;
  const post = (path, body) =>
    fetch(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { post, stop: () => server.close() };
}

test("6th failed login within the window gets HTTP 429", async () => {
  const { post, stop } = await startApp();
  try {
    for (let i = 1; i <= 5; i++) {
      const res = await post("/login", { email: "a@x.com", password: "wrong" });
      assert.equal(res.status, 400, `attempt ${i} should reach the handler`);
    }
    const sixth = await post("/login", { email: "a@x.com", password: "wrong" });
    assert.equal(sixth.status, 429);
    assert.match((await sixth.json()).message, /Too many attempts/);
  } finally {
    stop();
  }
});

test("limits are per email, so one account's attempts don't block another", async () => {
  const { post, stop } = await startApp();
  try {
    for (let i = 0; i < 6; i++) await post("/login", { email: "a@x.com", password: "wrong" });
    const other = await post("/login", { email: "b@x.com", password: "wrong" });
    assert.equal(other.status, 400);
  } finally {
    stop();
  }
});

test("successful logins don't count toward the limit", async () => {
  const { post, stop } = await startApp();
  try {
    for (let i = 0; i < 10; i++) {
      const res = await post("/login", { email: "a@x.com", password: "right" });
      assert.equal(res.status, 200);
    }
  } finally {
    stop();
  }
});

test("OTP guesses are limited: the 6th attempt gets 429", async () => {
  const { post, stop } = await startApp();
  try {
    for (let i = 0; i < 5; i++) {
      assert.equal((await post("/verify-otp", { email: "a@x.com", otp: String(100000 + i) })).status, 400);
    }
    assert.equal((await post("/verify-otp", { email: "a@x.com", otp: "123456" })).status, 429);
  } finally {
    stop();
  }
});
