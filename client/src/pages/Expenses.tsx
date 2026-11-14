import { useMemo, useState } from "react";
import { populated, type Transaction } from "../types/models";
import { useTransactions, useDeleteTransaction } from "../hooks/queries";
import { loadErrorText, toLoadError } from "../store/loadError";
import "../styles/expenses.css";
import "../styles/responsive.css";
import { exportTransactionsPdf } from "../utils/exportPdf";
import { useAuth } from "../hooks/useAuth";
import formatCurrency from "../utils/currencyFormatter";
import { getCategoryIcon } from "../utils/categoryIcons";
import { Link } from "react-router-dom";
import DataErrorState from "../components/DataErrorState";

function Expenses() {
  const { user } = useAuth();
  const txQuery = useTransactions();
  const deleteTransaction = useDeleteTransaction();
  const transactions = useMemo(() => txQuery.data ?? [], [txQuery.data]);
  // Cached transactions stay on screen while a background refetch runs.
  const loading = txQuery.isPending;
  const error = txQuery.error
    ? loadErrorText(
        toLoadError(txQuery.error, "Failed to load transactions."),
        "Server is currently offline or unreachable. Please verify your connection."
      )
    : "";
  const fetchTransactions = () => {
    txQuery.refetch();
  };

  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  // The page size resets whenever a filter changes (derived from the filter key, no effect needed).
  const filterKey = `${typeFilter}|${categoryFilter}|${fromDate}|${toDate}`;
  const [pageSize, setPageSize] = useState({ key: filterKey, days: 25 });
  const visibleDays = pageSize.key === filterKey ? pageSize.days : 25;

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (categoryFilter !== "all" && populated(t.categoryId)?.name !== categoryFilter) return false;
      if (fromDate && new Date(t.date) < new Date(fromDate)) return false;
      if (toDate && new Date(t.date) > new Date(toDate)) return false;
      return true;
    });
  }, [transactions, typeFilter, categoryFilter, fromDate, toDate]);


  // Group transactions by date for mobile view
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, { label: string; items: Transaction[]; total: number }> = {};
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

      const group = (groups[label] ??= { label, items: [], total: 0 });
      group.items.push(t);
      if (t.type === "expense") group.total -= t.amount;
      else group.total += t.amount;
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

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this transaction?")) return;
    deleteTransaction.mutate(id, { onError: () => alert("Failed to delete transaction") });
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
          aria-label="Filter by category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Categories</option>
          {[...new Set(transactions.map((t) => populated(t.categoryId)?.name))]
            .filter((name): name is string => Boolean(name))
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
                            {populated(t.categoryId)?.name || "Uncategorized"}
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
                onClick={() => setPageSize({ key: filterKey, days: visibleDays + 25 })}
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
