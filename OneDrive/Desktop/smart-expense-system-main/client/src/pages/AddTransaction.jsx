import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/addTransaction.css";

function AddTransaction() {
  const navigate = useNavigate();

  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/categories");
        setCategories(res.data.filter(c => c.type === type));
      } catch {
        console.error("Failed to load categories");
      }
    };
    fetchCategories();
  }, [type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/transactions", {
        amount: Number(amount),
        type,
        date,
        description,
        categoryId,
      });
      navigate("/expenses");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transaction-page">
      <div className="transaction-card">
        <h2>Add Transaction</h2>
        <p className="subtitle">Track your income and expenses</p>

        {error && <p className="error-text">{error}</p>}

        {/* Type toggle */}
        <div className="type-toggle">
          <button
            className={type === "expense" ? "active expense" : ""}
            onClick={() => setType("expense")}
            type="button"
          >
            Expense
          </button>
          <button
            className={type === "income" ? "active income" : ""}
            onClick={() => setType("income")}
            type="button"
          >
            Income
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="amount-field">
            <span>₹</span>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Transaction"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddTransaction;
