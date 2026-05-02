import { useState, useCallback } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import Branding from "../components/Branding";
import useLogin from "../hooks/useLogin";
import "../styles/auth.css";

const SUBMIT_BUTTON_CLASSES = "submit-btn login-btn";

function Login() {
  const navigate = useNavigate();
  const { submit: submitLogin, loading, error, setError } = useLogin();

  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);


  const updateField = useCallback((e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  }, []);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError(null);
      try {
        await submitLogin(credentials);
        navigate("/dashboard");
      } catch (err) {
        // error state is handled by the hook; optionally integrate a toast here
      }
    },
    [credentials, submitLogin, navigate, setError]
  );

  const savedUser = localStorage.getItem("user");
  if (savedUser) return <Navigate to="/dashboard" replace />;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Branding />
        <h2>Welcome back</h2>
        <p>Sign in to your account</p>
        {error && <p className="error-text">{error}</p>}

        <form onSubmit={onSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              value={credentials.email}
              onChange={updateField}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={credentials.password}
                onChange={updateField}
                required
                aria-describedby={error ? "login-error" : undefined}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((s) => !s)}
                tabIndex={-1}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className={SUBMIT_BUTTON_CLASSES}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="auth-footer">
          Don’t have an account? <Link to="/signup">Create one</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;