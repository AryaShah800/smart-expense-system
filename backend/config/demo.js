// Demo mode is OFF unless DEMO_MODE=true. It is read on every call so tests can flip it.
export const DEMO_EMAIL = "demo@smartexpense.app";
export const FRIEND_EMAILS = [
  "rahul.demo@smartexpense.app",
  "sneha.demo@smartexpense.app",
  "priya.demo@smartexpense.app",
];

export const isDemoMode = () => process.env.DEMO_MODE === "true";

export const isDemoEmail = (email) =>
  [DEMO_EMAIL, ...FRIEND_EMAILS].includes(String(email ?? "").trim().toLowerCase());

// The demo workspace is rebuilt on login once it is older than this many minutes.
export const demoResetMinutes = () => {
  const n = Number(process.env.DEMO_RESET_MINUTES);
  return Number.isFinite(n) && n > 0 ? n : 30;
};
