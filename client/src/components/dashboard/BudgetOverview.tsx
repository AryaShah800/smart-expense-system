import { budgetState } from "../../utils/budgetState";
import { isPopulated, type BudgetStatus } from "../../types/models";
import { useAuth } from "../../hooks/useAuth";
import formatCurrency from "../../utils/currencyFormatter";

const BudgetOverview = ({ budgetStatus }: { budgetStatus: BudgetStatus[] }) => {
  const { user } = useAuth();
  if (!budgetStatus || budgetStatus.length === 0) return null;
  // The user's chosen currency (Settings), like every other amount on the dashboard.
  const money = (value: number) => formatCurrency(value, user?.currency);

  return (
    <div className="chart-card">
      <h3>Budget Status</h3>
      <div className="budget-list">
        {budgetStatus.map((item, index) => {
          const category = isPopulated(item.category) ? item.category : null;
          const percent = Math.min((item.spent / item.limit) * 100, 100);
          const state = budgetState(item.spent, item.limit);
          const isExceeded = state === "over";
          
          return (
            <div key={category?._id ?? index} className="budget-item">
              <div className="budget-header">
                <span className="budget-name">{category?.name ?? "Category"}</span>
                <span className="budget-values">
                  {money(item.spent)} 
                  {' / '}
                  {money(item.limit)}
                </span>
              </div>
              
              <div className="progress-track">
                <div 
                  className={`progress-fill ${state === 'over' ? 'danger' : state === 'warn' ? 'warning' : 'success'}`}
                  style={{ width: `${percent}%` }}
                ></div>
              </div>
              
              <p className={`budget-subtext ${state}`}>
                {isExceeded
                  ? `Over budget by ${money(item.spent - item.limit)}`
                  : state === 'warn'
                    ? `Nearing limit, ${Math.round(100 - percent)}% remaining`
                    : `${Math.round(100 - percent)}% remaining`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BudgetOverview;