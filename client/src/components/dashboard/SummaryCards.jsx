import React from "react";

function SummaryCards({ income, expense, balance }) {
  
  // Helper to format currency (e.g., ₹ 1,200)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div className="summary-grid">
      <div className="summary-card balance">
        <span>Total Balance</span>
        <strong>{formatCurrency(balance)}</strong>
      </div>

      <div className="summary-card income">
        <span>Total Income</span>
        <strong>{formatCurrency(income)}</strong>
      </div>

      <div className="summary-card expense">
        <span>Total Expense</span>
        <strong>{formatCurrency(expense)}</strong>
      </div>
    </div>
  );
}

export default SummaryCards;