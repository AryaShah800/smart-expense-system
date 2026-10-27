import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import RecurringTransaction from "../models/RecurringTransaction.js";
import { calculateNextDueDate } from "./recurring.js";

/* ===================== ADD TRANSACTION ===================== */

export const addTransaction = async (req, res) => {
  try {
    const { amount, type, date, description, categoryId, isRecurring, frequency } = req.body;

    // Validate type
    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({ message: "Transaction type must be 'income' or 'expense'" });
    }

    // Validate amount
    const numAmount = Number(amount);
    if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number greater than 0" });
    }
    if (numAmount > 1000000000) {
      return res.status(400).json({ message: "Amount exceeds maximum allowed limit" });
    }

    // ✅ Validate category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(400).json({ message: "Invalid category" });
    }

    // Optional safety check: income should use income category, expense → expense
    if (category.type !== type) {
      return res.status(400).json({
        message: `Category type (${category.type}) does not match transaction type (${type})`,
      });
    }

    const txDate = date ? new Date(date) : new Date();
    const cleanDesc = description ? String(description).slice(0, 200).trim() : "";

    const transaction = new Transaction({
      userId: req.user._id,
      amount: numAmount,
      type,
      date: txDate,
      description: cleanDesc,
      categoryId,
      isRecurring: Boolean(isRecurring),
    });

    await transaction.save();

    // If user marked this as a recurring transaction, create the recurring rule
    if (isRecurring && frequency && ["daily", "weekly", "monthly", "yearly"].includes(frequency)) {
      const nextDue = calculateNextDueDate(txDate, frequency);
      const recurring = new RecurringTransaction({
        userId: req.user._id,
        categoryId,
        type,
        amount: numAmount,
        description: cleanDesc || "Recurring Transaction",
        frequency,
        startDate: txDate,
        nextDueDate: nextDue,
        lastProcessedDate: txDate,
        status: "active",
        autoProcess: true,
      });
      await recurring.save();

      transaction.recurringId = recurring._id;
      await transaction.save();
    }

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate("categoryId", "name icon color");

    res.status(201).json(populatedTransaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/* ===================== GET TRANSACTIONS ===================== */

export const getTransactions = async (req, res) => {
  try {
    const { type, categoryId, startDate, endDate } = req.query;
    const query = { userId: req.user._id };

    if (type) query.type = type;
    if (categoryId) query.categoryId = categoryId;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .populate("categoryId", "name icon color")
      .sort({ date: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ===================== DELETE TRANSACTION ===================== */

export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json({ message: "Transaction deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
