import { Link, useLocation } from "react-router-dom";

const navItems = [
  { path: "/dashboard", label: "Home", icon: "🏠" },
  { path: "/expenses", label: "Transactions", icon: "📋" },
  { path: "/add-transaction", label: "Add", icon: "+", isCenter: true },
  { path: "/budgets", label: "Budgets", icon: "📊" },
  { path: "/groups", label: "Groups", icon: "👥" },
];

export default function BottomNavigation() {
  const location = useLocation();

  return (
    <nav className="bottom-nav hide-from-md">
      {navItems.map((item) => {
        const isActive =
          item.path === location.pathname ||
          (item.path === "/groups" && location.pathname.startsWith("/groups"));
        if (item.isCenter) {
          return (
            <Link
              key={item.path}
              to={item.path}
              className="bottom-nav-item bottom-nav-center"
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
