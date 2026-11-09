import RecurringTransaction from "../models/RecurringTransaction.js";
import Transaction from "../models/Transaction.js";
import { findUsableCategory } from "../utils/findUsableCategory.js";
import User from "../models/user.js";

// Moves `date` forward by whole months, landing on `anchorDay` or the last day of a shorter month.
// (Plain setMonth would turn Jan 31 + 1 month into Mar 3 and skip February.)
const addMonths = (date, months, anchorDay) => {
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(anchorDay, lastDay));
  return d;
};

/**
 * Calculates the next due date based on frequency.
 * `anchorDay` is the day of the month the schedule is meant to land on (default: the
 * day of `baseDate`). Pass the schedule's start day so a bill on the 31st returns to the
 * 31st after February instead of staying on the 28th.
 */
export const calculateNextDueDate = (baseDate, frequency, anchorDay = new Date(baseDate).getDate()) => {
  const d = new Date(baseDate);
  switch (frequency) {
    case "daily":
      d.setDate(d.getDate() + 1);
      return d;
    case "weekly":
      d.setDate(d.getDate() + 7);
      return d;
    case "yearly":
      return addMonths(d, 12, anchorDay);
    case "monthly":
    default:
      return addMonths(d, 1, anchorDay);
  }
};

/**
 * Process all active recurring transactions that have reached or passed their nextDueDate.
 */
export const processDueRecurring = async (targetUserId = null) => {
  const now = new Date();
  const query = {
    status: "active",
    nextDueDate: { $lte: now },
  };

  if (targetUserId) {
    query.userId = targetUserId;
  }

  const dueItems = await RecurringTransaction.find(query);
  const createdTransactions = [];

  for (const item of dueItems) {
    // The unique recurringId/date pair makes retries safe after a timeout or
    // a process restart between recording a transaction and advancing the due date.
    const dueDate = item.nextDueDate;
    const newTx = await Transaction.findOneAndUpdate(
      { recurringId: item._id, date: dueDate },
      { $setOnInsert: {
        userId: item.userId,
        categoryId: item.categoryId,
        type: item.type,
        amount: item.amount,
        date: dueDate,
        description: item.description,
        recurringId: item._id,
        isRecurring: true,
      } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    createdTransactions.push(newTx);

    // Compute the subsequent due date
    const nextDate = calculateNextDueDate(
      item.nextDueDate,
      item.frequency,
      new Date(item.startDate || item.nextDueDate).getDate()
    );

    const advanced = await RecurringTransaction.findOneAndUpdate(
      { _id: item._id, status: "active", nextDueDate: dueDate },
      { $set: { lastProcessedDate: now, nextDueDate: nextDate } }
    );
    if (!advanced) continue;

    // Notify the user in-app
    try {
      await User.findByIdAndUpdate(item.userId, {
        $push: {
          notifications: {
            message: `🔁 Recurring ${item.type === "expense" ? "bill paid" : "income credited"}: "${item.description}" for ₹${item.amount}.`,
            isRead: false,
            createdAt: now,
          },
        },
      });
    } catch (e) {
      console.error("Failed to notify user for recurring item:", e.message);
    }
  }

  return {
    processedCount: dueItems.length,
    transactions: createdTransactions,
  };
};

/**
 * GET /api/recurring
 * Returns all recurring items for the authenticated user, along with a projected monthly commitment summary.
 */
export const getRecurringTransactions = async (req, res) => {
  try {
    const userId = req.user._id;

    // Automatically evaluate any due recurring transactions first
    await processDueRecurring(userId);

    const recurringList = await RecurringTransaction.find({ userId })
      .populate("categoryId", "name icon color")
      .sort({ nextDueDate: 1 });

    // Compute estimated monthly commitments
    let monthlyRecurringExpense = 0;
    let monthlyRecurringIncome = 0;

    recurringList.forEach((r) => {
      if (r.status !== "active") return;

      let multiplier = 1;
      if (r.frequency === "daily") multiplier = 30;
      else if (r.frequency === "weekly") multiplier = 4.33;
      else if (r.frequency === "monthly") multiplier = 1;
      else if (r.frequency === "yearly") multiplier = 1 / 12;

      const monthlyAmount = r.amount * multiplier;
      if (r.type === "expense") {
        monthlyRecurringExpense += monthlyAmount;
      } else {
        monthlyRecurringIncome += monthlyAmount;
      }
    });

    res.json({
      recurring: recurringList,
      summary: {
        activeCount: recurringList.filter((r) => r.status === "active").length,
        monthlyRecurringExpense: Math.round(monthlyRecurringExpense * 100) / 100,
        monthlyRecurringIncome: Math.round(monthlyRecurringIncome * 100) / 100,
        netRecurring: Math.round((monthlyRecurringIncome - monthlyRecurringExpense) * 100) / 100,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/recurring
 * Creates a new recurring transaction schedule.
 */
export const createRecurringTransaction = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      amount,
      type,
      categoryId,
      description,
      frequency = "monthly",
      startDate,
      createInitialTransaction = true,
    } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({ message: "Type must be income or expense" });
    }

    if (!["daily", "weekly", "monthly", "yearly"].includes(frequency)) {
      return res.status(400).json({ message: "Invalid frequency" });
    }

    const category = await findUsableCategory(categoryId, userId);
    if (!category) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const start = startDate ? new Date(startDate) : new Date();
    let nextDue;
    let initialTx = null;

    if (createInitialTransaction) {
      // Record the first instance now
      initialTx = new Transaction({
        userId,
        categoryId,
        type,
        amount: numAmount,
        date: start,
        description: description ? description.trim() : "Recurring Item",
        isRecurring: true,
      });
      await initialTx.save();

      // The next instance will be due on the next scheduled cycle
      nextDue = calculateNextDueDate(start, frequency);
    } else {
      nextDue = start;
    }

    const recurring = new RecurringTransaction({
      userId,
      categoryId,
      type,
      amount: numAmount,
      description: description ? description.trim().slice(0, 100) : "Recurring Transaction",
      frequency,
      startDate: start,
      nextDueDate: nextDue,
      lastProcessedDate: createInitialTransaction ? start : null,
      status: "active",
      autoProcess: true,
    });

    await recurring.save();

    if (initialTx) {
      initialTx.recurringId = recurring._id;
      await initialTx.save();
    }

    const populated = await RecurringTransaction.findById(recurring._id).populate(
      "categoryId",
      "name icon color"
    );

    res.status(201).json({
      recurring: populated,
      initialTransaction: initialTx,
      message: "Recurring schedule established successfully",
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * PUT /api/recurring/:id
 * Updates or pauses an existing recurring schedule.
 */
export const updateRecurringTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { amount, frequency, description, status, categoryId } = req.body;

    const recurring = await RecurringTransaction.findOne({ _id: id, userId });
    if (!recurring) {
      return res.status(404).json({ message: "Recurring transaction not found" });
    }

    if (amount !== undefined) {
      const num = Number(amount);
      if (isNaN(num) || num <= 0) {
        return res.status(400).json({ message: "Amount must be greater than 0" });
      }
      recurring.amount = num;
    }

    if (frequency && ["daily", "weekly", "monthly", "yearly"].includes(frequency)) {
      recurring.frequency = frequency;
    }

    if (status && ["active", "paused", "completed"].includes(status)) {
      recurring.status = status;
    }

    if (description) {
      recurring.description = description.trim().slice(0, 100);
    }

    if (categoryId) {
      const cat = await findUsableCategory(categoryId, userId);
      if (cat) recurring.categoryId = categoryId;
    }

    await recurring.save();
    const populated = await RecurringTransaction.findById(recurring._id).populate(
      "categoryId",
      "name icon color"
    );

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * DELETE /api/recurring/:id
 * Deletes a recurring schedule (does not delete previously recorded historical transactions).
 */
export const deleteRecurringTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const deleted = await RecurringTransaction.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
      return res.status(404).json({ message: "Recurring transaction not found" });
    }

    res.json({ message: "Recurring schedule removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/recurring/process
 * Manually or programmatically triggers due recurring processing for the authenticated user.
 */
export const triggerProcess = async (req, res) => {
  try {
    const result = await processDueRecurring(req.user._id);
    res.json({
      message: `Processed ${result.processedCount} due recurring transactions`,
      ...result,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
