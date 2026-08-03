import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

// @ts-expect-error Root CF27 evidence recapture package CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import * as evidenceRecapturePackageModule from "../../scripts/cf27-evidence-recapture-package.mjs";

const {
  buildEvidenceRecapturePackage,
  checkEvidenceRecapturePackage,
  validateEvidenceRecapturePackage,
  writeEvidenceRecapturePackage
} = evidenceRecapturePackageModule;

const repositoryRoot = path.resolve(process.cwd(), "..");

describe("CF27 evidence recapture package", () => {
  it("summarizes current evidence quality without promoting records", () => {
    const built = buildEvidenceRecapturePackage({ root: repositoryRoot });

    expect(built.qualityReport.validation.ok).toBe(true);
    expect(built.qualityReport).toMatchObject({
      schemaVersion: "cf27-evidence-recapture-package-v1",
      productionStatus: "NOT_PRODUCTION_DATA",
      verificationStatus: "NOT_SECOND_VERIFIED",
      productionRecommendationsEnabled: false
    });
    expect(built.qualityReport.summary).toMatchObject({
      totalRecords: 92,
      reviewReadyRecords: 92,
      recaptureRequiredRecords: 92,
      missingEvidenceRecords: 0,
      missingRequiredViewRecords: 87,
      duplicateDisputeRecords: 5,
      environmentVersionIssueRecords: 92,
      secondVerifiedRecords: 0,
      productionApprovedRecords: 0,
      productionCatalogRecords: 0
    });
    expect(built.recaptureQueue.tasks.every((task: RecaptureTask) => task.productionStatus === "NOT_PRODUCTION_DATA")).toBe(true);
    expect(built.qualityReport.recordReadiness.every((record: RecordReadiness) => record.productionEligible === false)).toBe(true);
  });

  it("groups recapture work into owner and verifier action buckets", () => {
    const built = buildEvidenceRecapturePackage({ root: repositoryRoot });
    const groups = new Map(built.recaptureQueue.groupedTasks.map((group: { group: string; tasks: RecaptureTask[] }) => [group.group, group.tasks.length]));

    expect([...groups.keys()]).toEqual([
      "Environment evidence",
      "Creation-path evidence",
      "Menu-map evidence",
      "Head records",
      "Hairstyles",
      "Facial hair",
      "Additional attributes",
      "Duplicate disputes",
      "Ordering disputes",
      "Version mismatches",
      "Dependency tests"
    ]);
    expect(groups.get("Environment evidence")).toBeGreaterThanOrEqual(1);
    expect(groups.get("Head records")).toBeGreaterThan(0);
    expect(groups.get("Duplicate disputes")).toBe(5);
    expect(groups.get("Ordering disputes")).toBeGreaterThan(0);
    expect(groups.get("Version mismatches")).toBeGreaterThanOrEqual(1);
    expect(built.discrepancyReport.summary.versionMismatches).toBe(92);
  });

  it("validates that recapture-required records map to explicit tasks", () => {
    const built = buildEvidenceRecapturePackage({ root: repositoryRoot });
    const compromised = structuredClone(built.recaptureQueue.tasks).filter((task: RecaptureTask) => !task.affectedCandidateIDs.includes("CF27_XBOXUNKNOWN_RTG_CHIN_SQUARE"));
    const report = validateEvidenceRecapturePackage({
      recordInspections: built.qualityReport.recordReadiness,
      recaptureTasks: compromised,
      summary: built.qualityReport.summary
    });

    expect(report.ok).toBe(false);
    expect(report.errors.map((error: { code: string }) => error.code)).toContain("recaptureRecordMissingTask");
  });

  it("writes deterministic artifacts and detects stale package output", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfm-cf27-evidence-recapture-"));
    copyFixtureTree(root, [
      "data/phase-zero/production_verification_queue.json",
      "data/phase-zero/primary_review_status.json",
      "data/phase-zero/primary_review_traceability.json",
      "data/phase-zero/evidence_manifest.json",
      "data/phase-zero/video_inventory.json",
      "data/phase-zero/issues_register.research.json",
      "data/phase-zero/capture_requests.json",
      "data/phase-zero/catalog_count_order_audit.research.json",
      "data/phase-zero/evidence_coverage_control_center.json",
      "data/phase-zero/verifier_candidate_queue.json",
      "data/phase-zero/verification-candidates/CF27_XBOX_RTG_RESEARCH_CANDIDATE_v1.0.0/candidate_validation_report.json",
      "data/phase-zero/second-verifier-execution-package/required_import_targets.json",
      "data/catalog/production/catalog_manifest.json"
    ]);
    const built = buildEvidenceRecapturePackage({ root });
    writeEvidenceRecapturePackage(built, { root });

    expect(() => checkEvidenceRecapturePackage(buildEvidenceRecapturePackage({ root }), { root })).not.toThrow();
    fs.appendFileSync(path.join(root, "docs/phase-zero/CF27_EVIDENCE_RECAPTURE_PACKAGE.md"), "\nSTALE\n");
    expect(() => checkEvidenceRecapturePackage(buildEvidenceRecapturePackage({ root }), { root })).toThrow(/stale/i);
  });
});

type RecordReadiness = {
  productionEligible: boolean;
};

type RecaptureTask = {
  productionStatus: string;
  affectedCandidateIDs: string[];
};

function copyFixtureTree(root: string, relativePaths: string[]) {
  for (const relativePath of relativePaths) {
    const source = path.join(repositoryRoot, relativePath);
    const destination = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
}
