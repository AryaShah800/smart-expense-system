import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import "../styles/expenses.css";
import { exportTransactionsPdf } from "../utils/exportPdf";

function Expenses() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await api.get("/transactions");
      setTransactions(res.data);
    } catch {
      console.error("Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (
        categoryFilter !== "all" &&
        t.categoryId?.name !== categoryFilter
      )
        return false;
      if (fromDate && new Date(t.date) < new Date(fromDate)) return false;
      if (toDate && new Date(t.date) > new Date(toDate)) return false;
      return true;
    });
  }, [transactions, typeFilter, categoryFilter, fromDate, toDate]);

  const handleExport = () => {
  exportTransactionsPdf({
    userName: user?.username || user?.email || "User",
    transactions: filtered,
    fromDate,
    toDate,
  });
};

  if (loading) return <p className="expenses-loading">Loading…</p>;

  return (
    <div className="expenses-page">
      {/* HEADER */}
      <div className="expenses-header">
        <div>
          <h2>Transactions</h2>
          <p className="expenses-subtitle">
            Filter and manage your records
          </p>
        </div>

        <button className="export-btn" onClick={handleExport}>
          ⬇ Download PDF
        </button>
      </div>

      {/* FILTERS */}
      <div className="expenses-filters">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {[...new Set(transactions.map((t) => t.categoryId?.name))]
            .filter(Boolean)
            .map((c) => (
              <option key={c}>{c}</option>
            ))}
        </select>

        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />

        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
      </div>

      {/* LIST */}
      <div className="expenses-list">
        {filtered.map((t) => (
          <div key={t._id} className={`expenses-card ${t.type}`}>
            <div className="expenses-left">
              <div className="expenses-category">
                {t.categoryId?.name || "Other"}
              </div>
              <div className="expenses-desc">{t.description || "—"}</div>
            </div>

            <div className="expenses-right">
              <div className={`expenses-amount ${t.type}`}>
                {t.type === "expense" ? "-" : "+"}₹{t.amount}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Expenses;
