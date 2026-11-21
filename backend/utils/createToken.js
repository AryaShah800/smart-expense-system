import jwt from "jsonwebtoken";

const isProduction = () => process.env.NODE_ENV === "production";

// Shared by login and logout so the cookie is set and cleared with the same attributes.
export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: isProduction() ? "none" : "lax",
  secure: isProduction(),
});

const requireSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return secret;
};

// Signs a 30-day session JWT and stores it ONLY in the httpOnly cookie.
// The token is deliberately not returned, so it never reaches JavaScript.
const generateToken = (res, _id) => {
  if (!_id) {
    throw new Error("User ID is required to generate token");
  }

  const token = jwt.sign({ _id }, requireSecret(), { expiresIn: "30d" });

  res.cookie("jwt", token, {
    ...cookieOptions(),
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

// Short-lived token the client uses once to open a Socket.io connection
// (the socket server is on another origin, so the cookie isn't sent to it).
export const generateSocketToken = (_id) =>
  jwt.sign({ _id }, requireSecret(), { expiresIn: "2m" });

export default generateToken;
