import { describe, expect, it } from "vitest";
import { createPhase0AuditDashboardReport } from "@/lib/phase-zero/phase-zero-audit-dashboard";
import type { CapturedAngleID, GameCatalogItem, GameCatalogManifest } from "@/types/domain";

describe("Phase 0 audit dashboard", () => {
  it("reports the empty production catalog as blocked without inventing progress", () => {
    const report = createPhase0AuditDashboardReport();

    expect(report.catalogVersion.identifier).toBe("empty-production");
    expect(report.progress.totalCaptured).toBe(0);
    expect(report.progress.totalVerified).toBe(0);
    expect(report.currentEnvironment.state).toBe("blocked");
    expect(report.productionGateState.status).toBe("blocked");
    expect(report.highestPriorityNextAction).toMatch(/Create a real College Football 27 audit session/);
    expect(report.categoryProgress.every((category) => category.status === "blocked")).toBe(true);
  });

  it("ignores fixture records even when a fixture is placed into a production-shaped manifest", () => {
    const manifest = manifestWithItems([catalogItem({ sourceType: "testFixture", isTestFixture: true })]);
    const report = createPhase0AuditDashboardReport({ manifest, productionMode: true });

    expect(report.ignoredNonProductionRecordCount).toBe(1);
    expect(report.progress.totalCaptured).toBe(0);
    expect(report.progress.totalVerified).toBe(0);
    expect(report.blockedStates).toContain("1 non-production records were ignored for production dashboard progress.");
    expect(report.productionGateState.status).toBe("blocked");
  });

  it("summarizes production category counts, missing views, and second-review progress from production records only", () => {
    const manifest = manifestWithItems([
      catalogItem({
        category: "Head preset",
        requiredAngles: {
          straightOn: "evidence/straight.png",
          left45: "evidence/left45.png",
          right45: "evidence/right45.png",
          leftProfile: "evidence/left-profile.png",
          rightProfile: "evidence/right-profile.png"
        },
        sourceImageReferences: ["evidence/straight.png"],
        auditTrail: {
          auditSessionID: "audit-session-synthetic-test-only",
          firstReviewID: "first-review-synthetic-test-only",
          secondReviewID: "second-review-synthetic-test-only",
          menuInstructionVerified: true
        }
      }),
      catalogItem({
        stableInternalID: "SYNTHETIC_TEST_ONLY_HAIR_001",
        category: "Hairstyle",
        verificationState: "unverified",
        requiredAngles: {
          straightOn: "evidence/hair-straight.png"
        } as Record<CapturedAngleID, string>,
        sourceImageReferences: []
      })
    ]);
    const report = createPhase0AuditDashboardReport({ manifest });

    expect(report.progress.totalCaptured).toBe(2);
    expect(report.progress.totalVerified).toBe(1);
    expect(report.progress.missingViews).toBe(4);
    expect(report.progress.missingEvidence).toBe(1);
    expect(report.secondVerifierProgress).toMatchObject({ completed: 1, total: 2, status: "blocked" });
    expect(report.categoryProgress.find((category) => category.id === "headCatalog")).toMatchObject({
      capturedCount: 1,
      verifiedCount: 1,
      missingViewCount: 0,
      status: "ready"
    });
    expect(report.categoryProgress.find((category) => category.id === "hairstyleCatalog")).toMatchObject({
      capturedCount: 1,
      verifiedCount: 0,
      missingViewCount: 4,
      missingEvidenceCount: 1,
      status: "blocked"
    });
  });
});

function manifestWithItems(items: GameCatalogItem[]): GameCatalogManifest {
  return {
    sourceType: "production",
    catalogVersion: {
      identifier: "synthetic-test-only-dashboard",
      gameVersion: "synthetic-test-only-version",
      platform: "synthetic-test-only-platform",
      verifiedAt: "2026-07-12"
    },
    generatedAt: "2026-07-12T00:00:00.000Z",
    isProduction: true,
    packageChecksum: "synthetic-test-only-checksum",
    items
  };
}

function catalogItem(overrides: Partial<GameCatalogItem> = {}): GameCatalogItem {
  const catalogVersion = {
    identifier: "synthetic-test-only-dashboard",
    gameVersion: "synthetic-test-only-version",
    platform: "synthetic-test-only-platform",
    verifiedAt: "2026-07-12"
  };
  const base: GameCatalogItem = {
    sourceType: "production",
    stableInternalID: "SYNTHETIC_TEST_ONLY_HEAD_001",
    game: "Synthetic Test Game",
    gameVersion: "synthetic-test-only-version",
    patchVersion: "synthetic-test-only-patch",
    platform: "synthetic-test-only-platform",
    gameMode: "Synthetic Test Mode",
    creationPath: "Synthetic Test Creation Path",
    category: "Head preset",
    visibleGameLabelOrIndex: "SYNTHETIC_VISIBLE_LABEL_TEST_ONLY",
    verificationState: "verified",
    capturedDate: "2026-07-12",
    verifiedDate: "2026-07-12",
    sourceImageReferences: ["evidence/synthetic-test-only.png"],
    requiredAngles: {
      straightOn: "evidence/straight.png",
      left45: "evidence/left45.png",
      right45: "evidence/right45.png",
      leftProfile: "evidence/left-profile.png",
      rightProfile: "evidence/right-profile.png"
    },
    geometryMeasurements: {},
    humanAnnotations: {},
    auditTrail: {
      auditSessionID: "audit-session-synthetic-test-only",
      firstReviewID: "first-review-synthetic-test-only",
      menuInstructionVerified: true
    },
    navigationInstructions: [
      {
        sequenceNumber: 1,
        instruction: "Synthetic test-only instruction",
        evidenceAssetID: "evidence/synthetic-test-only.png"
      }
    ],
    catalogVersion,
    isTestFixture: false
  };

  return {
    ...base,
    ...overrides,
    auditTrail: {
      ...base.auditTrail,
      ...overrides.auditTrail
    },
    catalogVersion: overrides.catalogVersion ?? base.catalogVersion
  };
}
