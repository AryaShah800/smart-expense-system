import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";

/* ===================== ADD TRANSACTION ===================== */

export const addTransaction = async (req, res) => {
  try {
    const { amount, type, date, description, categoryId } = req.body;

    // ✅ Validate DEFAULT category
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

    const transaction = new Transaction({
      userId: req.user._id,
      amount,
      type,
      date,
      description,
      categoryId,
    });

    await transaction.save();

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
