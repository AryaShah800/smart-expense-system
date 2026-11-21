import { Link, useLocation } from "react-router-dom";
import { Home, CreditCard, Plus, PieChart, Users } from "lucide-react";

const navItems = [
  { path: "/dashboard", label: "Home", icon: <Home size={20} /> },
  { path: "/expenses", label: "Expenses", icon: <CreditCard size={20} /> },
  { path: "/add-transaction", label: "Add", icon: <Plus size={22} />, isCenter: true },
  { path: "/budgets", label: "Budgets", icon: <PieChart size={20} /> },
  { path: "/groups", label: "Groups", icon: <Users size={20} /> },
];

export default function BottomNavigation() {
  const location = useLocation();

  return (
    <nav className="bottom-nav hide-from-md" aria-label="Bottom Navigation">
      {navItems.map((item) => {
        const isActive =
          item.path === location.pathname ||
          (item.path === "/groups" && location.pathname.startsWith("/groups"));

        if (item.isCenter) {
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`bottom-nav-item bottom-nav-center ${isActive ? "active-center" : ""}`}
              aria-label="Add transaction"
            >
              <span className="bottom-nav-center-icon">{item.icon}</span>
            </Link>
          );
        }

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`bottom-nav-item ${isActive ? "active" : ""}`}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}