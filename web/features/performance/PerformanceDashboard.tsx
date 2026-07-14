"use client";

import { Alert, Card, EmptyState, ScreenHeader, StatusBadge } from "@/components/design-system";
import { createPerformanceDashboard, type PerformanceMetricRecord } from "@/lib/performance/performance-monitor";

export function PerformanceDashboard({ records }: { records: PerformanceMetricRecord[] }) {
  const dashboard = createPerformanceDashboard(records);
  return (
    <section className="screen-stack" aria-labelledby="performance-dashboard-title">
      <ScreenHeader eyebrow="Development performance" title="Performance budget dashboard" id="performance-dashboard-title">
        <p>
          This internal dashboard uses local in-memory timing and coarse memory estimates only. It stores no raw images, landmarks, facial
          measurements, identity data, or sensitive inferences.
        </p>
      </ScreenHeader>
      <Alert title="Local-only performance monitoring" tone={dashboard.overBudgetOperations.length > 0 ? "warning" : "info"}>
        {dashboard.eventCount} local samples recorded. {dashboard.overBudgetOperations.length} operation
        {dashboard.overBudgetOperations.length === 1 ? "" : "s"} currently exceed budget.
      </Alert>
      {dashboard.eventCount === 0 ? (
        <EmptyState title="No performance samples yet">
          <p>Use the capture, profile, results, catalog, privacy, or refinement flows to populate local performance samples.</p>
        </EmptyState>
      ) : null}
      <div className="result-grid">
        {dashboard.metrics.map((metric) => (
          <Card key={metric.operation} tone={metric.budgetStatus === "overBudget" ? "warning" : metric.budgetStatus === "withinBudget" ? "success" : "neutral"}>
            <div className="status-row">
              <h2>{metric.label}</h2>
              <StatusBadge tone={metric.budgetStatus === "overBudget" ? "warning" : metric.budgetStatus === "withinBudget" ? "success" : "neutral"}>
                {metric.budgetStatus}
              </StatusBadge>
            </div>
            <p>{metric.budgetDescription}</p>
            <dl className="metadata-list">
              <div>
                <span>Samples</span>
                <strong>{metric.sampleSize}</strong>
              </div>
              <div>
                <span>Latest</span>
                <strong>{formatMilliseconds(metric.latestDurationMs)}</strong>
              </div>
              <div>
                <span>Average</span>
                <strong>{formatMilliseconds(metric.averageDurationMs)}</strong>
              </div>
              <div>
                <span>Max</span>
                <strong>{formatMilliseconds(metric.maxDurationMs)}</strong>
              </div>
              <div>
                <span>Latest memory</span>
                <strong>{formatBytes(metric.latestMemoryBytes)}</strong>
              </div>
            </dl>
          </Card>
        ))}
      </div>
      <Card>
        <h2>Main-thread rules</h2>
        <ul className="message-list">
          <li>Live camera guidance skips frames when analysis is already running.</li>
          <li>Large future loops should use responsive chunk processing instead of one long synchronous pass.</li>
          <li>Raw media bytes are not placed in performance records, logs, localStorage, or sessionStorage.</li>
          <li>Any over-budget metric needs real-device verification before private beta claims.</li>
        </ul>
      </Card>
    </section>
  );
}

function formatMilliseconds(value: number | null) {
  return value === null ? "No sample" : `${value} ms`;
}

function formatBytes(value: number | null) {
  if (value === null) return "No sample";
  if (value >= 1024 * 1024) return `${Math.round(value / (1024 * 1024))} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} bytes`;
}
