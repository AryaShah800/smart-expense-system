import { useState, useCallback } from "react";
import api, { getErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import type { User } from "../types";
import toast from "react-hot-toast";

type LoginPayload = User & { token?: string };

// Encapsulates login side-effects and exposes a clean imperative API for the UI
export default function useLogin() {
  const { login: setAuthUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      setError(null);
      setLoading(true);
      try {
        const res = await api.post<LoginPayload>("/users/login", { email, password });
        // Persist user into global auth state
        setAuthUser(res.data);
        toast.success("Signed in successfully");
        return res.data;
      } catch (err) {
        const message = getErrorMessage(err, "Login failed");
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
