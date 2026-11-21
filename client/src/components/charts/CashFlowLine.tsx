import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useAuth } from "../../hooks/useAuth";
import formatCurrency from "../../utils/currencyFormatter";
import type { Transaction } from "../../types/models";

function CashFlowLine({ transactions }: { transactions: Transaction[] }) {
  const { user } = useAuth();
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
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

  if (data.length < 2) {
    return (
      <p className="chart-empty">
        {data.length === 0
          ? "No transactions in this range."
          : "A trend needs transactions on at least two different days. Add a few more and the line will appear."}
      </p>
    );
  }

  return (
    <>
      
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            minTickGap={30}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#666", fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(value, user?.currency)}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value), user?.currency), "Balance"]}
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="var(--primary)"
            fillOpacity={0.1}
            dot={data.length <= 12}
          />
        </AreaChart>
      </ResponsiveContainer>
    </>
  );
}

export default CashFlowLine;
