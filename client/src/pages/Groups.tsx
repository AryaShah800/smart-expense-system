import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGroups, useInvalidateGroups } from "../hooks/queries";
import { loadErrorText, toLoadError } from "../store/loadError";
import CreateGroupModal from "../components/groups/CreateGroupModal";
import JoinGroupModal from "../components/groups/JoinGroupModal";
import DataErrorState from "../components/DataErrorState";
import "../styles/groups.css";

function Groups() {
  const groupsQuery = useGroups();
  const invalidateGroups = useInvalidateGroups();
  const groups = groupsQuery.data ?? [];
  // Cached groups stay on screen while a background refetch runs.
  const loading = groupsQuery.isPending;
  const error = groupsQuery.error
    ? loadErrorText(
        toLoadError(groupsQuery.error, "Failed to load groups."),
        "Server is currently offline or unreachable. Please verify your connection."
      )
    : "";
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const navigate = useNavigate();

  const fetchGroups = () => {
    groupsQuery.refetch();
  };
  const onGroupsChanged = () => {
    invalidateGroups();
  };

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
        ) : error ? (
          <DataErrorState
            title="Groups Unavailable"
            message={error}
            onRetry={fetchGroups}
          />
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
          onCreated={onGroupsChanged}
        />
      )}

      {showJoinModal && (
        <JoinGroupModal
          onClose={() => setShowJoinModal(false)}
          onJoined={onGroupsChanged}
        />
      )}
    </div>
  );
}
export default Groups;
