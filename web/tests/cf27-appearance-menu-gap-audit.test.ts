import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root Phase 0 gap-audit CLI is plain ESM JavaScript and is exercised here as command source of truth.
import { generateAppearanceMenuGapAudit, writeAppearanceMenuGapAudit } from "../../scripts/cf27-appearance-menu-gap-audit.mjs";

const repositoryRoot = path.resolve(process.cwd(), "..");

describe("CF27 appearance menu gap audit", () => {
  it("classifies current appearance categories without inventing production facts", () => {
    const audit = generateAppearanceMenuGapAudit({ root: repositoryRoot, generatedAt: "2026-07-14T01:30:00-04:00" });
    const byLabel = new Map(audit.rows.map((row: GapRow) => [row.displayedCategoryLabel, row]));

    expect(audit.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(audit.summary).toMatchObject({
      totalRows: 22,
      confirmedPresentIncomplete: 13,
      confirmedPresentCompleteForResearch: 0,
      suspectedButNotObserved: 6,
      confirmedAbsent: 0,
      unknownBecauseMenuNotFullyInspected: 3,
      productionEligibleRows: 0
    });
    expect(audit.rows.every((row: GapRow) => row.productionEligible === false)).toBe(true);
    expect(audit.rows.filter((row: GapRow) => row.classification === "CONFIRMED_ABSENT")).toHaveLength(0);

    expect(byLabel.get("Appearance")).toMatchObject({
      classification: "CONFIRMED_PRESENT_INCOMPLETE",
      evidenceBasis: "MENU_ROW_VISIBLE_ONLY",
      notCaptured: true,
      relatedCaptureRequestIDs: ["GFM-CAP-003"]
    });
    expect(byLabel.get("Head Template")).toMatchObject({
      classification: "CONFIRMED_PRESENT_INCOMPLETE",
      directlySelectedObservationCount: 28,
      directlyCatalogedValueCount: 26,
      capturedWithoutClearIndices: true,
      capturedWithoutSelectorBoundaries: true,
      productionEligible: false
    });
    expect(byLabel.get("Skin Tone")).toMatchObject({
      classification: "CONFIRMED_PRESENT_INCOMPLETE",
      directlyCatalogedValueCount: 21,
      capturedWithoutClearIndices: true
    });
    expect(byLabel.get("Hair")).toMatchObject({
      classification: "CONFIRMED_PRESENT_INCOMPLETE",
      evidenceBasis: "MENU_ROW_VISIBLE_ONLY",
      relatedCaptureRequestIDs: ["GFM-CAP-014"]
    });
    expect(byLabel.get("Hairstyles")).toMatchObject({
      classification: "SUSPECTED_NOT_OBSERVED",
      notes: ["This row is a source-required product gap, not a confirmed College Football 27 native category."]
    });
    expect(byLabel.get("Hair submenu child controls")).toMatchObject({
      classification: "UNKNOWN_MENU_NOT_FULLY_INSPECTED",
      parentMenuLabel: "Hair"
    });
  });

  it("keeps boundary, condition, visual-view, and production-matching gaps explicit", () => {
    const audit = generateAppearanceMenuGapAudit({ root: repositoryRoot });

    expect(audit.summary.capturedWithoutSelectorBoundaries).toBe(22);
    expect(audit.summary.capturedWithoutStableConditions).toBe(19);
    expect(audit.summary.capturedWithoutSufficientVisualViews).toBe(19);
    expect(audit.summary.capturedButUnsuitableForProductionMatching).toBe(22);

    for (const row of audit.rows as GapRow[]) {
      expect(row.capturedButUnsuitableForProductionMatching, row.displayedCategoryLabel).toBe(true);
      expect(row.productionUnsuitableReasons.length, row.displayedCategoryLabel).toBeGreaterThan(0);
    }
  });

  it("writes machine-readable and human-readable outputs", () => {
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-cf27-gap-audit-"));
    copyFixtureInputs(fixtureRoot);
    const audit = generateAppearanceMenuGapAudit({
      root: fixtureRoot,
      generatedAt: "2026-07-14T01:30:00-04:00"
    });

    writeAppearanceMenuGapAudit(audit, { root: fixtureRoot });

    expect(fs.existsSync(path.join(fixtureRoot, "data/phase-zero/appearance_menu_gap_matrix.json"))).toBe(true);
    expect(fs.existsSync(path.join(fixtureRoot, "data/phase-zero/appearance_menu_gap_matrix.csv"))).toBe(true);
    expect(fs.readFileSync(path.join(fixtureRoot, "docs/phase-zero/APPEARANCE_MENU_GAP_MATRIX.md"), "utf8")).toContain("Confirmed present but incomplete: 13");
    expect(fs.readFileSync(path.join(fixtureRoot, "docs/phase-zero/MENU_CAPTURE_GAPS.md"), "utf8")).toContain("Hair submenu child controls");
  });
});

interface GapRow {
  displayedCategoryLabel: string;
  classification: string;
  evidenceBasis: string;
  directlySelectedObservationCount: number;
  directlyCatalogedValueCount: number;
  notCaptured: boolean;
  capturedWithoutClearIndices: boolean;
  capturedWithoutSelectorBoundaries: boolean;
  capturedButUnsuitableForProductionMatching: boolean;
  productionUnsuitableReasons: string[];
  productionEligible: boolean;
  parentMenuLabel: string;
  relatedCaptureRequestIDs: string[];
  notes: string[];
}

function copyFixtureInputs(root: string) {
  const inputs = [
    "data/phase-zero/menu_map.research.json",
    "data/phase-zero/video_timeline.json",
    "data/phase-zero/heads.research.json",
    "data/phase-zero/additional_attributes.research.json",
    "data/phase-zero/capture_requests.json"
  ];
  for (const relativePath of inputs) {
    const destination = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(repositoryRoot, relativePath), destination);
  }
}
