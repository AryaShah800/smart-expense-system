import jwt from "jsonwebtoken";
import { parseCookie } from "cookie";

// Reads the JWT from the handshake: `auth.token` (short-lived socket token) first,
// then the httpOnly `jwt` cookie when the socket is same-site with the API.
const tokenFromHandshake = (socket) => {
  const fromAuth = socket.handshake.auth?.token;
  if (typeof fromAuth === "string" && fromAuth) return fromAuth;

  const header = socket.handshake.headers?.cookie;
  if (header) {
    const cookies = parseCookie(header);
    if (cookies.jwt) return cookies.jwt;
  }
  return null;
};

// io.use() middleware: rejects the connection unless the JWT is valid.
// The user id comes from the verified token, never from the client.
export const socketAuth = (socket, next) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) return next(new Error("Server misconfigured"));

  const token = tokenFromHandshake(socket);
  if (!token) return next(new Error("Authentication required"));

  try {
    const decoded = jwt.verify(token, secret);
    if (!decoded?._id) return next(new Error("Invalid token"));
    socket.data.userId = String(decoded._id);
    return next();
  } catch {
    return next(new Error("Invalid token"));
  }
};

// Each authenticated socket joins only its own user room.
export const registerSocketHandlers = (io) => {
  io.use(socketAuth);
  io.on("connection", (socket) => {
    socket.join(socket.data.userId);
  });
};
