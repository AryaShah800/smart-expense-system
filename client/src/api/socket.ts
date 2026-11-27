import { io, type Socket } from "socket.io-client";
import api from "./axios";

const SOCKET_URL: string =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "") : null) ||
  // Same default as the API client (axios.ts), so local development reaches the same server.
  `${window.location.protocol}//${window.location.hostname}:7000`;

/**
 * Socket.IO calls this before every connection attempt, including reconnects.
 * The API is on another site in production, so the session cookie may not reach the socket handshake;
 * instead the client asks the API (with the cookie) for a short-lived socket token and sends it as `auth.token`,
 * which the server's socketAuth middleware verifies. Without a token the server rejects the connection.
 */
export const fetchSocketAuth = (callback: (auth: { token?: string }) => void): void => {
  api
    .get<{ token: string }>("/users/socket-token")
    .then(({ data }) => callback({ token: data.token }))
    .catch(() => callback({}));
};

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false, // We connect manually when user logs in
  withCredentials: true,
  auth: fetchSocketAuth,
});
