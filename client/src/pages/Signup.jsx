
import { useState, useCallback } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import Branding from "../components/Branding";
import useSignup from "../hooks/useSignup";
import "../styles/auth.css";

const BUTTON_CLASS = "submit-btn";
const RESEND_STYLE = { color: "var(--success, #15803d)", fontSize: 14, marginBottom: 10 };

function Signup() {
  const navigate = useNavigate();
  const { createAccount, verifyOtp, resendOtp, loading, error, resendMessage, setError } = useSignup();

  const [step, setStep] = useState(1);
  const [credentials, setCredentials] = useState({ username: "", email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);


  const updateField = useCallback((e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  }, []);

  const onCreateAccount = useCallback(
    async (e) => {
      e.preventDefault();
      setError(null);
      try {
        await createAccount(credentials);
        setStep(2);
      } catch (err) {
        // error state provided by hook
      }
    },
    [credentials, createAccount, setError]
  );

  const onVerify = useCallback(
    async (e) => {
      e.preventDefault();
      setError(null);
      try {
        await verifyOtp({ email: credentials.email, otp });
        navigate("/dashboard");
      } catch (err) {
        // handled in hook
      }
    },
    [credentials.email, otp, verifyOtp, navigate, setError]
  );

  const onResend = useCallback(async () => {
    setError(null);
    try {
      await resendOtp(credentials.email);
    } catch (err) {
      // handled in hook
    }
  }, [credentials.email, resendOtp, setError]);

  const savedUser = localStorage.getItem("user");
  if (savedUser) return <Navigate to="/dashboard" replace />;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Branding />
        <h2>{step === 1 ? "Create account" : "Verify Email"}</h2>
        <p>{step === 1 ? "Start managing your finances" : `Enter the code sent to ${credentials.email}`}</p>

        {error && <p className="error-text">{error}</p>}

        {step === 1 ? (
          <form onSubmit={onCreateAccount} noValidate>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="Choose a username"
                required
                autoComplete="username"
                value={credentials.username}
                onChange={updateField}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                required
                autoComplete="email"
                value={credentials.email}
                onChange={updateField}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  required
                  autoComplete="new-password"
                  value={credentials.password}
                  onChange={updateField}
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

            <button type="submit" disabled={loading} className={BUTTON_CLASS}>
              {loading ? "Creating..." : "Create account"}
            </button>
          </form>
        ) : (
          <form onSubmit={onVerify}>
            {resendMessage && <p style={RESEND_STYLE}>{resendMessage}</p>}

            <div className="form-group">
              <label>Verification Code</label>
              <input
                type="text"
                placeholder="• • • • • •"
                value={otp}
                required
                maxLength={6}
                className="otp-input"
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className={BUTTON_CLASS}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <div className="otp-actions">
              <button type="button" className="btn-link" onClick={() => setStep(1)} disabled={loading}>
                Wrong email? Edit
              </button>
              <button type="button" className="btn-link" onClick={onResend} disabled={loading}>
                Resend Code
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></div>
      </div>
    </div>
  );
}

export default Signup;