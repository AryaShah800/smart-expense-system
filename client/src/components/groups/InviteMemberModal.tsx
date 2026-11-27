import { useState, type FormEvent } from "react";
import api, { apiErrorMessage } from "../../api/axios";
import Modal from "../Modal";
import { X, AlertTriangle, Check } from "lucide-react";

interface InviteMemberModalProps {
  groupId: string;
  onClose: () => void;
  onInvited?: () => void;
}

function InviteMemberModal({ groupId, onClose, onInvited }: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
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
      setError(apiErrorMessage(err, "Failed to invite user"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Invite Member"
      className="modal"
      bodyClassName=""
      renderHeader={(titleId, title) => (
        <div className="modal-header">
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close"><X size={18} aria-hidden="true" /></button>
        </div>
      )}
    >
      <p className="modal-desc">
        Enter the email address of the person you want to invite.
      </p>

      {error && <div className="modal-error"><AlertTriangle size={14} aria-hidden="true" /> {error}</div>}
      {successMsg && <div className="modal-success" style={{ color: '#10b981', background: '#ecfdf5', padding: '10px', borderRadius: '8px', marginBottom: '20px' }}><Check size={14} aria-hidden="true" /> {successMsg}</div>}

      <form onSubmit={handleSubmit}>
        <label className="modal-section-label" htmlFor="invitemembermodal-user-email">User Email</label>
        <input
          id="invitemembermodal-user-email"
          type="email"
          className="modal-input"
          placeholder="friend@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
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
    </Modal>
  );
}

export default InviteMemberModal;