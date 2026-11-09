import { useState, useCallback } from "react";
import api, { getErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import type { User } from "../types";
import toast from "react-hot-toast";

type LoginPayload = User & { token?: string };
interface SignupInfo {
  username: string;
  email: string;
  password: string;
}

// Encapsulates signup flow: create account, verify OTP, resend OTP
export default function useSignup() {
  const { login: setAuthUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState("");

  const createAccount = useCallback(
    async (accountInfo: SignupInfo) => {
      setError(null);
      setLoading(true);
      try {
        const res = await api.post<{ message?: string; email?: string }>("/users/signup", accountInfo);
        toast.success("Account created — check your email for a verification code");
        return res.data;
      } catch (err) {
        const message = getErrorMessage(err, "Signup failed");
        setError(message);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const verifyOtp = useCallback(
    async ({ email, otp }: { email: string; otp: string }) => {
      setError(null);
      setLoading(true);
      try {
        const res = await api.post<LoginPayload>("/users/verify-otp", { email, otp });
        setAuthUser(res.data);
        toast.success("Email verified — welcome!");
        return res.data;
      } catch (err) {
        const message = getErrorMessage(err, "Verification failed");
        setError(message);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setAuthUser]
  );

  const resendOtp = useCallback(
    async (email: string) => {
      setError(null);
      setResendMessage("");
      setLoading(true);
      try {
        const res = await api.post<{ message?: string }>("/users/resend-otp", { email });
        setResendMessage(res.data.message ?? "");
        toast.success(res.data.message || "Verification code resent");
        return res.data;
      } catch (err) {
        const message = getErrorMessage(err, "Failed to resend OTP");
        setError(message);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { createAccount, verifyOtp, resendOtp, loading, error, resendMessage, setError };
}
