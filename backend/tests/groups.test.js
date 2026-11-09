import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../app.js";
import User from "../models/user.js";
import Group from "../models/Group.js";
import GroupExpense from "../models/GroupExpense.js";
import Settlement from "../models/Settlement.js";
import { startDb, stopDb, createUser } from "./helpers/setup.js";

before(startDb);
after(stopDb);

const cents = (n) => Math.round(n * 100);
const id = (u) => u.user._id.toString();

/** Creates a group owned by `admin`, with every `members` user joined through the join code. */
async function makeGroup(admin, members = [], name = "Flat 12") {
  const created = await admin.agent.post("/api/groups").send({ name, type: "Home" });
  assert.equal(created.status, 201);
  for (const m of members) {
    const joined = await m.agent.post("/api/groups/join").send({ joinCode: created.body.joinCode });
    assert.equal(joined.status, 200);
  }
  return created.body;
}

const addExpense = (u, group, body) => u.agent.post(`/api/groups/${group._id}/expenses`).send(body);
const balancesOf = async (u, group) => {
  const res = await u.agent.get(`/api/groups/${group._id}/splits`);
  assert.equal(res.status, 200);
  return { byName: Object.fromEntries(res.body.balances.map((b) => [b.username, b.balance])), settlements: res.body.settlements, raw: res.body };
};

/* ---------- membership ---------- */

test("create, join by code, duplicate join and bad code", async () => {
  const a = await createUser(app, { username: "gadmin" });
  const b = await createUser(app, { username: "gjoiner" });
  const group = await makeGroup(a, [b]);
  assert.ok(group.joinCode);
  assert.equal(group.adminId, id(a));

  assert.equal((await b.agent.post("/api/groups/join").send({ joinCode: group.joinCode })).status, 400, "already a member");
  assert.equal((await b.agent.post("/api/groups/join").send({ joinCode: "NOPE00" })).status, 404);
  assert.equal((await b.agent.post("/api/groups/join").send({})).status, 400);

  const mine = await b.agent.get("/api/groups");
  assert.equal(mine.body.length, 1);
  assert.equal(mine.body[0].members.length, 2);
});

test("invite by email, accept by group id; unknown, duplicate and outsider cases", async () => {
  const a = await createUser(app, { username: "inviter" });
  const b = await createUser(app, { username: "invitee" });
  const outsider = await createUser(app, { username: "outsider" });
  const group = await makeGroup(a);

  assert.equal((await outsider.agent.post(`/api/groups/${group._id}/invite`).send({ email: b.email })).status, 403);
  assert.equal((await a.agent.post(`/api/groups/${group._id}/invite`).send({ email: "nobody@test.dev" })).status, 404);
  assert.equal((await a.agent.post(`/api/groups/${group._id}/invite`).send({ email: b.email })).status, 200);
  assert.equal((await a.agent.post(`/api/groups/${group._id}/invite`).send({ email: b.email })).status, 400, "already invited");
  assert.equal((await a.agent.post(`/api/groups/${group._id}/invite`).send({ email: a.email })).status, 400, "already a member");

  assert.equal((await b.agent.get("/api/users/invitations")).body.length, 1);
  assert.equal((await outsider.agent.post("/api/groups/join").send({ groupId: group._id })).status, 403, "no invitation, no entry");
  assert.equal((await b.agent.post("/api/groups/join").send({ groupId: group._id })).status, 200);
  assert.equal((await b.agent.get("/api/users/invitations")).body.length, 0, "invitation consumed");
});

test("outsiders cannot read a group, its expenses, splits, ledger or categories", async () => {
  const a = await createUser(app, { username: "ownerx" });
  const outsider = await createUser(app, { username: "snoop" });
  const group = await makeGroup(a);
  for (const path of ["", "/expenses", "/splits", "/ledger", "/categories"]) {
    const res = await outsider.agent.get(`/api/groups/${group._id}${path}`);
    assert.equal(res.status, 403, `GET ${path || "/"} should be forbidden`);
  }
  assert.equal((await outsider.agent.get("/api/groups/not-an-id")).status, 400);
  assert.equal((await outsider.agent.get("/api/groups")).body.length, 0);
});

/* ---------- split maths ---------- */

test("equal split rounds to paise and the shares always add up to the total", async () => {
  const a = await createUser(app, { username: "eqa" });
  const b = await createUser(app, { username: "eqb" });
  const c = await createUser(app, { username: "eqc" });
  const group = await makeGroup(a, [b, c]);

  for (const total of [100, 10, 0.1, 99.99, 1000.01, 7]) {
    const res = await addExpense(a, group, { description: `t${total}`, amount: total, splitType: "equal" });
    assert.equal(res.status, 201, `amount ${total}`);
    const sum = res.body.splits.reduce((s, x) => s + cents(x.shareAmount), 0);
    assert.equal(sum, cents(total), `shares of ${total} must sum to the total`);
    assert.equal(res.body.splits.length, 3);
  }
  const hundred = await GroupExpense.findOne({ groupId: group._id, amount: 100 });
  assert.deepEqual(hundred.splits.map((s) => s.shareAmount).sort(), [33.33, 33.33, 33.34]);
});

test("equal split among a chosen subset only charges those people", async () => {
  const a = await createUser(app, { username: "suba" });
  const b = await createUser(app, { username: "subb" });
  const c = await createUser(app, { username: "subc" });
  const group = await makeGroup(a, [b, c]);
  const res = await addExpense(a, group, { description: "Cab", amount: 200, splitType: "equal", involvedUsers: [id(a), id(b)] });
  assert.equal(res.status, 201);
  assert.deepEqual(res.body.splits.map((s) => s.shareAmount), [100, 100]);
  const { byName } = await balancesOf(a, group);
  assert.equal(byName[c.user.username], 0);
});

test("percentage split converts percentages to amounts and must total 100%", async () => {
  const a = await createUser(app, { username: "pca" });
  const b = await createUser(app, { username: "pcb" });
  const c = await createUser(app, { username: "pcc" });
  const group = await makeGroup(a, [b, c]);
  const splits = (p) => [id(a), id(b), id(c)].map((userId, i) => ({ userId, shareAmount: p[i] }));

  const ok = await addExpense(a, group, { description: "Dinner", amount: 200, splitType: "percentage", splits: splits([50, 30, 20]) });
  assert.equal(ok.status, 201);
  assert.deepEqual(ok.body.splits.map((s) => s.shareAmount), [100, 60, 40]);

  assert.equal((await addExpense(a, group, { description: "x", amount: 200, splitType: "percentage", splits: splits([50, 30, 30]) })).status, 400);
  assert.equal((await addExpense(a, group, { description: "x", amount: 200, splitType: "percentage", splits: splits([120, -20, 0]) })).status, 400);
  assert.equal((await addExpense(a, group, { description: "x", amount: 200, splitType: "percentage", splits: [] })).status, 400);
});

test("exact split must match the total and cannot be negative", async () => {
  const a = await createUser(app, { username: "exa" });
  const b = await createUser(app, { username: "exb" });
  const group = await makeGroup(a, [b]);
  const split = (x, y) => [{ userId: id(a), shareAmount: x }, { userId: id(b), shareAmount: y }];

  assert.equal((await addExpense(a, group, { description: "Dinner", amount: 3000, splitType: "exact", splits: split(800, 2200) })).status, 201);
  assert.equal((await addExpense(a, group, { description: "Dinner", amount: 3000, splitType: "exact", splits: split(800, 2000) })).status, 400);
  assert.equal((await addExpense(a, group, { description: "Dinner", amount: 3000, splitType: "exact", splits: split(-100, 3100) })).status, 400);
});

test("expense validation: amount, description, split type and payer", async () => {
  const a = await createUser(app, { username: "vala" });
  const b = await createUser(app, { username: "valb" });
  const outsider = await createUser(app, { username: "valout" });
  const group = await makeGroup(a, [b]);
  const ok = { description: "x", amount: 10, splitType: "equal" };

  assert.equal((await addExpense(a, group, { ...ok, amount: 0 })).status, 400);
  assert.equal((await addExpense(a, group, { ...ok, amount: "abc" })).status, 400);
  assert.equal((await addExpense(a, group, { ...ok, amount: 5_000_000_000 })).status, 400);
  assert.equal((await addExpense(a, group, { ...ok, description: "" })).status, 400);
  assert.equal((await addExpense(a, group, { ...ok, splitType: "weird" })).status, 400);
  assert.equal((await addExpense(a, group, { ...ok, paidBy: id(outsider) })).status, 400, "payer must be a member");
  assert.equal((await addExpense(outsider, group, ok)).status, 403);
  assert.equal((await addExpense(a, { _id: "000000000000000000000009" }, ok)).status, 404);
});

test("splits cannot include people outside the group or the same person twice", async () => {
  const a = await createUser(app, { username: "ina" });
  const b = await createUser(app, { username: "inb" });
  const stranger = await createUser(app, { username: "stranger" });
  const group = await makeGroup(a, [b]);

  const equal = await addExpense(a, group, { description: "x", amount: 90, splitType: "equal", involvedUsers: [id(a), id(stranger)] });
  assert.equal(equal.status, 400, "equal split with a non-member");

  const exact = await addExpense(a, group, { description: "x", amount: 90, splitType: "exact", splits: [{ userId: id(a), shareAmount: 45 }, { userId: id(stranger), shareAmount: 45 }] });
  assert.equal(exact.status, 400, "exact split with a non-member");

  const pct = await addExpense(a, group, { description: "x", amount: 100, splitType: "percentage", splits: [{ userId: id(stranger), shareAmount: 100 }] });
  assert.equal(pct.status, 400, "percentage split with a non-member");

  const dup = await addExpense(a, group, { description: "x", amount: 100, splitType: "exact", splits: [{ userId: id(a), shareAmount: 50 }, { userId: id(a), shareAmount: 50 }] });
  assert.equal(dup.status, 400, "same person listed twice");

  const garbage = await addExpense(a, group, { description: "x", amount: 100, splitType: "exact", splits: [{ userId: "not-an-id", shareAmount: 100 }] });
  assert.equal(garbage.status, 400, "malformed user id");

  assert.equal(await GroupExpense.countDocuments({ groupId: group._id }), 0, "nothing was stored");
  assert.equal((await balancesOf(a, group)).byName[stranger.user.username], undefined);
});

/* ---------- balances and settle-up ---------- */

test("balances: payer is owed, others owe, and the total is always zero", async () => {
  const a = await createUser(app, { username: "bala" });
  const b = await createUser(app, { username: "balb" });
  const c = await createUser(app, { username: "balc" });
  const group = await makeGroup(a, [b, c]);
  await addExpense(a, group, { description: "Groceries", amount: 300, splitType: "equal" });

  const { byName, settlements } = await balancesOf(a, group);
  assert.equal(byName[a.user.username], 200);
  assert.equal(byName[b.user.username], -100);
  assert.equal(byName[c.user.username], -100);
  assert.equal(Object.values(byName).reduce((s, v) => s + cents(v), 0), 0);
  assert.deepEqual(settlements.map((s) => [s.from, s.to, s.amount]).sort(), [
    [b.user.username, a.user.username, 100],
    [c.user.username, a.user.username, 100],
  ].sort());
});

test("balances suggest the fewest transfers when several people paid", async () => {
  const a = await createUser(app, { username: "mina" });
  const b = await createUser(app, { username: "minb" });
  const c = await createUser(app, { username: "minc" });
  const group = await makeGroup(a, [b, c]);
  await addExpense(a, group, { description: "Hotel", amount: 90, splitType: "equal" });
  await addExpense(b, group, { description: "Fuel", amount: 60, splitType: "equal" });

  const { byName, settlements } = await balancesOf(c, group);
  assert.equal(byName[a.user.username], 40);
  assert.equal(byName[b.user.username], 10);
  assert.equal(byName[c.user.username], -50);
  assert.equal(settlements.length, 2, "C pays A and B; no one else needs to move money");
  assert.ok(settlements.every((s) => s.from === c.user.username));
  assert.equal(settlements.reduce((s, x) => s + cents(x.amount), 0), 5000);
});

test("settle-up with uneven paise clears every balance to exactly zero", async () => {
  const a = await createUser(app, { username: "seta" });
  const b = await createUser(app, { username: "setb" });
  const c = await createUser(app, { username: "setc" });
  const group = await makeGroup(a, [b, c]);
  await addExpense(a, group, { description: "Dinner", amount: 100, splitType: "equal" });

  let state = await balancesOf(a, group);
  assert.equal(state.byName[a.user.username], 66.66);
  assert.equal(state.byName[b.user.username], -33.33);

  const settle = (payer, payee, amount) => payer.agent.post(`/api/groups/${group._id}/settle`).send({ toUserId: id(payee), amount });
  assert.equal((await settle(b, a, 33.33)).status, 201);
  state = await balancesOf(a, group);
  assert.equal(state.byName[b.user.username], 0, "B is settled");
  assert.equal(state.byName[c.user.username], -33.33, "C is untouched");

  assert.equal((await settle(c, a, 33.33)).status, 201);
  state = await balancesOf(a, group);
  assert.ok(Object.values(state.byName).every((v) => v === 0), `all balances zero, got ${JSON.stringify(state.byName)}`);
  assert.deepEqual(state.settlements, []);
});

test("a creditor can also record that they were paid back", async () => {
  const a = await createUser(app, { username: "recv" });
  const b = await createUser(app, { username: "payr" });
  const group = await makeGroup(a, [b]);
  await addExpense(a, group, { description: "Rent", amount: 1000, splitType: "equal" });
  const res = await a.agent.post(`/api/groups/${group._id}/settle`).send({ fromUserId: id(b), toUserId: id(a), amount: 500 });
  assert.equal(res.status, 201);
  assert.equal((await balancesOf(a, group)).byName[b.user.username], 0);
});

test("settlement validation: amount, recipient, self, strangers and third parties", async () => {
  const a = await createUser(app, { username: "sva" });
  const b = await createUser(app, { username: "svb" });
  const c = await createUser(app, { username: "svc" });
  const outsider = await createUser(app, { username: "svout" });
  const group = await makeGroup(a, [b, c]);
  const settle = (u, body) => u.agent.post(`/api/groups/${group._id}/settle`).send(body);

  assert.equal((await settle(a, { toUserId: id(b), amount: 0 })).status, 400);
  assert.equal((await settle(a, { toUserId: id(b), amount: -5 })).status, 400);
  assert.equal((await settle(a, { amount: 10 })).status, 400, "recipient required");
  assert.equal((await settle(a, { toUserId: id(a), amount: 10 })).status, 400, "cannot pay yourself");
  assert.equal((await settle(a, { fromUserId: id(b), toUserId: id(c), amount: 10 })).status, 403, "you must be one of the two people");
  assert.equal((await settle(a, { toUserId: id(outsider), amount: 10 })).status, 400, "recipient must be a member");
  assert.equal((await settle(outsider, { toUserId: id(a), amount: 10 })).status, 403);
  assert.equal(await Settlement.countDocuments({ groupId: group._id }), 0);
});

/* ---------- expense and group lifecycle ---------- */

test("only the payer or the group admin can delete an expense", async () => {
  const admin = await createUser(app, { username: "dadmin" });
  const payer = await createUser(app, { username: "dpayer" });
  const other = await createUser(app, { username: "dother" });
  const group = await makeGroup(admin, [payer, other]);
  const make = async () => (await addExpense(payer, group, { description: "Snacks", amount: 30, splitType: "equal" })).body._id;

  const first = await make();
  assert.equal((await other.agent.delete(`/api/groups/expenses/${first}`)).status, 403);
  assert.equal((await payer.agent.delete(`/api/groups/expenses/${first}`)).status, 200);

  const second = await make();
  assert.equal((await admin.agent.delete(`/api/groups/expenses/${second}`)).status, 200);
  assert.equal((await admin.agent.delete(`/api/groups/expenses/${second}`)).status, 404);
});

test("adding an expense notifies the other members but not the payer", async () => {
  const a = await createUser(app, { username: "nota" });
  const b = await createUser(app, { username: "notb" });
  const group = await makeGroup(a, [b]);
  await addExpense(a, group, { description: "Pizza", amount: 40, splitType: "equal" });

  const bNotes = (await User.findById(b.user._id)).notifications.map((n) => n.message);
  const aNotes = (await User.findById(a.user._id)).notifications.map((n) => n.message);
  assert.ok(bNotes.some((m) => m.includes("Pizza")));
  assert.equal(aNotes.some((m) => m.includes("Pizza")), false);
  assert.equal((await b.agent.get("/api/users/notifications")).body.length >= 1, true);
  assert.equal((await b.agent.put("/api/users/notifications/read")).status, 200);
  assert.ok((await b.agent.get("/api/users/notifications")).body.every((n) => n.isRead));
});

test("ledger lists expenses and settlements for members", async () => {
  const a = await createUser(app, { username: "leda" });
  const b = await createUser(app, { username: "ledb" });
  const group = await makeGroup(a, [b]);
  await addExpense(a, group, { description: "Utilities", amount: 80, splitType: "equal" });
  await b.agent.post(`/api/groups/${group._id}/settle`).send({ toUserId: id(a), amount: 40 });

  const ledger = (await b.agent.get(`/api/groups/${group._id}/ledger`)).body;
  assert.equal(ledger.expenses.length, 1);
  assert.equal(ledger.settlements.length, 1);
  assert.equal(ledger.settlements[0].fromUser.username, b.user.username);
  const list = (await b.agent.get(`/api/groups/${group._id}/expenses`)).body;
  assert.equal(list[0].paidBy.username, a.user.username);
});

test("group categories: defaults are provided, members can add their own, duplicates are refused", async () => {
  const a = await createUser(app, { username: "gca" });
  const outsider = await createUser(app, { username: "gcout" });
  const group = await makeGroup(a);

  const first = await a.agent.get(`/api/groups/${group._id}/categories`);
  assert.equal(first.status, 200);
  assert.ok(first.body.some((c) => c.name === "Food & Drink" && c.isDefault));

  assert.equal((await a.agent.post(`/api/groups/${group._id}/categories`).send({ name: "Pets" })).status, 201);
  assert.equal((await a.agent.post(`/api/groups/${group._id}/categories`).send({ name: "Pets" })).status, 400);
  assert.equal((await outsider.agent.post(`/api/groups/${group._id}/categories`).send({ name: "Spy" })).status, 403);
  assert.ok((await a.agent.get(`/api/groups/${group._id}/categories`)).body.some((c) => c.name === "Pets"));
});

test("only the admin can delete a group, and deleting removes its expenses and settlements", async () => {
  const admin = await createUser(app, { username: "gdadmin" });
  const member = await createUser(app, { username: "gdmember" });
  const group = await makeGroup(admin, [member]);
  await addExpense(admin, group, { description: "Trip", amount: 100, splitType: "equal" });
  await member.agent.post(`/api/groups/${group._id}/settle`).send({ toUserId: id(admin), amount: 20 });

  assert.equal((await member.agent.delete(`/api/groups/${group._id}`)).status, 403);
  assert.equal((await admin.agent.delete(`/api/groups/${group._id}`)).status, 200);
  assert.equal(await Group.countDocuments({ _id: group._id }), 0);
  assert.equal(await GroupExpense.countDocuments({ groupId: group._id }), 0);
  assert.equal(await Settlement.countDocuments({ groupId: group._id }), 0);
  assert.equal((await admin.agent.delete(`/api/groups/${group._id}`)).status, 404);
});
