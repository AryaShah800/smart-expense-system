import { useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/insights.css";
import type { Insight } from "../../types/models";
import { Lightbulb, RefreshCw, X, AlertTriangle, TrendingUp, OctagonAlert, Info } from "lucide-react";

interface ActionableInsightsProps {
  insights?: Insight[];
  onRefresh?: () => void;
  loading?: boolean;
}

const MAX_VISIBLE = 4;
const SEVERITY: Record<string, number> = { danger: 0, warning: 1, info: 2, success: 3 };

const INSIGHT_ICONS = { warning: AlertTriangle, success: TrendingUp, danger: OctagonAlert, info: Info } as const;

function InsightIcon({ type }: { type?: string }) {
  const Icon = INSIGHT_ICONS[(type as keyof typeof INSIGHT_ICONS) ?? "info"] ?? Info;
  return <Icon size={14} aria-hidden="true" />;
}

export default function ActionableInsights({ insights = [], onRefresh, loading = false }: ActionableInsightsProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  // Most urgent first (stable for equal severity); four fill the grid evenly, the rest sit behind a toggle.
  const visibleInsights = insights
    .filter((i) => !dismissed.includes(i.id))
    .sort((a, b) => (SEVERITY[a.type] ?? 2) - (SEVERITY[b.type] ?? 2));
  const shownInsights = showAll ? visibleInsights : visibleInsights.slice(0, MAX_VISIBLE);
  const hiddenCount = visibleInsights.length - shownInsights.length;

  const handleDismiss = (id: string) => {
    setDismissed((prev) => [...prev, id]);
  };

  if (!insights || insights.length === 0) {
    return (
      <div className="insights-container empty-state">
        <div className="insights-header">
          <div className="insights-title-row">
            <span className="insights-glow-icon"><Lightbulb size={20} aria-hidden="true" /></span>
            <h2>Insights</h2>
          </div>
          {onRefresh && (
            <button
              type="button"
              className="insights-refresh-btn"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh insights"
            >
              <RefreshCw size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="insights-empty-card">
          <div className="empty-sparkle"><Lightbulb size={28} strokeWidth={1.5} aria-hidden="true" /></div>
          <p>
            Insights appear here once there is a month of spending to compare. Log a few expenses
            and set a budget to see how this month is going.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="insights-container">
      <div className="insights-header">
        <div className="insights-title-row">
          <span className="insights-glow-icon"><Lightbulb size={20} aria-hidden="true" /></span>
          <div>
            <h2>Insights</h2>
            <span className="insights-subtitle">
              This month compared with last month and your budgets
            </span>
          </div>
        </div>
        <div className="insights-header-actions">
          <span className="insights-pill-count">
            {visibleInsights.length} {visibleInsights.length === 1 ? "insight" : "insights"}
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
              <RefreshCw size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="insights-grid">
        {shownInsights.map((insight) => (
          <div key={insight.id} className={`insight-card ${insight.type || "info"}`}>
            <div className="insight-card-top">
              <div className="insight-badge-row">
                <span className="insight-type-icon"><InsightIcon type={insight.type} /></span>
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
                <X size={14} aria-hidden="true" />
              </button>
            </div>

            <div className="insight-body">
              <h3 className="insight-headline">{insight.title}</h3>
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
      {(hiddenCount > 0 || showAll) && visibleInsights.length > MAX_VISIBLE && (
        <button type="button" className="insights-more-btn" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show fewer" : `Show ${hiddenCount} more`}
        </button>
      )}
    </div>
  );
}
