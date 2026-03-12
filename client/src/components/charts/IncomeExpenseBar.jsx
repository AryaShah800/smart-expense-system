import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { useAuth } from "../../context/AuthContext";
import formatCurrency from "../../utils/currencyFormatter";

const data = [
  { name: "Income", amount: 0, color: "#22c55e" }, // Green
  { name: "Expense", amount: 0, color: "#ef4444" }, // Red
];

function IncomeExpenseBar({ transactions }) {
  let income = 0;
  let expense = 0;

  transactions.forEach((t) => {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  });

  const chartData = [
    { name: "Income", amount: income, color: "#22c55e" },
    { name: "Expense", amount: expense, color: "#ef4444" },
  ];

  const { user } = useAuth();

  return (
    <>
      <h3 style={{ marginBottom: "20px", color: "#333" }}>Income vs Expense</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} barSize={60}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#666", fontSize: 14 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#666", fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(value, user?.currency)}
          />
          <Tooltip
            cursor={{ fill: "transparent" }}
            formatter={(value) => [formatCurrency(value, user?.currency), "Amount"]}
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}
          />
          <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

export default IncomeExpenseBar;
