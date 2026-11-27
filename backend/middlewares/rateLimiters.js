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

// The per-email bucket alone lets one IP try unlimited emails (credential stuffing, or burning the
// email-sending quota with sign-ups). So each auth route also has a wider per-IP bucket. Each limiter
// is a [per-IP, per-IP+email] pair, which Express runs in order.
const byIp = (req) => ipKeyGenerator(req.ip);
const pair = (ipLimit, overrides = {}) => [
  buildLimiter({ ...overrides, limit: ipLimit, keyGenerator: byIp }),
  buildLimiter(overrides),
];

// Successful logins don't count, so normal use is never throttled.
export const loginLimiter = () => pair(50, { skipSuccessfulRequests: true });
// Sign-up and resend send an email each time, so their per-IP budget is the tightest.
export const signupLimiter = () => pair(20);
export const verifyOtpLimiter = () => pair(50);
export const resendOtpLimiter = () => pair(20);

// Demo sessions are keyed by IP only; each one rebuilds data when stale, so keep it modest.
export const demoLimiter = () =>
  buildLimiter({ limit: 10, keyGenerator: (req) => ipKeyGenerator(req.ip) });
