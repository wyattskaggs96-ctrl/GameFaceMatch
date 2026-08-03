import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

// @ts-expect-error Root CF27 production-verification queue CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import * as productionVerificationQueueModule from "../../scripts/cf27-production-verification-queue.mjs";

const {
  buildProductionVerificationQueue,
  checkProductionVerificationQueue,
  validateProductionVerificationQueue,
  writeProductionVerificationQueue
} = productionVerificationQueueModule;

const repositoryRoot = path.resolve(process.cwd(), "..");

describe("CF27 production verification queue", () => {
  it("creates one non-production queue record per current research candidate", () => {
    const result = buildProductionVerificationQueue({ root: repositoryRoot });

    expect(result.validation.ok).toBe(true);
    expect(result.queue).toMatchObject({
      schemaVersion: "cf27-production-verification-queue-v1",
      productionStatus: "NOT_PRODUCTION_DATA",
      verificationStatus: "NOT_VERIFIED",
      verificationHasOccurred: false,
      productionRecommendationsEnabled: false
    });
    expect(result.queue.summary).toMatchObject({
      totalCandidates: 92,
      candidateIdentitiesReconciled: 92,
      identityConflicts: 0,
      evidenceLinkedCount: 92,
      missingEvidenceCount: 0,
      secondVerifiedRecords: 0,
      productionApprovedRecords: 0,
      productionCatalogRecords: 0,
      productionEligibleCount: 0
    });
    expect(result.queue.records).toHaveLength(92);
    expect(new Set(result.queue.records.map((record: QueueRecord) => record.stableCandidateID)).size).toBe(92);
    expect(result.queue.records.every((record: QueueRecord) => record.secondVerifierStatus === "NOT_VERIFIED")).toBe(true);
    expect(result.queue.records.every((record: QueueRecord) => record.currentProductionEligibility === "NOT_ELIGIBLE")).toBe(true);
  });

  it("preserves duplicate, order, environment, missing-view, and blocker states for verifier work", () => {
    const result = buildProductionVerificationQueue({ root: repositoryRoot });
    const duplicateRows = result.queue.records.filter((record: QueueRecord) => record.duplicateOrNearDuplicateFlag);
    const orderRows = result.queue.records.filter((record: QueueRecord) => record.primaryReviewStatus === "ORDER_UNRESOLVED");
    const rowsWithMissingViews = result.queue.records.filter((record: QueueRecord) => record.missingViews.length > 0);

    expect(duplicateRows).toHaveLength(5);
    expect(orderRows).toHaveLength(3);
    expect(rowsWithMissingViews.length).toBeGreaterThan(0);
    expect(result.queue.summary.versionOrEnvironmentGapCount).toBe(92);
    expect(result.queue.summary.productionEligibleCount).toBe(0);
    for (const record of result.queue.records as QueueRecord[]) {
      expect(record.blockingReasons).toContain("NOT_SECOND_VERIFIED");
      expect(record.blockingReasons).toContain("NO_CATALOG_MANAGER_APPROVAL");
    }
  });

  it("rejects fabricated verification or production eligibility", () => {
    const result = buildProductionVerificationQueue({ root: repositoryRoot });
    const compromised = structuredClone(result.queue);
    compromised.records[0].secondVerifierStatus = "VERIFIED";
    compromised.records[0].currentProductionEligibility = "ELIGIBLE";
    compromised.summary.productionEligibleCount = 1;
    const report = validateProductionVerificationQueue(compromised, {
      primaryReview: JSON.parse(fs.readFileSync(path.join(repositoryRoot, "data/phase-zero/primary_review_status.json"), "utf8"))
    });

    expect(report.ok).toBe(false);
    expect(report.errors.map((error: { code: string }) => error.code)).toEqual(
      expect.arrayContaining(["fabricatedSecondVerification", "productionEligibilityGranted", "productionEligibleCountNonzero"])
    );
  });

  it("writes deterministic queue artifacts and detects stale output", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfm-production-verification-queue-"));
    copyFixtureTree(root, [
      "data/phase-zero/primary_review_status.json",
      "data/phase-zero/primary_review_traceability.json",
      "data/phase-zero/evidence_manifest.json",
      "data/phase-zero/evidence_coverage_control_center.json",
      "data/phase-zero/issues_register.research.json",
      "data/phase-zero/capture_requests.json",
      "data/phase-zero/catalog_count_order_audit.research.json",
      "data/phase-zero/verifier_candidate_queue.json",
      "data/phase-zero/verification-candidates/CF27_XBOX_RTG_RESEARCH_CANDIDATE_v1.0.0/candidate_validation_report.json",
      "data/phase-zero/second-verifier-execution-package/required_import_targets.json",
      "data/catalog/production/catalog_manifest.json"
    ]);
    const result = buildProductionVerificationQueue({ root });
    writeProductionVerificationQueue(result, { root });

    expect(() => checkProductionVerificationQueue(buildProductionVerificationQueue({ root }), { root })).not.toThrow();
    fs.appendFileSync(path.join(root, "docs/phase-zero/CF27_PRODUCTION_VERIFICATION_QUEUE.md"), "\nSTALE\n");
    expect(() => checkProductionVerificationQueue(buildProductionVerificationQueue({ root }), { root })).toThrow(/stale/i);
  });
});

type QueueRecord = {
  stableCandidateID: string;
  primaryReviewStatus: string;
  secondVerifierStatus: string;
  currentProductionEligibility: string;
  duplicateOrNearDuplicateFlag: boolean;
  missingViews: string[];
  blockingReasons: string[];
};

function copyFixtureTree(root: string, relativePaths: string[]) {
  for (const relativePath of relativePaths) {
    const source = path.join(repositoryRoot, relativePath);
    const destination = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
}
