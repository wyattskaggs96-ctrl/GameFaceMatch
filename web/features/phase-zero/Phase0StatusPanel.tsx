"use client";

import { Alert, Card, ProgressBar, ScreenHeader, StatusBadge } from "@/components/design-system";
import { createPhase0StatusReport, type Phase0AreaStatus, type Phase0StatusReport } from "@/lib/phase-zero/phase-zero-status";

const statusTone = {
  NOT_STARTED: "neutral",
  IN_PROGRESS: "info",
  READY_WITH_LIMITATIONS: "warning",
  BLOCKED: "danger",
  COMPLETE: "success"
} as const;

export function Phase0StatusPanel({ report = createPhase0StatusReport() }: { report?: Phase0StatusReport }) {
  return (
    <section className="screen-stack" aria-labelledby="phase-zero-title">
      <ScreenHeader eyebrow="Development-only status" title="Phase 0 readiness" id="phase-zero-title">
        <p>
          This internal view computes readiness from repository scaffolding and the bundled production catalog. It does not load fixtures, raw media, or
          user data.
        </p>
      </ScreenHeader>
      <Alert title="Overall Phase 0" tone={statusTone[report.overall.status]}>
        {report.overall.status.replaceAll("_", " ")} · {report.overall.percentComplete}% from {report.overall.completedChecks}/
        {report.overall.totalChecks} evidence checks. Production records loaded: {report.productionRecordCount}.
      </Alert>
      <div className="card-grid">
        <Card>
          <h2>Catalog state</h2>
          <dl className="metadata-list">
            <div>
              <dt>Production catalog</dt>
              <dd>{report.productionCatalogVersionID}</dd>
            </div>
            <div>
              <dt>Verified records</dt>
              <dd>{report.verifiedProductionRecordCount}</dd>
            </div>
            <div>
              <dt>Generated</dt>
              <dd>{report.generatedAt}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2>Primary blockers</h2>
          {report.overall.blockers.length === 0 ? (
            <p className="supporting">No blockers detected.</p>
          ) : (
            <ul className="compact-list">
              {report.overall.blockers.slice(0, 5).map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2>Next actions</h2>
          <ul className="compact-list">
            {report.overall.nextActions.slice(0, 5).map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="result-grid">
        {report.areas.map((area) => (
          <Phase0AreaCard key={area.id} area={area} />
        ))}
      </div>
    </section>
  );
}

function Phase0AreaCard({ area }: { area: Phase0AreaStatus }) {
  return (
    <Card>
      <div className="status-row">
        <h2>{area.label}</h2>
        <StatusBadge tone={statusTone[area.status]}>{area.status.replaceAll("_", " ")}</StatusBadge>
      </div>
      <ProgressBar value={area.completedChecks} max={area.totalChecks} label={`${area.label} evidence checks`} />
      <p className="supporting">{area.percentComplete}% complete from repository/catalog evidence.</p>
      {area.blockers.length > 0 ? (
        <Alert title="Blocked" tone="warning">
          {area.blockers[0]}
        </Alert>
      ) : null}
      <details>
        <summary>Evidence checks</summary>
        <ul className="review-list">
          {area.evidence.map((item) => (
            <li key={item.id}>
              <span>{item.label}</span>
              <strong>{item.passed ? "pass" : "missing"}</strong>
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}
