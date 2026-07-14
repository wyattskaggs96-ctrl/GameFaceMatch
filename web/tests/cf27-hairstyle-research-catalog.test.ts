import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root Phase 0 CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { generateHairstyleResearchCatalog, writeHairstyleResearchCatalog } from "../../scripts/cf27-hairstyle-research-catalog.mjs";

const generatedAt = "2026-07-14T02:30:00-04:00";

describe("CF27 hairstyle research catalog", () => {
  it("does not create hairstyle records when only the Hair submenu row is observed", () => {
    const fixture = createWorkspace();
    const { catalog } = generateHairstyleResearchCatalog({
      root: fixture.root,
      generatedAt
    });

    expect(catalog.summary.hairMenuRowObserved).toBe(true);
    expect(catalog.summary.hairstyleSelectorOpened).toBe(false);
    expect(catalog.summary.recordCount).toBe(0);
    expect(catalog.records).toEqual([]);
    expect(catalog.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(catalog.productionRecommendationsEnabled).toBe(false);
  });

  it("keeps canonical hairstyle context unconfirmed until direct evidence exists", () => {
    const fixture = createWorkspace();
    const { catalog, qualityReport } = generateHairstyleResearchCatalog({
      root: fixture.root,
      generatedAt
    });

    expect(catalog.canonicalContext).toMatchObject({
      canonicalHead: "UNCONFIRMED_NOT_CAPTURED",
      canonicalSkinSetting: "UNCONFIRMED_NOT_CAPTURED",
      facialHairState: "UNCONFIRMED_NOT_CAPTURED",
      hairColorUsed: "UNCONFIRMED_NOT_CAPTURED"
    });
    expect(qualityReport.checks.filter((check: { status: string }) => check.status === "UNCONFIRMED")).toHaveLength(4);
  });

  it("requires the complete hairstyle recapture view set", () => {
    const fixture = createWorkspace();
    const { catalog, recaptureReport } = generateHairstyleResearchCatalog({
      root: fixture.root,
      generatedAt
    });

    expect(catalog.viewCoverage.requiredViews).toEqual([
      "MENU",
      "FRONT",
      "LEFT_3Q",
      "LEFT_PROFILE",
      "REAR",
      "RIGHT_PROFILE",
      "RIGHT_3Q"
    ]);
    expect(catalog.viewCoverage.extractedViews).toEqual([]);
    expect(recaptureReport.requests[0].linkedCaptureRequestIDs).toEqual(["GFM-CAP-007", "GFM-CAP-008"]);
    expect(recaptureReport.requests[0].productionBlocker).toBe(true);
  });

  it("keeps researcher-applied metadata separate and prohibits sensitive label classes", () => {
    const fixture = createWorkspace();
    const { catalog } = generateHairstyleResearchCatalog({
      root: fixture.root,
      generatedAt
    });

    expect(catalog.researcherAppliedVisualMetadata.status).toBe("NONE_RECORDED_NO_OPTION_EVIDENCE");
    expect(catalog.researcherAppliedVisualMetadata.separationRule).toContain("separate from nativeGameLabel");
    expect(catalog.researcherAppliedVisualMetadata.prohibitedLabels).toEqual([
      "cultural labels",
      "ethnic labels",
      "personality labels",
      "gender-identity labels",
      "lifestyle labels",
      "real-person resemblance labels"
    ]);
  });

  it("writes zero-record exports and evidence placeholders", () => {
    const fixture = createWorkspace();
    const outputs = generateHairstyleResearchCatalog({
      root: fixture.root,
      generatedAt
    });

    writeHairstyleResearchCatalog(outputs, { root: fixture.root });

    const catalog = JSON.parse(fs.readFileSync(path.join(fixture.root, "data/phase-zero/hairstyles.research.json"), "utf8"));
    const csv = fs.readFileSync(path.join(fixture.root, "data/phase-zero/hairstyles.research.csv"), "utf8");
    const readme = fs.readFileSync(path.join(fixture.root, "data/phase-zero/hairstyle-evidence/README.md"), "utf8");

    expect(catalog.records).toEqual([]);
    expect(csv.split("\n")[0]).toContain("stableResearchID,nativeOrder,nativeGameLabel");
    expect(readme).toContain("intentionally empty");
    expect(fs.existsSync(path.join(fixture.root, "data/phase-zero/hairstyle-evidence/rear/.gitkeep"))).toBe(true);
  });
});

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-cf27-hairstyle-"));
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
        captureID: "GFM-CAP-008",
        title: "Hairstyle options, only if visible in Hair",
        priority: "P1",
        exactMenuPath: "Create Player > Player > Appearance > Hair > visible hairstyle control from GFM-CAP-007",
        requiredViews: ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "REAR", "RIGHT_PROFILE", "RIGHT_3Q"],
        twoIndependentCountsRequired: true,
        verificationStatus: "REQUESTED_NOT_CAPTURED",
        existingFootageCanBeReused: "No complete hairstyle control evidence exists.",
        acceptanceCriteria: ["Every selected value has menu evidence and required angle views."]
      }
    ]
  });
  return { root };
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
