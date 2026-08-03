import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUILD_MATCH_PASSING_SCORE,
  DAY1_BUILD_MATCH_SCORE_CONFIG,
  calculateBuildMatchScore,
  completeSelfImprovingFeedbackLoop,
  validateGlobalLearningApproval,
  type GlobalLearningReviewCandidate
} from "@/lib/feedback/self-improving-feedback-loop";
import { CONSENT_VERSION, createInitialConsentState, type ConsentState } from "@/lib/privacy/consent";
import { createInitialCaptureSession } from "@/lib/capture/capture-session";
import { createInitialAttributeConfirmation } from "@/lib/profile/attribute-confirmation";
import { createStandardFaceProfile } from "@/lib/profile/standard-face-profile";
import {
  createFailClosedSupabaseRepositories,
  createLocalOnlyRepositories,
  type BuildFeedbackOutcomeRecord,
  type GlobalLearningCandidateRecord,
  type PersonalPreferenceRecord
} from "@/lib/supabase/repository-contracts";
import { createSupabaseRuntimeStatus, getSupabaseServerRuntimeConfig } from "@/lib/supabase/runtime-config";
import type { BuildInstruction, GameAppearanceMatch, GameCatalogManifest, GameCatalogVersion, RefinementResult } from "@/types/domain";

const now = new Date("2026-08-02T12:00:00.000Z");
const catalogVersion: GameCatalogVersion = {
  identifier: "unit-production-catalog-v1",
  gameVersion: "unit-game-version",
  platform: "Xbox Series X|S",
  verifiedAt: "2026-08-01T00:00:00.000Z"
};

describe("self-improving feedback loop", () => {
  it("calculates a passing build-match score without identity-probability language", () => {
    const score = calculateBuildMatchScore(refinementResult({ closenessScore: 94 }));

    expect(score.score).toBe(94);
    expect(score.passingScore).toBe(DEFAULT_BUILD_MATCH_PASSING_SCORE);
    expect(score.passingScore).toBe(DAY1_BUILD_MATCH_SCORE_CONFIG.buildPassThreshold);
    expect(DAY1_BUILD_MATCH_SCORE_CONFIG.customerFacingLabel).toBe("Build match: {score}/100 based on the appearance options available in this game.");
    expect(score.status).toBe("passed");
    expect(score.scoreLabel).toMatch(/not identity probability/i);
  });

  it("recommends verified refinements below the configurable passing threshold", () => {
    const profile = profileFixture();
    const match = matchFixture({ rank: 1, catalogItemID: "catalog-head-1" });
    const result = completeSelfImprovingFeedbackLoop({
      gameID: "college-football-27",
      profile,
      recommendations: [match, matchFixture({ rank: 2, catalogItemID: "catalog-head-2" })],
      buildInstructions: buildInstructions(),
      refinementResult: refinementResult({ closenessScore: 82 }),
      selectedFinalMatch: match,
      userConfirmedSettings: [{ instructionID: "instruction-head", finalValue: "Head Template 01 tested" }],
      userNotes: "Jaw and chin looked closest after one adjustment.",
      consentState: createInitialConsentState(now),
      now
    });

    expect(result.buildMatchScore).toMatchObject({ score: 82, status: "needsRefinement" });
    expect(result.recommendedRefinements).toHaveLength(1);
    expect(result.recommendedRefinements[0]).toMatchObject({
      type: "changeVerifiedHairstyle",
      relatedCatalogItemID: "catalog-hair-1"
    });
    expect(result.finalConfirmedSettings?.settings).toContainEqual(
      expect.objectContaining({
        instructionID: "instruction-head",
        finalValue: "Head Template 01 tested",
        source: "userConfirmedOverride"
      })
    );
    expect(result.personalPreference).toMatchObject({
      appliesOnlyToSameUserProfile: true,
      preferredCatalogItemID: "catalog-head-1",
      buildMatchScore: 82
    });
    expect(result.globalLearningCandidate).toMatchObject({
      status: "notConsented",
      rawMediaIncluded: false,
      exactMeasurementsIncluded: false,
      identityDataIncluded: false
    });
    expect(result.automaticRetrainingStarted).toBe(false);
    expect(result.rawMediaStored).toBe(false);
  });

  it("queues consented privacy-safe global learning candidates without approving them", () => {
    const profile = profileFixture();
    const consentState = consentWithFutureProductImprovement();
    const result = completeSelfImprovingFeedbackLoop({
      gameID: "college-football-27",
      profile,
      recommendations: [matchFixture({ rank: 1, catalogItemID: "catalog-head-1" })],
      buildInstructions: buildInstructions(),
      refinementResult: refinementResult({ closenessScore: 91 }),
      consentState,
      now
    });

    expect(result.globalLearningCandidate).toMatchObject({
      status: "queuedForHumanReview",
      consentVersion: CONSENT_VERSION,
      scoreBand: "90-100",
      requiresHumanApproval: true,
      requiresValidationStudy: true,
      requiresVersionedRollbackPlan: true,
      rawMediaIncluded: false,
      exactMeasurementsIncluded: false,
      identityDataIncluded: false
    });
    expect(validateGlobalLearningApproval({ candidate: result.globalLearningCandidate, validationStudyPassed: false, humanApproved: false, versionedChangeID: null, rollbackPlanID: null })).toMatchObject({
      ok: false,
      nextStatus: "validationRequired"
    });
    expect(
      validateGlobalLearningApproval({
        candidate: result.globalLearningCandidate,
        validationStudyPassed: true,
        humanApproved: true,
        versionedChangeID: "matcher-change-v2",
        rollbackPlanID: "rollback-matcher-change-v2"
      })
    ).toEqual({ ok: true, errors: [], nextStatus: "approvedForNextVersion" });
  });

  it("keeps repository persistence privacy-safe and fail-closed for global learning", async () => {
    const runtime = createSupabaseRuntimeStatus(getSupabaseServerRuntimeConfig({}));
    const repos = createLocalOnlyRepositories({ runtime, manifest: emptyProductionManifest() });
    const profile = profileFixture();
    const consented = completeSelfImprovingFeedbackLoop({
      gameID: "college-football-27",
      profile,
      recommendations: [matchFixture({ rank: 1, catalogItemID: "catalog-head-1" })],
      buildInstructions: buildInstructions(),
      refinementResult: refinementResult({ closenessScore: 93 }),
      consentState: consentWithFutureProductImprovement(),
      now
    });
    const unconsented = completeSelfImprovingFeedbackLoop({
      gameID: "college-football-27",
      profile,
      recommendations: [matchFixture({ rank: 1, catalogItemID: "catalog-head-1" })],
      buildInstructions: buildInstructions(),
      refinementResult: refinementResult({ closenessScore: 76 }),
      consentState: createInitialConsentState(now),
      now
    });

    await expect(repos.recordBuildFeedbackOutcome(buildFeedbackRecord(consented), consented.finalConfirmedSettings!, "feedback-safe")).resolves.toMatchObject({
      ok: true
    });
    await expect(repos.savePersonalPreference(preferenceRecord(consented), consented.personalPreference!, "preference-safe")).resolves.toMatchObject({
      ok: true
    });
    await expect(
      repos.queueGlobalLearningCandidate(globalLearningRecord(consented.globalLearningCandidate), consented.globalLearningCandidate, "global-safe")
    ).resolves.toMatchObject({ ok: true });
    await expect(
      repos.queueGlobalLearningCandidate(globalLearningRecord(unconsented.globalLearningCandidate), unconsented.globalLearningCandidate, "global-blocked")
    ).resolves.toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    await expect(
      repos.recordBuildFeedbackOutcome({ ...buildFeedbackRecord(consented), rawMediaStored: true as false }, consented.finalConfirmedSettings!, "feedback-unsafe")
    ).resolves.toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  });

  it("keeps Supabase feedback writes blocked until a concrete adapter is enabled", async () => {
    const runtime = createSupabaseRuntimeStatus(getSupabaseServerRuntimeConfig({}));
    const repos = createFailClosedSupabaseRepositories(runtime);
    const result = completeSelfImprovingFeedbackLoop({
      gameID: "college-football-27",
      profile: profileFixture(),
      recommendations: [matchFixture({ rank: 1, catalogItemID: "catalog-head-1" })],
      buildInstructions: buildInstructions(),
      refinementResult: refinementResult({ closenessScore: 90 }),
      consentState: consentWithFutureProductImprovement(),
      now
    });

    await expect(repos.recordBuildFeedbackOutcome(buildFeedbackRecord(result), result.finalConfirmedSettings!, "remote-feedback")).resolves.toMatchObject({
      ok: false,
      error: { code: "REMOTE_NOT_READY" }
    });
    await expect(repos.queueGlobalLearningCandidate(globalLearningRecord(result.globalLearningCandidate), result.globalLearningCandidate, "remote-global")).resolves.toMatchObject({
      ok: false,
      error: { code: "REMOTE_NOT_READY" }
    });
  });
});

function profileFixture() {
  return createStandardFaceProfile({
    session: createInitialCaptureSession(now),
    attributes: createInitialAttributeConfirmation(),
    now,
    userAgent: "unit-test"
  });
}

function consentWithFutureProductImprovement(): ConsentState {
  const consent = createInitialConsentState(now);
  return {
    ...consent,
    futureProductImprovement: {
      ...consent.futureProductImprovement,
      granted: true,
      updatedAt: now.toISOString()
    }
  };
}

function matchFixture(input: { rank: 1 | 2 | 3; catalogItemID: string }): GameAppearanceMatch {
  return {
    id: `match-${input.rank}`,
    rank: input.rank,
    catalogItem: {
      sourceType: "production",
      stableInternalID: input.catalogItemID,
      game: "EA SPORTS College Football 27",
      gameVersion: catalogVersion.gameVersion,
      platform: catalogVersion.platform,
      gameMode: "Road to Glory",
      creationPath: "Road to Glory > Create Player > Appearance",
      category: "head",
      visibleGameLabelOrIndex: `Head Template 0${input.rank}`,
      verificationState: "verified",
      capturedDate: "2026-08-01T00:00:00.000Z",
      verifiedDate: "2026-08-01T00:00:00.000Z",
      sourceImageReferences: ["evidence/cf27/head.png"],
      geometryMeasurements: {},
      humanAnnotations: {},
      catalogManagerDisposition: "approved",
      navigationInstructions: [],
      catalogVersion,
      isTestFixture: false
    },
    score: 90 - input.rank,
    scoreLabel: "Match score based on the game’s available appearance options.",
    confidence: { score: 0.82, label: "high" },
    explanation: {
      summary: "Unit-test appearance match.",
      strongestSimilarities: ["Jaw width is close."],
      largestDifferences: ["Mouth width differs."],
      uncertaintyNotes: []
    },
    catalogVersion,
    modelVersion: "unit-matcher-v1",
    featureContributions: [],
    evidenceSupportState: "SUPPORTED",
    evidenceSupportNotes: []
  };
}

function buildInstructions(): BuildInstruction[] {
  return [
    {
      id: "instruction-head",
      sequenceNumber: 1,
      title: "Select head",
      detail: "Choose the verified native head.",
      gameTitle: "EA SPORTS College Football 27",
      menuCategory: "Head",
      verifiedGameLabel: "Head Template 01",
      instructionKind: "headOption",
      nativeHeadOption: "Head Template 01",
      navigationPath: ["Road to Glory", "Create Player", "Appearance", "Head"],
      platform: "Xbox Series X|S",
      gameVersion: "unit-game-version",
      mode: "Road to Glory",
      creationPath: "Road to Glory > Create Player > Appearance",
      notes: [],
      limitations: [],
      verificationDate: "2026-08-01T00:00:00.000Z",
      relatedCatalogItemID: "catalog-head-1"
    },
    {
      id: "instruction-hair",
      sequenceNumber: 2,
      title: "Select hair",
      detail: "Choose the verified native hairstyle.",
      gameTitle: "EA SPORTS College Football 27",
      menuCategory: "Hair",
      verifiedGameLabel: "Short Crop",
      instructionKind: "hairstyle",
      nativeHeadOption: "Head Template 01",
      navigationPath: ["Road to Glory", "Create Player", "Appearance", "Hair"],
      platform: "Xbox Series X|S",
      gameVersion: "unit-game-version",
      mode: "Road to Glory",
      creationPath: "Road to Glory > Create Player > Appearance",
      notes: [],
      limitations: [],
      verificationDate: "2026-08-01T00:00:00.000Z",
      relatedCatalogItemID: "catalog-hair-1",
      relatedAppearanceCategory: "hairstyle"
    }
  ];
}

function refinementResult(input: { closenessScore: number }): RefinementResult {
  return {
    status: input.closenessScore >= DEFAULT_BUILD_MATCH_PASSING_SCORE ? "keepCurrent" : "tryAlternative",
    message: "Unit-test screenshot refinement result.",
    suggestedMatches: [matchFixture({ rank: 1, catalogItemID: "catalog-head-1" })],
    engineVersion: "unit-refinement-v1",
    catalogVersion,
    actions: [
      {
        id: "action-hair",
        type: "changeVerifiedHairstyle",
        label: "Try verified hairstyle",
        description: "Use the verified hairstyle from the build guide.",
        relatedCatalogItemID: "catalog-hair-1",
        requiresVerifiedCatalog: true,
        confidence: { score: 0.74, label: "medium" },
        reasons: ["Hair shape is the largest visible mismatch."]
      },
      {
        id: "action-no-catalog-item",
        type: "changeVerifiedControl",
        label: "Ignored unlinked action",
        description: "This lacks a verified catalog item and must not be recommended.",
        requiresVerifiedCatalog: true,
        confidence: { score: 0.7, label: "medium" },
        reasons: ["Missing traceability."]
      }
    ],
    comparisonReport: {
      reportVersion: "unit-report-v1",
      screenshotSessionID: "screenshot-session-1",
      comparedAt: now.toISOString(),
      screenshotEvidenceState: "ready",
      normalizedMeasurementCount: 5,
      crossDomainConfidence: { score: 0.8, label: "high" },
      originalProfileComparison: {
        profileID: "profile-unit",
        profileVersion: "standard-face-profile-v2",
        screenshotClosenessScore: input.closenessScore,
        confidence: { score: 0.78, label: "medium" },
        comparedFeatureCount: 5,
        reasons: ["Front, jaw, and mouth proportions were compared."],
        differences: ["Jaw appears wider than the reference profile."],
        limitations: ["Game render and user photo geometry are cross-domain."]
      },
      candidateComparisons: [],
      actionSummary: "Use verified controls for the next iteration.",
      limitations: ["Cross-domain visual comparison is directional."]
    }
  };
}

function emptyProductionManifest(): GameCatalogManifest {
  return {
    sourceType: "production",
    catalogVersion,
    generatedAt: now.toISOString(),
    isProduction: true,
    declaredItemCount: 0,
    packageChecksum: "a".repeat(64),
    releaseStatus: "approvedRelease",
    items: []
  };
}

function buildFeedbackRecord(result: ReturnType<typeof completeSelfImprovingFeedbackLoop>): BuildFeedbackOutcomeRecord {
  return {
    feedbackOutcomeID: "feedback-outcome-1",
    gameID: result.gameID,
    profileID: result.profileID,
    catalogVersionID: result.finalConfirmedSettings?.catalogVersionID ?? null,
    selectedCatalogItemID: result.finalConfirmedSettings?.winningCatalogItemID ?? "catalog-head-1",
    buildMatchScore: result.buildMatchScore.score,
    passingScore: result.buildMatchScore.passingScore,
    passed: result.buildMatchScore.status === "passed",
    createdAt: now.toISOString(),
    rawMediaStored: false,
    exactMeasurementsStored: false
  };
}

function preferenceRecord(result: ReturnType<typeof completeSelfImprovingFeedbackLoop>): PersonalPreferenceRecord {
  return {
    preferenceID: "preference-1",
    gameID: result.gameID,
    profileID: result.profileID,
    preferredCatalogItemID: result.personalPreference?.preferredCatalogItemID ?? "catalog-head-1",
    updatedAt: now.toISOString(),
    rawMediaStored: false
  };
}

function globalLearningRecord(candidate: GlobalLearningReviewCandidate): GlobalLearningCandidateRecord {
  return {
    candidateID: candidate.candidateID,
    gameID: candidate.gameID,
    catalogVersionID: candidate.catalogVersionID,
    status: candidate.status,
    createdAt: candidate.createdAt,
    consentVersion: candidate.consentVersion,
    rawMediaStored: false,
    exactMeasurementsStored: false,
    automaticTrainingStarted: false
  };
}
