import { useState } from "react";
import api from "../../api/axios";
import "../../styles/Modal.css";

function InviteMemberModal({ groupId, onClose, onInvited }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      setError("");
      setSuccessMsg("");

      const res = await api.post(`/groups/${groupId}/invite`, { email });
      setSuccessMsg(res.data.message || "Invitation sent successfully!");
      setEmail("");

      if (onInvited) onInvited();

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error("INVITE ERROR:", err);
      setError(err.response?.data?.message || "Failed to invite user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Invite Member</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <p className="modal-desc">
          Enter the email address of the person you want to invite.
        </p>

        {error && <div className="modal-error"><span>⚠️</span> {error}</div>}
        {successMsg && <div className="modal-success" style={{ color: '#10b981', background: '#ecfdf5', padding: '10px', borderRadius: '8px', marginBottom: '20px' }}>✅ {successMsg}</div>}

        <form onSubmit={handleSubmit}>
          <label className="modal-section-label">User Email</label>
          <input
            type="email"
            className="modal-input"
            placeholder="friend@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />

          <div className="modal-actions">
            <button type="button" className="modal-btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-btn primary" disabled={loading}>
              {loading ? "Inviting..." : "Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InviteMemberModal;