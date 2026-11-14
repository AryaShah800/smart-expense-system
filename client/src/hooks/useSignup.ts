import { useState, useCallback } from "react";
import api, { apiErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import type { AuthUser } from "../types/models";

export interface AccountInfo {
  username: string;
  email: string;
  password: string;
}

interface MessageResponse {
  message: string;
  email?: string;
}

// Encapsulates signup flow: create account, verify OTP, resend OTP
export default function useSignup() {
  const { login: setAuthUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState("");

  const createAccount = useCallback(
    async (accountInfo: AccountInfo): Promise<MessageResponse> => {
      setError(null);
      setLoading(true);
      try {
        const res = await api.post<MessageResponse>("/users/signup", accountInfo);
        toast.success("Account created — check your email for a verification code");
        return res.data;
      } catch (err) {
        const message = apiErrorMessage(err, "Signup failed");
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
    async ({ email, otp }: { email: string; otp: string }): Promise<AuthUser> => {
      setError(null);
      setLoading(true);
      try {
        const res = await api.post<AuthUser>("/users/verify-otp", { email, otp });
        setAuthUser(res.data);
        toast.success("Email verified — welcome!");
        return res.data;
      } catch (err) {
        const message = apiErrorMessage(err, "Verification failed");
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
    async (email: string): Promise<MessageResponse> => {
      setError(null);
      setResendMessage("");
      setLoading(true);
      try {
        const res = await api.post<MessageResponse>("/users/resend-otp", { email });
        setResendMessage(res.data.message);
        toast.success(res.data.message || "Verification code resent");
        return res.data;
      } catch (err) {
        const message = apiErrorMessage(err, "Failed to resend OTP");
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
