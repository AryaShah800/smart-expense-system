import User from "../models/user.js";
import generateToken from "../utils/createToken.js";
import { seedDemo } from "../scripts/seedDemo.js";
import { DEMO_EMAIL, isDemoMode, demoResetMinutes } from "../config/demo.js";

let seeding = null;

// Rebuilds the demo workspace when it is missing or older than DEMO_RESET_MINUTES.
// Concurrent logins share one seed run.
async function ensureFreshDemo() {
  const existing = await User.findOne({ email: DEMO_EMAIL }).select("createdAt");
  const ageMs = existing ? Date.now() - existing.createdAt.getTime() : Infinity;
  if (ageMs < demoResetMinutes() * 60 * 1000) return existing;
  seeding ??= seedDemo().finally(() => { seeding = null; });
  await seeding;
  return User.findOne({ email: DEMO_EMAIL }).select("createdAt");
}

export const demoStatus = (req, res) => res.json({ enabled: isDemoMode() });

export const demoLogin = async (req, res) => {
  if (!isDemoMode()) return res.status(404).json({ message: "Demo mode is not enabled" });
  try {
    const user = await ensureFreshDemo();
    generateToken(res, user._id);
    const full = await User.findById(user._id).select("username email");
    res.json({ _id: full._id, username: full.username, email: full.email, isDemo: true });
  } catch (error) {
    console.error("Demo login error:", error);
    res.status(500).json({ message: "Demo workspace is unavailable" });
  }
};
