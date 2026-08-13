import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(process.cwd(), "..");
const auditPath = path.join(repositoryRoot, "data/phase-zero/cf27_21_target_existing_video_reuse_audit.json");
const coveragePath = path.join(repositoryRoot, "data/phase-zero/cf27_video_requirement_coverage_map.json");
const restorePath = path.join(repositoryRoot, "data/phase-zero/cf27_existing_master_restore_queue.json");
const recapturePath = path.join(repositoryRoot, "data/phase-zero/cf27_minimum_recapture_queue.json");

const allowedClassifications = new Set([
  "COMPLETE_FROM_EXISTING_VIDEO",
  "COMPLETE_FROM_EXISTING_VIDEO_WITH_NOTES",
  "COMPLETE_FROM_COMBINED_EXISTING_VIDEOS",
  "EXISTING_MASTER_RESTORE_REQUIRED",
  "EXISTING_FRAME_EXTRACTION_REQUIRED",
  "SECOND_VERIFIER_CONFIRMATION_ONLY",
  "PARTIALLY_COVERED_BY_EXISTING_VIDEO",
  "TRUE_NEW_RECORDING_REQUIRED",
  "NOT_APPLICABLE_DIRECTLY_PROVEN"
]);

describe("CF27 21-target existing-video reuse audit", () => {
  it("audits every prompted target exactly once without production promotion", () => {
    const audit = readJson<ReuseAudit>(auditPath);
    const targetIDs = audit.targets.map((target) => target.targetID);

    expect(audit.productionRecommendationsEnabled).toBe(false);
    expect(audit.summary.targetsAudited).toBe(21);
    expect(audit.summary.expectedTargets).toBe(21);
    expect(audit.summary.productionCatalogRecords).toBe(0);
    expect(audit.summary.secondVerifierDecisionsCreated).toBe(0);
    expect(new Set(targetIDs).size).toBe(targetIDs.length);
    expect(audit.targets.every((target) => allowedClassifications.has(target.primaryClassification))).toBe(true);
    expect(audit.targets.every((target) => target.productionEligibility === "NOT_ELIGIBLE")).toBe(true);
  });

  it("reduces the owner recording queue only for documented frame extraction or directly proven not-applicable targets", () => {
    const audit = readJson<ReuseAudit>(auditPath);
    const recapture = readJson<MinimumRecaptureQueue>(recapturePath);
    const queuedRequirementIDs = new Set(recapture.tasks.map((task) => task.candidateOrRequirementID));
    const removedTargets = audit.targets.filter((target) => target.finalOwnerRecordingQueueStatus === "REMOVED_FROM_OWNER_RECORDING_GUIDE");

    expect(audit.summary.finalMinimumNewRecordingTasks).toBe(17);
    expect(audit.summary.removedFromOwnerRecordingQueue).toBe(4);
    expect(audit.summary.classificationCounts.EXISTING_FRAME_EXTRACTION_REQUIRED).toBe(3);
    expect(audit.summary.classificationCounts.NOT_APPLICABLE_DIRECTLY_PROVEN).toBe(1);
    expect(recapture.summary.totalRecaptures).toBe(17);
    expect(recapture.tasks.every((task) => task.classification === "GENUINE_RECAPTURE_REQUIRED")).toBe(true);
    expect(removedTargets.map((target) => target.targetID).sort()).toEqual([
      "REQ-EYEBROWS",
      "REQ-VIEWS-ear-shape",
      "REQ-VIEWS-facial-hair",
      "REQ-VIEWS-hairstyles"
    ]);
    expect(removedTargets.every((target) => !queuedRequirementIDs.has(target.targetID))).toBe(true);
  });

  it("keeps coverage and restore artifacts reconciled with the target audit", () => {
    const audit = readJson<ReuseAudit>(auditPath);
    const coverage = readJson<CoverageMap>(coveragePath);
    const restore = readJson<RestoreQueue>(restorePath);

    expect(coverage.summary.targetsCovered).toBe(21);
    expect(coverage.rows.every((row) => row.productionStatus === "NOT_PRODUCTION_DATA")).toBe(true);
    expect(new Set(coverage.rows.map((row) => row.targetID)).size).toBe(audit.summary.targetsAudited);
    expect(restore.summary.totalRestoreTasks).toBe(audit.summary.existingMasterRestoreTasks);
    expect(restore.tasks).toHaveLength(restore.summary.totalRestoreTasks);
    expect(restore.summary.ownerDownloadMastersReferenced).toBe(11);
    expect(restore.summary.ownerDownloadMastersResolvableLocally + restore.summary.totalRestoreTasks).toBe(restore.summary.ownerDownloadMastersReferenced);
    expect(restore.summary.duplicateUploadsDocumented).toBe(2);
    expect(restore.tasks.every((task) => task.productionStatus === "NOT_PRODUCTION_DATA")).toBe(true);
  });

  it("requires exact recording instructions for every remaining owner task", () => {
    const recapture = readJson<MinimumRecaptureQueue>(recapturePath);

    expect(recapture.tasks).toHaveLength(17);
    expect(recapture.tasks.every((task) => task.exactMenuPath && task.exactCategory && task.exactOptionOrRange)).toBe(true);
    expect(recapture.tasks.every((task) => task.exactCanonicalSettings && task.exactViewsRequired && task.exactHoldDuration)).toBe(true);
    expect(recapture.tasks.every((task) => task.proposedFilename && task.exactBlockerCleared)).toBe(true);
  });
});

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

type ReuseAudit = {
  productionRecommendationsEnabled: boolean;
  summary: {
    targetsAudited: number;
    expectedTargets: number;
    finalMinimumNewRecordingTasks: number;
    removedFromOwnerRecordingQueue: number;
    productionCatalogRecords: number;
    secondVerifierDecisionsCreated: number;
    existingMasterRestoreTasks: number;
    classificationCounts: Record<string, number>;
  };
  targets: Array<{
    targetID: string;
    primaryClassification: string;
    finalOwnerRecordingQueueStatus: string;
    productionEligibility: string;
  }>;
};

type CoverageMap = {
  summary: {
    targetsCovered: number;
  };
  rows: Array<{
    targetID: string;
    productionStatus: string;
  }>;
};

type RestoreQueue = {
  summary: {
    totalRestoreTasks: number;
    ownerDownloadMastersReferenced: number;
    ownerDownloadMastersResolvableLocally: number;
    duplicateUploadsDocumented: number;
  };
  tasks: Array<{
    productionStatus: string;
  }>;
};

type MinimumRecaptureQueue = {
  summary: {
    totalRecaptures: number;
  };
  tasks: Array<{
    candidateOrRequirementID: string;
    classification: string;
    exactMenuPath: string;
    exactCategory: string;
    exactOptionOrRange: string;
    exactCanonicalSettings: string;
    exactViewsRequired: string;
    exactHoldDuration: string;
    proposedFilename: string;
    exactBlockerCleared: string;
  }>;
};
