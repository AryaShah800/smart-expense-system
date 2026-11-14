import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import RecurringTransaction from "../models/RecurringTransaction.js";
import Category from "../models/Category.js";

const UNCATEGORIZED = { name: "Uncategorized", icon: "🏷️" };

/**
 * Everything the dashboard needs about the last two months, in ONE aggregation.
 *
 * A single $match uses the {userId, date} index, then $facet splits the matched
 * transactions into "this month" and "last month" and groups each by type and category.
 * MongoDB returns at most (2 months x 2 types x categories) small rows, instead of
 * thousands of Mongoose documents being hydrated, populated and summed in Node.
 */
export const loadMonthStats = async (userId, now = new Date()) => {
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const byTypeAndCategory = [
    { $group: { _id: { type: "$type", categoryId: "$categoryId" }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
  ];
  const within = (from, to) => ({ $match: { date: { $gte: from, $lte: to } } });

  const [facets] = await Transaction.aggregate([
    { $match: { userId, date: { $gte: startOfLastMonth, $lte: endOfThisMonth } } },
    {
      $facet: {
        thisMonth: [within(startOfThisMonth, endOfThisMonth), ...byTypeAndCategory],
        lastMonth: [within(startOfLastMonth, endOfLastMonth), ...byTypeAndCategory],
      },
    },
  ]);

  const ids = new Set();
  for (const row of [...facets.thisMonth, ...facets.lastMonth]) {
    if (row._id.categoryId) ids.add(String(row._id.categoryId));
  }
  const categories = await Category.find({ _id: { $in: [...ids] } }, "name icon color").lean();
  const categoryById = new Map(categories.map((c) => [String(c._id), c]));

  const summarize = (rows) => {
    const month = { income: 0, expense: 0, expenseByCategoryName: {}, expenseRows: [] };
    for (const row of rows) {
      const { type, categoryId } = row._id;
      month[type] += row.total;
      if (type !== "expense") continue;
      const category = categoryById.get(String(categoryId));
      month.expenseRows.push({ categoryId, category, total: row.total });
      // Insights group by category *name* (a deleted category falls under "Uncategorized").
      const name = category?.name || UNCATEGORIZED.name;
      const entry = (month.expenseByCategoryName[name] ||= {
        total: 0,
        icon: category?.icon || UNCATEGORIZED.icon,
        count: 0,
      });
      entry.total += row.total;
      entry.count += row.count;
    }
    return month;
  };

  return { thisMonth: summarize(facets.thisMonth), lastMonth: summarize(facets.lastMonth), now, endOfThisMonth };
};

/**
 * Intelligent proactive analytics engine that derives actionable insights
 * from month-over-month trends, category anomalies, budget pacing, and recurring bills.
 */
export const generateInsights = async (userId, stats) => {
  const { thisMonth, lastMonth, now, endOfThisMonth } = stats ?? (await loadMonthStats(userId));

  // Month progress pacing
  const daysInMonth = endOfThisMonth.getDate();
  const currentDay = now.getDate();
  const monthProgressPct = Math.round((currentDay / daysInMonth) * 100);

  const totalExpenseThisMonth = thisMonth.expense;
  const totalIncomeThisMonth = thisMonth.income;
  const totalExpenseLastMonth = lastMonth.expense;
  const thisMonthCatMap = thisMonth.expenseByCategoryName;
  const lastMonthCatMap = lastMonth.expenseByCategoryName;

  const insights = [];

  // 1. Category Month-over-Month Analysis (e.g., "You spent 20% more on groceries this month...")
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
    const budgets = await Budget.find({ userId }).populate("categoryId", "name").lean();
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
    }).lean();

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

    // The month stats (totals, category chart, insight inputs) come from one aggregation;
    // the recent list is an indexed, limited read. They run in parallel.
    const [stats, recentTransactions] = await Promise.all([
      loadMonthStats(userId),
      Transaction.find({ userId })
        .sort({ date: -1 })
        .limit(5)
        .populate("categoryId", "name icon")
        .lean(),
    ]);

    const totalIncome = stats.thisMonth.income;
    const totalExpense = stats.thisMonth.expense;

    // Expense by Category (chart data). Categories that no longer exist are left out.
    const expenseByCategory = stats.thisMonth.expenseRows
      .filter((row) => row.category)
      .map((row) => ({ _id: row.categoryId, name: row.category.name, color: row.category.color, total: row.total }));

    const insights = await generateInsights(userId, stats);

    res.json({
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
      },
      recentTransactions,
      expenseByCategory,
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
