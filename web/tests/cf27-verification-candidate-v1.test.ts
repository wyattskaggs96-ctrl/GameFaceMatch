import { describe, expect, it } from "vitest";
// @ts-expect-error Root CF27 verification-candidate gate is plain ESM JavaScript and is exercised here as the command source of truth.
import { CF27_VERIFICATION_CANDIDATE_ID, buildVerificationCandidateGate, checkVerificationCandidateGate } from "../../scripts/cf27-verification-candidate-v1.mjs";

describe("CF27 verification candidate v1 gate", () => {
  it("blocks the v1 freeze while current research evidence remains incomplete", () => {
    const gate = buildVerificationCandidateGate();

    expect(gate.report.candidateID).toBe(CF27_VERIFICATION_CANDIDATE_ID);
    expect(gate.report.completenessDecision).toBe("BLOCKED_NOT_READY_TO_FREEZE");
    expect(gate.report.releasePackageCreated).toBe(false);
    expect(gate.report.summary).toMatchObject({
      candidateRecords: 85,
      primaryApprovedWithNotes: 80,
      duplicateReviewRequired: 5,
      secondVerifiedRecords: 0,
      productionApprovedRecords: 0,
      productionCatalogRecords: 0,
      openCaptureAssignments: 15
    });
    expect(gate.releaseFiles).toHaveLength(0);
  });

  it("documents concrete blockers and recaptures instead of guessing completeness", () => {
    const gate = buildVerificationCandidateGate();
    const blockerCodes = gate.report.blockers.map((blocker: GateIssue) => blocker.code);
    const recaptureIDs = gate.report.recaptureRequests.map((request: RecaptureRequest) => request.captureID);

    expect(blockerCodes).toContain("duplicateReviewUnresolved");
    expect(blockerCodes).toContain("openCaptureAssignment");
    expect(blockerCodes).toContain("categoryIncomplete");
    expect(blockerCodes).toContain("environmentMetadataUnresolved");
    expect(blockerCodes).toContain("dependencyTestsNotExecuted");
    expect(recaptureIDs).toEqual([
      "GFM-CAP-011",
      "GFM-CAP-012",
      "GFM-CAP-013",
      "GFM-CAP-001",
      "GFM-CAP-002",
      "GFM-CAP-003",
      "GFM-CAP-004",
      "GFM-CAP-005",
      "GFM-CAP-006",
      "GFM-CAP-007",
      "GFM-CAP-008",
      "GFM-CAP-009",
      "GFM-CAP-010",
      "GFM-CAP-014",
      "GFM-CAP-015"
    ]);
  });

  it("keeps the generated gate report current", () => {
    const gate = buildVerificationCandidateGate();

    expect(() => checkVerificationCandidateGate(gate)).not.toThrow();
  });
});

type GateIssue = {
  code: string;
};

type RecaptureRequest = {
  captureID: string;
};
