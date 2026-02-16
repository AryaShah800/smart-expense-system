import React from "react";

function SummaryCards({ income, expense, balance }) {
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <> {/* Changed from <div className="summary-grid"> to Fragment <> */}
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
    </> 
  );
}

export default SummaryCards;