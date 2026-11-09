/**
 * Creates (or resets) the public demo account and its sample data.
 *
 * Safe to run against the production database: it only touches the four demo users
 * and the data that belongs to them. Real users, and the default categories, are never
 * modified or deleted. Re-running it restores the demo to a clean state.
 *
 *   npm run seed:demo
 *
 * Optional env: DEMO_PASSWORD (default "Demo@1234").
 */
import "../loadEnv.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/user.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import RecurringTransaction from "../models/RecurringTransaction.js";
import Group from "../models/Group.js";
import GroupExpense from "../models/GroupExpense.js";
import GroupCategory from "../models/GroupCategory.js";
import Settlement from "../models/Settlement.js";
import { seedDefaultCategories } from "../utils/seedDefaultCategories.js";

export const DEMO_EMAIL = "demo@smartexpense.app";
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "Demo@1234";
const FRIEND_EMAILS = ["rahul.demo@smartexpense.app", "sneha.demo@smartexpense.app", "priya.demo@smartexpense.app"];

// Small seeded PRNG so every run produces the same demo data.
const prng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const daysAgo = (n) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
};

const monthDay = (monthsBack, day) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsBack);
  d.setDate(day);
  return d;
};

async function resetDemoData() {
  const demoUsers = await User.find({ email: { $in: [DEMO_EMAIL, ...FRIEND_EMAILS] } }).select("_id");
  const ids = demoUsers.map((u) => u._id);
  if (!ids.length) return;

  const groups = await Group.find({ adminId: { $in: ids } }).select("_id");
  const groupIds = groups.map((g) => g._id);

  await Promise.all([
    Transaction.deleteMany({ userId: { $in: ids } }),
    Budget.deleteMany({ userId: { $in: ids } }),
    RecurringTransaction.deleteMany({ userId: { $in: ids } }),
    Category.deleteMany({ user: { $in: ids } }),
    GroupExpense.deleteMany({ groupId: { $in: groupIds } }),
    GroupCategory.deleteMany({ groupId: { $in: groupIds } }),
    Settlement.deleteMany({ groupId: { $in: groupIds } }),
    Group.deleteMany({ _id: { $in: groupIds } }),
  ]);
  await User.deleteMany({ _id: { $in: ids } });
}

export async function seedDemo() {
  await seedDefaultCategories();
  await resetDemoData();

  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const [me, rahul, sneha, priya] = await User.insertMany([
    { username: "Demo User", email: DEMO_EMAIL, password, isVerified: true },
    { username: "Rahul", email: FRIEND_EMAILS[0], password, isVerified: true },
    { username: "Sneha", email: FRIEND_EMAILS[1], password, isVerified: true },
    { username: "Priya", email: FRIEND_EMAILS[2], password, isVerified: true },
  ]);

  // Default (shared) categories plus three that belong only to the demo user.
  const defaults = await Category.find({ user: null });
  const cat = Object.fromEntries(defaults.map((c) => [c.name, c._id]));
  const custom = await Category.insertMany([
    { name: "Rent", type: "expense", icon: "🏠", color: "#6366f1", user: me._id },
    { name: "Transport", type: "expense", icon: "🚕", color: "#f59e0b", user: me._id },
    { name: "Groceries", type: "expense", icon: "🥦", color: "#10b981", user: me._id },
    { name: "Freelance", type: "income", icon: "💻", color: "#0ea5e9", user: me._id },
  ]);
  for (const c of custom) cat[c.name] = c._id;

  // ---- Personal transactions: 6 months, deterministic ----
  const rand = prng(2026);
  const tx = [];
  const add = (category, type, amount, date, description, extra = {}) =>
    tx.push({ userId: me._id, categoryId: cat[category], type, amount, date, description, ...extra });

  for (let m = 0; m < 6; m++) {
    add("Salary", "income", 55000, monthDay(m, 1), "Monthly salary");
    add("Rent", "expense", 12000, monthDay(m, 5), "Apartment rent");
    add("Bills", "expense", 1800 + Math.floor(rand() * 600), monthDay(m, 9), "Electricity and internet");
    add("Entertainment", "expense", 649, monthDay(m, 12), "Streaming subscription");
    if (m % 2 === 0) add("Freelance", "income", 8000 + Math.floor(rand() * 9000), monthDay(m, 20), "Freelance project");
  }
  for (let i = 0; i < 110; i++) {
    const r = rand();
    const date = daysAgo(Math.floor(rand() * 180));
    if (r < 0.42) add("Food", "expense", 80 + Math.floor(rand() * 520), date, rand() > 0.5 ? "Lunch" : "Dinner out");
    else if (r < 0.68) add("Groceries", "expense", 300 + Math.floor(rand() * 1500), date, "Weekly groceries");
    else if (r < 0.88) add("Transport", "expense", 40 + Math.floor(rand() * 260), date, "Cab / auto");
    else if (r < 0.96) add("Shopping", "expense", 400 + Math.floor(rand() * 3200), date, "Online order");
    else add("Travel", "expense", 1500 + Math.floor(rand() * 5000), date, "Weekend trip");
  }
  add("Bonus", "income", 20000, daysAgo(40), "Performance bonus");
  add("Shopping", "expense", 4500, daysAgo(3), "Headphones");
  await Transaction.insertMany(tx);

  // ---- Budgets (Food is over budget on purpose, so the alert states show) ----
  await Budget.insertMany([
    { userId: me._id, categoryId: cat.Food, amount: 6000 },
    { userId: me._id, categoryId: cat.Shopping, amount: 8000 },
    { userId: me._id, categoryId: cat.Transport, amount: 3000 },
    { userId: me._id, categoryId: cat.Groceries, amount: 7000 },
  ]);

  // ---- Recurring items, due next month so the 30-minute processor doesn't duplicate rows ----
  const nextMonth = (day) => monthDay(-1, day);
  await RecurringTransaction.insertMany([
    { userId: me._id, categoryId: cat.Salary, type: "income", amount: 55000, description: "Monthly salary", frequency: "monthly", startDate: monthDay(6, 1), nextDueDate: nextMonth(1) },
    { userId: me._id, categoryId: cat.Rent, type: "expense", amount: 12000, description: "Apartment rent", frequency: "monthly", startDate: monthDay(6, 5), nextDueDate: nextMonth(5) },
    { userId: me._id, categoryId: cat.Entertainment, type: "expense", amount: 649, description: "Streaming subscription", frequency: "monthly", startDate: monthDay(6, 12), nextDueDate: nextMonth(12), status: "paused" },
  ]);

  // ---- Groups: one equal-split home, one trip with an exact split ----
  const apartment = await Group.create({ name: "Apartment 404", type: "Home", adminId: me._id, members: [me._id, rahul._id, sneha._id] });
  const trip = await Group.create({ name: "Goa Trip", type: "Trip", adminId: rahul._id, members: [me._id, rahul._id, priya._id] });

  const equal = (amount, members) =>
    members.map((u) => ({ userId: u._id, shareAmount: amount / members.length }));

  await GroupExpense.insertMany([
    { groupId: apartment._id, description: "WiFi bill", amount: 900, paidBy: rahul._id, splitType: "equal", splits: equal(900, [me, rahul, sneha]) },
    { groupId: apartment._id, description: "Maid salary", amount: 1500, paidBy: me._id, splitType: "equal", splits: equal(1500, [me, rahul, sneha]) },
    { groupId: apartment._id, description: "Groceries run", amount: 2400, paidBy: sneha._id, splitType: "equal", splits: equal(2400, [me, rahul, sneha]) },
    { groupId: trip._id, description: "Hotel booking", amount: 12000, paidBy: priya._id, splitType: "equal", splits: equal(12000, [me, rahul, priya]) },
    {
      groupId: trip._id, description: "Seafood dinner", amount: 3000, paidBy: me._id, splitType: "exact",
      splits: [{ userId: me._id, shareAmount: 800 }, { userId: rahul._id, shareAmount: 1500 }, { userId: priya._id, shareAmount: 700 }],
    },
  ]);
  await Settlement.create({ groupId: apartment._id, fromUser: rahul._id, toUser: me._id, amount: 500 });

  await User.findByIdAndUpdate(me._id, {
    $push: {
      notifications: [
        { message: "Rahul added 'WiFi bill' to Apartment 404", isRead: false, createdAt: new Date() },
        { message: "Priya added 'Hotel booking' to Goa Trip", isRead: true, createdAt: daysAgo(1) },
      ],
    },
  });

  return { transactions: tx.length, email: DEMO_EMAIL };
}

// Run only when executed directly (so tests can import seedDemo without side effects).
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set");
    await mongoose.connect(process.env.MONGO_URI);
    const { transactions, email } = await seedDemo();
    console.log(`Demo ready: ${transactions} transactions. Log in as ${email} / ${DEMO_PASSWORD}`);
  } catch (error) {
    console.error("Demo seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
