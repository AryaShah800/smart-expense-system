import React from "react";

function SummaryCards({ income, expense, balance }) {
  
<<<<<<< HEAD
=======
  // Helper to format currency (e.g., ₹ 1,200)
>>>>>>> b32fcb37c5c7dd229814a2683f6e4e705f3400c2
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
<<<<<<< HEAD
    <> {/* Changed from <div className="summary-grid"> to Fragment <> */}
=======
    <div className="summary-grid">
>>>>>>> b32fcb37c5c7dd229814a2683f6e4e705f3400c2
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
<<<<<<< HEAD
    </> 
=======
    </div>
>>>>>>> b32fcb37c5c7dd229814a2683f6e4e705f3400c2
  );
}

export default SummaryCards;