import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root Phase 0 primary-review CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { CF27_PRIMARY_REVIEW_SCHEMA_VERSION, generatePrimaryReviewStatus, writePrimaryReviewStatus } from "../../scripts/cf27-primary-review-status.mjs";

const repositoryRoot = path.resolve(process.cwd(), "..");

describe("CF27 Phase 0 primary review status", () => {
  it("classifies all current research candidates without production approval", () => {
    const { status } = generatePrimaryReviewStatus({
      root: repositoryRoot,
      generatedAt: "2026-07-14T18:45:00-04:00"
    });

    expect(status.schemaVersion).toBe(CF27_PRIMARY_REVIEW_SCHEMA_VERSION);
    expect(status.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(status.productionRecommendationsEnabled).toBe(false);
    expect(status.summary.totalResearchCandidates).toBe(85);
    expect(status.summary.primaryApproved).toBe(0);
    expect(status.summary.primaryApprovedWithNotes).toBe(80);
    expect(status.summary.duplicateReviewRequired).toBe(5);
    expect(status.summary.secondVerified).toBe(0);
    expect(status.summary.productionApproved).toBe(0);
    expect(status.summary.recordsAllowedInProductionRecommendations).toBe(0);
  });

  it("keeps every candidate linked to a source video and timestamp", () => {
    const { status } = generatePrimaryReviewStatus({ root: repositoryRoot });

    expect(status.videoTraceability.summary.candidatesWithoutValidSourceTimestamp).toBe(0);
    for (const candidate of status.candidates) {
      expect(candidate.sourceVideoID, candidate.candidateID).toMatch(/^phase0-video-/);
      expect(candidate.sourceVideoResolved, candidate.candidateID).toBe(true);
      expect(candidate.timelineResolved, candidate.candidateID).toBe(true);
      expect(candidate.evidenceResolved, candidate.candidateID).toBe(true);
      expect(candidate.sourceTimestamp, candidate.candidateID).not.toBeNull();
    }
  });

  it("separates verifier evidence review from production verification", () => {
    const { status } = generatePrimaryReviewStatus({ root: repositoryRoot });

    expect(status.verifierQueue.summary.records).toBe(85);
    expect(status.verifierQueue.summary.readyForEvidenceReview).toBe(80);
    expect(status.verifierQueue.summary.duplicateOrContinuityReview).toBe(5);
    expect(status.verifierQueue.summary.fullProductionVerificationBlocked).toBe(true);
    expect(status.productionGate.primaryApprovalAloneCanPublish).toBe(false);
    expect(status.productionGate.secondVerificationRequired).toBe(true);
    expect(status.productionGate.missingEnvironmentMetadataBlocksPublication).toBe(true);
    expect(status.productionGate.currentPublicationDecision).toBe("BLOCKED_NO_PRIMARY_CATEGORY_COMPLETE_NO_SECOND_VERIFICATION_NO_PRODUCTION_APPROVAL");
  });

  it("documents category incompleteness and missing category capture without inventing rows", () => {
    const { status } = generatePrimaryReviewStatus({ root: repositoryRoot });
    const byCategory = new Map(status.categoryStatus.map((category: { category: string }) => [category.category, category]));

    expect(byCategory.get("Heads")).toMatchObject({
      observedCandidateCount: 26,
      approvedWithNotesCount: 24,
      duplicateReviewRequiredCount: 2,
      canBeHandedToVerifier: true,
      couldBecomeProductionEligibleAfterVerification: false
    });
    expect(byCategory.get("Skin Tone")).toMatchObject({
      observedCandidateCount: 21,
      approvedWithNotesCount: 20,
      duplicateReviewRequiredCount: 1
    });
    expect(byCategory.get("Hairstyles")).toMatchObject({
      observedCandidateCount: 0,
      canBeHandedToVerifier: false,
      couldBecomeProductionEligibleAfterVerification: false
    });
    expect(byCategory.get("Facial hair")).toMatchObject({
      observedCandidateCount: 0,
      canBeHandedToVerifier: false
    });
  });

  it("writes deterministic primary-review artifacts", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfm-primary-review-"));
    copyFixtureTree(root, [
      "data/phase-zero/heads.research.json",
      "data/phase-zero/additional_attributes.research.json",
      "data/phase-zero/body_controls.research.json",
      "data/phase-zero/environment_manifest.research.json",
      "data/phase-zero/creation_paths.research.json",
      "data/phase-zero/menu_map.research.json",
      "data/phase-zero/video_inventory.json",
      "data/phase-zero/video_timeline.json",
      "data/phase-zero/evidence_manifest.json",
      "data/phase-zero/issues_register.research.json",
      "data/phase-zero/capture_requests.json",
      "data/phase-zero/catalog_count_order_audit.research.json",
      "data/phase-zero/appearance_menu_gap_matrix.json"
    ]);

    const generated = generatePrimaryReviewStatus({
      root,
      generatedAt: "2026-07-14T18:45:00-04:00"
    });
    writePrimaryReviewStatus(generated, { root });

    const review = JSON.parse(fs.readFileSync(path.join(root, "data/phase-zero/primary_review_status.json"), "utf8"));
    const queue = JSON.parse(fs.readFileSync(path.join(root, "data/phase-zero/verifier_candidate_queue.json"), "utf8"));
    const doc = fs.readFileSync(path.join(root, "docs/status/PHASE_ZERO_PRIMARY_REVIEW_STATUS.md"), "utf8");

    expect(review.summary.totalResearchCandidates).toBe(85);
    expect(queue.summary.readyForEvidenceReview).toBe(80);
    expect(doc).toContain("PRIMARY REVIEW ONLY - NOT SECOND VERIFIED");
    expect(doc).toContain("Production records: 0");
  });
});

function copyFixtureTree(root: string, relativePaths: string[]) {
  for (const relativePath of relativePaths) {
    const source = path.join(repositoryRoot, relativePath);
    const destination = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
}
