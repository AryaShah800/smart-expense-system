import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useAuth } from "../../hooks/useAuth";
import formatCurrency from "../../utils/currencyFormatter";
import { isPopulated, type Transaction } from "../../types/models";

interface DonutTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string | number; value?: number | string | Array<number | string> }>;
}

const COLORS = [
  "#1e6b52", // forest
  "#b7791f", // ochre
  "#3b6ea5", // slate blue
  "#a24b3c", // brick
  "#6b7f3a", // olive
  "#7a5c8a", // plum
  "#8a7f6a", // stone
];

function ExpenseCategoryDonut({ transactions }: { transactions: Transaction[] }) {
  const { user } = useAuth();
  const map: Record<string, number> = {};
  let totalExpense = 0;

  transactions.forEach((t) => {
    if (t.type === "expense") {
      const name = (isPopulated(t.categoryId) && t.categoryId.name) || "Other";
      map[name] = (map[name] || 0) + t.amount;
      totalExpense += t.amount;
    }
  });

  const data = Object.entries(map).map(([name, value]) => ({
    name,
    value,
  }));

  if (!data.length) {
    return <p className="chart-empty">No expenses in this range.</p>;
  }

  const renderTooltip = ({ active, payload }: DonutTooltipProps) => {
    const entry = payload?.[0];
    if (active && entry) {
      const name = entry.name;
      const value = Number(entry.value);
      const percent = ((value / totalExpense) * 100).toFixed(1);
      return (
        <div style={{ backgroundColor: "var(--card)", color: "var(--text)", padding: "10px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          <p style={{ margin: 0, fontWeight: "bold" }}>{name}</p>
          <p style={{ margin: 0 }}>{formatCurrency(value, user?.currency)} ({percent}%)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={data.length > 1 ? 3 : 0}
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
          <text x="50%" y="46%" textAnchor="middle" className="donut-total-label">Total spent</text>
          <text x="50%" y="56%" textAnchor="middle" className="donut-total-value">{formatCurrency(totalExpense, user?.currency)}</text>
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

