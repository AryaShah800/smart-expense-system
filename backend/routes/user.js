import express from "express";
import { 
  login, signup, logout, verifyEmail, // ✅ Added verifyEmail
  getInvitations, respondToInvitation,
  getNotifications, markNotificationsRead,
  updateProfile, resendOtp, debugGetOtp, getSocketToken
} from "../controllers/user.js";
import auth from "../middlewares/auth.js";
import {
  loginLimiter, signupLimiter, verifyOtpLimiter, resendOtpLimiter,
} from "../middlewares/rateLimiters.js";

const router = express.Router();

/* AUTH */
router.post("/signup", signupLimiter(), signup);
router.post("/verify-otp", verifyOtpLimiter(), verifyEmail);
router.post("/resend-otp", resendOtpLimiter(), resendOtp);
// Only registered when explicitly enabled (local testing); never exists in production.
if (process.env.ENABLE_DEBUG_OTP === "true") {
  router.get("/debug/otp", debugGetOtp);
}
router.post("/login", loginLimiter(), login);
router.post("/logout", logout);
router.get("/socket-token", auth, getSocketToken);
router.get("/me", auth, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

/* USER SETTINGS */
router.put("/profile", auth, updateProfile); // 🔥 NEW UPDATE ROUTE

/* INVITATIONS */
router.get("/invitations", auth, getInvitations);
router.post("/invitations/respond", auth, respondToInvitation);

/* NOTIFICATIONS */
router.get("/notifications", auth, getNotifications);
router.put("/notifications/read", auth, markNotificationsRead);

export default router;