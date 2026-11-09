import { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useNotifications, useMarkNotificationsRead } from "../hooks/queries";
import { useAuth } from "../context/AuthContext";
import NotificationPanel from "./NotificationPanel";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/add-transaction": "New Transaction",
  "/expenses": "Transactions",
  "/budgets": "Budgets",
  "/groups": "Groups",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/groups/") && pathname !== "/groups") return "Group Details";
  return routeTitles[pathname] || "SmartExpense";
}

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showPanel, setShowPanel] = useState(false);
  const { data: notifications = [] } = useNotifications(Boolean(user));
  const markRead = useMarkNotificationsRead();

  const isMainTab = ["/dashboard", "/expenses", "/budgets", "/groups"].includes(location.pathname);

  const handleBellClick = () => {
    setShowPanel(true);
    if (notifications.some((n) => !n.isRead)) {
      markRead.mutate(undefined, { onError: () => console.error("Failed to mark as read") });
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
