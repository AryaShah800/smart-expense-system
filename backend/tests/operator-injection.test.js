import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";
import Group from "../models/Group.js";
import { hasOperatorKey } from "../middlewares/rejectOperatorKeys.js";
import { startDb, stopDb, createUser } from "./helpers/setup.js";

before(startDb);
after(stopDb);

test("detects operator keys at any depth, including inside arrays", () => {
  assert.equal(hasOperatorKey({ email: "a@b.c" }), false);
  assert.equal(hasOperatorKey({ email: { $ne: null } }), true);
  assert.equal(hasOperatorKey({ splits: [{ user: "x", amount: { $gt: 0 } }] }), true);
  assert.equal(hasOperatorKey("plain"), false);
  assert.equal(hasOperatorKey(null), false);
});

test("an operator in the join code cannot join someone else's group", async () => {
  const owner = await createUser(app, { username: "privowner" });
  const outsider = await createUser(app, { username: "outsider" });
  const created = await owner.agent.post("/api/groups").send({ name: "Private", type: "Home" });
  assert.equal(created.status, 201);

  const res = await outsider.agent.post("/api/groups/join").send({ joinCode: { $ne: null } });
  assert.equal(res.status, 400);
  const group = await Group.findById(created.body._id);
  assert.ok(!group.members.some((m) => m.toString() === outsider.user._id.toString()));
});

test("a non-string group id is rejected before any query", async () => {
  const u = await createUser(app, { username: "badgid" });
  const res = await u.agent.post("/api/groups/join").send({ groupId: ["not", "an", "id"] });
  assert.equal(res.status, 400);
});

test("login with an operator instead of an email is rejected", async () => {
  const res = await request(app).post("/api/users/login").send({ email: { $ne: null }, password: { $ne: null } });
  assert.equal(res.status, 400);
});
