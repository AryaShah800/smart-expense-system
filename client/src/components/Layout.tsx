import Navbar from "./Navbar";
import Header from "./Header";
import BottomNavigation from "./BottomNavigation";
import { Outlet } from "react-router-dom";
import { useNotificationsSocket } from "../hooks/useNotificationsSocket";
import "../styles/layout.css";
import "../styles/responsive.css";

function Layout() {
  // One socket connection and one notifications fetch for both Navbar and Header.
  useNotificationsSocket();

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
