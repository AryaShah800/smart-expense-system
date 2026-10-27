import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import { getCurrencySymbol } from "../utils/currencyFormatter";
import { getCategoryIcon } from "../utils/categoryIcons";
import "../styles/addTransaction.css";
import "../styles/responsive.css";

function AddTransaction() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [description, setDescription] = useState("");
  // Pre-fill with today's local date for mobile convenience
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState("monthly");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const currencySymbol = getCurrencySymbol(user?.currency);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/categories");
        const filtered = res.data.filter((c) => c.type === type);
        setCategories(filtered);
        // Pre-select first category if none selected or not in filtered
        if (filtered.length > 0 && (!categoryId || !filtered.some((c) => c._id === categoryId))) {
          setCategoryId(filtered[0]._id);
        }
      } catch {
        console.error("Failed to load categories");
      }
    };
    fetchCategories();
  }, [type]);

  const handleQuickAmount = (delta) => {
    const current = Number(amount) || 0;
    setAmount(String(current + delta));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }
    if (!categoryId) {
      setError("Please select a category");
      return;
    }

    setLoading(true);

    try {
      await api.post("/transactions", {
        amount: Number(amount),
        type,
        date: date || new Date().toISOString().split("T")[0],
        description: description.trim(),
        categoryId,
        isRecurring,
        frequency: isRecurring ? frequency : undefined,
      });
      navigate(isRecurring ? "/recurring" : "/expenses");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transaction-page">
      <div className="transaction-card">
        <div className="transaction-header-wrap hide-from-md">
          <span className="mobile-pill-tag">Quick Entry</span>
        </div>

        <h2 className="show-from-md-block">Add Transaction</h2>
        <p className="subtitle show-from-md-block">Track your income and expenses</p>

        {error && <p className="error-text">{error}</p>}

        {/* Type toggle */}
        <div className="type-toggle">
          <button
            className={`toggle-btn ${type === "expense" ? "active expense" : ""}`}
            onClick={() => setType("expense")}
            type="button"
          >
            📉 Expense
          </button>
          <button
            className={`toggle-btn ${type === "income" ? "active income" : ""}`}
            onClick={() => setType("income")}
            type="button"
          >
            📈 Income
          </button>
        </div>

        <form id="add-transaction-form" onSubmit={handleSubmit}>
          {/* Amount input */}
          <div className="form-group amount-group">
            <label>Amount</label>
            <div className="input-wrapper amount-wrapper">
              <span className="currency-symbol">{currencySymbol}</span>
              <input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || (!isNaN(val) && Number(val) >= 0)) {
                    setAmount(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (["-", "+", "e", "E"].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                autoFocus
                min="0.01"
                step="any"
                required
                className="amount-input-lg"
              />
            </div>
            {/* Quick Amount Adder Chips for Mobile Thumbs */}
            <div className="quick-amount-chips">
              {[100, 500, 1000, 5000].map((val) => (
                <button
                  key={val}
                  type="button"
                  className="chip-btn"
                  onClick={() => handleQuickAmount(val)}
                >
                  +{currencySymbol}{val >= 1000 ? `${val / 1000}k` : val}
                </button>
              ))}
              {amount && (
                <button
                  type="button"
                  className="chip-btn chip-clear"
                  onClick={() => setAmount("")}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Category selection */}
          <div className="form-group">
            <div className="label-row">
              <label>Category</label>
              <button
                type="button"
                className="add-category-link"
                onClick={() => setIsModalOpen(true)}
              >
                + New Category
              </button>
            </div>
            <div className="category-row">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="category-select"
              >
                <option value="" disabled>Select Category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {getCategoryIcon(cat, type)} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Dinner with friends, Uber, Groceries"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-input"
            />
          </div>

          {/* Date */}
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="date-input"
            />
          </div>

          {/* Recurring Schedule Switch */}
          <div className="recurring-toggle-box">
            <label className="recurring-checkbox-label">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
              />
              <span className="recurring-toggle-text">
                <strong>🔁 Repeat this transaction</strong>
                <small>Automatically track this {type} on a recurring schedule</small>
              </span>
            </label>

            {isRecurring && (
              <div className="recurring-freq-select-wrap">
                <label>Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="recurring-freq-select"
                >
                  <option value="monthly">Monthly (Rent, Subscriptions, Salary)</option>
                  <option value="weekly">Weekly (Groceries, Allowance)</option>
                  <option value="daily">Daily</option>
                  <option value="yearly">Yearly (Annual Insurance, Software)</option>
                </select>
              </div>
            )}
          </div>

          {/* Desktop Submit Button */}
          <div className="show-from-md-block">
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? "Saving..." : "Save Transaction"}
            </button>
          </div>
        </form>

        {/* Mobile Sticky Save Bar */}
        <div className="sticky-save-bar-mobile hide-from-md">
          <button
            type="submit"
            form="add-transaction-form"
            disabled={loading}
            className="submit-btn mobile-submit-cta"
          >
            {loading ? "Saving..." : `Save ${type === "expense" ? "Expense" : "Income"}`}
          </button>
        </div>

        {/* Add Category Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add Custom Category"
        >
          <div className="custom-category-modal-content">
            <p className="modal-description">
              Create a custom category for tracking your {type}s.
            </p>
            <input
              type="text"
              placeholder="e.g. Gym, Pet Care, Freelance"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="category-modal-input"
              autoFocus
            />
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn-modal-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!newCategoryName.trim()) return;
                  try {
                    const res = await api.post("/categories", {
                      name: newCategoryName.trim(),
                      type,
                      icon: getCategoryIcon(newCategoryName, type),
                    });
                    setCategories([...categories, res.data]);
                    setCategoryId(res.data._id);
                    setNewCategoryName("");
                    setIsModalOpen(false);
                  } catch (err) {
                    alert(err.response?.data?.message || "Failed to add category");
                  }
                }}
                className="btn-modal-confirm"
              >
                Add Category
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default AddTransaction;
