import { PieChart, Pie, Tooltip, ResponsiveContainer } from "recharts";

function ExpenseDonut({ transactions }) {
  const data = Object.values(
    transactions
      .filter(t => t.type === "expense")
      .reduce((acc, t) => {
        const name = t.categoryId?.name || "Other";
        acc[name] = acc[name] || { name, value: 0 };
        acc[name].value += t.amount;
        return acc;
      }, {})
  );

  return (
    <div className="chart-card">
      <h4>Expense Distribution</h4>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ExpenseDonut;
