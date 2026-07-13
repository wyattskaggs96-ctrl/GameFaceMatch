"use client";

import { useMemo, useState } from "react";
import { Alert, Card, ScreenHeader, SelectField, StatusBadge } from "@/components/design-system";
import {
  createCurrentEvidenceGallerySummary,
  createDerivativePreviewURL,
  createTimestampReferenceLabel,
  filterGalleryRecords,
  type CurrentEvidenceGalleryRecord,
  type EvidenceManifestEntry,
  type ImportedResearchCatalogRecord,
  type CaptureLogEvent
} from "@/lib/phase-zero/current-evidence-gallery";
import importedCatalog from "../../../data/research/cf27/catalog-candidates/research/partial-catalog-import-current/imported_research_catalog.json";
import evidenceManifest from "../../../data/research/cf27/exports/partial-research-catalog-current/evidence_manifest.json";
import captureLog from "../../../data/research/cf27/exports/partial-research-catalog-current/capture_log.json";

const categoryLabels: Record<string, string> = {
  heads: "Head Templates",
  skin_tones: "Skin Tone",
  skin_details: "Skin Details",
  eye_shapes: "Eye Shape",
  eye_colors: "Eye Color",
  noses: "Nose",
  ear_shapes: "Ear Shape"
};

export function CurrentEvidenceGallery() {
  const summary = useMemo(
    () =>
      createCurrentEvidenceGallerySummary({
        importedRecords: importedCatalog.records as ImportedResearchCatalogRecord[],
        evidenceEntries: evidenceManifest.payload.entries as EvidenceManifestEntry[],
        captureEvents: captureLog.payload.events as CaptureLogEvent[]
      }),
    []
  );
  const [category, setCategory] = useState("all");
  const records = filterGalleryRecords(summary.records, category);
  const [selectedID, setSelectedID] = useState(records[0]?.stableInternalID ?? "");
  const selectedRecord = records.find((record) => record.stableInternalID === selectedID) ?? records[0] ?? null;

  function handleCategoryChange(nextCategory: string) {
    const nextRecords = filterGalleryRecords(summary.records, nextCategory);
    setCategory(nextCategory);
    setSelectedID(nextRecords[0]?.stableInternalID ?? "");
  }

  return (
    <section className="screen-stack" aria-labelledby="current-evidence-gallery-title">
      <ScreenHeader eyebrow="Internal research evidence" title="Current video-derived evidence gallery" id="current-evidence-gallery-title">
        <p>
          Browse the current primary-research records, source timestamps, menu evidence, extracted derivative views, missing-view indicators, and recapture
          status. This is not verified production catalog data.
        </p>
      </ScreenHeader>
      <Alert title="PRIMARY RESEARCH CANDIDATE — NOT PRODUCTION VERIFIED" tone="warning" role="alert">
        These records are blocked from recommendations until second-person verification, catalog-manager approval, immutable release, and production publish gates pass.
      </Alert>
      <div className="card-grid">
        <Card>
          <h2>Research records</h2>
          <dl className="metadata-list">
            <div>
              <dt>Total</dt>
              <dd>{summary.totalRecords}</dd>
            </div>
            <div>
              <dt>Needs recapture</dt>
              <dd>{summary.recordsRequiringRecapture}</dd>
            </div>
            <div>
              <dt>Missing views</dt>
              <dd>{summary.recordsWithMissingViews}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2>Filter</h2>
          <SelectField label="Category" value={category} onChange={(event) => handleCategoryChange(event.target.value)}>
            <option value="all">All categories</option>
            {summary.categories.map((categoryID) => (
              <option key={categoryID} value={categoryID}>
                {categoryLabels[categoryID] ?? categoryID}
              </option>
            ))}
          </SelectField>
        </Card>
        <Card tone="warning">
          <div className="status-row">
            <h2>Production access</h2>
            <StatusBadge tone="danger">blocked</StatusBadge>
          </div>
          <p className="supporting">The gallery reads only `data/research/cf27` metadata and never enables user-facing recommendations.</p>
        </Card>
      </div>
      <div className="evidence-gallery-layout">
        <Card className="evidence-record-list" aria-label="Research catalog records">
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
                onClick={() => setSelectedID(record.stableInternalID)}
              >
                <span>{record.nativeOrder ?? "?"}</span>
                <strong>{record.nativeLabel}</strong>
                <small>{record.stableInternalID}</small>
              </button>
            ))}
          </div>
        </Card>
        {selectedRecord ? <EvidenceRecordDetail record={selectedRecord} /> : null}
      </div>
    </section>
  );
}

function EvidenceRecordDetail({ record }: { record: CurrentEvidenceGalleryRecord }) {
  const [selectedEvidenceID, setSelectedEvidenceID] = useState(record.derivativePreview?.evidenceID ?? "");
  const selectedEvidence =
    [...record.angleViews, ...record.menuEvidence].find((entry) => entry.evidenceID === selectedEvidenceID) ??
    record.derivativePreview ??
    record.angleViews[0] ??
    record.menuEvidence[0] ??
    null;
  const previewURL = createDerivativePreviewURL(selectedEvidence);

  return (
    <Card className="evidence-detail-card">
      <div className="status-row">
        <div>
          <p className="eyebrow">{record.categoryLabel}</p>
          <h2>
            {record.nativeOrder ?? "?"}. {record.nativeLabel}
          </h2>
        </div>
        <StatusBadge tone="warning">research only</StatusBadge>
      </div>
      <div className="evidence-badge-row">
        <StatusBadge tone={record.recaptureStatus === "required" ? "danger" : "neutral"}>
          Recapture {record.recaptureStatus === "required" ? "required" : "not recorded"}
        </StatusBadge>
        <StatusBadge tone={record.missingViews.length > 0 ? "warning" : "success"}>
          Missing views {record.missingViews.length}
        </StatusBadge>
        {record.face12Overlap ? <StatusBadge tone="info">Face 12 overlap</StatusBadge> : null}
      </div>
      <dl className="metadata-list">
        <div>
          <dt>Stable ID</dt>
          <dd>{record.stableInternalID}</dd>
        </div>
        <div>
          <dt>Source videos</dt>
          <dd>{record.sourceVideoNames.join(", ") || "None linked"}</dd>
        </div>
        <div>
          <dt>Research status</dt>
          <dd>{record.researchStatus}</dd>
        </div>
        <div>
          <dt>Production status</dt>
          <dd>{record.productionStatus}</dd>
        </div>
      </dl>
      {record.overlapSummary ? (
        <Alert title="Duplicate evidence preserved" tone="info">
          {record.overlapSummary}
        </Alert>
      ) : null}
      <section className="evidence-subsection" aria-labelledby={`${record.stableInternalID}-timestamps`}>
        <h3 id={`${record.stableInternalID}-timestamps`}>Clickable timestamp references</h3>
        <div className="chip-row">
          {record.timestampReferences.map((reference) => (
            <button
              key={`${reference.sourceVideoID}-${reference.startSeconds}-${reference.endSeconds}-${reference.basis}`}
              type="button"
              className="evidence-chip"
              onClick={() => {
                const matchingEvidence = [...record.angleViews, ...record.menuEvidence].find((entry) => entry.sourceVideo === reference.sourceVideoID);
                if (matchingEvidence) setSelectedEvidenceID(matchingEvidence.evidenceID);
              }}
            >
              {createTimestampReferenceLabel(reference)}
            </button>
          ))}
        </div>
      </section>
      <section className="evidence-subsection" aria-labelledby={`${record.stableInternalID}-views`}>
        <h3 id={`${record.stableInternalID}-views`}>Extracted angle and menu evidence</h3>
        <div className="evidence-view-grid">
          {[...record.menuEvidence, ...record.angleViews].map((entry) => (
            <button
              key={entry.evidenceID}
              type="button"
              className="evidence-view-button"
              aria-current={entry.evidenceID === selectedEvidence?.evidenceID ? "true" : undefined}
              onClick={() => setSelectedEvidenceID(entry.evidenceID)}
            >
              <strong>{entry.view ?? entry.fileRole}</strong>
              <span>{entry.sourceVideo ?? "source unknown"} · {entry.timestamp ?? "?"}s</span>
            </button>
          ))}
        </div>
      </section>
      <section className="evidence-preview-panel" aria-labelledby={`${record.stableInternalID}-preview`}>
        <h3 id={`${record.stableInternalID}-preview`}>Full-resolution derivative preview</h3>
        {previewURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewURL} alt={`${record.nativeLabel} ${selectedEvidence?.view ?? "evidence"} derivative preview`} />
        ) : (
          <div className="empty-thumb">No derivative preview available</div>
        )}
        <p className="supporting">{selectedEvidence?.relativePath ?? "No derivative path selected."}</p>
      </section>
      <div className="result-detail-grid">
        <WarningList title="Capture-quality warnings" entries={record.captureQualityWarnings.slice(0, 8)} emptyLabel="No capture warnings recorded." />
        <WarningList title="Missing views" entries={record.missingViews} emptyLabel="No missing views recorded." />
        <WarningList title="Duplicate evidence display" entries={record.duplicateEvidence.map((entry) => entry.evidenceID)} emptyLabel="No duplicate evidence paths detected." />
        <WarningList title="Incomplete fields" entries={record.incompleteFields.slice(0, 8)} emptyLabel="No incomplete fields recorded." />
      </div>
    </Card>
  );
}

function WarningList({ title, entries, emptyLabel }: { title: string; entries: string[]; emptyLabel: string }) {
  return (
    <Card className="capture-review-card">
      <h3>{title}</h3>
      {entries.length === 0 ? (
        <p className="supporting">{emptyLabel}</p>
      ) : (
        <ul className="compact-list">
          {entries.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
