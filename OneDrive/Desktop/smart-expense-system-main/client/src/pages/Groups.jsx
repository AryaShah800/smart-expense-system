import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import CreateGroupModal from "../components/groups/CreateGroupModal";
import "../styles/groups.css";

function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const navigate = useNavigate();

  const fetchGroups = async () => {
    try {
      const res = await api.get("/groups");
      setGroups(res.data);
    } catch (err) {
      console.error("Failed to fetch groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  return (
    <div className="groups-page">

      {/* Header */}
      <div className="groups-header">
        <h2>My Groups</h2>
        <button 
          className="create-group-btn"
          onClick={() => setShowModal(true)}
        >
          + Create Group
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <p className="groups-loading">Loading groups...</p>
      ) : groups.length === 0 ? (
        <div className="groups-empty">
          <h3>No groups yet</h3>
          <p>Create your first group to start tracking shared expenses.</p>
        </div>
      ) : (
        <div className="groups-grid">
          {groups.map(group => (
            <div
              key={group._id}
              className="group-card"
              onClick={() => navigate(`/groups/${group._id}`)}
            >
              <h3>{group.name}</h3>
              <p className="group-type">{group.type}</p>
              <p className="group-members">
                {group.members.length} Members
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <CreateGroupModal
          onClose={() => setShowModal(false)}
          onCreated={fetchGroups}
        />
      )}
    </div>
  );
}

export default Groups;
