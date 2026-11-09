import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { io as connect } from "socket.io-client";
import { registerSocketHandlers } from "../middlewares/socketAuth.js";

process.env.JWT_SECRET = "test-secret";

const userA = "000000000000000000000001";
const userB = "000000000000000000000002";
const tokenFor = (id, opts = { expiresIn: "1m" }) => jwt.sign({ _id: id }, process.env.JWT_SECRET, opts);

const waitFor = (socket, event, ms = 400) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload ?? true);
    });
  });

async function startServer() {
  const httpServer = createServer();
  const io = new Server(httpServer);
  registerSocketHandlers(io);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  const url = `http://localhost:${httpServer.address().port}`;
  const clients = [];
  const client = (options) => {
    const socket = connect(url, { forceNew: true, reconnection: false, ...options });
    clients.push(socket);
    return socket;
  };
  const stop = async () => {
    clients.forEach((c) => c.close());
    await io.close();
  };
  return { io, client, stop };
}

test("rejects a connection with no token", async () => {
  const { client, stop } = await startServer();
  try {
    const socket = client();
    const err = await waitFor(socket, "connect_error", 2000);
    assert.ok(err, "expected connect_error");
    assert.equal(socket.connected, false);
  } finally {
    await stop();
  }
});

test("rejects garbage and expired tokens", async () => {
  const { client, stop } = await startServer();
  try {
    const garbage = client({ auth: { token: "not-a-jwt" } });
    assert.ok(await waitFor(garbage, "connect_error", 2000));

    const expired = client({ auth: { token: tokenFor(userA, { expiresIn: -10 }) } });
    assert.ok(await waitFor(expired, "connect_error", 2000));

    const wrongSecret = client({ auth: { token: jwt.sign({ _id: userA }, "other-secret") } });
    assert.ok(await waitFor(wrongSecret, "connect_error", 2000));
  } finally {
    await stop();
  }
});

test("user receives their own notifications", async () => {
  const { io, client, stop } = await startServer();
  try {
    const socket = client({ auth: { token: tokenFor(userA) } });
    await waitFor(socket, "connect", 2000);
    const pending = waitFor(socket, "new_notification", 1000);
    io.to(userA).emit("new_notification", { message: "hi A" });
    assert.deepEqual(await pending, { message: "hi A" });
  } finally {
    await stop();
  }
});

test("a socket opened as another user receives nothing, even if it asks to join their room", async () => {
  const { io, client, stop } = await startServer();
  try {
    const attacker = client({ auth: { token: tokenFor(userB) } });
    await waitFor(attacker, "connect", 2000);
    attacker.emit("join_room", userA); // the old client-controlled event: must do nothing now
    await new Promise((r) => setTimeout(r, 100));

    const pending = waitFor(attacker, "new_notification", 400);
    io.to(userA).emit("new_notification", { message: "secret for A" });
    assert.equal(await pending, null);
  } finally {
    await stop();
  }
});

test("accepts the JWT from the httpOnly cookie", async () => {
  const { io, client, stop } = await startServer();
  try {
    const socket = client({ extraHeaders: { cookie: `jwt=${tokenFor(userA)}` } });
    await waitFor(socket, "connect", 2000);
    assert.equal(socket.connected, true);
    const pending = waitFor(socket, "new_notification", 1000);
    io.to(userA).emit("new_notification", { message: "via cookie" });
    assert.deepEqual(await pending, { message: "via cookie" });
  } finally {
    await stop();
  }
});
