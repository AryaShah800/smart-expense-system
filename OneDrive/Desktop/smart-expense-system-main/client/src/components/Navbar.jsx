import { NavLink, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/navbar.css";

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      navigate("/login");
    } catch (err) {
      console.error("Logout failed");
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* Left */}
        <div className="nav-left">
          <div className="logo"></div>
          <span className="brand">Smart Expense</span>
        </div>

        {/* Center */}
        <div className="nav-links">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/add-transaction">Add</NavLink>
          <NavLink to="/expenses">Expenses</NavLink>
          <NavLink to="/groups">Groups</NavLink>
        </div>

        {/* Right */}
        <div className="nav-right">
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

      </div>
    </nav>
  );
}

export default Navbar;
