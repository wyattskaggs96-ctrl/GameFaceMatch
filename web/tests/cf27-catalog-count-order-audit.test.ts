import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root Phase 0 audit CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { generateCatalogCountOrderAudit, writeCatalogCountOrderAudit } from "../../scripts/cf27-catalog-count-order-audit.mjs";

type AuditCategory = {
  categoryID: string;
  categoryLabel: string;
  recordCount: number;
  categoryCompletionStatus: string;
  hasHardFailures: boolean;
  checks: Record<string, { status: string; message: string; missingIndices?: number[]; repeatedIndices?: number[] }>;
};

describe("CF27 catalog count and native-order audit", () => {
  it("summarizes every current research category without production eligibility", () => {
    const report = generateCatalogCountOrderAudit({
      generatedAt: "2026-07-14T06:15:00-04:00"
    });

    expect(report.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(report.productionRecommendationsEnabled).toBe(false);
    expect(report.summary.categoryCount).toBe(12);
    expect(report.summary.productionEligibleCategoryCount).toBe(0);
    expect(report.summary.incompleteCategoryCount).toBe(11);
    expect(report.summary.hardFailureCategoryCount).toBe(4);
    expect(report.blockingIssues.length).toBeGreaterThan(0);
  });

  it("keeps Head Template incomplete because the sequence has gaps, repeats, and no proven end", () => {
    const headTemplate = category("head-template");

    expect(headTemplate.recordCount).toBe(26);
    expect(headTemplate.categoryCompletionStatus).toBe("INCOMPLETE");
    expect(headTemplate.hasHardFailures).toBe(true);
    expect(headTemplate.checks.beginningBoundary.status).toBe("PASS");
    expect(headTemplate.checks.endingBoundary.status).toBe("NOT_PROVEN");
    expect(headTemplate.checks.twoCompleteCounts.status).toBe("NOT_PROVEN");
    expect(headTemplate.checks.missingIndices.status).toBe("FAIL");
    expect(headTemplate.checks.missingIndices.missingIndices).toEqual([15, 19, 20, 25, 26]);
    expect(headTemplate.checks.repeatedIndices.status).toBe("FAIL");
    expect(headTemplate.checks.repeatedIndices.repeatedIndices).toEqual([12, 16]);
    expect(headTemplate.checks.continuityOverlaps.status).toBe("PASS_WITH_NOTES");
    expect(headTemplate.checks.wrappingBehavior.status).toBe("NOT_PROVEN");
    expect(headTemplate.checks.evidenceForEveryClaimedOption.status).toBe("PASS");
    expect(headTemplate.checks.unprovenFinalOptionClaims.status).toBe("FAIL");
  });

  it("flags Skin Tone as incomplete because observed indices skip values and totals are not proven", () => {
    const skinTone = category("skin-tone");

    expect(skinTone.recordCount).toBe(21);
    expect(skinTone.categoryCompletionStatus).toBe("INCOMPLETE");
    expect(skinTone.hasHardFailures).toBe(true);
    expect(skinTone.checks.missingIndices.status).toBe("FAIL");
    expect(skinTone.checks.missingIndices.missingIndices).toEqual([5, 14, 15, 16, 25, 26, 27, 28]);
    expect(skinTone.checks.countMatchesRecordTotal.status).toBe("UNKNOWN");
    expect(skinTone.checks.evidenceForEveryClaimedOption.status).toBe("PASS");
  });

  it("keeps contiguous observed categories incomplete when selector boundaries and totals are unproven", () => {
    for (const categoryID of ["skin-details", "eye-shape", "eye-color"]) {
      const observedCategory = category(categoryID);

      expect(observedCategory.hasHardFailures).toBe(false);
      expect(observedCategory.categoryCompletionStatus).toBe("INCOMPLETE");
      expect(observedCategory.checks.missingIndices.status).toBe("PASS");
      expect(observedCategory.checks.beginningBoundary.status).toBe("NOT_PROVEN");
      expect(observedCategory.checks.endingBoundary.status).toBe("NOT_PROVEN");
      expect(observedCategory.checks.countMatchesRecordTotal.status).toBe("UNKNOWN");
      expect(observedCategory.checks.unprovenFinalOptionClaims.status).toBe("NOT_PROVEN");
    }
  });

  it("keeps uncaptured categories incomplete instead of treating zero records as completion", () => {
    for (const categoryID of ["hairstyle", "hairColor", "facialHair", "facialHairColor"]) {
      const emptyCategory = category(categoryID);

      expect(emptyCategory.recordCount).toBe(0);
      expect(emptyCategory.categoryCompletionStatus).toBe("INCOMPLETE");
      expect(emptyCategory.checks.beginningBoundary.status).toBe("NOT_PROVEN");
      expect(emptyCategory.checks.nativeOrderContinuity.status).toBe("UNKNOWN");
      expect(emptyCategory.checks.evidenceForEveryClaimedOption.status).toBe("UNKNOWN");
    }
  });

  it("writes deterministic research audit outputs", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-count-order-audit-"));
    const report = generateCatalogCountOrderAudit({
      generatedAt: "2026-07-14T06:15:00-04:00"
    });

    writeCatalogCountOrderAudit(report, {
      root,
      outputJsonPath: "data/phase-zero/catalog_count_order_audit.research.json",
      outputCsvPath: "data/phase-zero/catalog_count_order_audit.research.csv",
      markdownPath: "docs/phase-zero/CATALOG_COUNT_AND_NATIVE_ORDER_AUDIT.md"
    });

    const jsonPath = path.join(root, "data/phase-zero/catalog_count_order_audit.research.json");
    const csvPath = path.join(root, "data/phase-zero/catalog_count_order_audit.research.csv");
    const markdownPath = path.join(root, "docs/phase-zero/CATALOG_COUNT_AND_NATIVE_ORDER_AUDIT.md");

    expect(JSON.parse(fs.readFileSync(jsonPath, "utf8")).summary.categoryCount).toBe(12);
    expect(fs.readFileSync(csvPath, "utf8")).toContain("missingIndices");
    expect(fs.readFileSync(markdownPath, "utf8")).toContain("PRIMARY RESEARCH CANDIDATE - NOT PRODUCTION VERIFIED");
  });
});

function category(categoryID: string): AuditCategory {
  const report = generateCatalogCountOrderAudit({
    generatedAt: "2026-07-14T06:15:00-04:00"
  });
  const category = report.categories.find((candidate: AuditCategory) => candidate.categoryID === categoryID);
  expect(category).toBeTruthy();
  return category as AuditCategory;
}
