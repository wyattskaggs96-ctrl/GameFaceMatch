import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PRODUCTION_PUBLISH_GATE_VERSION,
  evaluateProductionPublishGate,
  isProductionPublishGateApproved,
  requiredProductionPublishGateChecks,
  type ProductionPublishGateInput,
  type ProductionPublishGateReport
} from "@/lib/catalog/production-publish-gate";
// @ts-expect-error Root catalog import validator is plain ESM JavaScript and is exercised here as the command source of truth.
import { createCatalogImportSelfCheckPackage, validateCatalogImport } from "../../scripts/catalog-import-validator.mjs";

describe("production publish gate", () => {
  it("approves only when every publication, verification, evidence, and data-separation gate passes", () => {
    const { packageRoot, catalogPackage } = createCatalogImportSelfCheckPackage();
    const input = validGateInput(packageRoot, catalogPackage);

    const report = evaluateProductionPublishGate(input);

    expect(report.schemaVersion).toBe(PRODUCTION_PUBLISH_GATE_VERSION);
    expect(report.ok).toBe(true);
    expect(report.checks.map((check) => check.name)).toEqual(requiredProductionPublishGateChecks);
    expect(isProductionPublishGateApproved(report)).toBe(true);

    fs.rmSync(packageRoot, { recursive: true, force: true });
  });

  it("blocks each mandatory production gate when its evidence is absent", () => {
    const { packageRoot, catalogPackage } = createCatalogImportSelfCheckPackage();
    const input = validGateInput(packageRoot, catalogPackage);
    input.shippingEnvironment = { ...input.shippingEnvironment, confirmed: false };
    input.menuMap = { ...input.menuMap, complete: false };
    input.categoryCounts = { ...input.categoryCounts, countsByCategory: { head: 2 } };
    input.importValidationReport = { ok: true, checks: [] };
    input.catalogManagerReport = { ...input.catalogManagerReport, approvedForReleaseCandidate: false };
    input.secondPersonVerificationRecords = [];
    input.discrepancies = [{ targetStableID: catalogPackage.items[0].stableInternalID, severity: "blocking", status: "open" }];
    input.supportedTargets = { ...input.supportedTargets, platforms: ["unsupported-test-platform"] };
    catalogPackage.items[0].requiredAngles.straightOn = "";
    catalogPackage.items[0].verificationState = "unverified";
    catalogPackage.items[0].isTestFixture = true;
    catalogPackage.items[0].visibleGameLabelOrIndex = "REPLACE_WITH_VERIFIED_GAME_LABEL";
    catalogPackage.assets[0].relativePath = "data/fixtures/test-only/evidence.png";

    const report = evaluateProductionPublishGate(input);
    const failedChecks = report.checks.filter((check) => check.status === "fail").map((check) => check.name);
    const errorCodes = report.errors.map((error) => error.code);

    expect(report.ok).toBe(false);
    expect(isProductionPublishGateApproved(report)).toBe(false);
    expect(failedChecks).toEqual(expect.arrayContaining([...requiredProductionPublishGateChecks]));
    expect(errorCodes).toEqual(expect.arrayContaining([
      "shippingEnvironmentNotConfirmed",
      "menuMapIncomplete",
      "categoryCountMismatch",
      "missingImportValidationCheck",
      "catalogManagerApprovalMissing",
      "missingSecondPersonVerification",
      "recordStatusNotAllowed",
      "unresolvedBlockingDiscrepancy",
      "unsupportedTarget",
      "fixtureRecordInProduction",
      "placeholderToken"
    ]));

    fs.rmSync(packageRoot, { recursive: true, force: true });
  });

  it("does not treat a single ok boolean as a publish approval", () => {
    const report: ProductionPublishGateReport = {
      schemaVersion: PRODUCTION_PUBLISH_GATE_VERSION,
      ok: true,
      generatedAt: "2026-07-13T00:00:00.000Z",
      catalogVersionID: "unit-test",
      checks: [],
      errors: []
    };

    expect(isProductionPublishGateApproved(report)).toBe(false);
  });
});

function validGateInput(packageRoot: string, catalogPackage: ReturnType<typeof createCatalogImportSelfCheckPackage>["catalogPackage"]): ProductionPublishGateInput {
  const importValidationReport = validateCatalogImport(catalogPackage, {
    packageDirectory: packageRoot,
    repositoryRoot: "..",
    generatedAt: "2026-07-13T00:00:00.000Z"
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
        primaryAcknowledgedAt: "2026-07-13T00:00:00.000Z",
        verifierAcknowledgedAt: "2026-07-13T00:00:00.000Z"
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
    generatedAt: "2026-07-13T00:00:00.000Z"
  };
}
