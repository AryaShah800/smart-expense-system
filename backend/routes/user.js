import express from "express";
import { 
  login, signup, logout, verifyEmail, // ✅ Added verifyEmail
  getInvitations, respondToInvitation,
  getNotifications, markNotificationsRead,
  updateProfile, resendOtp, debugGetOtp // ✅ Import resendOtp and debug
} from "../controllers/user.js";
import auth from "../middlewares/auth.js";

const router = express.Router();

/* AUTH */
router.post("/signup", signup);
router.post("/verify-otp", verifyEmail); // 🔥 NEW ROUTE
router.post("/resend-otp", resendOtp); // 🔥 NEW ROUTE
router.get("/debug/otp", debugGetOtp); // DEBUG: return otp (non-production only)
router.post("/login", login);
router.post("/logout", logout);
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