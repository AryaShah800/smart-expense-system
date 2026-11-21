import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";
import User from "../models/user.js";
import Transaction from "../models/Transaction.js";
import { DEMO_EMAIL, FRIEND_EMAILS } from "../config/demo.js";
import { DEMO_PASSWORD } from "../scripts/seedDemo.js";
import { startDb, stopDb, stubEmail } from "./helpers/setup.js";

before(startDb);
after(stopDb);
beforeEach(() => {
  delete process.env.DEMO_MODE;
  delete process.env.DEMO_RESET_MINUTES;
});

test("demo mode is OFF by default: status says so and demo-login is a 404", async () => {
  assert.deepEqual((await request(app).get("/api/users/demo-status")).body, { enabled: false });
  const res = await request(app).post("/api/users/demo-login");
  assert.equal(res.status, 404);
  assert.equal(res.headers["set-cookie"], undefined);
});

test("with DEMO_MODE=true demo-login seeds the workspace and signs in without OTP", async () => {
  process.env.DEMO_MODE = "true";
  assert.deepEqual((await request(app).get("/api/users/demo-status")).body, { enabled: true });
  const agent = request.agent(app);
  const res = await agent.post("/api/users/demo-login");
  assert.equal(res.status, 200);
  assert.equal(res.body.email, DEMO_EMAIL);
  assert.equal(res.body.isDemo, true);
  const dash = await agent.get("/api/dashboard");
  assert.equal(dash.status, 200);
  assert.ok(dash.body.summary.totalIncome > 0);
});

test("demo accounts cannot sign in with their password (even with DEMO_MODE on)", async () => {
  process.env.DEMO_MODE = "true";
  for (const email of [DEMO_EMAIL, ...FRIEND_EMAILS]) {
    const res = await request(app).post("/api/users/login").send({ email, password: DEMO_PASSWORD });
    assert.equal(res.status, 403, email);
    assert.equal(res.headers["set-cookie"], undefined);
  }
});

test("the demo user cannot change email or password, but can change preferences", async () => {
  process.env.DEMO_MODE = "true";
  const agent = request.agent(app);
  await agent.post("/api/users/demo-login");
  for (const body of [{ email: "evil@x.com" }, { password: "NewPass123!" }]) {
    const res = await agent.put("/api/users/profile").send(body);
    assert.equal(res.status, 403);
  }
  const user = await User.findOne({ email: DEMO_EMAIL });
  assert.ok(user, "email unchanged");
  assert.equal((await agent.put("/api/users/profile").send({ theme: "dark" })).status, 200);
});

test("no email is ever sent for demo addresses (signup and resend-otp)", async () => {
  process.env.DEMO_MODE = "true";
  const mail = stubEmail();
  try {
    await request(app).post("/api/users/demo-login");
    const signup = await request(app).post("/api/users/signup").send({ username: "x", email: DEMO_EMAIL, password: "Passw0rd!" });
    assert.equal(signup.status, 403);
    const resend = await request(app).post("/api/users/resend-otp").send({ email: DEMO_EMAIL });
    assert.equal(resend.status, 403);
    assert.equal(mail.sent.length, 0);
  } finally {
    mail.restore();
  }
});

test("demo data is rebuilt when older than DEMO_RESET_MINUTES, and kept while fresh", async () => {
  process.env.DEMO_MODE = "true";
  await request(app).post("/api/users/demo-login");
  const demo = await User.findOne({ email: DEMO_EMAIL });
  await Transaction.create({ userId: demo._id, categoryId: (await Transaction.findOne({ userId: demo._id })).categoryId, type: "expense", amount: 1, description: "vandalism" });

  await request(app).post("/api/users/demo-login"); // still fresh: untouched
  assert.equal(await Transaction.countDocuments({ description: "vandalism" }), 1);

  await User.collection.updateOne({ email: DEMO_EMAIL }, { $set: { createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) } }); // bypass mongoose immutable timestamps
  await request(app).post("/api/users/demo-login"); // stale: reset
  assert.equal(await Transaction.countDocuments({ description: "vandalism" }), 0);
});

test("demo-login is rate limited per IP", async () => {
  process.env.DEMO_MODE = "true";
  let last;
  for (let i = 0; i < 12; i++) last = (await request(app).post("/api/users/demo-login")).status;
  assert.equal(last, 429);
});
