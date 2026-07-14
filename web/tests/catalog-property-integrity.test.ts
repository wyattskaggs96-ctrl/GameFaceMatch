import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  addCatalogRelease,
  createCatalogReleaseRecord,
  createEmptyCatalogReleaseRegistry,
  transitionCatalogRelease,
  validateCatalogReleaseRegistryIntegrity,
  verifyCatalogReleaseRecordIntegrity
} from "@/lib/catalog/immutable-catalog-release";
import {
  evaluateProductionPublishGate,
  isProductionPublishGateApproved,
  type ProductionPublishGateInput
} from "@/lib/catalog/production-publish-gate";
import type { CatalogReleaseNotes, GameCatalogManifest } from "@/types/domain";
// @ts-expect-error Root catalog import validator is plain ESM JavaScript and is exercised here as the command source of truth.
import { createCatalogImportSelfCheckPackage, formatCatalogImportReport, validateCatalogImport } from "../../scripts/catalog-import-validator.mjs";
// @ts-expect-error Root catalog CLI is plain ESM JavaScript and supplies the checksum algorithm used by publication gates.
import { calculateDeterministicChecksum } from "../../scripts/catalog-tools.mjs";

const repositoryRoot = path.resolve("..");
const now = "2026-07-13T00:00:00.000Z";

describe("catalog property and integrity tests", () => {
  it("rejects generated stable-ID collisions across package identifiers", () => {
    const cases: IntegrityCase[] = [
      {
        name: "duplicate stable internal IDs",
        mutate: (catalogPackage) => {
          addSiblingItem(catalogPackage, { stableInternalID: catalogPackage.items[0].stableInternalID });
        },
        expectedCodes: ["duplicateStableID", "duplicateID"]
      },
      {
        name: "duplicate asset IDs",
        mutate: (catalogPackage) => {
          catalogPackage.assets.push({ ...structuredClone(catalogPackage.assets[0]) });
        },
        expectedCodes: ["duplicateID"]
      },
      {
        name: "duplicate review IDs",
        mutate: (catalogPackage) => {
          catalogPackage.reviews.push({ ...structuredClone(catalogPackage.reviews[0]) });
        },
        expectedCodes: ["duplicateID"]
      }
    ];

    for (const testCase of cases) {
      expectImportFailure(testCase);
    }
  });

  it("rejects generated native-order continuity failures", () => {
    const cases: IntegrityCase[] = [
      {
        name: "missing positive native order",
        mutate: (catalogPackage) => {
          catalogPackage.items[0].nativeOrder = 0;
        },
        expectedCodes: ["missingNativeOrder"]
      },
      {
        name: "native order gap",
        mutate: (catalogPackage) => {
          addSiblingItem(catalogPackage, { nativeOrder: 3 });
        },
        expectedCodes: ["nativeOrderGap"]
      },
      {
        name: "duplicate native order creates a continuity error",
        mutate: (catalogPackage) => {
          addSiblingItem(catalogPackage, { nativeOrder: 1 });
        },
        expectedCodes: ["nativeOrderGap"]
      }
    ];

    for (const testCase of cases) {
      expectImportFailure(testCase);
    }
  });

  it("rejects generated invalid supersession chains", () => {
    const cases: IntegrityCase[] = [
      {
        name: "missing supersession reference",
        mutate: (catalogPackage) => {
          catalogPackage.items[0].supersededByStableID = "CF27_TESTONLY_RTG_HEAD_999";
        },
        expectedCodes: ["invalidSupersessionReference"]
      },
      {
        name: "deprecated record without context or replacement",
        mutate: (catalogPackage) => {
          catalogPackage.items[0].deprecated = true;
          catalogPackage.items[0].deprecatedContext = "";
        },
        expectedCodes: ["deprecatedContextMissing", "invalidSupersessionChain"]
      },
      {
        name: "supersession cycle",
        mutate: (catalogPackage) => {
          const original = catalogPackage.items[0];
          const replacement = addSiblingItem(catalogPackage, { stableInternalID: "CF27_TESTONLY_RTG_HEAD_002", nativeOrder: 2 });
          original.supersededByStableID = replacement.stableInternalID;
          replacement.supersededByStableID = original.stableInternalID;
        },
        expectedCodes: ["supersessionCycle"]
      }
    ];

    for (const testCase of cases) {
      expectImportFailure(testCase);
    }
  });

  it("rejects generated non-portable or fixture evidence paths with repair suggestions", () => {
    const cases: IntegrityCase[] = [
      {
        name: "absolute local path",
        mutate: (catalogPackage) => {
          catalogPackage.assets[0].relativePath = "/Users/example/evidence.png";
        },
        expectedCodes: ["absoluteLocalPath"]
      },
      {
        name: "unsafe traversal",
        mutate: (catalogPackage) => {
          catalogPackage.assets[0].relativePath = "../evidence.png";
        },
        expectedCodes: ["unsafeTraversal"]
      },
      {
        name: "fixture evidence path",
        mutate: (catalogPackage) => {
          catalogPackage.assets[0].relativePath = "data/fixtures/test-only/evidence.png";
        },
        expectedCodes: ["fixtureEvidencePath"]
      },
      {
        name: "missing evidence path",
        mutate: (catalogPackage) => {
          catalogPackage.assets[0].relativePath = "";
        },
        expectedCodes: ["missingAssetPath"]
      }
    ];

    for (const testCase of cases) {
      const report = expectImportFailure(testCase);
      expect(report.repairSuggestions.length, testCase.name).toBeGreaterThan(0);
    }
  });

  it("rejects generated invalid verification enums and unverified production records", () => {
    const cases: IntegrityCase[] = [
      {
        name: "unknown verification state",
        mutate: (catalogPackage) => {
          catalogPackage.items[0].verificationState = "APPROVED_BY_ENV";
        },
        expectedCodes: ["invalidVerificationState"]
      },
      {
        name: "uppercase verified enum",
        mutate: (catalogPackage) => {
          catalogPackage.items[0].verificationState = "VERIFIED";
        },
        expectedCodes: ["invalidVerificationState"]
      },
      {
        name: "known but unverified state",
        mutate: (catalogPackage) => {
          catalogPackage.items[0].verificationState = "unverified";
          catalogPackage.items[0].verifiedDate = null;
        },
        expectedCodes: ["unverifiedRecord"]
      }
    ];

    for (const testCase of cases) {
      expectImportFailure(testCase);
    }
  });

  it("detects immutable release mutations and invalid release registry states", async () => {
    const release = await createCatalogReleaseRecord({
      manifest: releaseManifest("catalog-property-release-v1"),
      status: "approvedRelease",
      releaseNotes: releaseNotes("Approved property-test release."),
      createdAt: now
    });
    const registry = addCatalogRelease(createEmptyCatalogReleaseRegistry(), release);
    const mutated = structuredClone(release);
    mutated.manifest.items[0].visibleGameLabelOrIndex = "mutated property-test label";

    const mutationReport = await verifyCatalogReleaseRecordIntegrity(mutated);
    expect(mutationReport.ok).toBe(false);
    expect(codes(mutationReport)).toContain("immutableReleaseModified");

    const duplicatedRegistry = {
      ...registry,
      releases: [registry.releases[0], structuredClone(registry.releases[0])]
    };
    const duplicateReport = await validateCatalogReleaseRegistryIntegrity(duplicatedRegistry);
    expect(duplicateReport.ok).toBe(false);
    expect(codes(duplicateReport)).toContain("duplicateReleaseVersion");

    await expect(transitionCatalogRelease({
      registry,
      catalogVersionID: "catalog-property-release-v1",
      toStatus: "draft",
      changedAt: now
    })).rejects.toMatchObject({ code: "immutablePublishedRelease" });
  });

  it("rejects generated fixture segregation failures", () => {
    const cases: IntegrityCase[] = [
      {
        name: "fixture manifest source type",
        mutate: (catalogPackage) => {
          catalogPackage.manifest.sourceType = "testFixture";
        },
        expectedCodes: ["nonProductionSourceInProduction", "fixtureLeakage"]
      },
      {
        name: "fixture catalog item",
        mutate: (catalogPackage) => {
          catalogPackage.items[0].sourceType = "testFixture";
          catalogPackage.items[0].isTestFixture = true;
        },
        expectedCodes: ["nonProductionSourceInProduction", "fixtureLeakage", "fixtureFlag", "fixtureRecordInProduction"]
      },
      {
        name: "fixture asset path",
        mutate: (catalogPackage) => {
          catalogPackage.assets[0].relativePath = "fixtures/test-only/evidence.png";
        },
        expectedCodes: ["fixtureEvidencePath"]
      }
    ];

    for (const testCase of cases) {
      expectImportFailure(testCase);
    }
  });

  it("rejects generated evidence association failures", () => {
    const cases: IntegrityCase[] = [
      {
        name: "missing required angle",
        mutate: (catalogPackage) => {
          catalogPackage.items[0].requiredAngles.left45 = "";
        },
        expectedCodes: ["missingRequiredAngle"]
      },
      {
        name: "required angle references missing asset",
        mutate: (catalogPackage) => {
          catalogPackage.items[0].requiredAngles.right45 = "missing-asset";
        },
        expectedCodes: ["missingSourceImage", "missingEvidenceAsset"]
      },
      {
        name: "navigation instruction references missing evidence",
        mutate: (catalogPackage) => {
          catalogPackage.items[0].navigationInstructions[0].evidenceAssetID = "missing-navigation-asset";
        },
        expectedCodes: ["missingAsset", "missingNavigationEvidence"]
      }
    ];

    for (const testCase of cases) {
      expectImportFailure(testCase);
    }

    withSelfCheckPackage(({ catalogPackage, packageRoot }) => {
      catalogPackage.manifest.declaredItemCount = 99;
      withChecksums(catalogPackage);
      const report = validateCatalogImport(catalogPackage, {
        packageDirectory: packageRoot,
        repositoryRoot,
        generatedAt: now
      });
      expect(report.ok, "manifest item count mismatch").toBe(false);
      expect(codes(report), "manifest item count mismatch").toContain("incorrectManifestItemCount");
      return report;
    });
  });

  it("rejects generated catalog-version compatibility failures", () => {
    const report = withSelfCheckPackage(({ catalogPackage, packageRoot }) => {
      return validateCatalogImport(catalogPackage, {
        packageDirectory: packageRoot,
        repositoryRoot,
        supportedPlatforms: [catalogPackage.items[0].platform],
        supportedGameVersions: ["unsupported-test-only-version"],
        supportedGameModes: [catalogPackage.items[0].gameMode],
        supportedCreationPaths: [catalogPackage.items[0].creationPath],
        generatedAt: now
      });
    });

    expect(report.ok).toBe(false);
    expect(codes(report)).toContain("unsupportedTarget");
  });

  it("rejects generated malformed dependency records", () => {
    const cases: IntegrityCase[] = [
      {
        name: "dependency field is not an array",
        mutate: (catalogPackage) => {
          catalogPackage.items[0].dependencies = "invalid";
        },
        expectedCodes: ["invalidDependencyRecord"]
      },
      {
        name: "dependency missing ID, target, condition, and evidence",
        mutate: (catalogPackage) => {
          catalogPackage.items[0].dependencies = [{}];
        },
        expectedCodes: ["missingDependencyID", "invalidDependencyRecord", "missingDependencyEvidence"]
      },
      {
        name: "duplicate dependency IDs",
        mutate: (catalogPackage) => {
          catalogPackage.items[0].dependencies = [
            validDependency("dependency-test-only-a", "asset-navigation"),
            validDependency("dependency-test-only-a", "asset-navigation")
          ];
        },
        expectedCodes: ["duplicateDependencyID"]
      },
      {
        name: "dependency references unavailable evidence",
        mutate: (catalogPackage) => {
          catalogPackage.items[0].dependencies = [validDependency("dependency-test-only-missing-evidence", "missing-dependency-evidence")];
        },
        expectedCodes: ["missingDependencyEvidence"]
      },
      {
        name: "dependency references its own item",
        mutate: (catalogPackage) => {
          catalogPackage.items[0].dependencies = [
            {
              ...validDependency("dependency-test-only-self", "asset-navigation"),
              dependsOnStableID: catalogPackage.items[0].stableInternalID
            }
          ];
        },
        expectedCodes: ["invalidDependencyRecord"]
      }
    ];

    for (const testCase of cases) {
      expectImportFailure(testCase);
    }
  });

  it("keeps production-gate invariants fail-closed under generated mutations", () => {
    const cases: Array<{
      name: string;
      mutate: (input: ProductionPublishGateInput) => void;
      expectedCodes: string[];
    }> = [
      {
        name: "unconfirmed shipping environment",
        mutate: (input) => {
          input.shippingEnvironment = { ...input.shippingEnvironment, confirmed: false };
        },
        expectedCodes: ["shippingEnvironmentNotConfirmed"]
      },
      {
        name: "incomplete menu map",
        mutate: (input) => {
          input.menuMap = { ...input.menuMap, complete: false };
        },
        expectedCodes: ["menuMapIncomplete"]
      },
      {
        name: "category count mismatch",
        mutate: (input) => {
          input.categoryCounts = { ...input.categoryCounts, countsByCategory: { head: 99 } };
        },
        expectedCodes: ["categoryCountMismatch"]
      },
      {
        name: "import validation missing dependency check",
        mutate: (input) => {
          input.importValidationReport = {
            ...input.importValidationReport,
            checks: input.importValidationReport?.checks?.filter((check) => check.name !== "dependencyRecordValidity")
          };
        },
        expectedCodes: ["missingImportValidationCheck"]
      },
      {
        name: "catalog manager approval missing",
        mutate: (input) => {
          input.catalogManagerReport = { ...input.catalogManagerReport, approvedForReleaseCandidate: false };
        },
        expectedCodes: ["catalogManagerApprovalMissing"]
      },
      {
        name: "second-person verification incomplete",
        mutate: (input) => {
          input.secondPersonVerificationRecords = [];
        },
        expectedCodes: ["missingSecondPersonVerification"]
      },
      {
        name: "unverified record",
        mutate: (input) => {
          input.catalogPackage!.items![0].verificationState = "unverified";
        },
        expectedCodes: ["recordStatusNotAllowed"]
      },
      {
        name: "blocking discrepancy unresolved",
        mutate: (input) => {
          input.discrepancies = [{ targetStableID: input.catalogPackage!.items![0].stableInternalID, severity: "blocking", status: "open" }];
        },
        expectedCodes: ["unresolvedBlockingDiscrepancy"]
      },
      {
        name: "unsupported target",
        mutate: (input) => {
          input.supportedTargets = { ...input.supportedTargets, platforms: ["unsupported-test-only-platform"] };
        },
        expectedCodes: ["unsupportedTarget", "unsupportedShippingPlatform"]
      },
      {
        name: "fixture data",
        mutate: (input) => {
          input.catalogPackage!.items![0].isTestFixture = true;
        },
        expectedCodes: ["fixtureRecordInProduction"]
      },
      {
        name: "placeholder visible label",
        mutate: (input) => {
          input.catalogPackage!.items![0].visibleGameLabelOrIndex = "REPLACE_WITH_VERIFIED_GAME_LABEL";
        },
        expectedCodes: ["placeholderToken"]
      }
    ];

    for (const testCase of cases) {
      withSelfCheckPackage(({ catalogPackage, packageRoot }) => {
        const input = validGateInput(packageRoot, catalogPackage);
        testCase.mutate(input);
        const report = evaluateProductionPublishGate(input);
        expect(report.ok, testCase.name).toBe(false);
        expect(isProductionPublishGateApproved(report), testCase.name).toBe(false);
        expect(codes(report), testCase.name).toEqual(expect.arrayContaining(testCase.expectedCodes));
        return report;
      });
    }
  });

  it("formats malformed import failures with useful messages and repair guidance when available", () => {
    const report = expectImportFailure({
      name: "combined malformed import",
      mutate: (catalogPackage) => {
        catalogPackage.items[0].stableInternalID = "";
        catalogPackage.assets[0].relativePath = "/tmp/raw-face-media.png";
        catalogPackage.items[0].requiredAngles.straightOn = "missing-asset";
        catalogPackage.items[0].dependencies = [{}];
      },
      expectedCodes: ["missingStableID", "absoluteLocalPath", "missingEvidenceAsset", "missingDependencyID"]
    });
    const readable = formatCatalogImportReport(report);

    expect(report.errors.every((entry: { message?: string }) => typeof entry.message === "string" && entry.message.length > 0)).toBe(true);
    expect(report.repairSuggestions.length).toBeGreaterThan(0);
    expect(readable).toContain("FAIL catalog import validation");
    expect(readable).toContain("repair");
  });
});

interface IntegrityCase {
  name: string;
  mutate: (catalogPackage: CatalogPackage) => void;
  expectedCodes: string[];
}

type CatalogPackage = ReturnType<typeof createCatalogImportSelfCheckPackage>["catalogPackage"];
type CatalogImportReport = ReturnType<typeof validateCatalogImport>;

function expectImportFailure(testCase: IntegrityCase): CatalogImportReport {
  return withSelfCheckPackage(({ catalogPackage, packageRoot }) => {
    testCase.mutate(catalogPackage);
    syncManifest(catalogPackage);
    withChecksums(catalogPackage);
    const report = validateCatalogImport(catalogPackage, {
      packageDirectory: packageRoot,
      repositoryRoot,
      generatedAt: now
    });
    expect(report.ok, testCase.name).toBe(false);
    expect(codes(report), testCase.name).toEqual(expect.arrayContaining(testCase.expectedCodes));
    return report;
  });
}

function withSelfCheckPackage<T>(callback: (input: { catalogPackage: CatalogPackage; packageRoot: string }) => T): T {
  const { packageRoot, catalogPackage } = createCatalogImportSelfCheckPackage();
  try {
    return callback({ catalogPackage, packageRoot });
  } finally {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }
}

function addSiblingItem(catalogPackage: CatalogPackage, overrides: Record<string, unknown> = {}) {
  const nextIndex = catalogPackage.items.length + 1;
  const item = structuredClone(catalogPackage.items[0]);
  item.stableInternalID = `CF27_TESTONLY_RTG_HEAD_${String(nextIndex).padStart(3, "0")}`;
  item.nativeOrder = nextIndex;
  item.supersedesStableID = null;
  item.supersededByStableID = null;
  item.deprecated = false;
  item.deprecatedContext = null;
  item.duplicateObservations = [
    {
      observedStableID: item.stableInternalID,
      comparisonStableID: item.stableInternalID,
      evidenceAssetID: "asset-front",
      disposition: "retained"
    }
  ];
  Object.assign(item, overrides);
  catalogPackage.items.push(item);
  catalogPackage.reviews.push(
    {
      ...structuredClone(catalogPackage.reviews[0]),
      reviewID: `review-test-only-first-${item.stableInternalID}`,
      stableInternalID: item.stableInternalID,
      stage: "first"
    },
    {
      ...structuredClone(catalogPackage.reviews[1]),
      reviewID: `review-test-only-second-${item.stableInternalID}`,
      stableInternalID: item.stableInternalID,
      stage: "second"
    }
  );
  syncManifest(catalogPackage);
  return item;
}

function syncManifest(catalogPackage: CatalogPackage) {
  catalogPackage.manifest.items = catalogPackage.items;
  catalogPackage.manifest.declaredItemCount = catalogPackage.items.length;
}

function withChecksums(catalogPackage: CatalogPackage) {
  const checksum = calculateDeterministicChecksum(catalogPackage);
  catalogPackage.manifest.packageChecksum = checksum;
  catalogPackage.publication.sourcePackageChecksum = checksum;
}

function validDependency(dependencyID: string, evidenceFileID: string) {
  return {
    dependencyID,
    dependsOnStableID: null,
    dependsOnMenuID: "menu-test-only",
    condition: "Synthetic test-only dependency condition.",
    evidenceFileIDs: [evidenceFileID]
  };
}

function validGateInput(packageRoot: string, catalogPackage: CatalogPackage): ProductionPublishGateInput {
  const importValidationReport = validateCatalogImport(catalogPackage, {
    packageDirectory: packageRoot,
    repositoryRoot,
    generatedAt: now
  });
  const item = catalogPackage.items[0];
  return {
    catalogPackage,
    importValidationReport,
    catalogManagerReport: {
      approvedForReleaseCandidate: true,
      mandatoryGatesPass: true,
      unresolvedFailureCount: 0,
      repairRequestCount: 0,
      decision: "approvedReleaseCandidate",
      signature: {
        algorithm: "SHA-256",
        scope: "local-catalog-manager-review-report",
        digest: "a".repeat(64)
      }
    },
    secondPersonVerificationRecords: [
      {
        targetStableID: item.stableInternalID,
        finalDisposition: "VERIFIED",
        evidenceExists: true,
        frontViewExists: true,
        secondaryAngleSampleIncluded: true,
        primaryAcknowledgedAt: now,
        verifierAcknowledgedAt: now
      }
    ],
    discrepancies: [],
    shippingEnvironment: {
      confirmed: true,
      platform: item.platform,
      gameVersion: item.gameVersion,
      patchVersion: item.patchVersion,
      gameMode: item.gameMode,
      creationPath: item.creationPath,
      evidenceIDs: ["environment-evidence-test-only"]
    },
    menuMap: {
      complete: true,
      menuCount: 1,
      evidenceIDs: ["menu-evidence-test-only"]
    },
    categoryCounts: {
      complete: true,
      countsByCategory: { [item.category]: 1 },
      evidenceIDs: ["category-count-evidence-test-only"]
    },
    supportedTargets: {
      platforms: [item.platform],
      gameVersions: [item.gameVersion],
      gameModes: [item.gameMode],
      creationPaths: [item.creationPath]
    },
    generatedAt: now
  };
}

function releaseManifest(versionID: string): GameCatalogManifest {
  const item = {
    sourceType: "production",
    stableInternalID: "catalog-property-item",
    game: "EA SPORTS College Football 27",
    gameVersion: "property-test-game-version",
    patchVersion: "property-test-patch",
    platform: "property-test-platform",
    gameMode: "property-test-mode",
    creationPath: "property-test-creation-path",
    category: "property-test-category",
    visibleGameLabelOrIndex: "property-test-visible-label",
    verificationState: "verified",
    capturedDate: now,
    verifiedDate: now,
    sourceImageReferences: ["asset-front", "asset-left45", "asset-right45", "asset-left-profile", "asset-right-profile"],
    requiredAngles: {
      straightOn: "asset-front",
      left45: "asset-left45",
      right45: "asset-right45",
      leftProfile: "asset-left-profile",
      rightProfile: "asset-right-profile"
    },
    geometryMeasurements: {},
    humanAnnotations: { note: "Synthetic property-test catalog item." },
    catalogManagerDisposition: "approved",
    navigationInstructions: [{ sequenceNumber: 1, instruction: "Synthetic property-test navigation.", evidenceAssetID: "asset-front" }],
    catalogVersion: {
      identifier: versionID,
      gameVersion: "property-test-game-version",
      platform: "property-test-platform",
      verifiedAt: now
    },
    isTestFixture: false
  } satisfies GameCatalogManifest["items"][number];

  return {
    sourceType: "production",
    catalogVersion: {
      identifier: versionID,
      gameVersion: "property-test-game-version",
      platform: "property-test-platform",
      verifiedAt: now
    },
    generatedAt: now,
    isProduction: true,
    declaredItemCount: 1,
    releaseStatus: "draft",
    releaseNotes: releaseNotes("Draft property-test release."),
    items: [item]
  };
}

function releaseNotes(summary: string): CatalogReleaseNotes {
  return {
    summary,
    createdAt: now,
    author: "catalog-property-test",
    changes: [{ type: "added", stableInternalID: "catalog-property-item", description: "Synthetic property-test change." }]
  };
}

function codes(report: { errors: Array<{ code: string }> }) {
  return report.errors.map((entry) => entry.code);
}
