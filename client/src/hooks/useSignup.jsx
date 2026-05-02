import { useState, useCallback } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

// Encapsulates signup flow: create account, verify OTP, resend OTP
export default function useSignup() {
  const { login: setAuthUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resendMessage, setResendMessage] = useState("");

  const createAccount = useCallback(
    async (accountInfo) => {
      setError(null);
      setLoading(true);
      try {
        const res = await api.post("/users/signup", accountInfo);
        toast.success("Account created — check your email for a verification code");
        return res.data;
      } catch (err) {
        const message = err?.response?.data?.message || "Signup failed";
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
    async ({ email, otp }) => {
      setError(null);
      setLoading(true);
      try {
        const res = await api.post("/users/verify-otp", { email, otp });
        setAuthUser(res.data);
        toast.success("Email verified — welcome!");
        return res.data;
      } catch (err) {
        const message = err?.response?.data?.message || "Verification failed";
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
    async (email) => {
      setError(null);
      setResendMessage("");
      setLoading(true);
      try {
        const res = await api.post("/users/resend-otp", { email });
        setResendMessage(res.data.message);
        toast.success(res.data.message || "Verification code resent");
        return res.data;
      } catch (err) {
        const message = err?.response?.data?.message || "Failed to resend OTP";
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
