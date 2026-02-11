function SummaryCards({ transactions }) {
  const income = transactions
    .filter(t => t.type === "income")
    .reduce((a, b) => a + b.amount, 0);

  const expense = transactions
    .filter(t => t.type === "expense")
    .reduce((a, b) => a + b.amount, 0);

  return (
    <div className="summary-grid">
      <div className="summary-card income">
        <h4>Total Income</h4>
        <p>₹{income}</p>
      </div>

      <div className="summary-card expense">
        <h4>Total Expense</h4>
        <p>₹{expense}</p>
      </div>

      <div className="summary-card balance">
        <h4>Balance</h4>
        <p>₹{income - expense}</p>
      </div>
    </div>
  );
}

export default SummaryCards;
