import { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import NotificationPanel from "./NotificationPanel";
import { useAppDispatch, useAppSelector, selectNotifications, selectUnreadCount } from "../store/hooks";
import { markAllRead } from "../store/notificationsSlice";

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
  const notifications = useAppSelector(selectNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);
  const dispatch = useAppDispatch();
  const [showPanel, setShowPanel] = useState(false);
  const isMainTab = ["/dashboard", "/expenses", "/budgets", "/groups"].includes(location.pathname);

  const handleBellClick = () => {
    setShowPanel(true);
    if (unreadCount > 0) {
      dispatch(markAllRead()).unwrap().catch(() => console.error("Failed to mark as read"));
    }
  };

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
