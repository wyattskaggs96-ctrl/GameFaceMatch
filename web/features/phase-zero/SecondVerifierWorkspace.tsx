"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, LoadingState, ProgressBar, SelectField, StatusBadge, TextField } from "@/components/design-system";
import {
  createDeterministicSecondaryAngleSample,
  type Phase0SecondaryAngleSampleReport
} from "@/lib/phase-zero/phase-zero-second-verifier-workspace";
import {
  createVerifierDecisionDraft,
  defaultCf27VerifierQueueFilters,
  exportVerifierDecisionDrafts,
  filterVerificationQueueRecords,
  getAllowedCf27VerifierDecisionStatuses,
  getNextUnresolvedCandidate,
  getVerifierProgressCounts,
  importVerifierDecisionDrafts,
  queueRecordsForSecondaryAngleSampling,
  validateVerifierDecisionDraft,
  validateVerifierDecisionSet,
  type Cf27ProductionVerificationQueue,
  type Cf27ProductionVerificationQueueRecord,
  type Cf27VerifierDecisionDraft,
  type Cf27VerifierDecisionStatus,
  type Cf27VerifierQueueFilters
} from "@/lib/phase-zero/cf27-production-verification-queue";

const allowedStatuses = getAllowedCf27VerifierDecisionStatuses();
const loadingCopy = "Loading CF27 production-verification queue";

export function SecondVerifierWorkspace() {
  const [queue, setQueue] = useState<Cf27ProductionVerificationQueue | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Cf27VerifierQueueFilters>(defaultCf27VerifierQueueFilters);
  const [selectedCandidateID, setSelectedCandidateID] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Cf27VerifierDecisionDraft>>({});
  const [activeDraft, setActiveDraft] = useState<Cf27VerifierDecisionDraft | null>(null);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [secondaryAngleSample, setSecondaryAngleSample] = useState<Phase0SecondaryAngleSampleReport | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/internal/cf27-production-verification-queue", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`Queue endpoint returned ${response.status}`);
        return response.json() as Promise<Cf27ProductionVerificationQueue>;
      })
      .then((data) => {
        if (!active) return;
        setQueue(data);
        setSelectedCandidateID(data.records[0]?.stableCandidateID ?? null);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Unable to load the CF27 production-verification queue.");
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredRecords = useMemo(() => queue ? filterVerificationQueueRecords(queue.records, filters, drafts) : [], [queue, filters, drafts]);
  const selectedRecord = useMemo(() => {
    if (!queue) return null;
    return queue.records.find((record) => record.stableCandidateID === selectedCandidateID) ?? filteredRecords[0] ?? queue.records[0] ?? null;
  }, [filteredRecords, queue, selectedCandidateID]);
  const progress = useMemo(() => queue ? getVerifierProgressCounts(queue, drafts) : null, [queue, drafts]);
  const decisionSetValidation = useMemo(() => queue ? validateVerifierDecisionSet(queue, drafts) : null, [queue, drafts]);
  const draftValidation = useMemo(
    () => selectedRecord && activeDraft ? validateVerifierDecisionDraft(activeDraft, selectedRecord) : null,
    [activeDraft, selectedRecord]
  );

  useEffect(() => {
    if (!selectedRecord) {
      setActiveDraft(null);
      return;
    }
    setActiveDraft(drafts[selectedRecord.stableCandidateID] ?? createVerifierDecisionDraft(selectedRecord));
  }, [drafts, selectedRecord]);

  if (loadError) {
    return (
      <section className="screen-stack" aria-labelledby="second-verifier-title">
        <div className="status-row">
          <div>
            <p className="eyebrow">Internal verification tool</p>
            <h2 id="second-verifier-title">Second-verifier decision workspace</h2>
          </div>
          <StatusBadge tone="danger">queue unavailable</StatusBadge>
        </div>
        <Alert title="Queue could not be loaded" tone="danger" role="alert">{loadError}</Alert>
      </section>
    );
  }

  if (!queue || !progress || !decisionSetValidation) {
    return (
      <section className="screen-stack" aria-labelledby="second-verifier-title">
        <h2 id="second-verifier-title">Second-verifier decision workspace</h2>
        <LoadingState label={loadingCopy} />
      </section>
    );
  }
  const activeQueue = queue;

  function updateFilter<Key extends keyof Cf27VerifierQueueFilters>(key: Key, value: Cf27VerifierQueueFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function updateDraft<Key extends keyof Cf27VerifierDecisionDraft>(key: Key, value: Cf27VerifierDecisionDraft[Key]) {
    setActiveDraft((current) => current ? { ...current, [key]: value } : current);
    setDraftNotice(null);
  }

  function selectRecord(record: Cf27ProductionVerificationQueueRecord) {
    setSelectedCandidateID(record.stableCandidateID);
    setDraftNotice(null);
  }

  function saveDraft() {
    if (!selectedRecord || !activeDraft) return;
    const savedDraft: Cf27VerifierDecisionDraft = {
      ...activeDraft,
      stableCandidateID: selectedRecord.stableCandidateID,
      queueRecordID: selectedRecord.queueRecordID,
      savedAt: new Date().toISOString(),
      productionPromotionAttempted: false,
      productionEligibleAfterDraft: false
    };
    setDrafts((current) => ({ ...current, [selectedRecord.stableCandidateID]: savedDraft }));
    setActiveDraft(savedDraft);
    setDraftNotice("Draft saved locally. No production record was created.");
  }

  function jumpToNextUnresolved() {
    const next = getNextUnresolvedCandidate(activeQueue.records, drafts);
    if (next) selectRecord(next);
  }

  async function generateSample() {
    const sample = await createDeterministicSecondaryAngleSample({
      seed: {
        environmentID: selectedRecord?.environmentID ?? "CF27_ENVIRONMENT_UNRESOLVED",
        verifierID: activeDraft?.verifierID || "UNASSIGNED_SECOND_VERIFIER",
        catalogVersion: activeQueue.generatedAt
      },
      eligibleRecords: queueRecordsForSecondaryAngleSampling(activeQueue)
    });
    setSecondaryAngleSample(sample);
  }

  function exportDrafts() {
    const csv = exportVerifierDecisionDrafts(drafts);
    setImportText(csv);
    setImportMessage(`Export prepared with ${Object.keys(drafts).length} draft decision row(s).`);
  }

  function importDrafts() {
    const result = importVerifierDecisionDrafts(importText, activeQueue);
    if (result.importable) {
      setDrafts((current) => ({ ...current, ...result.drafts }));
      setImportMessage(`Imported ${Object.keys(result.drafts).length} validated draft decision row(s). No records were promoted.`);
    } else {
      setImportMessage(`Import blocked with ${result.errors.length} error(s): ${result.errors.slice(0, 3).map((error) => error.message).join(" ")}`);
    }
  }

  const categories = ["all", ...activeQueue.categoryCounts.map((category) => category.category)];

  return (
    <section className="screen-stack" aria-labelledby="second-verifier-title">
      <div className="status-row">
        <div>
          <p className="eyebrow">Internal verification tool</p>
          <h2 id="second-verifier-title">Second-verifier decision workspace</h2>
        </div>
        <StatusBadge tone="danger">production blocked</StatusBadge>
      </div>
      <p className="supporting">
        Work through the canonical CF27 production-verification queue from Prompt 092. Draft decisions are attributed and exportable, but they never
        grant production approval or enable recommendations.
      </p>
      <Alert title="Fail-closed queue" tone="warning">
        Primary review, verifier drafts, and client-side state cannot publish records. Production remains blocked until validated second-verifier
        files, discrepancy resolution, catalog-manager approval, and release gates pass.
      </Alert>

      <div className="card-grid">
        <Card>
          <h3>Queue progress</h3>
          <ProgressBar value={progress.draftSaved} max={progress.total} label="Verifier drafts saved" />
          <dl className="metadata-list">
            <div><dt>Total records</dt><dd>{progress.total}</dd></div>
            <div><dt>Not verified</dt><dd>{progress.notVerified}</dd></div>
            <div><dt>Missing views</dt><dd>{progress.missingViews}</dd></div>
            <div><dt>Duplicate or ambiguous</dt><dd>{progress.duplicateOrAmbiguous}</dd></div>
            <div><dt>Environment gaps</dt><dd>{progress.environmentGaps}</dd></div>
            <div><dt>Production eligible</dt><dd>{progress.productionEligible}</dd></div>
          </dl>
        </Card>
        <Card tone="warning">
          <h3>Mandatory production depth</h3>
          <ul className="compact-list">
            <li>100% catalog IDs, indices, menu counts, evidence files, required front views, exceptions, duplicates, and proposed production records must be reviewed.</li>
            <li>At least 25% of secondary angles must be sampled by deterministic method.</li>
            <li>Missing environment metadata, evidence gaps, conflicts, and recapture needs keep records blocked.</li>
          </ul>
        </Card>
        <Card tone={decisionSetValidation.completed === queue.records.length && decisionSetValidation.ok ? "success" : "danger"}>
          <h3>Decision-set validation</h3>
          <dl className="metadata-list">
            <div><dt>Valid drafts</dt><dd>{decisionSetValidation.completed}/{decisionSetValidation.total}</dd></div>
            <div><dt>Errors</dt><dd>{decisionSetValidation.errors.length}</dd></div>
            <div><dt>Warnings</dt><dd>{decisionSetValidation.warnings.length}</dd></div>
            <div><dt>Production eligible</dt><dd>{decisionSetValidation.productionEligible ? "yes" : "no"}</dd></div>
          </dl>
        </Card>
      </div>

      <Card>
        <h3>Queue filters</h3>
        <div className="form-grid">
          <SelectField label="Category" value={filters.category} onChange={(event) => updateFilter("category", event.currentTarget.value)}>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </SelectField>
          <SelectField label="Verifier status" value={filters.verifierStatus} onChange={(event) => updateFilter("verifierStatus", event.currentTarget.value as Cf27VerifierQueueFilters["verifierStatus"])}>
            <option value="all">all</option>
            {allowedStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </SelectField>
          <SelectField label="Evidence completeness" value={filters.evidenceCompleteness} onChange={(event) => updateFilter("evidenceCompleteness", event.currentTarget.value as Cf27VerifierQueueFilters["evidenceCompleteness"])}>
            <option value="all">all</option>
            <option value="EVIDENCE_LINKED">EVIDENCE_LINKED</option>
            <option value="MISSING_EVIDENCE">MISSING_EVIDENCE</option>
          </SelectField>
          <BooleanFilter label="Missing views" value={filters.missingViews} onChange={(value) => updateFilter("missingViews", value)} />
          <BooleanFilter label="Duplicate or ambiguity" value={filters.duplicateOrAmbiguous} onChange={(value) => updateFilter("duplicateOrAmbiguous", value)} />
          <BooleanFilter label="Environment/version gap" value={filters.environmentGap} onChange={(value) => updateFilter("environmentGap", value)} />
          <TextField label="Candidate search" value={filters.search} onChange={(event) => updateFilter("search", event.currentTarget.value)} />
        </div>
        <div className="button-row">
          <Button variant="secondary" onClick={jumpToNextUnresolved}>Next unresolved candidate</Button>
          <Button variant="secondary" onClick={() => void generateSample()}>Generate 25% secondary-angle sample</Button>
        </div>
      </Card>

      {secondaryAngleSample ? (
        <Card>
          <h3>Deterministic secondary-angle sample</h3>
          <dl className="metadata-list">
            <div><dt>Method</dt><dd>{secondaryAngleSample.methodID}</dd></div>
            <div><dt>Selected</dt><dd>{secondaryAngleSample.selectedCount}/{secondaryAngleSample.eligibleCount}</dd></div>
            <div><dt>Seed</dt><dd>{secondaryAngleSample.seedInput}</dd></div>
          </dl>
          <pre className="code-block" aria-label="CF27 deterministic secondary-angle sample report">{secondaryAngleSample.humanReadableReport}</pre>
        </Card>
      ) : null}

      <div className="data-table-scroll" role="region" aria-label="CF27 verifier candidate queue" tabIndex={0}>
        <table className="data-table">
          <caption>Filtered production-verification queue candidates</caption>
          <thead>
            <tr>
              <th scope="col">Candidate</th>
              <th scope="col">Category</th>
              <th scope="col">Native order</th>
              <th scope="col">Draft status</th>
              <th scope="col">Flags</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => {
              const status = drafts[record.stableCandidateID]?.decisionStatus ?? record.secondVerifierStatus;
              return (
                <tr key={record.stableCandidateID}>
                  <th scope="row">
                    <button className="link-button" type="button" onClick={() => selectRecord(record)}>
                      {record.stableCandidateID}
                    </button>
                    <small>{record.nativeOptionLabelOrIndex || "label unresolved"}</small>
                  </th>
                  <td>{record.category}</td>
                  <td>{record.nativeOrder ?? "unresolved"}</td>
                  <td>{status}</td>
                  <td>{queueFlags(record).join(", ") || "none"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredRecords.length === 0 ? (
        <Alert title="No candidates match filters" tone="info">Clear a filter or use search to locate a specific stable ID.</Alert>
      ) : null}

      {selectedRecord && activeDraft ? (
        <CandidateDetail
          record={selectedRecord}
          draft={activeDraft}
          draftValidation={draftValidation}
          draftNotice={draftNotice}
          updateDraft={updateDraft}
          saveDraft={saveDraft}
        />
      ) : null}

      <Card>
        <h3>Draft export and import</h3>
        <p className="supporting">CSV export/import is for verifier decision drafts only. It cannot create production records or alter catalog-manager disposition.</p>
        <div className="button-row">
          <Button variant="secondary" onClick={exportDrafts}>Prepare CSV export</Button>
          <Button variant="secondary" onClick={importDrafts} disabled={!importText.trim()}>Validate and import CSV</Button>
        </div>
        <label className="form-field" htmlFor="cf27-verifier-draft-csv">
          <span>Verifier draft CSV</span>
          <textarea id="cf27-verifier-draft-csv" rows={8} value={importText} onChange={(event) => setImportText(event.currentTarget.value)} />
        </label>
        {importMessage ? <Alert title="Draft import/export status" tone="info">{importMessage}</Alert> : null}
      </Card>
    </section>
  );
}

function CandidateDetail({
  record,
  draft,
  draftValidation,
  draftNotice,
  updateDraft,
  saveDraft
}: {
  record: Cf27ProductionVerificationQueueRecord;
  draft: Cf27VerifierDecisionDraft;
  draftValidation: ReturnType<typeof validateVerifierDecisionDraft> | null;
  draftNotice: string | null;
  updateDraft: <Key extends keyof Cf27VerifierDecisionDraft>(key: Key, value: Cf27VerifierDecisionDraft[Key]) => void;
  saveDraft: () => void;
}) {
  return (
    <section className="screen-stack" aria-labelledby={`candidate-detail-${record.stableCandidateID}`}>
      <div className="status-row">
        <div>
          <p className="eyebrow">Candidate detail</p>
          <h3 id={`candidate-detail-${record.stableCandidateID}`}>{record.stableCandidateID}</h3>
        </div>
        <StatusBadge tone={record.currentProductionEligibility === "NOT_ELIGIBLE" ? "danger" : "warning"}>{record.currentProductionEligibility}</StatusBadge>
      </div>
      <div className="result-grid">
        <Card>
          <h4>Native and environment metadata</h4>
          <dl className="metadata-list">
            <div><dt>Category</dt><dd>{record.category}</dd></div>
            <div><dt>Native label/index</dt><dd>{record.nativeOptionLabelOrIndex || "unresolved"}</dd></div>
            <div><dt>Native order</dt><dd>{record.nativeOrder ?? "unresolved"}</dd></div>
            <div><dt>Platform</dt><dd>{record.platform ?? "unresolved"}</dd></div>
            <div><dt>Game version</dt><dd>{record.gameVersion ?? "unresolved"}</dd></div>
            <div><dt>Patch</dt><dd>{record.patch ?? "unresolved"}</dd></div>
            <div><dt>Mode</dt><dd>{record.mode ?? "unresolved"}</dd></div>
            <div><dt>Creation path</dt><dd>{record.creationPath ?? "unresolved"}</dd></div>
          </dl>
        </Card>
        <Card>
          <h4>Primary observation</h4>
          <dl className="metadata-list">
            <div><dt>Primary status</dt><dd>{record.primaryReviewStatus}</dd></div>
            <div><dt>Selected visible</dt><dd>{record.selectedValueVisible ? "yes" : "no"}</dd></div>
            <div><dt>Category visible</dt><dd>{record.categoryVisible ? "yes" : "no"}</dd></div>
            <div><dt>Transition</dt><dd>{record.optionTransitionObservable}</dd></div>
            <div><dt>Neighbor ordering</dt><dd>{record.neighboringOptionsEstablishOrdering}</dd></div>
          </dl>
          <ul className="compact-list">
            {record.notes.slice(0, 4).map((note) => <li key={note}>{note}</li>)}
          </ul>
        </Card>
      </div>
      <div className="result-grid">
        <Card tone={record.missingViews.length > 0 ? "warning" : "success"}>
          <h4>Evidence and views</h4>
          <dl className="metadata-list">
            <div><dt>Evidence status</dt><dd>{record.evidenceCompletenessStatus}</dd></div>
            <div><dt>Available views</dt><dd>{record.availableViews.join(", ") || "none"}</dd></div>
            <div><dt>Missing views</dt><dd>{record.missingViews.join(", ") || "none"}</dd></div>
            <div><dt>Framing</dt><dd>{record.framingConsistencyResult}</dd></div>
            <div><dt>Lighting</dt><dd>{record.lightingConsistencyResult}</dd></div>
            <div><dt>Canonical settings</dt><dd>{record.canonicalSettingsConsistencyResult}</dd></div>
          </dl>
          <ul className="compact-list">
            {record.evidenceReferences.map((evidence) => (
              <li key={`${record.stableCandidateID}-${evidence.evidenceID}`}>
                {evidence.evidenceID} · {evidence.view ?? "view unknown"} · {evidence.relativePath ?? evidence.path ?? "path unresolved"}
              </li>
            ))}
          </ul>
        </Card>
        <Card tone={record.blockingReasons.length > 0 ? "danger" : "neutral"}>
          <h4>Blocking facts</h4>
          <dl className="metadata-list">
            <div><dt>Duplicate flag</dt><dd>{record.duplicateOrNearDuplicateFlag ? "yes" : "no"}</dd></div>
            <div><dt>Dependency flag</dt><dd>{record.dependencyFlag ? "yes" : "no"}</dd></div>
            <div><dt>Environment/version gap</dt><dd>{record.versionOrEnvironmentGap ? "yes" : "no"}</dd></div>
            <div><dt>Recommended verifier action</dt><dd>{record.recommendedVerifierAction}</dd></div>
            <div><dt>Recommended recapture action</dt><dd>{record.recommendedRecaptureAction}</dd></div>
          </dl>
          <ul className="compact-list">
            {record.blockingReasons.slice(0, 8).map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        </Card>
      </div>
      <Card>
        <h4>Verifier draft decision</h4>
        <div className="form-grid">
          <TextField label="Verifier ID" value={draft.verifierID} onChange={(event) => updateDraft("verifierID", event.currentTarget.value)} />
          <TextField label="Verification date" type="date" value={draft.verificationDate} onChange={(event) => updateDraft("verificationDate", event.currentTarget.value)} />
          <TextField label="Verifier environment" value={draft.verifierEnvironment} onChange={(event) => updateDraft("verifierEnvironment", event.currentTarget.value)} />
          <SelectField label="Decision status" value={draft.decisionStatus} onChange={(event) => updateDraft("decisionStatus", event.currentTarget.value as Cf27VerifierDecisionStatus)}>
            {allowedStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </SelectField>
        </div>
        <label className="form-field" htmlFor={`independent-observation-${record.stableCandidateID}`}>
          <span>Independent observation</span>
          <textarea id={`independent-observation-${record.stableCandidateID}`} rows={4} value={draft.independentObservation} onChange={(event) => updateDraft("independentObservation", event.currentTarget.value)} />
        </label>
        <div className="form-grid">
          <CheckboxField label="Evidence files exist" checked={draft.evidenceConfirmed} onChange={(checked) => updateDraft("evidenceConfirmed", checked)} />
          <CheckboxField label="Native order checked" checked={draft.nativeOrderConfirmed} onChange={(checked) => updateDraft("nativeOrderConfirmed", checked)} />
          <CheckboxField label="Required front view checked" checked={draft.frontViewConfirmed} onChange={(checked) => updateDraft("frontViewConfirmed", checked)} />
          <CheckboxField label="Secondary angle sample checked" checked={draft.secondaryAngleConfirmed} onChange={(checked) => updateDraft("secondaryAngleConfirmed", checked)} />
          <CheckboxField label="Duplicate or exception reviewed" checked={draft.exceptionReviewed} onChange={(checked) => updateDraft("exceptionReviewed", checked)} />
        </div>
        <label className="form-field" htmlFor={`verifier-notes-${record.stableCandidateID}`}>
          <span>Verifier notes</span>
          <textarea id={`verifier-notes-${record.stableCandidateID}`} rows={3} value={draft.notes} onChange={(event) => updateDraft("notes", event.currentTarget.value)} />
          <span className="field-note">Required for every non-clean decision. A saved draft still cannot publish a record.</span>
        </label>
        <div className="button-row">
          <Button onClick={saveDraft}>Save verifier draft</Button>
        </div>
        {draftNotice ? <Alert title="Draft saved" tone="success">{draftNotice}</Alert> : null}
        {draftValidation ? (
          <Alert title={draftValidation.ok ? "Draft complete enough to export" : "Draft blocked"} tone={draftValidation.ok ? "success" : "warning"}>
            {draftValidation.ok
              ? "Draft can be exported for validated intake, but production eligibility remains false."
              : draftValidation.errors.slice(0, 4).map((error) => error.message).join(" ")}
          </Alert>
        ) : null}
      </Card>
    </section>
  );
}

function BooleanFilter({
  label,
  value,
  onChange
}: {
  label: string;
  value: "all" | "yes" | "no";
  onChange: (value: "all" | "yes" | "no") => void;
}) {
  return (
    <SelectField label={label} value={value} onChange={(event) => onChange(event.currentTarget.value as "all" | "yes" | "no")}>
      <option value="all">all</option>
      <option value="yes">yes</option>
      <option value="no">no</option>
    </SelectField>
  );
}

function CheckboxField({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="form-field checkbox-field">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
    </label>
  );
}

function queueFlags(record: Cf27ProductionVerificationQueueRecord) {
  return [
    record.missingViews.length > 0 ? "missing views" : "",
    record.duplicateOrNearDuplicateFlag ? "duplicate" : "",
    record.dependencyFlag ? "dependency" : "",
    record.versionOrEnvironmentGap ? "environment gap" : "",
    record.primaryReviewStatus === "ORDER_UNRESOLVED" ? "order unresolved" : ""
  ].filter(Boolean);
}
