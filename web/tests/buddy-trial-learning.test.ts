import { describe, expect, it } from "vitest";
import {
  attachBuddyTrialFinalOutcome,
  attachBuddyTrialVideoOneReview,
  attachBuddyTrialVideoTwoReview,
  BUDDY_TRIAL_ACTIVE_INVITE_ID,
  createBuddyTrialSession,
  transitionBuddyTrialSession,
  type BuddyTrialFinalOutcome
} from "@/lib/buddy-trial/buddy-trial-session";
import { createCharacterVideoReviewResult, createPersistableCharacterVideoReview } from "@/lib/buddy-trial/character-video-review";
import {
  createBuddyTrialLearningRecord,
  createOfflineBuddyTrialOptimizationReport,
  validateBuddyTrialLearningRecord,
  validateOptimizationCandidateForProduction,
  type BuddyTrialLearningRecord
} from "@/lib/buddy-trial/buddy-trial-learning";
import { createOwnerReviewDemoRecommendationResult } from "@/lib/owner-review-demo/owner-review-demo";

const now = new Date("2026-08-07T13:00:00.000Z");

describe("Buddy Trial learning and optimization loop", () => {
  it("creates a completed owner-review demo learning record while excluding it from real optimization", () => {
    const demo = createOwnerReviewDemoRecommendationResult();
    const session = completedSession();
    const record = createBuddyTrialLearningRecord({
      session,
      source: "owner_review_demo",
      profile: demo.profile,
      ownerReviewDemo: demo,
      productImprovementOptIn: true,
      productImprovementConsentVersion: "demo-consent-v1",
      now
    });

    expect(record).toMatchObject({
      source: "owner_review_demo",
      excludedFromRealBetaMetrics: true,
      excludedFromProductionOptimization: true,
      eligibleForOfflineOptimization: false,
      rawHumanScanMediaRetained: false,
      rawCharacterVideoRetained: false,
      automaticTrainingStarted: false,
      productionMutationAllowed: false,
      initialBuildScore: 82,
      finalBuildScore: 91,
      numericDelta: 9,
      testerPreferredVersion: "refined",
      resemblanceRating: 8
    });
    expect(record.consent).toMatchObject({
      productImprovementOptIn: true,
      rawHumanFaceMediaRetentionOptIn: false,
      modelTrainingConsentSeparateFromTrialConsent: true
    });
    expect(record.derivedFaceMeasurements.signals.length).toBeGreaterThan(0);
    expect(record.derivedFaceMeasurements.signals.every((signal) => signal.valueStored === false)).toBe(true);
    expect(record.videoOneComparison).toMatchObject({ iteration: 1, rawVideoRetained: false });
    expect(record.videoTwoComparison).toMatchObject({ iteration: 2, rawVideoRetained: false });
    expect(validateBuddyTrialLearningRecord(record)).toEqual({ ok: true, errors: [] });

    const report = createOfflineBuddyTrialOptimizationReport([record], now);
    expect(report).toMatchObject({
      sourceRecordCount: 1,
      eligibleRecordCount: 0,
      excludedDemoRecordCount: 1,
      automaticProductionDeployment: false,
      approvalRequiredBeforeProduction: true,
      candidateChanges: []
    });
  });

  it("proposes offline optimization candidates only from consented non-demo structured outcomes", () => {
    const eligible = productionLearningRecord({ id: "eligible-a", catalogItemID: "catalog-head-alpha", rating: 9, delta: 9 });
    const second = productionLearningRecord({ id: "eligible-b", catalogItemID: "catalog-head-beta", rating: 6, delta: -2 });
    const unconsented = {
      ...productionLearningRecord({ id: "unconsented", catalogItemID: "catalog-head-alpha", rating: 7, delta: 3 }),
      eligibleForOfflineOptimization: false,
      excludedFromProductionOptimization: true,
      consent: {
        ...productionLearningRecord({ id: "unconsented", catalogItemID: "catalog-head-alpha", rating: 7, delta: 3 }).consent,
        productImprovementOptIn: false,
        productImprovementConsentVersion: null
      }
    };

    const report = createOfflineBuddyTrialOptimizationReport([eligible, second, unconsented], now);

    expect(report).toMatchObject({
      sourceRecordCount: 3,
      eligibleRecordCount: 2,
      excludedDemoRecordCount: 0,
      excludedConsentRecordCount: 1,
      automaticProductionDeployment: false,
      approvalRequiredBeforeProduction: true
    });
    expect(report.patterns.controlOvershoot[0]).toMatchObject({
      controlID: "jaw-width",
      direction: "over"
    });
    expect(report.patterns.presetPerformance).toHaveLength(2);
    expect(report.candidateChanges.map((candidate) => candidate.changeType)).toEqual(
      expect.arrayContaining(["calibration_change", "matching_weight_change", "ranking_change"])
    );
    expect(report.candidateChanges.every((candidate) => candidate.approvedForProduction === false && candidate.requiresOwnerApproval)).toBe(true);

    expect(
      validateOptimizationCandidateForProduction({
        candidate: report.candidateChanges[0],
        ownerApproved: false,
        validationCasesPassed: false,
        version: null,
        rollbackPlanID: null
      })
    ).toMatchObject({ ok: false, nextStatus: "blocked_pending_approval" });
    expect(
      validateOptimizationCandidateForProduction({
        candidate: report.candidateChanges[0],
        ownerApproved: true,
        validationCasesPassed: true,
        version: "matcher-calibration-v2",
        rollbackPlanID: "rollback-matcher-calibration-v2"
      })
    ).toEqual({ ok: true, errors: [], nextStatus: "ready_for_owner_approved_release_candidate" });
  });

  it("rejects raw-media contamination and automatic production mutation", () => {
    const record = productionLearningRecord({ id: "unsafe", catalogItemID: "catalog-head-alpha", rating: 8, delta: 4 });
    expect(
      validateBuddyTrialLearningRecord({
        ...record,
        optionalFeedback: "The file was blob:https://example.test/video"
      }).errors
    ).toContain("Learning record contains a raw-media URL or data URL.");
    expect(
      validateBuddyTrialLearningRecord({
        ...record,
        automaticTrainingStarted: true as false
      }).errors
    ).toContain("Learning records cannot start training or mutate production behavior automatically.");
  });
});

function completedSession() {
  let session = createBuddyTrialSession({
    inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
    productionCatalogRecordCount: 0,
    ownerReviewDemoEnabled: true,
    now,
    sessionId: "bt_session_learning_1234"
  });
  for (const state of [
    "CONSENTED",
    "SCAN_IN_PROGRESS",
    "SCAN_COMPLETE",
    "RECOMMENDATION_READY",
    "BUILD_IN_PROGRESS",
    "VIDEO_1_REQUIRED",
    "VIDEO_1_PROCESSING",
    "REFINEMENT_READY",
    "VIDEO_2_REQUIRED",
    "FINAL_RESULT_READY"
  ] as const) {
    session = transitionBuddyTrialSession(session, state, now, `Fixture transition to ${state}.`);
  }
  session = attachBuddyTrialVideoOneReview(session, videoReview(1));
  session = attachBuddyTrialVideoTwoReview(session, videoReview(2));
  session = attachBuddyTrialFinalOutcome(session, finalOutcome());
  return transitionBuddyTrialSession(session, "COMPLETE", now, "Final result submitted.");
}

function videoReview(iteration: 1 | 2) {
  return createPersistableCharacterVideoReview(
    createCharacterVideoReviewResult({
      iteration,
      metadata: {
        fileName: `character-video-${iteration}.mp4`,
        fileType: "video/mp4",
        fileSizeBytes: 1_000_000,
        durationSeconds: 12,
        width: 1280,
        height: 720,
        source: "fixture"
      },
      objectUrlsRevokedAfterProcessing: true
    })
  );
}

function finalOutcome(): BuddyTrialFinalOutcome {
  return {
    schemaVersion: "buddy-trial-final-outcome-v1",
    source: "owner_review_demo",
    initialRecommendationLabel: "Review Demo Face Alpha",
    finalSettingsSummary: [{ label: "Jaw Width", value: "61", menuPath: ["Road to Glory", "Appearance", "Face"] }],
    beforeScore: 82,
    afterScore: 91,
    scoreDelta: 9,
    trend: "improvement",
    improved: ["Jaw proportion", "Nose length", "Chin projection"],
    stillDifferent: ["Brow height"],
    scoreLanguage: "Build Match Score is not identity probability.",
    userPreference: "refined",
    resemblanceRating: 8,
    stillLooksOff: "Brow still sits high.",
    productImprovementOptIn: true,
    productImprovementConsentVersion: "demo-consent-v1",
    submittedAt: now.toISOString(),
    rawMediaRetained: false
  };
}

function productionLearningRecord(input: { id: string; catalogItemID: string; rating: number; delta: number }): BuddyTrialLearningRecord {
  return {
    schemaVersion: "buddy-trial-learning-record-v1",
    learningRecordID: `btl_${input.id}`,
    pseudonymousTrialID: `btlp_${input.id}`,
    source: "production",
    analyticsDataset: "private_beta_trial_learning_candidates",
    excludedFromRealBetaMetrics: false,
    excludedFromProductionOptimization: false,
    eligibleForOfflineOptimization: true,
    consent: {
      normalTrialConsentVersion: "trial-consent-v1",
      productImprovementOptIn: true,
      productImprovementConsentVersion: "learning-consent-v1",
      rawHumanFaceMediaRetentionOptIn: false,
      modelTrainingConsentSeparateFromTrialConsent: true
    },
    captureQuality: {
      requiredViewsComplete: true,
      overallQualityScore: 0.88,
      browserRgbOnly: true,
      qualityWarnings: [],
      rawFaceMediaRetained: false
    },
    derivedFaceMeasurements: {
      profileID: `profile-${input.id}`,
      profileVersion: "standard-face-profile-v2",
      measurementModelVersion: "rgb-landmark-geometry-v1",
      signals: [{ measurementID: "jawWidthRatio", bin: "high", confidenceLabel: "high", valueStored: false }],
      exactMeasurementsStored: false,
      rawLandmarksStored: false
    },
    initialRecommendation: {
      recommendationID: `rec-${input.id}`,
      catalogItemID: input.catalogItemID,
      label: input.catalogItemID,
      rank: 1,
      score: 88
    },
    recommendationModelVersion: "production-matcher-v1",
    catalogVersionID: "cf27-production-catalog-v1",
    initialGameSettings: [{ label: "Head", value: input.catalogItemID, menuPath: ["Road to Glory", "Appearance", "Head"] }],
    videoOneComparison: { iteration: 1, status: "usable", standardizedViewCount: 3, standardizedViews: [], buildScore: 82, rawVideoRetained: false },
    initialBuildScore: 82,
    refinementChanges: [{ controlID: "jaw-width", label: "Jaw Width", from: "67", to: "61", reason: "Jaw was too wide." }],
    videoTwoComparison: { iteration: 2, status: "usable", standardizedViewCount: 3, standardizedViews: [], buildScore: 82 + input.delta, rawVideoRetained: false },
    finalBuildScore: 82 + input.delta,
    numericDelta: input.delta,
    testerPreferredVersion: input.delta >= 0 ? "refined" : "original",
    resemblanceRating: input.rating,
    optionalFeedback: null,
    errorRetryEvents: [],
    rawHumanScanMediaRetained: false,
    rawCharacterVideoRetained: false,
    automaticTrainingStarted: false,
    productionMutationAllowed: false,
    createdAt: now.toISOString()
  };
}
