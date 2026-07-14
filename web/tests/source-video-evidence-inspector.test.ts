import { describe, expect, it } from "vitest";
import {
  appendSourceVideoReviewAction,
  assertEvidenceQAStatusTransition,
  createSourceVideoEvidenceInspectorModel,
  createSourceVideoReviewAuditLog,
  createSourceVideoURL,
  getDecisionHistoryForCatalog,
  getLatestEvidenceQAStatus,
  createSurroundingTimestampWindow,
  isSafeSourceVideoID,
  summarizeSourceVideoReviewActions
} from "@/lib/phase-zero/source-video-evidence-inspector";
import type { CaptureLogEvent, EvidenceManifestEntry, ImportedResearchCatalogRecord, ResearchTimestampReference } from "@/lib/phase-zero/current-evidence-gallery";
import importedCatalog from "../../data/research/cf27/catalog-candidates/research/partial-catalog-import-current/imported_research_catalog.json";
import evidenceManifest from "../../data/research/cf27/exports/partial-research-catalog-current/evidence_manifest.json";
import captureLog from "../../data/research/cf27/exports/partial-research-catalog-current/capture_log.json";

function createModel() {
  return createSourceVideoEvidenceInspectorModel({
    importedRecords: importedCatalog.records as ImportedResearchCatalogRecord[],
    evidenceEntries: evidenceManifest.payload.entries as EvidenceManifestEntry[],
    captureEvents: captureLog.payload.events as CaptureLogEvent[]
  });
}

describe("source video evidence inspector model", () => {
  it("builds an internal review model from current research records", () => {
    const model = createModel();

    expect(model.reviewLabel).toBe("PRIMARY RESEARCH REVIEW — NOT PRODUCTION VERIFICATION");
    expect(model.records).toHaveLength(86);
    expect(model.records.every((record) => record.productionStatus === "NOT_PRODUCTION_DATA")).toBe(true);
    expect(model.records.every((record) => record.sourceVideoOptions.every((option) => option.localVideoURL.startsWith("/api/internal/research-source-video")))).toBe(true);
  });

  it("keeps the Face 12 overlapping source-video references reviewable", () => {
    const model = createModel();
    const face12 = model.records.find((record) => record.stableInternalID === "CF27_XBOXUNKNOWN_RTG_HEAD_012");

    expect(face12).toBeDefined();
    expect(face12?.sourceVideoOptions.map((option) => option.sourceVideoID)).toEqual(expect.arrayContaining(["video-002", "video-003"]));
    expect(face12?.comparisonGroups.map((group) => group.sourceVideoID)).toEqual(expect.arrayContaining(["video-002", "video-003"]));
  });

  it("separates menu frames from extracted character frames", () => {
    const model = createModel();
    const firstHead = model.records.find((record) => record.stableInternalID === "CF27_XBOXUNKNOWN_RTG_HEAD_001");

    expect(firstHead).toBeDefined();
    expect(firstHead?.comparisonGroups.some((group) => group.menuFrames.length > 0)).toBe(true);
    expect(firstHead?.comparisonGroups.some((group) => group.characterFrames.length > 0)).toBe(true);
    expect(firstHead?.comparisonGroups.flatMap((group) => group.menuFrames).every((entry) => /menu/i.test(entry.view ?? entry.fileRole))).toBe(true);
  });

  it("creates clamped surrounding timestamp windows", () => {
    const reference: ResearchTimestampReference = {
      sourceVideoID: "video-001",
      sourceFilename: "synthetic-source.mp4",
      startSeconds: 1.25,
      endSeconds: 2,
      basis: "synthetic timestamp test"
    };

    expect(createSurroundingTimestampWindow(reference)).toEqual({
      exactTimestampSeconds: 1.25,
      surroundingStartSeconds: 0,
      surroundingEndSeconds: 5
    });
  });

  it("accepts only inventory-style source video IDs for local inspection URLs", () => {
    expect(isSafeSourceVideoID("video-001")).toBe(true);
    expect(createSourceVideoURL("video-009")).toBe("/api/internal/research-source-video?sourceVideoID=video-009");
    expect(isSafeSourceVideoID("../video-001")).toBe(false);
    expect(isSafeSourceVideoID("OWNER_DOWNLOADS/source.mov")).toBe(false);
    expect(createSourceVideoURL("video-abc")).toBeNull();
  });

  it("preserves review actions in a hash-linked local audit log", () => {
    const log = createSourceVideoReviewAuditLog();
    const approved = appendSourceVideoReviewAction(log, {
      actionType: "approvedDerivative",
      catalogID: "CF27_XBOXUNKNOWN_RTG_HEAD_001",
      evidenceID: "evidence-head-001-front",
      sourceVideoID: "video-002",
      timestampSeconds: 12,
      createdAt: "2026-07-13T12:00:00.000Z",
      notes: "Synthetic approval action."
    });
    const recapture = appendSourceVideoReviewAction(approved, {
      actionType: "recaptureRequested",
      catalogID: "CF27_XBOXUNKNOWN_RTG_HEAD_001",
      evidenceID: "evidence-head-001-front",
      sourceVideoID: "video-002",
      timestampSeconds: 12,
      createdAt: "2026-07-13T12:01:00.000Z",
      notes: "Synthetic recapture action."
    });

    expect(recapture.actions).toHaveLength(2);
    expect(recapture.actions[1].previousActionHash).toBe(recapture.actions[0].actionHash);
    expect(summarizeSourceVideoReviewActions(recapture)).toMatchObject({
      totalActions: 2,
      approvedDerivatives: 1,
      recaptureRequests: 1
    });
  });

  it("tracks evidence QA statuses without treating research QA as production verification", () => {
    const log = createSourceVideoReviewAuditLog();
    const accepted = appendSourceVideoReviewAction(log, {
      actionType: "statusMarked",
      catalogID: "CF27_XBOXUNKNOWN_RTG_HEAD_001",
      evidenceID: "evidence-head-001-front",
      sourceVideoID: "video-002",
      timestampSeconds: 12,
      reviewerRole: "QA_REVIEWER",
      targetStatus: "QA_ACCEPTED_RESEARCH",
      createdAt: "2026-07-13T12:00:00.000Z",
      notes: "Usable for research only."
    });
    const pendingSecondReview = appendSourceVideoReviewAction(accepted, {
      actionType: "statusMarked",
      catalogID: "CF27_XBOXUNKNOWN_RTG_HEAD_001",
      evidenceID: "evidence-head-001-front",
      sourceVideoID: "video-002",
      timestampSeconds: 12,
      reviewerRole: "QA_REVIEWER",
      targetStatus: "PENDING_SECOND_VERIFICATION",
      createdAt: "2026-07-13T12:01:00.000Z",
      notes: "Ready for a separate verifier."
    });

    expect(getLatestEvidenceQAStatus(pendingSecondReview, "CF27_XBOXUNKNOWN_RTG_HEAD_001")).toBe("PENDING_SECOND_VERIFICATION");
    expect(getDecisionHistoryForCatalog(pendingSecondReview, "CF27_XBOXUNKNOWN_RTG_HEAD_001")).toHaveLength(2);
    expect(summarizeSourceVideoReviewActions(pendingSecondReview).statusCounts).toMatchObject({
      PENDING_SECOND_VERIFICATION: 1,
      VERIFIED: 0,
      VERIFIED_WITH_NOTES: 0
    });
  });

  it("prevents verified statuses unless the second-verifier workflow supplies the role", () => {
    expect(() => assertEvidenceQAStatusTransition({
      targetStatus: "VERIFIED",
      reviewerRole: "QA_REVIEWER"
    })).toThrow(/second-verifier/i);
    expect(() => appendSourceVideoReviewAction(createSourceVideoReviewAuditLog(), {
      actionType: "statusMarked",
      catalogID: "CF27_XBOXUNKNOWN_RTG_HEAD_001",
      evidenceID: "evidence-head-001-front",
      sourceVideoID: "video-002",
      timestampSeconds: 12,
      reviewerRole: "QA_REVIEWER",
      targetStatus: "VERIFIED_WITH_NOTES",
      createdAt: "2026-07-13T12:00:00.000Z",
      notes: "This must be blocked."
    })).toThrow(/second-verifier/i);

    const verifiedBySecondVerifier = appendSourceVideoReviewAction(createSourceVideoReviewAuditLog(), {
      actionType: "statusMarked",
      catalogID: "CF27_XBOXUNKNOWN_RTG_HEAD_001",
      evidenceID: "evidence-head-001-front",
      sourceVideoID: "video-002",
      timestampSeconds: 12,
      reviewerRole: "SECOND_VERIFIER",
      targetStatus: "VERIFIED_WITH_NOTES",
      createdAt: "2026-07-13T12:00:00.000Z",
      notes: "Second-verifier synthetic test action."
    });
    expect(getLatestEvidenceQAStatus(verifiedBySecondVerifier, "CF27_XBOXUNKNOWN_RTG_HEAD_001")).toBe("VERIFIED_WITH_NOTES");
  });
});
