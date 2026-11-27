import Budget from "../models/Budget.js";
import Transaction from "../models/Transaction.js";
import { findUsableCategory } from "../utils/findUsableCategory.js";

// How far the wall clock in `timeZone` is ahead of UTC at `date`, in ms (IST: +5h30m).
const zoneOffsetMs = (date, timeZone) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(date).map((p) => [p.type, p.value])
  );
  const wall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return wall - Math.floor(date.getTime() / 1000) * 1000;
};

/**
 * The instant at which `month` (0-based; 12 rolls into the next year) of `year` starts in `timeZone`.
 * For IST, 1 December starts at 30 November 18:30 UTC, not at midnight UTC.
 * Computed twice so a DST change between the guess and the answer still lands on local midnight.
 */
export const monthStartInZone = (year, month, timeZone) => {
  const utcMidnight = Date.UTC(year, month, 1);
  let start = utcMidnight - zoneOffsetMs(new Date(utcMidnight), timeZone);
  start = utcMidnight - zoneOffsetMs(new Date(start), timeZone);
  return new Date(start);
};

/** [start, end) of the current month in `timeZone`; falls back to UTC for an unknown zone. */
export const currentMonthRange = (timeZone = "UTC", now = new Date()) => {
  let zone = timeZone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
  } catch {
    zone = "UTC";
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit" })
      .formatToParts(now).map((p) => [p.type, p.value])
  );
  const year = +parts.year;
  const month = +parts.month - 1;
  return { start: monthStartInZone(year, month, zone), end: monthStartInZone(year, month + 1, zone) };
};

export const setBudget = async (req, res) => {
  try {
    const { categoryId, amount } = req.body;

    // Validate amount
    const numAmount = Number(amount);
    if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: "Budget limit must be a positive number greater than 0" });
    }
    if (numAmount > 1000000000) {
      return res.status(400).json({ message: "Budget limit exceeds maximum allowable limit" });
    }

    // Fix #6: Query Category model and validate category.type !== 'expense'
    const category = await findUsableCategory(categoryId, req.user._id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    if (category.type !== 'expense') {
      return res.status(400).json({ message: "Budget can only be set for expense categories" });
    }

    // Upsert budget
    const budget = await Budget.findOneAndUpdate(
      { userId: req.user._id, categoryId },
      { amount: numAmount },
      { new: true, upsert: true, runValidators: true }
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
    // A budget whose category was deleted populates to null; skip it instead of crashing on ._id.
    const budgets = (await Budget.find({ userId: req.user._id }).populate("categoryId"))
      .filter((budget) => budget.categoryId);

    // "This month" is the month in the caller's time zone (e.g. Asia/Kolkata), from local midnight
    // on the 1st up to, but not including, local midnight on the 1st of the next month.
    const timezone = typeof req.query.timezone === "string" && req.query.timezone ? req.query.timezone : "UTC";
    const { start: startOfMonth, end: startOfNextMonth } = currentMonthRange(timezone);

    const stats = await Promise.all(budgets.map(async (budget) => {
      const expenses = await Transaction.aggregate([
        {
          $match: {
            userId: req.user._id,
            categoryId: budget.categoryId._id,
            type: 'expense',
            date: { $gte: startOfMonth, $lt: startOfNextMonth }
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
