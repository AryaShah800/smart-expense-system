import { useState } from "react";
import api from "../../api/axios";
import "../../styles/Modal.css";

function SettleUpModal({ groupId, groupMembers, onClose, onSettled }) {
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
      await api.post(`/groups/${groupId}/settle`, {
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
          Record a cash payment you made to settle your debt with a group member.
        </p>

        <form onSubmit={handleSubmit}>
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
            <span className="currency-symbol">₹</span>
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