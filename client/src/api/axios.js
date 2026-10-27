import axios from "axios";
import toast from "react-hot-toast";

const baseURL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:7000/api" : "http://localhost:7000/api");

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 60000, // Allow the Render service to wake, but bound requests.
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        const token = userData.token || userData.accessToken || userData.data?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        console.error("Failed to parse user from localStorage", err);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Robust response error handling
api.interceptors.response.use(
  (res) => res,
  (error) => {
    // 1. Server is down or completely unreachable
    if (!error.response) {
      const isTimeout = error.code === "ECONNABORTED" || error.message?.includes("timeout");
      const message = isTimeout
        ? "Server request timed out. Please check if the server is responding."
        : "Cannot reach server. Please check your internet connection or server status.";

      toast.error(message, {
        id: "server-connection-error",
        duration: 5000,
        position: "top-center",
      });

      error.isServerDown = true;
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    // 2. Token expired or unauthorized — only redirect if not already on auth pages
    if (status === 401) {
      const isAuthPage =
        window.location.pathname === "/login" || window.location.pathname === "/signup";
      if (!isAuthPage) {
        localStorage.removeItem("user");
        toast.error("Session expired. Please log in again.", { id: "session-expired" });
        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);
      }
    } else if (status >= 500) {
      // 3. Server crashed / internal server error
      toast.error(data?.message || "Internal server error. Please try again shortly.", {
        id: "server-500-error",
        duration: 4000,
      });
    }

    return Promise.reject(error);
  }
);

export default api;
