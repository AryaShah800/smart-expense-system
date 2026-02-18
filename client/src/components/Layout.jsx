import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";
import "../styles/layout.css";

function Layout() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
