import { useEffect, useState } from "react";
import api from "../api/axios";
import "../styles/budgets.css";

function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [selectedCategory, setSelectedCategory] = useState("");
  const [amount, setAmount] = useState("");

  const fetchData = async () => {
    try {
      const [catRes, budgetRes] = await Promise.all([
        api.get("/categories"),
        api.get("/budgets")
      ]);
      setCategories(catRes.data);
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
      
      // Refresh list
      fetchData();
      setAmount("");
      setSelectedCategory("");
      alert("Budget set successfully!");
    } catch (error) {
      alert("Failed to set budget");
    }
  };

  if (loading) return <p className="loading-text">Loading budgets...</p>;

  // Helper to find budget for a specific category ID
  const getBudgetForCategory = (catId) => {
    const b = budgets.find(b => b.categoryId?._id === catId);
    return b ? b.amount : 0;
  };

  return (
    <div className="budgets-page">
      <div className="budgets-header">
        <h2>Monthly Budgets</h2>
        <p>Set spending limits for your categories to track progress on your dashboard.</p>
      </div>

      <div className="budgets-container">
        {/* LEFT: SET BUDGET FORM */}
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
              <label>Monthly Limit (₹)</label>
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

        {/* RIGHT: EXISTING BUDGETS LIST */}
        <div className="budget-list-card">
          <h3>Current Limits</h3>
          <div className="budget-list">
            {categories.map(cat => {
              const limit = getBudgetForCategory(cat._id);
              return (
                <div key={cat._id} className="budget-row">
                  <div className="budget-info">
                    <span className="cat-icon">{cat.icon || "🏷️"}</span>
                    <span className="cat-name">{cat.name}</span>
                  </div>
                  <div className="budget-value">
                    {limit > 0 ? (
                      <span className="active-limit">₹ {limit.toLocaleString()}</span>
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