import { useState, type FormEvent } from "react";
import api, { apiErrorMessage } from "../../api/axios";
import Modal from "../Modal";
import { X, AlertTriangle } from "lucide-react";

interface JoinGroupModalProps {
  onClose: () => void;
  onJoined: () => void;
}

function JoinGroupModal({ onClose, onJoined }: JoinGroupModalProps) {
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setLoading(true);
    setError("");

    try {
      await api.post("/groups/join", { joinCode: joinCode.trim().toUpperCase() });
      onJoined();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, "Invalid code or already a member"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Join Group"
      className="modal"
      bodyClassName=""
      renderHeader={(titleId, title) => (
        <div className="modal-header">
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close"><X size={18} aria-hidden="true" /></button>
        </div>
      )}
    >
      {/* Description */}
      <p className="modal-desc">
        Enter the unique <strong>Invite Code</strong> shared by your group admin to join instantly.
      </p>

      {/* Error */}
      {error && (
        <div className="modal-error">
          <AlertTriangle size={14} aria-hidden="true" /> {error}
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
    </Modal>
  );
}

export default JoinGroupModal;