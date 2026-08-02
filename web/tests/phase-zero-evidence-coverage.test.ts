import { describe, expect, it } from "vitest";
// @ts-expect-error Root Phase 0 evidence coverage generator is plain ESM JavaScript and is tested as the command source of truth.
import { buildEvidenceCoverageControlCenter, checkEvidenceCoverageControlCenter } from "../../scripts/phase-zero-evidence-coverage.mjs";

describe("Phase 0 evidence coverage control center", () => {
  it("reconciles current artifacts into honest research-only category coverage", () => {
    const report = buildEvidenceCoverageControlCenter();

    expect(report.summary).toMatchObject({
      researchCandidates: 92,
      primaryApprovedWithNotes: 84,
      duplicateReviewRequired: 5,
      secondVerifiedRecords: 0,
      productionApprovedRecords: 0,
      productionCatalogRecords: 0,
      captureAssignments: 15,
      assignmentsComplete: 0,
      productionRecommendationsEnabled: false
    });
    expect(report.categoryCoverage.find((category: Record<string, unknown>) => category.categoryID === "head_templates")).toMatchObject({
      observedCandidateRecords: 26,
      productionReady: false,
      productionApprovedRecords: 0
    });
    expect(report.categoryCoverage.find((category: Record<string, unknown>) => category.categoryID === "hairstyles")).toMatchObject({
      observedCandidateRecords: 1,
      status: "INCOMPLETE_EVIDENCE",
      productionReady: false
    });
  });

  it("defines all required remaining capture assignments with review-blocked statuses", () => {
    const report = buildEvidenceCoverageControlCenter();
    const IDs = report.captureAssignments.map((assignment: Record<string, unknown>) => assignment.captureID);

    expect(IDs).toEqual([
      "GFM-CAP-011",
      "GFM-CAP-012",
      "GFM-CAP-013",
      "GFM-CAP-001",
      "GFM-CAP-002",
      "GFM-CAP-003",
      "GFM-CAP-004",
      "GFM-CAP-005",
      "GFM-CAP-006",
      "GFM-CAP-007",
      "GFM-CAP-008",
      "GFM-CAP-009",
      "GFM-CAP-010",
      "GFM-CAP-014",
      "GFM-CAP-015"
    ]);
    expect(report.nextRecordingIDs).toEqual(["GFM-CAP-011", "GFM-CAP-012", "GFM-CAP-013"]);
    for (const assignment of report.captureAssignments) {
      expect(assignment.productionStatus).toBe("NOT_PRODUCTION_DATA");
      expect(assignment.productionReadiness).toBe("BLOCKED_RESEARCH_ONLY_NOT_SECOND_VERIFIED");
      expect(assignment.status).not.toBe("COMPLETE");
    }
  });

  it("keeps generated coverage artifacts current", () => {
    const report = buildEvidenceCoverageControlCenter();

    expect(() => checkEvidenceCoverageControlCenter(report)).not.toThrow();
  });
});
