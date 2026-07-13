import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const requiredChecks = [
  "eyeBlack",
  "facialHair",
  "hairstyleObstruction",
  "hairAndFacialHairChangeWithTemplate",
  "inconsistentZoom",
  "inconsistentRotation",
  "missingFrontView",
  "missingProfiles",
  "loadingAnimation",
  "cursorOrOverlayObstruction",
  "lightingConsistency",
  "cropConsistency",
  "entireHeadVisibility",
  "chinVisibility",
  "earVisibility"
];

interface StandardizationQAReport {
  schemaVersion: string;
  dataClass: string;
  sourceType: string;
  productionStatus: string;
  verificationStatus: string;
  requiredPrompt89Checks: string[];
  summary: {
    assessedHeadCount: number;
    validIdentityOrderEvidenceCount: number;
    validMenuEvidenceCount: number;
    usableMatchingImageCount: number;
    limitedMatchingImageCount: number;
    recaptureRequiredForProductionComparisonCount: number;
    oneStandardizedRecaptureRunCanRepairCurrentImageLimitations: boolean;
    oneRunRepairLimitations: string[];
    productionGateStatus: string;
  };
  records: HeadStandardizationRecord[];
  recaptureQueue: Array<{
    stableInternalID: string;
    nativeOrder: number;
    visibleGameLabelOrIndex: string;
    priority: string;
    requiredViews: string[];
    optionalViews: string[];
  }>;
}

interface HeadStandardizationRecord {
  stableInternalID: string;
  nativeOrder: number;
  visibleGameLabelOrIndex: string;
  dataClass: string;
  productionStatus: string;
  verificationState: string;
  evidenceClassification: {
    validIdentityOrderEvidence: boolean;
    validMenuEvidence: boolean;
    usableMatchingImage: boolean;
    limitedMatchingImage: boolean;
    recaptureRequiredForProductionComparison: boolean;
  };
  extractedFrameEvidence: {
    prompt88ViewsAvailable: boolean;
    angleLabelsVerified: boolean;
    frameLevelOverlayDetectionImplemented: boolean;
    appearanceAltered: boolean;
    eyeBlackRemoved: boolean;
  };
  standardizedCaptureChecks: Record<string, {
    status: string;
    severity: string;
    evidence: string;
    requiredAction: string;
  }>;
}

describe("CF27 Head Template standardization and recapture QA", () => {
  const report = readJson<StandardizationQAReport>(
    "../data/research/cf27/reports/head-template-standardization-qa/head_template_standardization_qa_report.json"
  );
  const recaptureQueueCsv = fs.readFileSync(
    path.resolve(process.cwd(), "../data/research/cf27/reports/head-template-standardization-qa/head_template_recapture_queue.csv"),
    "utf8"
  );

  it("keeps the QA package explicitly research-only and non-production", () => {
    expect(report.schemaVersion).toBe("cf27-head-template-standardization-qa-v1");
    expect(report.dataClass).toBe("RESEARCH_CANDIDATE");
    expect(report.sourceType).toBe("researchCandidateStandardizationQA");
    expect(report.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(report.verificationStatus).toBe("PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED");
    expect(report.requiredPrompt89Checks).toEqual(requiredChecks);
  });

  it("classifies every head as valid order/menu evidence but not usable production matching imagery", () => {
    expect(report.records).toHaveLength(29);
    expect(report.summary.assessedHeadCount).toBe(29);
    expect(report.summary.validIdentityOrderEvidenceCount).toBe(29);
    expect(report.summary.validMenuEvidenceCount).toBe(29);
    expect(report.summary.usableMatchingImageCount).toBe(0);
    expect(report.summary.limitedMatchingImageCount).toBe(29);
    expect(report.summary.recaptureRequiredForProductionComparisonCount).toBe(29);
    expect(report.summary.productionGateStatus).toBe("BLOCKED_RECAPTURE_AND_SECOND_VERIFICATION_REQUIRED");

    for (const record of report.records) {
      expect(record.dataClass).toBe("RESEARCH_CANDIDATE");
      expect(record.productionStatus).toBe("NOT_PRODUCTION_DATA");
      expect(record.verificationState).toBe("NOT_VERIFIED");
      expect(record.evidenceClassification.validIdentityOrderEvidence).toBe(true);
      expect(record.evidenceClassification.validMenuEvidence).toBe(true);
      expect(record.evidenceClassification.usableMatchingImage).toBe(false);
      expect(record.evidenceClassification.limitedMatchingImage).toBe(true);
      expect(record.evidenceClassification.recaptureRequiredForProductionComparison).toBe(true);
      expect(record.extractedFrameEvidence.prompt88ViewsAvailable).toBe(true);
      expect(record.extractedFrameEvidence.angleLabelsVerified).toBe(false);
      expect(record.extractedFrameEvidence.frameLevelOverlayDetectionImplemented).toBe(false);
      expect(record.extractedFrameEvidence.appearanceAltered).toBe(false);
      expect(record.extractedFrameEvidence.eyeBlackRemoved).toBe(false);
      expect(Object.keys(record.standardizedCaptureChecks)).toEqual(requiredChecks);
    }
  });

  it("records each required Prompt 89 standardization issue with production-comparison blocking actions", () => {
    const firstRecord = report.records[0];
    expect(firstRecord?.standardizedCaptureChecks.eyeBlack.status).toBe("PRESENT");
    expect(firstRecord?.standardizedCaptureChecks.facialHair.status).toBe("NOT_STANDARDIZED");
    expect(firstRecord?.standardizedCaptureChecks.hairstyleObstruction.status).toBe("PRESENT_OR_VARIABLE");
    expect(firstRecord?.standardizedCaptureChecks.hairAndFacialHairChangeWithTemplate.evidence).toContain("Visible hair presentation varies");
    expect(firstRecord?.standardizedCaptureChecks.hairAndFacialHairChangeWithTemplate.evidence).toContain("Facial-hair change is not proven");
    expect(firstRecord?.standardizedCaptureChecks.inconsistentZoom.status).toBe("NOT_LOCKED");
    expect(firstRecord?.standardizedCaptureChecks.inconsistentRotation.status).toBe("NOT_LOCKED");
    expect(firstRecord?.standardizedCaptureChecks.missingFrontView.status).toBe("RESEARCH_DERIVATIVE_PRESENT_BUT_NOT_PRODUCTION_STANDARD");
    expect(firstRecord?.standardizedCaptureChecks.missingProfiles.status).toBe("RESEARCH_DERIVATIVES_PRESENT_BUT_NOT_PRODUCTION_STANDARD");
    expect(firstRecord?.standardizedCaptureChecks.cursorOrOverlayObstruction.status).toBe("RISK_PRESENT");
    expect(firstRecord?.standardizedCaptureChecks.lightingConsistency.status).toBe("NOT_MEASURED_AS_STANDARDIZED");
    expect(firstRecord?.standardizedCaptureChecks.cropConsistency.status).toBe("LIMITED_BY_MENU_LAYOUT");
    expect(firstRecord?.standardizedCaptureChecks.entireHeadVisibility.status).toBe("MANUAL_REVIEW_REQUIRED");
    expect(firstRecord?.standardizedCaptureChecks.chinVisibility.status).toBe("MANUAL_REVIEW_REQUIRED");
    expect(firstRecord?.standardizedCaptureChecks.earVisibility.status).toBe("VARIABLE_OR_OBSTRUCTED");
  });

  it("creates a precise per-head recapture queue and explains what one standardized run can and cannot repair", () => {
    expect(report.recaptureQueue).toHaveLength(29);
    expect(report.summary.oneStandardizedRecaptureRunCanRepairCurrentImageLimitations).toBe(true);
    expect(report.summary.oneRunRepairLimitations.join(" ")).toContain("does not prove the complete Head Template category count beyond Face 29");
    expect(report.summary.oneRunRepairLimitations.join(" ")).toContain("does not replace second-person verification");
    expect(report.summary.oneRunRepairLimitations.join(" ")).toContain("does not publish or enable production recommendations");

    for (const queuedRecord of report.recaptureQueue) {
      expect(queuedRecord.stableInternalID).toBe(`CF27_XBOXUNKNOWN_RTG_HEAD_${String(queuedRecord.nativeOrder).padStart(3, "0")}`);
      expect(queuedRecord.visibleGameLabelOrIndex).toBe(`Face ${queuedRecord.nativeOrder}`);
      expect(queuedRecord.priority).toBe("HIGH");
      expect(queuedRecord.requiredViews).toEqual(["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "RIGHT_3Q", "RIGHT_PROFILE", "REAR"]);
      expect(queuedRecord.optionalViews).toEqual(["ELEVATED", "LOWERED"]);
    }

    const csvRows = recaptureQueueCsv.trim().split("\n");
    expect(csvRows).toHaveLength(30);
    expect(csvRows[0]).toContain("stableInternalID,nativeOrder,visibleGameLabelOrIndex,priority");
    expect(recaptureQueueCsv).toContain("CF27_XBOXUNKNOWN_RTG_HEAD_001");
    expect(recaptureQueueCsv).toContain("CF27_XBOXUNKNOWN_RTG_HEAD_029");
  });
});

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8")) as T;
}
