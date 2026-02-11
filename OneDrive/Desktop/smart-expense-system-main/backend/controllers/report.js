import Transaction from "../models/Transaction.js";

export const getMonthlyReport = async (req, res) => {
  try {
    const { month, year, format } = req.query;
    const userId = req.user._id;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and Year are required" });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

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
          fields.map(field => `"${row[field]}"`).join(",")
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
