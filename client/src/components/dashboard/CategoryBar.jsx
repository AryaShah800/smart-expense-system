import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function CategoryBar({ transactions }) {
  const data = Object.values(
    transactions
      .filter(t => t.type === "expense")
      .reduce((acc, t) => {
        const name = t.categoryId?.name || "Other";
        acc[name] = acc[name] || { name, amount: 0 };
        acc[name].amount += t.amount;
        return acc;
      }, {})
  );

  return (
    <div className="chart-card">
      <h4>Category Spend</h4>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="amount" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CategoryBar;
