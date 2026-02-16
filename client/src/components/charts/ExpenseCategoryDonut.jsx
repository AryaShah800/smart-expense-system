import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = [
  "#2563eb", // blue-600
  "#34d399", // emerald-400
  "#f87171", // red-400
  "#facc15", // yellow-400
  "#a78bfa", // violet-400
  "#fb923c", // orange-400
  "#e879f9", // fuchsia-400
];

function ExpenseCategoryDonut({ transactions }) {
  const map = {};
  let totalExpense = 0;

  transactions.forEach((t) => {
    if (t.type === "expense") {
      const name = t.categoryId?.name || "Other";
      map[name] = (map[name] || 0) + t.amount;
      totalExpense += t.amount;
    }
  });

  const data = Object.entries(map).map(([name, value]) => ({
    name,
    value,
  }));

  if (!data.length) {
    return <p style={{ textAlign: "center", color: "#666" }}>No expense data</p>;
  }

  const formatCurrency = (value) => `₹${value.toLocaleString()}`;

  const renderTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0];
      const percent = ((value / totalExpense) * 100).toFixed(1);
      return (
        <div style={{ backgroundColor: "#fff", padding: "10px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          <p style={{ margin: 0, fontWeight: "bold" }}>{name}</p>
          <p style={{ margin: 0 }}>{formatCurrency(value)} ({percent}%)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <h3 style={{ marginBottom: "20px", color: "#333" }}>Expenses by Category</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke="none"
              />
            ))}
          </Pie>
          <Tooltip content={renderTooltip} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            iconSize={10}
          />
        </PieChart>
      </ResponsiveContainer>
    </>
  );
}

export default ExpenseCategoryDonut;
