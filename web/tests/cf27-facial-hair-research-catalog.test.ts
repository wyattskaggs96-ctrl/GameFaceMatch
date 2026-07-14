import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root Phase 0 CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { generateFacialHairResearchCatalog, writeFacialHairResearchCatalog } from "../../scripts/cf27-facial-hair-research-catalog.mjs";

const generatedAt = "2026-07-14T03:45:00-04:00";

describe("CF27 facial-hair research catalog", () => {
  it("does not create facial-hair or None records when only the Hair submenu row is observed", () => {
    const fixture = createWorkspace();
    const { catalog } = generateFacialHairResearchCatalog({
      root: fixture.root,
      generatedAt
    });

    expect(catalog.summary.hairMenuRowObserved).toBe(true);
    expect(catalog.summary.facialHairControlObserved).toBe(false);
    expect(catalog.summary.noneOptionObserved).toBe(false);
    expect(catalog.summary.totalObservedCount).toBe(0);
    expect(catalog.summary.recordCount).toBe(0);
    expect(catalog.records).toEqual([]);
    expect(catalog.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(catalog.productionRecommendationsEnabled).toBe(false);
  });

  it("keeps canonical capture context unresolved until direct facial-hair evidence exists", () => {
    const fixture = createWorkspace();
    const { catalog, qualityReport } = generateFacialHairResearchCatalog({
      root: fixture.root,
      generatedAt
    });

    expect(catalog.canonicalContext).toMatchObject({
      canonicalHead: "UNCONFIRMED_NOT_CAPTURED",
      canonicalHairstyle: "UNCONFIRMED_NOT_CAPTURED",
      canonicalSkinSetting: "UNCONFIRMED_NOT_CAPTURED",
      canonicalFacialHairColor: "UNCONFIRMED_NOT_CAPTURED"
    });
    expect(qualityReport.checks.filter((check: { status: string }) => check.status === "UNCONFIRMED")).toHaveLength(4);
  });

  it("requires menu, front, three-quarter, and profile evidence for future records", () => {
    const fixture = createWorkspace();
    const { catalog, recaptureReport } = generateFacialHairResearchCatalog({
      root: fixture.root,
      generatedAt
    });

    expect(catalog.viewCoverage.requiredViews).toEqual([
      "MENU",
      "FRONT",
      "LEFT_3Q",
      "LEFT_PROFILE",
      "RIGHT_3Q",
      "RIGHT_PROFILE"
    ]);
    expect(catalog.viewCoverage.extractedViews).toEqual([]);
    expect(recaptureReport.requests[0].linkedCaptureRequestIDs).toEqual(["GFM-CAP-007", "GFM-CAP-010"]);
    expect(recaptureReport.requests[0].requiredEvidence).toEqual(expect.arrayContaining([
      "Full-screen menu evidence for every entered option.",
      "Researcher-applied coverage metadata for beard, mustache, chin, cheek, jaw, neck, and sideburn coverage."
    ]));
    expect(recaptureReport.requests[0].productionBlocker).toBe(true);
  });

  it("keeps coverage metadata separate from native labels and blocks prohibited label classes", () => {
    const fixture = createWorkspace();
    const { catalog } = generateFacialHairResearchCatalog({
      root: fixture.root,
      generatedAt
    });

    expect(catalog.coverageMetadataPolicy.status).toBe("NONE_RECORDED_NO_OPTION_EVIDENCE");
    expect(catalog.coverageMetadataPolicy.fields).toEqual([
      "beardCoverage",
      "mustachePresence",
      "chinCoverage",
      "cheekCoverage",
      "jawCoverage",
      "neckCoverage",
      "sideburnPresence"
    ]);
    expect(catalog.coverageMetadataPolicy.separationRule).toContain("separate from nativeGameLabel and nativeIndex");
    expect(catalog.coverageMetadataPolicy.prohibitedLabels).toEqual(expect.arrayContaining([
      "cultural labels",
      "lifestyle labels",
      "personality labels",
      "race labels",
      "ethnicity labels"
    ]));
  });

  it("writes zero-record exports and evidence placeholders", () => {
    const fixture = createWorkspace();
    const outputs = generateFacialHairResearchCatalog({
      root: fixture.root,
      generatedAt
    });

    writeFacialHairResearchCatalog(outputs, { root: fixture.root });

    const catalog = JSON.parse(fs.readFileSync(path.join(fixture.root, "data/phase-zero/facial_hair.research.json"), "utf8"));
    const csv = fs.readFileSync(path.join(fixture.root, "data/phase-zero/facial_hair.research.csv"), "utf8");
    const readme = fs.readFileSync(path.join(fixture.root, "data/phase-zero/facial-hair-evidence/README.md"), "utf8");

    expect(catalog.records).toEqual([]);
    expect(csv.split("\n")[0]).toContain("stableResearchID,nativeOrder,nativeGameLabel");
    expect(readme).toContain("intentionally empty");
    expect(fs.existsSync(path.join(fixture.root, "data/phase-zero/facial-hair-evidence/right-profile/.gitkeep"))).toBe(true);
  });
});

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-cf27-facial-hair-"));
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
        acceptanceCriteria: ["None is included only if directly visible."]
      }
    ]
  });
  return { root };
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
