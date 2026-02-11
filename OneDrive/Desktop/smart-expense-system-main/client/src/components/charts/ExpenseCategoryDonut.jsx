import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#6366f1",
  "#22c55e",
  "#ef4444",
  "#f59e0b",
  "#0ea5e9",
  "#a855f7",
];

function ExpenseCategoryDonut({ transactions }) {
  const map = {};

  transactions.forEach((t) => {
    if (t.type === "expense") {
      const name = t.categoryId?.name || "Other";
      map[name] = (map[name] || 0) + t.amount;
    }
  });

  const data = Object.entries(map).map(([name, value]) => ({
    name,
    value,
  }));

  if (!data.length) {
    return <p>No expense data</p>;
  }

  return (
    <>
      <h3>Expenses by Category</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={70}
            outerRadius={100}
            paddingAngle={4}
            dataKey="value"
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
    </>
  );
}

export default ExpenseCategoryDonut;
