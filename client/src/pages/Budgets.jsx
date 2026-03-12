import { useEffect, useState } from "react";
import api from "../api/axios";
import "../styles/budgets.css";
import { useAuth } from "../context/AuthContext";
import formatCurrency from "../utils/currencyFormatter";

function Budgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCategory, setSelectedCategory] = useState("");
  const [amount, setAmount] = useState("");

  const fetchData = async () => {
    try {
      const [catRes, budgetRes] = await Promise.all([
        api.get("/categories"),
        api.get("/budgets")
      ]);
      const expenseCategories = catRes.data.filter(cat => cat.type === 'expense');
      setCategories(expenseCategories);
      setBudgets(budgetRes.data);
    } catch (error) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSetBudget = async (e) => {
    e.preventDefault();
    if (!selectedCategory || !amount) return;

    try {
      await api.post("/budgets", {
        categoryId: selectedCategory,
        amount: Number(amount)
      });
      
      fetchData();
      setAmount("");
      setSelectedCategory("");
      alert("Budget set successfully!");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to set budget");
    }
  };

  if (loading) return <p className="loading-text">Loading budgets...</p>;

  const getBudgetForCategory = (catId) => {
    const b = budgets.find(b => b.categoryId?._id === catId);
    return b ? b.amount : 0;
  };

  // Extract the raw symbol ($, €, ₹) based on the user's currency choice
  const currencySymbol = (0).toLocaleString(
    { 'INR': 'en-IN', 'USD': 'en-US', 'EUR': 'de-DE', 'GBP': 'en-GB' }[user?.currency || 'INR'], 
    { style: 'currency', currency: user?.currency || 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }
  ).replace(/\d/g, '').trim();

  return (
    <div className="budgets-page">
      <div className="budgets-header">
        <h2>Monthly Budgets</h2>
        <p>Set spending limits for your categories to track progress on your dashboard.</p>
      </div>

      <div className="budgets-container">
        <div className="budget-form-card">
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
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>
                    {cat.icon || "🏷️"} {cat.name}
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
                required
              />
            </div>

            <button type="submit" className="btn-save">Save Limit</button>
          </form>
        </div>

        <div className="budget-list-card">
          <h3>Current Limits</h3>
          <div className="budget-list">
            {categories.filter(cat => cat.type === 'expense').map(cat => {
              const limit = getBudgetForCategory(cat._id);
              return (
                <div key={cat._id} className="budget-row">
                  <div className="budget-info">
                    <span className="cat-icon">{cat.icon || "🏷️"}</span>
                    <span className="cat-name">{cat.name}</span>
                  </div>
                  <div className="budget-value">
                    {limit > 0 ? (
                      <span className="active-limit">{formatCurrency(limit, user?.currency)}</span>
                    ) : (
                      <span className="no-limit">No Limit</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
export default Budgets;
