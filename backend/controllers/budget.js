import Budget from "../models/Budget.js";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";

export const setBudget = async (req, res) => {
  try {
    const { categoryId, amount } = req.body;
    
    // Fix #6: Query Category model and validate category.type !== 'expense'
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    if (category.type !== 'expense') {
      return res.status(400).json({ message: "Budget can only be set for expense categories" });
    }
    
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

    // Fix #5: Accept optional timezone from request query for correct month calculation
    const timezone = req.query.timezone || 'UTC';
    
    // Calculate expense for this month for each category
    let startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    // Adjust dates based on timezone (important for IST and other non-UTC timezones)
    if (timezone && timezone !== 'UTC') {
      try {
        // Create dates in the specified timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        
        const today = new Date();
        const parts = formatter.formatToParts(today);
        const year = parseInt(parts.find(p => p.type === 'year').value);
        const month = parseInt(parts.find(p => p.type === 'month').value) - 1;
        
        // Create month boundaries in UTC that represent the start and end of month in the timezone
        startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
        endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
      } catch (e) {
        console.warn(`Invalid timezone "${timezone}", using UTC`);
      }
    }

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
