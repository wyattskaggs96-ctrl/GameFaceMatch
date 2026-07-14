import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root CF27 appearance-control research CLI is plain ESM JavaScript and is exercised here as command source of truth.
import { generateAppearanceControlsResearchCatalog, writeAppearanceControlsResearchCatalog } from "../../scripts/cf27-appearance-controls-research-catalog.mjs";

const repositoryRoot = path.resolve(process.cwd(), "..");

describe("CF27 appearance-control research catalog", () => {
  it("records only directly observed values and does not infer missing ranges", () => {
    const outputs = generateAppearanceControlsResearchCatalog({
      root: repositoryRoot,
      generatedAt: "2026-07-14T01:15:00-04:00"
    });
    const catalog = outputs.catalog as AppearanceControlsCatalog;
    const skinTone = category(catalog, "Skin Tone");
    const skinToneLabels = records(catalog, "Skin Tone").map((record) => record.nativeDisplayLabel);

    expect(catalog.summary.directlyObservedUniqueValues).toBe(54);
    expect(catalog.summary.selectedObservations).toBe(57);
    expect(catalog.summary.unconfiguredDirectlyObservedCategoryLabels).toEqual([]);
    expect(catalog.menuOnlyObservedCategories.map((item) => `${item.nativeOrder}:${item.displayedCategoryLabel}`)).toEqual(["8:Mouth Shape", "9:Jaw Shape", "10:Chin"]);
    expect(skinToneLabels).toContain("Skin Tone 29");
    expect(skinToneLabels).not.toContain("Skin Tone 05");
    expect(skinToneLabels).not.toContain("Skin Tone 14");
    expect(skinToneLabels).not.toContain("Skin Tone 15");
    expect(skinToneLabels).not.toContain("Skin Tone 16");
    expect(skinTone.missingObservedRangeValues).toEqual([5, 14, 15, 16, 25, 26, 27, 28]);
    expect(skinTone.totalCount).toBeNull();
    expect(skinTone.totalCountStatus).toBe("COUNT_UNKNOWN");
    expect(skinTone.demonstratedFirstValueStatus).toBe("NOT_DEMONSTRATED_AS_SELECTOR_BOUNDARY");
    expect(skinTone.demonstratedLastValueStatus).toBe("NOT_DEMONSTRATED_AS_SELECTOR_BOUNDARY");
    expect(skinTone.demonstratedDefault.status).toBe("NOT_DEMONSTRATED");
    expect(skinTone.selectorBoundaryEvidence.wrappingDemonstrated).toBe(false);
    expect(skinTone.sliderBoundaries.status).toBe("NOT_APPLICABLE_NON_SLIDER_CONTROL");
    expect(skinTone.automaticChangesOrDependencies.resetBehaviorObserved).toBe("NOT_OBSERVED");
    expect(skinTone.completenessAgainstObservedRange).toMatchObject({
      status: "OBSERVED_RANGE_HAS_GAPS",
      observedMinimum: 1,
      observedMaximum: 29,
      observedUniqueCount: 21,
      expectedWithinObservedNumericRange: 29,
      missingWithinObservedNumericRange: [5, 14, 15, 16, 25, 26, 27, 28],
      completenessRatio: 0.724
    });
    expect(skinTone.ambiguityAndMissingRanges.join(" ")).toContain("Do not infer unobserved values between observed values.");
  });

  it("preserves duplicate observations and keeps all records research-only", () => {
    const outputs = generateAppearanceControlsResearchCatalog({
      root: repositoryRoot,
      generatedAt: "2026-07-14T01:15:00-04:00"
    });
    const catalog = outputs.catalog as AppearanceControlsCatalog;

    expect(category(catalog, "Skin Tone").duplicateObservedValues).toEqual(["Skin Tone 10"]);
    expect(category(catalog, "Nose").duplicateObservedValues).toEqual(["Aquiline"]);
    expect(category(catalog, "Ear Shape").duplicateObservedValues).toEqual(["None"]);

    for (const record of catalog.records) {
      expect(record.dataClass).toBe("RESEARCH_CANDIDATE");
      expect(record.displayedCategoryLabel).toBe(record.category);
      expect(record.nativeOptionOrderPreserved).toBe(true);
      expect(record.productionStatus).toBe("NOT_PRODUCTION_DATA");
      expect(record.verificationStatus).toBe("OBSERVED_PENDING_VERIFICATION");
      expect(record.productionEligibility.eligible).toBe(false);
      expect(record.evidenceSuitability.productionGeometricComparison).toBe(false);
      expect(record.demonstratedDefault.status).toBe("NOT_DEMONSTRATED");
      expect(record.sliderBoundaries.applicable).toBe(false);
      expect(record.automaticChangesOrDependencies.resetBehaviorObserved).toBe("NOT_OBSERVED");
    }
  });

  it("classifies effects only where the current video evidence supports a conclusion", () => {
    const outputs = generateAppearanceControlsResearchCatalog({
      root: repositoryRoot,
      generatedAt: "2026-07-14T01:15:00-04:00"
    });
    const catalog = outputs.catalog as AppearanceControlsCatalog;

    expect(records(catalog, "Skin Tone")[0].effectProfile).toMatchObject({
      geometry: "not_supported_by_current_evidence",
      color: "supported_by_visible_skin-presentation_change"
    });
    expect(records(catalog, "Skin Details")[0].effectProfile).toMatchObject({
      texture: "supported_by_native_labels_and_visible_detail_category"
    });
    expect(records(catalog, "Eye Color")[0].effectProfile).toMatchObject({
      color: "supported_by_native_color_labels"
    });
    expect(records(catalog, "Nose")[0].effectProfile.geometry).toBe("supported_by_native_shape_category_pending_measurement");
    expect(records(catalog, "Eye Shape")[0].effectProfile.geometry).toBe("supported_by_native_shape_category_pending_measurement");
    expect(records(catalog, "Ear Shape")[0].effectProfile.geometry).toBe("supported_by_native_shape_category_pending_measurement");
  });

  it("writes aggregate outputs, category docs, manifest annotations, and issue recapture entries", () => {
    const fixture = createFixtureWorkspace();
    const outputs = generateAppearanceControlsResearchCatalog({
      root: fixture.root,
      generatedAt: "2026-07-14T01:15:00-04:00"
    });

    writeAppearanceControlsResearchCatalog(outputs, { root: fixture.root });

    const catalog = readJson<AppearanceControlsCatalog>(fixture.root, "data/phase-zero/additional_attributes.research.json");
    const evidenceManifest = readJson<{ additionalAttributesResearchCatalog: { recordCount: number }; entries: Array<Record<string, unknown>> }>(fixture.root, "data/phase-zero/evidence_manifest.json");
    const issues = readJson<{ issues: Array<{ issueID: string }> }>(fixture.root, "data/phase-zero/issues_register.research.json");
    const summaryDoc = fs.readFileSync(path.join(fixture.root, "docs/phase-zero/appearance-controls/SKIN_TONE_RESEARCH_SUMMARY.md"), "utf8");
    const consolidatedDoc = fs.readFileSync(path.join(fixture.root, "docs/phase-zero/appearance-controls/APPEARANCE_CONTROLS_RESEARCH_EXPORT.md"), "utf8");
    const recapture = readJson<{ items: Array<{ id: string }> }>(fixture.root, "data/phase-zero/additional_attributes_recapture_requirements.research.json");

    expect(catalog.records).toHaveLength(4);
    expect(evidenceManifest.additionalAttributesResearchCatalog.recordCount).toBe(4);
    expect(evidenceManifest.entries.some((entry) => entry.additionalAttributeResearchCatalogID === "CF27_XBOXUNKNOWN_RTG_SKINTONE_009")).toBe(true);
    expect(issues.issues.map((issue) => issue.issueID)).toEqual(expect.arrayContaining([
      "issue-phase0-appearance-control-skin-tone-recapture",
      "issue-phase0-appearance-control-eye-color-recapture"
    ]));
    expect(summaryDoc).toContain("PRIMARY RESEARCH CANDIDATE - NOT PRODUCTION VERIFIED");
    expect(summaryDoc).toContain("Total count: COUNT_UNKNOWN");
    expect(summaryDoc).toContain("First available value demonstrated: NOT_DEMONSTRATED_AS_SELECTOR_BOUNDARY");
    expect(consolidatedDoc).toContain("Appearance Controls Research Export");
    expect(consolidatedDoc).toContain("Menu-Only Observed Categories");
    expect(recapture.items.map((item) => item.id)).toEqual(expect.arrayContaining([
      "appearance-control-skin-tone-recapture",
      "appearance-control-eye-color-recapture"
    ]));
  });
});

interface AppearanceControlsCatalog {
  summary: {
    directlyObservedUniqueValues: number;
    selectedObservations: number;
    unconfiguredDirectlyObservedCategoryLabels: string[];
  };
  categories: AppearanceControlCategory[];
  records: AppearanceControlRecord[];
  menuOnlyObservedCategories: Array<{
    displayedCategoryLabel: string;
    nativeOrder: number;
  }>;
}

interface AppearanceControlCategory {
  category: string;
  totalCount: number | null;
  totalCountStatus: string;
  demonstratedFirstValueStatus: string;
  demonstratedLastValueStatus: string;
  demonstratedDefault: {
    status: string;
  };
  selectorBoundaryEvidence: {
    wrappingDemonstrated: boolean;
  };
  sliderBoundaries: {
    status: string;
  };
  automaticChangesOrDependencies: {
    resetBehaviorObserved: string;
  };
  completenessAgainstObservedRange: {
    status: string;
    observedMinimum: number | null;
    observedMaximum: number | null;
    observedUniqueCount: number;
    expectedWithinObservedNumericRange: number | null;
    missingWithinObservedNumericRange: number[];
    completenessRatio: number | null;
  };
  missingObservedRangeValues: number[];
  duplicateObservedValues: string[];
  ambiguityAndMissingRanges: string[];
}

interface AppearanceControlRecord {
  dataClass: string;
  productionStatus: string;
  verificationStatus: string;
  displayedCategoryLabel: string;
  category: string;
  nativeDisplayLabel: string;
  nativeOptionOrderPreserved: boolean;
  effectProfile: Record<string, string>;
  demonstratedDefault: {
    status: string;
  };
  sliderBoundaries: {
    applicable: boolean;
  };
  automaticChangesOrDependencies: {
    resetBehaviorObserved: string;
  };
  evidenceSuitability: {
    productionGeometricComparison: boolean;
  };
  productionEligibility: {
    eligible: boolean;
  };
}

function category(catalog: AppearanceControlsCatalog, categoryName: string): AppearanceControlCategory {
  const result = catalog.categories.find((item) => item.category === categoryName);
  if (!result) throw new Error(`Missing category ${categoryName}`);
  return result;
}

function records(catalog: AppearanceControlsCatalog, categoryName: string): AppearanceControlRecord[] {
  return catalog.records.filter((record) => record.category === categoryName);
}

function createFixtureWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-cf27-appearance-controls-"));
  fs.mkdirSync(path.join(root, "data/phase-zero"), { recursive: true });
  fs.mkdirSync(path.join(root, "data/research/cf27/catalog-candidates/research/eye-color-options-001-007"), { recursive: true });
  fs.writeFileSync(path.join(root, "data/phase-zero/video_timeline.json"), JSON.stringify({
    records: [
      optionRecord("phase0-video-004-tl-002", "phase0-video-004", "04_Skin_Tone.mp4", "SKIN TONE", "Skin Tone 09", 9, 8, 11),
      optionRecord("phase0-video-004-tl-003", "phase0-video-004", "04_Skin_Tone.mp4", "SKIN TONE", "Skin Tone 10", 10, 12, 13),
      optionRecord("phase0-video-004-tl-004", "phase0-video-004", "04_Skin_Tone.mp4", "SKIN TONE", "Skin Tone 10", 10, 14, 15),
      optionRecord("phase0-video-007-tl-002", "phase0-video-007", "07_Eye_Color.mp4", "EYE COLOR", "Light Blue", null, 12, 12),
      optionRecord("phase0-video-007-tl-003", "phase0-video-007", "07_Eye_Color.mp4", "EYE COLOR", "Brown", null, 13, 14)
    ]
  }, null, 2));
  fs.writeFileSync(path.join(root, "data/phase-zero/evidence_manifest.json"), JSON.stringify({
    entries: [
      frameEvidence("phase0-video-004-tl-002"),
      frameEvidence("phase0-video-004-tl-003"),
      frameEvidence("phase0-video-004-tl-004"),
      frameEvidence("phase0-video-007-tl-002"),
      frameEvidence("phase0-video-007-tl-003")
    ]
  }, null, 2));
  fs.writeFileSync(path.join(root, "data/phase-zero/issues_register.research.json"), JSON.stringify({
    schemaVersion: "phase0-issue-register-v1",
    registerID: "fixture-issues",
    issues: []
  }, null, 2));
  fs.writeFileSync(path.join(root, "data/phase-zero/menu_map.research.json"), JSON.stringify({
    records: [
      menuRecord("Skin Tone", "cf27-menu-head-skin-skin-tone", "color_selector_numbered_grid"),
      menuRecord("Eye Color", "cf27-menu-head-skin-eye-color", "color_selector_named_grid")
    ]
  }, null, 2));
  fs.writeFileSync(path.join(root, "data/research/cf27/catalog-candidates/research/eye-color-options-001-007/eye_color_research_candidates.json"), JSON.stringify({
    records: [
      { nativeOrder: 1, stableInternalID: "CF27_XBOXUNKNOWN_RTG_EYECOLOR_001", visibleGameLabelOrIndex: "Light Blue" },
      { nativeOrder: 3, stableInternalID: "CF27_XBOXUNKNOWN_RTG_EYECOLOR_003", visibleGameLabelOrIndex: "Brown" }
    ]
  }, null, 2));
  return { root };
}

function optionRecord(timeline_record_id: string, video_id: string, canonical_filename: string, visible_menu_label: string, visible_option_label: string, visible_option_index: number | null, start_timestamp: number, end_timestamp: number) {
  return {
    timeline_record_id,
    video_id,
    canonical_filename,
    original_filename: canonical_filename,
    event_type: "option_change",
    parent_menu: "Head & Skin",
    visible_menu_label,
    visible_option_label,
    visible_option_index,
    observed_action: "selected_option_observed",
    start_timestamp,
    end_timestamp,
    confidence: "HIGH",
    transition_active: false,
    blur_present: false,
    obstruction_present: false,
    usable_for_count: true,
    usable_for_order: true,
    usable_for_visual_analysis: true,
    extracted_frame_path: `data/phase-zero/derivative-frames/${timeline_record_id}.png`,
    verification_status: "OBSERVED_PENDING_VERIFICATION",
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

function menuRecord(displayLabel: string, stableMenuID: string, controlType: string) {
  return {
    recordType: "menu",
    displayLabel,
    stableMenuID,
    parentMenuID: "cf27-menu-appearance-head-skin",
    controlType,
    wrapBehavior: "UNKNOWN"
  };
}

function readJson<T>(root: string, relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8")) as T;
}
