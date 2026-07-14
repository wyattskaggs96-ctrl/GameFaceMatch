import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root Phase 0 CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { generateFacialHairColorResearchCatalog, writeFacialHairColorResearchCatalog } from "../../scripts/cf27-facial-hair-color-research-catalog.mjs";

const generatedAt = "2026-07-14T04:10:00-04:00";

describe("CF27 facial-hair-color research catalog", () => {
  it("does not create facial-hair-color records when only the Hair submenu row is observed", () => {
    const fixture = createWorkspace();
    const { catalog } = generateFacialHairColorResearchCatalog({
      root: fixture.root,
      generatedAt
    });

    expect(catalog.summary.hairMenuRowObserved).toBe(true);
    expect(catalog.summary.facialHairColorControlObserved).toBe(false);
    expect(catalog.summary.totalObservedCount).toBe(0);
    expect(catalog.summary.recordCount).toBe(0);
    expect(catalog.records).toEqual([]);
    expect(catalog.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(catalog.productionRecommendationsEnabled).toBe(false);
  });

  it("keeps selector order, default, boundaries, and wrapping unresolved until direct values exist", () => {
    const fixture = createWorkspace();
    const { catalog, qualityReport } = generateFacialHairColorResearchCatalog({
      root: fixture.root,
      generatedAt
    });

    expect(catalog.summary).toMatchObject({
      nativeOrderStatus: "NOT_OBSERVED",
      countStatus: "COUNT_UNKNOWN",
      defaultStatus: "DEFAULT_NOT_DEMONSTRATED",
      selectorBoundaryStatus: "BOUNDARIES_UNKNOWN",
      selectorWrapStatus: "NOT_OBSERVED"
    });
    expect(qualityReport.checks.map((check: { checkID: string }) => check.checkID)).toEqual(expect.arrayContaining([
      "native_order",
      "default",
      "selector_boundaries",
      "selector_wrap"
    ]));
  });

  it("records hair-color linkage, style support, and None behavior as unknown dependencies", () => {
    const fixture = createWorkspace();
    const { catalog, qualityReport } = generateFacialHairColorResearchCatalog({
      root: fixture.root,
      generatedAt
    });

    expect(catalog.menuDependencyAssessment).toMatchObject({
      relationshipToHairColor: "UNKNOWN_NOT_TESTED",
      hairColorAutomaticallyChangesFacialHairColor: "UNKNOWN_NOT_TESTED",
      allFacialHairStylesSupportAllColors: "UNKNOWN_NOT_TESTED",
      noneAffectsColorAvailability: "UNKNOWN_NOT_TESTED"
    });
    expect(qualityReport.checks.map((check: { checkID: string }) => check.checkID)).toEqual(expect.arrayContaining([
      "relationship_to_hair_color",
      "hair_color_auto_change",
      "all_styles_support_all_colors",
      "none_color_availability"
    ]));
  });

  it("requires direct menu evidence, timestamps, and representative frames before records can exist", () => {
    const fixture = createWorkspace();
    const { catalog, recaptureReport } = generateFacialHairColorResearchCatalog({
      root: fixture.root,
      generatedAt
    });

    expect(catalog.viewCoverage.requiredViews).toEqual([
      "MENU",
      "FRONT_REPRESENTATIVE_FRAME_PER_VALUE",
      "LEFT_3Q_IF_NEEDED_FOR_VISIBILITY"
    ]);
    expect(catalog.sourceEvidence.facialHairColorCaptureRequest.captureID).toBe("GFM-CAP-010");
    expect(recaptureReport.requests[0].linkedCaptureRequestIDs).toEqual(["GFM-CAP-007", "GFM-CAP-010"]);
    expect(recaptureReport.requests[0].requiredEvidence).toEqual(expect.arrayContaining([
      "Readable native facial-hair-color label or index for every selected value.",
      "Observation of whether selecting hair color automatically changes facial-hair color.",
      "Observation of whether every facial-hair style supports every color.",
      "Observation of whether None hides, disables, or preserves color availability."
    ]));
  });

  it("writes zero-record exports and evidence placeholders", () => {
    const fixture = createWorkspace();
    const outputs = generateFacialHairColorResearchCatalog({
      root: fixture.root,
      generatedAt
    });

    writeFacialHairColorResearchCatalog(outputs, { root: fixture.root });

    const catalog = JSON.parse(fs.readFileSync(path.join(fixture.root, "data/phase-zero/facial_hair_colors.research.json"), "utf8"));
    const csv = fs.readFileSync(path.join(fixture.root, "data/phase-zero/facial_hair_colors.research.csv"), "utf8");
    const readme = fs.readFileSync(path.join(fixture.root, "data/phase-zero/facial-hair-color-evidence/README.md"), "utf8");

    expect(catalog.records).toEqual([]);
    expect(csv.split("\n")[0]).toContain("stableResearchID,nativeOrder,nativeGameLabel");
    expect(readme).toContain("intentionally empty");
    expect(fs.existsSync(path.join(fixture.root, "data/phase-zero/facial-hair-color-evidence/front-representative-frame-per-value/.gitkeep"))).toBe(true);
  });
});

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-cf27-facial-hair-color-"));
  writeJson(path.join(root, "data/phase-zero/menu_map.research.json"), {
    records: [{
      recordType: "menu",
      stableMenuID: "cf27-menu-appearance-hair",
      displayLabel: "Hair",
      nativeLabel: "Hair",
      nativeOrder: 2,
      captureStatus: "PARTIAL",
      inspected: false,
      complete: false,
      gapFlags: ["PARTIAL", "COUNT_UNKNOWN", "RECAPTURE_REQUIRED"],
      evidence: [{
        evidenceID: "phase0-source-phase0-video-001",
        videoID: "phase0-video-001",
        confidence: "LOW_VISIBLE_ONLY"
      }],
      missingEvidence: ["Open Hair and record its child controls."]
    }]
  });
  writeJson(path.join(root, "data/phase-zero/capture_requests.json"), {
    requests: [
      {
        captureID: "GFM-CAP-007",
        title: "Hair submenu boundary map",
        priority: "P1",
        exactMenuPath: "Create Player > Player > Appearance > Hair",
        requiredViews: ["FULL_MENU_LIST"],
        twoIndependentCountsRequired: false,
        verificationStatus: "REQUESTED_NOT_CAPTURED",
        existingFootageCanBeReused: "Existing footage proves the Hair entry exists only.",
        acceptanceCriteria: ["Hair child controls are directly visible in native order."]
      },
      {
        captureID: "GFM-CAP-010",
        title: "Facial-hair controls, only if visible in Hair",
        priority: "P1",
        exactMenuPath: "Create Player > Player > Appearance > Hair > visible facial-hair or facial-hair-color controls from GFM-CAP-007",
        requiredViews: ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "RIGHT_3Q", "RIGHT_PROFILE"],
        twoIndependentCountsRequired: true,
        verificationStatus: "REQUESTED_NOT_CAPTURED",
        existingFootageCanBeReused: "No complete facial-hair or facial-hair-color evidence exists.",
        acceptanceCriteria: ["Facial-hair color is not assumed to exist unless shown."]
      }
    ]
  });
  return { root };
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
