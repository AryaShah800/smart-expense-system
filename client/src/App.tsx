import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./components/ErrorBoundary";

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AddTransaction = lazy(() => import("./pages/AddTransaction"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Groups = lazy(() => import("./pages/Groups"));
const GroupDetails = lazy(() => import("./pages/GroupDetails"));
const Budgets = lazy(() => import("./pages/Budgets"));
const Settings = lazy(() => import("./pages/Settings"));
const Recurring = lazy(() => import("./pages/Recurring"));

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

const PageFallback = () => (
  <p role="status" aria-live="polite" style={{ padding: 24, color: "var(--muted, #475569)" }}>
    Loading…
  </p>
);

// Smart redirect for root path: sends logged-in users to dashboard
const RootRedirect = () => {
  const savedUser = localStorage.getItem("user");
  return savedUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--card, #fff)",
              color: "var(--text, #0f172a)",
              borderRadius: "12px",
              border: "1px solid var(--border, #e2e8f0)",
              fontSize: "14px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
            },
          }}
        />
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/add-transaction" element={<AddTransaction />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/recurring" element={<Recurring />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/groups/:id" element={<GroupDetails />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;