import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

// @ts-expect-error Root CF27 supported-subset classifier CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import * as supportedSubsetModule from "../../scripts/cf27-supported-subset-classification.mjs";

const {
  buildSupportedSubsetClassification,
  checkSupportedSubsetClassification,
  validateSupportedSubsetClassification,
  writeSupportedSubsetClassification
} = supportedSubsetModule;

const repositoryRoot = path.resolve(process.cwd(), "..");

describe("CF27 supported subset classification", () => {
  it("classifies all 92 candidates exactly once without granting production or recommendation eligibility", () => {
    const result = buildSupportedSubsetClassification({ root: repositoryRoot });

    expect(result.validation.ok).toBe(true);
    expect(result.summary).toMatchObject({
      totalCandidates: 92,
      proposedSupportedSubsetCount: 76,
      proposedHeadCount: 24,
      proposedHairstyleCount: 1,
      proposedFacialHairCount: 0,
      duplicateReviewCount: 5,
      orderUnresolvedCount: 3,
      verifierQueueCount: 76,
      deterministicSampleCount: 24,
      productionApprovedCount: 0,
      productionCatalogCount: 0,
      recommendationEligibleCount: 0,
      codexCreatedSecondVerifierDecisions: 0,
      secondVerifiedCount: 0
    });
    expect(result.summary.classificationCountBySupportState).toMatchObject({
      SUPPORTED: 0,
      SUPPORTED_WITH_NOTES: 39,
      USER_CONFIRMATION_REQUIRED: 37,
      LIMITED_EVIDENCE: 16,
      UNSUPPORTED: 0,
      DEPRECATED: 0,
      VERSION_MISMATCH: 0
    });
    expect(result.classification.records).toHaveLength(92);
    expect(new Set(result.classification.records.map((record: ClassificationRecord) => record.candidateID)).size).toBe(92);
    expect(result.classification.records.every((record: ClassificationRecord) => record.verificationStatus === "NOT_VERIFIED")).toBe(true);
    expect(result.classification.records.every((record: ClassificationRecord) => !record.eligibleForProductionPromotion)).toBe(true);
    expect(result.classification.records.every((record: ClassificationRecord) => !record.eligibleForRecommendation)).toBe(true);
  });

  it("keeps evidence support state separate from verification status and excludes limited rows from the verifier subset", () => {
    const result = buildSupportedSubsetClassification({ root: repositoryRoot });
    const verifierIDs = new Set(result.verifierQueue.records.map((record: VerifierRecord) => record.candidateID));
    const duplicateRows = result.classification.records.filter((record: ClassificationRecord) => record.duplicateFlag);
    const orderRows = result.classification.records.filter((record: ClassificationRecord) => record.orderUnresolvedFlag);
    const limitedRows = result.classification.records.filter((record: ClassificationRecord) => record.evidenceSupportState === "LIMITED_EVIDENCE");

    expect(duplicateRows).toHaveLength(5);
    expect(orderRows).toHaveLength(3);
    expect(limitedRows).toHaveLength(16);
    expect(duplicateRows.every((record: ClassificationRecord) => !verifierIDs.has(record.candidateID))).toBe(true);
    expect(orderRows.every((record: ClassificationRecord) => !verifierIDs.has(record.candidateID))).toBe(true);
    expect(limitedRows.every((record: ClassificationRecord) => !verifierIDs.has(record.candidateID))).toBe(true);
    expect(result.verifierQueue.records.every((record: VerifierRecord) => record.productionEligibilityState === "NOT_ELIGIBLE")).toBe(true);
    expect(result.verifierQueue.records.every((record: VerifierRecord) => Boolean(record.requiredIndependentInGameCheck))).toBe(true);
  });

  it("creates a reproducible deterministic 25 percent secondary-angle sample from supported-subset records", () => {
    const result = buildSupportedSubsetClassification({ root: repositoryRoot });
    const repeated = buildSupportedSubsetClassification({ root: repositoryRoot });

    expect(result.classification.deterministicSecondaryAngleSample.method).toMatchObject({
      methodID: "deterministic-sha256-environment-verifier-catalog-category-quartile-v1",
      sampleFraction: 0.25,
      rounding: "ceil",
      eligibleCandidateCount: 76,
      selectedCandidateCount: 24
    });
    expect(result.classification.deterministicSecondaryAngleSample.rows.map((row: SampleRow) => row.candidateID)).toEqual(
      repeated.classification.deterministicSecondaryAngleSample.rows.map((row: SampleRow) => row.candidateID)
    );
    expect(result.classification.deterministicSecondaryAngleSample.rows.every((row: SampleRow) => row.selectionHash.length === 64)).toBe(true);
  });

  it("writes deterministic artifacts and detects stale output", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfm-cf27-supported-subset-"));
    copyFixtureTree(root, [
      "data/status/owner_media_baseline_lock.json",
      "data/phase-zero/primary_review_status.json",
      "data/phase-zero/production_verification_queue.json",
      "data/phase-zero/cf27_existing_media_verification_gap_audit.json",
      "data/phase-zero/cf27_frame_reextractions.json",
      "data/catalog/production/catalog_manifest.json"
    ]);
    const result = buildSupportedSubsetClassification({ root });
    writeSupportedSubsetClassification(result, { root });

    expect(() => checkSupportedSubsetClassification(buildSupportedSubsetClassification({ root }), { root })).not.toThrow();
    fs.appendFileSync(path.join(root, "docs/status/CF27_SUPPORTED_SUBSET_CLASSIFICATION.md"), "\nSTALE\n");
    expect(() => checkSupportedSubsetClassification(buildSupportedSubsetClassification({ root }), { root })).toThrow(/stale/i);
  });

  it("rejects fabricated verifier, production, or recommendation eligibility", () => {
    const result = buildSupportedSubsetClassification({ root: repositoryRoot });
    const compromised = structuredClone(result);
    compromised.classification.records[0].verificationStatus = "VERIFIED";
    compromised.classification.records[0].eligibleForProductionPromotion = true;
    compromised.classification.records[0].eligibleForRecommendation = true;
    compromised.summary.productionApprovedCount = 1;
    compromised.summary.productionCatalogCount = 1;
    compromised.summary.recommendationEligibleCount = 1;
    compromised.summary.codexCreatedSecondVerifierDecisions = 1;
    const validation = validateSupportedSubsetClassification(compromised);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join("\n")).toContain("records a Codex-created verifier decision");
    expect(validation.errors.join("\n")).toContain("Production-approved count must remain 0");
    expect(validation.errors.join("\n")).toContain("Production catalog count must remain 0");
    expect(validation.errors.join("\n")).toContain("Recommendation-eligible count must remain 0");
  });
});

type ClassificationRecord = {
  candidateID: string;
  verificationStatus: string;
  evidenceSupportState: string;
  duplicateFlag: boolean;
  orderUnresolvedFlag: boolean;
  eligibleForProductionPromotion: boolean;
  eligibleForRecommendation: boolean;
};

type VerifierRecord = {
  candidateID: string;
  productionEligibilityState: string;
  requiredIndependentInGameCheck: string;
};

type SampleRow = {
  candidateID: string;
  selectionHash: string;
};

function copyFixtureTree(root: string, relativePaths: string[]) {
  for (const relativePath of relativePaths) {
    const source = path.join(repositoryRoot, relativePath);
    const destination = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
}
