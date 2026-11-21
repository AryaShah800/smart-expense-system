process.env.TZ = "UTC";
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../app.js";
import Budget from "../models/Budget.js";
import RecurringTransaction from "../models/RecurringTransaction.js";
import Transaction from "../models/Transaction.js";
import { startDb, stopDb, createUser, defaultCategory } from "./helpers/setup.js";

let food, shopping, salary;
before(async () => {
  await startDb();
  food = await defaultCategory("Food");
  shopping = await defaultCategory("Shopping");
  salary = await defaultCategory("Salary");
});
after(stopDb);

const now = () => new Date();
const lastMonth = (day = 15) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); d.setDate(day); return d; };
const daysFromNow = (n) => new Date(Date.now() + n * 86_400_000);

const tx = (user, category, type, amount, date, description = "") =>
  ({ userId: user._id, categoryId: category._id, type, amount, date, description });

/* ---------- dashboard ---------- */

test("dashboard for a new user is empty, not an error", async () => {
  const { agent } = await createUser(app, { username: "emptydash" });
  const res = await agent.get("/api/dashboard");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.summary, { totalIncome: 0, totalExpense: 0, balance: 0, savingsRate: 0 });
  assert.deepEqual(res.body.recentTransactions, []);
  assert.deepEqual(res.body.expenseByCategory, []);
  assert.deepEqual(res.body.insights, []);
});

test("dashboard requires a session", async () => {
  const { default: request } = await import("supertest");
  assert.equal((await request(app).get("/api/dashboard")).status, 401);
  assert.equal((await request(app).get("/api/dashboard/insights")).status, 401);
});

test("dashboard totals cover this month only; recent list covers all time; categories are this month's expenses", async () => {
  const { agent, user } = await createUser(app, { username: "totals" });
  await Transaction.create([
    tx(user, salary, "income", 1000, now()),
    tx(user, food, "expense", 200, now()),
    tx(user, food, "expense", 100, now()),
    tx(user, shopping, "expense", 50, now()),
    tx(user, food, "expense", 9999, lastMonth()),
    tx(user, salary, "income", 9999, lastMonth()),
  ]);
  const { summary, recentTransactions, expenseByCategory } = (await agent.get("/api/dashboard")).body;

  assert.equal(summary.totalIncome, 1000);
  assert.equal(summary.totalExpense, 350);
  assert.equal(summary.balance, 650);
  assert.equal(summary.savingsRate, 65);

  assert.equal(recentTransactions.length, 5, "limited to five");
  assert.ok(recentTransactions.every((t, i, all) => i === 0 || new Date(all[i - 1].date) >= new Date(t.date)), "newest first");
  assert.equal(recentTransactions[0].categoryId.name !== undefined, true);

  const byName = Object.fromEntries(expenseByCategory.map((c) => [c.name, c.total]));
  assert.deepEqual(byName, { Food: 300, Shopping: 50 });
  assert.ok(expenseByCategory.every((c) => c.color));
});

test("dashboard data is private to each user", async () => {
  const a = await createUser(app, { username: "privA" });
  const b = await createUser(app, { username: "privB" });
  await Transaction.create(tx(a.user, food, "expense", 500, now()));
  const res = (await b.agent.get("/api/dashboard")).body;
  assert.equal(res.summary.totalExpense, 0);
  assert.deepEqual(res.recentTransactions, []);
});

test("insights: surge, overall pace, top driver, savings, budget and upcoming bill", async () => {
  const { agent, user } = await createUser(app, { username: "insightful" });
  await Transaction.create([
    tx(user, food, "expense", 100, lastMonth()),
    tx(user, food, "expense", 300, now()),
    tx(user, shopping, "expense", 100, now()),
    tx(user, salary, "income", 1000, now()),
  ]);
  const budget = await Budget.create({ userId: user._id, categoryId: food._id, amount: 250 });
  await RecurringTransaction.create({ userId: user._id, categoryId: food._id, type: "expense", amount: 700, description: "Internet", frequency: "monthly", nextDueDate: daysFromNow(3), status: "active" });

  const insights = (await agent.get("/api/dashboard/insights")).body;
  const byId = Object.fromEntries(insights.map((i) => [i.id, i]));

  assert.equal(byId["cat-surge"].category, "Food");
  assert.equal(byId["cat-surge"].badge, "+200% vs last month");
  assert.equal(byId["overall-mom"].type, "warning");
  assert.equal(byId["top-driver"].badge, "75% of total");
  assert.equal(byId["savings-strong"].badge, "60% saved");
  assert.equal(byId[`budget-over-${budget._id}`].type, "danger");
  assert.match(byId["upcoming-recurring"].message, /Internet/);

  const fromDashboard = (await agent.get("/api/dashboard")).body.insights;
  assert.deepEqual(fromDashboard.map((i) => i.id).sort(), insights.map((i) => i.id).sort(), "dashboard embeds the same insights");
});

test("insights: spending more than income raises a cash-flow alert, not a savings badge", async () => {
  const { agent, user } = await createUser(app, { username: "deficit" });
  await Transaction.create([tx(user, salary, "income", 100, now()), tx(user, food, "expense", 500, now())]);
  const ids = (await agent.get("/api/dashboard/insights")).body.map((i) => i.id);
  assert.ok(ids.includes("savings-deficit"));
  assert.equal(ids.includes("savings-strong"), false);
});

/* ---------- monthly report ---------- */

const reportMonth = () => ({ month: now().getMonth() + 1, year: now().getFullYear() });

test("report: requires month and year, and sane values", async () => {
  const { agent } = await createUser(app, { username: "reportval" });
  assert.equal((await agent.get("/api/reports")).status, 400);
  assert.equal((await agent.get("/api/reports").query({ month: 3 })).status, 400);
  assert.equal((await agent.get("/api/reports").query({ month: 13, year: 2026 })).status, 400);
  assert.equal((await agent.get("/api/reports").query({ month: "x", year: 2026 })).status, 400);
});

test("report: lists that month's transactions for the caller only", async () => {
  const mine = await createUser(app, { username: "reportme" });
  const other = await createUser(app, { username: "reportother" });
  await Transaction.create([
    tx(mine.user, food, "expense", 42, now(), "Coffee"),
    tx(mine.user, food, "expense", 77, lastMonth(), "Old"),
    tx(other.user, food, "expense", 999, now(), "Not mine"),
  ]);
  const rows = (await mine.agent.get("/api/reports/monthly").query(reportMonth())).body;
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { date: now().toISOString().slice(0, 10), type: "expense", category: "Food", amount: 42, description: "Coffee" });
});

test("report CSV: header, content type, attachment name and quoting", async () => {
  const { agent, user } = await createUser(app, { username: "csvbasic" });
  await Transaction.create(tx(user, food, "expense", 10, now(), 'He said "hello", twice'));
  const { month, year } = reportMonth();
  const res = await agent.get("/api/reports").query({ month, year, format: "csv" });
  assert.equal(res.status, 200);
  assert.match(res.headers["content-type"], /text\/csv/);
  assert.match(res.headers["content-disposition"], new RegExp(`report-${year}-${month}\\.csv`));
  const [header, row] = res.text.split("\n");
  assert.equal(header, "date,type,category,amount,description");
  assert.ok(row.endsWith(',"He said ""hello"", twice"'), `quotes must be doubled, got: ${row}`);
});

test("report CSV: spreadsheet formulas in descriptions are neutralised", async () => {
  const { agent, user } = await createUser(app, { username: "csvformula" });
  await Transaction.create([
    tx(user, food, "expense", 1, now(), "=HYPERLINK(\"http://evil\",\"x\")"),
    tx(user, food, "expense", 2, now(), "+1+1"),
    tx(user, food, "expense", 3, now(), "@SUM(A1)"),
    tx(user, food, "expense", 4, now(), "-2+3"),
  ]);
  const { month, year } = reportMonth();
  const res = await agent.get("/api/reports").query({ month, year, format: "csv" });
  const cells = res.text.split("\n").slice(1).map((line) => line.split(",").slice(4).join(","));
  assert.equal(cells.length, 4);
  for (const cell of cells) assert.match(cell, /^"'[=+@-]/, `formula must be defused: ${cell}`);
});
