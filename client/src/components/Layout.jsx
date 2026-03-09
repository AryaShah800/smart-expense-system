import { useEffect } from "react";
import Navbar from "./Navbar";
import Header from "./Header";
import BottomNavigation from "./BottomNavigation";
import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/layout.css";
import "../styles/responsive.css";

function Layout() {
  const { user } = useAuth();

  // 🔥 This is the magic that switches the theme!
  useEffect(() => {
    if (user?.theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [user?.theme]);

  return (
    <div className="app-layout">
      {/* Desktop: full navbar (hidden on mobile) */}
      <Navbar />
      {/* Mobile: compact header (hidden on desktop) */}
      <Header />
      <main className="page-content main-mobile-pb">
        <div className="mobile-content-wrap">
          <Outlet />
        </div>
      </main>
      {/* Mobile: bottom nav (hidden on desktop) */}
      <BottomNavigation />
    </div>
  );
}

export default Layout;
