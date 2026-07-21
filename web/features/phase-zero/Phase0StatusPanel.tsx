"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Card, ProgressBar, ScreenHeader, StatusBadge } from "@/components/design-system";
import { createPhase0AuditDashboardReport, type Phase0AuditDashboardReport } from "@/lib/phase-zero/phase-zero-audit-dashboard";
import {
  createPhase0CompletionDashboard,
  type Phase0EvidenceCaptureAssignment,
  type Phase0EvidenceCoverageControlCenter,
  type Phase0CompletionCategoryProgress,
  type Phase0CompletionDashboardReport
} from "@/lib/phase-zero/phase-zero-completion-dashboard";
import { createEmptyIssueRegister } from "@/lib/phase-zero/phase-zero-issue-management";
import { createPhase0StatusReport, type Phase0AreaStatus, type Phase0StatusReport } from "@/lib/phase-zero/phase-zero-status";
import { AdditionalAttributesWorkspace } from "./AdditionalAttributesWorkspace";
import { CatalogAnnotationWorkspace } from "./CatalogAnnotationWorkspace";
import { CatalogManagerReviewConsole } from "./CatalogManagerReviewConsole";
import { CaptureConfigurationEditor } from "./CaptureConfigurationEditor";
import { CaptureConsistencyQA } from "./CaptureConsistencyQA";
import { CreationPathAuditWorkspace } from "./CreationPathAuditWorkspace";
import { DependencyTestRunner } from "./DependencyTestRunner";
import { DuplicateReviewTool } from "./DuplicateReviewTool";
import { EvidenceIntakeManager } from "./EvidenceIntakeManager";
import { EnvironmentManifestWizard } from "./EnvironmentManifestWizard";
import { FacialHairCaptureWorkspace } from "./FacialHairCaptureWorkspace";
import { HairstyleCaptureWorkspace } from "./HairstyleCaptureWorkspace";
import { HeadCaptureWorkspace } from "./HeadCaptureWorkspace";
import { ImageDerivativeTool } from "./ImageDerivativeTool";
import { IssueManagementWorkspace } from "./IssueManagementWorkspace";
import { MenuMapEditor } from "./MenuMapEditor";
import { RequiredViewCompletenessChecker } from "./RequiredViewCompletenessChecker";
import { SecondVerifierWorkspace } from "./SecondVerifierWorkspace";
import { SourceVideoIntakeManager } from "./SourceVideoIntakeManager";

const statusTone = {
  NOT_STARTED: "neutral",
  IN_PROGRESS: "info",
  READY_WITH_LIMITATIONS: "warning",
  BLOCKED: "danger",
  COMPLETE: "success"
} as const;

export function Phase0StatusPanel({
  report = createPhase0StatusReport(),
  dashboard,
  completionDashboard
}: {
  report?: Phase0StatusReport;
  dashboard?: Phase0AuditDashboardReport;
  completionDashboard?: Phase0CompletionDashboardReport;
}) {
  const [issueRegister, setIssueRegister] = useState(() =>
    createEmptyIssueRegister({
      registerID: "phase-zero-local-issue-register",
      nowISO: new Date().toISOString()
    })
  );
  const [liveCompletionDashboard, setLiveCompletionDashboard] = useState<Phase0CompletionDashboardReport | null>(null);
  const [completionDashboardError, setCompletionDashboardError] = useState<string | null>(null);
  const activeDashboard = useMemo(
    () => dashboard ?? createPhase0AuditDashboardReport({
      phase0Report: report,
      productionMode: process.env.NODE_ENV === "production",
      issueRegister
    }),
    [dashboard, issueRegister, report]
  );
  const activeCompletionDashboard = useMemo(
    () => completionDashboard ?? liveCompletionDashboard ?? createPhase0CompletionDashboard(),
    [completionDashboard, liveCompletionDashboard]
  );

  useEffect(() => {
    if (completionDashboard || process.env.NODE_ENV === "production") return;
    let isActive = true;
    fetch("/api/internal/phase-zero-completion", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`Phase 0 completion endpoint returned ${response.status}`);
        return response.json() as Promise<Phase0CompletionDashboardReport>;
      })
      .then((nextDashboard) => {
        if (!isActive) return;
        setLiveCompletionDashboard(nextDashboard);
        setCompletionDashboardError(null);
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setCompletionDashboardError(error instanceof Error ? error.message : "Unable to load Phase 0 completion data.");
      });
    return () => {
      isActive = false;
    };
  }, [completionDashboard]);

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
      <Phase0CompletionDashboard dashboard={activeCompletionDashboard} loadError={completionDashboardError} />
      <EnvironmentManifestWizard />
      <CreationPathAuditWorkspace />
      <EvidenceIntakeManager />
      <SourceVideoIntakeManager />
      <ImageDerivativeTool />
      <CaptureConsistencyQA />
      <RequiredViewCompletenessChecker />
      <DuplicateReviewTool />
      <CatalogAnnotationWorkspace />
      <CatalogManagerReviewConsole />
      <SecondVerifierWorkspace />
      <MenuMapEditor />
      <CaptureConfigurationEditor />
      <HeadCaptureWorkspace />
      <HairstyleCaptureWorkspace />
      <FacialHairCaptureWorkspace />
      <AdditionalAttributesWorkspace />
      <DependencyTestRunner />
      <IssueManagementWorkspace issueRegister={issueRegister} onIssueRegisterChange={setIssueRegister} />
      <Phase0AuditDashboard dashboard={activeDashboard} />
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

function Phase0CompletionDashboard({ dashboard, loadError }: { dashboard: Phase0CompletionDashboardReport; loadError: string | null }) {
  return (
    <section className="screen-stack" aria-labelledby="phase-zero-completion-dashboard-title">
      <Alert title="Live Phase 0 completion dashboard" tone={dashboard.productionReadiness.status === "ready" ? "success" : "danger"}>
        {dashboard.productionReadiness.reason}
      </Alert>
      {loadError ? (
        <Alert title="Live artifact load failed" tone="warning">
          {loadError}
        </Alert>
      ) : null}
      <div className="card-grid">
        <Card>
          <h2 id="phase-zero-completion-dashboard-title">Completion summary</h2>
          <dl className="metadata-list">
            <div>
              <dt>Overall Phase 0</dt>
              <dd>{dashboard.metrics.overallPhase0CompletionPercent}%</dd>
            </div>
            <div>
              <dt>Evidence completion</dt>
              <dd>{dashboard.metrics.evidenceCompletionPercent}%</dd>
            </div>
            <div>
              <dt>Catalog completion</dt>
              <dd>{dashboard.metrics.catalogCompletionPercent}%</dd>
            </div>
            <div>
              <dt>Verification completion</dt>
              <dd>{dashboard.metrics.verificationCompletionPercent}%</dd>
            </div>
          </dl>
        </Card>
        <Card tone="warning">
          <h2>Next capture</h2>
          <p className="supporting">{dashboard.highestPriorityMissingCapture}</p>
          <h3>Human action</h3>
          <p className="supporting">{dashboard.nextRequiredHumanAction}</p>
        </Card>
        <Card>
          <h2>Next Codex action</h2>
          <p className="supporting">{dashboard.nextRecommendedCodexAction}</p>
          <p className="field-note">Generated from machine-readable Phase 0 artifacts at {dashboard.generatedAt}.</p>
        </Card>
        <Card tone="warning">
          <h2>Appearance-menu gaps</h2>
          <dl className="metadata-list">
            <div>
              <dt>Confirmed incomplete</dt>
              <dd>{dashboard.appearanceMenuGapSummary.confirmedPresentIncomplete}</dd>
            </div>
            <div>
              <dt>Complete for research</dt>
              <dd>{dashboard.appearanceMenuGapSummary.confirmedPresentCompleteForResearch}</dd>
            </div>
            <div>
              <dt>Suspected, not observed</dt>
              <dd>{dashboard.appearanceMenuGapSummary.suspectedButNotObserved}</dd>
            </div>
            <div>
              <dt>Unknown menu regions</dt>
              <dd>{dashboard.appearanceMenuGapSummary.unknownBecauseMenuNotFullyInspected}</dd>
            </div>
            <div>
              <dt>Production eligible</dt>
              <dd>{dashboard.appearanceMenuGapSummary.productionEligibleRows}</dd>
            </div>
          </dl>
        </Card>
      </div>
      {dashboard.evidenceCoverageControlCenter ? (
        <Phase0EvidenceCoverageControlCenterPanel controlCenter={dashboard.evidenceCoverageControlCenter} />
      ) : null}
      <Card>
        <div className="status-row">
          <h2>Category completion</h2>
          <StatusBadge tone={dashboard.productionReadiness.status === "ready" ? "success" : "danger"}>
            {dashboard.productionReadiness.status}
          </StatusBadge>
        </div>
        <p className="supporting">
          Research observations count only as observed or cataloged. Independent verification and production approval stay at zero until the
          machine-readable catalog artifacts prove those gates passed.
        </p>
        <div className="data-table-scroll" role="region" aria-label="Phase 0 category completion table" tabIndex={0}>
          <table className="data-table">
            <caption>Phase 0 category progress from current repository artifacts</caption>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Required</th>
                <th scope="col">Evidence</th>
                <th scope="col">Observed</th>
                <th scope="col">Cataloged</th>
                <th scope="col">QA reviewed</th>
                <th scope="col">Independently verified</th>
                <th scope="col">Production approved</th>
                <th scope="col">Recapture</th>
                <th scope="col">Blockers</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.categoryProgress.map((category) => (
                <Phase0CompletionRow key={category.id} category={category} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}

function Phase0EvidenceCoverageControlCenterPanel({ controlCenter }: { controlCenter: Phase0EvidenceCoverageControlCenter }) {
  const activeAssignments = controlCenter.captureAssignments.filter((assignment) => assignment.status !== "COMPLETE");
  return (
    <section className="screen-stack" aria-labelledby="phase-zero-coverage-title">
      <div className="card-grid">
        <Card tone={controlCenter.summary.assignmentsBlocking > 0 ? "danger" : "success"}>
          <div className="status-row">
            <h2 id="phase-zero-coverage-title">Evidence coverage control center</h2>
            <StatusBadge tone={controlCenter.summary.assignmentsBlocking > 0 ? "danger" : "success"}>
              {controlCenter.summary.assignmentsBlocking} blocking
            </StatusBadge>
          </div>
          <dl className="metadata-list">
            <div>
              <dt>Capture assignments</dt>
              <dd>{controlCenter.summary.captureAssignments}</dd>
            </div>
            <div>
              <dt>P0 assignments</dt>
              <dd>{controlCenter.summary.p0Assignments}</dd>
            </div>
            <div>
              <dt>Research candidates</dt>
              <dd>{controlCenter.summary.researchCandidates}</dd>
            </div>
            <div>
              <dt>Production records</dt>
              <dd>{controlCenter.summary.productionCatalogRecords}</dd>
            </div>
          </dl>
        </Card>
        <Card tone="warning">
          <h2>Recording order</h2>
          <ol className="compact-list">
            {controlCenter.recordingOrder.slice(0, 6).map((session) => (
              <li key={session.sessionNumber}>
                Session {session.sessionNumber}: {session.captureIDs.join(", ")} · {session.title}
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <h2>Next recordings</h2>
          <ul className="compact-list">
            {controlCenter.nextRecordingIDs.map((id) => {
              const assignment = controlCenter.captureAssignments.find((candidate) => candidate.captureID === id);
              return <li key={id}>{assignment ? `${id}: ${assignment.category} — ${assignment.subcategory}` : id}</li>;
            })}
          </ul>
        </Card>
      </div>
      <Card>
        <div className="status-row">
          <h2>Capture assignment queue</h2>
          <StatusBadge tone="warning">{activeAssignments.length} open</StatusBadge>
        </div>
        <div className="data-table-scroll" role="region" aria-label="Phase 0 capture assignment table" tabIndex={0}>
          <table className="data-table">
            <caption>Remaining Phase 0 capture assignments</caption>
            <thead>
              <tr>
                <th scope="col">Capture</th>
                <th scope="col">Category</th>
                <th scope="col">Status</th>
                <th scope="col">Start screen</th>
                <th scope="col">Filename</th>
              </tr>
            </thead>
            <tbody>
              {activeAssignments.map((assignment) => (
                <Phase0CaptureAssignmentRow key={assignment.captureID} assignment={assignment} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <div className="status-row">
          <h2>Coverage by category</h2>
          <StatusBadge tone="danger">{controlCenter.summary.categoriesProductionReady} production ready</StatusBadge>
        </div>
        <div className="data-table-scroll" role="region" aria-label="Phase 0 evidence coverage table" tabIndex={0}>
          <table className="data-table">
            <caption>Evidence coverage control-center category status</caption>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Observed</th>
                <th scope="col">Accepted evidence</th>
                <th scope="col">Incomplete</th>
                <th scope="col">Duplicate</th>
                <th scope="col">Primary reviewed</th>
                <th scope="col">Verifier ready</th>
                <th scope="col">Production approved</th>
                <th scope="col">Blocker</th>
              </tr>
            </thead>
            <tbody>
              {controlCenter.categoryCoverage.map((category) => (
                <tr key={category.categoryID}>
                  <th scope="row">
                    <span>{category.category}</span>
                    <small>{category.status}</small>
                  </th>
                  <td>{category.observedCandidateRecords}</td>
                  <td>{category.acceptedEvidence}</td>
                  <td>{category.incompleteEvidence}</td>
                  <td>{category.duplicateEvidence}</td>
                  <td>{category.primaryReviewedRecords}</td>
                  <td>{category.verifierReady ? "Yes" : "No"}</td>
                  <td>{category.productionApprovedRecords}</td>
                  <td>{category.blocker}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}

function Phase0CaptureAssignmentRow({ assignment }: { assignment: Phase0EvidenceCaptureAssignment }) {
  return (
    <tr>
      <th scope="row">
        <span>{assignment.captureID}</span>
        <small>{assignment.objective}</small>
        <small>{assignment.existingEvidenceSummary}</small>
      </th>
      <td>
        {assignment.category}
        <small>{assignment.subcategory}</small>
      </td>
      <td>
        <StatusBadge tone={assignment.priority === "P0" ? "danger" : "warning"}>{assignment.status}</StatusBadge>
      </td>
      <td>{assignment.exactStartScreen}</td>
      <td>{assignment.filenamePattern}</td>
    </tr>
  );
}

function Phase0CompletionRow({ category }: { category: Phase0CompletionCategoryProgress }) {
  return (
    <tr>
      <th scope="row">
        <span>{category.label}</span>
        <small>{category.sourceSummary}</small>
        <small>{category.nextAction}</small>
      </th>
      <td>{category.required ? "Yes" : "No"}</td>
      <td>{category.evidenceAvailable}</td>
      <td>{category.observed}</td>
      <td>{category.cataloged}</td>
      <td>{category.qaReviewed}</td>
      <td>{category.independentlyVerified}</td>
      <td>{category.productionApproved}</td>
      <td>{category.recaptureRequired}</td>
      <td>{category.blockingIssueCount}</td>
      <td>
        <StatusBadge tone={category.productionApproved > 0 ? "success" : category.blockingIssueCount > 0 ? "danger" : "warning"}>
          {category.status}
        </StatusBadge>
      </td>
    </tr>
  );
}

function Phase0AuditDashboard({ dashboard }: { dashboard: Phase0AuditDashboardReport }) {
  return (
    <>
      <Alert title="Audit dashboard" tone={dashboard.productionGateState.status === "ready" ? "success" : "danger"} role="alert">
        {dashboard.highestPriorityNextAction}
      </Alert>
      <div className="card-grid">
        <Card tone={dashboard.currentEnvironment.state === "blocked" ? "danger" : "info"}>
          <div className="status-row">
            <h2>Current environment</h2>
            <StatusBadge tone={dashboard.currentEnvironment.state === "blocked" ? "danger" : "info"}>{dashboard.currentEnvironment.state}</StatusBadge>
          </div>
          <p className="supporting">{dashboard.currentEnvironment.label}</p>
          <dl className="metadata-list">
            <div>
              <dt>Platform</dt>
              <dd>{dashboard.currentEnvironment.platform}</dd>
            </div>
            <div>
              <dt>Game version</dt>
              <dd>{dashboard.currentEnvironment.gameVersion}</dd>
            </div>
            <div>
              <dt>Patch</dt>
              <dd>{dashboard.currentEnvironment.patchVersion}</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>{dashboard.currentEnvironment.gameMode}</dd>
            </div>
            <div>
              <dt>Creation path</dt>
              <dd>{dashboard.currentEnvironment.creationPath}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2>Catalog release</h2>
          <dl className="metadata-list">
            <div>
              <dt>Data class</dt>
              <dd>{dashboard.dataClassLabel}</dd>
            </div>
            <div>
              <dt>Catalog version</dt>
              <dd>{dashboard.catalogVersion.identifier}</dd>
            </div>
            <div>
              <dt>Verified at</dt>
              <dd>{dashboard.catalogVersion.verifiedAt ?? "Not verified"}</dd>
            </div>
            <div>
              <dt>Production records</dt>
              <dd>{dashboard.catalogVersion.itemCount}</dd>
            </div>
            <div>
              <dt>Ignored non-production records</dt>
              <dd>{dashboard.ignoredNonProductionRecordCount}</dd>
            </div>
          </dl>
        </Card>
        <Card tone={dashboard.productionGateState.status === "ready" ? "success" : "danger"}>
          <div className="status-row">
            <h2>Production gate</h2>
            <StatusBadge tone={dashboard.productionGateState.status === "ready" ? "success" : "danger"}>
              {dashboard.productionGateState.status}
            </StatusBadge>
          </div>
          <ul className="compact-list">
            {dashboard.productionGateState.reasons.slice(0, 4).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="card-grid">
        <Card>
          <h2>Audit totals</h2>
          <dl className="metadata-list">
            <div>
              <dt>Counts captured</dt>
              <dd>{dashboard.progress.totalCaptured}</dd>
            </div>
            <div>
              <dt>Counts verified</dt>
              <dd>{dashboard.progress.totalVerified}</dd>
            </div>
            <div>
              <dt>Missing views</dt>
              <dd>{dashboard.progress.missingViews}</dd>
            </div>
            <div>
              <dt>Missing evidence</dt>
              <dd>{dashboard.progress.missingEvidence}</dd>
            </div>
            <div>
              <dt>Recapture requests</dt>
              <dd>{dashboard.progress.recaptureRequests}</dd>
            </div>
            <div>
              <dt>Dependency tests pending</dt>
              <dd>{dashboard.progress.dependencyTestsPending}</dd>
            </div>
            <div>
              <dt>Open audit issues</dt>
              <dd>{dashboard.progress.openIssues}</dd>
            </div>
            <div>
              <dt>Unresolved blockers</dt>
              <dd>{dashboard.progress.unresolvedBlockingIssues}</dd>
            </div>
            <div>
              <dt>Recapture queue</dt>
              <dd>{dashboard.progress.recaptureQueueCount}</dd>
            </div>
          </dl>
        </Card>
        <Card tone={dashboard.secondVerifierProgress.status === "ready" ? "success" : "danger"}>
          <div className="status-row">
            <h2>Second-verifier progress</h2>
            <StatusBadge tone={dashboard.secondVerifierProgress.status === "ready" ? "success" : "danger"}>
              {dashboard.secondVerifierProgress.status}
            </StatusBadge>
          </div>
          <ProgressBar
            value={dashboard.secondVerifierProgress.completed}
            max={dashboard.secondVerifierProgress.total}
            label="Second-verifier completion"
          />
          <p className="supporting">{dashboard.secondVerifierProgress.percentComplete}% of production records include second review.</p>
        </Card>
        <Card tone={statusTone[dashboard.manualStudyReadiness.status]}>
          <div className="status-row">
            <h2>Manual study readiness</h2>
            <StatusBadge tone={statusTone[dashboard.manualStudyReadiness.status]}>
              {dashboard.manualStudyReadiness.status.replaceAll("_", " ")}
            </StatusBadge>
          </div>
          <p className="supporting">{dashboard.manualStudyReadiness.percentComplete}% from repository/catalog evidence.</p>
        </Card>
      </div>
      <div className="result-grid">
        {dashboard.categoryProgress.map((category) => (
          <Card key={category.id} tone={category.status === "blocked" ? "danger" : "success"}>
            <div className="status-row">
              <h2>{category.label}</h2>
              <StatusBadge tone={category.status === "blocked" ? "danger" : "success"}>{category.status}</StatusBadge>
            </div>
            <ProgressBar value={category.verifiedCount} max={Math.max(category.capturedCount, 1)} label={`${category.label} verified`} />
            <dl className="metadata-list">
              <div>
                <dt>Captured</dt>
                <dd>{category.capturedCount}</dd>
              </div>
              <div>
                <dt>Verified</dt>
                <dd>{category.verifiedCount}</dd>
              </div>
              <div>
                <dt>Missing views</dt>
                <dd>{category.missingViewCount}</dd>
              </div>
              <div>
                <dt>Missing evidence</dt>
                <dd>{category.missingEvidenceCount}</dd>
              </div>
            </dl>
            {category.blocker ? (
              <Alert title="Blocked" tone="warning">
                {category.blocker}
              </Alert>
            ) : null}
            <p className="supporting">{category.nextAction}</p>
          </Card>
        ))}
      </div>
      <Card tone={dashboard.blockedStates.length > 0 ? "danger" : "success"}>
        <div className="status-row">
          <h2>Blocked states</h2>
          <StatusBadge tone={dashboard.blockedStates.length > 0 ? "danger" : "success"}>
            {dashboard.blockedStates.length > 0 ? `${dashboard.blockedStates.length} blocked` : "clear"}
          </StatusBadge>
        </div>
        {dashboard.blockedStates.length === 0 ? (
          <p className="supporting">No blocked states detected.</p>
        ) : (
          <ul className="compact-list">
            {dashboard.blockedStates.slice(0, 8).map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        )}
      </Card>
    </>
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
