import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom"; // Import Link
import { useAuth } from "../context/AuthContext"; // Import useAuth
import api from "../api/axios";

import SummaryCards from "../components/dashboard/SummaryCards";
import Notifications from "../components/dashboard/Notifications";
import IncomeExpenseBar from "../components/charts/IncomeExpenseBar";
import ExpenseCategoryDonut from "../components/charts/ExpenseCategoryDonut";
import CashFlowLine from "../components/charts/CashFlowLine";

import "../styles/dashboard.css";

function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState("90d");

  /* ===== FETCH DATA ===== */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/transactions");
        setTransactions(res.data);
      } catch {
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /* ===== RANGE TO DAYS ===== */
  const daysBack = useMemo(() => {
    if (range === "7d") return 7;
    if (range === "30d") return 30;
    if (range === "90d") return 90;
    return 0;
  }, [range]);

  /* ===== CURRENT PERIOD ===== */
  const filteredTransactions = useMemo(() => {
    if (!daysBack) return transactions;

    const now = new Date();
    // Set to end of day to ensure all transactions from today are included
    now.setHours(23, 59, 59, 999);

    const fromDate = new Date();
    fromDate.setDate(now.getDate() - daysBack);

    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= fromDate && d <= now;
    });
  }, [transactions, daysBack]);

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
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;

    filteredTransactions.forEach((t) => {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    });

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
  if (error) return <p className="dashboard-error">{error}</p>;

  return (
    <div className="dashboard-page">
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
        </div>
      </div>

      <Notifications />

      {/* SUMMARY CARDS */}
      <SummaryCards
        income={summary.income}
        expense={summary.expense}
        balance={summary.balance}
      />

      {/* EMPTY STATE OR CONTENT */}
      {isEmpty ? (
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

            <div className="chart-card">
              <h4>Income vs Expense</h4>
              <IncomeExpenseBar transactions={filteredTransactions} />
            </div>

            <div className="chart-card">
              <h4>Spending Categories</h4>
              <ExpenseCategoryDonut transactions={filteredTransactions} />
            </div>

            <div className="chart-card">
              <h4>Cash Flow</h4>
              <CashFlowLine transactions={filteredTransactions} />
            </div>
          </div>

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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
