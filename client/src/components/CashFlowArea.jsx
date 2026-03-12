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

function CashFlowArea({ transactions }) {
  const { user } = useAuth();
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  let balance = 0;

  const data = sorted.map((t) => {
    balance += t.type === "income" ? t.amount : -t.amount;
    return {
      date: new Date(t.date).toLocaleDateString(),
      balance,
    };
  });

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
          <Tooltip formatter={(value) => formatCurrency(value, user?.currency)} />
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
