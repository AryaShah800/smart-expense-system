import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

// Register the service worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("New content available. Reload?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("App ready to work offline");
  },
});

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element in index.html");

// App mounts the single AuthProvider and Toaster.
ReactDOM.createRoot(root).render(<App />);
