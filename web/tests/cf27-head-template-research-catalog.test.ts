import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root CF27 Head Template research CLI is plain ESM JavaScript and is exercised here as command source of truth.
import { generateHeadTemplateResearchCatalog, writeHeadTemplateResearchCatalog } from "../../scripts/cf27-head-template-research-catalog.mjs";

const repositoryRoot = path.resolve(process.cwd(), "..");

describe("CF27 Head Template research catalog", () => {
  it("corrects the previous Face 1-12 and Face 12-29 expectations from direct timeline evidence", () => {
    const outputs = generateHeadTemplateResearchCatalog({
      root: repositoryRoot,
      generatedAt: "2026-07-14T00:30:00-04:00"
    });
    const catalog = outputs.catalog as HeadTemplateCatalog;

    expect(catalog.summary.directlyObservedUniqueHeadTemplates).toBe(26);
    expect(catalog.expectationReview.firstVideoFinding).toBe("REJECTED_AS_COMPLETE_1_THROUGH_12_ONLY");
    expect(catalog.expectationReview.firstVideoObservedNumbers).toContain(16);
    expect(catalog.expectationReview.secondVideoFinding).toBe("REJECTED_AS_COMPLETE_12_THROUGH_29_ONLY");
    expect(catalog.expectationReview.secondVideoObservedNumbers).toEqual(expect.arrayContaining([30, 31]));
    expect(catalog.expectationReview.face12OverlapFinding).toBe("CONFIRMED_AS_REPEATED_CONTINUITY_ENTRY");
    expect(catalog.summary.skippedNumbersWithinObservedRange).toEqual([15, 19, 20, 25, 26]);
    expect(catalog.summary.duplicateObservationNumbers).toEqual([12, 16]);
    expect(catalog.summary.productionEligibleRecords).toBe(0);
    expect(catalog.selectorBoundaryProof.beginningProven).toBe(true);
    expect(catalog.selectorBoundaryProof.endProven).toBe(false);
    expect(catalog.selectorBoundaryProof.wrapShown).toBe(false);
    expect(catalog.selectorBoundaryProof.face29Finality).toBe("FINAL_CAPTURED_OPTION_ONLY_NOT_FINAL_GAME_OPTION");
    expect(catalog.continuityReport.overlaps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        nativeNumber: 12,
        disposition: "SAME_RESEARCH_CATALOG_ID_WITH_MULTIPLE_EVIDENCE_OBSERVATIONS"
      })
    ]));
    expect(catalog.automaticAttributeChangeSummary.skinTone).toBe("NOT_PROVEN_FROM_CURRENT_HEAD_TEMPLATE_FOOTAGE");
  });

  it("keeps every observed head research-only and blocked from production geometry use", () => {
    const outputs = generateHeadTemplateResearchCatalog({
      root: repositoryRoot,
      generatedAt: "2026-07-14T00:30:00-04:00"
    });
    const records = (outputs.catalog as HeadTemplateCatalog).records;

    expect(records.map((record) => record.nativeOptionNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 21, 22, 23, 24, 27, 28, 29, 30, 31
    ]);
    for (const record of records) {
      expect(record.dataClass).toBe("RESEARCH_CANDIDATE");
      expect(record.nativeLabel).toBe(`Face ${record.nativeOptionNumber}`);
      expect(record.environmentID).toBeTruthy();
      expect(record.productionStatus).toBe("NOT_PRODUCTION_DATA");
      expect(record.verificationStatus).toBe("OBSERVED_PENDING_VERIFICATION");
      expect(record.productionEligibility.eligible).toBe(false);
      expect(record.suitability.menuPresence).toBe(true);
      expect(record.suitability.ordering).toBe(true);
      expect(record.suitability.productionGeometricComparison).toBe(false);
      expect(record.visualComparisonSuitability).toBe("NOT_SUITABLE_FOR_PRODUCTION_GEOMETRIC_COMPARISON");
      expect(record.recaptureStatus.required).toBe(true);
      expect(record.automaticAttributeChanges.skinTone.status).toBe("NOT_PROVEN");
      expect(record.fullScreenEvidence.preservesOriginalAspectRatio).toBe(true);
    }
  });

  it("writes research catalog, docs, recapture list, and linked manifest/log annotations", () => {
    const fixture = createFixtureWorkspace();
    const outputs = generateHeadTemplateResearchCatalog({
      root: fixture.root,
      generatedAt: "2026-07-14T00:30:00-04:00"
    });

    writeHeadTemplateResearchCatalog(outputs, { root: fixture.root });

    const catalog = readJson<HeadTemplateCatalog>(fixture.root, "data/phase-zero/heads.research.json");
    const evidenceManifest = readJson<{ headTemplateResearchCatalog: { recordCount: number }; entries: Array<Record<string, unknown>> }>(fixture.root, "data/phase-zero/evidence_manifest.json");
    const captureLog = readJson<{ headTemplateResearchCatalog: { recordCount: number }; events: Array<Record<string, unknown>> }>(fixture.root, "data/phase-zero/capture_log.json");
    const catalogDoc = fs.readFileSync(path.join(fixture.root, "docs/phase-zero/HEAD_TEMPLATE_RESEARCH_CATALOG.md"), "utf8");
    const qualityDoc = fs.readFileSync(path.join(fixture.root, "docs/phase-zero/HEAD_CAPTURE_QUALITY_REPORT.md"), "utf8");
    const continuityDoc = fs.readFileSync(path.join(fixture.root, "docs/phase-zero/HEAD_TEMPLATE_CONTINUITY_REPORT.md"), "utf8");
    const recapture = readJson<{ items: Array<{ id: string }> }>(fixture.root, "data/phase-zero/head_template_recapture_list.research.json");

    expect(catalog.records).toHaveLength(5);
    expect(catalog.expectationReview.face12OverlapFinding).toBe("CONFIRMED_AS_REPEATED_CONTINUITY_ENTRY");
    expect(evidenceManifest.headTemplateResearchCatalog.recordCount).toBe(5);
    expect(captureLog.headTemplateResearchCatalog.recordCount).toBe(5);
    expect(evidenceManifest.entries.some((entry) => entry.headResearchCatalogID === "CF27_XBOXUNKNOWN_RTG_HEAD_012")).toBe(true);
    expect(captureLog.events.some((event) => event.head_research_catalog_id === "CF27_XBOXUNKNOWN_RTG_HEAD_012")).toBe(true);
    expect(catalogDoc).toContain("REJECTED_AS_COMPLETE_1_THROUGH_12_ONLY");
    expect(qualityDoc).toContain("PRODUCTION_COMPARISON_BLOCKED");
    expect(continuityDoc).toContain("Face 29 conclusion: FINAL_CAPTURED_OPTION_ONLY_NOT_FINAL_GAME_OPTION");
    expect(continuityDoc).toContain("SAME_RESEARCH_CATALOG_ID_WITH_MULTIPLE_EVIDENCE_OBSERVATIONS");
    expect(recapture.items.map((item) => item.id)).toEqual(expect.arrayContaining([
      "head-template-boundary",
      "head-template-skipped-numbers",
      "head-template-standardized-pass",
      "head-template-frame-id-review"
    ]));
  });
});

interface HeadTemplateCatalog {
  expectationReview: {
    firstVideoFinding: string;
    firstVideoObservedNumbers: number[];
    secondVideoFinding: string;
    secondVideoObservedNumbers: number[];
    face12OverlapFinding: string;
  };
  summary: {
    directlyObservedUniqueHeadTemplates: number;
    skippedNumbersWithinObservedRange: number[];
    duplicateObservationNumbers: number[];
    productionEligibleRecords: number;
  };
  records: HeadTemplateRecord[];
  selectorBoundaryProof: {
    beginningProven: boolean;
    endProven: boolean;
    wrapShown: boolean;
    face29Finality: string;
  };
  continuityReport: {
    overlaps: Array<{
      nativeNumber: number;
      disposition: string;
    }>;
  };
  automaticAttributeChangeSummary: {
    skinTone: string;
  };
}

interface HeadTemplateRecord {
  stableResearchCatalogID: string;
  nativeOptionNumber: number;
  nativeLabel: string;
  environmentID: string;
  dataClass: string;
  productionStatus: string;
  verificationStatus: string;
  suitability: {
    menuPresence: boolean;
    ordering: boolean;
    productionGeometricComparison: boolean;
  };
  productionEligibility: {
    eligible: boolean;
  };
  visualComparisonSuitability: string;
  recaptureStatus: {
    required: boolean;
  };
  automaticAttributeChanges: {
    skinTone: {
      status: string;
    };
  };
  fullScreenEvidence: {
    preservesOriginalAspectRatio: boolean;
  };
}

function createFixtureWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-cf27-head-template-catalog-"));
  fs.mkdirSync(path.join(root, "data/phase-zero"), { recursive: true });
  fs.writeFileSync(path.join(root, "data/phase-zero/video_timeline.json"), JSON.stringify({
    records: [
      optionRecord("phase0-video-002-tl-004", "phase0-video-002", "02_Head_Templates_Faces_01-12.mov", 10, 19, "Face 1", 1),
      optionRecord("phase0-video-002-tl-015", "phase0-video-002", "02_Head_Templates_Faces_01-12.mov", 95, 100, "Face 12", 12),
      optionRecord("phase0-video-002-tl-016", "phase0-video-002", "02_Head_Templates_Faces_01-12.mov", 101, 108, "Face 16", 16),
      optionRecord("phase0-video-003-tl-001", "phase0-video-003", "03_Head_Templates_Faces_12-29.mov", 0, 4, "Face 12", 12),
      optionRecord("phase0-video-003-tl-014", "phase0-video-003", "03_Head_Templates_Faces_12-29.mov", 120, 126, "Face 30", 30),
      optionRecord("phase0-video-003-tl-015", "phase0-video-003", "03_Head_Templates_Faces_12-29.mov", 127, 133, "Face 29", 29)
    ]
  }, null, 2));
  fs.writeFileSync(path.join(root, "data/phase-zero/evidence_manifest.json"), JSON.stringify({
    entries: [
      frameEvidence("phase0-video-002-tl-004"),
      frameEvidence("phase0-video-002-tl-015"),
      frameEvidence("phase0-video-002-tl-016"),
      frameEvidence("phase0-video-003-tl-001"),
      frameEvidence("phase0-video-003-tl-014"),
      frameEvidence("phase0-video-003-tl-015")
    ]
  }, null, 2));
  fs.writeFileSync(path.join(root, "data/phase-zero/capture_log.json"), JSON.stringify({
    events: [
      captureEvent("phase0-video-002-tl-004"),
      captureEvent("phase0-video-002-tl-015"),
      captureEvent("phase0-video-002-tl-016"),
      captureEvent("phase0-video-003-tl-001"),
      captureEvent("phase0-video-003-tl-014"),
      captureEvent("phase0-video-003-tl-015")
    ]
  }, null, 2));
  return { root };
}

function optionRecord(timeline_record_id: string, video_id: string, canonical_filename: string, start_timestamp: number, end_timestamp: number, visible_option_label: string, visible_option_index: number) {
  return {
    timeline_record_id,
    video_id,
    canonical_filename,
    original_filename: canonical_filename,
    event_type: "option_change",
    parent_menu: "Head & Skin",
    visible_menu_label: "HEAD TEMPLATE",
    visible_option_label,
    visible_option_index,
    observed_action: "selected",
    start_timestamp,
    end_timestamp,
    confidence: "HIGH",
    transition_active: false,
    blur_present: false,
    obstruction_present: false,
    extracted_frame_path: `data/phase-zero/derivative-frames/${timeline_record_id}.png`,
    notes: "fixture timeline record"
  };
}

function frameEvidence(timeline_record_id: string) {
  return {
    evidence_id: `phase0-frame-${timeline_record_id.replace("phase0-", "")}`,
    timeline_record_id,
    relative_path: `data/phase-zero/derivative-frames/${timeline_record_id}.png`,
    master_or_derivative: "derivative",
    verification_state: "OBSERVED_PENDING_VERIFICATION"
  };
}

function captureEvent(timeline_record_id: string) {
  return {
    capture_event_id: `capture-${timeline_record_id}`,
    timeline_record_id,
    video_id: timeline_record_id.slice(0, "phase0-video-000".length),
    start_timestamp: 0,
    end_timestamp: 1,
    category: "Head Template",
    native_option: null,
    action: "timeline_observation",
    evidence_generated: [],
    issue_detected: [],
    verification_state: "OBSERVED_PENDING_VERIFICATION",
    notes: "fixture capture event"
  };
}

function readJson<T>(root: string, relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8")) as T;
}
