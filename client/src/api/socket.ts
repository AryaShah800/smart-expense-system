import { io, type Socket } from "socket.io-client";

const SOCKET_URL: string =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "") : null) ||
  `${window.location.protocol}//${window.location.hostname}:3000`;

// Create socket instance
export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false, // We connect manually when user logs in
});
