import { io } from "socket.io-client";

const SOCKET_URL = "http://192.168.29.208:7000";

// Create socket instance
export const socket = io(SOCKET_URL, {
  autoConnect: false, // We connect manually when user logs in
});