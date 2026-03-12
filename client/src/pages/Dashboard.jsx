import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import formatCurrency, { getCurrencySymbol } from "../utils/currencyFormatter";
import api from "../api/axios";
import { exportTransactionsPdf } from "../utils/exportPdf"; // Import Export Utility

import SummaryCards from "../components/dashboard/SummaryCards";
import Notifications from "../components/dashboard/Notifications";
import IncomeExpenseBar from "../components/charts/IncomeExpenseBar";
import ExpenseCategoryDonut from "../components/charts/ExpenseCategoryDonut";
import CashFlowLine from "../components/charts/CashFlowLine";
import BudgetOverview from "../components/dashboard/BudgetOverview"; // Import New Component

import "../styles/dashboard.css";
import "../styles/responsive.css";

function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [budgetStatus, setBudgetStatus] = useState([]); // State for budgets
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState("90d");
  const { user } = useAuth();

  /* ===== FETCH DATA ===== */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fix #5: Add timezone parameter for correct month calculation (especially for IST users)
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        // Fetch Transactions and Budget Status in parallel
        const [txRes, budgetRes] = await Promise.all([
          api.get("/transactions"),
          api.get("/budgets/status", { params: { timezone: userTimezone } })
        ]);
        
        setTransactions(txRes.data);
        setBudgetStatus(budgetRes.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /* ===== RANGE LOGIC ===== */
  const daysBack = useMemo(() => {
    if (range === "7d") return 7;
    if (range === "30d") return 30;
    if (range === "90d") return 90;
    return 0;
  }, [range]);

  const filteredTransactions = useMemo(() => {
    if (!daysBack) return transactions;
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const fromDate = new Date();
    fromDate.setDate(now.getDate() - daysBack);

    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= fromDate && d <= now;
    });
  }, [transactions, daysBack]);

  /* ===== FINANCIAL CALCULATIONS ===== */
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;

    filteredTransactions.forEach((t) => {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    });

    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  // Forecast: Projected expense for current month
  const projection = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    // Filter expenses for THIS MONTH only
    const thisMonthExpenses = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && 
             d.getFullYear() === now.getFullYear() && 
             t.type === 'expense';
    }).reduce((sum, t) => sum + t.amount, 0);

    // Calculate velocity
    if (currentDay === 0) return 0;
    const dailyAverage = thisMonthExpenses / currentDay;
    return Math.round(dailyAverage * totalDays);
  }, [transactions]);

  /* ===== HANDLERS ===== */
  const handleExport = () => {
    exportTransactionsPdf({
      userName: user?.username || "User",
      transactions: filteredTransactions,
      fromDate: new Date(Date.now() - daysBack * 86400000).toLocaleDateString(),
      toDate: new Date().toLocaleDateString()
    });
  };

  if (loading) return <p className="dashboard-loading">Loading financial data...</p>;
  if (error) return <p className="dashboard-error">{error}</p>;

  // replace hardcoded formatter with shared util
  // (we'll import and use formatCurrency below in JSX)

  return (
    <>
      {/* ========== DESKTOP LAYOUT (unchanged, md and above) ========== */}
      <div className="dashboard-page show-from-md-block">
      {/* HEADER */}
      <div className="dashboard-header-row">
        <div className="welcome-section">
          <h1>Hello, {user?.username?.split(" ")[0] || "User"}! 👋</h1>
          <p className="dashboard-subtitle">Financial Overview & Projections</p>
        </div>

        <div className="header-actions">
           {/* EXPORT BUTTON */}
          <button onClick={handleExport} className="btn-export">
            <span>📥</span> Export Report
          </button>

          {/* RANGE FILTER */}
          <div className="filter-wrapper">
            <select
              className="range-dropdown"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      <Notifications />

      {/* SUMMARY CARDS + PROJECTION */}
      <div className="summary-grid">
        <SummaryCards
          income={summary.income}
          expense={summary.expense}
          balance={summary.balance}
        />
        {/* ADDING PROJECTION CARD MANUALLY TO GRID */}
        <div className="summary-card projected">
          <span>Projected (Month End)</span>
          <strong>
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(projection)}
          </strong>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="empty-dashboard">
          <div className="empty-icon">📊</div>
          <h3>No transactions yet</h3>
          <p>Start tracking your expenses to see insights here.</p>
          <Link to="/add-transaction" className="cta-button">
            Add First Transaction
          </Link>
        </div>
      ) : (
        <div className="dashboard-grid">
          {/* LEFT COLUMN: CHARTS */}
          <div className="charts-column">
            <div className="chart-card">
              <h4>Income vs Expense</h4>
              <IncomeExpenseBar transactions={filteredTransactions} />
            </div>

            <div className="chart-card">
              <h4>Spending Categories</h4>
              <ExpenseCategoryDonut transactions={filteredTransactions} />
            </div>

            <div className="chart-card">
              <h4>Cash Flow Trend</h4>
              <CashFlowLine transactions={filteredTransactions} />
            </div>
          </div>

          {/* RIGHT COLUMN: RECENT + BUDGETS */}
          <div className="recent-column" style={{ gap: '24px' }}>
             {/* NEW BUDGET SECTION */}
            <BudgetOverview budgetStatus={budgetStatus} />

            <div className="recent-section-wrapper">
              <div className="section-header">
                <h3 className="section-title">Recent Activity</h3>
                <Link to="/expenses" className="view-all-link">View All</Link>
              </div>

              <div className="recent-list">
                {transactions
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 5)
                  .map((t) => (
                    <div key={t._id} className="expenses-card mini">
                      <div className={`card-icon ${t.type}`}>
                        {t.categoryId?.name?.[0] || "?"}
                      </div>

                      <div className="card-content">
                        <div className="card-row top">
                          <span className="card-category">{t.categoryId?.name || "Other"}</span>
                          <span className={`card-amount ${t.type}`}>
                             {t.type === "expense" ? "-" : "+"}{formatCurrency(t.amount, user?.currency)}
                          </span>
                        </div>

                        <div className="card-row bottom">
                          <span className="card-desc">{t.description || "No description"}</span>
                          <span className="card-date">
                            {new Date(t.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

      {/* ========== MOBILE LAYOUT (below md only: compact, p-4, gap-4, rounded-xl) ========== */}
      <div className="dashboard-mobile hide-from-md">
        <div className="dashboard-mobile-actions">
          <select
            className="range-dropdown"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            style={{ padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #e5e7eb", fontSize: "0.875rem" }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button type="button" onClick={handleExport} className="btn-export" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
            📥 Export
          </button>
        </div>
        <Notifications />
        <div className="summary-mobile-balance">
          <span>Total Balance</span>
          <strong>{formatCurrency(summary.balance, user?.currency)}</strong>
        </div>
        <div className="summary-mobile-grid">
          <div className="summary-mobile-card income">
            <span>Income</span>
            <strong>{formatCurrency(summary.income, user?.currency)}</strong>
          </div>
          <div className="summary-mobile-card expense">
            <span>Expense</span>
            <strong>{formatCurrency(summary.expense, user?.currency)}</strong>
          </div>
        </div>
        <div className="projection-mobile-card">
          <span>Projected (Month End)</span>
          <strong>{formatCurrency(projection, user?.currency)}</strong>
        </div>
        {transactions.length === 0 ? (
          <div className="summary-mobile-card" style={{ textAlign: "center", padding: "1.5rem" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📊</div>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem" }}>No transactions yet</h3>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>Start tracking to see insights.</p>
            <Link to="/add-transaction" className="cta-button" style={{ display: "inline-block", padding: "0.5rem 1rem", borderRadius: "0.75rem", background: "#4f46e5", color: "white", textDecoration: "none", fontSize: "0.875rem" }}>
              Add First Transaction
            </Link>
          </div>
        ) : (
          <>
            <div className="chart-card-mobile">
              <h4>Income vs Expense</h4>
              <IncomeExpenseBar transactions={filteredTransactions} />
            </div>
            <div className="chart-card-mobile">
              <h4>Spending Categories</h4>
              <ExpenseCategoryDonut transactions={filteredTransactions} />
            </div>
            <div className="chart-card-mobile">
              <h4>Cash Flow Trend</h4>
              <CashFlowLine transactions={filteredTransactions} />
            </div>
            <BudgetOverview budgetStatus={budgetStatus} />
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <h3 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600 }}>Recent Activity</h3>
                <Link to="/expenses" style={{ fontSize: "0.75rem", fontWeight: 500, color: "#4f46e5" }}>View All</Link>
              </div>
              {transactions
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5)
                .map((t) => (
                  <div key={t._id} className="recent-item-mobile">
                    <div className={`icon ${t.type}`}>{t.categoryId?.name?.[0] || "?"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{t.categoryId?.name || "Other"}</div>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{t.description || "No description"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <span className={`amount ${t.type}`}>{t.type === "expense" ? "-" : "+"}{formatCurrency(t.amount, user?.currency)}</span>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                        {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
export default Dashboard;
