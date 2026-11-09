import { io } from "socket.io-client";
import api from "./axios";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL && /^https?:\/\//.test(import.meta.env.VITE_API_URL)
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
    : null) ||
  `${window.location.protocol}//${window.location.hostname}:7000`;

// The socket server may be on a different origin than the page, so the httpOnly
// cookie isn't sent to it. Each (re)connect fetches a fresh 2-minute token instead.
export const socket = io(SOCKET_URL, {
  autoConnect: false, // We connect manually when user logs in
  withCredentials: true,
  auth: (cb) => {
    api
      .get("/users/socket-token")
      .then((res) => cb({ token: res.data.token }))
      .catch(() => cb({}));
  },
});
