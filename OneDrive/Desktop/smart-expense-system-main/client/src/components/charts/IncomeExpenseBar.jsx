import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function IncomeExpenseBar({ transactions }) {
  let income = 0;
  let expense = 0;

  transactions.forEach((t) => {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  });

  const data = [
    { name: "Income", amount: income },
    { name: "Expense", amount: expense },
  ];

  return (
    <>
      <h3>Income vs Expense</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barSize={48}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="amount" radius={[10, 10, 0, 0]} fill="#6366f1" />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

export default IncomeExpenseBar;
