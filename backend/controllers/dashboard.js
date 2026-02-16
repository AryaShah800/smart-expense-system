import Transaction from "../models/Transaction.js";

export const getDashboardData = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Total Income & Expense (All time or This Month?) 
    // SRS R5.1 doesn't specify defaults, assume This Month for Overview
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const matchStage = {
      userId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    };

    const totals = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" }
        }
      }
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    totals.forEach(t => {
      if (t._id === 'income') totalIncome = t.total;
      if (t._id === 'expense') totalExpense = t.total;
    });

    // 2. Recent Transactions (Last 5)
    const recentTransactions = await Transaction.find({ userId })
      .sort({ date: -1 })
      .limit(5)
      .populate("categoryId", "name icon");

    // 3. Expense by Category (Chart Data)
    const categoryStats = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: 'expense',
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: "$categoryId",
          total: { $sum: "$amount" }
        }
      },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: "$category" },
      { $project: { name: "$category.name", color: "$category.color", total: 1 } }
    ]);

    res.json({
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0
      },
      recentTransactions,
      expenseByCategory: categoryStats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
