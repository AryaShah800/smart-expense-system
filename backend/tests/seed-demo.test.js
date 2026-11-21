import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";
import User from "../models/user.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import Group from "../models/Group.js";
import Budget from "../models/Budget.js";
import RecurringTransaction from "../models/RecurringTransaction.js";
import { seedDemo, DEMO_EMAIL, DEMO_PASSWORD } from "../scripts/seedDemo.js";
import { startDb, stopDb, createUser, defaultCategory } from "./helpers/setup.js";

before(startDb);
after(stopDb);

test("seedDemo builds a demo account that can log in and has data to show", async () => {
  const { transactions } = await seedDemo();
  assert.ok(transactions > 100);

  const agent = request.agent(app);
  process.env.DEMO_MODE = "true";
  assert.equal((await agent.post("/api/users/demo-login")).status, 200);

  const dash = (await agent.get("/api/dashboard")).body;
  assert.ok(dash.summary.totalIncome > 0, "this month has income");
  assert.ok(dash.expenseByCategory.length > 0, "chart has categories");
  assert.equal(dash.recentTransactions.length, 5);

  assert.ok((await agent.get("/api/budgets")).body.length >= 3);
  const recurring = (await agent.get("/api/recurring")).body;
  assert.ok(recurring.recurring.length >= 3);
  assert.ok(recurring.recurring.some((r) => r.status === "paused"), "demo shows a paused item");

  const groups = (await agent.get("/api/groups")).body;
  assert.deepEqual(groups.map((g) => g.name).sort(), ["Apartment 404", "Goa Trip"]);
  for (const g of groups) {
    const splits = (await agent.get(`/api/groups/${g._id}/splits`)).body;
    const total = splits.balances.reduce((s, b) => s + Math.round(b.balance * 100), 0);
    assert.equal(total, 0, `${g.name} balances net to zero`);
  }
  assert.ok((await agent.get("/api/users/notifications")).body.length >= 2);
});

test("seedDemo can be re-run to reset the demo without duplicating anything", async () => {
  await seedDemo();
  const counts = async () => ({
    users: await User.countDocuments({ email: /demo@smartexpense\.app$/ }),
    tx: await Transaction.countDocuments({ userId: (await User.findOne({ email: DEMO_EMAIL }))._id }),
    groups: await Group.countDocuments({ name: { $in: ["Apartment 404", "Goa Trip"] } }),
  });
  const first = await counts();
  await seedDemo();
  assert.deepEqual(await counts(), first);
  assert.equal(first.users, 4);
});

test("seedDemo never touches real users or shared categories", async () => {
  const real = await createUser(app, { username: "realperson" });
  const food = await defaultCategory("Food");
  await real.agent.post("/api/transactions").send({ type: "expense", amount: 123, categoryId: food._id, description: "real data" });
  await real.agent.post("/api/budgets").send({ categoryId: food._id, amount: 999 });
  const sharedBefore = await Category.countDocuments({ user: null });

  await seedDemo();
  await seedDemo();

  assert.ok(await User.findById(real.user._id), "real user survives");
  assert.equal((await real.agent.get("/api/transactions")).body.length, 1);
  assert.equal(await Budget.countDocuments({ userId: real.user._id }), 1);
  assert.equal(await RecurringTransaction.countDocuments({ userId: real.user._id }), 0);
  assert.equal(await Category.countDocuments({ user: null }), sharedBefore, "shared categories unchanged");
  assert.equal((await real.agent.get("/api/users/me")).status, 200);
});

test("seeded spending spans months, avoids single-day spikes and has believable month-over-month changes", async () => {
  await seedDemo();
  const me = await User.findOne({ email: DEMO_EMAIL });
  const expenses = await Transaction.find({ userId: me._id, type: "expense" });
  const day = (d) => d.toISOString().slice(0, 10);

  const dates = expenses.map((t) => t.date.getTime());
  const spanDays = (Math.max(...dates) - Math.min(...dates)) / 86400000;
  assert.ok(spanDays >= 60, `spend should span at least 60 days, got ${Math.round(spanDays)}`);

  const total = expenses.reduce((s, t) => s + t.amount, 0);
  const perDay = {};
  for (const t of expenses) perDay[day(t.date)] = (perDay[day(t.date)] || 0) + t.amount;
  const biggest = Math.max(...Object.values(perDay));
  assert.ok(biggest / total <= 0.25, `no day should hold more than 25% of spend, got ${(biggest / total * 100).toFixed(1)}%`);

  // Last three complete calendar months: each month within 30% of the previous one.
  const now = new Date();
  const monthTotals = [3, 2, 1].map((back) => {
    const start = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - back + 1, 1);
    return expenses.filter((t) => t.date >= start && t.date < end).reduce((s, t) => s + t.amount, 0);
  });
  for (let i = 1; i < monthTotals.length; i++) {
    const change = Math.abs(monthTotals[i] - monthTotals[i - 1]) / monthTotals[i - 1];
    assert.ok(change <= 0.3, `month-over-month change ${(change * 100).toFixed(0)}% is outside the believable range`);
  }
});

test("demo categories match what they describe", async () => {
  await seedDemo();
  const me = await User.findOne({ email: DEMO_EMAIL });
  const named = async (description) => {
    const t = await Transaction.findOne({ userId: me._id, description });
    return (await Category.findById(t.categoryId)).name;
  };
  assert.equal(await named("Monthly salary"), "Salary");
  assert.equal(await named("Weekly groceries"), "Groceries");
  assert.equal(await named("Coffee and snacks"), "Food");
  assert.equal(await named("Apartment rent"), "Rent");
});
