import { useState, type FormEvent } from "react";
import api, { getErrorMessage } from "../../api/axios";
import "../../styles/Modal.css";

function JoinGroupModal({ onClose, onJoined }: { onClose: () => void; onJoined: () => void }) {
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setLoading(true);
    setError("");

    try {
      await api.post("/groups/join", { joinCode: joinCode.trim().toUpperCase() });
      onJoined();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Invalid code or already a member"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        {/* Header */}
        <div className="modal-header">
          <h3>Join Group</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {/* Description */}
        <p className="modal-desc">
          Enter the unique <strong>Invite Code</strong> shared by your group admin to join instantly.
        </p>

        {/* Error */}
        {error && (
          <div className="modal-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <label className="modal-section-label" htmlFor="joingroupmodal-invite-code">Invite Code</label>
          <input
            id="joingroupmodal-invite-code"
            type="text"
            className="modal-input code-input"
            placeholder="Ex: X7K-9P2"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            required
            maxLength={10}
            autoFocus
          />

          <div className="modal-actions">
            <button
              type="button"
              className="modal-btn secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-btn primary"
              disabled={loading || !joinCode.trim()}
            >
              {loading ? "Joining..." : "Join Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default JoinGroupModal;