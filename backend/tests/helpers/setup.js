import mongoose from "mongoose";
import bcrypt from "bcrypt";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "../../models/user.js";
import Category from "../../models/Category.js";
import Transaction from "../../models/Transaction.js";
import RecurringTransaction from "../../models/RecurringTransaction.js";
import { seedDefaultCategories } from "../../utils/seedDefaultCategories.js";

// Must be set before the app (and its auth/token code) handles any request.
process.env.JWT_SECRET = "test-secret-for-integration-tests";
process.env.NODE_ENV = "test";
delete process.env.ENABLE_DEBUG_OTP;

let mongod;

/** Starts an in-memory MongoDB, connects mongoose, builds indexes, seeds default categories. */
export async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all([Transaction.init(), RecurringTransaction.init(), User.init()]);
  await seedDefaultCategories();
}

export async function stopDb() {
  await mongoose.disconnect();
  await mongod?.stop();
}

/** Replaces fetch so signup/resend-otp never call Brevo. `.sent` holds captured emails; set `.failing = true` to simulate an outage. */
export function stubEmail() {
  const stub = { sent: [], failing: false, restore: () => { globalThis.fetch = realFetch; } };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes("brevo.com")) {
      if (stub.failing) return { ok: false, json: async () => ({ message: "provider down" }) };
      stub.sent.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({}) };
    }
    return realFetch(url, options);
  };
  return stub;
}

let counter = 0;
const uniqueEmail = (prefix) => `${prefix}${++counter}.${Date.now()}@test.dev`;

/**
 * Creates a verified user straight in the database, then logs in through the real
 * endpoint so the agent holds the httpOnly cookie. Returns { agent, user, email, password }.
 */
export async function createUser(app, { username = "tester", password = "Passw0rd!" } = {}) {
  const email = uniqueEmail(username);
  const user = await User.create({
    username: `${username}${counter}`,
    email,
    password: await bcrypt.hash(password, 4),
    isVerified: true,
  });
  const agent = request.agent(app);
  const res = await agent.post("/api/users/login").send({ email, password });
  if (res.status !== 200) throw new Error(`test login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, user, email, password };
}

/** A default (shared) category by name, for example "Food" or "Salary". */
export async function defaultCategory(name) {
  return Category.findOne({ name, user: null });
}
