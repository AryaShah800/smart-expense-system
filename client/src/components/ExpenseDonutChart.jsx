import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function ExpenseDonutChart({ transactions }) {
  const expenseMap = {};

  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const name = t.categoryId?.name || "Other";
      expenseMap[name] = (expenseMap[name] || 0) + t.amount;
    });

  const data = Object.keys(expenseMap).map((key) => ({
    name: key,
    value: expenseMap[key],
  }));

  const COLORS = [
    "#6366f1",
    "#22c55e",
    "#f97316",
    "#ef4444",
    "#14b8a6",
    "#eab308",
  ];

  if (data.length === 0) {
    return <p>No expense data</p>;
  }

  return (
    <div className="chart-card">
      <h3>Expenses by Category</h3>

      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={4}
          >
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>

          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ExpenseDonutChart;
