import Transaction from "../models/Transaction.js";

// Quotes a CSV cell. Doubles embedded quotes, and prefixes a leading = + - @ (or tab/CR)
// with an apostrophe so Excel and Sheets show it as text instead of running it as a formula.
const csvCell = (value) => {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

export const getMonthlyReport = async (req, res) => {
  try {
    const { month, year, format } = req.query;
    const userId = req.user._id;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and Year are required" });
    }
    const m = Number(month);
    const y = Number(year);
    if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y) || y < 1970 || y > 2100) {
      return res.status(400).json({ message: "Month must be 1-12 and year a valid 4-digit year" });
    }

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    }).populate("categoryId", "name");

    const reportData = transactions.map(t => ({
      date: t.date.toISOString().split("T")[0],
      type: t.type,
      category: t.categoryId ? t.categoryId.name : "Uncategorized",
      amount: t.amount,
      description: t.description || ""
    }));

    if (format === "csv") {
      const fields = ["date", "type", "category", "amount", "description"];
      const csv = [
        fields.join(","),
        ...reportData.map(row =>
          fields.map(field => csvCell(row[field])).join(",")
        )
      ].join("\n");

      res.header("Content-Type", "text/csv");
      res.attachment(`report-${year}-${month}.csv`);
      return res.send(csv);
    }

    res.json(reportData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
