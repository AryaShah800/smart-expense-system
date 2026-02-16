import { useState } from "react";
import api from "../../api/axios";
import "../../styles/Modal.css";

function CreateGroupModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Trip");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await api.post("/groups", { name, type });
      onCreated();
      onClose();
    } catch (err) {
      console.error("Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        {/* Header */}
        <div className="modal-header">
          <h3>Create New Group</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <p className="modal-desc">
          Start a new shared expense group for your trip, home, or event.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="modal-section-label">Group Name</label>
          <input
            type="text"
            className="modal-input"
            placeholder="e.g. Goa Trip 2024"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <label className="modal-section-label">Group Type</label>
          <select
            className="modal-select"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="Trip">✈️ Trip</option>
            <option value="Home">🏠 Home</option>
            <option value="Couple">❤️ Couple</option>
            <option value="Event">🎉 Event</option>
            <option value="Other">👥 Other</option>
          </select>

          <div className="modal-actions">
            <button type="button" className="modal-btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-btn primary" disabled={loading}>
              {loading ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateGroupModal;
