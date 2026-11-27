// Request bodies are plain data. A key that starts with "$" (for example { "joinCode": { "$ne": null } })
// would become a MongoDB query operator if a handler passed the value straight into find/findOne,
// so such bodies are rejected before any route sees them. Express 5's default query parser already
// keeps query strings flat (type[$ne]=x stays a literal key), so only the body needs checking.
const MAX_DEPTH = 20;

const hasOperatorKey = (value, depth = 0) => {
  if (depth > MAX_DEPTH || value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasOperatorKey(item, depth + 1));
  return Object.keys(value).some((key) => key.startsWith("$") || hasOperatorKey(value[key], depth + 1));
};

export const rejectOperatorKeys = (req, res, next) => {
  if (hasOperatorKey(req.body)) {
    return res.status(400).json({ message: "Invalid request body" });
  }
  next();
};

export { hasOperatorKey };
