import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportTransactionsPdf({
  userName = "User",
  transactions = [],
  fromDate,
  toDate,
}) {
  // 🔒 HARD GUARD (prevents silent failure)
  if (!transactions.length) {
    alert("No transactions to export");
    return;
  }

  const doc = new jsPDF("p", "mm", "a4");

  /* =====================
     CALCULATIONS
  ===================== */
  const income = transactions
    .filter(t => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  const expense = transactions
    .filter(t => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const balance = income - expense;

  /* =====================
     HEADER
  ===================== */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Smart Expense Report", 14, 20);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`User: ${userName}`, 14, 30);
  doc.text(
    `Period: ${fromDate || "All"} → ${toDate || "All"}`,
    14,
    36
  );
  doc.text(
    `Generated on: ${new Date().toLocaleDateString()}`,
    14,
    42
  );

  /* =====================
     SUMMARY TABLE
  ===================== */
  autoTable(doc, {
    startY: 52,
    theme: "grid",
    head: [["Metric", "Amount (INR)"]],
    body: [
      ["Total Income", `INR ${income}`],
      ["Total Expense", `INR ${expense}`],
      ["Net Balance", `INR ${balance}`],
    ],
    headStyles: { fillColor: [99, 102, 241] },
    styles: { fontSize: 11 },
  });

  /* =====================
     CATEGORY BREAKDOWN
  ===================== */
  const categoryTotals = {};
  transactions.forEach(t => {
    const name = t.categoryId?.name || "Other";
    categoryTotals[name] = (categoryTotals[name] || 0) + t.amount;
  });

  doc.addPage();
  doc.setFontSize(16);
  doc.text("Category Breakdown", 14, 20);

  autoTable(doc, {
    startY: 28,
    head: [["Category", "Total (INR)"]],
    body: Object.entries(categoryTotals).map(([k, v]) => [
      k,
      `INR ${v}`,
    ]),
    styles: { fontSize: 11 },
  });

  /* =====================
     TRANSACTIONS LIST
  ===================== */
  doc.addPage();
  doc.setFontSize(16);
  doc.text("All Transactions", 14, 20);

  autoTable(doc, {
    startY: 28,
    head: [["Date", "Category", "Type", "Amount (INR)", "Description"]],
    body: transactions.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.categoryId?.name || "Other",
      t.type.toUpperCase(),
      `${t.type === "expense" ? "-" : "+"} INR ${t.amount}`,
      t.description || "—",
    ]),
    styles: { fontSize: 9 },
  });

  /* =====================
     DOWNLOAD
  ===================== */
  doc.save("smart-expense-report.pdf");
}
