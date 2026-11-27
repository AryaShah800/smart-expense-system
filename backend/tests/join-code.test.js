import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../app.js";
import { generateJoinCode } from "../models/Group.js";
import { startDb, stopDb, createUser } from "./helpers/setup.js";

before(startDb);
after(stopDb);

test("join codes are 8 characters from the unambiguous alphabet", () => {
  const codes = new Set();
  for (let i = 0; i < 500; i++) {
    const code = generateJoinCode();
    assert.match(code, /^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$/);
    codes.add(code);
  }
  assert.equal(codes.size, 500, "no repeats in a small sample");
});

test("guessing join codes is rate limited per user, and a correct code still works for others", async () => {
  const owner = await createUser(app, { username: "codeowner" });
  const guesser = await createUser(app, { username: "guesser" });
  const friend = await createUser(app, { username: "friend" });
  const group = (await owner.agent.post("/api/groups").send({ name: "Trip", type: "Trip" })).body;

  for (let i = 0; i < 20; i++) {
    const res = await guesser.agent.post("/api/groups/join").send({ joinCode: `WRONG${i}` });
    assert.equal(res.status, 404, `guess ${i + 1} reaches the handler`);
  }
  const blocked = await guesser.agent.post("/api/groups/join").send({ joinCode: group.joinCode });
  assert.equal(blocked.status, 429);

  const ok = await friend.agent.post("/api/groups/join").send({ joinCode: group.joinCode });
  assert.equal(ok.status, 200);
});
