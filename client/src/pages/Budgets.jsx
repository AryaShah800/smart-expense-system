import { useEffect, useState } from "react";
import api from "../api/axios";
import "../styles/budgets.css";
import "../styles/responsive.css";
import { useAuth } from "../context/AuthContext";
import formatCurrency, { getCurrencySymbol } from "../utils/currencyFormatter";
import { getCategoryIcon } from "../utils/categoryIcons";
import Modal from "../components/Modal";
import DataErrorState from "../components/DataErrorState";

function Budgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgetStatus, setBudgetStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const [catRes, budgetRes, statusRes] = await Promise.all([
        api.get("/categories"),
        api.get("/budgets"),
        api.get("/budgets/status", { params: { timezone: userTimezone } }).catch(() => ({ data: [] })),
      ]);

      const expenseCategories = catRes.data.filter((cat) => cat.type === "expense");
      setCategories(expenseCategories);
      setBudgets(budgetRes.data);
      setBudgetStatus(statusRes.data || []);
    } catch (err) {
      console.error("Failed to fetch budgets data", err);
      setError(
        err.isServerDown
          ? "Server is currently offline or unreachable. Please verify your connection."
          : (err.response?.data?.message || "Failed to load budget data.")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSetBudget = async (e) => {
    e.preventDefault();
    if (!selectedCategory) return;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Please enter a valid monthly limit greater than 0");
      return;
    }

    setIsSaving(true);
    try {
      await api.post("/budgets", {
        categoryId: selectedCategory,
        amount: numAmount,
      });

      await fetchData();
      setAmount("");
      setSelectedCategory("");
      setShowModal(false);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to set budget");
    } finally {
      setIsSaving(false);
    }
  };

  const getBudgetDetails = (catId) => {
    const status = budgetStatus.find((s) => s.category?._id === catId);
    const budgetDoc = budgets.find((b) => b.categoryId?._id === catId);
    const limit = budgetDoc ? budgetDoc.amount : 0;
    const spent = status ? status.spent : 0;
    const percent = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
    const isExceeded = limit > 0 && spent > limit;

    return { limit, spent, percent, isExceeded };
  };

  const currencySymbol = getCurrencySymbol(user?.currency);

  if (loading) return <p className="loading-text">Loading budgets...</p>;
  if (error) {
    return (
      <DataErrorState
        title="Budgets Unavailable"
        message={error}
        onRetry={fetchData}
      />
    );
  }

  return (
    <div className="budgets-page">
      <div className="budgets-header-row">
        <div>
          <h2>Monthly Budgets</h2>
          <p className="budgets-subtitle">Set and track spending limits across categories</p>
        </div>
        <button
          type="button"
          className="btn-create-budget"
          onClick={() => setShowModal(true)}
        >
          + Set Limit
        </button>
      </div>

      <div className="budgets-container">
        {/* Desktop inline form card */}
        <div className="budget-form-card show-from-md-block">
          <h3>Set New Budget</h3>
          <form onSubmit={handleSetBudget}>
            <div className="form-group">
              <label>Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {getCategoryIcon(cat, "expense")} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Monthly Limit ({currencySymbol})</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000"
                min="1"
                required
              />
            </div>

            <button type="submit" disabled={isSaving} className="btn-save">
              {isSaving ? "Saving..." : "Save Limit"}
            </button>
          </form>
        </div>

        {/* Current Limits List with Visual Progress Bars */}
        <div className="budget-list-card">
          <div className="card-header-flex">
            <h3>Category Budgets</h3>
            <span className="budget-count">{categories.length} categories</span>
          </div>

          <div className="budget-list">
            {categories.map((cat) => {
              const { limit, spent, percent, isExceeded } = getBudgetDetails(cat._id);
              const icon = getCategoryIcon(cat, "expense");

              return (
                <div key={cat._id} className="budget-row-card">
                  <div className="budget-row-top">
                    <div className="budget-info">
                      <span className="cat-icon-badge">{icon}</span>
                      <div>
                        <span className="cat-name">{cat.name}</span>
                        {limit > 0 && (
                          <div className="cat-subtext">
                            {formatCurrency(spent, user?.currency)} spent
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="budget-value">
                      {limit > 0 ? (
                        <div className="limit-block">
                          <span className={`active-limit ${isExceeded ? "exceeded" : ""}`}>
                            {formatCurrency(limit, user?.currency)}
                          </span>
                          <button
                            type="button"
                            className="btn-edit-inline"
                            onClick={() => {
                              setSelectedCategory(cat._id);
                              setAmount(String(limit));
                              setShowModal(true);
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn-set-inline"
                          onClick={() => {
                            setSelectedCategory(cat._id);
                            setAmount("");
                            setShowModal(true);
                          }}
                        >
                          + Set Limit
                        </button>
                      )}
                    </div>
                  </div>

                  {limit > 0 && (
                    <div className="budget-progress-wrap">
                      <div className="progress-bar">
                        <div
                          className={`progress-fill ${
                            isExceeded ? "danger" : percent > 80 ? "warning" : "success"
                          }`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                      <div className="progress-label">
                        <span>{percent}% used</span>
                        <span className={isExceeded ? "text-danger" : ""}>
                          {isExceeded
                            ? `Exceeded by ${formatCurrency(spent - limit, user?.currency)}`
                            : `${formatCurrency(Math.max(0, limit - spent), user?.currency)} left`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Set Budget Modal (Mobile & Fast Action) */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedCategory("");
          setAmount("");
        }}
        title="Set Category Budget"
      >
        <form onSubmit={handleSetBudget} className="budget-modal-form">
          <div className="form-group">
            <label>Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              required
              className="category-select"
            >
              <option value="" disabled>Select Category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {getCategoryIcon(cat, "expense")} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Monthly Budget Limit ({currencySymbol})</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              min="1"
              required
              className="text-input"
              autoFocus
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-modal-cancel"
            >
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="btn-modal-confirm">
              {isSaving ? "Saving..." : "Save Budget"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Budgets;
