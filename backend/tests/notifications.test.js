import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../app.js";
import User from "../models/user.js";
import { pushNotification, pushNotificationToMany, MAX_NOTIFICATIONS } from "../utils/pushNotification.js";
import { startDb, stopDb, createUser } from "./helpers/setup.js";

before(startDb);
after(stopDb);

test("only the newest notifications are kept", async () => {
  const { user } = await createUser(app, { username: "busy" });
  for (let i = 1; i <= MAX_NOTIFICATIONS + 5; i++) {
    await pushNotification(user._id, { message: `n${i}` });
  }
  const stored = (await User.findById(user._id)).notifications.map((n) => n.message);
  assert.equal(stored.length, MAX_NOTIFICATIONS);
  assert.equal(stored[0], "n6");
  assert.equal(stored.at(-1), `n${MAX_NOTIFICATIONS + 5}`);
});

test("the session user does not carry notifications or the OTP; the notifications endpoint still does", async () => {
  const { agent, user } = await createUser(app, { username: "lean" });
  await pushNotification(user._id, { message: "hello" });
  await User.updateOne({ _id: user._id }, { otp: "123456", otpExpires: new Date(Date.now() + 60_000) });

  const me = await agent.get("/api/users/me");
  assert.equal(me.status, 200);
  assert.equal(me.body.user.notifications, undefined);
  assert.equal(me.body.user.otp, undefined);
  assert.equal(me.body.user.password, undefined);

  const list = await agent.get("/api/users/notifications");
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.map((n) => n.message), ["hello"]);
});

test("one notification for several users is stored for each of them, still capped", async () => {
  const a = await createUser(app, { username: "manya" });
  const b = await createUser(app, { username: "manyb" });
  for (let i = 0; i < MAX_NOTIFICATIONS; i++) await pushNotification(a.user._id, { message: `old${i}` });

  await pushNotificationToMany([a.user._id, b.user._id], { message: "shared" });

  const [ua, ub] = await Promise.all([User.findById(a.user._id), User.findById(b.user._id)]);
  assert.equal(ua.notifications.length, MAX_NOTIFICATIONS);
  assert.equal(ua.notifications.at(-1).message, "shared");
  assert.deepEqual(ub.notifications.map((n) => n.message), ["shared"]);
});
