import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root Phase 0 CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { generateHairColorResearchCatalog, writeHairColorResearchCatalog } from "../../scripts/cf27-hair-color-research-catalog.mjs";

const generatedAt = "2026-07-14T03:15:00-04:00";

describe("CF27 hair-color research catalog", () => {
  it("does not create hair-color records when only the Hair submenu row is observed", () => {
    const fixture = createWorkspace();
    const { catalog } = generateHairColorResearchCatalog({
      root: fixture.root,
      generatedAt
    });

    expect(catalog.summary.hairMenuRowObserved).toBe(true);
    expect(catalog.summary.hairColorControlObserved).toBe(false);
    expect(catalog.summary.hairColorNativeValuesObserved).toBe(false);
    expect(catalog.summary.recordCount).toBe(0);
    expect(catalog.records).toEqual([]);
    expect(catalog.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(catalog.productionRecommendationsEnabled).toBe(false);
  });

  it("keeps canonical hair-color context and behavior observations unresolved", () => {
    const fixture = createWorkspace();
    const { catalog, qualityReport } = generateHairColorResearchCatalog({
      root: fixture.root,
      generatedAt
    });

    expect(catalog.canonicalContext).toMatchObject({
      selectedCanonicalHairstyle: "UNCONFIRMED_NOT_CAPTURED",
      selectedCanonicalHead: "UNCONFIRMED_NOT_CAPTURED"
    });
    expect(catalog.observations).toMatchObject({
      hairTexturePresentationChanges: "UNKNOWN_NOT_TESTED",
      eyebrowsChangeAutomatically: "UNKNOWN_NOT_TESTED",
      facialHairColorChangesAutomatically: "UNKNOWN_NOT_TESTED",
      selectorWrapping: "NOT_DEMONSTRATED",
      defaults: "NOT_DEMONSTRATED"
    });
    expect(qualityReport.checks.map((check: { checkID: string }) => check.checkID)).toContain("eyebrow_auto_change");
    expect(qualityReport.checks.map((check: { checkID: string }) => check.checkID)).toContain("facial_hair_color_auto_change");
  });

  it("requires the hair-color capture request and representative view set", () => {
    const fixture = createWorkspace();
    const { catalog, recaptureReport } = generateHairColorResearchCatalog({
      root: fixture.root,
      generatedAt
    });

    expect(catalog.viewCoverage.requiredViews).toEqual([
      "MENU",
      "FRONT_REPRESENTATIVE_FRAME_PER_VALUE",
      "LEFT_3Q_IF_NEEDED_FOR_VISIBILITY"
    ]);
    expect(catalog.viewCoverage.extractedViews).toEqual([]);
    expect(recaptureReport.requests[0].linkedCaptureRequestIDs).toEqual(["GFM-CAP-007", "GFM-CAP-009"]);
    expect(recaptureReport.requests[0].productionBlocker).toBe(true);
  });

  it("separates researcher color metadata from native labels and blocks guessed replacements", () => {
    const fixture = createWorkspace();
    const { catalog } = generateHairColorResearchCatalog({
      root: fixture.root,
      generatedAt
    });

    expect(catalog.researcherAppliedColorMetadata.status).toBe("NONE_RECORDED_NO_OPTION_EVIDENCE");
    expect(catalog.researcherAppliedColorMetadata.separationRule).toContain("separate from nativeGameLabel");
    expect(catalog.researcherAppliedColorMetadata.prohibitedReplacementRule).toContain("Do not replace native labels or indices");
  });

  it("writes zero-record exports and empty evidence placeholders", () => {
    const fixture = createWorkspace();
    const outputs = generateHairColorResearchCatalog({
      root: fixture.root,
      generatedAt
    });

    writeHairColorResearchCatalog(outputs, { root: fixture.root });

    const catalog = JSON.parse(fs.readFileSync(path.join(fixture.root, "data/phase-zero/hair_colors.research.json"), "utf8"));
    const csv = fs.readFileSync(path.join(fixture.root, "data/phase-zero/hair_colors.research.csv"), "utf8");
    const readme = fs.readFileSync(path.join(fixture.root, "data/phase-zero/hair-color-evidence/README.md"), "utf8");

    expect(catalog.records).toEqual([]);
    expect(csv.split("\n")[0]).toContain("stableResearchID,nativeOrder,nativeGameLabel");
    expect(readme).toContain("intentionally empty");
    expect(fs.existsSync(path.join(fixture.root, "data/phase-zero/hair-color-evidence/front-representative-frame-per-value/.gitkeep"))).toBe(true);
  });
});

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-cf27-hair-color-"));
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
        captureID: "GFM-CAP-009",
        title: "Hair color options, only if visible in Hair",
        priority: "P1",
        exactMenuPath: "Create Player > Player > Appearance > Hair > visible hair-color control from GFM-CAP-007",
        requiredViews: ["MENU", "FRONT_REPRESENTATIVE_FRAME_PER_VALUE", "LEFT_3Q_IF_NEEDED_FOR_VISIBILITY"],
        twoIndependentCountsRequired: true,
        verificationStatus: "REQUESTED_NOT_CAPTURED",
        existingFootageCanBeReused: "No complete hair-color control evidence exists.",
        acceptanceCriteria: ["Every selected value has readable native label/index evidence."]
      }
    ]
  });
  return { root };
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
