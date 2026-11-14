import { useEffect } from "react";
import { BrowserRouter, Route, Navigate } from "react-router-dom";
import { SentryRoutes, setSentryUser } from "./lib/sentry";
import SentryTest from "./pages/SentryTest";
import { useAppSelector, selectUser } from "./store/hooks";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./components/ErrorBoundary";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import AddTransaction from "./pages/AddTransaction";
import Expenses from "./pages/Expenses";
import Groups from "./pages/Groups";
import GroupDetails from "./pages/GroupDetails";
import Budgets from "./pages/Budgets";
import Settings from "./pages/Settings";
import Recurring from "./pages/Recurring";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

// Smart redirect for root path: sends logged-in users to dashboard
const RootRedirect = () => {
  const user = useAppSelector(selectUser);
  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

function App() {
  const theme = useAppSelector((state) => state.auth.user?.theme);
  const userId = useAppSelector((state) => state.auth.user?._id);

  // Tag Sentry events with the user id so one person's errors can be grouped.
  useEffect(() => {
    setSentryUser(userId);
  }, [userId]);

  // Apply the signed-in user's theme to the whole document.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme || "light");
  }, [theme]);

  return (
    <ErrorBoundary>
      <>
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
          <SentryRoutes>
            {/* Public routes */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            {import.meta.env.DEV && <Route path="/sentry-test" element={<SentryTest />} />}

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
          </SentryRoutes>
        </BrowserRouter>
      </>
    </ErrorBoundary>
  );
}

export default App;