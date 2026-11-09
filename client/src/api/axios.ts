import axios, { isAxiosError } from "axios";
import type { ApiErrorBody } from "../types";
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

// Auth relies on the httpOnly "jwt" cookie (withCredentials), so no token is attached here.

// Robust response error handling
api.interceptors.response.use(
  (res) => res,
  (error: unknown) => {
    if (!isAxiosError<ApiErrorBody>(error)) return Promise.reject(error);
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

/** True when the request never reached the server (offline, timeout, server asleep). */
export function isServerDown(err: unknown): boolean {
  return isAxiosError(err) && !err.response;
}

/** Pull a human-readable message out of an unknown thrown value (API edge helper). */
export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (isAxiosError<ApiErrorBody>(err)) return err.response?.data?.message || fallback;
  return err instanceof Error && err.message ? err.message : fallback;
}

export default api;
