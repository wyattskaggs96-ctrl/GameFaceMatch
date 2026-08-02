import { describe, expect, it } from "vitest";
import {
  calculatePhase0CompletionMetrics,
  createPhase0CompletionDashboard,
  getPhase0CompletionStatus,
  type Phase0CompletionCategoryProgress
} from "@/lib/phase-zero/phase-zero-completion-dashboard";
import { loadPhase0CompletionArtifacts } from "@/lib/phase-zero/phase-zero-completion-artifacts.server";

const currentArtifacts = loadPhase0CompletionArtifacts();

describe("Phase 0 completion dashboard", () => {
  it("derives current research progress without treating observations as verified", () => {
    const report = createPhase0CompletionDashboard({ ...currentArtifacts, nowISO: "2026-07-14T00:00:00.000Z" });
    const heads = report.categoryProgress.find((category) => category.id === "headTemplates");
    const skinTone = report.categoryProgress.find((category) => category.id === "skinTone");
    const dependencyTests = report.categoryProgress.find((category) => category.id === "dependencyTests");
    const secondVerification = report.categoryProgress.find((category) => category.id === "secondVerification");

    expect(report.categoryProgress.map((category) => category.id)).toEqual([
      "environment",
      "creationPaths",
      "menuHierarchy",
      "headTemplates",
      "hairstyles",
      "hairColors",
      "facialHair",
      "facialHairColors",
      "skinTone",
      "skinDetails",
      "eyeShape",
      "eyeColor",
      "eyebrows",
      "nose",
      "ears",
      "mouth",
      "jawChinCheeks",
      "additionalGeometryControls",
      "bodyHeightWeightPhysique",
      "dependencyTests",
      "evidenceManifest",
      "catalogExports",
      "secondVerification",
      "manualTopThreeFeasibilityStudy"
    ]);
    expect(heads?.observed).toBeGreaterThan(0);
    expect(heads?.cataloged).toBeGreaterThan(0);
    expect(heads?.independentlyVerified).toBe(0);
    expect(heads?.productionApproved).toBe(0);
    expect(skinTone?.observed).toBeGreaterThan(0);
    expect(skinTone?.status).toBe("qaReviewed");
    expect(dependencyTests?.observed).toBe(2);
    expect(dependencyTests?.cataloged).toBe(0);
    expect(dependencyTests?.status).toBe("observed");
    expect(dependencyTests?.sourceSummary).toMatch(/2 of 16 dependency/);
    expect(dependencyTests?.blockingIssueCount).toBeGreaterThanOrEqual(14);
    expect(secondVerification?.status).toBe("notStarted");
    expect(report.productionReadiness.status).toBe("blocked");
    expect(report.productionReadiness.reason).toMatch(/No independently verified/);
    expect(report.highestPriorityMissingCapture).toMatch(/^P0: GFM-CAP-011/);
    expect(report.evidenceCoverageControlCenter?.summary).toMatchObject({
      captureAssignments: 15,
      productionCatalogRecords: 0,
      secondVerifiedRecords: 0,
      productionRecommendationsEnabled: false
    });
    expect(report.evidenceCoverageControlCenter?.nextRecordingIDs).toEqual(["GFM-CAP-011", "GFM-CAP-012", "GFM-CAP-013"]);
    expect(report.appearanceMenuGapSummary).toMatchObject({
      confirmedPresentIncomplete: 13,
      confirmedPresentCompleteForResearch: 0,
      suspectedButNotObserved: 6,
      unknownBecauseMenuNotFullyInspected: 3,
      productionEligibleRows: 0
    });
  });

  it("surfaces coverage assignments without treating them as production readiness", () => {
    const report = createPhase0CompletionDashboard(currentArtifacts);
    const controlCenter = report.evidenceCoverageControlCenter;

    expect(controlCenter).not.toBeNull();
    expect(controlCenter?.categoryCoverage.find((category) => category.categoryID === "head_templates")).toMatchObject({
      observedCandidateRecords: 26,
      productionApprovedRecords: 0,
      productionReady: false
    });
    expect(controlCenter?.captureAssignments.find((assignment) => assignment.captureID === "GFM-CAP-004")).toMatchObject({
      category: "Head templates",
      subcategory: "Standardized head views",
      productionReadiness: "BLOCKED_RESEARCH_ONLY_NOT_SECOND_VERIFIED"
    });
    expect(controlCenter?.recordingOrder[0]).toMatchObject({
      captureIDs: ["GFM-CAP-011", "GFM-CAP-012", "GFM-CAP-013", "GFM-CAP-001"]
    });
  });

  it("keeps uncataloged required categories visible as zero-progress blockers", () => {
    const report = createPhase0CompletionDashboard(currentArtifacts);
    const hairstyles = report.categoryProgress.find((category) => category.id === "hairstyles");
    const facialHair = report.categoryProgress.find((category) => category.id === "facialHair");
    const facialHairColors = report.categoryProgress.find((category) => category.id === "facialHairColors");

    expect(hairstyles).toMatchObject({
      required: true,
      evidenceAvailable: 0,
      observed: 0,
      cataloged: 0,
      independentlyVerified: 0,
      productionApproved: 0,
      status: "notStarted"
    });
    expect(facialHair).toMatchObject({
      required: true,
      evidenceAvailable: 0,
      observed: 1,
      cataloged: 1,
      independentlyVerified: 0,
      productionApproved: 0,
      status: "qaReviewed"
    });
    expect(facialHair?.sourceSummary).toMatch(/Facial-hair research catalog exists with 1 record/);
    expect(facialHair?.sourceSummary).toMatch(/complete selector boundaries/);
    expect(facialHair?.nextAction).toMatch(/GFM-CAP-007 and GFM-CAP-010/);
    expect(facialHairColors).toMatchObject({
      required: true,
      evidenceAvailable: 0,
      observed: 1,
      cataloged: 1,
      independentlyVerified: 0,
      productionApproved: 0,
      status: "qaReviewed"
    });
    expect(facialHairColors?.sourceSummary).toMatch(/Facial-hair-color research catalog exists with 1 record/);
    expect(facialHairColors?.sourceSummary).toMatch(/complete selector boundaries/);
    expect(facialHairColors?.nextAction).toMatch(/GFM-CAP-007 and GFM-CAP-010/);
  });

  it("calculates completion percentages from the six evidence-to-approval gates", () => {
    const metrics = calculatePhase0CompletionMetrics([
      category({ evidenceAvailable: 1, observed: 1, cataloged: 1, qaReviewed: 1 }),
      category({ evidenceAvailable: 1, observed: 1 }),
      category({})
    ]);

    expect(metrics).toEqual({
      overallPhase0CompletionPercent: 33,
      evidenceCompletionPercent: 67,
      catalogCompletionPercent: 33,
      verificationCompletionPercent: 0
    });
  });

  it("orders status transitions without allowing QA review to imply verification", () => {
    expect(getPhase0CompletionStatus(category({}))).toBe("notStarted");
    expect(getPhase0CompletionStatus(category({ evidenceAvailable: 1 }))).toBe("evidenceAvailable");
    expect(getPhase0CompletionStatus(category({ evidenceAvailable: 1, observed: 1 }))).toBe("observed");
    expect(getPhase0CompletionStatus(category({ evidenceAvailable: 1, observed: 1, cataloged: 1 }))).toBe("cataloged");
    expect(getPhase0CompletionStatus(category({ evidenceAvailable: 1, observed: 1, cataloged: 1, qaReviewed: 1 }))).toBe("qaReviewed");
    expect(getPhase0CompletionStatus(category({ independentlyVerified: 1 }))).toBe("verified");
    expect(getPhase0CompletionStatus(category({ productionApproved: 1 }))).toBe("productionApproved");
  });
});

function category(overrides: Partial<Phase0CompletionCategoryProgress>): Phase0CompletionCategoryProgress {
  return {
    id: "environment",
    label: "Synthetic test category",
    required: true,
    evidenceAvailable: 0,
    observed: 0,
    cataloged: 0,
    qaReviewed: 0,
    independentlyVerified: 0,
    productionApproved: 0,
    recaptureRequired: 0,
    blockingIssueCount: 0,
    status: "notStarted",
    completionPercent: 0,
    sourceSummary: "Synthetic test-only row.",
    nextAction: "Synthetic test-only action.",
    ...overrides
  };
}
