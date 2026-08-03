import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(process.cwd(), "..");
const auditPath = path.join(repositoryRoot, "data/phase-zero/cf27_existing_media_verification_gap_audit.json");
const recapturePath = path.join(repositoryRoot, "data/phase-zero/cf27_minimum_recapture_queue.json");

const allowedClassifications = new Set([
  "CLEAR_EXISTING_EVIDENCE",
  "CLEAR_EXISTING_EVIDENCE_WITH_NOTES",
  "FRAME_REEXTRACTION_REQUIRED",
  "SECOND_VERIFIER_CONFIRMATION_REQUIRED",
  "UNCLEAR_EXISTING_EVIDENCE",
  "MISSING_FROM_EXISTING_MEDIA",
  "GENUINE_RECAPTURE_REQUIRED",
  "DUPLICATE_UPLOAD_NO_NEW_COVERAGE",
  "NOT_APPLICABLE"
]);

describe("CF27 existing-media verification gap audit", () => {
  it("maps every current candidate once without production promotion", () => {
    const audit = readJson<ExistingMediaAudit>(auditPath);
    const candidateRows = audit.auditRows.filter((row) => row.rowType === "CATALOG_CANDIDATE");
    const candidateIDs = candidateRows.map((row) => row.candidateOrRequirementID);

    expect(audit.productionRecommendationsEnabled).toBe(false);
    expect(audit.summary.productionCatalogRecords).toBe(0);
    expect(audit.summary.secondVerifiedRecords).toBe(0);
    expect(audit.summary.productionApprovedRecords).toBe(0);
    expect(candidateRows).toHaveLength(92);
    expect(new Set(candidateIDs).size).toBe(candidateIDs.length);
    expect(candidateRows.every((row) => row.productionEligibility === "NOT_ELIGIBLE")).toBe(true);
  });

  it("classifies source videos, duplicates, verifier work, frame extraction, and genuine recapture separately", () => {
    const audit = readJson<ExistingMediaAudit>(auditPath);

    expect(audit.summary.videoRows).toBe(14);
    expect(audit.summary.uniqueMasterVideos).toBe(12);
    expect(audit.summary.duplicateUploads).toBe(2);
    expect(audit.summary.localSourceVideosOpened).toBe(3);
    expect(audit.summary.classificationCounts.DUPLICATE_UPLOAD_NO_NEW_COVERAGE).toBe(2);
    expect(audit.summary.classificationCounts.FRAME_REEXTRACTION_REQUIRED).toBeGreaterThan(0);
    expect(audit.summary.classificationCounts.SECOND_VERIFIER_CONFIRMATION_REQUIRED).toBeGreaterThanOrEqual(92);
    expect(audit.summary.classificationCounts.GENUINE_RECAPTURE_REQUIRED).toBe(19);
    expect(audit.auditRows.every((row) => allowedClassifications.has(row.primaryClassification))).toBe(true);
  });

  it("keeps the minimum recapture queue limited to genuine recapture rows", () => {
    const audit = readJson<ExistingMediaAudit>(auditPath);
    const recapture = readJson<MinimumRecaptureQueue>(recapturePath);
    const genuineRows = audit.auditRows.filter((row) => row.primaryClassification === "GENUINE_RECAPTURE_REQUIRED");
    const frameExtractionIDs = new Set(audit.auditRows.filter((row) => row.primaryClassification === "FRAME_REEXTRACTION_REQUIRED").map((row) => row.candidateOrRequirementID));
    const verifierOnlyIDs = new Set(audit.auditRows.filter((row) => row.primaryClassification === "SECOND_VERIFIER_CONFIRMATION_REQUIRED").map((row) => row.candidateOrRequirementID));

    expect(recapture.summary.totalRecaptures).toBe(genuineRows.length);
    expect(recapture.tasks.every((task) => task.classification === "GENUINE_RECAPTURE_REQUIRED")).toBe(true);
    expect(recapture.tasks.every((task) => !frameExtractionIDs.has(task.candidateOrRequirementID))).toBe(true);
    expect(recapture.tasks.every((task) => !verifierOnlyIDs.has(task.candidateOrRequirementID))).toBe(true);
    expect(recapture.tasks.every((task) => task.exactBlockerCleared && task.proposedFilename && task.exactMenuPath)).toBe(true);
  });

  it("keeps report summary counts reconciled with row-level data", () => {
    const audit = readJson<ExistingMediaAudit>(auditPath);
    const rowCounts = audit.auditRows.reduce<Record<string, number>>((counts, row) => {
      counts[row.primaryClassification] = (counts[row.primaryClassification] ?? 0) + 1;
      return counts;
    }, {});

    expect(audit.summary.totalAuditRows).toBe(audit.auditRows.length);
    expect(audit.summary.candidateRows).toBe(audit.auditRows.filter((row) => row.rowType === "CATALOG_CANDIDATE").length);
    expect(audit.summary.requirementRows).toBe(audit.auditRows.filter((row) => row.rowType === "EVIDENCE_REQUIREMENT").length);
    expect(audit.summary.videoRows).toBe(audit.auditRows.filter((row) => row.rowType === "VIDEO_FILE").length);
    expect(audit.summary.classificationCounts).toEqual(rowCounts);
  });
});

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

type ExistingMediaAudit = {
  productionRecommendationsEnabled: boolean;
  summary: {
    totalAuditRows: number;
    videoRows: number;
    candidateRows: number;
    requirementRows: number;
    uniqueMasterVideos: number;
    duplicateUploads: number;
    localSourceVideosOpened: number;
    productionCatalogRecords: number;
    secondVerifiedRecords: number;
    productionApprovedRecords: number;
    classificationCounts: Record<string, number>;
  };
  auditRows: Array<{
    rowType: "VIDEO_FILE" | "CATALOG_CANDIDATE" | "EVIDENCE_REQUIREMENT";
    candidateOrRequirementID: string;
    primaryClassification: string;
    productionEligibility: string;
  }>;
};

type MinimumRecaptureQueue = {
  summary: {
    totalRecaptures: number;
  };
  tasks: Array<{
    candidateOrRequirementID: string;
    classification: string;
    exactBlockerCleared: string;
    exactMenuPath: string;
    proposedFilename: string;
  }>;
};
