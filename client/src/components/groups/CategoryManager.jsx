import { useState, useEffect } from "react";
import api from "../../api/axios";

function CategoryManager({ groupId }) {
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState("");
  const [showInput, setShowInput] = useState(false);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const res = await api.get(`/groups/${groupId}/categories`);
      setCategories(res.data);
    } catch (err) {
      console.error("Failed to load categories");
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [groupId]);

  const handleAdd = async () => {
    if (!newCatName.trim()) return;
    try {
      // Auto-assign a generic icon for now
      await api.post(`/groups/${groupId}/categories`, { name: newCatName, icon: "✨" });
      setNewCatName("");
      setShowInput(false);
      fetchCategories(); 
    } catch (err) {
      alert("Failed to add category");
    }
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <label style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: "600" }}>
          Categories
        </label>
        
        {!showInput && (
          <button 
            onClick={() => setShowInput(true)}
            style={{
              background: "none", border: "none", color: "#6366f1", 
              fontSize: "0.85rem", cursor: "pointer", fontWeight: "600"
            }}
          >
            + Add Custom
          </button>
        )}
      </div>
      
      {/* Input Field */}
      {showInput && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
          <input 
            autoFocus
            type="text" 
            placeholder="Category Name..." 
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            style={{ flex: 1, padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
          />
          <button onClick={handleAdd} style={{ background: "#10b981", color: "white", border: "none", borderRadius: "6px", padding: "0 12px", cursor: "pointer" }}>Add</button>
          <button onClick={() => setShowInput(false)} style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "6px", padding: "0 12px", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Categories List */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {categories.map((cat) => (
          <span key={cat._id} style={{
            background: cat.isDefault ? "#f1f5f9" : "#e0e7ff", // Different color for Custom
            padding: "6px 12px", borderRadius: "20px",
            fontSize: "0.85rem", color: cat.isDefault ? "#475569" : "#4338ca", 
            border: cat.isDefault ? "1px solid #e2e8f0" : "1px solid #c7d2fe",
            display: "flex", alignItems: "center", gap: "6px"
          }}>
            <span>{cat.icon}</span>
            {cat.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export default CategoryManager;