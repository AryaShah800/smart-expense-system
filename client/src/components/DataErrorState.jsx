import React from "react";

export default function DataErrorState({
  title = "Unable to connect to server",
  message = "Could not reach the server. Please make sure the server is running and check your connection.",
  onRetry,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 16px",
        minHeight: "360px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: "var(--card, #ffffff)",
          border: "1px solid var(--border, #e2e8f0)",
          borderRadius: "20px",
          padding: "36px 24px",
          maxWidth: "440px",
          width: "100%",
          textAlign: "center",
          boxShadow: "var(--shadow, 0 10px 25px rgba(0,0,0,0.06))",
        }}
      >
        <div style={{ fontSize: "44px", marginBottom: "16px" }}>📡</div>
        <h3
          style={{
            fontSize: "18px",
            fontWeight: "800",
            color: "var(--text, #0f172a)",
            marginBottom: "8px",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: "14px",
            color: "var(--muted, #64748b)",
            lineHeight: "1.5",
            marginBottom: "24px",
          }}
        >
          {message}
        </p>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              padding: "12px 24px",
              borderRadius: "12px",
              border: "none",
              background: "var(--primary, #6366f1)",
              color: "white",
              fontWeight: "700",
              fontSize: "14px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>🔄</span> Try Again
          </button>
        )}
      </div>
    </div>
  );
}
