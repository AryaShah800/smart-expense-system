import { useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/insights.css";

export default function ActionableInsights({ insights = [], onRefresh, loading = false }) {
  const [dismissed, setDismissed] = useState([]);

  const visibleInsights = insights.filter((i) => !dismissed.includes(i.id));

  const handleDismiss = (id) => {
    setDismissed((prev) => [...prev, id]);
  };

  if (!insights || insights.length === 0) {
    return (
      <div className="insights-container empty-state">
        <div className="insights-header">
          <div className="insights-title-row">
            <span className="insights-glow-icon">💡</span>
            <h3>Actionable Financial Intelligence</h3>
          </div>
          {onRefresh && (
            <button
              type="button"
              className="insights-refresh-btn"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh insights"
            >
              🔄
            </button>
          )}
        </div>
        <div className="insights-empty-card">
          <div className="empty-sparkle">✨</div>
          <p>
            Your financial intelligence engine is active! As you log expenses and compare this
            month with previous months, proactive alerts and spending trend warnings will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="insights-container">
      <div className="insights-header">
        <div className="insights-title-row">
          <span className="insights-glow-icon">💡</span>
          <div>
            <h3>Actionable Financial Insights</h3>
            <span className="insights-subtitle">
              Proactive analysis based on your spending velocity
            </span>
          </div>
        </div>
        <div className="insights-header-actions">
          <span className="insights-pill-count">
            {visibleInsights.length} active
          </span>
          {onRefresh && (
            <button
              type="button"
              className={`insights-refresh-btn ${loading ? "spinning" : ""}`}
              onClick={onRefresh}
              disabled={loading}
              title="Refresh insights"
              aria-label="Refresh financial insights"
            >
              🔄
            </button>
          )}
        </div>
      </div>

      <div className="insights-grid">
        {visibleInsights.map((insight) => (
          <div key={insight.id} className={`insight-card ${insight.type || "info"}`}>
            <div className="insight-card-top">
              <div className="insight-badge-row">
                <span className="insight-type-icon">{insight.icon}</span>
                <span className="insight-category-tag">{insight.category}</span>
                {insight.badge && (
                  <span className={`insight-delta-badge ${insight.type}`}>
                    {insight.badge}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="insight-dismiss-btn"
                onClick={() => handleDismiss(insight.id)}
                title="Dismiss"
                aria-label="Dismiss insight"
              >
                ✕
              </button>
            </div>

            <div className="insight-body">
              <h4 className="insight-headline">{insight.title}</h4>
              <p className="insight-message">{insight.message}</p>
            </div>

            <div className="insight-footer">
              {insight.metric && (
                <span className="insight-metric-label">{insight.metric}</span>
              )}
              {insight.actionLink ? (
                <Link to={insight.actionLink} className="insight-action-btn">
                  {insight.actionText || "View Details"} →
                </Link>
              ) : insight.actionFilter ? (
                <Link
                  to={`/expenses?category=${encodeURIComponent(insight.actionFilter)}`}
                  className="insight-action-btn"
                >
                  {insight.actionText || "View Transactions"} →
                </Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
