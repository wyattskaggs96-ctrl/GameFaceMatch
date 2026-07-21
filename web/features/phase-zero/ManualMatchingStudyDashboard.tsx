"use client";

import { Alert, Card, EmptyState, ScreenHeader, StatusBadge } from "@/components/design-system";
import {
  createManualMatchingStudyOperation,
  exportManualMatchingStudyReport
} from "@/lib/phase-zero/phase-zero-manual-matching-study-module";

const generatedAt = "2026-07-20T00:00:00.000Z";

export function ManualMatchingStudyDashboard() {
  const operation = createManualMatchingStudyOperation({
    sourceType: "researchDraft",
    studyID: "manual-matching-feasibility-study",
    studyVersion: "manual-study-protocol-v2",
    catalogVersion: {
      catalogVersionID: "requires-approved-production-catalog",
      game: "EA SPORTS College Football 27",
      platform: "requires-verification",
      gameVersion: "requires-verification",
      patchVersion: "requires-verification",
      verifiedAt: null
    },
    catalogGate: {
      approvedCatalogReleaseAvailable: false,
      releaseID: null,
      releaseStatus: "unknown",
      gateCheckedAt: generatedAt
    },
    createdAt: generatedAt,
    notes: "Dashboard shell for the manual matching feasibility study. No participant data is bundled."
  });
  const report = exportManualMatchingStudyReport(operation, generatedAt);
  const dashboard = report.dashboard;

  return (
    <section className="stack-xl" aria-labelledby="manual-study-heading">
      <ScreenHeader
        eyebrow="Internal validation"
        title="Manual matching study"
        id="manual-study-heading"
      >
        Tracks the 10-20 person feasibility study without names, raw media, or fixture-derived accuracy claims.
      </ScreenHeader>
      <Alert
        tone="warning"
        title="Accuracy is not measured yet"
      >
        {dashboard.measurementLabel}
      </Alert>
      <div className="dashboard-grid">
        <Card>
          <div className="stack-sm">
            <StatusBadge tone="warning">{dashboard.status === "measured" ? "Measured" : "Not measured"}</StatusBadge>
            <h3>Participants completed</h3>
            <p className="metric-value">{dashboard.participantsCompleted}</p>
            <p className="muted">Target: {dashboard.participantTargetRange.minimum}-{dashboard.participantTargetRange.maximum} consenting participants.</p>
          </div>
        </Card>
        <Card>
          <div className="stack-sm">
            <h3>Top-one acceptance</h3>
            <p className="metric-value">{formatMetric(dashboard.topOneAcceptance)}</p>
            <p className="muted">Calculated only after enough real completed study records exist.</p>
          </div>
        </Card>
        <Card>
          <div className="stack-sm">
            <h3>Top-three usefulness</h3>
            <p className="metric-value">{formatMetric(dashboard.topThreeUsefulness)}</p>
            <p className="muted">Does not use fixture or synthetic study rows.</p>
          </div>
        </Card>
        <Card>
          <div className="stack-sm">
            <h3>Repeatability</h3>
            <p className="metric-value">{dashboard.repeatability === "not measured" ? "Not measured" : `${dashboard.repeatability.sameTopChoiceCount}/${dashboard.repeatability.repeatScanCount}`}</p>
            <p className="muted">Compares repeat-scan top-three outputs after real repeat scans are submitted.</p>
          </div>
        </Card>
      </div>
      <Card>
        <div className="stack-md">
          <h3>Repository-safe worksheets</h3>
          <ul className="check-list">
            <li><code>data/phase-zero/manual_matching_subjects.template.csv</code></li>
            <li><code>data/phase-zero/manual_matching_reviews.template.csv</code></li>
            <li><code>data/phase-zero/manual_matching_results.template.csv</code></li>
            <li><code>data/phase-zero/manual_matching_repeatability.template.csv</code></li>
          </ul>
        </div>
      </Card>
      <EmptyState
        title="No participant records are bundled"
      >
        Recruiting, consent, raw media handling, and deletion confirmation happen outside committed fixtures. Only pseudonymous non-media rows should be submitted.
      </EmptyState>
    </section>
  );
}

function formatMetric(metric: "not measured" | { numerator: number; denominator: number; rate: number | null }) {
  if (metric === "not measured" || metric.rate === null) return "Not measured";
  return `${metric.numerator}/${metric.denominator}`;
}
