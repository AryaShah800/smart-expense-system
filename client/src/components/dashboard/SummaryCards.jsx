import React from "react";
import { useAuth } from "../../context/AuthContext";

function SummaryCards({ income, expense, balance }) {
  const { user } = useAuth(); // Read the user's data
  
  const formatCurrency = (amount) => {
    // 1. Get the currency or fallback to INR
    const currencyCode = user?.currency || "INR";
    
    // 2. Map the correct locale for the currency symbol placement (e.g., $100 vs 100 €)
    const locales = {
      INR: 'en-IN',
      USD: 'en-US',
      EUR: 'de-DE',
      GBP: 'en-GB'
    };
    const locale = locales[currencyCode] || 'en-US';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <>
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