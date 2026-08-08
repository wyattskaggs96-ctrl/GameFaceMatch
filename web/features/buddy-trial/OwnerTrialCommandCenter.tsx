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
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gameface-owner-trial-results-${new Date().toISOString().slice(0, 10)}.json`;
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
            <p>
              Create private trial links, track progress, record whether Wyatt had to help, and export structured results without opening Terminal or a
              database.
            </p>
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
          <Metric label="Trials started" value={summary.trialsStarted} />
          <Metric label="Scans completed" value={summary.scansCompleted} />
          <Metric label="Builds completed" value={summary.buildsCompleted} />
          <Metric label="Video #1" value={summary.videoOneCompletion} />
          <Metric label="Refinement" value={summary.refinementCompletion} />
          <Metric label="Trials completed" value={summary.trialsCompleted} />
          <Metric label="Avg initial score" value={formatMetric(summary.averageInitialScore)} />
          <Metric label="Avg final score" value={formatMetric(summary.averageFinalScore)} />
          <Metric label="Avg improvement" value={formatSignedMetric(summary.averageImprovement)} />
          <Metric label="Avg rating" value={summary.averageResemblanceRating === null ? "—" : `${summary.averageResemblanceRating}/10`} />
          <Metric label="Unassisted rate" value={summary.unassistedCompletionRate === null ? "—" : `${summary.unassistedCompletionRate}%`} />
        </section>

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
                  <th>Build guide</th>
                  <th>Video #1</th>
                  <th>Refinement</th>
                  <th>Video #2</th>
                  <th>Final score</th>
                  <th>Rating</th>
                  <th>Complete</th>
                  <th>Errors</th>
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
                    <StageCell value={row.stages.buildGuide} />
                    <StageCell value={row.stages.videoOne} />
                    <StageCell value={row.stages.refinement} />
                    <StageCell value={row.stages.videoTwo} />
                    <td>{row.finalScore ?? "—"}</td>
                    <td>{row.resemblanceRating ? `${row.resemblanceRating}/10` : "—"}</td>
                    <StageCell value={row.stages.complete} />
                    <td>{row.errors.length === 0 ? "—" : row.errors.length}</td>
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

function formatMetric(value: number | null) {
  return value === null ? "—" : value;
}

function formatSignedMetric(value: number | null) {
  if (value === null) return "—";
  return value > 0 ? `+${value}` : value;
}
