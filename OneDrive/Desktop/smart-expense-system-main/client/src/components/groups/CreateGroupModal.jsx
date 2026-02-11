import { useState } from "react";
import api from "../../api/axios";

function CreateGroupModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Trip");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
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

        <h3>Create New Group</h3>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Group Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option>Trip</option>
            <option>Home</option>
            <option>Event</option>
            <option>General</option>
          </select>

          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Group"}
          </button>
        </form>

        <button className="close-btn" onClick={onClose}>
          ✕
        </button>

      </div>
    </div>
  );
}

export default CreateGroupModal;
