import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportTransactionsPdf({
  userName = "User",
  transactions = [],
  fromDate,
  toDate,
}) {
  if (!transactions.length) {
    alert("No transactions to export");
    return;
  }

  const doc = new jsPDF("p", "mm", "a4");

  // Colors
  const COLOR_PRIMARY = [99, 102, 241]; // Indigo
  const COLOR_SUCCESS = [34, 197, 94];  // Green
  const COLOR_DANGER = [239, 68, 68];   // Red
  const COLOR_GRAY = [107, 114, 128];   // Gray

  /* =====================
     CALCULATIONS
  ===================== */
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const balance = income - expense;

  /* =====================
     HEADER
  ===================== */
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(0, 0, 210, 40, "F"); // Top banner

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Smart Expense Report", 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  doc.text(`User: ${userName}`, 150, 20, { align: "right" });
  doc.text(
    `Period: ${fromDate || "All"} - ${toDate || "All"}`,
    150,
    30,
    { align: "right" }
  );

  /* =====================
     SUMMARY CARDS
  ===================== */
  const startY = 50;
  const cardWidth = 55;
  const cardHeight = 25;
  const gap = 10;

  // func to draw card
  const drawCard = (x, title, value, color) => {
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 3, 3, "FD");

    // Left border strip
    doc.setFillColor(...color);
    doc.rect(x, startY, 2, cardHeight, "F"); // strip

    doc.setTextColor(100);
    doc.setFontSize(9);
    doc.text(title, x + 5, startY + 8);

    doc.setTextColor(...color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`INR ${value.toLocaleString()}`, x + 5, startY + 18);
  };

  drawCard(14, "Total Income", income, COLOR_SUCCESS);
  drawCard(14 + cardWidth + gap, "Total Expense", expense, COLOR_DANGER);
  drawCard(14 + (cardWidth + gap) * 2, "Net Balance", balance, balance >= 0 ? COLOR_SUCCESS : COLOR_DANGER);

  /* =====================
     CHART 1: INCOME VS EXPENSE (Vertical Bars)
  ===================== */
  let currentY = startY + cardHeight + 15;

  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.text("Income vs Expense", 14, currentY);

  const chart1Height = 40;
  const chart1Y = currentY + 10;

  // Draw Axis Line
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(14, chart1Y + chart1Height, 100, chart1Y + chart1Height); // X-axis

  // Calculate Heights
  const maxValIE = Math.max(income, expense, 1); // Avoid div by 0
  const barHeightIncome = (income / maxValIE) * (chart1Height - 5);
  const barHeightExpense = (expense / maxValIE) * (chart1Height - 5);

  // Income Bar
  doc.setFillColor(...COLOR_SUCCESS);
  doc.rect(30, chart1Y + chart1Height - barHeightIncome, 20, barHeightIncome, "F");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_SUCCESS);
  doc.text(`INR ${income}`, 40, chart1Y + chart1Height - barHeightIncome - 2, { align: "center" });
  doc.setTextColor(100);
  doc.text("Income", 40, chart1Y + chart1Height + 5, { align: "center" });

  // Expense Bar
  doc.setFillColor(...COLOR_DANGER);
  doc.rect(60, chart1Y + chart1Height - barHeightExpense, 20, barHeightExpense, "F");
  doc.setTextColor(...COLOR_DANGER);
  doc.text(`INR ${expense}`, 70, chart1Y + chart1Height - barHeightExpense - 2, { align: "center" });
  doc.setTextColor(100);
  doc.text("Expense", 70, chart1Y + chart1Height + 5, { align: "center" });

  currentY += chart1Height + 20;

  /* =====================
     CHART 2: TOP EXPENSES (Horizontal Bars)
  ===================== */
  // Aggregate categories
  const categoryTotals = {};
  transactions.forEach((t) => {
    if (t.type === "expense") {
      const name = t.categoryId?.name || "Other";
      categoryTotals[name] = (categoryTotals[name] || 0) + t.amount;
    }
  });

  const sortedCats = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1]) // Sort desc
    .slice(0, 5); // Top 5

  if (sortedCats.length > 0) {
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text("Top Expenses by Category", 14, currentY);

    let barY = currentY + 10;
    const maxVal = sortedCats[0][1];
    const maxBarWidth = 100;

    sortedCats.forEach(([name, val]) => {
      const barWidth = (val / maxVal) * maxBarWidth;

      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(name, 14, barY + 5);

      // Draw Base
      doc.setFillColor(240, 240, 240);
      doc.rect(50, barY, maxBarWidth, 8, "F");

      // Draw Fill
      doc.setFillColor(...COLOR_DANGER);
      doc.rect(50, barY, barWidth, 8, "F");

      // Draw Value
      doc.setTextColor(0);
      doc.text(`INR ${val.toLocaleString()}`, 50 + maxBarWidth + 5, barY + 5);

      barY += 12;
    });
    currentY = barY + 10;
  }

  /* =====================
     CHART 3: CASH FLOW (Line Chart)
  ===================== */
  // Check if we need a new page
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }

  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.text("Cash Flow Trend", 14, currentY);

  const cfHeight = 40;
  const cfY = currentY + 10;
  const cfWidth = 180;

  // Prepare Data Points
  const sortedTxns = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  let runningBal = 0;
  const points = sortedTxns.map(t => {
    runningBal += t.type === "income" ? t.amount : -t.amount;
    return { date: t.date, val: runningBal };
  });

  if (points.length > 2) {
    const minBal = Math.min(...points.map(p => p.val), 0);
    const maxBal = Math.max(...points.map(p => p.val), 100);
    const range = maxBal - minBal;

    // Shift X start by 6mm to make room for labels
    const xStart = 20;

    // Draw Axis
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(xStart, cfY + cfHeight, 14 + cfWidth, cfY + cfHeight); // X-axis
    doc.line(xStart, cfY, xStart, cfY + cfHeight); // Y-axis

    // Draw Zero Line if within range
    if (minBal < 0 && maxBal > 0) {
      const zeroY = cfY + cfHeight - ((0 - minBal) / range) * cfHeight;
      doc.setDrawColor(200);
      doc.setLineDash([2, 1]);
      doc.line(xStart, zeroY, 14 + cfWidth, zeroY);
      doc.setLineDash([]);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("0", xStart - 2, zeroY + 1, { align: "right" });
    }

    // Y-Axis Max/Min Labels
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(maxBal.toLocaleString(), xStart - 2, cfY + 3, { align: "right" });
    doc.text(minBal.toLocaleString(), xStart - 2, cfY + cfHeight, { align: "right" });


    // Draw Line
    doc.setDrawColor(...COLOR_SUCCESS);
    doc.setLineWidth(1);

    let prevX = xStart;
    let prevY = cfY + cfHeight - ((points[0].val - minBal) / range) * cfHeight;

    points.forEach((p, i) => {
      if (i === 0) return;
      const x = xStart + (i / (points.length - 1)) * (14 + cfWidth - xStart);
      const y = cfY + cfHeight - ((p.val - minBal) / range) * cfHeight;

      doc.line(prevX, prevY, x, y);
      prevX = x;
      prevY = y;
    });

    // Labels (X-Axis Start/End)
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(new Date(points[0].date).toLocaleDateString(), xStart, cfY + cfHeight + 5);
    doc.text(new Date(points[points.length - 1].date).toLocaleDateString(), 14 + cfWidth, cfY + cfHeight + 5, { align: "right" });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Not enough data for trend (need >2 transactions).", 14, cfY + 20);
  }

  currentY += cfHeight + 20;

  /* =====================
     TRANSACTION LIST
  ===================== */
  // Check page break for table
  if (currentY > 250) {
    doc.addPage();
    currentY = 20;
  }

  const tableStartY = currentY;

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Transaction History", 14, tableStartY);

  autoTable(doc, {
    startY: tableStartY + 5,
    head: [["Date", "Category", "Type", "Amount", "Description"]],
    body: transactions.map((t) => [
      new Date(t.date).toLocaleDateString(),
      t.categoryId?.name || "Other",
      t.type.toUpperCase(),
      `${t.type === "expense" ? "-" : "+"} INR ${t.amount}`,
      t.description || "—",
    ]),
    theme: "grid",
    headStyles: { fillColor: COLOR_PRIMARY, textColor: 255 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: { fontSize: 10, cellPadding: 3 },
  });

  /* =====================
     FOOTER
  ===================== */
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      105,
      290,
      { align: "center" }
    );
  }

  doc.save(`SmartExpense_${userName}_${new Date().toISOString().split("T")[0]}.pdf`);
}
