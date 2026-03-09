import { useState } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import "../../styles/Modal.css";

function SettleUpModal({ groupId, groupMembers, onClose, onSettled }) {
  const { user } = useAuth();

  const currencySymbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
  const symbol = currencySymbols[user?.currency] || '₹';

  const [fromUserId, setFromUserId] = useState(""); // Fix #2: Add fromUserId state
  const [toUserId, setToUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!toUserId || !amount || Number(amount) <= 0) {
      alert("Please select a recipient and enter a valid amount.");
      return;
    }

    try {
      setLoading(true);
      // Fix #2: Include fromUserId in settlement request
      await api.post(`/groups/${groupId}/settle`, {
        fromUserId: fromUserId || undefined,
        toUserId,
        amount: Number(amount)
      });

      onSettled();
      onClose();
    } catch (err) {
      console.error("SETTLE ERROR:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Failed to record settlement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Record Payment</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <p className="modal-desc">
          Record a cash payment to settle debt between group members.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Fix #2: Add Paid From selector */}
          <label className="modal-section-label">Paid From</label>
          <select
            className="modal-select"
            value={fromUserId}
            onChange={(e) => setFromUserId(e.target.value)}
          >
            <option value="">You (Me)</option>
            {groupMembers?.map((member) => (
              <option key={member._id} value={member._id}>
                {member.username}
              </option>
            ))}
          </select>

          <label className="modal-section-label">Paid To</label>
          <select
            className="modal-select"
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            required
          >
            <option value="">Select Recipient</option>
            {groupMembers.map((member) => (
              <option key={member._id} value={member._id}>
                {member.username}
              </option>
            ))}
          </select>

          <label className="modal-section-label">Amount</label>
          <div className="modal-amount-wrapper small">
            <span className="currency-symbol">{symbol}</span>
            <input
              type="number"
              className="modal-input"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="modal-btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-btn primary" disabled={loading}>
              {loading ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SettleUpModal;