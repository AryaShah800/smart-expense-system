import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../app.js";
import User from "../models/user.js";
import { startDb, stopDb, createUser } from "./helpers/setup.js";

before(startDb);
after(stopDb);

test("profile: update username, currency and theme; no password or token comes back", async () => {
  const { agent } = await createUser(app, { username: "profiler" });
  const res = await agent.put("/api/users/profile").send({ username: "Renamed", currency: "USD", theme: "dark" });
  assert.equal(res.status, 200);
  assert.equal(res.body.username, "Renamed");
  assert.equal(res.body.currency, "USD");
  assert.equal(res.body.theme, "dark");
  assert.equal("password" in res.body, false);
  assert.equal((await agent.get("/api/users/me")).body.user.theme, "dark");
});

test("profile update requires a session", async () => {
  const { default: request } = await import("supertest");
  assert.equal((await request(app).put("/api/users/profile").send({ username: "x" })).status, 401);
});

async function invited() {
  const admin = await createUser(app, { username: "invadmin" });
  const guest = await createUser(app, { username: "invguest" });
  const group = (await admin.agent.post("/api/groups").send({ name: "Trip", type: "Trip" })).body;
  await admin.agent.post(`/api/groups/${group._id}/invite`).send({ email: guest.email });
  return { admin, guest, group };
}

test("accepting an invitation joins the group and notifies the admin", async () => {
  const { admin, guest, group } = await invited();
  const res = await guest.agent.post("/api/users/invitations/respond").send({ groupId: group._id, action: "accept" });
  assert.equal(res.status, 200);
  assert.equal((await guest.agent.get("/api/groups")).body.length, 1);
  assert.equal((await guest.agent.get("/api/users/invitations")).body.length, 0);
  const notes = (await User.findById(admin.user._id)).notifications.map((n) => n.message);
  assert.ok(notes.some((m) => m.includes("accepted") && m.includes("Trip")));
});

test("rejecting an invitation removes it without joining", async () => {
  const { guest, group } = await invited();
  assert.equal((await guest.agent.post("/api/users/invitations/respond").send({ groupId: group._id, action: "reject" })).status, 200);
  assert.equal((await guest.agent.get("/api/groups")).body.length, 0);
  assert.equal((await guest.agent.get("/api/users/invitations")).body.length, 0);
});

test("invitation responses are validated", async () => {
  const { guest, group } = await invited();
  const stranger = await createUser(app, { username: "uninvited" });
  assert.equal((await stranger.agent.post("/api/users/invitations/respond").send({ groupId: group._id, action: "accept" })).status, 400, "no invitation");
  assert.equal((await guest.agent.post("/api/users/invitations/respond").send({ groupId: group._id, action: "maybe" })).status, 400);
  assert.equal((await guest.agent.get("/api/users/invitations")).body.length, 1, "invalid action leaves it pending");
});
