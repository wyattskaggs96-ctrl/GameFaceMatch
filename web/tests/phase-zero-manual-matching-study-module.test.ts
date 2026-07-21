import { describe, expect, it } from "vitest";
import {
  addManualStudyParticipant,
  assignManualStudyReviewers,
  confirmRawMediaDeletion,
  createManualMatchingStudyOperation,
  createPseudonymousParticipantID,
  createReferenceImageChecklist,
  exportManualMatchingStudyReport,
  MANUAL_STUDY_MAX_PARTICIPANTS,
  MANUAL_STUDY_MIN_PARTICIPANTS,
  PHASE0_MANUAL_MATCHING_OPERATION_VERSION,
  recordCaptureQualitySummary,
  recordConsentCheckpoint,
  recordIndependentTopThreeReview,
  recordOriginalTopThreeRecommendations,
  recordParticipantPreference,
  recordRepeatScanResult,
  validateManualMatchingStudyOperation,
  type Phase0ManualMatchingStudyOperation,
  type Phase0ManualStudyIndependentReview,
  type Phase0ManualStudyParticipant
} from "@/lib/phase-zero/phase-zero-manual-matching-study-module";

describe("Phase 0 manual matching study operational module", () => {
  it("creates a fixture-only study operation with pseudonymous participant IDs and no public sharing by default", () => {
    const operation = addManualStudyParticipant(baseOperation(), {
      captureMode: "webRgbGuided",
      captureDeviceLabel: "synthetic-iPhone",
      createdAt: "2026-07-13T01:00:00.000Z"
    });

    expect(operation.operationVersion).toBe(PHASE0_MANUAL_MATCHING_OPERATION_VERSION);
    expect(operation.participantTargetRange).toEqual({ minimum: MANUAL_STUDY_MIN_PARTICIPANTS, maximum: MANUAL_STUDY_MAX_PARTICIPANTS });
    expect(operation.publicSharingDefault).toBe(false);
    expect(operation.participants[0]?.participantID).toBe("synthetic-synthetic-study-001-001");
    expect(createPseudonymousParticipantID("study-abc", 7, "researchDraft")).toBe("participant-study-abc-007");
    expect(operation.participants[0]?.rawMediaDeletionState.status).toBe("pendingDeletion");
  });

  it("reports blockers for unapproved catalogs and incomplete participant workflow checkpoints", () => {
    const operation = addManualStudyParticipant(
      baseOperation({
        catalogGate: {
          approvedCatalogReleaseAvailable: false,
          releaseID: null,
          releaseStatus: "draft",
          gateCheckedAt: "2026-07-13T01:00:00.000Z"
        },
        catalogVerifiedAt: null
      }),
      {
        captureMode: "webRgbGuided",
        captureDeviceLabel: "synthetic-iPhone",
        createdAt: "2026-07-13T01:00:00.000Z"
      }
    );

    expect(validateManualMatchingStudyOperation(operation).map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "catalogNotApprovedForStudy",
        "participantCountOutsideTarget",
        "missingConsentCheckpoint",
        "referenceImagesIncomplete",
        "insufficientReviewerAssignment",
        "missingIndependentReviews",
        "missingOriginalTopThreeRecommendations",
        "missingParticipantPreference",
        "rawMediaDeletionNotConfirmed"
      ])
    );
  });

  it("runs the participant workflow and exports a non-public study report", () => {
    const operation = completeParticipantWorkflow();
    const report = exportManualMatchingStudyReport(operation, "2026-07-13T02:00:00.000Z");

    expect(report.publicSharingEnabled).toBe(false);
    expect(report.sourceType).toBe("testFixture");
    expect(report.participantCount).toBe(1);
    expect(report.completedParticipantCount).toBe(1);
    expect(report.issues.map((issue) => issue.code)).toEqual(["participantCountOutsideTarget"]);
    expect(report.resultRecords).toHaveLength(1);
    expect(report.resultRecords[0]).toMatchObject({
      sourceType: "testFixture",
      subjectPseudonymousID: "synthetic-synthetic-study-001-001",
      rankSelected: 2,
      hairChoice: expect.objectContaining({ catalogStableInternalID: "CF27_TESTONLY_HAIR_001" }),
      facialHairChoice: expect.objectContaining({ catalogStableInternalID: null }),
      rawMediaDeletionState: expect.objectContaining({ status: "deleted" })
    });
    expect(report.resultRecords[0]?.reviewerAgreement).toMatchObject({
      reviewerIDs: ["synthetic-reviewer-a", "synthetic-reviewer-b"],
      agreedTopChoice: false,
      agreedTopThreeSet: true
    });
    expect(report.evaluation.topThreeUsefulMatchRate).toMatchObject({ numerator: 1, denominator: 1, rate: 1, fixtureDerived: true });
    expect(report.dashboard.status).toBe("notMeasured");
    expect(report.dashboard.topThreeUsefulness).toBe("not measured");
    expect(report.resultRecords[0]?.originalTopThreeRecommendations).toHaveLength(3);
    expect(report.resultRecords[0]?.resemblanceRating).toBe(4);
    expect(report.resultRecords[0]?.repeatScanResult).toMatchObject({ completed: true, sameTopChoice: false, topThreeOverlapCount: 2 });
  });

  it("preserves independent reviewer rankings before export", () => {
    const participant = completeParticipantWorkflow().participants[0];

    expect(participant?.independentReviews).toHaveLength(2);
    expect(participant?.independentReviews[0]?.rankedHeadChoices.map((choice) => choice.catalogStableInternalID)).toEqual([
      "CF27_TESTONLY_HEAD_001",
      "CF27_TESTONLY_HEAD_002",
      "CF27_TESTONLY_HEAD_003"
    ]);
    expect(participant?.independentReviews[1]?.rankedHeadChoices.map((choice) => choice.catalogStableInternalID)).toEqual([
      "CF27_TESTONLY_HEAD_002",
      "CF27_TESTONLY_HEAD_001",
      "CF27_TESTONLY_HEAD_003"
    ]);
  });

  it("does not include raw media or public-sharing enablement in exported reports", () => {
    const report = exportManualMatchingStudyReport(completeParticipantWorkflow(), "2026-07-13T02:00:00.000Z");
    const serialized = JSON.stringify(report);

    expect(serialized).not.toContain("data:image");
    expect(serialized).not.toContain("blob:");
    expect(serialized).not.toContain("rawImage");
    expect(serialized).not.toContain("faceImage");
    expect(report.publicSharingEnabled).toBe(false);
  });
});

function completeParticipantWorkflow(): Phase0ManualMatchingStudyOperation {
  let operation = addManualStudyParticipant(baseOperation(), {
    captureMode: "webRgbGuided",
    captureDeviceLabel: "synthetic-iPhone",
    createdAt: "2026-07-13T01:00:00.000Z",
    referenceImageChecklist: createReferenceImageChecklist({
      straightOn: { present: true, qualityAccepted: true },
      left45: { present: true, qualityAccepted: true },
      right45: { present: true, qualityAccepted: true },
      leftProfile: { present: true, qualityAccepted: true },
      rightProfile: { present: true, qualityAccepted: true }
    })
  });
  let participant = operation.participants[0] as Phase0ManualStudyParticipant;
  participant = recordConsentCheckpoint(participant, {
    consentRecordID: "synthetic-consent-001",
    consentVersion: "synthetic-study-consent-v1",
    acknowledgedAt: "2026-07-13T01:05:00.000Z",
    allowsManualReviewerEvaluation: true,
    allowsTemporaryRawMediaProcessing: true,
    allowsDerivedProfileUse: true,
    allowsPublicSharing: false,
    withdrawalRequestedAt: null
  });
  participant = assignManualStudyReviewers(participant, ["synthetic-reviewer-a", "synthetic-reviewer-b"], "2026-07-13T01:10:00.000Z");
  participant = recordCaptureQualitySummary(participant, {
    qualityState: "passedWithWarnings",
    overallScore: 0.82,
    blockingIssueCount: 0,
    advisoryIssueCount: 1,
    notes: "Synthetic capture quality summary."
  }, "2026-07-13T01:12:00.000Z");
  participant = recordOriginalTopThreeRecommendations(participant, ["001", "002", "003"].map((suffix, index) => ({
    rank: (index + 1) as 1 | 2 | 3,
    catalogItemID: `synthetic-head-choice-${suffix}`,
    catalogStableInternalID: `CF27_TESTONLY_HEAD_${suffix}`,
    matchScore: 90 - index * 4,
    confidenceScore: 0.75 - index * 0.05,
    algorithmVersion: "synthetic-matcher-v1",
    generatedAt: "2026-07-13T01:13:00.000Z"
  })), "2026-07-13T01:13:00.000Z");
  participant = recordIndependentTopThreeReview(participant, review("synthetic-reviewer-a", ["001", "002", "003"], "2026-07-13T01:20:00.000Z"));
  participant = recordIndependentTopThreeReview(participant, review("synthetic-reviewer-b", ["002", "001", "003"], "2026-07-13T01:25:00.000Z"));
  participant = recordParticipantPreference(participant, {
    participantPreference: {
      selectedCatalogItemID: "synthetic-head-choice-002",
      selectedStableInternalID: "CF27_TESTONLY_HEAD_002",
      notes: "Synthetic participant selected the second fixture candidate."
    },
    rankSelected: 2,
    finalInGameSelection: {
      selectedCatalogItemID: "synthetic-head-choice-002",
      selectedStableInternalID: "CF27_TESTONLY_HEAD_002",
      builtInGame: true,
      notes: "Synthetic in-game final selection."
    },
    resemblanceRating: 4,
    mainMismatchReasons: ["jawMismatch", "catalogCoverageGap"],
    updatedAt: "2026-07-13T01:30:00.000Z"
  });
  participant = recordRepeatScanResult(participant, {
    completed: true,
    repeatScanID: "synthetic-repeat-001",
    captureMode: "webRgbGuided",
    completedAt: "2026-07-13T01:32:00.000Z",
    topThreeStableInternalIDs: ["CF27_TESTONLY_HEAD_002", "CF27_TESTONLY_HEAD_001", "CF27_TESTONLY_HEAD_004"],
    sameTopChoice: false,
    topThreeOverlapCount: 2,
    notes: "Synthetic repeat scan comparison."
  }, "2026-07-13T01:32:00.000Z");
  participant = confirmRawMediaDeletion(participant, {
    completedAt: "2026-07-13T01:35:00.000Z",
    verifiedBy: "synthetic-privacy-reviewer"
  });
  operation = {
    ...operation,
    participants: [participant],
    updatedAt: participant.updatedAt
  };
  return operation;
}

function baseOperation(
  overrides: {
    catalogGate?: Phase0ManualMatchingStudyOperation["catalogGate"];
    catalogVerifiedAt?: string | null;
  } = {}
): Phase0ManualMatchingStudyOperation {
  return createManualMatchingStudyOperation({
    sourceType: "testFixture",
    studyID: "synthetic-study-001",
    studyVersion: "synthetic-study-protocol-v1",
    catalogVersion: {
      catalogVersionID: "synthetic-catalog-version",
      game: "EA SPORTS College Football 27",
      platform: "test-only-platform",
      gameVersion: "test-only-version",
      patchVersion: "test-only-patch",
      verifiedAt: overrides.catalogVerifiedAt === undefined ? "2026-07-13T00:00:00.000Z" : overrides.catalogVerifiedAt
    },
    catalogGate: overrides.catalogGate ?? {
      approvedCatalogReleaseAvailable: true,
      releaseID: "synthetic-release-001",
      releaseStatus: "approvedRelease",
      gateCheckedAt: "2026-07-13T00:00:00.000Z"
    },
    createdAt: "2026-07-13T00:00:00.000Z",
    notes: "Synthetic fixture-only operational study."
  });
}

function review(reviewerID: string, stableIDSuffixes: [string, string, string], completedAt: string): Phase0ManualStudyIndependentReview {
  return {
    reviewerID,
    rankedHeadChoices: stableIDSuffixes.map((suffix, index) => ({
      rank: (index + 1) as 1 | 2 | 3,
      catalogItemID: `synthetic-head-choice-${suffix}`,
      catalogStableInternalID: `CF27_TESTONLY_HEAD_${suffix}`,
      reviewerID,
      reason: `Synthetic reviewer selected fixture head ${suffix}.`
    })),
    hairChoice: {
      catalogItemID: "synthetic-hair-choice-001",
      catalogStableInternalID: "CF27_TESTONLY_HAIR_001",
      reviewerID,
      reason: "Synthetic hair choice."
    },
    facialHairChoice: {
      catalogItemID: null,
      catalogStableInternalID: null,
      reviewerID,
      reason: "Synthetic participant has no selected facial-hair option."
    },
    completedAt,
    notes: "Synthetic independent review."
  };
}
