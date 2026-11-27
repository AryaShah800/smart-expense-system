import { useState, type FormEvent } from "react";
import api, { apiErrorMessage } from "../../api/axios";
import toast from "react-hot-toast";
import Modal from "../Modal";
import { X } from "lucide-react";

interface CreateGroupModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateGroupModal({ onClose, onCreated }: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Trip");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await api.post("/groups", { name, type });
      onCreated();
      onClose();
    } catch (err) {
      // Keep the modal open with what was typed, and say why it failed.
      toast.error(apiErrorMessage(err, "Couldn't create the group. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Create New Group"
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
        Start a new shared expense group for your trip, home, or event.
      </p>

      <form onSubmit={handleSubmit}>
        <label className="modal-section-label" htmlFor="creategroupmodal-group-name">Group Name</label>
        <input
          id="creategroupmodal-group-name"
          type="text"
          className="modal-input"
          placeholder="e.g. Goa Trip 2024"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label className="modal-section-label" htmlFor="creategroupmodal-group-type">Group Type</label>
        <select
          id="creategroupmodal-group-type"
          className="modal-select"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="Trip">Trip</option>
          <option value="Home">Home</option>
          <option value="Couple">Couple</option>
          <option value="Event">Event</option>
          <option value="Other">Other</option>
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
    </Modal>
  );
}

export default CreateGroupModal;
