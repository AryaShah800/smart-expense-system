import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { store } from "./store";
import { clearCacheOnUserChange, queryClient } from "./api/queryClient";
import { initSentry, Sentry } from "./lib/sentry";

// Start Sentry before anything renders so early errors are captured.
initSentry();
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

clearCacheOnUserChange(store, queryClient);

// App mounts the single Toaster. Redux holds the session and notifications;
// TanStack Query holds server data.
ReactDOM.createRoot(root, {
  // Errors no boundary caught, and errors React recovered from. Boundary-caught
  // errors are reported by ErrorBoundary itself, so they are not sent twice.
  onUncaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </Provider>
);
