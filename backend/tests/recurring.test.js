process.env.TZ = "UTC"; // date maths below is asserted in UTC so results don't depend on the machine
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../app.js";
import Transaction from "../models/Transaction.js";
import RecurringTransaction from "../models/RecurringTransaction.js";
import User from "../models/user.js";
import { calculateNextDueDate, processDueRecurring } from "../controllers/recurring.js";
import { startDb, stopDb, createUser, defaultCategory } from "./helpers/setup.js";

let food, salary;
before(async () => {
  await startDb();
  food = await defaultCategory("Food");
  salary = await defaultCategory("Salary");
});
after(stopDb);

const day = (d) => new Date(d).toISOString().slice(0, 10);
const daysFromNow = (n) => new Date(Date.now() + n * 86_400_000);

/* ---------- next due date ---------- */

test("calculateNextDueDate: daily, weekly, monthly, yearly", () => {
  assert.equal(day(calculateNextDueDate("2026-03-10", "daily")), "2026-03-11");
  assert.equal(day(calculateNextDueDate("2026-03-10", "weekly")), "2026-03-17");
  assert.equal(day(calculateNextDueDate("2026-03-10", "monthly")), "2026-04-10");
  assert.equal(day(calculateNextDueDate("2026-03-10", "yearly")), "2027-03-10");
  assert.equal(day(calculateNextDueDate("2026-12-15", "monthly")), "2027-01-15", "rolls over the year");
  assert.equal(day(calculateNextDueDate("2026-03-10", "bogus")), "2026-04-10", "unknown frequency falls back to monthly");
});

test("calculateNextDueDate: a bill on the 31st stays on the last day of shorter months", () => {
  assert.equal(day(calculateNextDueDate("2026-01-31", "monthly")), "2026-02-28");
  assert.equal(day(calculateNextDueDate("2028-01-31", "monthly")), "2028-02-29", "leap year");
  assert.equal(day(calculateNextDueDate("2026-04-30", "monthly")), "2026-05-30");
});

test("calculateNextDueDate: the anchor day prevents drift after a short month", () => {
  const feb = calculateNextDueDate("2026-01-31", "monthly", 31);
  assert.equal(day(feb), "2026-02-28");
  assert.equal(day(calculateNextDueDate(feb, "monthly", 31)), "2026-03-31", "back to the 31st, not the 28th");
  assert.equal(day(calculateNextDueDate("2028-02-29", "yearly", 29)), "2029-02-28");
  assert.equal(day(calculateNextDueDate("2029-02-28", "yearly", 29)), "2030-02-28");
});

/* ---------- processing ---------- */

async function dueItem(userId, overrides = {}) {
  return RecurringTransaction.create({
    userId, categoryId: food._id, type: "expense", amount: 500, description: "Gym",
    frequency: "monthly", startDate: daysFromNow(-40), nextDueDate: daysFromNow(-1), status: "active", ...overrides,
  });
}

test("processDueRecurring: creates one transaction for the due date, advances the schedule and notifies", async () => {
  const { user } = await createUser(app, { username: "proc" });
  const item = await dueItem(user._id);
  const dueDate = item.nextDueDate;

  const result = await processDueRecurring(user._id);
  assert.equal(result.processedCount, 1);

  const txs = await Transaction.find({ userId: user._id });
  assert.equal(txs.length, 1);
  assert.equal(txs[0].amount, 500);
  assert.equal(txs[0].isRecurring, true);
  assert.equal(txs[0].date.getTime(), dueDate.getTime());

  const after = await RecurringTransaction.findById(item._id);
  assert.ok(after.nextDueDate > new Date(), "next due date moved into the future");
  assert.ok(after.lastProcessedDate);

  const notified = await User.findById(user._id);
  assert.ok(notified.notifications.some((n) => n.message.includes("Gym")));
});

test("processDueRecurring is idempotent, even when two runs overlap", async () => {
  const { user } = await createUser(app, { username: "idem" });
  await dueItem(user._id, { description: "Rent", amount: 12000 });

  await Promise.allSettled([processDueRecurring(user._id), processDueRecurring(user._id)]);
  await processDueRecurring(user._id);

  assert.equal(await Transaction.countDocuments({ userId: user._id }), 1, "exactly one transaction per due date");
});

test("processDueRecurring skips paused schedules and picks them up again after resume", async () => {
  const { agent, user } = await createUser(app, { username: "pauser" });
  const item = await dueItem(user._id, { status: "paused" });

  await processDueRecurring(user._id);
  assert.equal(await Transaction.countDocuments({ userId: user._id }), 0);

  const resumed = await agent.put(`/api/recurring/${item._id}`).send({ status: "active" });
  assert.equal(resumed.status, 200);
  assert.equal(resumed.body.status, "active");
  await processDueRecurring(user._id);
  assert.equal(await Transaction.countDocuments({ userId: user._id }), 1);
});

test("processDueRecurring ignores schedules that are not due yet and other users' schedules when scoped", async () => {
  const a = await createUser(app, { username: "scopeA" });
  const b = await createUser(app, { username: "scopeB" });
  await dueItem(a.user._id, { nextDueDate: daysFromNow(5) });
  await dueItem(b.user._id);

  const result = await processDueRecurring(a.user._id);
  assert.equal(result.processedCount, 0);
  assert.equal(await Transaction.countDocuments({ userId: b.user._id }), 0, "scoped run must not touch user B");
});

/* ---------- HTTP API ---------- */

test("POST /recurring records the first instance now and schedules the next", async () => {
  const { agent } = await createUser(app, { username: "creator" });
  const start = daysFromNow(3);
  const res = await agent.post("/api/recurring").send({ type: "expense", amount: 799, categoryId: food._id, description: "Streaming", frequency: "monthly", startDate: start });
  assert.equal(res.status, 201);
  assert.equal(res.body.initialTransaction.amount, 799);
  assert.equal(res.body.recurring.status, "active");
  assert.equal(day(res.body.recurring.nextDueDate), day(calculateNextDueDate(start, "monthly")));
});

test("POST /recurring with createInitialTransaction=false schedules the start date itself", async () => {
  const { agent } = await createUser(app, { username: "noinitial" });
  const start = daysFromNow(4);
  const res = await agent.post("/api/recurring").send({ type: "income", amount: 1000, categoryId: salary._id, description: "Stipend", startDate: start, createInitialTransaction: false });
  assert.equal(res.status, 201);
  assert.equal(res.body.initialTransaction, null);
  assert.equal(day(res.body.recurring.nextDueDate), day(start));
});

test("POST /recurring validates amount, type, frequency and category", async () => {
  const { agent } = await createUser(app, { username: "validator" });
  const base = { type: "expense", amount: 10, categoryId: food._id, description: "x" };
  const post = (over) => agent.post("/api/recurring").send({ ...base, ...over });
  assert.equal((await post({ amount: 0 })).status, 400);
  assert.equal((await post({ amount: "abc" })).status, 400);
  assert.equal((await post({ type: "gift" })).status, 400);
  assert.equal((await post({ frequency: "hourly" })).status, 400);
  assert.equal((await post({ categoryId: "000000000000000000000009" })).status, 400);
});

test("GET /recurring summarises monthly commitments by frequency", async () => {
  const { agent, user } = await createUser(app, { username: "summary" });
  const base = { userId: user._id, startDate: new Date(), nextDueDate: daysFromNow(10), status: "active" };
  await RecurringTransaction.create([
    { ...base, categoryId: food._id, type: "expense", amount: 1000, description: "Rent", frequency: "monthly" },
    { ...base, categoryId: food._id, type: "expense", amount: 100, description: "Milk", frequency: "weekly" },
    { ...base, categoryId: food._id, type: "expense", amount: 1200, description: "Insurance", frequency: "yearly" },
    { ...base, categoryId: salary._id, type: "income", amount: 5000, description: "Pay", frequency: "monthly" },
    { ...base, categoryId: food._id, type: "expense", amount: 9999, description: "Old", frequency: "monthly", status: "paused" },
  ]);
  const { summary, recurring } = (await agent.get("/api/recurring")).body;
  assert.equal(recurring.length, 5);
  assert.equal(summary.activeCount, 4);
  assert.equal(summary.monthlyRecurringExpense, 1533, "1000 + 100*4.33 + 1200/12, paused item excluded");
  assert.equal(summary.monthlyRecurringIncome, 5000);
  assert.equal(summary.netRecurring, 3467);
});

test("PUT/DELETE /recurring: owner can change and remove; others get 404; history is kept", async () => {
  const owner = await createUser(app, { username: "owner" });
  const other = await createUser(app, { username: "intruder" });
  const created = (await owner.agent.post("/api/recurring").send({ type: "expense", amount: 300, categoryId: food._id, description: "Cable", startDate: daysFromNow(2) })).body.recurring;

  assert.equal((await other.agent.put(`/api/recurring/${created._id}`).send({ amount: 1 })).status, 404);
  assert.equal((await other.agent.delete(`/api/recurring/${created._id}`)).status, 404);

  const updated = await owner.agent.put(`/api/recurring/${created._id}`).send({ amount: 350, frequency: "weekly", description: "Cable + internet", status: "paused" });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.amount, 350);
  assert.equal(updated.body.frequency, "weekly");
  assert.equal(updated.body.status, "paused");
  assert.equal((await owner.agent.put(`/api/recurring/${created._id}`).send({ amount: -5 })).status, 400);

  assert.equal((await owner.agent.delete(`/api/recurring/${created._id}`)).status, 200);
  assert.equal(await RecurringTransaction.countDocuments({ _id: created._id }), 0);
  assert.equal(await Transaction.countDocuments({ userId: owner.user._id }), 1, "the already-recorded transaction stays");
});

test("POST /recurring/process runs the caller's due items on demand", async () => {
  const { agent, user } = await createUser(app, { username: "manual" });
  await dueItem(user._id);
  const res = await agent.post("/api/recurring/process");
  assert.equal(res.status, 200);
  assert.equal(res.body.processedCount, 1);
});
