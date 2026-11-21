// Allowed browser origins.
// Set ALLOWED_ORIGINS (comma-separated, exact origins) in production, for example
//   ALLOWED_ORIGINS=https://smart-expense.vercel.app
// Until it is set, any *.vercel.app origin is accepted so existing deploys keep working;
// that is too broad for a credentialed API, because anyone can host a site on vercel.app.
export const isAllowedOrigin = (origin, env = process.env) => {
  if (!origin) return true; // non-browser clients (curl, health checks, server-to-server)
  if (origin.startsWith("http://localhost") || origin.startsWith("http://192.168.")) return true;

  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (allowed.length) return allowed.includes(origin);

  return origin.endsWith(".vercel.app");
};

export const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) callback(null, true);
    else callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
};
