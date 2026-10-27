import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import RecurringTransaction from "../models/RecurringTransaction.js";
import Category from "../models/Category.js";

/**
 * Intelligent proactive analytics engine that derives actionable insights
 * from month-over-month trends, category anomalies, budget pacing, and recurring bills.
 */
export const generateInsights = async (userId) => {
  const now = new Date();

  // Date ranges
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // Month progress pacing
  const daysInMonth = endOfThisMonth.getDate();
  const currentDay = now.getDate();
  const monthProgressPct = Math.round((currentDay / daysInMonth) * 100);

  // Fetch transactions across this month and last month
  const transactions = await Transaction.find({
    userId,
    date: { $gte: startOfLastMonth, $lte: endOfThisMonth },
  }).populate("categoryId", "name icon");

  const thisMonthExpenses = [];
  const thisMonthIncome = [];
  const lastMonthExpenses = [];
  const lastMonthIncome = [];

  transactions.forEach((t) => {
    const tDate = new Date(t.date);
    if (tDate >= startOfThisMonth && tDate <= endOfThisMonth) {
      if (t.type === "expense") thisMonthExpenses.push(t);
      else thisMonthIncome.push(t);
    } else if (tDate >= startOfLastMonth && tDate <= endOfLastMonth) {
      if (t.type === "expense") lastMonthExpenses.push(t);
      else lastMonthIncome.push(t);
    }
  });

  const totalExpenseThisMonth = thisMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncomeThisMonth = thisMonthIncome.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenseLastMonth = lastMonthExpenses.reduce((sum, t) => sum + t.amount, 0);

  const insights = [];

  // 1. Category Month-over-Month Analysis (e.g., "You spent 20% more on groceries this month...")
  const thisMonthCatMap = {};
  thisMonthExpenses.forEach((t) => {
    const catName = t.categoryId?.name || "Uncategorized";
    const catIcon = t.categoryId?.icon || "🏷️";
    if (!thisMonthCatMap[catName]) {
      thisMonthCatMap[catName] = { total: 0, icon: catIcon, count: 0 };
    }
    thisMonthCatMap[catName].total += t.amount;
    thisMonthCatMap[catName].count += 1;
  });

  const lastMonthCatMap = {};
  lastMonthExpenses.forEach((t) => {
    const catName = t.categoryId?.name || "Uncategorized";
    const catIcon = t.categoryId?.icon || "🏷️";
    if (!lastMonthCatMap[catName]) {
      lastMonthCatMap[catName] = { total: 0, icon: catIcon };
    }
    lastMonthCatMap[catName].total += t.amount;
  });

  const categoryDeltas = [];
  Object.keys(thisMonthCatMap).forEach((cat) => {
    const current = thisMonthCatMap[cat].total;
    const last = lastMonthCatMap[cat]?.total || 0;
    const diff = current - last;
    let pct = null;
    if (last > 0) {
      pct = Math.round(((current - last) / last) * 100);
    }
    categoryDeltas.push({
      category: cat,
      icon: thisMonthCatMap[cat].icon,
      current,
      last,
      diff,
      pct,
    });
  });

  // Top spending surge
  const surges = categoryDeltas
    .filter((d) => d.pct !== null && d.pct > 5 && d.diff >= 50)
    .sort((a, b) => b.pct - a.pct);

  if (surges.length > 0) {
    const topSurge = surges[0];
    insights.push({
      id: "cat-surge",
      type: "warning",
      icon: "📈",
      category: topSurge.category,
      badge: `+${topSurge.pct}% vs last month`,
      title: `${topSurge.category} Spending Surge`,
      message: `You spent ${topSurge.pct}% more on ${topSurge.category.toLowerCase()} this month compared to last month.`,
      metric: `₹${topSurge.current.toLocaleString()} (was ₹${topSurge.last.toLocaleString()})`,
      actionText: "View Transactions",
      actionFilter: topSurge.category,
    });
  }

  // Top spending reduction
  const reductions = categoryDeltas
    .filter((d) => d.pct !== null && d.pct <= -10 && Math.abs(d.diff) >= 50)
    .sort((a, b) => a.pct - b.pct);

  if (reductions.length > 0) {
    const topCut = reductions[0];
    insights.push({
      id: "cat-reduction",
      type: "success",
      icon: "📉",
      category: topCut.category,
      badge: `${topCut.pct}% vs last month`,
      title: `Great Discipline in ${topCut.category}`,
      message: `You spent ${Math.abs(topCut.pct)}% less on ${topCut.category.toLowerCase()} this month compared to last month. Great job keeping expenses down!`,
      metric: `₹${topCut.current.toLocaleString()} (down from ₹${topCut.last.toLocaleString()})`,
      actionText: "View Category",
      actionFilter: topCut.category,
    });
  }

  // 2. Overall Month-over-Month Velocity
  if (totalExpenseLastMonth > 0 && totalExpenseThisMonth > 0) {
    const overallDiff = totalExpenseThisMonth - totalExpenseLastMonth;
    const overallPct = Math.round((overallDiff / totalExpenseLastMonth) * 100);
    if (Math.abs(overallPct) >= 5) {
      insights.push({
        id: "overall-mom",
        type: overallPct > 0 ? "warning" : "success",
        icon: overallPct > 0 ? "⚡" : "🌟",
        category: "Total Spending",
        badge: `${overallPct > 0 ? "+" : ""}${overallPct}% overall`,
        title: overallPct > 0 ? "Higher Spending Pace" : "Lower Spending Pace",
        message:
          overallPct > 0
            ? `Your overall expenses are ${overallPct}% higher than last month. Keep an eye on non-essential purchases.`
            : `Your total spending is ${Math.abs(overallPct)}% lower than last month at this point. Excellent fiscal control!`,
        metric: `₹${totalExpenseThisMonth.toLocaleString()} vs ₹${totalExpenseLastMonth.toLocaleString()} last month`,
      });
    }
  }

  // 3. Dominant Cost Driver (Concentration)
  if (totalExpenseThisMonth > 0 && Object.keys(thisMonthCatMap).length > 0) {
    const sortedCats = Object.entries(thisMonthCatMap).sort((a, b) => b[1].total - a[1].total);
    const topCat = sortedCats[0];
    const topCatShare = Math.round((topCat[1].total / totalExpenseThisMonth) * 100);
    if (topCatShare >= 30) {
      insights.push({
        id: "top-driver",
        type: "info",
        icon: "🏷️",
        category: topCat[0],
        badge: `${topCatShare}% of total`,
        title: "Major Outflow Driver",
        message: `${topCat[0]} accounts for ${topCatShare}% of your total spending this month. Optimizing here will have the highest financial impact.`,
        metric: `₹${topCat[1].total.toLocaleString()} spent`,
      });
    }
  }

  // 4. Savings Rate Insight
  if (totalIncomeThisMonth > 0) {
    const savings = totalIncomeThisMonth - totalExpenseThisMonth;
    const savingsRate = Math.round((savings / totalIncomeThisMonth) * 100);
    if (savingsRate >= 20) {
      insights.push({
        id: "savings-strong",
        type: "success",
        icon: "💰",
        category: "Savings Rate",
        badge: `${savingsRate}% saved`,
        title: "Strong Savings Rate",
        message: `You've saved ${savingsRate}% of your income this month, beating the recommended 20% financial milestone!`,
        metric: `₹${savings.toLocaleString()} net surplus`,
      });
    } else if (savingsRate < 0) {
      insights.push({
        id: "savings-deficit",
        type: "danger",
        icon: "⚠️",
        category: "Cash Flow",
        badge: "Deficit",
        title: "Negative Cash Flow Alert",
        message: `Your expenses exceed your income by ₹${Math.abs(savings).toLocaleString()} this month. Consider curtailing discretionary categories.`,
        metric: `-₹${Math.abs(savings).toLocaleString()} deficit`,
      });
    }
  }

  // 5. Budget Pacing / Rapid Burn
  try {
    const budgets = await Budget.find({ userId }).populate("categoryId", "name");
    for (const b of budgets) {
      const catName = b.categoryId?.name;
      if (!catName) continue;
      const budgetLimit = b.amount || b.monthlyLimit || 0;
      if (budgetLimit <= 0) continue;
      const spent = thisMonthCatMap[catName]?.total || 0;
      const burnPct = Math.round((spent / budgetLimit) * 100);

      if (burnPct >= 100) {
        insights.push({
          id: `budget-over-${b._id}`,
          type: "danger",
          icon: "🚨",
          category: catName,
          badge: `${burnPct}% used`,
          title: `${catName} Budget Exceeded`,
          message: `You have exceeded your monthly ${catName} budget by ₹${(spent - budgetLimit).toLocaleString()}.`,
          metric: `₹${spent.toLocaleString()} / ₹${budgetLimit.toLocaleString()}`,
        });
      } else if (burnPct > monthProgressPct + 20 && burnPct >= 65) {
        insights.push({
          id: `budget-pace-${b._id}`,
          type: "warning",
          icon: "⚡",
          category: catName,
          badge: `${burnPct}% spent`,
          title: `Rapid Burn: ${catName}`,
          message: `You've used ${burnPct}% of your ${catName} budget, but only ${monthProgressPct}% of the month has elapsed.`,
          metric: `₹${(budgetLimit - spent).toLocaleString()} remaining`,
        });
      }
    }
  } catch (err) {
    console.error("Budget insight calculation error:", err.message);
  }

  // 6. Upcoming Recurring Bills Reminder
  try {
    const inSevenDays = new Date();
    inSevenDays.setDate(inSevenDays.getDate() + 7);
    const upcomingRecurring = await RecurringTransaction.find({
      userId,
      status: "active",
      nextDueDate: { $gte: now, $lte: inSevenDays },
    }).populate("categoryId", "name");

    if (upcomingRecurring.length > 0) {
      const totalUpcoming = upcomingRecurring.reduce((sum, r) => sum + r.amount, 0);
      const itemNames = upcomingRecurring.slice(0, 2).map((r) => r.description).join(", ");
      const andMore = upcomingRecurring.length > 2 ? ` and ${upcomingRecurring.length - 2} more` : "";
      insights.push({
        id: "upcoming-recurring",
        type: "info",
        icon: "📅",
        category: "Recurring Bills",
        badge: `${upcomingRecurring.length} due soon`,
        title: "Upcoming Scheduled Bills",
        message: `You have ${upcomingRecurring.length} scheduled payment(s) (${itemNames}${andMore}) totaling ₹${totalUpcoming.toLocaleString()} due within the next 7 days.`,
        metric: `₹${totalUpcoming.toLocaleString()} upcoming`,
        actionText: "Manage Recurring",
        actionLink: "/recurring",
      });
    }
  } catch (err) {
    console.error("Recurring insight calculation error:", err.message);
  }

  return insights;
};

export const getDashboardData = async (req, res) => {
  try {
    const userId = req.user._id;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const matchStage = {
      userId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    };

    const totals = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    totals.forEach((t) => {
      if (t._id === "income") totalIncome = t.total;
      if (t._id === "expense") totalExpense = t.total;
    });

    // Recent Transactions (Last 5)
    const recentTransactions = await Transaction.find({ userId })
      .sort({ date: -1 })
      .limit(5)
      .populate("categoryId", "name icon");

    // Expense by Category (Chart Data)
    const categoryStats = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: "expense",
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: "$categoryId",
          total: { $sum: "$amount" },
        },
      },
      { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" } },
      { $unwind: "$category" },
      { $project: { name: "$category.name", color: "$category.color", total: 1 } },
    ]);

    // Generate actionable insights proactively
    const insights = await generateInsights(userId);

    res.json({
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
      },
      recentTransactions,
      expenseByCategory: categoryStats,
      insights,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getInsights = async (req, res) => {
  try {
    const userId = req.user._id;
    const insights = await generateInsights(userId);
    res.json(insights);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
