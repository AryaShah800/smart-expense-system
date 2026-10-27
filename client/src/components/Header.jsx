import { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { socket } from "../api/socket";
import { useAuth } from "../context/AuthContext";
import NotificationPanel from "./NotificationPanel";

const routeTitles = {
  "/dashboard": "Dashboard",
  "/add-transaction": "New Transaction",
  "/expenses": "Transactions",
  "/budgets": "Budgets",
  "/groups": "Groups",
  "/settings": "Settings",
};

function getPageTitle(pathname) {
  if (pathname.startsWith("/groups/") && pathname !== "/groups") return "Group Details";
  return routeTitles[pathname] || "SmartExpense";
}

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);

  const isMainTab = ["/dashboard", "/expenses", "/budgets", "/groups"].includes(location.pathname);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/users/notifications");
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    socket.connect();
    const handleConnect = () => socket.emit("join_room", user._id);
    socket.on("connect", handleConnect);
    if (socket.connected) handleConnect();
    socket.on("new_notification", (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
    });
    return () => {
      socket.off("connect", handleConnect);
      socket.off("new_notification");
      socket.disconnect();
    };
  }, [user]);

  const handleBellClick = async () => {
    setShowPanel(true);
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    if (unreadCount > 0) {
      try {
        await api.put("/users/notifications/read");
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      } catch (err) {
        console.error("Failed to mark as read");
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const title = getPageTitle(location.pathname);

  return (
    <>
      <header className="mobile-header hide-from-md">
        <div className="mobile-header-left">
          {!isMainTab ? (
            <button
              type="button"
              className="mobile-header-back"
              onClick={() => navigate(-1)}
              aria-label="Back"
            >
              ←
            </button>
          ) : (
            <Link to="/dashboard" className="mobile-header-logo" aria-label="SmartExpense Home">
              <span className="logo-badge">SE</span>
            </Link>
          )}
        </div>

        <h1 className="mobile-header-title">{title}</h1>

        <div className="mobile-header-right">
          {user && (
            <>
              <button
                type="button"
                onClick={handleBellClick}
                className="mobile-header-icon-btn"
                aria-label="Notifications"
              >
                <span className="mobile-header-bell-icon">🔔</span>
                {unreadCount > 0 && (
                  <span className="mobile-header-badge">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              <Link
                to="/settings"
                className={`mobile-header-icon-btn ${location.pathname === "/settings" ? "active" : ""}`}
                aria-label="Settings"
              >
                ⚙️
              </Link>
            </>
          )}
        </div>
      </header>

      <NotificationPanel
        isOpen={showPanel}
        onClose={() => setShowPanel(false)}
        notifications={notifications}
      />
    </>
  );
}
