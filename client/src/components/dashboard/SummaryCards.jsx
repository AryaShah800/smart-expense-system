import React from "react";
import { useAuth } from "../../context/AuthContext";
import { formatAmount } from "../../utils/currency";

function SummaryCards({ income, expense, balance }) {
  const { user } = useAuth();
  const { user } = useAuth();

  return (
    <> {/* Changed from <div className="summary-grid"> to Fragment <> */}
      <div className="summary-card balance">
        <span>Total Balance</span>
        <strong>{formatAmount(balance, user?.currency)}</strong>
      </div>

      <div className="summary-card income">
        <span>Total Income</span>
        <strong>{formatAmount(income, user?.currency)}</strong>
      </div>

      <div className="summary-card expense">
        <span>Total Expense</span>
        <strong>{formatAmount(expense, user?.currency)}</strong>
      </div>
    </> 
  );
}

export default SummaryCards;