import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useAuth } from "../../context/AuthContext";
import formatCurrency from "../../utils/currencyFormatter";

function CashFlowLine({ transactions }) {
  const { user } = useAuth();
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  let balance = 0;
  const dateMap = new Map();
  sorted.forEach((t) => {
    balance += t.type === "income" ? t.amount : -t.amount;
    const dateLabel = new Date(t.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: sorted.length > 200 ? "2-digit" : undefined,
    });
    dateMap.set(dateLabel, balance);
  });

  const data = Array.from(dateMap.entries()).map(([date, bal]) => ({
    date,
    balance: bal,
  }));

  // use shared formatter

  return (
    <>
      <h3 style={{ marginBottom: "20px", color: "#333" }}>Cash Flow</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#666", fontSize: 12 }}
            minTickGap={30}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#666", fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(value, user?.currency)}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(value, user?.currency), "Balance"]}
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#22c55e"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorBalance)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </>
  );
}

export default CashFlowLine;
