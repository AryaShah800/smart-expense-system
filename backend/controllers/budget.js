import Budget from "../models/Budget.js";
import Transaction from "../models/Transaction.js";

export const setBudget = async (req, res) => {
  try {
    const { categoryId, amount } = req.body;
    // Upsert budget
    const budget = await Budget.findOneAndUpdate(
      { userId: req.user._id, categoryId },
      { amount },
      { new: true, upsert: true }
    );
    res.json(budget);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user._id }).populate("categoryId", "name icon color");
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBudgetStatus = async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user._id }).populate("categoryId");

    // Calculate expense for this month for each category
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const stats = await Promise.all(budgets.map(async (budget) => {
      const expenses = await Transaction.aggregate([
        {
          $match: {
            userId: req.user._id,
            categoryId: budget.categoryId._id,
            type: 'expense',
            date: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" }
          }
        }
      ]);
      const spent = expenses.length > 0 ? expenses[0].total : 0;
      return {
        category: budget.categoryId,
        limit: budget.amount,
        spent,
        remaining: budget.amount - spent,
        exceeded: spent > budget.amount
      };
    }));

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
