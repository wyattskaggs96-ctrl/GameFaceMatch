import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(process.cwd(), "..");

const requiredCanonicalArtifacts = [
  "docs/status/CURRENT_PROJECT_STATE_RECONSTRUCTION.md",
  "docs/phase-zero/PHASE_ZERO_ARTIFACT_MAP.md",
  "docs/phase-zero/PHASE_ZERO_DATA_DICTIONARY.md",
  "data/phase-zero/video_inventory.json",
  "data/phase-zero/video_timeline.json",
  "data/phase-zero/environment_manifest.research.json",
  "data/phase-zero/creation_paths.research.json",
  "data/phase-zero/menu_map.research.json",
  "data/phase-zero/heads.research.json",
  "data/phase-zero/additional_attributes.research.json",
  "data/phase-zero/evidence_manifest.json",
  "data/phase-zero/capture_log.json",
  "data/phase-zero/issues_register.research.json",
  "data/phase-zero/capture_requests.json",
  "data/phase-zero/catalog_record_classification.csv",
  "data/phase-zero/verification_assignment.json",
  "data/phase-zero/verification_results.template.csv",
  "data/phase-zero/manual_matching_subjects.template.csv",
  "data/phase-zero/manual_matching_reviews.template.csv",
  "data/phase-zero/manual_matching_results.template.csv"
];

const supersededOrHistoricalDocs = [
  "docs/status/PRE_DATA_READINESS_REVIEW.md",
  "docs/status/CURRENT_VIDEO_EVIDENCE_OPERATING_LOCK.md",
  "docs/status/OVERNIGHT_VIDEO_EVIDENCE_CLOSEOUT.md",
  "docs/catalog/CURRENT_VIDEO_INVENTORY.md",
  "docs/catalog/VIDEO_TIMELINE_INDEX.md",
  "docs/catalog/CURRENT_EVIDENCE_MANIFEST.md",
  "docs/catalog/CURRENT_CAPTURE_LOG.md",
  "docs/catalog/CURRENT_RESEARCH_PACKAGE_VALIDATION.md",
  "docs/catalog/CURRENT_APPEARANCE_MENU_HIERARCHY.md",
  "docs/catalog/AUTHORITATIVE_CURRENT_RECAPTURE_QUEUE.md",
  "docs/catalog/TOMORROWS_XBOX_RECORDING_RUNBOOK.md"
];

describe("Phase 0 artifact map", () => {
  it("references every required canonical artifact and each file exists", () => {
    const artifactMap = readText("docs/phase-zero/PHASE_ZERO_ARTIFACT_MAP.md");

    for (const relativePath of requiredCanonicalArtifacts) {
      expect(fs.existsSync(path.join(repositoryRoot, relativePath)), relativePath).toBe(true);
      expect(artifactMap, relativePath).toContain(relativePath);
    }
  });

  it("marks duplicate historical reports as superseded or historical and links to the artifact map", () => {
    for (const relativePath of supersededOrHistoricalDocs) {
      const text = readText(relativePath);
      expect(text, relativePath).toMatch(/SUPERSEDED|Historical report|preserved as the overnight video-evidence closeout/i);
      expect(text, relativePath).toContain("docs/phase-zero/PHASE_ZERO_ARTIFACT_MAP.md");
    }
  });

  it("keeps current research artifacts evidence-linked and production-ineligible", () => {
    const heads = readJSON<{ records: Array<Record<string, unknown>>; summary: Record<string, unknown>; productionRecommendationsEnabled: boolean }>("data/phase-zero/heads.research.json");
    const attributes = readJSON<{ records: Array<Record<string, unknown>>; summary: Record<string, unknown>; productionRecommendationsEnabled: boolean }>("data/phase-zero/additional_attributes.research.json");
    const evidence = readJSON<{ summary: Record<string, unknown>; entries: Array<Record<string, unknown>> }>("data/phase-zero/evidence_manifest.json");
    const captureRequests = readJSON<{ summary: Record<string, unknown>; requests: Array<Record<string, unknown>> }>("data/phase-zero/capture_requests.json");
    const productionCatalog = readJSON<{ items?: unknown[] }>("data/catalog/production/catalog_manifest.json");

    expect(heads.productionRecommendationsEnabled).toBe(false);
    expect(attributes.productionRecommendationsEnabled).toBe(false);
    expect(heads.summary.productionEligibleRecords).toBe(0);
    expect(attributes.summary.productionEligibleRecords).toBe(0);
    expect(productionCatalog.items ?? []).toHaveLength(0);
    expect(evidence.summary.entries).toBe(evidence.entries.length);
    expect(captureRequests.summary.productionRecommendationsEnabled).toBe(false);

    for (const record of [...heads.records, ...attributes.records]) {
      expect(hasEvidenceLink(record), String(record.stableResearchCatalogID ?? record.catalogID)).toBe(true);
      expect(hasTimestamp(record), String(record.stableResearchCatalogID ?? record.catalogID)).toBe(true);
      expect(record.productionStatus).toBe("NOT_PRODUCTION_DATA");
      expect(record.verificationStatus).toBe("OBSERVED_PENDING_VERIFICATION");
    }
  });

  it("classifies every supplied video and preserves catalog evidence annotations", () => {
    const inventory = readJSON<{ summary: Record<string, unknown>; inventory: Array<Record<string, unknown>> }>("data/phase-zero/video_inventory.json");
    const timeline = readJSON<{ summary: Record<string, unknown>; videoProcessingResults: Array<Record<string, unknown>>; records: Array<Record<string, unknown>> }>("data/phase-zero/video_timeline.json");
    const evidence = readJSON<{ entries: Array<Record<string, unknown>> }>("data/phase-zero/evidence_manifest.json");
    const allowedResults = new Set(["FULLY_PROCESSED", "PARTIALLY_PROCESSED", "UNUSABLE", "CORRUPTED", "DUPLICATE", "NEEDS_MANUAL_REVIEW"]);

    expect(timeline.videoProcessingResults).toHaveLength(inventory.inventory.length);
    expect(timeline.summary.fullyProcessedVideos).toBe(9);
    expect(timeline.summary.duplicateVideos).toBe(2);
    expect(timeline.summary.videosNeedingManualReview).toBe(0);
    expect(timeline.summary.corruptedVideos).toBe(0);
    expect(timeline.summary.unusableVideos).toBe(0);

    for (const result of timeline.videoProcessingResults) {
      expect(allowedResults.has(String(result.processing_result)), String(result.video_id)).toBe(true);
      expect(result.source_video_checksum, String(result.video_id)).toMatch(/^[a-f0-9]{64}$/);
    }

    for (const record of timeline.records) {
      expect(record.source_video_checksum, String(record.timeline_record_id)).toMatch(/^[a-f0-9]{64}$/);
      expect(record.transition_contamination, String(record.timeline_record_id)).toMatch(/YES|NO/);
      expect(record.model_fully_loaded, String(record.timeline_record_id)).toMatch(/FULLY_LOADED|LOADING_OR_TRANSITION|NOT_APPLICABLE_OR_NOT_VISIBLE|UNKNOWN/);
      expect(record.menu_cursor_hides_relevant_information, String(record.timeline_record_id)).toMatch(/YES|NO/);
    }

    expect(evidence.entries.filter((entry) => entry.headResearchCatalogID).length).toBeGreaterThan(0);
    expect(evidence.entries.filter((entry) => entry.additionalAttributeResearchCatalogID).length).toBeGreaterThan(0);
  });

  it("documents the reconciled current counts and the older research-export mismatch", () => {
    const artifactMap = readText("docs/phase-zero/PHASE_ZERO_ARTIFACT_MAP.md");
    const dataDictionary = readText("docs/phase-zero/PHASE_ZERO_DATA_DICTIONARY.md");
    const status = readText("docs/status/CURRENT_PROJECT_STATE_RECONSTRUCTION.md");

    expect(status).toContain("Research head candidates | 26 unique directly observed candidates");
    expect(status).toContain("Additional-attribute unique values | 54");
    expect(status).toContain("Production catalog records | 0");
    expect(artifactMap).toContain("86 research records and 335 evidence entries from the older export snapshot");
    expect(artifactMap).toContain("Current planning should use `data/phase-zero/*`");
    expect(dataDictionary).toContain("Older historical exports can have different counts");
    expect(dataDictionary).toContain("Do not treat `OBSERVED_PENDING_VERIFICATION` as verified.");
  });
});

function readText(relativePath: string) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function readJSON<T>(relativePath: string): T {
  return JSON.parse(readText(relativePath)) as T;
}

function hasEvidenceLink(record: Record<string, unknown>) {
  return Boolean(
    record.evidenceID ||
    record.evidenceFrame ||
    record.evidenceFramePath ||
    arrayLength(record.sourceObservations) > 0 ||
    arrayLength(record.selectedEvidence) > 0 ||
    arrayLength(record.evidenceReferences) > 0
  );
}

function hasTimestamp(record: Record<string, unknown>) {
  return Boolean(
    record.evidenceFrameTimestamp ||
    record.primaryTimestampRange ||
    (Array.isArray(record.sourceObservations) && record.sourceObservations.some((observation) => {
      if (typeof observation !== "object" || observation === null) return false;
      return Boolean(
        (observation as Record<string, unknown>).timestamp ||
        (observation as Record<string, unknown>).timestampRange ||
        (observation as Record<string, unknown>).startTimestamp
      );
    }))
  );
}

function arrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}
