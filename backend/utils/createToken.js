import jwt from "jsonwebtoken";

const generateToken = (res, _id) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  if (!_id) {
    throw new Error("User ID is required to generate token");
  }

  const token = jwt.sign({ _id }, JWT_SECRET, {
    expiresIn: "30d",
  });

  // for production ready
  res.cookie("jwt", token, {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return token;
};

export default generateToken;