import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import "../../styles/Modal.css";
import { getCurrencySymbol } from "../../utils/currencyFormatter";

function AddExpenseModal({ groupId, groupMembers, onClose, onAdded }) {
  const { user: currentUser } = useAuth();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [splitType, setSplitType] = useState("equal");
  const [paidBy, setPaidBy] = useState(""); // Fix #1: Add paidBy state


  // create deduped member list for dropdown
  const uniqueMembers = (groupMembers || []).filter((member, index, self) =>
    index === self.findIndex(m => m._id === member._id)
  );

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
        splitType,
        paidBy: paidBy || undefined // Fix #1: Include paidBy in payload
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
      <div className="modal modal-lg modal-content"> {/* modal-content provides relative positioning */}
        <button className="modal-close-btn" onClick={onClose} aria-label="Close">×</button>

        <div className="modal-header centered">
          <h3>Add Expense</h3>
        </div>

        <form onSubmit={handleSubmit} className="expense-form">

          {/* 1. CENTERED AMOUNT INPUT */}
          <div className="amount-section">
            <label className="input-label-center">Total Amount</label>
              <div className="amount-display-wrapper">
              <span className="currency-symbol-big">{getCurrencySymbol(currentUser?.currency)}</span>
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

          {/* 2. DESCRIPTION & CATEGORY & PAIDBY */}
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

          {/* Fix #1: Add Paid By selector */}
          <div className="form-row">
            <div className="form-group">
              <label>Paid By</label>
              <select
                className="modal-select"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
              >
                <option value="">Select payer</option>
                {uniqueMembers.map(member => (
                  <option key={member._id} value={member._id}>
                    {member._id === currentUser?._id ? "You" : member.username}
                  </option>
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
              <div className="split-member-list">
                {groupMembers?.map((member) => {
                  const isSelected = involvedUsers.includes(member._id) && splitType === 'equal';
                  return (
                    <div
                      key={member._id}
                      className={`split-member-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => splitType === 'equal' && toggleInvolvedUser(member._id)}
                    >
                      <div className="split-member-info">
                        <div className="split-member-avatar">{(member.username || member.name || '?').charAt(0)}</div>
                        <span className="split-member-name">{member.username || member.name}</span>
                      </div>

                      {/* Contextual Action Area */}
                      <div onClick={(e) => e.stopPropagation()}>
                        {splitType === "equal" ? (
                          isSelected && <span className="check-icon">✓</span>
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
                            <span className="unit-label">{splitType === 'percentage' ? '%' : getCurrencySymbol(currentUser?.currency)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="submit" className="primary-submit-btn" disabled={loading}>
              {loading ? "Adding Expense..." : "Add Expense"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default AddExpenseModal;