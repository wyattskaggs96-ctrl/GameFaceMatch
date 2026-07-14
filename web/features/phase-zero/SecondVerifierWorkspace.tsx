"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, SelectField, StatusBadge, TextField } from "@/components/design-system";
import {
  addSecondVerifierRecordCheck,
  acknowledgeDiscrepancyResolution,
  applySecondaryAngleSampleToWorkspace,
  createDeterministicSecondaryAngleSample,
  createEmptySecondVerifierWorkspace,
  createSecondVerifierCountCheck,
  createSecondVerifierRecordCheck,
  exportDiscrepancyResolutionRecords,
  exportSecondPersonVerificationRecords,
  getAllowedSecondVerifierStatuses,
  linkDiscrepancyResolutionEvidence,
  openDiscrepancyResolutionWorkflow,
  recordDiscrepancyFinalResolution,
  signOffSecondVerifierWorkspace,
  upsertDiscrepancyResolutionWorkflow,
  validateSecondVerifierWorkspace,
  type Phase0DiscrepancyResolutionWorkflow,
  type Phase0VerifierCheckStatus
} from "@/lib/phase-zero/phase-zero-second-verifier-workspace";
import type { Phase0ApprovedVerificationStatus, Phase0ResolutionAction } from "@/lib/phase-zero/phase-zero-verification";
import type { Phase0VerificationState } from "@/lib/phase-zero/phase-zero-domain";
import {
  validateSecondVerifierAssignmentPackage,
  validateSecondVerifierResultsImport,
  type Phase0VerifierResultsImportReport
} from "@/lib/phase-zero/phase-zero-verifier-package";

interface RecordDraft {
  recordID: string;
  stableInternalID: string;
  primaryObserverID: string;
  primarySummary: string;
  verifierObserverID: string;
  verifierSummary: string;
  evidenceIDs: string;
  nativeOrderStatus: Phase0VerifierCheckStatus;
  recordFieldsStatus: Phase0VerifierCheckStatus;
  evidenceFilesStatus: Phase0VerifierCheckStatus;
  frontViewStatus: Phase0VerifierCheckStatus;
  secondaryAngleStatus: Phase0VerifierCheckStatus;
  dependencyStatus: Phase0VerifierCheckStatus;
  exceptionStatus: Phase0VerifierCheckStatus;
  randomizationMethod: string;
  finalDisposition: Phase0ApprovedVerificationStatus;
  notes: string;
}

const now = () => new Date().toISOString();
const checkStatuses: Phase0VerifierCheckStatus[] = ["confirmed", "mismatch", "notChecked", "notApplicable"];
const allowedStatuses = getAllowedSecondVerifierStatuses();
const defaultEligibleCatalogIDs = [
  "CF27_TESTONLY_SECOND_HEAD_001,head",
  "CF27_TESTONLY_SECOND_HEAD_002,head",
  "CF27_TESTONLY_SECOND_HEAD_003,head",
  "CF27_TESTONLY_SECOND_HEAD_004,head",
  "CF27_TESTONLY_SECOND_HAIR_001,hairstyle",
  "CF27_TESTONLY_SECOND_HAIR_002,hairstyle",
  "CF27_TESTONLY_SECOND_HAIR_003,hairstyle",
  "CF27_TESTONLY_SECOND_HAIR_004,hairstyle"
].join("\n");

const initialDraft: RecordDraft = {
  recordID: "second-review-record-synthetic",
  stableInternalID: "CF27_TESTONLY_SECOND_REVIEW_RECORD",
  primaryObserverID: "primary-researcher-synthetic",
  primarySummary: "Primary observation summary from the first review record.",
  verifierObserverID: "second-verifier-synthetic",
  verifierSummary: "Independent verifier observation from retained evidence or live re-walk.",
  evidenceIDs: "evidence-front-synthetic,evidence-angle-synthetic",
  nativeOrderStatus: "confirmed",
  recordFieldsStatus: "confirmed",
  evidenceFilesStatus: "confirmed",
  frontViewStatus: "confirmed",
  secondaryAngleStatus: "confirmed",
  dependencyStatus: "notApplicable",
  exceptionStatus: "notApplicable",
  randomizationMethod: "Synthetic deterministic secondary-angle sampling list.",
  finalDisposition: "VERIFIED",
  notes: "Synthetic second-review note for workflow structure only."
};

export function SecondVerifierWorkspace() {
  const [workspace, setWorkspace] = useState(() => {
    const createdAt = now();
    return createEmptySecondVerifierWorkspace({
      workspaceID: "phase-zero-local-second-verifier-workspace",
      verifierID: "second-verifier-synthetic",
      nowISO: createdAt
    });
  });
  const [draft, setDraft] = useState<RecordDraft>(initialDraft);
  const [menuLabel, setMenuLabel] = useState("Head menu count");
  const [menuPrimaryCount, setMenuPrimaryCount] = useState("0");
  const [menuVerifierCount, setMenuVerifierCount] = useState("0");
  const [catalogLabel, setCatalogLabel] = useState("Head catalog count");
  const [catalogPrimaryCount, setCatalogPrimaryCount] = useState("0");
  const [catalogVerifierCount, setCatalogVerifierCount] = useState("0");
  const [catalogVersion, setCatalogVersion] = useState("catalog-version-synthetic");
  const [eligibleCatalogIDs, setEligibleCatalogIDs] = useState(defaultEligibleCatalogIDs);
  const [signOffNotes, setSignOffNotes] = useState("");
  const [directEvidenceIDs, setDirectEvidenceIDs] = useState("new-direct-evidence-synthetic");
  const [recaptureFileIDs, setRecaptureFileIDs] = useState("recapture-front-synthetic");
  const [supersededEvidenceIDs, setSupersededEvidenceIDs] = useState("superseded-original-evidence-synthetic");
  const [finalResolution, setFinalResolution] = useState("Document how new direct evidence resolved the disagreement without averaging observations.");
  const [resolutionAction, setResolutionAction] = useState<Phase0ResolutionAction>("recaptureEvidence");
  const [resolutionDisposition, setResolutionDisposition] = useState<Phase0ApprovedVerificationStatus>("VERIFIED_WITH_NOTES");
  const [resolutionState, setResolutionState] = useState<Phase0VerificationState>("verified");
  const [assignmentPackageText, setAssignmentPackageText] = useState("");
  const [verifierResultsText, setVerifierResultsText] = useState("");
  const [verifierImportReport, setVerifierImportReport] = useState<Phase0VerifierResultsImportReport | null>(null);
  const validation = useMemo(() => validateSecondVerifierWorkspace(workspace), [workspace]);
  const exportedRecords = useMemo(() => exportSecondPersonVerificationRecords(workspace), [workspace]);
  const exportedDiscrepancies = useMemo(() => exportDiscrepancyResolutionRecords(workspace), [workspace]);

  function updateDraft<Key extends keyof RecordDraft>(key: Key, value: RecordDraft[Key]) {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
  }

  function addMenuCountCheck() {
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      updatedAt: now(),
      menuCountChecks: [
        ...currentWorkspace.menuCountChecks,
        createSecondVerifierCountCheck({
          checkID: `menu-count-${currentWorkspace.menuCountChecks.length + 1}`,
          label: menuLabel,
          primaryCount: Number(menuPrimaryCount),
          verifierCount: Number(menuVerifierCount),
          notes: "Entered by second-verifier workspace."
        })
      ],
      signedOffAt: null,
      signOffVerifierID: null,
      signOffNotes: ""
    }));
  }

  function addCatalogCountCheck() {
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      updatedAt: now(),
      catalogCountChecks: [
        ...currentWorkspace.catalogCountChecks,
        createSecondVerifierCountCheck({
          checkID: `catalog-count-${currentWorkspace.catalogCountChecks.length + 1}`,
          label: catalogLabel,
          primaryCount: Number(catalogPrimaryCount),
          verifierCount: Number(catalogVerifierCount),
          notes: "Entered by second-verifier workspace."
        })
      ],
      signedOffAt: null,
      signOffVerifierID: null,
      signOffNotes: ""
    }));
  }

  async function generateSecondaryAngleSample() {
    const timestamp = now();
    const sample = await createDeterministicSecondaryAngleSample({
      seed: {
        environmentID: workspace.environment.verifierEnvironmentID,
        verifierID: workspace.environment.verifierID,
        catalogVersion
      },
      eligibleRecords: parseEligibleCatalogIDs(eligibleCatalogIDs)
    });
    setWorkspace((currentWorkspace) => applySecondaryAngleSampleToWorkspace({
      workspace: currentWorkspace,
      sample,
      updatedAt: timestamp
    }));
    setDraft((currentDraft) => ({
      ...currentDraft,
      randomizationMethod: `${sample.methodID}; seed=${sample.seedInput}`
    }));
  }

  function addRecordCheck() {
    const timestamp = now();
    const recordCheck = createSecondVerifierRecordCheck({
      recordID: draft.recordID,
      stableInternalID: draft.stableInternalID,
      primaryObserverID: draft.primaryObserverID,
      primarySummary: draft.primarySummary,
      verifierObserverID: draft.verifierObserverID,
      verifierSummary: draft.verifierSummary,
      evidenceIDs: splitList(draft.evidenceIDs),
      observedAt: timestamp,
      statuses: {
        nativeOrderStatus: draft.nativeOrderStatus,
        recordFieldsStatus: draft.recordFieldsStatus,
        evidenceFilesStatus: draft.evidenceFilesStatus,
        frontViewStatus: draft.frontViewStatus,
        secondaryAngleStatus: draft.secondaryAngleStatus,
        dependencyStatus: draft.dependencyStatus,
        exceptionStatus: draft.exceptionStatus
      },
      randomizationMethod: draft.randomizationMethod,
      finalDisposition: draft.finalDisposition,
      notes: draft.notes,
      primaryAcknowledgedAt: timestamp,
      verifierAcknowledgedAt: timestamp
    });
    setWorkspace((currentWorkspace) => addSecondVerifierRecordCheck(currentWorkspace, recordCheck, timestamp));
  }

  function signOff() {
    const timestamp = now();
    setWorkspace((currentWorkspace) =>
      signOffSecondVerifierWorkspace({
        workspace: currentWorkspace,
        verifierID: currentWorkspace.environment.verifierID,
        notes: signOffNotes || "Second-verifier local sign-off.",
        signedOffAt: timestamp
      })
    );
  }

  function openFirstMismatchDiscrepancy() {
    const mismatch = workspace.mismatchReports[0];
    if (!mismatch) return;
    const timestamp = now();
    setWorkspace((currentWorkspace) => openDiscrepancyResolutionWorkflow({
      workspace: currentWorkspace,
      mismatchID: mismatch.mismatchID,
      openedBy: currentWorkspace.environment.verifierID || "catalog-manager-synthetic",
      openedAt: timestamp
    }));
  }

  function updateWorkflow(workflow: Phase0DiscrepancyResolutionWorkflow) {
    setWorkspace((currentWorkspace) => upsertDiscrepancyResolutionWorkflow({
      workspace: currentWorkspace,
      workflow,
      updatedAt: now()
    }));
  }

  function attachEvidence(workflow: Phase0DiscrepancyResolutionWorkflow) {
    updateWorkflow(linkDiscrepancyResolutionEvidence({
      workflow,
      actorID: workspace.environment.verifierID || "catalog-manager-synthetic",
      occurredAt: now(),
      directEvidenceIDs: splitList(directEvidenceIDs),
      recaptureFileIDs: splitList(recaptureFileIDs),
      supersededEvidenceFileIDs: splitList(supersededEvidenceIDs)
    }));
  }

  function recordResolution(workflow: Phase0DiscrepancyResolutionWorkflow) {
    updateWorkflow(recordDiscrepancyFinalResolution({
      workflow,
      actorID: workspace.environment.verifierID || "catalog-manager-synthetic",
      occurredAt: now(),
      resolutionAction,
      finalResolution,
      finalDisposition: resolutionDisposition,
      verificationState: resolutionState
    }));
  }

  function acknowledge(workflow: Phase0DiscrepancyResolutionWorkflow, party: "primary" | "verifier") {
    updateWorkflow(acknowledgeDiscrepancyResolution({
      workflow,
      party,
      actorID: party === "primary" ? workflow.primaryObservation.observerID : workflow.verifierObservation.observerID,
      occurredAt: now()
    }));
  }

  function importVerifierResults() {
    try {
      const assignment = JSON.parse(assignmentPackageText);
      setVerifierImportReport(validateSecondVerifierResultsImport(verifierResultsText, assignment));
    } catch {
      const assignmentReport = validateSecondVerifierAssignmentPackage(null);
      setVerifierImportReport({
        ...assignmentReport,
        ok: false,
        importable: false,
        rowCount: 0,
        rows: [],
        errors: [
          ...assignmentReport.errors,
          { code: "invalidAssignmentJSON", message: "Assignment package JSON could not be parsed." }
        ]
      });
    }
  }

  async function readAssignmentFile(file: File | undefined) {
    if (!file) return;
    setAssignmentPackageText(await file.text());
    setVerifierImportReport(null);
  }

  async function readResultsFile(file: File | undefined) {
    if (!file) return;
    setVerifierResultsText(await file.text());
    setVerifierImportReport(null);
  }

  return (
    <section className="screen-stack" aria-labelledby="second-verifier-title">
      <div className="status-row">
        <div>
          <p className="eyebrow">Internal verification tool</p>
          <h2 id="second-verifier-title">Second-verifier workspace</h2>
        </div>
        <StatusBadge tone={validation.signOffReady ? "success" : "danger"}>
          {validation.signOffReady ? "sign-off ready" : "verification blocked"}
        </StatusBadge>
      </div>
      <p className="supporting">
        Record an independent verifier environment, menu counts, catalog counts, record checks, evidence checks, secondary-angle sampling, mismatch
        reports, and sign-off. Primary and verifier observations stay visually separated.
      </p>
      <Alert title="Independent review required" tone="warning">
        The second verifier must re-check evidence or the live menu path and cannot simply reuse the primary researcher identity or conclusions.
      </Alert>

      <div className="card-grid">
        <Card>
          <h3>Verifier environment</h3>
          <div className="form-stack">
            <TextField label="Verifier ID" value={workspace.environment.verifierID} onChange={(event) => updateEnvironment("verifierID", event.currentTarget.value)} />
            <TextField label="Platform" value={workspace.environment.platform} onChange={(event) => updateEnvironment("platform", event.currentTarget.value)} />
            <TextField label="Game version" value={workspace.environment.gameVersion} onChange={(event) => updateEnvironment("gameVersion", event.currentTarget.value)} />
            <TextField label="Patch version" value={workspace.environment.patchVersion} onChange={(event) => updateEnvironment("patchVersion", event.currentTarget.value)} />
            <TextField label="Mode" value={workspace.environment.gameMode} onChange={(event) => updateEnvironment("gameMode", event.currentTarget.value)} />
            <TextField label="Creation path" value={workspace.environment.creationPath} onChange={(event) => updateEnvironment("creationPath", event.currentTarget.value)} />
            <TextField label="Environment evidence IDs" value={workspace.environment.evidenceFileIDs.join(",")} onChange={(event) => updateEnvironmentEvidence(event.currentTarget.value)} />
          </div>
        </Card>
        <Card>
          <h3>Independent counts</h3>
          <div className="form-stack">
            <TextField label="Menu count label" value={menuLabel} onChange={(event) => setMenuLabel(event.currentTarget.value)} />
            <TextField label="Primary menu count" inputMode="numeric" value={menuPrimaryCount} onChange={(event) => setMenuPrimaryCount(event.currentTarget.value)} />
            <TextField label="Verifier menu count" inputMode="numeric" value={menuVerifierCount} onChange={(event) => setMenuVerifierCount(event.currentTarget.value)} />
            <Button variant="secondary" onClick={addMenuCountCheck}>Add menu count</Button>
            <TextField label="Catalog count label" value={catalogLabel} onChange={(event) => setCatalogLabel(event.currentTarget.value)} />
            <TextField label="Primary catalog count" inputMode="numeric" value={catalogPrimaryCount} onChange={(event) => setCatalogPrimaryCount(event.currentTarget.value)} />
            <TextField label="Verifier catalog count" inputMode="numeric" value={catalogVerifierCount} onChange={(event) => setCatalogVerifierCount(event.currentTarget.value)} />
            <Button variant="secondary" onClick={addCatalogCountCheck}>Add catalog count</Button>
          </div>
        </Card>
        <Card>
          <h3>Deterministic secondary-angle sample</h3>
          <p className="supporting">
            The sample uses environment ID + verifier ID + catalog version, hashed with each eligible catalog ID, then selects the first quartile per category.
          </p>
          <div className="form-stack">
            <TextField label="Catalog version" value={catalogVersion} onChange={(event) => setCatalogVersion(event.currentTarget.value)} />
            <label className="form-field" htmlFor="second-verifier-eligible-ids">
              <span>Eligible catalog IDs and categories</span>
              <textarea
                id="second-verifier-eligible-ids"
                rows={8}
                value={eligibleCatalogIDs}
                onChange={(event) => setEligibleCatalogIDs(event.currentTarget.value)}
              />
              <span className="field-note">One record per line: stableInternalID,category. Use only audit records backed by evidence.</span>
            </label>
            <Button variant="secondary" onClick={() => void generateSecondaryAngleSample()}>Generate sample</Button>
          </div>
        </Card>
        <Card tone={validation.signOffReady ? "success" : "danger"}>
          <h3>Verification summary</h3>
          <dl className="metadata-list">
            <div><dt>Records checked</dt><dd>{validation.summary.independentlyCheckedRecords}/{validation.summary.recordCount}</dd></div>
            <div><dt>Count mismatches</dt><dd>{validation.summary.countMismatches}</dd></div>
            <div><dt>Record mismatches</dt><dd>{validation.summary.recordMismatches}</dd></div>
            <div><dt>Evidence failures</dt><dd>{validation.summary.evidenceFailures}</dd></div>
            <div><dt>Front-view failures</dt><dd>{validation.summary.frontViewFailures}</dd></div>
            <div><dt>Secondary-angle failures</dt><dd>{validation.summary.secondaryAngleFailures}</dd></div>
          </dl>
        </Card>
      </div>

      {workspace.secondaryAngleSample ? (
        <Card>
          <h3>Secondary-angle sample report</h3>
          <dl className="metadata-list">
            <div><dt>Method</dt><dd>{workspace.secondaryAngleSample.methodID}</dd></div>
            <div><dt>Seed input</dt><dd>{workspace.secondaryAngleSample.seedInput}</dd></div>
            <div><dt>Selected</dt><dd>{workspace.secondaryAngleSample.selectedCount}/{workspace.secondaryAngleSample.eligibleCount}</dd></div>
          </dl>
          <pre className="code-block" aria-label="Deterministic secondary-angle sample report">
            {workspace.secondaryAngleSample.humanReadableReport}
          </pre>
        </Card>
      ) : null}

      <Card tone={verifierImportReport?.importable ? "success" : verifierImportReport ? "warning" : "neutral"}>
        <h3>Import verifier results</h3>
        <p className="supporting">
          Import a verifier assignment JSON and completed CSV results for validation. This only checks the package locally; it does not assign VERIFIED
          status, publish records, or enable recommendations.
        </p>
        <div className="form-grid">
          <label className="form-field" htmlFor="second-verifier-assignment-file">
            <span>Verifier assignment JSON</span>
            <input
              className="file-input"
              id="second-verifier-assignment-file"
              type="file"
              accept="application/json,.json"
              onChange={(event) => void readAssignmentFile(event.currentTarget.files?.[0])}
            />
          </label>
          <label className="form-field" htmlFor="second-verifier-results-file">
            <span>Verifier results CSV</span>
            <input
              className="file-input"
              id="second-verifier-results-file"
              type="file"
              accept="text/csv,.csv"
              onChange={(event) => void readResultsFile(event.currentTarget.files?.[0])}
            />
          </label>
        </div>
        <div className="button-row">
          <Button variant="secondary" onClick={importVerifierResults} disabled={!assignmentPackageText || !verifierResultsText}>
            Validate import
          </Button>
        </div>
        {verifierImportReport ? (
          <div className="stack" aria-live="polite">
            <dl className="metadata-list">
              <div><dt>Rows</dt><dd>{verifierImportReport.rowCount}</dd></div>
              <div><dt>Importable</dt><dd>{verifierImportReport.importable ? "yes" : "no"}</dd></div>
              <div><dt>Errors</dt><dd>{verifierImportReport.errors.length}</dd></div>
              <div><dt>Warnings</dt><dd>{verifierImportReport.warnings.length}</dd></div>
            </dl>
            {verifierImportReport.errors.length > 0 ? (
              <Alert title="Import blocked" tone="danger">
                <ul className="compact-list">
                  {verifierImportReport.errors.slice(0, 6).map((error, index) => (
                    <li key={`${error.code}-${index}`}>{error.message}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}
            {verifierImportReport.warnings.length > 0 ? (
              <Alert title="Import warnings" tone="warning">
                <ul className="compact-list">
                  {verifierImportReport.warnings.slice(0, 6).map((warning, index) => (
                    <li key={`${warning.code}-${index}`}>{warning.message}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card>
        <h3>Record-by-record verification</h3>
        <div className="form-grid">
          <TextField label="Record ID" value={draft.recordID} onChange={(event) => updateDraft("recordID", event.currentTarget.value)} />
          <TextField label="Stable internal ID" value={draft.stableInternalID} onChange={(event) => updateDraft("stableInternalID", event.currentTarget.value)} />
        </div>
        <div className="verifier-comparison-grid" aria-label="Primary and verifier observations">
          <div className="verifier-observation verifier-observation-primary">
            <h4>Primary researcher observation</h4>
            <TextField label="Primary observer ID" value={draft.primaryObserverID} onChange={(event) => updateDraft("primaryObserverID", event.currentTarget.value)} />
            <label className="form-field" htmlFor="second-verifier-primary-summary">
              <span>Primary summary</span>
              <textarea id="second-verifier-primary-summary" rows={4} value={draft.primarySummary} onChange={(event) => updateDraft("primarySummary", event.currentTarget.value)} />
            </label>
          </div>
          <div className="verifier-observation verifier-observation-second">
            <h4>Second-verifier observation</h4>
            <TextField label="Verifier observer ID" value={draft.verifierObserverID} onChange={(event) => updateDraft("verifierObserverID", event.currentTarget.value)} />
            <label className="form-field" htmlFor="second-verifier-summary">
              <span>Verifier summary</span>
              <textarea id="second-verifier-summary" rows={4} value={draft.verifierSummary} onChange={(event) => updateDraft("verifierSummary", event.currentTarget.value)} />
            </label>
          </div>
        </div>
        <div className="form-grid">
          <TextField label="Evidence IDs" value={draft.evidenceIDs} onChange={(event) => updateDraft("evidenceIDs", event.currentTarget.value)} />
          <TextField label="Secondary-angle sampling method" value={draft.randomizationMethod} onChange={(event) => updateDraft("randomizationMethod", event.currentTarget.value)} />
          <VerifierStatusField label="Native order" value={draft.nativeOrderStatus} onChange={(value) => updateDraft("nativeOrderStatus", value)} />
          <VerifierStatusField label="Record fields" value={draft.recordFieldsStatus} onChange={(value) => updateDraft("recordFieldsStatus", value)} />
          <VerifierStatusField label="Evidence files" value={draft.evidenceFilesStatus} onChange={(value) => updateDraft("evidenceFilesStatus", value)} />
          <VerifierStatusField label="Front view" value={draft.frontViewStatus} onChange={(value) => updateDraft("frontViewStatus", value)} />
          <VerifierStatusField label="Secondary angle sample" value={draft.secondaryAngleStatus} onChange={(value) => updateDraft("secondaryAngleStatus", value)} />
          <VerifierStatusField label="Dependency review" value={draft.dependencyStatus} onChange={(value) => updateDraft("dependencyStatus", value)} />
          <VerifierStatusField label="Exception review" value={draft.exceptionStatus} onChange={(value) => updateDraft("exceptionStatus", value)} />
          <SelectField label="Final disposition" value={draft.finalDisposition} onChange={(event) => updateDraft("finalDisposition", event.currentTarget.value as Phase0ApprovedVerificationStatus)}>
            {allowedStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </SelectField>
        </div>
        <label className="form-field" htmlFor="second-verifier-notes">
          <span>Record notes</span>
          <textarea id="second-verifier-notes" rows={3} value={draft.notes} onChange={(event) => updateDraft("notes", event.currentTarget.value)} />
        </label>
        <Button onClick={addRecordCheck}>Add or replace record check</Button>
      </Card>

      <div className="result-grid">
        <Card tone={validation.errors.length > 0 ? "danger" : "success"}>
          <h3>Validation</h3>
          {validation.errors.length === 0 ? (
            <p className="supporting">Second-verifier workspace is structurally valid.</p>
          ) : (
            <ul className="compact-list">
              {validation.errors.slice(0, 8).map((error, index) => <li key={`${error.code}-${error.entityID ?? error.message}-${index}`}>{error.message}</li>)}
            </ul>
          )}
        </Card>
        <Card tone={workspace.mismatchReports.length > 0 ? "danger" : "success"}>
          <h3>Mismatch reports</h3>
          {workspace.mismatchReports.length === 0 ? (
            <p className="supporting">No mismatch reports from current record checks.</p>
          ) : (
            <ul className="compact-list">
              {workspace.mismatchReports.slice(0, 8).map((report) => (
                <li key={report.mismatchID}>{report.stableInternalID}: {report.kind} · {report.notes}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card tone={workspace.discrepancyWorkflows.length > 0 ? "warning" : "neutral"}>
        <h3>Discrepancy resolution</h3>
        <p className="supporting">
          Disagreements keep both observations intact, require new direct evidence and recapture links, preserve superseded evidence, and need both-party acknowledgment.
        </p>
        <Button variant="secondary" onClick={openFirstMismatchDiscrepancy} disabled={workspace.mismatchReports.length === 0}>
          Open first mismatch discrepancy
        </Button>
        <div className="form-grid">
          <TextField label="New direct evidence IDs" value={directEvidenceIDs} onChange={(event) => setDirectEvidenceIDs(event.currentTarget.value)} />
          <TextField label="Recapture file IDs" value={recaptureFileIDs} onChange={(event) => setRecaptureFileIDs(event.currentTarget.value)} />
          <TextField label="Superseded evidence IDs" value={supersededEvidenceIDs} onChange={(event) => setSupersededEvidenceIDs(event.currentTarget.value)} />
          <SelectField label="Resolution action" value={resolutionAction} onChange={(event) => setResolutionAction(event.currentTarget.value as Phase0ResolutionAction)}>
            {["acceptPrimaryObservation", "acceptVerifierObservation", "recaptureEvidence", "splitByVersion", "correctDraftRecord", "markNotVerified", "holdForResearch", "retireRecord"].map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </SelectField>
          <SelectField label="Final disposition" value={resolutionDisposition} onChange={(event) => setResolutionDisposition(event.currentTarget.value as Phase0ApprovedVerificationStatus)}>
            {allowedStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </SelectField>
          <SelectField label="Verification state" value={resolutionState} onChange={(event) => setResolutionState(event.currentTarget.value as Phase0VerificationState)}>
            {["secondReviewPending", "verified", "rejected", "retired"].map((state) => <option key={state} value={state}>{state}</option>)}
          </SelectField>
        </div>
        <label className="form-field" htmlFor="second-verifier-final-resolution">
          <span>Final resolution</span>
          <textarea id="second-verifier-final-resolution" rows={3} value={finalResolution} onChange={(event) => setFinalResolution(event.currentTarget.value)} />
        </label>
        {workspace.discrepancyWorkflows.length === 0 ? (
          <p className="supporting">No discrepancy workflows have been opened from mismatch reports.</p>
        ) : (
          <div className="stack">
            {workspace.discrepancyWorkflows.map((workflow) => (
              <Card key={workflow.workflowID} tone={workflow.status === "acknowledged" ? "success" : "warning"}>
                <h4>{workflow.affectedStableInternalIDs.join(", ")}</h4>
                <dl className="metadata-list">
                  <div><dt>Status</dt><dd>{workflow.status}</dd></div>
                  <div><dt>Type</dt><dd>{workflow.discrepancyType}</dd></div>
                  <div><dt>New evidence</dt><dd>{workflow.requiredDirectEvidenceIDs.length}</dd></div>
                  <div><dt>Recaptures</dt><dd>{workflow.linkedRecaptureFileIDs.length}</dd></div>
                  <div><dt>Superseded evidence</dt><dd>{workflow.supersededEvidenceFileIDs.length}</dd></div>
                  <div><dt>Audit events</dt><dd>{workflow.auditHistory.length}</dd></div>
                </dl>
                <div className="verifier-comparison-grid">
                  <div className="verifier-observation verifier-observation-primary">
                    <h5>Primary observation</h5>
                    <p>{workflow.primaryObservation.summary}</p>
                  </div>
                  <div className="verifier-observation verifier-observation-second">
                    <h5>Verifier observation</h5>
                    <p>{workflow.verifierObservation.summary}</p>
                  </div>
                </div>
                <div className="button-row">
                  <Button variant="secondary" onClick={() => attachEvidence(workflow)}>Link evidence</Button>
                  <Button variant="secondary" onClick={() => recordResolution(workflow)}>Record resolution</Button>
                  <Button variant="secondary" onClick={() => acknowledge(workflow, "primary")}>Primary acknowledge</Button>
                  <Button variant="secondary" onClick={() => acknowledge(workflow, "verifier")}>Verifier acknowledge</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
        <p className="supporting">Exported discrepancy-resolution records: {exportedDiscrepancies.length}.</p>
      </Card>

      <Card tone={validation.signOffReady ? "success" : "warning"}>
        <h3>Sign-off and export</h3>
        <label className="form-field" htmlFor="second-verifier-signoff-notes">
          <span>Sign-off notes</span>
          <textarea id="second-verifier-signoff-notes" rows={3} value={signOffNotes} onChange={(event) => setSignOffNotes(event.currentTarget.value)} />
        </label>
        <Button onClick={signOff} disabled={!validation.signOffReady}>Sign off second verification</Button>
        <p className="supporting">
          Exported second-person verification records: {exportedRecords.length}. These records still require catalog-manager review and package validation.
        </p>
        {workspace.signedOffAt ? (
          <Alert title="Signed off" tone="success">
            {workspace.signOffVerifierID} signed off at {workspace.signedOffAt}.
          </Alert>
        ) : null}
      </Card>
    </section>
  );

  function updateEnvironment<Key extends keyof typeof workspace.environment>(key: Key, value: (typeof workspace.environment)[Key]) {
    const timestamp = now();
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      updatedAt: timestamp,
      environment: {
        ...currentWorkspace.environment,
        [key]: value,
        observedAt: timestamp
      },
      signedOffAt: null,
      signOffVerifierID: null,
      signOffNotes: ""
    }));
  }

  function updateEnvironmentEvidence(value: string) {
    updateEnvironment("evidenceFileIDs", splitList(value));
  }
}

function VerifierStatusField({
  label,
  value,
  onChange
}: {
  label: string;
  value: Phase0VerifierCheckStatus;
  onChange: (value: Phase0VerifierCheckStatus) => void;
}) {
  return (
    <SelectField label={label} value={value} onChange={(event) => onChange(event.currentTarget.value as Phase0VerifierCheckStatus)}>
      {checkStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
    </SelectField>
  );
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function parseEligibleCatalogIDs(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [stableInternalID, category = "uncategorized"] = line.split(",").map((item) => item.trim());
      return { stableInternalID, category };
    });
}
