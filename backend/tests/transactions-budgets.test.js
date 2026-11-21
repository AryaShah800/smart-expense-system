import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../app.js";
import { startDb, stopDb, createUser, defaultCategory } from "./helpers/setup.js";

let alice, bob, food, salary;
before(async () => {
  await startDb();
  alice = await createUser(app, { username: "alice" });
  bob = await createUser(app, { username: "bob" });
  food = await defaultCategory("Food");
  salary = await defaultCategory("Salary");
});
after(stopDb);

const expense = (amount, extra = {}) => ({ type: "expense", amount, categoryId: food._id, description: "test", ...extra });

test("add transaction: valid expense is stored for the caller with a populated category", async () => {
  const res = await alice.agent.post("/api/transactions").send(expense(250, { description: "  lunch  " }));
  assert.equal(res.status, 201);
  assert.equal(res.body.amount, 250);
  assert.equal(res.body.description, "lunch");
  assert.equal(res.body.userId, alice.user._id.toString());
  assert.equal(res.body.categoryId.name, "Food");
});

test("add transaction: rejects bad type, non-positive amounts, unknown category and type mismatch", async () => {
  const post = (body) => alice.agent.post("/api/transactions").send(body);
  assert.equal((await post(expense(100, { type: "transfer" }))).status, 400);
  assert.equal((await post(expense(0))).status, 400);
  assert.equal((await post(expense(-5))).status, 400);
  assert.equal((await post(expense("abc"))).status, 400);
  assert.equal((await post(expense(2_000_000_000))).status, 400);
  assert.equal((await post(expense(10, { categoryId: "000000000000000000000009" }))).status, 400);
  const mismatch = await post({ type: "income", amount: 10, categoryId: food._id });
  assert.equal(mismatch.status, 400);
  assert.match(mismatch.body.message, /does not match/);
});

test("transactions require a session", async () => {
  const { default: request } = await import("supertest");
  assert.equal((await request(app).get("/api/transactions")).status, 401);
  assert.equal((await request(app).post("/api/transactions").send(expense(10))).status, 401);
});

test("list: filters by type, category and date range, newest first", async () => {
  const { agent } = await createUser(app, { username: "filterer" });
  await agent.post("/api/transactions").send(expense(10, { date: "2026-01-10" }));
  await agent.post("/api/transactions").send(expense(20, { date: "2026-02-10" }));
  await agent.post("/api/transactions").send({ type: "income", amount: 900, categoryId: salary._id, date: "2026-02-11" });

  const all = await agent.get("/api/transactions");
  assert.deepEqual(all.body.map((t) => t.amount), [900, 20, 10]);
  assert.deepEqual((await agent.get("/api/transactions").query({ type: "income" })).body.map((t) => t.amount), [900]);
  assert.deepEqual((await agent.get("/api/transactions").query({ categoryId: String(food._id) })).body.map((t) => t.amount), [20, 10]);
  const feb = await agent.get("/api/transactions").query({ startDate: "2026-02-01", endDate: "2026-02-28" });
  assert.deepEqual(feb.body.map((t) => t.amount), [900, 20]);
});

test("isolation: another user cannot see or delete my transactions", async () => {
  const mine = (await alice.agent.post("/api/transactions").send(expense(111, { description: "private" }))).body;
  const bobsList = await bob.agent.get("/api/transactions");
  assert.equal(bobsList.body.some((t) => t._id === mine._id), false);

  const del = await bob.agent.delete(`/api/transactions/${mine._id}`);
  assert.equal(del.status, 404);
  assert.equal((await alice.agent.get("/api/transactions")).body.some((t) => t._id === mine._id), true, "still there");

  assert.equal((await alice.agent.delete(`/api/transactions/${mine._id}`)).status, 200);
});

test("marking a transaction recurring also creates a linked recurring schedule", async () => {
  const { agent } = await createUser(app, { username: "recurrer" });
  // A future date, so GET /recurring doesn't treat the new schedule as already due and process it.
  const start = new Date();
  start.setDate(start.getDate() + 10);
  const expectedNext = new Date(start);
  expectedNext.setMonth(expectedNext.getMonth() + 1);

  const res = await agent.post("/api/transactions").send(expense(499, { date: start.toISOString(), isRecurring: true, frequency: "monthly" }));
  assert.equal(res.status, 201);
  const list = await agent.get("/api/recurring");
  assert.equal(list.body.recurring.length, 1);
  assert.equal(list.body.recurring[0].frequency, "monthly");
  assert.equal(new Date(list.body.recurring[0].nextDueDate).toISOString().slice(0, 10), expectedNext.toISOString().slice(0, 10));
});

test("isolation: one user's custom category cannot be used by another user", async () => {
  const custom = (await bob.agent.post("/api/categories").send({ name: "BobsSecretCategory", type: "expense", icon: "🤫", color: "#111111" })).body;
  assert.ok(custom._id);

  const tx = await alice.agent.post("/api/transactions").send(expense(50, { categoryId: custom._id }));
  assert.equal(tx.status, 400, "transactions must not use another user's category");

  const budget = await alice.agent.post("/api/budgets").send({ categoryId: custom._id, amount: 100 });
  assert.ok([400, 404].includes(budget.status), "budgets must not use another user's category");

  const rec = await alice.agent.post("/api/recurring").send({ type: "expense", amount: 10, categoryId: custom._id, description: "x" });
  assert.equal(rec.status, 400, "recurring items must not use another user's category");

  const seen = await alice.agent.get("/api/categories");
  assert.equal(seen.body.some((c) => c.name === "BobsSecretCategory"), false);
});

test("budgets: validation, upsert per category, and expense-only", async () => {
  const set = (body) => alice.agent.post("/api/budgets").send(body);
  assert.equal((await set({ categoryId: food._id, amount: 0 })).status, 400);
  assert.equal((await set({ categoryId: "000000000000000000000009", amount: 100 })).status, 404);
  const income = await set({ categoryId: salary._id, amount: 100 });
  assert.equal(income.status, 400);
  assert.match(income.body.message, /expense/);

  await set({ categoryId: food._id, amount: 1000 });
  await set({ categoryId: food._id, amount: 1500 });
  const budgets = await alice.agent.get("/api/budgets");
  const foodBudgets = budgets.body.filter((b) => b.categoryId._id === String(food._id));
  assert.equal(foodBudgets.length, 1, "setting again updates instead of duplicating");
  assert.equal(foodBudgets[0].amount, 1500);
});

test("budget status: spent, remaining and exceeded reflect this month's expenses only", async () => {
  const { agent } = await createUser(app, { username: "budgeter" });
  await agent.post("/api/budgets").send({ categoryId: food._id, amount: 400 });
  await agent.post("/api/transactions").send(expense(250));
  await agent.post("/api/transactions").send(expense(200));
  await agent.post("/api/transactions").send(expense(999, { date: "2020-01-01" })); // old, must not count

  const status = (await agent.get("/api/budgets/status")).body;
  assert.equal(status.length, 1);
  assert.equal(status[0].limit, 400);
  assert.equal(status[0].spent, 450);
  assert.equal(status[0].remaining, -50);
  assert.equal(status[0].exceeded, true);
});

test("isolation: budgets are per user", async () => {
  const mine = await createUser(app, { username: "budgetowner" });
  const other = await createUser(app, { username: "budgetpeeker" });
  await mine.agent.post("/api/budgets").send({ categoryId: food._id, amount: 777 });
  assert.equal((await other.agent.get("/api/budgets")).body.length, 0);
  assert.equal((await other.agent.get("/api/budgets/status")).body.length, 0);
});

test("categories: custom category creation and duplicate protection", async () => {
  const { agent } = await createUser(app, { username: "catmaker" });
  const created = await agent.post("/api/categories").send({ name: "Pets", type: "expense", icon: "🐶", color: "#fa0" });
  assert.equal(created.status, 201);
  assert.equal((await agent.post("/api/categories").send({ name: "Pets", type: "expense" })).status, 400);
  assert.equal((await agent.post("/api/categories").send({ name: "Food", type: "expense" })).status, 400, "cannot shadow a default");
  const names = (await agent.get("/api/categories")).body.map((c) => c.name);
  assert.ok(names.includes("Pets") && names.includes("Food"));
});
