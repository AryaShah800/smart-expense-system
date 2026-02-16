import { useEffect, useState } from "react";
import api from "../../api/axios";
import { socket } from "../../api/socket"; 

function Notifications() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = async () => {
    try {
      const res = await api.get("/users/invitations");
      setInvites(res.data);
    } catch (err) { } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchInvites();

    socket.on("new_invite", () => {
      fetchInvites(); 
    });

    return () => {
      socket.off("new_invite");
    };
  }, []);

  const handleRespond = async (groupId, status) => {
    try {
      // This line has been updated to send "action" instead of "status"
      await api.post("/users/invitations/respond", { groupId, action: status });
      setInvites(prev => prev.filter(i => i._id !== groupId));
      
      if (status === 'accept') {
        alert("Joined group successfully!");
        window.location.reload(); 
      }
    } catch (err) {
      alert("Action failed");
    }
  };

  if (loading && invites.length === 0) return null; 
  if (invites.length === 0) return null; 

  return (
    <div style={{ marginBottom: "20px", padding: "15px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
      <h3 style={{ margin: "0 0 10px 0", fontSize: "1rem", color: "#334155", display: "flex", alignItems: "center", gap: "8px" }}>
        🔔 Pending Invitations
        <span style={{ background: "#ef4444", color: "white", fontSize: "0.75rem", padding: "2px 6px", borderRadius: "10px" }}>
          {invites.length}
        </span>
      </h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {invites.map(invite => (
          <div key={invite._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #f1f5f9" }}>
            <div>
              <span style={{ fontWeight: "600", color: "#1e293b" }}>{invite.name}</span>
              <span style={{ fontSize: "0.85rem", color: "#64748b", marginLeft: "8px" }}>({invite.type})</span>
            </div>
            
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => handleRespond(invite._id, "accept")} style={{ background: "#10b981", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem" }}>Accept</button>
              <button onClick={() => handleRespond(invite._id, "reject")} style={{ background: "#fee2e2", color: "#ef4444", border: "1px solid #fca5a5", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem" }}>Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Notifications;