import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import formatCurrency from "../utils/currencyFormatter";
import type { TransactionWithCategory } from "../types";

function CashFlowArea({ transactions }: { transactions: TransactionWithCategory[] }) {
  const { user } = useAuth();
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Running balance after each transaction (no variable reassigned during render)
  const data = sorted.reduce((points, t) => {
    const previous = points.length ? points[points.length - 1].balance : 0;
    points.push({
      date: new Date(t.date).toLocaleDateString(),
      balance: previous + (t.type === "income" ? t.amount : -t.amount),
    });
    return points;
  }, [] as { date: string; balance: number }[]);

  if (data.length === 0) {
    return <p>No transaction data</p>;
  }

  return (
    <div className="chart-card">
      <h3>Cash Flow</h3>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <XAxis dataKey="date" />
          <YAxis tickFormatter={(value) => formatCurrency(value, user?.currency)} />
          <Tooltip formatter={(value) => formatCurrency(Number(value), user?.currency)} />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#22c55e"
            fill="#bbf7d0"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CashFlowArea;
