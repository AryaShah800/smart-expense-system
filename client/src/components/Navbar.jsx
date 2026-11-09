import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import api from "../api/axios";
import { socket } from "../api/socket";
import { useAuth } from "../context/AuthContext";
import "../styles/navbar.css";

function Navbar() {
  const location = useLocation();

  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/users/notifications");
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

// 🔥 SOCKET LOGIC
  useEffect(() => {
    if (user) {
      // 1. Initial Load of notifications
      // eslint-disable-next-line react-hooks/set-state-in-effect -- manual fetch; replaced by React Query in Phase 5
      fetchNotifications();

      // 2. Connect Socket (the server joins this user's room after verifying the token)
      socket.connect();

      // 3. Listen for REAL-TIME notifications
      socket.on("new_notification", (newNotif) => {
        console.log("New real-time notification received!", newNotif);
        setNotifications((prev) => [newNotif, ...prev]);
      });

      return () => {
        socket.off("new_notification");
        socket.disconnect();
      };
    }
  }, [user]); // Re-run if user changes in context

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBellClick = async () => {
    setShowDropdown(!showDropdown);
    if (!showDropdown && unreadCount > 0) {
      try {
        await api.put("/users/notifications/read");
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      } catch {
        console.error("Failed to mark notifications as read");
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="navbar hide-below-md">
      <div className="navbar-inner">
        <div className="nav-left">
          <div className="logo">SE</div>
          <Link to="/" className="brand">SmartExpense</Link>
        </div>

        {user ? (
          <>
            <div className={`nav-links ${mobileMenuOpen ? 'active' : ''}`}>
              <Link to="/dashboard" className={location.pathname === "/dashboard" ? "active" : ""} onClick={closeMobileMenu}>Dashboard</Link>
              <Link to="/add-transaction" className={location.pathname === "/add-transaction" ? "active" : ""} onClick={closeMobileMenu}>Add</Link>
              <Link to="/expenses" className={location.pathname === "/expenses" ? "active" : ""} onClick={closeMobileMenu}>Expenses</Link>
              <Link to="/recurring" className={location.pathname === "/recurring" ? "active" : ""} onClick={closeMobileMenu}>Recurring</Link>
              <Link to="/budgets" className={location.pathname === "/budgets" ? "active" : ""} onClick={closeMobileMenu}>Budgets</Link>
              <Link to="/groups" className={location.pathname.startsWith("/groups") ? "active" : ""} onClick={closeMobileMenu}>Groups</Link>
            </div>

            <button className="menu-toggle" onClick={toggleMobileMenu}>
              ☰
            </button>

            <div className="nav-right">
              <div className="notification-wrapper" ref={dropdownRef}>
                <button className="notification-bell" onClick={handleBellClick}>
                  🔔
                  {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                </button>

                {showDropdown && (
                  <div className="notification-dropdown">
                    <div className="dropdown-header">Notifications</div>
                    <div className="dropdown-list">
                      {notifications.length === 0 ? (
                        <div className="empty-state">No new notifications</div>
                      ) : (
                        notifications.map((n, idx) => (
                          <div key={idx} className={`dropdown-item ${n.isRead ? 'read' : 'unread'}`}>
                            {n.message}
                            <span className="notification-time">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Swap the logout button for a link to the new settings page */}
              <Link to="/settings" className="nav-auth-link" style={{ marginLeft: '15px' }}>
                ⚙️ Settings
              </Link>
            </div>
          </>
        ) : (
          <div className="nav-right">
            <Link to="/login" className="nav-auth-link login">Login</Link>
            <Link to="/signup" className="nav-auth-link signup">Signup</Link>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;