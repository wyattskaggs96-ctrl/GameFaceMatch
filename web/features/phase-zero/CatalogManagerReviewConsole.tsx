"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, ScreenHeader, SelectField, StatusBadge, TextField } from "@/components/design-system";
import {
  canApproveReleaseCandidate,
  createCatalogManagerReviewDraft,
  createCatalogManagerReviewDraftStore,
  createCatalogManagerReviewAction,
  createCatalogManagerReviewSession,
  createCatalogManagerValidationRerunSummary,
  createSignedCatalogManagerReviewReport,
  parseCatalogManagerCandidatePackage,
  type CatalogManagerCandidatePackage,
  type CatalogManagerRecordSummary,
  type CatalogManagerReportDecision,
  type CatalogManagerReviewAction,
  type CatalogManagerSignedReviewReport,
  type CatalogManagerValidationRerunSummary,
  type CatalogManagerValidationIssue,
  type CatalogManagerValidationReport
} from "@/lib/phase-zero/catalog-manager-review-console";
import { DEFAULT_CATALOG_TABLE_PAGE_SIZE, createIncrementalProcessingPlan, paginateCollection } from "@/lib/performance/large-evidence-handling";
import { createUnsavedChangeMessage } from "@/lib/recovery/offline-recovery";

export function CatalogManagerReviewConsole() {
  const [packageText, setPackageText] = useState("");
  const [validationText, setValidationText] = useState("");
  const [candidatePackage, setCandidatePackage] = useState<CatalogManagerCandidatePackage | null>(null);
  const [validationReport, setValidationReport] = useState<CatalogManagerValidationReport | undefined>();
  const [parseError, setParseError] = useState<string | null>(null);
  const [actions, setActions] = useState<CatalogManagerReviewAction[]>([]);
  const [selectedRecordID, setSelectedRecordID] = useState("");
  const [reviewerID, setReviewerID] = useState("catalog-manager-local");
  const [actionNote, setActionNote] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [signedReport, setSignedReport] = useState<CatalogManagerSignedReviewReport | null>(null);
  const [recordPage, setRecordPage] = useState(1);
  const [evidencePage, setEvidencePage] = useState(1);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [rerunSummary, setRerunSummary] = useState<CatalogManagerValidationRerunSummary | null>(null);

  const session = useMemo(() => {
    if (!candidatePackage) return null;
    return createCatalogManagerReviewSession({
      candidatePackage,
      validationReport,
      reviewActions: actions,
      importedAt: new Date().toISOString()
    });
  }, [actions, candidatePackage, validationReport]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const draft = createCatalogManagerReviewDraftStore(window.localStorage).load();
    if (!draft) return;
    setPackageText(draft.packageText);
    setValidationText(draft.validationText);
    setActions(draft.actions);
    setSelectedRecordID(draft.selectedRecordID);
    setReviewerID(draft.reviewerID);
    setActionNote(draft.actionNote);
    setReportNotes(draft.reportNotes);
    setDraftMessage(`Recovered local catalog-manager draft from ${new Date(draft.savedAt).toLocaleString()}. Rerun validation before any decision.`);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!packageText.trim() && actions.length === 0 && !validationText.trim()) return;
    const draft = createCatalogManagerReviewDraft({
      packageText,
      validationText,
      reviewerID,
      selectedRecordID,
      actionNote,
      reportNotes,
      actions,
      savedAt: new Date().toISOString()
    });
    createCatalogManagerReviewDraftStore(window.localStorage).save(draft);
    setDraftMessage(`Local catalog-manager draft saved at ${new Date(draft.savedAt).toLocaleTimeString()}.`);
  }, [actionNote, actions, packageText, reportNotes, reviewerID, selectedRecordID, validationText]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      const message = createUnsavedChangeMessage({
        hasUnsavedChanges: Boolean(packageText.trim()) || actions.length > 0,
        workLabel: "Catalog-manager review"
      });
      if (!message) return;
      event.preventDefault();
      event.returnValue = message;
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [actions.length, packageText]);

  function importPackage() {
    try {
      const nextPackage = parseCatalogManagerCandidatePackage(packageText);
      const nextValidation = validationText.trim() ? (JSON.parse(validationText) as CatalogManagerValidationReport) : undefined;
      setCandidatePackage(nextPackage);
      setValidationReport(nextValidation);
      setActions([]);
      setSignedReport(null);
      setRecordPage(1);
      setEvidencePage(1);
      setRerunSummary(null);
      setParseError(null);
      const firstRecordID = (nextPackage.items ?? nextPackage.manifest?.items ?? [])[0]?.stableInternalID;
      setSelectedRecordID(typeof firstRecordID === "string" ? firstRecordID : "");
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Unable to parse candidate package JSON.");
    }
  }

  function addAction(decision: CatalogManagerReviewAction["decision"]) {
    if (!selectedRecordID.trim()) return;
    setActions((current) => [
      ...current,
      createCatalogManagerReviewAction({
        recordID: selectedRecordID,
        decision,
        reviewerID,
        note: actionNote,
        createdAt: new Date().toISOString()
      })
    ]);
    setActionNote("");
    setSignedReport(null);
  }

  async function generateReport(decision: CatalogManagerReportDecision) {
    if (!session) return;
    const report = await createSignedCatalogManagerReviewReport({
      session,
      reviewerID,
      decision,
      notes: reportNotes,
      generatedAt: new Date().toISOString()
    });
    setSignedReport(report);
  }

  function saveDraftNow() {
    if (typeof window === "undefined") return;
    const draft = createCatalogManagerReviewDraft({
      packageText,
      validationText,
      reviewerID,
      selectedRecordID,
      actionNote,
      reportNotes,
      actions,
      savedAt: new Date().toISOString()
    });
    createCatalogManagerReviewDraftStore(window.localStorage).save(draft);
    setDraftMessage(`Local catalog-manager draft saved at ${new Date(draft.savedAt).toLocaleString()}.`);
  }

  function clearDraft() {
    if (typeof window !== "undefined") createCatalogManagerReviewDraftStore(window.localStorage).clear();
    setDraftMessage("Local catalog-manager draft cleared. Current in-memory work remains until this page changes or reloads.");
  }

  function rerunValidation() {
    if (!session) {
      importPackage();
      return;
    }
    setRerunSummary(createCatalogManagerValidationRerunSummary(session, new Date().toISOString()));
  }

  return (
    <section className="screen-stack" aria-labelledby="catalog-manager-review-title">
      <ScreenHeader eyebrow="Development-only catalog manager" title="Catalog-manager review console" id="catalog-manager-review-title">
        <p>
          Import a candidate package, inspect validation gates, review records and evidence, request repairs, and produce a local signed review report.
          This console does not publish data or expose fixtures to production users.
        </p>
      </ScreenHeader>
      <Alert title="Production guard" tone="warning">
        Release-candidate approval remains blocked until every mandatory validation gate passes. This local console cannot override catalog validation.
      </Alert>
      <Alert title="Local recovery" tone="info">
        {draftMessage ?? "Catalog-manager drafts are saved as local JSON metadata only."} Draft review work is not production-ready and must be rerun through validation after recovery.
      </Alert>
      <div className="button-row">
        <Button variant="secondary" onClick={saveDraftNow} disabled={!packageText.trim() && actions.length === 0}>
          Save review draft
        </Button>
        <Button variant="secondary" onClick={rerunValidation} disabled={!packageText.trim() && !session}>
          Rerun validation
        </Button>
        <Button variant="ghost" onClick={clearDraft}>
          Clear saved draft
        </Button>
      </div>
      {rerunSummary ? (
        <Alert title="Validation rerun" tone={rerunSummary.mandatoryGatesPass ? "success" : "warning"} role="status">
          {rerunSummary.message} Unresolved failures: {rerunSummary.unresolvedFailureCount}. Production-ready: no.
        </Alert>
      ) : null}

      <div className="card-grid">
        <Card>
          <h2>Import candidate package</h2>
          <label className="form-field" htmlFor="catalog-manager-package-json">
            <span>Candidate package JSON</span>
            <textarea
              id="catalog-manager-package-json"
              rows={10}
              value={packageText}
              onChange={(event) => setPackageText(event.currentTarget.value)}
              placeholder="Paste a candidate catalog package JSON object."
            />
            <span className="field-note">No production data is created by this import.</span>
          </label>
          <label className="form-field" htmlFor="catalog-manager-validation-json">
            <span>Optional validation report JSON</span>
            <textarea
              id="catalog-manager-validation-json"
              rows={6}
              value={validationText}
              onChange={(event) => setValidationText(event.currentTarget.value)}
              placeholder="Paste machine-readable output from catalog import validation, if available."
            />
          </label>
          <Button onClick={importPackage}>Import package</Button>
          {parseError ? <Alert title="Import failed" tone="danger" role="alert">{parseError}</Alert> : null}
        </Card>

        <Card tone={session?.mandatoryGatesPass ? "success" : "danger"}>
          <div className="status-row">
            <h2>Release-candidate gate</h2>
            <StatusBadge tone={session?.mandatoryGatesPass ? "success" : "danger"}>{session?.releaseCandidateApprovalStatus ?? "not imported"}</StatusBadge>
          </div>
          <dl className="metadata-list">
            <div>
              <dt>Package</dt>
              <dd>{session?.packageID ?? "Not imported"}</dd>
            </div>
            <div>
              <dt>Records</dt>
              <dd>{session?.records.length ?? 0}</dd>
            </div>
            <div>
              <dt>Evidence assets</dt>
              <dd>{session?.evidence.length ?? 0}</dd>
            </div>
            <div>
              <dt>Unresolved failures</dt>
              <dd>{session?.unresolvedFailures.length ?? 0}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {session ? (
        <>
          <Alert title="Large package handling" tone="info">
            {largePackageSummary(session.records.length, session.evidence.length)}
          </Alert>
          <div className="result-grid">
            <ReviewList title="Unresolved failures" issues={session.unresolvedFailures} />
            <Card>
              <h2>Native order</h2>
              <ul className="compact-list">
                {session.nativeOrderGroups.map((group) => (
                  <li key={group.key}>
                    <strong>{group.key}</strong>: <StatusBadge tone={group.status === "pass" ? "success" : "danger"}>{group.status}</StatusBadge>
                    <br />
                    order {group.orderedRecordIDs.join(", ") || "none"}; missing {group.missingOrders.join(", ") || "none"}; duplicate {group.duplicateOrders.join(", ") || "none"}
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h2>Duplicates and notes</h2>
              <dl className="metadata-list">
                <div>
                  <dt>Duplicate observations</dt>
                  <dd>{session.duplicateRecordIDs.join(", ") || "None"}</dd>
                </div>
                <div>
                  <dt>VERIFIED_WITH_NOTES</dt>
                  <dd>{session.verifiedWithNotesRecordIDs.join(", ") || "None"}</dd>
                </div>
              </dl>
            </Card>
          </div>

          <RecordInspector
            records={session.records}
            selectedRecordID={selectedRecordID}
            onSelectedRecordChange={setSelectedRecordID}
            page={recordPage}
            onPageChange={setRecordPage}
          />
          <EvidenceInspector evidence={session.evidence} page={evidencePage} onPageChange={setEvidencePage} />

          <Card>
            <h2>Manager decision</h2>
            <div className="form-grid">
              <TextField label="Reviewer ID" value={reviewerID} onChange={(event) => setReviewerID(event.currentTarget.value)} />
              <SelectField label="Record" value={selectedRecordID} onChange={(event) => setSelectedRecordID(event.currentTarget.value)}>
                <option value="">Select record</option>
                {session.records.map((record) => (
                  <option key={record.stableInternalID} value={record.stableInternalID}>{record.stableInternalID}</option>
                ))}
              </SelectField>
            </div>
            <label className="form-field" htmlFor="catalog-manager-action-note">
              <span>Decision note</span>
              <textarea id="catalog-manager-action-note" rows={3} value={actionNote} onChange={(event) => setActionNote(event.currentTarget.value)} />
            </label>
            <div className="button-row">
              <Button variant="secondary" onClick={() => addAction("acceptVerifiedWithNotes")} disabled={!selectedRecordID}>
                Accept VERIFIED_WITH_NOTES
              </Button>
              <Button variant="secondary" onClick={() => addAction("rejectVerifiedWithNotes")} disabled={!selectedRecordID}>
                Reject VERIFIED_WITH_NOTES
              </Button>
              <Button variant="secondary" onClick={() => addAction("requestRepair")} disabled={!selectedRecordID}>
                Request repair
              </Button>
              <Button variant="danger" onClick={() => addAction("rejectRecord")} disabled={!selectedRecordID}>
                Reject row
              </Button>
            </div>
            <ul className="compact-list">
              {actions.map((action) => (
                <li key={`${action.recordID}-${action.createdAt}-${action.decision}`}>{action.recordID}: {action.decision} · {action.note || "No note"}</li>
              ))}
            </ul>
          </Card>

          <Card tone={canApproveReleaseCandidate(session) ? "success" : "warning"}>
            <h2>Signed review report</h2>
            <label className="form-field" htmlFor="catalog-manager-report-note">
              <span>Report notes</span>
              <textarea id="catalog-manager-report-note" rows={3} value={reportNotes} onChange={(event) => setReportNotes(event.currentTarget.value)} />
            </label>
            <div className="button-row">
              <Button onClick={() => void generateReport("approvedReleaseCandidate")} disabled={!canApproveReleaseCandidate(session)}>
                Approve release candidate
              </Button>
              <Button variant="secondary" onClick={() => void generateReport("repairsRequested")}>Produce repair report</Button>
              <Button variant="danger" onClick={() => void generateReport("rejected")}>Reject package</Button>
            </div>
            {signedReport ? (
              <pre className="code-block" aria-label="Signed catalog manager review report">{JSON.stringify(signedReport, null, 2)}</pre>
            ) : null}
          </Card>
        </>
      ) : null}
    </section>
  );
}

function ReviewList({ title, issues }: { title: string; issues: CatalogManagerValidationIssue[] }) {
  return (
    <Card tone={issues.length > 0 ? "danger" : "success"}>
      <h2>{title}</h2>
      {issues.length === 0 ? (
        <p className="supporting">No unresolved failures.</p>
      ) : (
        <ul className="compact-list">
          {issues.slice(0, 8).map((issue, index) => (
            <li key={`${issue.code}-${issue.recordID ?? index}`}>
              <strong>{issue.code}</strong>: {issue.message}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RecordInspector({
  records,
  selectedRecordID,
  onSelectedRecordChange,
  page,
  onPageChange
}: {
  records: CatalogManagerRecordSummary[];
  selectedRecordID: string;
  onSelectedRecordChange: (recordID: string) => void;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const selected = records.find((record) => record.stableInternalID === selectedRecordID) ?? records[0];
  const pagedRecords = paginateCollection(records, { page, pageSize: DEFAULT_CATALOG_TABLE_PAGE_SIZE });
  const optionRecords = selected && !pagedRecords.items.some((record) => record.stableInternalID === selected.stableInternalID)
    ? [selected, ...pagedRecords.items]
    : pagedRecords.items;
  return (
    <Card>
      <div className="status-row">
        <h2>Record inspector</h2>
        <SelectField label="Inspect record" value={selected?.stableInternalID ?? ""} onChange={(event) => onSelectedRecordChange(event.currentTarget.value)}>
          {optionRecords.map((record) => (
            <option key={record.stableInternalID} value={record.stableInternalID}>{record.stableInternalID}</option>
          ))}
        </SelectField>
      </div>
      {records.length > DEFAULT_CATALOG_TABLE_PAGE_SIZE ? (
        <div className="button-row" aria-label="Catalog record pagination">
          <Button variant="secondary" disabled={!pagedRecords.hasPreviousPage} onClick={() => onPageChange(Math.max(1, page - 1))}>
            Previous records
          </Button>
          <span className="supporting" aria-live="polite">
            Showing records {pagedRecords.startIndex + 1}-{pagedRecords.endIndexExclusive} of {pagedRecords.totalItems}
          </span>
          <Button variant="secondary" disabled={!pagedRecords.hasNextPage} onClick={() => onPageChange(page + 1)}>
            Next records
          </Button>
        </div>
      ) : null}
      {selected ? (
        <dl className="metadata-list">
          <div><dt>Category</dt><dd>{selected.category}</dd></div>
          <div><dt>Native order</dt><dd>{selected.nativeOrder ?? "Missing"}</dd></div>
          <div><dt>Visible label/index</dt><dd>{selected.visibleGameLabelOrIndex || "Missing"}</dd></div>
          <div><dt>Verification</dt><dd>{selected.verificationState}</dd></div>
          <div><dt>Evidence count</dt><dd>{selected.evidenceCount}</dd></div>
          <div><dt>Missing views</dt><dd>{selected.missingRequiredAngles.join(", ") || "None"}</dd></div>
          <div><dt>Navigation evidence</dt><dd>{selected.missingNavigationEvidence ? "Missing" : "Present"}</dd></div>
          <div><dt>Placeholder</dt><dd>{selected.hasPlaceholder ? "Reject" : "No"}</dd></div>
        </dl>
      ) : null}
    </Card>
  );
}

function EvidenceInspector({
  evidence,
  page,
  onPageChange
}: {
  evidence: Array<{ assetID: string; angle: string; relativePath: string; sha256: string; referencedByRecordIDs: string[] }>;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const pagedEvidence = paginateCollection(evidence, { page, pageSize: DEFAULT_CATALOG_TABLE_PAGE_SIZE });
  return (
    <Card>
      <h2>Evidence inspector</h2>
      {evidence.length === 0 ? (
        <p className="supporting">No evidence assets imported.</p>
      ) : (
        <>
          {evidence.length > DEFAULT_CATALOG_TABLE_PAGE_SIZE ? (
            <div className="button-row" aria-label="Catalog evidence pagination">
              <Button variant="secondary" disabled={!pagedEvidence.hasPreviousPage} onClick={() => onPageChange(Math.max(1, page - 1))}>
                Previous evidence
              </Button>
              <span className="supporting" aria-live="polite">
                Showing evidence {pagedEvidence.startIndex + 1}-{pagedEvidence.endIndexExclusive} of {pagedEvidence.totalItems}
              </span>
              <Button variant="secondary" disabled={!pagedEvidence.hasNextPage} onClick={() => onPageChange(page + 1)}>
                Next evidence
              </Button>
            </div>
          ) : null}
          <ul className="compact-list">
            {pagedEvidence.items.map((asset) => (
              <li key={asset.assetID}>
                <strong>{asset.assetID}</strong> · {asset.angle} · {asset.relativePath || "missing path"} · referenced by {asset.referencedByRecordIDs.join(", ") || "none"}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function largePackageSummary(recordCount: number, evidenceCount: number) {
  const plan = createIncrementalProcessingPlan({
    totalItems: recordCount + evidenceCount,
    largeItemCount: evidenceCount,
    chunkSize: DEFAULT_CATALOG_TABLE_PAGE_SIZE
  });
  return `Review uses paged tables of ${DEFAULT_CATALOG_TABLE_PAGE_SIZE} rows. Validation should process ${plan.totalItems} records/assets in ${plan.chunkCount} chunks${plan.workerRecommended ? " and prefer worker or background execution for heavy checks." : "."}`;
}
