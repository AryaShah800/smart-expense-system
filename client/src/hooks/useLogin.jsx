import { useState, useCallback } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

// Encapsulates login side-effects and exposes a clean imperative API for the UI
export default function useLogin() {
  const { login: setAuthUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = useCallback(
    async ({ email, password }) => {
      setError(null);
      setLoading(true);
      try {
        const res = await api.post("/users/login", { email, password });
        // Persist user into global auth state
        setAuthUser(res.data);
        toast.success("Signed in successfully");
        return res.data;
      } catch (err) {
        const message = err?.response?.data?.message || "Login failed";
        setError(message);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setAuthUser]
  );

  return { submit, loading, error, setError };
}
