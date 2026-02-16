import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:7000";

// Create socket instance
export const socket = io(SOCKET_URL, {
  autoConnect: false, // We connect manually when user logs in
});