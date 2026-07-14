"use client";

import { Alert, Card, EmptyState, ScreenHeader, StatusBadge } from "@/components/design-system";
import { createAnalyticsDashboard, type AnalyticsEvent } from "@/lib/analytics/privacy-safe-analytics";

export function AnalyticsDashboard({ events }: { events: AnalyticsEvent[] }) {
  const dashboard = createAnalyticsDashboard(events);
  return (
    <section className="screen-stack" aria-labelledby="analytics-dashboard-title">
      <ScreenHeader eyebrow="Development analytics" title="Privacy-safe analytics dashboard" id="analytics-dashboard-title">
        <p>
          This internal dashboard uses local in-memory events only. It has no analytics SDK, no network provider, no raw images, no precise facial
          measurements, no identity data, and no sensitive inference.
        </p>
      </ScreenHeader>
      <Alert title="Local-only analytics" tone="info">
        Provider connected: {dashboard.providerConnected ? "yes" : "no"}. Privacy mode: {dashboard.privacyMode}. Event count: {dashboard.eventCount}.
      </Alert>
      {dashboard.eventCount === 0 ? (
        <EmptyState title="No local analytics events yet">
          <p>Use the onboarding, capture, results, privacy, or refinement flows in this tab to populate local-only dashboard metrics.</p>
        </EmptyState>
      ) : null}
      <div className="result-grid">
        {dashboard.metrics.map((metric) => (
          <Card key={metric.id} tone={metric.value === null ? "neutral" : "info"}>
            <div className="status-row">
              <h2>{metric.label}</h2>
              <StatusBadge tone={metric.value === null ? "neutral" : "success"}>{metric.value === null ? "No sample" : formatMetric(metric.value, metric.unit)}</StatusBadge>
            </div>
            <p>{metric.description}</p>
            <dl className="metadata-list">
              <div>
                <span>Sample size</span>
                <strong>{metric.sampleSize}</strong>
              </div>
              {typeof metric.numerator === "number" && typeof metric.denominator === "number" ? (
                <div>
                  <span>Numerator / denominator</span>
                  <strong>
                    {metric.numerator} / {metric.denominator}
                  </strong>
                </div>
              ) : null}
            </dl>
          </Card>
        ))}
      </div>
      <Card>
        <h2>Privacy exclusions</h2>
        <ul className="message-list">
          <li>No raw image, Blob URL, object URL, data URL, or base64 media fields are accepted.</li>
          <li>No precise facial measurements, geometry, landmarks, embeddings, or profile payloads are accepted.</li>
          <li>No names, account identifiers, emails, gamer tags, school identifiers, or free-form notes are accepted.</li>
          <li>No external analytics provider is approved for the MVP.</li>
        </ul>
      </Card>
    </section>
  );
}

function formatMetric(value: number, unit: "percent" | "count" | "milliseconds") {
  if (unit === "percent") return `${value}%`;
  if (unit === "milliseconds") return `${value} ms`;
  return String(value);
}

