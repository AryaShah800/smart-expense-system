import { rateLimit, ipKeyGenerator } from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

// One bucket per IP + email, so one attacker can't hammer a single account
// and one noisy user can't lock out everyone behind the same IP.
const ipAndEmail = (req) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  return `${ipKeyGenerator(req.ip)}:${email}`;
};

const buildLimiter = (overrides = {}) =>
  rateLimit({
    windowMs: WINDOW_MS,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: ipAndEmail,
    handler: (req, res) =>
      res
        .status(429)
        .json({ message: "Too many attempts. Please try again in 15 minutes." }),
    ...overrides,
  });

// Successful logins don't count, so normal use is never throttled.
export const loginLimiter = () => buildLimiter({ skipSuccessfulRequests: true });
export const signupLimiter = () => buildLimiter();
export const verifyOtpLimiter = () => buildLimiter();
export const resendOtpLimiter = () => buildLimiter();
