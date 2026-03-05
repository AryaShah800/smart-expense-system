import { useEffect } from "react";

export default function NotificationPanel({ isOpen, onClose, notifications }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="notification-panel-backdrop"
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClose()}
      aria-label="Close notifications"
    >
      <div
        className="notification-panel-inner"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="notification-panel-header">
          <h3 className="notification-panel-title">Notifications</h3>
          <button
            type="button"
            onClick={onClose}
            className="notification-panel-close"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="notification-panel-list">
          {notifications.length === 0 ? (
            <p className="notification-panel-empty">No new notifications</p>
          ) : (
            notifications.map((n, idx) => (
              <div
                key={n._id || idx}
                className={`notification-panel-item ${n.isRead ? "" : "unread"}`}
              >
                <p className="notification-panel-message">{n.message}</p>
                <span className="notification-panel-time">
                  {new Date(n.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
