import { useAuth } from "../../hooks/useAuth";
import { formatCurrency } from "../../utils/currencyFormatter";

interface SummaryCardsProps {
  income: number;
  expense: number;
  balance: number;
}

function SummaryCards({ income, expense, balance }: SummaryCardsProps) {
  const { user } = useAuth();
  const format = (amount: number) => formatCurrency(amount, user?.currency || "INR");

  return (
    <>
      <div className="summary-card balance">
        <span>Total balance</span>
        <strong>{format(balance)}</strong>
      </div>

      <div className="summary-card income">
        <span>Total income</span>
        <strong>{format(income)}</strong>
      </div>

      <div className="summary-card expense">
        <span>Total expense</span>
        <strong>{format(expense)}</strong>
      </div>
    </>
  );
}

export default SummaryCards;