import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Group from "../models/Group.js";
import GroupExpense from "../models/GroupExpense.js";
import Settlement from "../models/Settlement.js";
import Category from "../models/Category.js";
import { startDb, stopDb } from "./helpers/setup.js";

before(startDb);
after(stopDb);

const keysOf = async (Model) => {
  await Model.init();
  return (await Model.collection.indexes()).map((i) => JSON.stringify(i.key));
};

test("the collections behind group and category pages have their indexes", async () => {
  assert.ok((await keysOf(GroupExpense)).includes(JSON.stringify({ groupId: 1, createdAt: -1 })));
  assert.ok((await keysOf(Settlement)).includes(JSON.stringify({ groupId: 1, createdAt: -1 })));
  assert.ok((await keysOf(Group)).includes(JSON.stringify({ members: 1, createdAt: -1 })));
  assert.ok((await keysOf(Category)).includes(JSON.stringify({ user: 1, type: 1, name: 1 })));
});

test("listing a user's groups uses the index instead of scanning the collection", async () => {
  await Group.init();
  const plan = await Group.find({ members: new mongoose.Types.ObjectId() }).sort({ createdAt: -1 }).explain("queryPlanner");
  const winning = JSON.stringify((Array.isArray(plan) ? plan[0] : plan).queryPlanner.winningPlan);
  assert.match(winning, /IXSCAN/);
  assert.doesNotMatch(winning, /COLLSCAN/);
});
