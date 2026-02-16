import { useEffect, useMemo, useState } from "react";
<<<<<<< HEAD
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { exportTransactionsPdf } from "../utils/exportPdf"; // Import Export Utility
=======
import { Link } from "react-router-dom"; // Import Link
import { useAuth } from "../context/AuthContext"; // Import useAuth
import api from "../api/axios";
>>>>>>> b32fcb37c5c7dd229814a2683f6e4e705f3400c2

import SummaryCards from "../components/dashboard/SummaryCards";
import Notifications from "../components/dashboard/Notifications";
import IncomeExpenseBar from "../components/charts/IncomeExpenseBar";
import ExpenseCategoryDonut from "../components/charts/ExpenseCategoryDonut";
import CashFlowLine from "../components/charts/CashFlowLine";
<<<<<<< HEAD
import BudgetOverview from "../components/dashboard/BudgetOverview"; // Import New Component
=======
>>>>>>> b32fcb37c5c7dd229814a2683f6e4e705f3400c2

import "../styles/dashboard.css";

function Dashboard() {
  const [transactions, setTransactions] = useState([]);
<<<<<<< HEAD
  const [budgetStatus, setBudgetStatus] = useState([]); // State for budgets
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState("90d");
  const { user } = useAuth();
=======
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState("90d");
>>>>>>> b32fcb37c5c7dd229814a2683f6e4e705f3400c2

  /* ===== FETCH DATA ===== */
  useEffect(() => {
    const fetchData = async () => {
      try {
<<<<<<< HEAD
        setLoading(true);
        // Fetch Transactions and Budget Status in parallel
        const [txRes, budgetRes] = await Promise.all([
          api.get("/transactions"),
          api.get("/budgets/status") // Ensure backend route exists
        ]);
        
        setTransactions(txRes.data);
        setBudgetStatus(budgetRes.data);
      } catch (err) {
        console.error(err);
=======
        const res = await api.get("/transactions");
        setTransactions(res.data);
      } catch {
>>>>>>> b32fcb37c5c7dd229814a2683f6e4e705f3400c2
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

<<<<<<< HEAD
  /* ===== RANGE LOGIC ===== */
=======
  /* ===== RANGE TO DAYS ===== */
>>>>>>> b32fcb37c5c7dd229814a2683f6e4e705f3400c2
  const daysBack = useMemo(() => {
    if (range === "7d") return 7;
    if (range === "30d") return 30;
    if (range === "90d") return 90;
    return 0;
  }, [range]);

<<<<<<< HEAD
  const filteredTransactions = useMemo(() => {
    if (!daysBack) return transactions;
    const now = new Date();
    now.setHours(23, 59, 59, 999);
=======
  /* ===== CURRENT PERIOD ===== */
  const filteredTransactions = useMemo(() => {
    if (!daysBack) return transactions;

    const now = new Date();
    // Set to end of day to ensure all transactions from today are included
    now.setHours(23, 59, 59, 999);

>>>>>>> b32fcb37c5c7dd229814a2683f6e4e705f3400c2
    const fromDate = new Date();
    fromDate.setDate(now.getDate() - daysBack);

    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= fromDate && d <= now;
    });
  }, [transactions, daysBack]);

<<<<<<< HEAD
  /* ===== FINANCIAL CALCULATIONS ===== */
=======
  /* ===== PREVIOUS PERIOD ===== */
  const previousTransactions = useMemo(() => {
    if (!daysBack) return [];

    const now = new Date();
    const prevEnd = new Date();
    prevEnd.setDate(now.getDate() - daysBack);

    const prevStart = new Date();
    prevStart.setDate(now.getDate() - daysBack * 2);

    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= prevStart && d < prevEnd;
    });
  }, [transactions, daysBack]);

  /* ===== SUMMARY ===== */
>>>>>>> b32fcb37c5c7dd229814a2683f6e4e705f3400c2
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;

    filteredTransactions.forEach((t) => {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    });

<<<<<<< HEAD
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
=======
    return {
      income,
      expense,
      balance: income - expense,
    };
  }, [filteredTransactions]);

  /* ===== COMPARISON ===== */
  const comparison = useMemo(() => {
    let currentExpense = 0;
    let previousExpense = 0;

    filteredTransactions.forEach((t) => {
      if (t.type === "expense") currentExpense += t.amount;
    });

    previousTransactions.forEach((t) => {
      if (t.type === "expense") previousExpense += t.amount;
    });

    if (previousExpense === 0) return null;

    const diff = ((currentExpense - previousExpense) / previousExpense) * 100;

    return {
      isIncrease: diff > 0,
      value: Math.abs(diff).toFixed(1),
    };
  }, [filteredTransactions, previousTransactions]);

  /* ===== AUTH & USER ===== */
  const { user } = useAuth();

  /* ===== RECENT TRANSACTIONS ===== */
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [transactions]);

  /* ===== EMPTY STATE ===== */
  const isEmpty = transactions.length === 0;

  /* ===== STATES ===== */
  if (loading) return <p className="dashboard-loading">Loading dashboard…</p>;
>>>>>>> b32fcb37c5c7dd229814a2683f6e4e705f3400c2
  if (error) return <p className="dashboard-error">{error}</p>;

  return (
    <div className="dashboard-page">
<<<<<<< HEAD
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
=======
      {/* HEADER WITH WELCOME */}
      <div className="dashboard-header-row">
        <div className="welcome-section">
          <h1>Hello, {user?.username?.split(" ")[0] || "User"}! 👋</h1>
          <p className="dashboard-subtitle">Here is your financial overview</p>
        </div>

        {/* DROPDOWN FILTER */}
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
>>>>>>> b32fcb37c5c7dd229814a2683f6e4e705f3400c2
        </div>
      </div>

      <Notifications />

<<<<<<< HEAD
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
=======
      {/* SUMMARY CARDS */}
      <SummaryCards
        income={summary.income}
        expense={summary.expense}
        balance={summary.balance}
      />

      {/* EMPTY STATE OR CONTENT */}
      {isEmpty ? (
>>>>>>> b32fcb37c5c7dd229814a2683f6e4e705f3400c2
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
<<<<<<< HEAD
=======
            <h3 className="section-title">Analysis</h3>

            {comparison && (
              <div className="insight-card">
                <span className="insight-icon">{comparison.isIncrease ? "📉" : "📈"}</span>
                <p>
                  Expenses <strong>{comparison.isIncrease ? "increased" : "decreased"}</strong> by{" "}
                  <span className={comparison.isIncrease ? "neg" : "pos"}>{comparison.value}%</span>{" "}
                  vs previous period.
                </p>
              </div>
            )}

>>>>>>> b32fcb37c5c7dd229814a2683f6e4e705f3400c2
            <div className="chart-card">
              <h4>Income vs Expense</h4>
              <IncomeExpenseBar transactions={filteredTransactions} />
            </div>

            <div className="chart-card">
              <h4>Spending Categories</h4>
              <ExpenseCategoryDonut transactions={filteredTransactions} />
            </div>

            <div className="chart-card">
<<<<<<< HEAD
              <h4>Cash Flow Trend</h4>
=======
              <h4>Cash Flow</h4>
>>>>>>> b32fcb37c5c7dd229814a2683f6e4e705f3400c2
              <CashFlowLine transactions={filteredTransactions} />
            </div>
          </div>

<<<<<<< HEAD
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
                            {t.type === "expense" ? "-" : "+"}₹{t.amount}
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
=======
          {/* RIGHT COLUMN: RECENT LIST */}
          <div className="recent-column">
            <div className="section-header">
              <h3 className="section-title">Recent Activity</h3>
              <Link to="/expenses" className="view-all-link">View All</Link>
            </div>

            <div className="recent-list">
              {recentTransactions.map((t) => (
                <div key={t._id} className="expenses-card mini">
                  <div className={`card-icon ${t.type}`}>
                    {t.categoryId?.name?.[0] || "?"}
                  </div>

                  <div className="card-content">
                    <div className="card-row top">
                      <span className="card-category">{t.categoryId?.name || "Other"}</span>
                      <span className={`card-amount ${t.type}`}>
                        {t.type === "expense" ? "-" : "+"}₹{t.amount}
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
>>>>>>> b32fcb37c5c7dd229814a2683f6e4e705f3400c2
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

<<<<<<< HEAD
export default Dashboard;
=======
export default Dashboard;
>>>>>>> b32fcb37c5c7dd229814a2683f6e4e705f3400c2
