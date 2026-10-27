import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/dashboard";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "var(--bg, #f8fafc)",
          color: "var(--text, #0f172a)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          boxSizing: "border-box"
        }}>
          <div style={{
            maxWidth: "420px",
            width: "100%",
            background: "var(--card, #ffffff)",
            borderRadius: "20px",
            border: "1px solid var(--border, #e2e8f0)",
            boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            padding: "32px 24px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
            <h2 style={{ fontSize: "20px", fontWeight: "800", marginBottom: "8px" }}>
              Something went wrong
            </h2>
            <p style={{
              color: "var(--muted, #64748b)",
              fontSize: "14px",
              lineHeight: "1.5",
              marginBottom: "24px"
            }}>
              We ran into an unexpected problem displaying this screen. Don't worry, your data is safe.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1px solid var(--border, #cbd5e1)",
                  background: "var(--bg, #f1f5f9)",
                  color: "var(--text, #0f172a)",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                🔄 Reload
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "none",
                  background: "var(--primary, #6366f1)",
                  color: "white",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                🏠 Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
