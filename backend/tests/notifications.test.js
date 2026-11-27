import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../app.js";
import User from "../models/user.js";
import { pushNotification, MAX_NOTIFICATIONS } from "../utils/pushNotification.js";
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
