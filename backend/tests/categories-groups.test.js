import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../app.js";
import { startDb, stopDb, createUser } from "./helpers/setup.js";

before(startDb);
after(stopDb);

async function setup() {
  const member = await createUser(app, { username: "catmember" });
  const outsider = await createUser(app, { username: "catoutsider" });
  const group = (await member.agent.post("/api/groups").send({ name: "Private club", type: "General" })).body;
  return { member, outsider, group };
}

test("legacy group category endpoints: members can create and list", async () => {
  const { member, group } = await setup();
  const created = await member.agent.post("/api/categories/group").send({ groupId: group._id, name: "Snacks", color: "#f00" });
  assert.equal(created.status, 201);
  const list = await member.agent.get(`/api/categories/group/${group._id}`);
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.map((c) => c.name), ["Snacks"]);
});

test("legacy group category endpoints: outsiders can neither create nor read", async () => {
  const { member, outsider, group } = await setup();
  await member.agent.post("/api/categories/group").send({ groupId: group._id, name: "Secret plans" });

  assert.equal((await outsider.agent.post("/api/categories/group").send({ groupId: group._id, name: "Spam" })).status, 403);
  const read = await outsider.agent.get(`/api/categories/group/${group._id}`);
  assert.equal(read.status, 403, "category names of a private group must not leak");
  assert.equal(JSON.stringify(read.body).includes("Secret plans"), false);
});

test("legacy group category endpoints: unknown or malformed group ids", async () => {
  const { member } = await setup();
  assert.equal((await member.agent.post("/api/categories/group").send({ groupId: "000000000000000000000009", name: "x" })).status, 404);
  assert.equal((await member.agent.get("/api/categories/group/000000000000000000000009")).status, 404);
  assert.equal((await member.agent.get("/api/categories/group/not-an-id")).status, 400);
});
