"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, LoadingState, ProgressBar, SelectField, StatusBadge, TextField } from "@/components/design-system";
import {
  CF27_SUPPORTED_SUBSET_VERIFIER_LOCAL_STORAGE_KEY,
  addIntegrityHash,
  allowedVerifierStatuses,
  buildVerifierCompletionSummary,
  buildVerifierExportPackage,
  calculateVerifierProgress,
  createInitialVerifierDraft,
  getVerifierCompletionErrors,
  isRecordDecisionComplete,
  sanitizeLoadedDraft,
  verifierExportFilename,
  type DuplicateState,
  type FrontViewState,
  type SecondaryAngleState,
  type SupportedSubsetVerifierCandidate,
  type SupportedSubsetVerifierPackage,
  type TriState,
  type VerifierAttestation,
  type VerifierDraftState,
  type VerifierEnvironment,
  type VerifierMenuCount,
  type VerifierRecordDecision,
  type VerifierSecondaryAngleResult,
  type VerifierStatus
} from "@/lib/verifier/cf27-supported-subset-verifier";

type WorkflowStep = "environment" | "records" | "counts" | "limitations" | "review";

const routeTitle = "CF27 Supported-Subset Human Verification";

export function SupportedSubsetVerifierWorkflow() {
  const [pkg, setPackage] = useState<SupportedSubsetVerifierPackage | null>(null);
  const [state, setState] = useState<VerifierDraftState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [step, setStep] = useState<WorkflowStep>("environment");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/internal/cf27-supported-subset-verifier-session", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`Verifier package endpoint returned ${response.status}`);
        return response.json() as Promise<SupportedSubsetVerifierPackage>;
      })
      .then((loadedPackage) => {
        if (!active) return;
        const stored = loadStoredDraft(loadedPackage);
        setPackage(loadedPackage);
        setState(stored ?? createInitialVerifierDraft(loadedPackage));
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Unable to load the supported-subset verifier package.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    window.localStorage.setItem(CF27_SUPPORTED_SUBSET_VERIFIER_LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  if (loadError) {
    return (
      <VerifierPageShell>
        <Alert title="Verifier package unavailable" tone="danger" role="alert">{loadError}</Alert>
      </VerifierPageShell>
    );
  }

  if (!pkg || !state) {
    return (
      <VerifierPageShell>
        <LoadingState label="Loading CF27 supported-subset verifier package" />
      </VerifierPageShell>
    );
  }

  const progress = calculateVerifierProgress(pkg, state);
  const currentRecord = pkg.candidateDetails[Math.min(Math.max(state.currentIndex, 0), pkg.candidateDetails.length - 1)];
  const currentDecision = state.decisions[currentRecord.candidateID];
  const completionErrors = getVerifierCompletionErrors(pkg, state);
  const canExport = completionErrors.length === 0;

  function patchState(patch: Partial<VerifierDraftState>) {
    setState((current) => current ? { ...current, ...patch, updatedAt: new Date().toISOString() } : current);
    setSaveNotice("Progress saved in this browser.");
    setExportError(null);
  }

  function updateEnvironment<Key extends keyof VerifierEnvironment>(key: Key, value: VerifierEnvironment[Key]) {
    if (!state) return;
    patchState({
      environment: { ...state.environment, [key]: value },
      attestation: key === "verifierId" ? { ...state.attestation, verifierId: String(value) } : state.attestation
    });
  }

  function updateAttestation<Key extends keyof VerifierAttestation>(key: Key, value: VerifierAttestation[Key]) {
    if (!state) return;
    patchState({ attestation: { ...state.attestation, [key]: value } });
  }

  function updateDecision(candidateID: string, patch: Partial<VerifierRecordDecision>) {
    if (!state) return;
    const current = state.decisions[candidateID];
    patchState({
      decisions: {
        ...state.decisions,
        [candidateID]: {
          ...current,
          ...patch,
          decisionTimestamp: patch.decisionStatus || patch.independentObservation ? new Date().toISOString() : current.decisionTimestamp
        }
      }
    });
  }

  function updateMenuCount(targetID: string, patch: Partial<VerifierMenuCount>) {
    if (!state) return;
    patchState({ menuCounts: { ...state.menuCounts, [targetID]: { ...state.menuCounts[targetID], ...patch } } });
  }

  function updateSecondaryAngle(candidateID: string, patch: Partial<VerifierSecondaryAngleResult>) {
    if (!state) return;
    patchState({ secondaryAngles: { ...state.secondaryAngles, [candidateID]: { ...state.secondaryAngles[candidateID], ...patch } } });
  }

  function updateDuplicateOrder(candidateID: string, patch: Record<string, string>) {
    if (!state) return;
    patchState({ duplicateOrderRows: { ...state.duplicateOrderRows, [candidateID]: { ...state.duplicateOrderRows[candidateID], ...patch } } });
  }

  function goToRecord(index: number) {
    if (!state) return;
    patchState({ currentIndex: Math.min(Math.max(index, 0), pkg!.candidateDetails.length - 1) });
    setStep("records");
  }

  async function exportPackage() {
    if (!state || !pkg) return;
    const errors = getVerifierCompletionErrors(pkg, state);
    if (errors.length > 0) {
      setExportError(`Export blocked: ${errors.slice(0, 4).join(" ")}`);
      setStep("review");
      return;
    }
    const withHash = await addIntegrityHash(buildVerifierExportPackage(pkg, state));
    const filename = verifierExportFilename(state.environment.verifierId, state.environment.verificationDate);
    const blob = new Blob([`${JSON.stringify(withHash, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setExportMessage(`Export created: ${filename}. It remains non-production until Prompt 136 validates and imports it.`);
  }

  return (
    <VerifierPageShell>
      <div className="verifier-topbar">
        <div>
          <p className="eyebrow">Local-only verifier workflow</p>
          <h1>{routeTitle}</h1>
          <p className="supporting">One friend can work through the {pkg.candidateDetails.length}-record CF27 supported subset without editing repository files.</p>
        </div>
        <StatusBadge tone="danger">non-production</StatusBadge>
      </div>

      <Alert title="Verifier independence required" tone="warning">
        The existing evidence is shown only as a reference. The verifier must check the shipping game themselves. Nothing here publishes a catalog or enables recommendations.
      </Alert>

      <div className="card-grid verifier-progress-grid">
        <Card>
          <h2>Progress</h2>
          <ProgressBar value={progress.completed} max={progress.total} label="Records completed" />
          <dl className="metadata-list">
            <div><dt>Completed</dt><dd>{progress.completed}</dd></div>
            <div><dt>Remaining</dt><dd>{progress.remaining}</dd></div>
            <div><dt>Flagged</dt><dd>{progress.flagged}</dd></div>
            <div><dt>Percent</dt><dd>{progress.percentComplete}%</dd></div>
          </dl>
        </Card>
        <Card>
          <h2>Package</h2>
          <dl className="metadata-list">
            <div><dt>Queue records</dt><dd>{pkg.candidateDetails.length}</dd></div>
            <div><dt>Secondary samples</dt><dd>{pkg.secondaryAngleTemplate.length}</dd></div>
            <div><dt>Menu counts</dt><dd>{pkg.menuCountTemplate.length}</dd></div>
            <div><dt>Production records</dt><dd>0</dd></div>
          </dl>
        </Card>
        <Card tone={canExport ? "success" : "warning"}>
          <h2>Completion gate</h2>
          <p className="supporting">{canExport ? "All required fields are complete. Export is available." : `${completionErrors.length} required item(s) remain.`}</p>
          <Button onClick={() => void exportPackage()} disabled={!canExport}>Export verifier package</Button>
        </Card>
      </div>

      <nav className="verifier-tabs" aria-label="Verifier workflow steps">
        {([
          ["environment", "1. Environment"],
          ["records", "2. Records"],
          ["counts", "3. Counts"],
          ["limitations", "4. Limitations"],
          ["review", "5. Review/export"]
        ] as Array<[WorkflowStep, string]>).map(([id, label]) => (
          <button key={id} className={step === id ? "is-active" : ""} type="button" onClick={() => setStep(id)}>{label}</button>
        ))}
      </nav>

      {saveNotice ? <p className="field-note" role="status">{saveNotice}</p> : null}
      {step === "environment" ? (
        <EnvironmentStep
          environment={state.environment}
          attestation={state.attestation}
          updateEnvironment={updateEnvironment}
          updateAttestation={updateAttestation}
        />
      ) : null}
      {step === "records" ? (
        <RecordStep
          records={pkg.candidateDetails}
          currentRecord={currentRecord}
          currentIndex={state.currentIndex}
          decision={currentDecision}
          secondaryAngle={state.secondaryAngles[currentRecord.candidateID]}
          onRecordChange={goToRecord}
          onDecisionChange={(patch) => updateDecision(currentRecord.candidateID, patch)}
          onSecondaryAngleChange={(patch) => updateSecondaryAngle(currentRecord.candidateID, patch)}
        />
      ) : null}
      {step === "counts" ? (
        <CountsStep rows={Object.values(state.menuCounts)} updateMenuCount={updateMenuCount} />
      ) : null}
      {step === "limitations" ? (
        <LimitationsStep rows={Object.values(state.duplicateOrderRows)} updateDuplicateOrder={updateDuplicateOrder} />
      ) : null}
      {step === "review" ? (
        <ReviewStep
          pkg={pkg}
          state={state}
          completionErrors={completionErrors}
          exportError={exportError}
          exportMessage={exportMessage}
          exportPackage={exportPackage}
          onRecordSelect={goToRecord}
        />
      ) : null}
    </VerifierPageShell>
  );
}

function VerifierPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="verifier-page">
      <div className="verifier-shell">{children}</div>
    </main>
  );
}

function EnvironmentStep({
  environment,
  attestation,
  updateEnvironment,
  updateAttestation
}: {
  environment: VerifierEnvironment;
  attestation: VerifierAttestation;
  updateEnvironment: <Key extends keyof VerifierEnvironment>(key: Key, value: VerifierEnvironment[Key]) => void;
  updateAttestation: <Key extends keyof VerifierAttestation>(key: Key, value: VerifierAttestation[Key]) => void;
}) {
  return (
    <section className="screen-stack" aria-labelledby="verifier-environment-title">
      <Card>
        <h2 id="verifier-environment-title">Verifier and game environment</h2>
        <p className="supporting">Write what is visible in the shipping game or console. Use unknown only when the game does not show it.</p>
        <div className="form-grid">
          <TextField label="Verifier name or ID" value={environment.verifierId} onChange={(event) => updateEnvironment("verifierId", event.currentTarget.value)} />
          <TextField label="Verification date" type="date" value={environment.verificationDate} onChange={(event) => updateEnvironment("verificationDate", event.currentTarget.value)} />
          <TextField label="Game title shown" value={environment.gameTitleDisplayed} onChange={(event) => updateEnvironment("gameTitleDisplayed", event.currentTarget.value)} />
          <TextField label="Platform" value={environment.platform} onChange={(event) => updateEnvironment("platform", event.currentTarget.value)} />
          <TextField label="Console model" value={environment.consoleModel} onChange={(event) => updateEnvironment("consoleModel", event.currentTarget.value)} />
          <TextField label="Game version" value={environment.gameVersion} onChange={(event) => updateEnvironment("gameVersion", event.currentTarget.value)} />
          <TextField label="Patch or installed update" value={environment.patchOrInstalledUpdate} onChange={(event) => updateEnvironment("patchOrInstalledUpdate", event.currentTarget.value)} />
          <TextField label="Mode" value={environment.mode} onChange={(event) => updateEnvironment("mode", event.currentTarget.value)} />
          <TextField label="Creation path" value={environment.creationPath} onChange={(event) => updateEnvironment("creationPath", event.currentTarget.value)} />
          <TextField label="Account state" value={environment.accountState} onChange={(event) => updateEnvironment("accountState", event.currentTarget.value)} />
          <TextField label="Online state" value={environment.onlineState} onChange={(event) => updateEnvironment("onlineState", event.currentTarget.value)} />
          <TextField label="Environment evidence reference" value={environment.environmentEvidenceReference} onChange={(event) => updateEnvironment("environmentEvidenceReference", event.currentTarget.value)} />
        </div>
        <CheckboxField label="I independently opened the shipping game for this verification." checked={environment.independentlyAccessedShippingGame} onChange={(checked) => updateEnvironment("independentlyAccessedShippingGame", checked)} />
      </Card>
      <Card>
        <h2>Verifier attestation</h2>
        <p className="supporting">These boxes are intentionally separate. They are not preselected.</p>
        <div className="verifier-checklist">
          {([
            ["attestationAccepted", "I accept this verifier attestation."],
            ["realSecondPerson", "I am a real second person, not the primary researcher."],
            ["independentlyAccessedShippingGame", "I independently accessed the shipping game."],
            ["didNotMerelyApprovePrimarySummary", "I did not merely approve the existing notes."],
            ["reviewedCandidateAndEvidencePresented", "I reviewed the candidate and evidence shown."],
            ["recordedDisagreementsHonestly", "I recorded disagreements honestly."],
            ["didNotGuessMissingLabelsOrderCountsOrViews", "I did not guess missing labels, order, counts, or views."],
            ["understandsNotPublishingCatalog", "I understand this does not publish the catalog."],
            ["understandsCatalogManagerApprovalSeparate", "I understand catalog-manager approval is separate."]
          ] as Array<[keyof VerifierAttestation, string]>).map(([field, label]) => (
            <CheckboxField key={field} label={label} checked={Boolean(attestation[field])} onChange={(checked) => updateAttestation(field, checked as never)} />
          ))}
        </div>
      </Card>
    </section>
  );
}

function RecordStep({
  records,
  currentRecord,
  currentIndex,
  decision,
  secondaryAngle,
  onRecordChange,
  onDecisionChange,
  onSecondaryAngleChange
}: {
  records: SupportedSubsetVerifierCandidate[];
  currentRecord: SupportedSubsetVerifierCandidate;
  currentIndex: number;
  decision: VerifierRecordDecision;
  secondaryAngle?: VerifierSecondaryAngleResult;
  onRecordChange: (index: number) => void;
  onDecisionChange: (patch: Partial<VerifierRecordDecision>) => void;
  onSecondaryAngleChange: (patch: Partial<VerifierSecondaryAngleResult>) => void;
}) {
  const complete = isRecordDecisionComplete(currentRecord, decision);
  return (
    <section className="screen-stack" aria-labelledby="verifier-record-title">
      <div className="status-row">
        <div>
          <p className="eyebrow">Record {currentIndex + 1} of {records.length}</p>
          <h2 id="verifier-record-title">{currentRecord.candidateID}</h2>
        </div>
        <StatusBadge tone={complete ? "success" : "warning"}>{complete ? "complete" : "needs decision"}</StatusBadge>
      </div>
      <div className="button-row">
        <Button variant="secondary" onClick={() => onRecordChange(currentIndex - 1)} disabled={currentIndex === 0}>Previous</Button>
        <Button variant="secondary" onClick={() => onRecordChange(currentIndex + 1)} disabled={currentIndex === records.length - 1}>Next</Button>
      </div>
      <div className="result-grid">
        <Card>
          <h3>What to check in the game</h3>
          <dl className="metadata-list">
            <div><dt>Category</dt><dd>{currentRecord.category}</dd></div>
            <div><dt>Expected label</dt><dd>{currentRecord.claimedNativeLabel || "unresolved"}</dd></div>
            <div><dt>Expected index</dt><dd>{currentRecord.claimedNativeIndex ?? "unresolved"}</dd></div>
            <div><dt>Expected order</dt><dd>{currentRecord.claimedNativeOrder ?? "unresolved"}</dd></div>
            <div><dt>Support state</dt><dd>{currentRecord.evidenceSupportState}</dd></div>
            <div><dt>Production eligibility</dt><dd>{currentRecord.productionEligibilityState}</dd></div>
          </dl>
        </Card>
        <Card>
          <h3>Evidence reference</h3>
          <dl className="metadata-list">
            <div><dt>Source video IDs</dt><dd>{currentRecord.sourceVideoIDs.join(", ") || "none"}</dd></div>
            <div><dt>Timestamps</dt><dd>{currentRecord.exactEvidenceTimestamps.join(", ") || "none"}</dd></div>
            <div><dt>Front view</dt><dd>{currentRecord.frontViewEvidence}</dd></div>
            <div><dt>Secondary sample</dt><dd>{currentRecord.deterministicSecondaryAngleSampleRequired ? "required" : "not selected"}</dd></div>
          </dl>
          <ul className="compact-list">
            {currentRecord.derivativeEvidenceReferences.slice(0, 4).map((evidence) => (
              <li key={evidence.evidenceID ?? evidence.relativePath}>{evidence.evidenceID ?? "evidence"} · {evidence.relativePath ?? "path unresolved"}</li>
            ))}
          </ul>
        </Card>
      </div>
      <Card>
        <h3>Verifier decision</h3>
        <label className="form-field" htmlFor="verifier-independent-observation">
          <span>Independent observation</span>
          <textarea id="verifier-independent-observation" rows={4} value={decision.independentObservation} onChange={(event) => onDecisionChange({ independentObservation: event.currentTarget.value })} />
        </label>
        <div className="form-grid">
          <TriStateSelect label="Candidate identity confirmed" value={decision.candidateIdentityConfirmed} onChange={(value) => onDecisionChange({ candidateIdentityConfirmed: value })} />
          <TriStateSelect label="Native label confirmed" value={decision.nativeLabelConfirmed} onChange={(value) => onDecisionChange({ nativeLabelConfirmed: value })} />
          <TriStateSelect label="Native index confirmed" value={decision.nativeIndexConfirmed} onChange={(value) => onDecisionChange({ nativeIndexConfirmed: value })} />
          <TriStateSelect label="Native order confirmed" value={decision.nativeOrderConfirmed} onChange={(value) => onDecisionChange({ nativeOrderConfirmed: value })} />
          <YesNoSelect label="Evidence files resolve" value={decision.evidenceFilesResolve} onChange={(value) => onDecisionChange({ evidenceFilesResolve: value })} />
          <FrontViewSelect label="Front view confirmed" value={decision.frontViewConfirmed} onChange={(value) => onDecisionChange({ frontViewConfirmed: value })} />
          <SecondaryAngleSelect label="Secondary angle reviewed" value={decision.secondaryAngleReviewed} requiredSample={currentRecord.deterministicSecondaryAngleSampleRequired} onChange={(value) => onDecisionChange({ secondaryAngleReviewed: value })} />
          <TriStateSelect label="Menu count confirmed" value={decision.menuCountConfirmed} onChange={(value) => onDecisionChange({ menuCountConfirmed: value })} />
          <DuplicateSelect label="Duplicate relationship confirmed" value={decision.duplicateRelationshipConfirmed} duplicateFlag={currentRecord.duplicateFlag} onChange={(value) => onDecisionChange({ duplicateRelationshipConfirmed: value })} />
          <TriStateSelect label="Environment compatible" value={decision.environmentCompatible} onChange={(value) => onDecisionChange({ environmentCompatible: value })} />
          <SelectField label="Decision status" value={decision.decisionStatus} onChange={(event) => onDecisionChange({ decisionStatus: event.currentTarget.value as VerifierStatus })}>
            <option value="">Choose a status</option>
            {allowedVerifierStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </SelectField>
        </div>
        <label className="form-field" htmlFor="verifier-required-notes">
          <span>Notes for discrepancies, limits, or non-clean decisions</span>
          <textarea id="verifier-required-notes" rows={3} value={decision.requiredNotes} onChange={(event) => onDecisionChange({ requiredNotes: event.currentTarget.value })} />
        </label>
        {currentRecord.deterministicSecondaryAngleSampleRequired && secondaryAngle ? (
          <div className="verifier-sample-panel">
            <h4>Required secondary-angle sample</h4>
            <p className="supporting">{secondaryAngle.requiredSecondaryViews} · {secondaryAngle.exactUsefulTimestamps}</p>
            <div className="form-grid">
              <SelectField label="Sample reviewed" value={secondaryAngle.reviewed} onChange={(event) => onSecondaryAngleChange({ reviewed: event.currentTarget.value as VerifierSecondaryAngleResult["reviewed"] })}>
                <option value="">Choose</option>
                <option value="yes">yes</option>
                <option value="no">no</option>
                <option value="not_available">not available</option>
              </SelectField>
              <TextField label="Sample result" value={secondaryAngle.result} onChange={(event) => onSecondaryAngleChange({ result: event.currentTarget.value })} />
            </div>
            <label className="form-field" htmlFor="secondary-angle-observation">
              <span>Secondary-angle observation</span>
              <textarea id="secondary-angle-observation" rows={3} value={secondaryAngle.verifierObservation} onChange={(event) => onSecondaryAngleChange({ verifierObservation: event.currentTarget.value })} />
            </label>
          </div>
        ) : null}
      </Card>
    </section>
  );
}

function CountsStep({ rows, updateMenuCount }: { rows: VerifierMenuCount[]; updateMenuCount: (targetID: string, patch: Partial<VerifierMenuCount>) => void }) {
  return (
    <section className="screen-stack" aria-labelledby="verifier-counts-title">
      <Card>
        <h2 id="verifier-counts-title">Independent menu counts</h2>
        <p className="supporting">Record what the verifier can count in the shipping game. Uncertain is allowed with notes; guessing is not.</p>
      </Card>
      {rows.map((row) => (
        <Card key={row.targetID}>
          <h3>{row.category}</h3>
          <p className="supporting">{row.notes}</p>
          <div className="form-grid">
            <TextField label="Independent verifier count" value={row.independentVerifierCount} onChange={(event) => updateMenuCount(row.targetID, { independentVerifierCount: event.currentTarget.value })} />
            <TextField label="First visible value" value={row.firstVisibleValue} onChange={(event) => updateMenuCount(row.targetID, { firstVisibleValue: event.currentTarget.value })} />
            <TextField label="Final visible value" value={row.finalVisibleValue} onChange={(event) => updateMenuCount(row.targetID, { finalVisibleValue: event.currentTarget.value })} />
            <TextField label="Boundary or wrap observed" value={row.boundaryOrWrapObserved} onChange={(event) => updateMenuCount(row.targetID, { boundaryOrWrapObserved: event.currentTarget.value })} />
            <TriStateSelect label="Count confirmed" value={row.countConfirmed} onChange={(value) => updateMenuCount(row.targetID, { countConfirmed: value })} />
          </div>
        </Card>
      ))}
    </section>
  );
}

function LimitationsStep({
  rows,
  updateDuplicateOrder
}: {
  rows: Array<{ candidateID: string; category: string; requiredHumanAction: string; notes: string; verifierDisposition?: string; verifierObservation?: string }>;
  updateDuplicateOrder: (candidateID: string, patch: Record<string, string>) => void;
}) {
  return (
    <section className="screen-stack" aria-labelledby="verifier-limitations-title">
      <Card>
        <h2 id="verifier-limitations-title">Duplicate and order limitations</h2>
        <p className="supporting">These rows are not in the supported recommendation subset. Review them only as limitations so they are not accidentally treated as production-ready.</p>
      </Card>
      {rows.map((row) => (
        <Card key={row.candidateID}>
          <h3>{row.candidateID}</h3>
          <p className="supporting">{row.category} · {row.requiredHumanAction}</p>
          <div className="form-grid">
            <TextField label="Verifier disposition" value={row.verifierDisposition ?? ""} onChange={(event) => updateDuplicateOrder(row.candidateID, { verifierDisposition: event.currentTarget.value })} />
            <TextField label="Verifier observation" value={row.verifierObservation ?? ""} onChange={(event) => updateDuplicateOrder(row.candidateID, { verifierObservation: event.currentTarget.value })} />
          </div>
        </Card>
      ))}
    </section>
  );
}

function ReviewStep({
  pkg,
  state,
  completionErrors,
  exportError,
  exportMessage,
  exportPackage,
  onRecordSelect
}: {
  pkg: SupportedSubsetVerifierPackage;
  state: VerifierDraftState;
  completionErrors: string[];
  exportError: string | null;
  exportMessage: string | null;
  exportPackage: () => Promise<void>;
  onRecordSelect: (index: number) => void;
}) {
  const incomplete = pkg.candidateDetails
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => !isRecordDecisionComplete(record, state.decisions[record.candidateID]));
  const summary = buildVerifierCompletionSummary(pkg, state);
  return (
    <section className="screen-stack" aria-labelledby="verifier-review-title">
      <Card tone={completionErrors.length === 0 ? "success" : "warning"}>
        <h2 id="verifier-review-title">Final review</h2>
        <p className="supporting">
          {completionErrors.length === 0
            ? "The package is complete enough to export for Prompt 136 validation and reconciliation. It still does not promote records."
            : "Export is blocked until the required items below are finished."}
        </p>
        <Button onClick={() => void exportPackage()} disabled={completionErrors.length > 0}>Export verifier package</Button>
      </Card>
      <Card>
        <h3>Export readiness summary</h3>
        <dl className="metadata-list">
          <div><dt>Record decisions</dt><dd>{summary.completedRecords} / {summary.totalRequiredRecords}</dd></div>
          <div><dt>Secondary samples</dt><dd>{summary.secondaryAngleSampleCompleted} / {summary.secondaryAngleSampleRequired}</dd></div>
          <div><dt>Duplicate/order reviews</dt><dd>{summary.duplicateOrderExceptionCompleted} / {summary.duplicateOrderExceptionRequired}</dd></div>
          <div><dt>Flagged or disputed</dt><dd>{summary.unresolvedDisagreements}</dd></div>
          <div><dt>Export valid</dt><dd>{summary.exportValid ? "yes" : "no"}</dd></div>
        </dl>
      </Card>
      {exportError ? <Alert title="Export blocked" tone="danger" role="alert">{exportError}</Alert> : null}
      {exportMessage ? <Alert title="Export ready" tone="success">{exportMessage}</Alert> : null}
      {incomplete.length > 0 ? (
        <Card>
          <h3>Incomplete records</h3>
          <ul className="compact-list">
            {incomplete.slice(0, 20).map(({ record, index }) => (
              <li key={record.candidateID}>
                <button className="link-button" type="button" onClick={() => onRecordSelect(index)}>{record.candidateID}</button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <Card>
        <h3>Validation summary</h3>
        <ul className="compact-list">
          {completionErrors.slice(0, 20).map((error) => <li key={error}>{error}</li>)}
          {completionErrors.length === 0 ? <li>All required verifier fields are complete.</li> : null}
        </ul>
      </Card>
    </section>
  );
}

function TriStateSelect({ label, value, onChange }: { label: string; value: TriState; onChange: (value: TriState) => void }) {
  return (
    <SelectField label={label} value={value} onChange={(event) => onChange(event.currentTarget.value as TriState)}>
      <option value="">Choose</option>
      <option value="yes">yes</option>
      <option value="no">no</option>
      <option value="uncertain">uncertain</option>
    </SelectField>
  );
}

function YesNoSelect({ label, value, onChange }: { label: string; value: "" | "yes" | "no"; onChange: (value: "" | "yes" | "no") => void }) {
  return (
    <SelectField label={label} value={value} onChange={(event) => onChange(event.currentTarget.value as "" | "yes" | "no")}>
      <option value="">Choose</option>
      <option value="yes">yes</option>
      <option value="no">no</option>
    </SelectField>
  );
}

function FrontViewSelect({ label, value, onChange }: { label: string; value: FrontViewState; onChange: (value: FrontViewState) => void }) {
  return (
    <SelectField label={label} value={value} onChange={(event) => onChange(event.currentTarget.value as FrontViewState)}>
      <option value="">Choose</option>
      <option value="yes">yes</option>
      <option value="no">no</option>
      <option value="not_applicable">not applicable</option>
    </SelectField>
  );
}

function SecondaryAngleSelect({
  label,
  value,
  requiredSample,
  onChange
}: {
  label: string;
  value: SecondaryAngleState;
  requiredSample: boolean;
  onChange: (value: SecondaryAngleState) => void;
}) {
  return (
    <SelectField label={label} value={value} onChange={(event) => onChange(event.currentTarget.value as SecondaryAngleState)}>
      <option value="">Choose</option>
      <option value="yes">yes</option>
      <option value="no">no</option>
      {!requiredSample ? <option value="not_selected">not selected</option> : null}
      <option value="not_available">not available</option>
    </SelectField>
  );
}

function DuplicateSelect({
  label,
  value,
  duplicateFlag,
  onChange
}: {
  label: string;
  value: DuplicateState;
  duplicateFlag: boolean;
  onChange: (value: DuplicateState) => void;
}) {
  return (
    <SelectField label={label} value={value} onChange={(event) => onChange(event.currentTarget.value as DuplicateState)}>
      <option value="">Choose</option>
      <option value="yes">yes</option>
      <option value="no">no</option>
      <option value="uncertain">uncertain</option>
      {!duplicateFlag ? <option value="not_applicable">not applicable</option> : null}
    </SelectField>
  );
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="form-field checkbox-field">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
    </label>
  );
}

function loadStoredDraft(pkg: SupportedSubsetVerifierPackage) {
  try {
    const stored = window.localStorage.getItem(CF27_SUPPORTED_SUBSET_VERIFIER_LOCAL_STORAGE_KEY);
    return stored ? sanitizeLoadedDraft(pkg, JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}
