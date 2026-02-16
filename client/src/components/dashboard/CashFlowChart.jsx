import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function CashFlowChart({ transactions }) {
  const data = transactions.map(t => ({
    date: t.date?.slice(0, 10),
    amount: t.type === "expense" ? -t.amount : t.amount
  }));

  return (
    <div className="chart-card">
      <h4>Cash Flow</h4>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="amount" stroke="#6366f1" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CashFlowChart;
