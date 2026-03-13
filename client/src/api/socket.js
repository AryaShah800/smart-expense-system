import { io } from "socket.io-client";

// Dynamically connect to the same hostname (and protocol) where the frontend is served
const SOCKET_URL = `${window.location.protocol}//${window.location.hostname}:7000`;

// Create socket instance
export const socket = io(SOCKET_URL, {
  autoConnect: false, // We connect manually when user logs in
});