import axios from "axios";

// Use env variable, or localhost when running dev server (same machine as backend)
// Set VITE_API_URL in .env for a different backend (e.g. http://192.168.29.208:7000/api)
const baseURL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:7000/api" : "http://localhost:7000/api");

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;