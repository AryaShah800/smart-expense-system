// Allowed browser origins.
// Set ALLOWED_ORIGINS (comma-separated, exact origins) in production, for example
//   ALLOWED_ORIGINS=https://smart-expense.vercel.app
// Until it is set, any *.vercel.app origin is accepted so existing deploys keep working;
// that is too broad for a credentialed API, because anyone can host a site on vercel.app.
// Local development: this machine, or a phone on the same LAN. Matched on the parsed host name,
// because a prefix test ("http://localhost...") also matched http://localhost.evil.com.
const isLocalDevHost = (hostname) =>
  hostname === "localhost" || hostname === "127.0.0.1" || /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname);

export const isAllowedOrigin = (origin, env = process.env) => {
  if (!origin) return true; // non-browser clients (curl, health checks, server-to-server)
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol === "http:" && isLocalDevHost(url.hostname)) return true;

  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (allowed.length) return allowed.includes(origin);

  return url.protocol === "https:" && url.hostname.endsWith(".vercel.app");
};

export const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) callback(null, true);
    else callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
};
