"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createEmptyOwnerBuddyTrialDashboardStore,
  createOwnerBuddyTrialExport,
  createOwnerBuddyTrialProgress,
  createOwnerBuddyTrialRecord,
  OWNER_BUDDY_TRIAL_DASHBOARD_STORAGE_KEY,
  parseOwnerBuddyTrialDashboardStore,
  readBuddyTrialSessionFromStorage,
  serializeOwnerBuddyTrialDashboardStore,
  summarizeOwnerBuddyTrialProgress,
  updateOwnerBuddyTrialRecord,
  validateOwnerBuddyTrialExport,
  type OwnerBetaReviewDisposition,
  type OwnerBuddyTrialProgress,
  type OwnerBuddyTrialRecord,
  type OwnerInterventionState
} from "@/lib/buddy-trial/buddy-trial-owner-dashboard";
import { createBuddyTrialStorageKey } from "@/lib/buddy-trial/buddy-trial-session";
import { isOwnerReviewDemoEnabled, OWNER_REVIEW_DEMO_BANNER_COPY } from "@/lib/owner-review-demo/owner-review-demo";

const productionCatalogRecordCount = 0;

export function OwnerTrialCommandCenter() {
  const ownerReviewDemoEnabled = isOwnerReviewDemoEnabled({
    NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO: process.env.NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO,
    NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV: process.env.NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV
  });
  const [origin, setOrigin] = useState("http://localhost:3000");
  const [records, setRecords] = useState<OwnerBuddyTrialRecord[]>([]);
  const [selectedInviteID, setSelectedInviteID] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setOrigin(window.location.origin);
    setRecords(parseOwnerBuddyTrialDashboardStore(window.localStorage.getItem(OWNER_BUDDY_TRIAL_DASHBOARD_STORAGE_KEY)).records);
  }, []);

  const rows = useMemo(() => {
    if (typeof window === "undefined") return [] as OwnerBuddyTrialProgress[];
    return records.map((record) =>
      createOwnerBuddyTrialProgress({
        record,
        session: readBuddyTrialSessionFromStorage(record.inviteId, window.localStorage),
        origin
      })
    );
  }, [records, origin, now]);
  const summary = useMemo(() => summarizeOwnerBuddyTrialProgress(rows), [rows]);
  const selected = rows.find((row) => row.record.inviteId === selectedInviteID) ?? rows[0] ?? null;

  function persist(nextRecords: OwnerBuddyTrialRecord[]) {
    setRecords(nextRecords);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        OWNER_BUDDY_TRIAL_DASHBOARD_STORAGE_KEY,
        serializeOwnerBuddyTrialDashboardStore({
          schemaVersion: createEmptyOwnerBuddyTrialDashboardStore().schemaVersion,
          records: nextRecords
        })
      );
    }
    setNow(Date.now());
  }

  function createTrial() {
    const nextRecord = createOwnerBuddyTrialRecord({
      existingRecords: records,
      ownerReviewDemoEnabled,
      now: new Date()
    });
    persist([nextRecord, ...records]);
    setSelectedInviteID(nextRecord.inviteId);
    setCopyStatus(`${nextRecord.label} created.`);
  }

  function updateRecord(inviteId: string, patch: Parameters<typeof updateOwnerBuddyTrialRecord>[1]) {
    persist(records.map((record) => (record.inviteId === inviteId ? updateOwnerBuddyTrialRecord(record, patch) : record)));
  }

  function deleteTrial(row: OwnerBuddyTrialProgress) {
    if (typeof window !== "undefined") window.localStorage.removeItem(createBuddyTrialStorageKey(row.record.inviteId));
    updateRecord(row.record.inviteId, { status: "deleted" });
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(`${label} copied.`);
    } catch {
      setCopyStatus(`${label} ready to copy: ${value}`);
    }
  }

  function exportResults() {
    const payload = createOwnerBuddyTrialExport(rows, new Date());
    const validation = validateOwnerBuddyTrialExport(payload);
    if (!validation.ok) {
      setCopyStatus(`Export blocked: ${validation.errors.join(" ")}`);
      return;
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gameface-owner-beta-research-package-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setCopyStatus(`Export created: ${anchor.download}`);
  }

  return (
    <main className="owner-trial-page">
      <section className="owner-trial-shell" aria-labelledby="owner-trial-title">
        <div className="owner-trial-hero">
          <div>
            <p className="owner-trial-kicker">GameFace Match owner command center</p>
            <h1 id="owner-trial-title">Buddy Trial operations</h1>
            <p>Create private trial links, review beta evidence, record owner dispositions, and export privacy-safe research results.</p>
          </div>
          <button className="owner-trial-create" type="button" onClick={createTrial}>
            Create New Trial
          </button>
        </div>

        <div className="owner-trial-mode-banner" data-mode={ownerReviewDemoEnabled ? "demo" : "real"} role="status">
          {ownerReviewDemoEnabled ? OWNER_REVIEW_DEMO_BANNER_COPY : "Production catalog mode — recommendations remain unavailable until verified records exist."}
          <span>Production catalog records: {productionCatalogRecordCount}</span>
        </div>

        {copyStatus ? (
          <p className="owner-trial-copy-status" role="status">
            {copyStatus}
          </p>
        ) : null}

        {selected ? (
          <section className="owner-trial-created-card" aria-labelledby="owner-trial-created-title">
            <div>
              <span>Latest selected trial</span>
              <h2 id="owner-trial-created-title">{selected.record.label}</h2>
              <p>{selected.inviteLink}</p>
            </div>
            <div className="owner-trial-created-actions">
              <button type="button" onClick={() => copyText(selected.inviteLink, "Invite link")}>
                Copy Invite Link
              </button>
              <button type="button" onClick={() => copyText(selected.textMessage, "Text message")}>
                Copy Text Message
              </button>
            </div>
          </section>
        ) : null}

        <section className="owner-trial-summary" aria-label="Trial summary metrics">
          <Metric label="Invites issued" value={summary.invitesIssued} />
          <Metric label="Trials started" value={summary.trialsStarted} />
          <Metric label="Scans started" value={summary.scanStarted} />
          <Metric label="Scans completed" value={summary.scansCompleted} />
          <Metric label="Scan failures" value={summary.scanFailures} />
          <Metric label="Recommendations" value={summary.recommendationsGenerated} />
          <Metric label="Builds completed" value={summary.buildsCompleted} />
          <Metric label="Game photos" value={summary.gamePhotoUploaded} />
          <Metric label="Photo rate" value={summary.gamePhotoCompletionRate === null ? "—" : `${summary.gamePhotoCompletionRate}%`} />
          <Metric label="Top-one selection" value={summary.topOneSelectionRate === null ? "—" : `${summary.topOneSelectionRate}%`} />
          <Metric label="Top-three proxy" value={summary.topThreeUsefulnessProxy === null ? "—" : `${summary.topThreeUsefulnessProxy}%`} />
          <Metric label="Selected ranks" value={`1:${summary.selectedRankCounts[1]} 2:${summary.selectedRankCounts[2]} 3:${summary.selectedRankCounts[3]}`} />
          <Metric label="Trials completed" value={summary.trialsCompleted} />
          <Metric label="Avg rating" value={summary.averageResemblanceRating === null ? "—" : `${summary.averageResemblanceRating}/5`} />
          <Metric label="Unassisted rate" value={summary.unassistedCompletionRate === null ? "—" : `${summary.unassistedCompletionRate}%`} />
          <Metric label="Deleted" value={summary.deletedTrials} />
          <Metric label="Runtime errors" value={summary.runtimeErrorCount} />
        </section>

        {summary.majorFailureCategories.length ? (
          <section className="owner-trial-failures" aria-label="Major failure categories">
            <h2>Major failure categories</h2>
            <div>
              {summary.majorFailureCategories.map((failure) => (
                <span key={failure.category}>
                  {failure.category}: {failure.count}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="owner-trial-toolbar" aria-label="Owner actions">
          <button type="button" onClick={() => setNow(Date.now())}>
            Refresh Progress
          </button>
          <button type="button" onClick={exportResults} disabled={rows.length === 0}>
            Export Structured Results
          </button>
        </section>

        <section className="owner-trial-table-wrap" aria-labelledby="owner-trial-table-title">
          <h2 id="owner-trial-table-title">Trial table</h2>
          {rows.length === 0 ? (
            <div className="owner-trial-empty">
              <p>No Buddy Trials created yet.</p>
              <button type="button" aria-label="Create new trial from empty state" onClick={createTrial}>
                Create New Trial
              </button>
            </div>
          ) : (
            <table className="owner-trial-table">
              <thead>
                <tr>
                  <th>Trial</th>
                  <th>Mode</th>
                  <th>Invited</th>
                  <th>Opened</th>
                  <th>Consent</th>
                  <th>Scan</th>
                  <th>Recommendation</th>
                  <th>Selected rank</th>
                  <th>Build guide</th>
                  <th>CF27 photos</th>
                  <th>Rating</th>
                  <th>Deletion</th>
                  <th>Complete</th>
                  <th>Errors</th>
                  <th>Disposition</th>
                  <th>Owner intervention</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.record.inviteId}>
                    <th scope="row">
                      <button type="button" className="owner-trial-link-button" onClick={() => setSelectedInviteID(row.record.inviteId)}>
                        {row.record.label}
                      </button>
                      <small>{row.record.status}</small>
                    </th>
                    <td>
                      <span className="owner-trial-mode-pill" data-mode={row.record.mode}>
                        {row.sourceLabel}
                      </span>
                    </td>
                    <StageCell value={row.stages.invited} />
                    <StageCell value={row.stages.opened} />
                    <StageCell value={row.stages.consent} />
                    <StageCell value={row.stages.scan} />
                    <StageCell value={row.stages.recommendation} />
                    <td>{row.reviewEvidence.selectedRecommendation.rank ?? "—"}</td>
                    <StageCell value={row.stages.buildGuide} />
                    <td>{row.reviewEvidence.uploadedCf27OutputImages.length}</td>
                    <td>{row.reviewEvidence.resemblanceRating ? `${row.reviewEvidence.resemblanceRating}/5` : "—"}</td>
                    <td>{row.reviewEvidence.deletionStatus}</td>
                    <StageCell value={row.stages.complete} />
                    <td>{row.errors.length === 0 ? "—" : row.errors.length}</td>
                    <td>
                      <label className="owner-trial-select-label">
                        <span className="sr-only">Owner review disposition for {row.record.label}</span>
                        <select
                          value={row.record.ownerReviewDisposition}
                          onChange={(event) =>
                            updateRecord(row.record.inviteId, { ownerReviewDisposition: event.currentTarget.value as OwnerBetaReviewDisposition })
                          }
                        >
                          <option value="unreviewed">Unreviewed</option>
                          <option value="good_match">Good match</option>
                          <option value="needs_matcher_adjustment">Needs matcher adjustment</option>
                          <option value="catalog_issue">Catalog issue</option>
                          <option value="scan_issue">Scan issue</option>
                          <option value="unclear">Unclear</option>
                          <option value="exclude_from_learning">Exclude from learning</option>
                        </select>
                      </label>
                    </td>
                    <td>
                      <label className="owner-trial-select-label">
                        <span className="sr-only">Owner intervention for {row.record.label}</span>
                        <select
                          value={row.record.ownerIntervention}
                          onChange={(event) =>
                            updateRecord(row.record.inviteId, { ownerIntervention: event.currentTarget.value as OwnerInterventionState })
                          }
                        >
                          <option value="unknown">Unknown</option>
                          <option value="unassisted">Unassisted</option>
                          <option value="owner_helped">Owner helped</option>
                        </select>
                      </label>
                    </td>
                    <td>
                      <div className="owner-trial-row-actions">
                        <button type="button" onClick={() => copyText(row.inviteLink, "Invite link")}>
                          Copy link
                        </button>
                        <button type="button" onClick={() => copyText(row.textMessage, "Text message")}>
                          Copy text
                        </button>
                        <button type="button" onClick={() => updateRecord(row.record.inviteId, { status: "expired" })}>
                          Expire
                        </button>
                        <button type="button" onClick={() => updateRecord(row.record.inviteId, { status: "revoked" })}>
                          Revoke
                        </button>
                        <button type="button" onClick={() => deleteTrial(row)}>
                          Delete trial
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {selected ? (
          <section className="owner-trial-detail" aria-labelledby="owner-trial-detail-title">
            <h2 id="owner-trial-detail-title">Inspect progress</h2>
            <p>
              {selected.record.label} is in state <strong>{selected.session?.state ?? "NOT_OPENED"}</strong>. Raw face images and raw videos are not shown here.
            </p>
            <div className="owner-trial-review-grid">
              <BetaReviewPanel row={selected} />
            </div>
            <label>
              <span>Owner review disposition</span>
              <select
                value={selected.record.ownerReviewDisposition}
                onChange={(event) => updateRecord(selected.record.inviteId, { ownerReviewDisposition: event.currentTarget.value as OwnerBetaReviewDisposition })}
              >
                <option value="unreviewed">Unreviewed</option>
                <option value="good_match">Good match</option>
                <option value="needs_matcher_adjustment">Needs matcher adjustment</option>
                <option value="catalog_issue">Catalog issue</option>
                <option value="scan_issue">Scan issue</option>
                <option value="unclear">Unclear</option>
                <option value="exclude_from_learning">Exclude from learning</option>
              </select>
            </label>
            <label>
              <span>Owner review notes</span>
              <textarea
                value={selected.record.ownerReviewNotes ?? ""}
                rows={3}
                onChange={(event) => updateRecord(selected.record.inviteId, { ownerReviewNotes: event.currentTarget.value })}
                placeholder="What should improve before the next tester?"
              />
            </label>
            <label>
              <span>Owner intervention notes</span>
              <textarea
                value={selected.record.ownerInterventionNotes ?? ""}
                rows={3}
                onChange={(event) => updateRecord(selected.record.inviteId, { ownerInterventionNotes: event.currentTarget.value })}
                placeholder="Optional note if Wyatt had to help."
              />
            </label>
            <div className="owner-trial-history" aria-label="Session history">
              {(selected.session?.history ?? []).map((entry) => (
                <p key={`${entry.at}-${entry.state}`}>
                  <strong>{entry.state}</strong>
                  <span>{entry.at}</span>
                  <span>{entry.note}</span>
                </p>
              ))}
              {!selected.session ? <p>No session has opened for this invite yet.</p> : null}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function BetaReviewPanel({ row }: { row: OwnerBuddyTrialProgress }) {
  const evidence = row.reviewEvidence;
  return (
    <>
      <article>
        <h3>Tester</h3>
        <dl>
          <DetailTerm label="Tester ID" value={evidence.pseudonymousTesterID} />
          <DetailTerm label="Evidence status" value={evidence.evidence.status} />
          <DetailTerm label="Catalog version" value={evidence.evidence.catalogVersionID ?? "Not available"} />
          <DetailTerm label="Recommendation version" value={evidence.evidence.recommendationVersion ?? "Not available"} />
          <DetailTerm label="Deletion" value={evidence.deletionStatus} />
        </dl>
      </article>
      <article>
        <h3>Capture</h3>
        <dl>
          <DetailTerm label="Scan started" value={evidence.captureQuality.scanStarted ? "Yes" : "No"} />
          <DetailTerm label="Scan completed" value={evidence.captureQuality.scanCompleted ? "Yes" : "No"} />
          <DetailTerm label="Quality score" value={evidence.captureQuality.overallQualityScore ?? "Not recorded"} />
          <DetailTerm label="RGB browser scan" value={evidence.captureQuality.browserRgbOnly === null ? "Unknown" : evidence.captureQuality.browserRgbOnly ? "Yes" : "No"} />
        </dl>
        {evidence.captureQuality.qualityWarnings.length ? (
          <ul>
            {evidence.captureQuality.qualityWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </article>
      <article>
        <h3>Top three</h3>
        {evidence.topThreeRecommendations.length ? (
          <ol>
            {evidence.topThreeRecommendations.map((recommendation) => (
              <li key={recommendation.catalogItemID}>
                <strong>#{recommendation.rank}</strong> {recommendation.label} <span>{recommendation.score}/100</span>
              </li>
            ))}
          </ol>
        ) : (
          <p>No recommendation list is stored for this mode yet.</p>
        )}
        <p>Selected: {evidence.selectedRecommendation.rank ? `#${evidence.selectedRecommendation.rank} ${evidence.selectedRecommendation.label ?? ""}` : "Not submitted"}</p>
      </article>
      <article>
        <h3>CF27 output images</h3>
        {evidence.uploadedCf27OutputImages.length ? (
          <ul className="owner-trial-image-list">
            {evidence.uploadedCf27OutputImages.map((image) => (
              <li key={image.photoID}>
                <strong>{image.label}</strong>
                <span>{image.width}x{image.height}, {Math.round(image.sizeBytes / 1024)} KB</span>
                <code>{image.storageBucket}/{image.objectPath}</code>
              </li>
            ))}
          </ul>
        ) : (
          <p>No CF27 result image has been submitted.</p>
        )}
      </article>
      <article>
        <h3>Tester feedback</h3>
        <dl>
          <DetailTerm label="Rating" value={evidence.resemblanceRating ? `${evidence.resemblanceRating}/5` : "Not submitted"} />
          <DetailTerm label="Most wrong" value={evidence.testerMismatch ?? "Not submitted"} />
          <DetailTerm label="Notes" value={evidence.testerNotes ?? "None"} />
          <DetailTerm label="Changed settings" value={evidence.changedSettingsManually === null ? "Not answered" : evidence.changedSettingsManually ? "Yes" : "No"} />
          <DetailTerm label="Manual changes" value={evidence.manualSettingChangeSummary ?? "None"} />
        </dl>
      </article>
      <article>
        <h3>Research signals</h3>
        {evidence.experimentalRefinementSignals.length ? (
          <ul>
            {evidence.experimentalRefinementSignals.map((signal) => (
              <li key={`${signal.modelVersion}-${signal.status}`}>
                <strong>{signal.status}</strong>
                <span>{signal.summary}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No experimental refinement signal is attached.</p>
        )}
      </article>
    </>
  );
}

function DetailTerm({ label, value }: { label: string; value: string | number }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function StageCell({ value }: { value: boolean }) {
  return (
    <td>
      <span className="owner-trial-stage" data-complete={value ? "true" : "false"}>
        {value ? "Yes" : "No"}
      </span>
    </td>
  );
}
