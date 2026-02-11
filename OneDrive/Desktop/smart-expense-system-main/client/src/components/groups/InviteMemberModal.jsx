import { useState } from "react";
import api from "../../api/axios";

function InviteMemberModal({ groupId, onClose, onInvited }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();

    if (!email) return;

    setLoading(true);

    try {
      await api.post(`/groups/${groupId}/invite`, { email });
      onInvited();
      onClose();
    } catch (err) {
      console.error("Invite failed");
      alert(err.response?.data?.message || "Invite failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">

        <h3>Invite Member</h3>

        <form onSubmit={handleInvite}>

          <input
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Inviting..." : "Invite"}
          </button>

        </form>

        <button className="close-btn" onClick={onClose}>
          ✕
        </button>

      </div>
    </div>
  );
}

export default InviteMemberModal;
