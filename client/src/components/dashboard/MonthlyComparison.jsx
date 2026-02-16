import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function MonthlyComparison({ transactions }) {
  const data = Object.values(
    transactions.reduce((acc, t) => {
      const month = new Date(t.date).toLocaleString("default", { month: "short" });
      acc[month] = acc[month] || { month, income: 0, expense: 0 };
      acc[month][t.type] += t.amount;
      return acc;
    }, {})
  );

  return (
    <div className="chart-card">
      <h4>Monthly Comparison</h4>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="income" fill="#22c55e" />
          <Bar dataKey="expense" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MonthlyComparison;
