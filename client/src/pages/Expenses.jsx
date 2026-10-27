import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import "../styles/expenses.css";
import "../styles/responsive.css";
import { exportTransactionsPdf } from "../utils/exportPdf";
import { useAuth } from "../context/AuthContext";
import formatCurrency from "../utils/currencyFormatter";
import { getCategoryIcon } from "../utils/categoryIcons";
import { Link } from "react-router-dom";
import DataErrorState from "../components/DataErrorState";

function Expenses() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [visibleDays, setVisibleDays] = useState(25);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/transactions");
      setTransactions(res.data);
    } catch (err) {
      console.error("Failed to fetch transactions", err);
      setError(
        err.isServerDown
          ? "Server is currently offline or unreachable. Please verify your connection."
          : (err.response?.data?.message || "Failed to load transactions.")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (categoryFilter !== "all" && t.categoryId?.name !== categoryFilter) return false;
      if (fromDate && new Date(t.date) < new Date(fromDate)) return false;
      if (toDate && new Date(t.date) > new Date(toDate)) return false;
      return true;
    });
  }, [transactions, typeFilter, categoryFilter, fromDate, toDate]);

  useEffect(() => {
    setVisibleDays(25);
  }, [typeFilter, categoryFilter, fromDate, toDate]);

  // Group transactions by date for mobile view
  const groupedTransactions = useMemo(() => {
    const groups = {};
    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    filtered.forEach((t) => {
      const d = new Date(t.date);
      const dateStr = d.toDateString();
      let label = dateStr;
      if (dateStr === todayStr) label = "Today";
      else if (dateStr === yesterdayStr) label = "Yesterday";
      else {
        label = d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }

      if (!groups[label]) {
        groups[label] = { label, items: [], total: 0 };
      }
      groups[label].items.push(t);
      if (t.type === "expense") groups[label].total -= t.amount;
      else groups[label].total += t.amount;
    });

    return Object.values(groups);
  }, [filtered]);

  const handleExport = () => {
    exportTransactionsPdf({
      userName: user?.username || user?.email || "User",
      transactions: filtered,
      fromDate,
      toDate,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await api.delete(`/transactions/${id}`);
      setTransactions((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      alert("Failed to delete transaction");
    }
  };

  if (loading) return <p className="expenses-loading">Loading transactions...</p>;
  if (error) {
    return (
      <DataErrorState
        title="Transactions Unavailable"
        message={error}
        onRetry={fetchTransactions}
      />
    );
  }

  return (
    <div className="expenses-page">
      {/* HEADER */}
      <div className="expenses-header">
        <div>
          <h2>Transactions</h2>
          <p className="expenses-subtitle">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""} found
          </p>
        </div>

        <button className="export-btn" onClick={handleExport} aria-label="Export PDF">
          <span>📄</span> Download PDF
        </button>
      </div>

      {/* MOBILE TYPE SEGMENTED FILTER */}
      <div className="type-segment-tabs">
        <button
          type="button"
          className={`segment-tab ${typeFilter === "all" ? "active" : ""}`}
          onClick={() => setTypeFilter("all")}
        >
          All
        </button>
        <button
          type="button"
          className={`segment-tab ${typeFilter === "expense" ? "active expense" : ""}`}
          onClick={() => setTypeFilter("expense")}
        >
          Expenses
        </button>
        <button
          type="button"
          className={`segment-tab ${typeFilter === "income" ? "active income" : ""}`}
          onClick={() => setTypeFilter("income")}
        >
          Income
        </button>
      </div>

      {/* SECONDARY FILTERS */}
      <div className="expenses-filters">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Categories</option>
          {[...new Set(transactions.map((t) => t.categoryId?.name))]
            .filter(Boolean)
            .map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
        </select>

        <div className="date-filter-row">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="filter-date"
            placeholder="From"
            aria-label="From Date"
          />
          <span className="date-sep">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="filter-date"
            placeholder="To"
            aria-label="To Date"
          />
          {(fromDate || toDate || categoryFilter !== "all" || typeFilter !== "all") && (
            <button
              type="button"
              className="btn-reset-filters"
              onClick={() => {
                setTypeFilter("all");
                setCategoryFilter("all");
                setFromDate("");
                setToDate("");
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* TRANSACTIONS LIST */}
      {filtered.length === 0 ? (
        <div className="empty-expenses">
          <span className="empty-icon">💳</span>
          <h3>No transactions found</h3>
          <p>Try clearing your filters or add a new transaction.</p>
          <Link to="/add-transaction" className="btn-primary" style={{ display: "inline-block", marginTop: "12px", textDecoration: "none" }}>
            + Add Transaction
          </Link>
        </div>
      ) : (
        <div className="expenses-grouped-container">
          {groupedTransactions.slice(0, visibleDays).map((group) => (
            <div key={group.label} className="date-group-block">
              <div className="date-group-header">
                <span className="date-group-title">{group.label}</span>
                <span className={`date-group-total ${group.total >= 0 ? "positive" : "negative"}`}>
                  {group.total >= 0 ? "+" : ""}{formatCurrency(group.total, user?.currency)}
                </span>
              </div>

              <div className="date-group-list">
                {group.items.map((t) => {
                  const icon = getCategoryIcon(t.categoryId, t.type);

                  return (
                    <div key={t._id} className="expenses-card">
                      <div className={`card-icon ${t.type}`}>
                        {icon}
                      </div>

                      <div className="card-content">
                        <div className="card-row top">
                          <span className="card-category">
                            {t.categoryId?.name || "Uncategorized"}
                          </span>
                          <span className={`card-amount ${t.type}`}>
                            {t.type === "expense" ? "-" : "+"}
                            {formatCurrency(t.amount, user?.currency)}
                          </span>
                        </div>

                        <div className="card-row bottom">
                          <span className="card-desc">
                            {t.description || "No description"}
                          </span>
                          <button
                            type="button"
                            className="btn-item-delete"
                            onClick={() => handleDelete(t._id)}
                            title="Delete"
                            aria-label="Delete transaction"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {visibleDays < groupedTransactions.length && (
            <div style={{ textAlign: "center", margin: "24px 0 12px 0" }}>
              <button
                type="button"
                className="export-btn"
                onClick={() => setVisibleDays((prev) => prev + 25)}
                style={{ cursor: "pointer", padding: "10px 24px", fontSize: "0.95rem" }}
              >
                Load More Days ({visibleDays} of {groupedTransactions.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Expenses;
