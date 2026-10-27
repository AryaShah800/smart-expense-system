import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import formatCurrency from "../utils/currencyFormatter";
import { getCategoryIcon } from "../utils/categoryIcons";
import toast from "react-hot-toast";
import DataErrorState from "../components/DataErrorState";
import "../styles/recurring.css";

export default function Recurring() {
  const { user } = useAuth();

  const [recurringList, setRecurringList] = useState([]);
  const [summary, setSummary] = useState({
    activeCount: 0,
    monthlyRecurringExpense: 0,
    monthlyRecurringIncome: 0,
    netRecurring: 0,
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Form state
  const [form, setForm] = useState({
    description: "",
    amount: "",
    type: "expense",
    categoryId: "",
    frequency: "monthly",
    startDate: new Date().toISOString().split("T")[0],
    createInitialTransaction: true,
  });
  const [submitting, setSubmitting] = useState(false);

  /* ===== FETCH RECURRING DATA ===== */
  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const [recRes, catRes] = await Promise.all([
        api.get("/recurring"),
        api.get("/categories"),
      ]);

      setRecurringList(recRes.data.recurring || []);
      setSummary(
        recRes.data.summary || {
          activeCount: 0,
          monthlyRecurringExpense: 0,
          monthlyRecurringIncome: 0,
          netRecurring: 0,
        }
      );
      setCategories(catRes.data || []);
    } catch (err) {
      console.error("Failed to load recurring data:", err);
      setError(
        err.isServerDown
          ? "The server appears offline. Could not load recurring transactions."
          : err.response?.data?.message || "Failed to load recurring transactions."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ===== PROCESS / SYNC DUE RECURRING ===== */
  const handleProcessDue = async () => {
    try {
      setSyncing(true);
      const res = await api.post("/recurring/process");
      toast.success(
        res.data.processedCount > 0
          ? `Processed ${res.data.processedCount} due recurring transactions!`
          : "All recurring transactions are up to date."
      );
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to process recurring transactions");
    } finally {
      setSyncing(false);
    }
  };

  /* ===== TOGGLE STATUS (ACTIVE / PAUSED) ===== */
  const handleToggleStatus = async (item) => {
    const newStatus = item.status === "active" ? "paused" : "active";
    try {
      await api.put(`/recurring/${item._id}`, { status: newStatus });
      toast.success(`Schedule ${newStatus === "active" ? "resumed" : "paused"}`);
      setRecurringList((prev) =>
        prev.map((r) => (r._id === item._id ? { ...r, status: newStatus } : r))
      );
      // Recalculate summary locally or re-fetch
      fetchData();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  /* ===== DELETE RECURRING ===== */
  const handleDelete = async (id) => {
    if (!window.confirm("Remove this recurring schedule? Existing past transactions won't be deleted.")) {
      return;
    }
    try {
      await api.delete(`/recurring/${id}`);
      toast.success("Recurring schedule removed");
      setRecurringList((prev) => prev.filter((r) => r._id !== id));
      fetchData();
    } catch (err) {
      toast.error("Failed to remove recurring schedule");
    }
  };

  /* ===== SUBMIT NEW RECURRING ===== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = Number(form.amount);

    if (!form.description.trim()) {
      toast.error("Please enter a description (e.g. Netflix, Rent)");
      return;
    }
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (!form.categoryId) {
      toast.error("Please select a category");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/recurring", {
        description: form.description.trim(),
        amount: numAmount,
        type: form.type,
        categoryId: form.categoryId,
        frequency: form.frequency,
        startDate: form.startDate,
        createInitialTransaction: form.createInitialTransaction,
      });

      toast.success("Recurring schedule added successfully!");
      setIsModalOpen(false);
      setForm({
        description: "",
        amount: "",
        type: "expense",
        categoryId: "",
        frequency: "monthly",
        startDate: new Date().toISOString().split("T")[0],
        createInitialTransaction: true,
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create recurring schedule");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for due date badge
  const getDueBadge = (dueDateStr) => {
    if (!dueDateStr) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: "Due today (processing)", class: "due-urgent" };
    }
    if (diffDays === 0) {
      return { text: "Due today", class: "due-urgent" };
    }
    if (diffDays === 1) {
      return { text: "Due tomorrow", class: "due-soon" };
    }
    if (diffDays <= 7) {
      return { text: `Due in ${diffDays} days`, class: "due-soon" };
    }
    return {
      text: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      class: "due-normal",
    };
  };

  const filteredItems = recurringList.filter((r) => {
    if (filterType === "all") return true;
    return r.type === filterType;
  });

  const availableCategories = categories.filter((c) => c.type === form.type);

  if (loading) return <p className="recurring-loading">Loading recurring commitments...</p>;
  if (error) {
    return (
      <DataErrorState
        title="Recurring Schedules Unavailable"
        message={error}
        onRetry={fetchData}
      />
    );
  }

  return (
    <div className="recurring-page">
      {/* HEADER */}
      <div className="recurring-header">
        <div>
          <h2>🔁 Recurring Transactions</h2>
          <p className="recurring-subtitle">
            Manage your automated bills, subscriptions, salary, and commitments
          </p>
        </div>

        <div className="recurring-header-actions">
          <button
            type="button"
            className="btn-recurring-sync"
            onClick={handleProcessDue}
            disabled={syncing}
            title="Scan & execute due recurring items"
          >
            {syncing ? "Checking..." : "⚡ Sync Due"}
          </button>
          <button
            type="button"
            className="btn-new-recurring"
            onClick={() => setIsModalOpen(true)}
          >
            + Add Schedule
          </button>
        </div>
      </div>

      {/* COMMITMENTS SUMMARY CARDS */}
      <div className="recurring-summary-grid">
        <div className="recurring-summary-card">
          <span className="summary-label">Monthly Commitments</span>
          <strong className="summary-value expense">
            {formatCurrency(summary.monthlyRecurringExpense, user?.currency)}
          </strong>
          <span className="summary-subtext">Estimated monthly outflows</span>
        </div>

        <div className="recurring-summary-card">
          <span className="summary-label">Monthly Recurring Inflow</span>
          <strong className="summary-value income">
            {formatCurrency(summary.monthlyRecurringIncome, user?.currency)}
          </strong>
          <span className="summary-subtext">Scheduled salaries & deposits</span>
        </div>

        <div className="recurring-summary-card">
          <span className="summary-label">Active Subscriptions</span>
          <strong className="summary-value count">
            {summary.activeCount} active
          </strong>
          <span className="summary-subtext">
            {recurringList.length - summary.activeCount} paused
          </span>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="recurring-filter-tabs">
        <button
          type="button"
          className={`rec-tab ${filterType === "all" ? "active" : ""}`}
          onClick={() => setFilterType("all")}
        >
          All ({recurringList.length})
        </button>
        <button
          type="button"
          className={`rec-tab ${filterType === "expense" ? "active expense" : ""}`}
          onClick={() => setFilterType("expense")}
        >
          Bills & Subs ({recurringList.filter((r) => r.type === "expense").length})
        </button>
        <button
          type="button"
          className={`rec-tab ${filterType === "income" ? "active income" : ""}`}
          onClick={() => setFilterType("income")}
        >
          Income ({recurringList.filter((r) => r.type === "income").length})
        </button>
      </div>

      {/* RECURRING LIST */}
      {filteredItems.length === 0 ? (
        <div className="recurring-empty">
          <div className="empty-icon">🔁</div>
          <h3>No recurring items found</h3>
          <p>
            Track your subscriptions (Netflix, Spotify, Gym) and recurring bills (Rent, Utilities, SIP)
            so you never miss a payment.
          </p>
          <button
            type="button"
            className="btn-new-recurring"
            onClick={() => setIsModalOpen(true)}
          >
            + Create Your First Schedule
          </button>
        </div>
      ) : (
        <div className="recurring-list-grid">
          {filteredItems.map((item) => {
            const dueInfo = getDueBadge(item.nextDueDate);
            const icon = getCategoryIcon(item.categoryId, item.type);

            return (
              <div
                key={item._id}
                className={`recurring-card ${item.status === "paused" ? "paused" : ""}`}
              >
                <div className="rec-card-header">
                  <div className="rec-card-icon-title">
                    <div className={`rec-icon ${item.type}`}>{icon}</div>
                    <div>
                      <h4 className="rec-title">{item.description}</h4>
                      <span className="rec-category">
                        {item.categoryId?.name || "General"}
                      </span>
                    </div>
                  </div>

                  <div className="rec-status-toggle">
                    <button
                      type="button"
                      className={`btn-status-toggle ${item.status}`}
                      onClick={() => handleToggleStatus(item)}
                      title={item.status === "active" ? "Click to Pause" : "Click to Resume"}
                    >
                      {item.status === "active" ? "Active" : "Paused"}
                    </button>
                  </div>
                </div>

                <div className="rec-card-middle">
                  <div className="rec-frequency-badge">
                    <span>🔁 {item.frequency}</span>
                  </div>
                  {dueInfo && item.status === "active" && (
                    <span className={`rec-due-badge ${dueInfo.class}`}>
                      📅 {dueInfo.text}
                    </span>
                  )}
                </div>

                <div className="rec-card-footer">
                  <div className="rec-amount-wrapper">
                    <span className={`rec-amount ${item.type}`}>
                      {item.type === "expense" ? "-" : "+"}
                      {formatCurrency(item.amount, user?.currency)}
                    </span>
                    <span className="rec-period-label">/{item.frequency}</span>
                  </div>

                  <button
                    type="button"
                    className="btn-delete-rec"
                    onClick={() => handleDelete(item._id)}
                    title="Remove recurring schedule"
                    aria-label="Delete schedule"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal recurring-modal">
            <div className="modal-header">
              <h3>Create Recurring Schedule</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="recurring-form">
              {/* TYPE SWITCH */}
              <div className="rec-type-selector">
                <button
                  type="button"
                  className={`type-btn ${form.type === "expense" ? "active expense" : ""}`}
                  onClick={() => setForm({ ...form, type: "expense", categoryId: "" })}
                >
                  Expense / Bill
                </button>
                <button
                  type="button"
                  className={`type-btn ${form.type === "income" ? "active income" : ""}`}
                  onClick={() => setForm({ ...form, type: "income", categoryId: "" })}
                >
                  Income / Deposit
                </button>
              </div>

              {/* TITLE */}
              <div className="form-group">
                <label>Description / Name</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="e.g. Netflix, Apartment Rent, Gym"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                />
              </div>

              {/* AMOUNT & FREQUENCY */}
              <div className="form-row-2">
                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    className="modal-input"
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onKeyDown={(e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Frequency</label>
                  <select
                    className="modal-select"
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              {/* CATEGORY & START DATE */}
              <div className="form-row-2">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    className="modal-select"
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    required
                  >
                    <option value="">Select Category</option>
                    {availableCategories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    className="modal-input"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* RECORD INITIAL TRANSACTION CHECKBOX */}
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.createInitialTransaction}
                  onChange={(e) =>
                    setForm({ ...form, createInitialTransaction: e.target.checked })
                  }
                />
                <span>Record first payment transaction immediately</span>
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-btn secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-btn primary"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Start Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
