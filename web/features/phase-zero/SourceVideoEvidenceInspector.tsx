"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, LoadingState, ScreenHeader, SelectField, StatusBadge } from "@/components/design-system";
import {
  appendSourceVideoReviewAction,
  createEvidencePreviewURL,
  createSourceVideoEvidenceInspectorModel,
  createSourceVideoReviewAuditLog,
  summarizeSourceVideoReviewActions,
  type SourceVideoInspectorOption,
  type SourceVideoInspectorRecord,
  type SourceVideoReviewAuditLog,
  type SourceVideoReviewDecision
} from "@/lib/phase-zero/source-video-evidence-inspector";
import type { CurrentResearchCatalogData, EvidenceManifestEntry } from "@/lib/phase-zero/current-evidence-gallery";

const sourceVideoAuditLogStorageKey = "gameface-match.phase0.source-video-review-audit.v1";

const categoryLabels: Record<string, string> = {
  heads: "Head Templates",
  skin_tones: "Skin Tone",
  skin_details: "Skin Details",
  eye_shapes: "Eye Shape",
  eye_colors: "Eye Color",
  noses: "Nose",
  ear_shapes: "Ear Shape"
};

export function SourceVideoEvidenceInspector() {
  const [researchData, setResearchData] = useState<CurrentResearchCatalogData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/internal/current-research-catalog", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Current research catalog metadata is unavailable.");
        return response.json() as Promise<CurrentResearchCatalogData>;
      })
      .then((data) => {
        if (!cancelled) {
          setResearchData(data);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Current research catalog metadata could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const model = useMemo(
    () => (researchData ? createSourceVideoEvidenceInspectorModel(researchData) : null),
    [researchData]
  );
  const categories = useMemo(() => (model ? [...new Set(model.records.map((record) => record.categoryExport))].sort() : []), [model]);
  const [category, setCategory] = useState("all");
  const records = useMemo(
    () => (model ? (category === "all" ? model.records : model.records.filter((record) => record.categoryExport === category)) : []),
    [category, model]
  );
  const [selectedRecordID, setSelectedRecordID] = useState(records[0]?.stableInternalID ?? "");
  const selectedRecord = records.find((record) => record.stableInternalID === selectedRecordID) ?? records[0] ?? null;

  useEffect(() => {
    if (records.length > 0 && !records.some((record) => record.stableInternalID === selectedRecordID)) {
      setSelectedRecordID(records[0].stableInternalID);
    }
  }, [records, selectedRecordID]);

  function handleCategoryChange(nextCategory: string) {
    if (!model) return;
    setCategory(nextCategory);
    const nextRecords = nextCategory === "all" ? model.records : model.records.filter((record) => record.categoryExport === nextCategory);
    setSelectedRecordID(nextRecords[0]?.stableInternalID ?? "");
  }

  if (loadError) {
    return (
      <section className="screen-stack" aria-labelledby="source-video-evidence-inspector-title">
        <ScreenHeader eyebrow="Internal catalog review" title="Source video evidence inspector" id="source-video-evidence-inspector-title">
          <p>Open locally available source videos and preserve review actions in a local audit log.</p>
        </ScreenHeader>
        <Alert title="Research metadata unavailable" tone="warning" role="alert">
          {loadError}
        </Alert>
      </section>
    );
  }

  if (!model) {
    return <LoadingState label="Loading source video evidence inspector" />;
  }

  return (
    <section className="screen-stack" aria-labelledby="source-video-evidence-inspector-title">
      <ScreenHeader eyebrow="Internal catalog review" title="Source video evidence inspector" id="source-video-evidence-inspector-title">
        <p>
          Open locally available source videos, seek to recorded evidence timestamps, compare menu and character-frame derivatives, and preserve review actions
          in a local audit log. This tool never uploads or publicly streams source media.
        </p>
      </ScreenHeader>
      <Alert title="PRIMARY RESEARCH REVIEW — NOT PRODUCTION VERIFICATION" tone="warning" role="alert">
        Review decisions here help the catalog workflow, but they do not create verified production records or enable recommendations.
      </Alert>
      <div className="card-grid">
        <Card>
          <h2>Records</h2>
          <dl className="metadata-list">
            <div>
              <dt>Reviewable records</dt>
              <dd>{model.records.length}</dd>
            </div>
            <div>
              <dt>With source timestamps</dt>
              <dd>{model.records.filter((record) => record.sourceVideoOptions.length > 0).length}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2>Filter</h2>
          <SelectField label="Category" value={category} onChange={(event) => handleCategoryChange(event.currentTarget.value)}>
            <option value="all">All categories</option>
            {categories.map((categoryID) => (
              <option key={categoryID} value={categoryID}>
                {categoryLabels[categoryID] ?? categoryID}
              </option>
            ))}
          </SelectField>
        </Card>
        <Card tone="info">
          <h2>Source policy</h2>
          <p className="supporting">The video endpoint is disabled in production and only serves known local inventory IDs when the reviewer has the master file.</p>
        </Card>
      </div>
      <div className="source-video-inspector-layout">
        <Card className="evidence-record-list" aria-label="Research records for source-video inspection">
          <div className="status-row">
            <h2>{category === "all" ? "All records" : categoryLabels[category] ?? category}</h2>
            <StatusBadge tone="info">{records.length}</StatusBadge>
          </div>
          <div className="evidence-record-buttons">
            {records.map((record) => (
              <button
                key={record.stableInternalID}
                type="button"
                className="evidence-record-button"
                aria-current={record.stableInternalID === selectedRecord?.stableInternalID ? "true" : undefined}
                onClick={() => setSelectedRecordID(record.stableInternalID)}
              >
                <span>{record.nativeOrder ?? "?"}</span>
                <strong>{record.nativeLabel}</strong>
                <small>{record.stableInternalID}</small>
              </button>
            ))}
          </div>
        </Card>
        {selectedRecord ? <SourceVideoInspectorDetail record={selectedRecord} /> : null}
      </div>
    </section>
  );
}

function SourceVideoInspectorDetail({ record }: { record: SourceVideoInspectorRecord }) {
  const [selectedSourceVideoIndex, setSelectedSourceVideoIndex] = useState("0");
  const selectedSourceVideoOptionIndex = Number(selectedSourceVideoIndex);
  const selectedVideoOption =
    record.sourceVideoOptions[Number.isFinite(selectedSourceVideoOptionIndex) ? selectedSourceVideoOptionIndex : 0] ?? record.sourceVideoOptions[0] ?? null;
  const comparisonGroup = record.comparisonGroups.find((group) => group.sourceVideoID === selectedVideoOption?.sourceVideoID) ?? record.comparisonGroups[0] ?? null;
  const evidenceChoices = [...record.menuEvidence, ...record.angleViews];
  const [selectedEvidenceID, setSelectedEvidenceID] = useState(record.derivativePreview?.evidenceID ?? evidenceChoices[0]?.evidenceID ?? "");
  const selectedEvidence = evidenceChoices.find((entry) => entry.evidenceID === selectedEvidenceID) ?? evidenceChoices[0] ?? null;
  const [auditLog, setAuditLog] = useState<SourceVideoReviewAuditLog>(() => loadAuditLog());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewURL = createEvidencePreviewURL(selectedEvidence);
  const actionSummary = summarizeSourceVideoReviewActions(auditLog);

  useEffect(() => {
    setSelectedSourceVideoIndex("0");
    setSelectedEvidenceID(record.derivativePreview?.evidenceID ?? evidenceChoices[0]?.evidenceID ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.stableInternalID]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(sourceVideoAuditLogStorageKey, JSON.stringify(auditLog));
  }, [auditLog]);

  function jumpTo(seconds: number | null) {
    if (seconds === null || !videoRef.current) return;
    videoRef.current.currentTime = seconds;
    void videoRef.current.play().catch(() => {
      // Browser autoplay rules may require an explicit user play gesture after seeking.
    });
  }

  function recordReviewAction(actionType: SourceVideoReviewDecision) {
    const nextLog = appendSourceVideoReviewAction(auditLog, {
      actionType,
      catalogID: record.stableInternalID,
      evidenceID: selectedEvidence?.evidenceID ?? null,
      sourceVideoID: selectedVideoOption?.sourceVideoID ?? selectedEvidence?.sourceVideo ?? null,
      timestampSeconds: selectedVideoOption?.exactTimestampSeconds ?? selectedEvidence?.timestamp ?? null,
      createdAt: new Date().toISOString(),
      notes: createReviewNote(actionType, record, selectedEvidence)
    });
    setAuditLog(nextLog);
  }

  return (
    <Card className="source-video-detail-card">
      <div className="status-row">
        <div>
          <p className="eyebrow">{record.categoryLabel}</p>
          <h2>
            {record.nativeOrder ?? "?"}. {record.nativeLabel}
          </h2>
        </div>
        <StatusBadge tone="warning">research only</StatusBadge>
      </div>
      <dl className="metadata-list">
        <div>
          <dt>Stable ID</dt>
          <dd>{record.stableInternalID}</dd>
        </div>
        <div>
          <dt>Research status</dt>
          <dd>{record.researchStatus}</dd>
        </div>
        <div>
          <dt>Production access</dt>
          <dd>{record.productionStatus}</dd>
        </div>
      </dl>
      <div className="source-video-review-grid">
        <section className="source-video-panel" aria-labelledby={`${record.stableInternalID}-video-heading`}>
          <div className="status-row">
            <h3 id={`${record.stableInternalID}-video-heading`}>Source video</h3>
            <StatusBadge tone={selectedVideoOption ? "info" : "warning"}>{selectedVideoOption?.sourceVideoID ?? "no source"}</StatusBadge>
          </div>
          {record.sourceVideoOptions.length > 0 ? (
            <SelectField label="Timestamp reference" value={selectedSourceVideoIndex} onChange={(event) => setSelectedSourceVideoIndex(event.currentTarget.value)}>
              {record.sourceVideoOptions.map((option, index) => (
                <option key={`${option.sourceVideoID}-${option.exactTimestampSeconds}-${option.basis}`} value={String(index)}>
                  {option.sourceFilename ?? option.sourceVideoID} @ {option.exactTimestampSeconds ?? "unknown"}s
                </option>
              ))}
            </SelectField>
          ) : (
            <p className="supporting">No source-video timestamp is linked to this record.</p>
          )}
          {selectedVideoOption?.localVideoURL ? (
            <video
              key={selectedVideoOption.sourceVideoID}
              ref={videoRef}
              className="source-video-player"
              controls
              preload="metadata"
              src={`${selectedVideoOption.localVideoURL}${selectedVideoOption.exactTimestampSeconds === null ? "" : `#t=${selectedVideoOption.exactTimestampSeconds}`}`}
            >
              Source video preview is not supported by this browser.
            </video>
          ) : (
            <div className="empty-thumb">Local source video unavailable</div>
          )}
          <div className="review-action-row">
            <Button variant="secondary" disabled={!selectedVideoOption} onClick={() => jumpTo(selectedVideoOption?.exactTimestampSeconds ?? null)}>
              Jump to exact timestamp
            </Button>
            <Button variant="secondary" disabled={!selectedVideoOption} onClick={() => jumpTo(selectedVideoOption?.surroundingStartSeconds ?? null)}>
              View surrounding seconds
            </Button>
          </div>
          {selectedVideoOption ? (
            <p className="supporting">
              Surrounding window: {selectedVideoOption.surroundingStartSeconds ?? "unknown"}s to {selectedVideoOption.surroundingEndSeconds ?? "unknown"}s.
            </p>
          ) : null}
        </section>
        <section className="source-video-panel" aria-labelledby={`${record.stableInternalID}-comparison-heading`}>
          <h3 id={`${record.stableInternalID}-comparison-heading`}>Menu and character-frame comparison</h3>
          <EvidenceFrameGroup title="Menu frames" entries={comparisonGroup?.menuFrames ?? []} selectedEvidenceID={selectedEvidenceID} onSelect={setSelectedEvidenceID} />
          <EvidenceFrameGroup
            title="Extracted character frames"
            entries={comparisonGroup?.characterFrames ?? []}
            selectedEvidenceID={selectedEvidenceID}
            onSelect={setSelectedEvidenceID}
          />
          <div className="evidence-preview-panel">
            {previewURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewURL} alt={`${record.nativeLabel} selected derivative evidence preview`} />
            ) : (
              <div className="empty-thumb">No selected derivative preview</div>
            )}
            <p className="supporting">{selectedEvidence?.relativePath ?? "No derivative selected."}</p>
          </div>
        </section>
      </div>
      <section className="source-video-panel" aria-labelledby={`${record.stableInternalID}-review-actions`}>
        <h3 id={`${record.stableInternalID}-review-actions`}>Review actions</h3>
        <div className="review-action-row">
          <Button onClick={() => recordReviewAction("approvedDerivative")}>Approve derivative</Button>
          <Button variant="secondary" onClick={() => recordReviewAction("rejectedDerivative")}>Reject derivative</Button>
          <Button variant="secondary" onClick={() => recordReviewAction("incorrectOptionAssociation")}>Incorrect option association</Button>
          <Button variant="danger" onClick={() => recordReviewAction("recaptureRequested")}>Request recapture</Button>
        </div>
        <dl className="metadata-list">
          <div>
            <dt>Total audit actions</dt>
            <dd>{actionSummary.totalActions}</dd>
          </div>
          <div>
            <dt>Approved</dt>
            <dd>{actionSummary.approvedDerivatives}</dd>
          </div>
          <div>
            <dt>Rejected</dt>
            <dd>{actionSummary.rejectedDerivatives}</dd>
          </div>
          <div>
            <dt>Recaptures</dt>
            <dd>{actionSummary.recaptureRequests}</dd>
          </div>
        </dl>
        <pre className="code-block" aria-label="Local source-video review audit log">
          {JSON.stringify(auditLog, null, 2)}
        </pre>
      </section>
    </Card>
  );
}

function EvidenceFrameGroup({
  title,
  entries,
  selectedEvidenceID,
  onSelect
}: {
  title: string;
  entries: EvidenceManifestEntry[];
  selectedEvidenceID: string;
  onSelect: (evidenceID: string) => void;
}) {
  return (
    <div className="evidence-subsection">
      <h4>{title}</h4>
      {entries.length === 0 ? (
        <p className="supporting">No frames linked for this source video.</p>
      ) : (
        <div className="evidence-view-grid">
          {entries.map((entry) => (
            <button
              key={entry.evidenceID}
              type="button"
              className="evidence-view-button"
              aria-current={entry.evidenceID === selectedEvidenceID ? "true" : undefined}
              onClick={() => onSelect(entry.evidenceID)}
            >
              <strong>{entry.view ?? entry.fileRole}</strong>
              <span>{entry.timestamp ?? "?"}s · {entry.evidenceID}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function loadAuditLog() {
  if (typeof window === "undefined") return createSourceVideoReviewAuditLog();
  const serialized = window.sessionStorage.getItem(sourceVideoAuditLogStorageKey);
  if (!serialized) return createSourceVideoReviewAuditLog();
  try {
    const parsed = JSON.parse(serialized) as SourceVideoReviewAuditLog;
    if (parsed.schemaVersion !== "source-video-evidence-inspector-v1" || !Array.isArray(parsed.actions)) return createSourceVideoReviewAuditLog();
    return parsed;
  } catch {
    return createSourceVideoReviewAuditLog();
  }
}

function createReviewNote(actionType: SourceVideoReviewDecision, record: SourceVideoInspectorRecord, evidence: EvidenceManifestEntry | null) {
  const evidenceLabel = evidence?.evidenceID ?? "no selected evidence";
  if (actionType === "approvedDerivative") return `Reviewer approved ${evidenceLabel} for ${record.stableInternalID}.`;
  if (actionType === "rejectedDerivative") return `Reviewer rejected ${evidenceLabel} for ${record.stableInternalID}.`;
  if (actionType === "incorrectOptionAssociation") return `Reviewer marked ${evidenceLabel} as incorrectly associated with ${record.stableInternalID}.`;
  return `Reviewer requested recapture for ${record.stableInternalID} based on ${evidenceLabel}.`;
}
