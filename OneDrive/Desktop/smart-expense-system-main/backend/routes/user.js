import express from "express";
const router = express.Router();

console.log("🔥 USER ROUTES FILE LOADED");

import { login, signup, logout } from "../controllers/user.js";
import auth from "../middlewares/auth.js";

/**
 * Auth routes
 */
router.post("/login", login);
router.post("/signup", signup);
router.post("/logout", logout);

/**
 * Auth check route
 */
router.get("/me", auth, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

export default router;
