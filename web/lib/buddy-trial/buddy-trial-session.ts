import { CONSENT_VERSION, type ConsentID } from "@/lib/privacy/consent";
import type { CharacterVideoReviewResult } from "@/lib/buddy-trial/character-video-review";
import type { BuddyTrialLearningRecord } from "@/lib/buddy-trial/buddy-trial-learning";
import type { BuddyTrialResultPhotoFeedback } from "@/lib/buddy-trial/buddy-trial-result-photo-feedback";

export const BUDDY_TRIAL_SCHEMA_VERSION = "buddy-trial-v1";
export const BUDDY_TRIAL_ROUTE_PREFIX = "/trial";
export const BUDDY_TRIAL_STORAGE_PREFIX = "gfm:buddy-trial:v1";

export const BUDDY_TRIAL_ACTIVE_INVITE_ID = "btv1_8f4c2a7d9e6b41c0a3f5d8e2b9c7a1f0";
export const BUDDY_TRIAL_EXPIRED_INVITE_ID = "btv1_2a6d4f8c1b3e5a7099e8d7c6b5a43210";
export const BUDDY_TRIAL_USED_INVITE_ID = "btv1_7c9a1e5d3f8b2460a4c2e1d9b8f60531";
export const BUDDY_TRIAL_OWNER_INVITE_PREFIX = "btv1_owner_";

export const BUDDY_TRIAL_STATES = [
  "INVITED",
  "CONSENTED",
  "SCAN_IN_PROGRESS",
  "SCAN_COMPLETE",
  "RECOMMENDATION_READY",
  "BUILD_IN_PROGRESS",
  "VIDEO_1_REQUIRED",
  "VIDEO_1_PROCESSING",
  "REFINEMENT_READY",
  "VIDEO_2_REQUIRED",
  "FINAL_RESULT_READY",
  "COMPLETE",
  "DELETED"
] as const;

export type BuddyTrialState = (typeof BUDDY_TRIAL_STATES)[number];

export type BuddyTrialInviteStatus = "active" | "expired" | "used" | "invalid";

export type BuddyTrialCatalogGate = "available" | "owner_review_demo_available" | "production_catalog_unavailable";

export interface BuddyTrialInvite {
  inviteId: string;
  label: string;
  status: Exclude<BuddyTrialInviteStatus, "expired" | "invalid">;
  createdAt: string;
  expiresAt: string;
}

export interface BuddyTrialConsentRecord {
  consentVersion: string;
  acceptedAt: string | null;
  acknowledgments: Record<Extract<ConsentID, "ageEligibility" | "subjectPermission" | "cameraUse" | "currentFaceAnalysis" | "temporaryProcessing">, boolean>;
}

export interface BuddyTrialSessionHistoryEntry {
  state: BuddyTrialState;
  at: string;
  note: string;
}

export interface BuddyTrialBuildGuideProgress {
  schemaVersion: "buddy-trial-build-guide-progress-v1";
  totalStepCount: number;
  currentStepIndex: number;
  completedStepIds: string[];
  viewMode: "step" | "summary";
  updatedAt: string;
}

export type BuddyTrialCharacterVideoReviewSummary = Omit<CharacterVideoReviewResult, "candidateFrames"> & { candidateFrames: [] };
export type BuddyTrialBeforeAfterTrend = "improvement" | "no_change" | "regression";
export type BuddyTrialVersionPreference = "original" | "refined" | "about_the_same";

export interface BuddyTrialFinalOutcome {
  schemaVersion: "buddy-trial-final-outcome-v1";
  source: "owner_review_demo" | "production";
  initialRecommendationLabel: string;
  finalSettingsSummary: Array<{
    label: string;
    value: string;
    menuPath: string[];
  }>;
  beforeScore: number;
  afterScore: number;
  scoreDelta: number;
  trend: BuddyTrialBeforeAfterTrend;
  improved: string[];
  stillDifferent: string[];
  scoreLanguage: string;
  userPreference: BuddyTrialVersionPreference | null;
  resemblanceRating: number | null;
  stillLooksOff: string | null;
  productImprovementOptIn: boolean;
  productImprovementConsentVersion: string | null;
  submittedAt: string | null;
  rawMediaRetained: false;
}

export interface BuddyTrialSession {
  schemaVersion: typeof BUDDY_TRIAL_SCHEMA_VERSION;
  inviteId: string;
  sessionId: string;
  state: BuddyTrialState;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  deletedAt: string | null;
  consent: BuddyTrialConsentRecord;
  catalogGate: BuddyTrialCatalogGate;
  buildGuide: BuddyTrialBuildGuideProgress | null;
  refinementGuide: BuddyTrialBuildGuideProgress | null;
  videoOneReview: BuddyTrialCharacterVideoReviewSummary | null;
  videoTwoReview: BuddyTrialCharacterVideoReviewSummary | null;
  resultPhotoFeedback: BuddyTrialResultPhotoFeedback | null;
  finalOutcome: BuddyTrialFinalOutcome | null;
  trialLearningRecord: BuddyTrialLearningRecord | null;
  history: BuddyTrialSessionHistoryEntry[];
}

export interface BuddyTrialInviteResolution {
  status: BuddyTrialInviteStatus;
  invite: BuddyTrialInvite | null;
  message: string;
}

export const REQUIRED_BUDDY_TRIAL_CONSENTS: Array<keyof BuddyTrialConsentRecord["acknowledgments"]> = [
  "ageEligibility",
  "subjectPermission",
  "cameraUse",
  "currentFaceAnalysis",
  "temporaryProcessing"
];

export const BUDDY_TRIAL_INVITES: BuddyTrialInvite[] = [
  {
    inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
    label: "Buddy Trial V1 fixture invite",
    status: "active",
    createdAt: "2026-08-07T00:00:00.000Z",
    expiresAt: "2026-12-31T23:59:59.000Z"
  },
  {
    inviteId: BUDDY_TRIAL_EXPIRED_INVITE_ID,
    label: "Expired Buddy Trial V1 fixture invite",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-02-01T00:00:00.000Z"
  },
  {
    inviteId: BUDDY_TRIAL_USED_INVITE_ID,
    label: "Used Buddy Trial V1 fixture invite",
    status: "used",
    createdAt: "2026-08-07T00:00:00.000Z",
    expiresAt: "2026-12-31T23:59:59.000Z"
  }
];

const allowedTransitions: Record<BuddyTrialState, BuddyTrialState[]> = {
  INVITED: ["CONSENTED", "DELETED"],
  CONSENTED: ["SCAN_IN_PROGRESS", "DELETED"],
  SCAN_IN_PROGRESS: ["SCAN_COMPLETE", "CONSENTED", "DELETED"],
  SCAN_COMPLETE: ["RECOMMENDATION_READY", "DELETED"],
  RECOMMENDATION_READY: ["BUILD_IN_PROGRESS", "DELETED"],
  BUILD_IN_PROGRESS: ["VIDEO_1_REQUIRED", "DELETED"],
  VIDEO_1_REQUIRED: ["VIDEO_1_PROCESSING", "COMPLETE", "DELETED"],
  VIDEO_1_PROCESSING: ["REFINEMENT_READY", "VIDEO_1_REQUIRED", "DELETED"],
  REFINEMENT_READY: ["VIDEO_2_REQUIRED", "DELETED"],
  VIDEO_2_REQUIRED: ["FINAL_RESULT_READY", "DELETED"],
  FINAL_RESULT_READY: ["COMPLETE", "DELETED"],
  COMPLETE: [],
  DELETED: []
};

export function getBuddyTrialInvite(inviteId: string, now = new Date()): BuddyTrialInviteResolution {
  const invite = BUDDY_TRIAL_INVITES.find((item) => item.inviteId === inviteId) ?? null;
  if (!invite && isOwnerGeneratedBuddyTrialInvite(inviteId)) {
    return {
      status: "active",
      invite: {
        inviteId,
        label: "Owner-created Buddy Trial",
        status: "active",
        createdAt: now.toISOString(),
        expiresAt: "2099-12-31T23:59:59.000Z"
      },
      message: "This owner-created Buddy Trial invite is active."
    };
  }
  if (!invite) {
    return {
      status: "invalid",
      invite: null,
      message: "This Buddy Trial link is not recognized."
    };
  }

  if (invite.status === "used") {
    return {
      status: "used",
      invite,
      message: "This Buddy Trial link has already been completed."
    };
  }

  if (new Date(invite.expiresAt).getTime() <= now.getTime()) {
    return {
      status: "expired",
      invite,
      message: "This Buddy Trial link has expired."
    };
  }

  return {
    status: "active",
    invite,
    message: "This Buddy Trial invite is active."
  };
}

export function isOwnerGeneratedBuddyTrialInvite(inviteId: string) {
  const suffix = inviteId.startsWith(BUDDY_TRIAL_OWNER_INVITE_PREFIX) ? inviteId.slice(BUDDY_TRIAL_OWNER_INVITE_PREFIX.length) : "";
  return /^[a-f0-9]{32}$/i.test(suffix);
}

export function createBuddyTrialStorageKey(inviteId: string) {
  return `${BUDDY_TRIAL_STORAGE_PREFIX}:${inviteId}`;
}

export function createInitialBuddyTrialConsent(): BuddyTrialConsentRecord {
  return {
    consentVersion: CONSENT_VERSION,
    acceptedAt: null,
    acknowledgments: {
      ageEligibility: false,
      subjectPermission: false,
      cameraUse: false,
      currentFaceAnalysis: false,
      temporaryProcessing: false
    }
  };
}

export function createBuddyTrialSession({
  inviteId,
  productionCatalogRecordCount,
  ownerReviewDemoEnabled = false,
  now = new Date(),
  sessionId
}: {
  inviteId: string;
  productionCatalogRecordCount: number;
  ownerReviewDemoEnabled?: boolean;
  now?: Date;
  sessionId?: string;
}): BuddyTrialSession {
  const timestamp = now.toISOString();
  return {
    schemaVersion: BUDDY_TRIAL_SCHEMA_VERSION,
    inviteId,
    sessionId: sessionId ?? createBuddyTrialSessionId(inviteId, now),
    state: "INVITED",
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    deletedAt: null,
    consent: createInitialBuddyTrialConsent(),
    catalogGate: productionCatalogRecordCount > 0 ? "available" : ownerReviewDemoEnabled ? "owner_review_demo_available" : "production_catalog_unavailable",
    buildGuide: null,
    refinementGuide: null,
    videoOneReview: null,
    videoTwoReview: null,
    resultPhotoFeedback: null,
    finalOutcome: null,
    trialLearningRecord: null,
    history: [{ state: "INVITED", at: timestamp, note: "Buddy Trial invite opened." }]
  };
}

export function createBuddyTrialSessionId(inviteId: string, now = new Date()) {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${now.getTime()}`;
  return `bt_session_${inviteId.slice(-8)}_${suffix}`;
}

export function hasRequiredBuddyTrialConsent(consent: BuddyTrialConsentRecord) {
  return REQUIRED_BUDDY_TRIAL_CONSENTS.every((id) => consent.acknowledgments[id]);
}

export function applyBuddyTrialConsent(session: BuddyTrialSession, consent: BuddyTrialConsentRecord, now = new Date()) {
  if (!hasRequiredBuddyTrialConsent(consent)) {
    return session;
  }

  return transitionBuddyTrialSession(
    {
      ...session,
      consent: {
        ...consent,
        acceptedAt: now.toISOString()
      }
    },
    "CONSENTED",
    now,
    "Required Buddy Trial consent accepted."
  );
}

export function transitionBuddyTrialSession(session: BuddyTrialSession, nextState: BuddyTrialState, now = new Date(), note = `Moved to ${nextState}.`) {
  if (session.state === nextState) {
    return session;
  }

  if (nextState === "RECOMMENDATION_READY" && !isBuddyTrialRecommendationCatalogGateAvailable(session.catalogGate)) {
    throw new Error("Buddy Trial recommendations are blocked until the production catalog is available.");
  }

  if (!allowedTransitions[session.state].includes(nextState)) {
    throw new Error(`Invalid Buddy Trial transition from ${session.state} to ${nextState}.`);
  }

  const timestamp = now.toISOString();
  return {
    ...session,
    state: nextState,
    updatedAt: timestamp,
    completedAt: nextState === "COMPLETE" ? timestamp : session.completedAt,
    deletedAt: nextState === "DELETED" ? timestamp : session.deletedAt,
    buildGuide: nextState === "DELETED" ? null : session.buildGuide,
    refinementGuide: nextState === "DELETED" ? null : session.refinementGuide ?? null,
    videoOneReview: nextState === "DELETED" ? null : session.videoOneReview,
    videoTwoReview: nextState === "DELETED" ? null : session.videoTwoReview,
    resultPhotoFeedback: nextState === "DELETED" ? null : session.resultPhotoFeedback ?? null,
    finalOutcome: nextState === "DELETED" ? null : session.finalOutcome,
    trialLearningRecord: nextState === "DELETED" ? null : session.trialLearningRecord,
    history: [...session.history, { state: nextState, at: timestamp, note }]
  };
}

export function canAdvanceBuddyTrialToRecommendation(session: BuddyTrialSession) {
  return session.state === "SCAN_COMPLETE" && isBuddyTrialRecommendationCatalogGateAvailable(session.catalogGate);
}

export function isBuddyTrialRecommendationCatalogGateAvailable(catalogGate: BuddyTrialCatalogGate) {
  return catalogGate === "available" || catalogGate === "owner_review_demo_available";
}

export function createBuddyTrialBuildGuideProgress(stepCount: number, now = new Date()): BuddyTrialBuildGuideProgress {
  return {
    schemaVersion: "buddy-trial-build-guide-progress-v1",
    totalStepCount: stepCount,
    currentStepIndex: 0,
    completedStepIds: [],
    viewMode: "step",
    updatedAt: now.toISOString()
  };
}

export function updateBuddyTrialBuildGuideProgress(
  session: BuddyTrialSession,
  patch: Partial<Pick<BuddyTrialBuildGuideProgress, "totalStepCount" | "currentStepIndex" | "completedStepIds" | "viewMode">>,
  now = new Date()
): BuddyTrialSession {
  const current = session.buildGuide ?? createBuddyTrialBuildGuideProgress(0, now);
  return {
    ...session,
    updatedAt: now.toISOString(),
    buildGuide: {
      ...current,
      ...patch,
      totalStepCount: Math.max(0, patch.totalStepCount ?? current.totalStepCount),
      currentStepIndex: Math.max(0, patch.currentStepIndex ?? current.currentStepIndex),
      completedStepIds: patch.completedStepIds ?? current.completedStepIds,
      updatedAt: now.toISOString()
    }
  };
}

export function updateBuddyTrialRefinementGuideProgress(
  session: BuddyTrialSession,
  patch: Partial<Pick<BuddyTrialBuildGuideProgress, "totalStepCount" | "currentStepIndex" | "completedStepIds" | "viewMode">>,
  now = new Date()
): BuddyTrialSession {
  const current = session.refinementGuide ?? createBuddyTrialBuildGuideProgress(0, now);
  return {
    ...session,
    updatedAt: now.toISOString(),
    refinementGuide: {
      ...current,
      ...patch,
      totalStepCount: Math.max(0, patch.totalStepCount ?? current.totalStepCount),
      currentStepIndex: Math.max(0, patch.currentStepIndex ?? current.currentStepIndex),
      completedStepIds: patch.completedStepIds ?? current.completedStepIds,
      updatedAt: now.toISOString()
    }
  };
}

export function attachBuddyTrialVideoOneReview(
  session: BuddyTrialSession,
  review: BuddyTrialSession["videoOneReview"],
  now = new Date()
): BuddyTrialSession {
  return {
    ...session,
    updatedAt: now.toISOString(),
    videoOneReview: review
  };
}

export function attachBuddyTrialVideoTwoReview(
  session: BuddyTrialSession,
  review: BuddyTrialSession["videoTwoReview"],
  now = new Date()
): BuddyTrialSession {
  return {
    ...session,
    updatedAt: now.toISOString(),
    videoTwoReview: review
  };
}

export function attachBuddyTrialResultPhotoFeedback(
  session: BuddyTrialSession,
  resultPhotoFeedback: BuddyTrialResultPhotoFeedback,
  now = new Date()
): BuddyTrialSession {
  return {
    ...session,
    updatedAt: now.toISOString(),
    resultPhotoFeedback
  };
}

export function attachBuddyTrialFinalOutcome(
  session: BuddyTrialSession,
  outcome: BuddyTrialFinalOutcome,
  now = new Date()
): BuddyTrialSession {
  return {
    ...session,
    updatedAt: now.toISOString(),
    finalOutcome: outcome
  };
}

export function attachBuddyTrialLearningRecord(
  session: BuddyTrialSession,
  learningRecord: BuddyTrialLearningRecord,
  now = new Date()
): BuddyTrialSession {
  return {
    ...session,
    updatedAt: now.toISOString(),
    trialLearningRecord: learningRecord
  };
}

export function getBuddyTrialNextAction(session: BuddyTrialSession) {
  if (session.state === "DELETED") {
    return "Trial data was removed from this browser.";
  }
  if (session.state === "COMPLETE") {
    return "Trial complete.";
  }
  if (session.catalogGate === "owner_review_demo_available" && session.state === "SCAN_COMPLETE") {
    return "Owner Review Demo settings are ready. They are test data, not verified CF27 records.";
  }
  if (session.catalogGate === "production_catalog_unavailable" && session.state === "SCAN_COMPLETE") {
    return "Verified College Football 27 settings are not available yet.";
  }
  if (session.state === "INVITED") {
    return "Review the privacy details and accept the required acknowledgments.";
  }
  if (session.state === "CONSENTED") {
    return "Start the guided face scan.";
  }
  if (session.state === "SCAN_IN_PROGRESS") {
    return "Continue the guided face scan on this device.";
  }
  if (session.state === "RECOMMENDATION_READY") {
    return "Open the build guide and create the player in College Football 27.";
  }
  if (session.state === "BUILD_IN_PROGRESS") {
    return "Return here after building the player in the game.";
  }
  return "Continue the Buddy Trial.";
}

export function parseBuddyTrialSession(value: string | null): BuddyTrialSession | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as BuddyTrialSession;
    if (parsed.schemaVersion !== BUDDY_TRIAL_SCHEMA_VERSION || !BUDDY_TRIAL_STATES.includes(parsed.state)) {
      return null;
    }
    return {
      ...parsed,
      buildGuide: parsed.buildGuide ?? null,
      refinementGuide: parsed.refinementGuide ?? null,
      videoOneReview: parsed.videoOneReview ?? null,
      videoTwoReview: parsed.videoTwoReview ?? null,
      resultPhotoFeedback: parsed.resultPhotoFeedback ?? null,
      finalOutcome: parsed.finalOutcome ?? null,
      trialLearningRecord: parsed.trialLearningRecord ?? null
    };
  } catch {
    return null;
  }
}

export function serializeBuddyTrialSession(session: BuddyTrialSession) {
  return JSON.stringify(session);
}

export function markBuddyTrialScanCompleteInStorage({
  inviteId,
  now = new Date(),
  productionCatalogRecordCount,
  ownerReviewDemoEnabled = false,
  storage
}: {
  inviteId: string;
  now?: Date;
  productionCatalogRecordCount: number;
  ownerReviewDemoEnabled?: boolean;
  storage: Pick<Storage, "getItem" | "setItem">;
}) {
  const key = createBuddyTrialStorageKey(inviteId);
  const existing =
    parseBuddyTrialSession(storage.getItem(key)) ??
    createBuddyTrialSession({
      inviteId,
      productionCatalogRecordCount,
      ownerReviewDemoEnabled,
      now
    });
  if (existing.state === "DELETED" || existing.state === "COMPLETE" || existing.state === "SCAN_COMPLETE") {
    storage.setItem(key, serializeBuddyTrialSession(existing));
    return existing;
  }
  const readySession =
    existing.state === "INVITED" && hasRequiredBuddyTrialConsent(existing.consent) ? transitionBuddyTrialSession(existing, "CONSENTED", now) : existing;
  const inProgressSession =
    readySession.state === "CONSENTED" ? transitionBuddyTrialSession(readySession, "SCAN_IN_PROGRESS", now, "Buddy Trial scan resumed from guided capture.") : readySession;
  const nextSession =
    inProgressSession.state === "SCAN_IN_PROGRESS"
      ? transitionBuddyTrialSession(inProgressSession, "SCAN_COMPLETE", now, "Buddy Trial scan completed from guided capture.")
      : inProgressSession;
  storage.setItem(key, serializeBuddyTrialSession(nextSession));
  return nextSession;
}
