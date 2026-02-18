import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import api from "../api/axios";
import { socket } from "../api/socket";
import { useAuth } from "../context/AuthContext";
import "../styles/navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get user and logout function from Context
  const { user, logout } = useAuth();
  
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
      fetchNotifications();

      // 2. Connect Socket
      socket.connect();

      // 3. Join the room ONLY when the connection is established
      const handleConnect = () => {
        console.log("Socket connected! Joining room:", user._id);
        socket.emit("join_room", user._id);
      };

      socket.on("connect", handleConnect);

      // If the socket is already connected when this runs, join immediately
      if (socket.connected) {
        handleConnect();
      }

      // 4. Listen for REAL-TIME notifications
      socket.on("new_notification", (newNotif) => {
        console.log("New real-time notification received!", newNotif);
        setNotifications((prev) => [newNotif, ...prev]);
      });

      return () => {
        socket.off("connect", handleConnect);
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

  const handleLogout = async () => {
    try {
      // 1. Notify backend
      await api.post("/auth/logout");
      
      // 2. Clear global state via context (removes from localStorage automatically)
      logout(); 
      
      // 3. Cleanup socket and navigate
      socket.disconnect(); 
      navigate("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const handleBellClick = async () => {
    setShowDropdown(!showDropdown);
    if (!showDropdown && unreadCount > 0) {
      try {
        await api.put("/users/notifications/read");
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      } catch (err) {
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
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="nav-left">
          <div className="logo">SE</div>
          <Link to="/" className="brand">SmartExpense</Link>
        </div>

        {user ? (
          <>
            <div className={`nav-links ${mobileMenuOpen ? 'active' : ''}`}>
              <Link to="/dashboard" className={location.pathname === "/dashboard" ? "active" : ""} onClick={closeMobileMenu}>Dashboard</Link>
              <Link to="/add-transaction" className={location.pathname === "/add-transaction" ? "active" : ""} onClick={closeMobileMenu}>Add Transaction</Link>
              <Link to="/expenses" className={location.pathname === "/expenses" ? "active" : ""} onClick={closeMobileMenu}>Expenses</Link>
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

              <button className="logout-btn" onClick={handleLogout}>Logout</button>
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