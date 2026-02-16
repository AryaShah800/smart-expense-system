import React from "react";

const BudgetOverview = ({ budgetStatus }) => {
  if (!budgetStatus || budgetStatus.length === 0) return null;

  return (
    <div className="chart-card">
      <h4>Budget Status</h4>
      <div className="budget-list">
        {budgetStatus.map((item) => {
          const percent = Math.min((item.spent / item.limit) * 100, 100);
          const isExceeded = item.spent > item.limit;
          
          return (
            <div key={item.category._id} className="budget-item">
              <div className="budget-header">
                <span className="budget-name">{item.category.name}</span>
                <span className="budget-values">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(item.spent)} 
                  {' / '}
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(item.limit)}
                </span>
              </div>
              
              <div className="progress-track">
                <div 
                  className={`progress-fill ${isExceeded ? 'danger' : percent > 80 ? 'warning' : 'success'}`}
                  style={{ width: `${percent}%` }}
                ></div>
              </div>
              
              <p className="budget-subtext">
                {isExceeded 
                  ? `Exceeded by ${Math.round(item.spent - item.limit)}` 
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