import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

// @ts-expect-error Root CF27 verifier-session CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import * as sessionModule from "../../scripts/cf27-supported-subset-verifier-session.mjs";

const {
  buildSupportedSubsetVerifierSession,
  checkSupportedSubsetVerifierSession,
  validateCompletedVerifierDecisionExport,
  writeSupportedSubsetVerifierSession
} = sessionModule;

const repositoryRoot = path.resolve(process.cwd(), "..");

describe("CF27 supported-subset verifier session", () => {
  it("builds a READY_FOR_HUMAN_VERIFIER package without creating human decisions or production eligibility", () => {
    const result = buildSupportedSubsetVerifierSession({ root: repositoryRoot });

    expect(result.validation.ok).toBe(true);
    expect(result.validation.summary).toMatchObject({
      verifierQueueCount: 76,
      secondaryAngleSampleCount: 24,
      excludedDuplicateOrOrderRows: 8,
      humanDecisionCount: 0,
      productionApprovedRecords: 0,
      productionCatalogRecords: 0,
      recommendationEligibleRecords: 0,
      humanExecutionStatus: "READY_FOR_HUMAN_VERIFIER"
    });
    expect(result.records).toHaveLength(76);
    expect(result.records.every((record: SessionRecord) => record.productionEligibilityState === "NOT_ELIGIBLE")).toBe(true);
    expect(result.records.every((record: SessionRecord) => record.recommendationEligibilityState === "NOT_ELIGIBLE")).toBe(true);
    expect(result.records.some((record: SessionRecord) => record.evidenceSupportState === "LIMITED_EVIDENCE")).toBe(false);
  });

  it("writes deterministic artifacts and detects stale verifier output", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfm-cf27-supported-subset-session-"));
    copyFixtureTree(root, [
      "data/phase-zero/cf27_supported_subset_classification.json",
      "data/phase-zero/cf27_supported_subset_verifier_queue.json",
      "data/phase-zero/cf27_supported_subset_summary.json",
      "data/catalog/production/catalog_manifest.json"
    ]);
    const result = buildSupportedSubsetVerifierSession({ root });
    writeSupportedSubsetVerifierSession(result, { root });

    expect(() => checkSupportedSubsetVerifierSession(buildSupportedSubsetVerifierSession({ root }), { root })).not.toThrow();
    fs.appendFileSync(path.join(root, "docs/status/CF27_SUPPORTED_SUBSET_VERIFIER_RUNBOOK.md"), "\nSTALE\n");
    expect(() => checkSupportedSubsetVerifierSession(buildSupportedSubsetVerifierSession({ root }), { root })).toThrow(/stale/i);
  });

  it("rejects incomplete template exports because Codex has not supplied human verification", () => {
    const result = buildSupportedSubsetVerifierSession({ root: repositoryRoot });
    const validation = validateCompletedVerifierDecisionExport(result.packageWithHash, { root: repositoryRoot });

    expect(validation.ok).toBe(false);
    expect(validation.importState).toBe("IMPORT_VALIDATION_FAILED");
    expect(validation.errors).toEqual(expect.arrayContaining([
      "missingVerifierID",
      "shippingGameAccessNotConfirmed"
    ]));
    expect(validation.summary).toMatchObject({
      decisionCount: 76,
      expectedDecisionCount: 76,
      productionApprovedRecords: 0,
      productionCatalogRecords: 0,
      recommendationEligibleRecords: 0
    });
  });

  it("accepts a complete human-shaped package only as imported non-production data", () => {
    const result = buildSupportedSubsetVerifierSession({ root: repositoryRoot });
    const completed = createCompletedHumanPackage(result);
    const validation = validateCompletedVerifierDecisionExport(completed, { root: repositoryRoot });

    expect(validation.ok).toBe(true);
    expect(validation.importState).toBe("IMPORTED_NON_PRODUCTION");
    expect(validation.summary).toMatchObject({
      decisionCount: 76,
      expectedDecisionCount: 76,
      secondaryAngleResultCount: 24,
      expectedSecondaryAngleResultCount: 24,
      productionApprovedRecords: 0,
      productionCatalogRecords: 0,
      recommendationEligibleRecords: 0
    });
  });

  it("rejects out-of-subset records, fixture verifier IDs, missing notes, missing sample results, and promotion fields", () => {
    const result = buildSupportedSubsetVerifierSession({ root: repositoryRoot });
    const completed = createCompletedHumanPackage(result);
    completed.verifierEnvironment.verifierId = "fixture-verifier-test-only";
    completed.recordDecisions[0].decisionStatus = "VERIFIED_WITH_NOTES";
    completed.recordDecisions[0].requiredNotes = "";
    completed.recordDecisions.push({
      ...completed.recordDecisions[0],
      candidateID: result.excludedIssueRows[0].candidateID
    });
    completed.secondaryAngleResults = completed.secondaryAngleResults.slice(1);
    completed.productionApprovedRecords = 1;

    const validation = validateCompletedVerifierDecisionExport(completed, { root: repositoryRoot });

    expect(validation.ok).toBe(false);
    expect(validation.errors).toEqual(expect.arrayContaining([
      "fixtureOrInvalidVerifierID",
      `missingRequiredNotes:${result.records[0].candidateID}`,
      `unknownOrOutOfSubsetCandidate:${result.excludedIssueRows[0].candidateID}`,
      `missingSecondaryAngleResult:${result.sampleRows[0].candidateID}`,
      "forbiddenProductionField:productionApprovedRecords"
    ]));
  });

  it("rejects duplicate candidate decisions and invalid verification status enums", () => {
    const result = buildSupportedSubsetVerifierSession({ root: repositoryRoot });
    const completed = createCompletedHumanPackage(result);
    completed.recordDecisions[0].decisionStatus = "APPROVED";
    completed.recordDecisions.push({ ...completed.recordDecisions[0] });

    const validation = validateCompletedVerifierDecisionExport(completed, { root: repositoryRoot });

    expect(validation.ok).toBe(false);
    expect(validation.errors).toEqual(expect.arrayContaining([
      `invalidDecisionStatus:${result.records[0].candidateID}`,
      `duplicateCandidateDecision:${result.records[0].candidateID}`
    ]));
  });

  it("requires every duplicate/order exception row to have a human disposition and observation", () => {
    const result = buildSupportedSubsetVerifierSession({ root: repositoryRoot });
    const completed = createCompletedHumanPackage(result);
    const missing = completed.duplicateAndOrderDispositionRows[0].candidateID;
    const incomplete = completed.duplicateAndOrderDispositionRows[1].candidateID;
    completed.duplicateAndOrderDispositionRows = completed.duplicateAndOrderDispositionRows.slice(1);
    completed.duplicateAndOrderDispositionRows[0].verifierDisposition = "";

    const validation = validateCompletedVerifierDecisionExport(completed, { root: repositoryRoot });

    expect(validation.ok).toBe(false);
    expect(validation.errors).toEqual(expect.arrayContaining([
      `missingDuplicateOrderExceptionReview:${missing}`,
      `incompleteDuplicateOrderExceptionReview:${incomplete}`
    ]));
  });

  it("requires generated derivative evidence references to resolve when local evidence is available", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfm-cf27-supported-subset-session-evidence-"));
    copyFixtureTree(root, [
      "data/phase-zero/cf27_supported_subset_classification.json",
      "data/phase-zero/cf27_supported_subset_verifier_queue.json",
      "data/phase-zero/cf27_supported_subset_summary.json",
      "data/catalog/production/catalog_manifest.json"
    ]);
    fs.mkdirSync(path.join(root, "data/phase-zero/derivative-frames"), { recursive: true });

    const result = buildSupportedSubsetVerifierSession({ root });

    expect(result.validation.ok).toBe(false);
    expect(result.validation.errors.some((error: string) => error.includes("derivative evidence path is missing"))).toBe(true);
  });
});

type SessionRecord = {
  evidenceSupportState: string;
  productionEligibilityState: string;
  recommendationEligibilityState: string;
};

function createCompletedHumanPackage(result: ReturnType<typeof buildSupportedSubsetVerifierSession>) {
  const verifierId = "verifier-q04-102-human";
  const completed = structuredClone(result.packageWithHash);
  delete completed.integrityHash;
  completed.sessionManifest.verifierSessionModel = {
    ...completed.sessionManifest.verifierSessionModel,
    verifierSessionId: "cf27-supported-subset-session-human-001",
    verifierId,
    startedAt: "2026-08-03T10:00:00.000Z",
    completedAt: "2026-08-03T13:00:00.000Z",
    verificationDate: "2026-08-03",
    shippingGameAccessConfirmed: true,
    independentInspectionConfirmed: true,
    primarySummaryNotUsedAsSoleBasis: true,
    environmentComplete: true,
    decisionCount: 76,
    completionState: "READY_TO_EXPORT",
    exportedAt: "2026-08-03T13:05:00.000Z",
    notes: "Human-shaped unit-test package; not repository real decisions."
  };
  completed.verifierEnvironment = {
    ...completed.verifierEnvironment,
    verifierId,
    verificationDate: "2026-08-03",
    gameTitleDisplayed: "EA SPORTS College Football 27",
    platform: "Xbox",
    consoleModel: "Xbox Series X",
    gameVersion: "unknown",
    patchOrInstalledUpdate: "unknown",
    mode: "Road to Glory",
    creationPath: "Road to Glory > Create Player > Appearance",
    independentlyAccessedShippingGame: true,
    environmentEvidenceReference: "verifier-environment-evidence-human-001"
  };
  completed.verifierAttestation = {
    ...completed.verifierAttestation,
    verifierId,
    attestationTimestamp: "2026-08-03T13:04:00.000Z",
    attestationAccepted: true,
    realSecondPerson: true,
    independentlyAccessedShippingGame: true,
    didNotMerelyApprovePrimarySummary: true,
    reviewedCandidateAndEvidencePresented: true,
    recordedDisagreementsHonestly: true,
    didNotGuessMissingLabelsOrderCountsOrViews: true,
    understandsNotPublishingCatalog: true,
    understandsCatalogManagerApprovalSeparate: true
  };
  completed.recordDecisions = completed.recordDecisions.map((row: RecordDecisionTemplate) => ({
    ...row,
    independentObservation: `Verifier independently checked ${row.candidateID}.`,
    candidateIdentityConfirmed: "yes",
    nativeLabelConfirmed: "yes",
    nativeIndexConfirmed: "yes",
    nativeOrderConfirmed: "yes",
    evidenceFilesResolve: "yes",
    frontViewConfirmed: "yes",
    secondaryAngleReviewed: row.secondaryAngleReviewed === "not_selected" ? "not_selected" : "yes",
    menuCountConfirmed: "yes",
    duplicateRelationshipConfirmed: row.duplicateRelationshipConfirmed || "not_applicable",
    environmentCompatible: "yes",
    decisionStatus: "VERIFIED",
    decisionTimestamp: "2026-08-03T13:00:00.000Z"
  }));
  completed.secondaryAngleResults = completed.secondaryAngleResults.map((row: SecondaryAngleTemplate) => ({
    ...row,
    reviewed: "yes",
    verifierObservation: `Verifier reviewed secondary angle for ${row.candidateID}.`,
    result: "confirmed"
  }));
  completed.menuCounts = completed.menuCounts.map((row: MenuCountTemplate) => ({
    ...row,
    independentVerifierCount: row.representedInSupportedSubset === "yes" ? "1" : "unknown",
    firstVisibleValue: "unknown",
    finalVisibleValue: "unknown",
    boundaryOrWrapObserved: "unknown",
    evidenceReference: "verifier-count-evidence-human-001",
    countConfirmed: row.representedInSupportedSubset === "yes" ? "yes" : "uncertain"
  }));
  completed.duplicateAndOrderDispositionRows = completed.duplicateAndOrderDispositionRows.map((row: Record<string, unknown>) => ({
    ...row,
    verifierDisposition: "not_in_supported_subset",
    verifierObservation: "Excluded limited-evidence row preserved for later human/catalog-manager disposition.",
    notes: "No production or recommendation eligibility granted."
  }));
  return completed;
}

type RecordDecisionTemplate = {
  candidateID: string;
  secondaryAngleReviewed: string;
  duplicateRelationshipConfirmed: string;
};

type SecondaryAngleTemplate = {
  candidateID: string;
};

type MenuCountTemplate = {
  representedInSupportedSubset: string;
};

function copyFixtureTree(root: string, relativePaths: string[]) {
  for (const relativePath of relativePaths) {
    const source = path.join(repositoryRoot, relativePath);
    const destination = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
}
