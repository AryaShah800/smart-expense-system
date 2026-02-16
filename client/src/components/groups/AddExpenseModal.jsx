import { useEffect, useState } from "react";
import api from "../../api/axios";
import "../../styles/Modal.css";

function AddExpenseModal({ groupId, groupMembers, onClose, onAdded }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [splitType, setSplitType] = useState("equal");

  const [involvedUsers, setInvolvedUsers] = useState([]);
  const [customSplits, setCustomSplits] = useState([]);

  // Fetch Categories on mount
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get(`/groups/${groupId}/categories`);
        setCategories(res.data);
      } catch (err) { console.error("Error fetching categories"); }
    };
    fetchCats();
  }, [groupId]);

  useEffect(() => {
    if (groupMembers?.length) {
      setInvolvedUsers(groupMembers.map(m => m._id));
      setCustomSplits(groupMembers.map((member) => ({ userId: member._id, value: "" })));
    }
  }, [groupMembers]);

  const toggleInvolvedUser = (userId) => {
    setInvolvedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleCustomSplitChange = (userId, value) => {
    setCustomSplits((prev) => prev.map((s) => (s.userId === userId ? { ...s, value } : s)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { alert("Enter valid amount"); return; }

    try {
      setLoading(true);
      let payload = {
        description: description || "Expense",
        amount: Number(amount),
        categoryId,
        splitType
      };

      if (splitType === "equal") {
        payload.involvedUsers = involvedUsers;
        if (involvedUsers.length === 0) { alert("Select at least one person"); setLoading(false); return; }
      } else {
        payload.splits = customSplits.map(split => ({ userId: split.userId, shareAmount: Number(split.value) || 0 }));
      }

      await api.post(`/groups/${groupId}/expenses`, payload);
      onAdded();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg"> {/* Added modal-lg class for wider layout if needed */}
        <div className="modal-header centered">
          <h3>Add Expense</h3>
          <button className="btn-close-absolute" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="expense-form">

          {/* 1. CENTERED AMOUNT INPUT */}
          <div className="amount-section">
            <label className="input-label-center">Total Amount</label>
            <div className="amount-display-wrapper">
              <span className="currency-symbol-big">₹</span>
              <input
                type="number"
                className="amount-input-big"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onWheel={(e) => e.target.blur()}
                required
                autoFocus
              />
            </div>
          </div>

          {/* 2. DESCRIPTION & CATEGORY */}
          <div className="form-row">
            <div className="form-group flex-grow">
              <label>Description</label>
              <input
                type="text"
                className="modal-input"
                placeholder="What is this for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                className="modal-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">⚙️ General</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. SPLIT TYPE TABS */}
          <div className="split-type-section">
            <label>Split Method</label>
            <div className="split-tabs">
              <button
                type="button"
                className={`split-tab ${splitType === 'equal' ? 'active' : ''}`}
                onClick={() => setSplitType('equal')}
              >
                = Equally
              </button>
              <button
                type="button"
                className={`split-tab ${splitType === 'exact' ? 'active' : ''}`}
                onClick={() => setSplitType('exact')}
              >
                ₹ Exact
              </button>
              <button
                type="button"
                className={`split-tab ${splitType === 'percentage' ? 'active' : ''}`}
                onClick={() => setSplitType('percentage')}
              >
                % Percent
              </button>
            </div>
          </div>

          {/* 4. MEMBER SELECTION LIST */}
          <div className="members-section">
            <label>Split With</label>
            <div className="members-list-scroll">
              {groupMembers?.map((member) => (
                <div
                  key={member._id}
                  className={`member-row ${involvedUsers.includes(member._id) && splitType === 'equal' ? 'selected' : ''}`}
                  onClick={() => splitType === 'equal' && toggleInvolvedUser(member._id)}
                >
                  <div className="member-avatar">
                    {member.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="member-info">
                    <span className="member-name">{member.username}</span>
                  </div>

                  {/* Contextual Action Area */}
                  <div className="member-action" onClick={(e) => e.stopPropagation()}>
                    {splitType === "equal" ? (
                      <div className={`checkbox-circle ${involvedUsers.includes(member._id) ? 'checked' : ''}`}>
                        {involvedUsers.includes(member._id) && '✓'}
                      </div>
                    ) : (
                      <div className="split-input-container">
                        <input
                          type="number"
                          className="split-value-input"
                          placeholder="0"
                          value={customSplits.find(s => s.userId === member._id)?.value || ""}
                          onChange={(e) => handleCustomSplitChange(member._id, e.target.value)}
                          onWheel={(e) => e.target.blur()}
                        />
                        <span className="unit-label">{splitType === 'percentage' ? '%' : '₹'}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-submit-main" disabled={loading}>
            {loading ? "Adding Expense..." : "Add Expense"}
          </button>

        </form>
      </div>
    </div>
  );
}

export default AddExpenseModal;