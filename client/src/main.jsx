import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext"; // Import AuthProvider
import { Toaster } from 'react-hot-toast';
import "./index.css";
// Add the PWA register import
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

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <>
      <App />
      <Toaster position="top-right" />
    </>
  </AuthProvider>
);
