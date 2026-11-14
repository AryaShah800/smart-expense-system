/**
 * Creates (or resets) a single heavy-data user for load testing.
 *
 *   MONGO_URI=mongodb://127.0.0.1:27017/perf npm run seed:perf
 *
 * Non-destructive: it only touches the perf user and that user's data. Default categories
 * are created if missing. Re-running restores the same dataset (seeded PRNG).
 *
 * Env: PERF_TX (default 50000 transactions over the last 12 months), PERF_PASSWORD.
 */
import "../loadEnv.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/user.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import RecurringTransaction from "../models/RecurringTransaction.js";
import { seedDefaultCategories } from "../utils/seedDefaultCategories.js";

export const PERF_EMAIL = "perf@smartexpense.test";
export const PERF_PASSWORD = process.env.PERF_PASSWORD || "Perf@12345";
const TOTAL = Number(process.env.PERF_TX) || 50000;

const prng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set");
  await mongoose.connect(process.env.MONGO_URI);
  await seedDefaultCategories();

  const old = await User.findOne({ email: PERF_EMAIL });
  if (old) {
    await Promise.all([
      Transaction.deleteMany({ userId: old._id }),
      Budget.deleteMany({ userId: old._id }),
      RecurringTransaction.deleteMany({ userId: old._id }),
      Category.deleteMany({ user: old._id }),
    ]);
    await old.deleteOne();
  }

  const user = await User.create({
    username: "perf",
    email: PERF_EMAIL,
    password: await bcrypt.hash(PERF_PASSWORD, 10),
    isVerified: true,
  });

  const defaults = await Category.find({ user: null });
  const expense = defaults.filter((c) => c.type === "expense");
  const income = defaults.filter((c) => c.type === "income");
  const rand = prng(42);
  const pick = (list) => list[Math.floor(rand() * list.length)];

  const now = Date.now();
  const docs = [];
  for (let i = 0; i < TOTAL; i++) {
    const isIncome = rand() < 0.08;
    const cat = pick(isIncome ? income : expense);
    docs.push({
      userId: user._id,
      categoryId: cat._id,
      type: cat.type,
      amount: isIncome ? Math.round(20000 + rand() * 60000) : Math.round(20 + rand() * 2500),
      date: new Date(now - Math.floor(rand() * 365 * 24 * 3600 * 1000)),
      description: `${cat.name} #${i}`,
    });
  }
  for (let i = 0; i < docs.length; i += 5000) await Transaction.insertMany(docs.slice(i, i + 5000), { ordered: false });

  await Budget.insertMany(expense.slice(0, 4).map((c, i) => ({ userId: user._id, categoryId: c._id, amount: 5000 + i * 3000 })));
  await RecurringTransaction.create({
    userId: user._id, categoryId: expense[0]._id, type: "expense", amount: 999, description: "Streaming",
    frequency: "monthly", nextDueDate: new Date(now + 3 * 24 * 3600 * 1000), autoProcess: false,
  });

  console.log(`Seeded ${TOTAL} transactions for ${PERF_EMAIL} (password: ${PERF_PASSWORD})`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
