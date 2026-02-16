import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import CreateGroupModal from "../components/groups/CreateGroupModal";
import JoinGroupModal from "../components/groups/JoinGroupModal"; // <--- Import
import "../styles/groups.css";

function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false); // <--- New State

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
      <div className="groups-container">
        <div className="groups-header-row">
          <div>
            <h2>My Groups</h2>
            <p className="groups-subtitle">Manage shared expenses</p>
          </div>

          <div className="groups-actions">
            <button
              className="btn-secondary"
              onClick={() => setShowJoinModal(true)}
            >
              Enter Code
            </button>
            <button
              className="btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              + Create Group
            </button>
          </div>
        </div>

        {loading ? (
          <div className="groups-loading">
            <div className="spinner"></div>
            <p>Loading your groups...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="groups-empty">
            <div className="empty-icon">👥</div>
            <h3>No groups yet</h3>
            <p>Create a group with friends or join one via code!</p>
            <button className="btn-primary mt-4" onClick={() => setShowCreateModal(true)}>
              Create First Group
            </button>
          </div>
        ) : (
          <div className="groups-grid">
            {groups.map((group) => (
              <div
                key={group._id}
                className="group-card"
                onClick={() => navigate(`/groups/${group._id}`)}
              >
                <div className="group-card-header">
                  <div className={`group-icon ${group.type.toLowerCase()}`}>
                    {group.type === "Trip" ? "✈️" : group.type === "Home" ? "🏠" : group.type === "Couple" ? "❤️" : "👥"}
                  </div>
                  <span className="group-badge">{group.type}</span>
                </div>

                <h3>{group.name}</h3>

                <div className="group-card-footer">
                  <span className="member-count">
                    👤 {group.members.length} member{group.members.length !== 1 && 's'}
                  </span>
                  <div className="arrow-btn">➜</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchGroups}
        />
      )}

      {showJoinModal && (
        <JoinGroupModal
          onClose={() => setShowJoinModal(false)}
          onJoined={fetchGroups}
        />
      )}
    </div>
  );
}

export default Groups;