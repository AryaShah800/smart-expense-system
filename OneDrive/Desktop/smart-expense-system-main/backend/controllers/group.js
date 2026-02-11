import mongoose from "mongoose";
import Group from "../models/Group.js";
import GroupExpense from "../models/GroupExpense.js";
import Category from "../models/Category.js";
import User from "../models/user.js";
import Settlement from "../models/Settlement.js";


/* ===================== CREATE GROUP ===================== */
export const createGroup = async (req, res) => {
  try {
    const { name, type } = req.body;

    const group = new Group({
      name,
      type,
      adminId: req.user._id,
      members: [req.user._id]
    });

    await group.save();
    res.status(201).json(group);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/* ===================== GET MY GROUPS ===================== */
export const getGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      members: req.user._id
    }).populate("members", "username email");

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ===================== GET SINGLE GROUP (🔥 NEW FIX) ===================== */
export const getGroupDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const group = await Group.findById(id)
      .populate("members", "username email")
      .populate("adminId", "username email");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Ensure user is member
    if (!group.members.some(m => m._id.equals(req.user._id))) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ===================== INVITE MEMBER ===================== */
export const inviteMember = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { email } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!group.members.some(m => m.equals(req.user._id))) {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not registered" });
    }

    if (group.members.includes(user._id)) {
      return res.status(400).json({ message: "User already in group" });
    }

    group.members.push(user._id);
    await group.save();

    res.json({
      message: "User added to group",
      user: {
        id: user._id,
        email: user.email,
        username: user.username
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/* ===================== ADD GROUP EXPENSE ===================== */
export const addGroupExpense = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { description, amount, splitType, splits } = req.body;

    if (!description || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid expense data" });
    }

    const group = await Group.findById(groupId).populate("members");
    if (!group) return res.status(404).json({ message: "Group not found" });

    // ✅ Check if user is group member
    if (!group.members.some(m => m._id.equals(req.user._id))) {
      return res.status(403).json({ message: "Access denied" });
    }

    const memberIds = group.members.map(m => m._id.toString());
    let finalSplits = [];

    // ===============================
    // 🔥 EQUAL SPLIT
    // ===============================
    if (splitType === "equal") {
      const share = amount / memberIds.length;

      finalSplits = memberIds.map(userId => ({
        userId,
        shareAmount: share
      }));
    }

    // ===============================
    // 🔥 PERCENTAGE SPLIT
    // ===============================
    else if (splitType === "percentage") {

      const totalPercent = splits.reduce(
        (sum, s) => sum + Number(s.shareAmount),
        0
      );

      if (totalPercent !== 100) {
        return res.status(400).json({
          message: "Total percentage must be 100%"
        });
      }

      finalSplits = splits.map(s => ({
        userId: s.userId,
        shareAmount: (amount * Number(s.shareAmount)) / 100
      }));
    }

    // ===============================
    // 🔥 EXACT SPLIT
    // ===============================
    else if (splitType === "exact") {

      const totalExact = splits.reduce(
        (sum, s) => sum + Number(s.shareAmount),
        0
      );

      if (Number(totalExact.toFixed(2)) !== Number(amount.toFixed(2))) {
        return res.status(400).json({
          message: "Exact amounts must match total"
        });
      }

      finalSplits = splits;
    }

    else {
      return res.status(400).json({ message: "Invalid split type" });
    }

    const expense = new GroupExpense({
      groupId,
      description,
      amount,
      paidBy: req.user._id,
      splitType,
      splits: finalSplits
    });

    await expense.save();

    res.status(201).json(expense);

  } catch (error) {
    console.error("ADD EXPENSE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};



/* ===================== GET GROUP SPLITS ===================== */
export const getGroupSplits = async (req, res) => {
  try {
    const { id: groupId } = req.params;

    const group = await Group.findById(groupId).populate("members");
    if (!group) return res.status(404).json({ message: "Group not found" });

    const expenses = await GroupExpense.find({ groupId })
      .populate("paidBy", "username");

    const balancesMap = {};

    // Initialize balances
    group.members.forEach(member => {
      balancesMap[member._id.toString()] = 0;
    });

    // Calculate balances
    expenses.forEach(exp => {
      const payerId = exp.paidBy._id.toString();
      balancesMap[payerId] += exp.amount;

      exp.splits.forEach(split => {
        const uid = split.userId.toString();
        balancesMap[uid] -= split.shareAmount;
      });
    });

    // 🔥 APPLY SETTLEMENTS
    const settlementsDB = await Settlement.find({ groupId });

    settlementsDB.forEach(s => {
      const fromId = s.fromUser.toString();
      const toId = s.toUser.toString();

      if (!balancesMap[fromId]) balancesMap[fromId] = 0;
      if (!balancesMap[toId]) balancesMap[toId] = 0;

      balancesMap[fromId] += s.amount;
      balancesMap[toId] -= s.amount;
    });


    // Convert to array
    const balances = await Promise.all(
      Object.keys(balancesMap).map(async (userId) => {
        const user = await User.findById(userId);
        return {
          userId,
          username: user.username,
          balance: Number(balancesMap[userId].toFixed(2))
        };
      })
    );

    // ===============================
    // 🔥 Settlement Engine
    // ===============================

    const debtors = balances
      .filter(b => b.balance < 0)
      .map(b => ({ ...b, balance: Math.abs(b.balance) }));

    const creditors = balances
      .filter(b => b.balance > 0);

    const settlements = [];

    debtors.forEach(debtor => {
      creditors.forEach(creditor => {

        if (debtor.balance === 0) return;
        if (creditor.balance === 0) return;

        const payAmount = Math.min(debtor.balance, creditor.balance);

        settlements.push({
          from: debtor.username,
          to: creditor.username,
          amount: payAmount
        });

        debtor.balance -= payAmount;
        creditor.balance -= payAmount;
      });
    });

    res.json({ balances, settlements });

  } catch (error) {
    console.error("SPLIT ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};





/* ===================== GET GROUP EXPENSES ===================== */
export const getGroupExpenses = async (req, res) => {
  try {
    const { id: groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!group.members.some(m => m.equals(req.user._id))) {
      return res.status(403).json({ message: "Access denied" });
    }

    const expenses = await GroupExpense.find({ groupId })
      .populate("paidBy", "username email")  // ✅ FIXED
      .sort({ createdAt: -1 });

    res.json(expenses);

  } catch (error) {
    console.error("Expense error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const addSettlement = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { toUserId, amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const settlement = new Settlement({
      groupId,
      fromUser: req.user._id,
      toUser: toUserId,
      amount
    });

    await settlement.save();

    res.status(201).json(settlement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getGroupLedger = async (req, res) => {
  try {
    const { id: groupId } = req.params;

    const expenses = await GroupExpense.find({ groupId })
      .populate("paidBy", "username")
      .sort({ createdAt: -1 });

    const settlements = await Settlement.find({ groupId })
      .populate("fromUser toUser", "username")
      .sort({ createdAt: -1 });

    res.json({
      expenses,
      settlements
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
