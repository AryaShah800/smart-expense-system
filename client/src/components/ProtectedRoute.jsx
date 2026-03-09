import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api/axios";

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Check localStorage first — if no user, redirect immediately
      const savedUser = localStorage.getItem("user");
      if (!savedUser) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      // 2. User exists in localStorage — optimistically allow access
      setAuthorized(true);
      setLoading(false);

      // 3. Verify with server in background (don't block UI)
      try {
        await api.get("/auth/me");
        // Still valid — do nothing
      } catch (err) {
        // Only logout on 401 (truly expired session)
        // NOT on network errors (Render cold start, offline, etc.)
        if (err.response?.status === 401) {
          localStorage.removeItem("user");
          setAuthorized(false);
        }
        // 500, network error, timeout → stay logged in
      }
    };

    checkAuth();
  }, []);

  if (loading) return null;
  if (!authorized) return <Navigate to="/login" />;

  return children;
}

export default ProtectedRoute;