"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, ScreenHeader, SelectField, StatusBadge, TextField } from "@/components/design-system";
import {
  canApproveReleaseCandidate,
  createCatalogManagerReviewAction,
  createCatalogManagerReviewSession,
  createSignedCatalogManagerReviewReport,
  parseCatalogManagerCandidatePackage,
  type CatalogManagerCandidatePackage,
  type CatalogManagerRecordSummary,
  type CatalogManagerReportDecision,
  type CatalogManagerReviewAction,
  type CatalogManagerSignedReviewReport,
  type CatalogManagerValidationIssue,
  type CatalogManagerValidationReport
} from "@/lib/phase-zero/catalog-manager-review-console";

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

  const session = useMemo(() => {
    if (!candidatePackage) return null;
    return createCatalogManagerReviewSession({
      candidatePackage,
      validationReport,
      reviewActions: actions,
      importedAt: new Date().toISOString()
    });
  }, [actions, candidatePackage, validationReport]);

  function importPackage() {
    try {
      const nextPackage = parseCatalogManagerCandidatePackage(packageText);
      const nextValidation = validationText.trim() ? (JSON.parse(validationText) as CatalogManagerValidationReport) : undefined;
      setCandidatePackage(nextPackage);
      setValidationReport(nextValidation);
      setActions([]);
      setSignedReport(null);
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

          <RecordInspector records={session.records} selectedRecordID={selectedRecordID} onSelectedRecordChange={setSelectedRecordID} />
          <EvidenceInspector evidence={session.evidence} />

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
  onSelectedRecordChange
}: {
  records: CatalogManagerRecordSummary[];
  selectedRecordID: string;
  onSelectedRecordChange: (recordID: string) => void;
}) {
  const selected = records.find((record) => record.stableInternalID === selectedRecordID) ?? records[0];
  return (
    <Card>
      <div className="status-row">
        <h2>Record inspector</h2>
        <SelectField label="Inspect record" value={selected?.stableInternalID ?? ""} onChange={(event) => onSelectedRecordChange(event.currentTarget.value)}>
          {records.map((record) => (
            <option key={record.stableInternalID} value={record.stableInternalID}>{record.stableInternalID}</option>
          ))}
        </SelectField>
      </div>
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

function EvidenceInspector({ evidence }: { evidence: Array<{ assetID: string; angle: string; relativePath: string; sha256: string; referencedByRecordIDs: string[] }> }) {
  return (
    <Card>
      <h2>Evidence inspector</h2>
      {evidence.length === 0 ? (
        <p className="supporting">No evidence assets imported.</p>
      ) : (
        <ul className="compact-list">
          {evidence.slice(0, 10).map((asset) => (
            <li key={asset.assetID}>
              <strong>{asset.assetID}</strong> · {asset.angle} · {asset.relativePath || "missing path"} · referenced by {asset.referencedByRecordIDs.join(", ") || "none"}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
