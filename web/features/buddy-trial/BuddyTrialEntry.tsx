"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { productionCatalogManifest } from "@/lib/catalog/production-manifest";
import { INDEPENDENT_APP_DISCLAIMER } from "@/lib/product-copy";
import {
  attachBuddyTrialVideoOneReview,
  attachBuddyTrialVideoTwoReview,
  attachBuddyTrialFinalOutcome,
  attachBuddyTrialLearningRecord,
  attachBuddyTrialResultPhotoFeedback,
  applyBuddyTrialConsent,
  BUDDY_TRIAL_ACTIVE_INVITE_POINTER_KEY,
  BUDDY_TRIAL_STATES,
  canAdvanceBuddyTrialToRecommendation,
  createBuddyTrialBuildGuideProgress,
  createInitialBuddyTrialConsent,
  createBuddyTrialSession,
  createBuddyTrialStorageKey,
  getBuddyTrialInvite,
  getBuddyTrialNextAction,
  hasRequiredBuddyTrialConsent,
  parseBuddyTrialSession,
  REQUIRED_BUDDY_TRIAL_CONSENTS,
  serializeBuddyTrialSession,
  transitionBuddyTrialSession,
  updateBuddyTrialBuildGuideProgress,
  updateBuddyTrialRefinementGuideProgress,
  type BuddyTrialBuildGuideProgress,
  type BuddyTrialFinalOutcome,
  type BuddyTrialVersionPreference,
  type BuddyTrialState,
  type BuddyTrialSession
} from "@/lib/buddy-trial/buddy-trial-session";
import { createBuddyTrialLearningRecord } from "@/lib/buddy-trial/buddy-trial-learning";
import { createPrivateBetaTrialPersistenceRecord } from "@/lib/buddy-trial/buddy-trial-persistence";
import {
  BUDDY_TRIAL_RESULT_PHOTO_ACCEPTED_MIME_TYPES,
  createBuddyTrialResultPhotoRecord,
  createEmptyBuddyTrialResultPhotoFeedback,
  getBuddyTrialResultPhotoViewLabel,
  removeBuddyTrialResultPhoto,
  submitBuddyTrialResultFeedback,
  upsertBuddyTrialResultPhoto,
  validateBuddyTrialResultPhotoFeedback,
  type BuddyTrialOtherRecommendationAnswer,
  type BuddyTrialResultFeedback,
  type BuddyTrialResultPhotoFeedback,
  type BuddyTrialResultPhotoRecord,
  type BuddyTrialResultPhotoViewID
} from "@/lib/buddy-trial/buddy-trial-result-photo-feedback";
import {
  CHARACTER_VIDEO_ACCEPTED_MIME_TYPES,
  confirmManualCharacterVideoSelection,
  createCharacterVideoReviewResult,
  createPersistableCharacterVideoReview,
  type CharacterVideoFrameCandidate,
  type CharacterVideoMetadata,
  type CharacterVideoReviewResult,
  type CharacterVideoSource,
  type CharacterVideoViewID
} from "@/lib/buddy-trial/character-video-review";
import {
  createOwnerReviewDemoLearningRecord,
  createOwnerReviewDemoRecommendationResult,
  isOwnerReviewDemoEnabled,
  OWNER_REVIEW_DEMO_BANNER_COPY,
  OWNER_REVIEW_DEMO_MATCHING_CONFIG_VERSION,
  type OwnerReviewDemoBuildMatchReview,
  type OwnerReviewDemoBeforeAfterResult,
  type OwnerReviewDemoBuildStep,
  type OwnerReviewDemoRecommendationResult
} from "@/lib/owner-review-demo/owner-review-demo";
import { getConsentDefinition } from "@/lib/privacy/consent";

interface BuddyTrialEntryProps {
  inviteId: string;
}

const compactScanConsentCopy =
  "I confirm I meet the age requirement, I'm scanning myself or have permission, I agree to camera use and face analysis, and I understand scan media is temporary and GameFace Match is an independent companion app.";

const buddyTrialStageLabels: Record<BuddyTrialState, { label: string; action: string }> = {
  INVITED: { label: "Ready to scan", action: "Open the guided scan when you are ready." },
  CONSENTED: { label: "Ready to scan", action: "Start your GameFace scan when you are ready." },
  SCAN_IN_PROGRESS: { label: "Ready to scan", action: "Open the guided scan when you are ready." },
  SCAN_COMPLETE: { label: "Scan complete", action: "Get your GameFace settings." },
  RECOMMENDATION_READY: { label: "Settings ready", action: "Review your recommendation and build it in the game." },
  BUILD_IN_PROGRESS: { label: "Build guide", action: "Enter one setting at a time on your console." },
  VIDEO_1_REQUIRED: { label: "Show the first build", action: "Upload the College Football 27 player photos you captured." },
  VIDEO_1_PROCESSING: { label: "First video ready", action: "Review the comparison and refinement." },
  REFINEMENT_READY: { label: "Refinement ready", action: "Apply the suggested changes." },
  VIDEO_2_REQUIRED: { label: "Show the updated build", action: "Record or upload the updated player." },
  FINAL_RESULT_READY: { label: "Final review", action: "Compare the before and after, then rate the result." },
  COMPLETE: { label: "Complete", action: "Your GameFace trial is complete." },
  DELETED: { label: "Deleted", action: "This browser no longer has trial data for this link." }
};

type BuddyTrialInitialization =
  | { status: "ready" }
  | {
      status: "storage_error";
      message: string;
    };

function getBuddyTrialStageCopy(session: BuddyTrialSession | null, fallbackAction: string) {
  if (!session) return buddyTrialStageLabels.INVITED;
  const copy = buddyTrialStageLabels[session.state];
  return copy ?? { label: "In progress", action: fallbackAction };
}

function formatControlKind(kind: string) {
  switch (kind) {
    case "preset":
      return "Preset";
    case "slider":
      return "Value";
    case "color":
      return "Color";
    case "facialHair":
      return "Facial hair";
    case "menu":
      return "Menu step";
    default:
      return kind.replaceAll("_", " ");
  }
}

function getBuddyTrialStorageErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "SecurityError") {
    return "This browser is blocking local storage for the private trial.";
  }
  if (error instanceof Error && error.name === "QuotaExceededError") {
    return "This browser does not have enough available local storage for the private trial.";
  }
  return "GameFace Match could not open the local trial session store.";
}

export function BuddyTrialEntry({ inviteId }: BuddyTrialEntryProps) {
  const inviteResolution = useMemo(() => getBuddyTrialInvite(inviteId), [inviteId]);
  const storageKey = useMemo(() => createBuddyTrialStorageKey(inviteId), [inviteId]);
  const productionCatalogRecordCount = productionCatalogManifest.items.length;
  const ownerReviewDemoEnabled = isOwnerReviewDemoEnabled({
    NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO: process.env.NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO,
    NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV: process.env.NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV
  });
  const ownerReviewDemo = useMemo<OwnerReviewDemoRecommendationResult | null>(() => (ownerReviewDemoEnabled ? createOwnerReviewDemoRecommendationResult() : null), [ownerReviewDemoEnabled]);
  const [session, setSession] = useState<BuddyTrialSession | null>(null);
  const [initialization, setInitialization] = useState<BuddyTrialInitialization>({ status: "ready" });
  const [consent, setConsent] = useState<ReturnType<typeof createInitialBuddyTrialConsent> | null>(null);
  const [independentAcknowledged, setIndependentAcknowledged] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const existing = parseBuddyTrialSession(window.localStorage.getItem(storageKey));
      setSession(existing);
      setConsent(existing?.consent ?? null);
      setInitialization({ status: "ready" });
    } catch (error) {
      setInitialization({
        status: "storage_error",
        message: getBuddyTrialStorageErrorMessage(error)
      });
    }
  }, [storageKey]);

  const persistSession = (nextSession: BuddyTrialSession) => {
    setSession(nextSession);
    setConsent(nextSession.consent);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, serializeBuddyTrialSession(nextSession));
        setInitialization({ status: "ready" });
      } catch (error) {
        setInitialization({
          status: "storage_error",
          message: getBuddyTrialStorageErrorMessage(error)
        });
      }
    }
  };

  const ensureSession = () => {
    if (session) {
      return session;
    }
    const nextSession = createBuddyTrialSession({
      inviteId,
      productionCatalogRecordCount,
      betaResearchEnabled: true,
      ownerReviewDemoEnabled
    });
    persistSession(nextSession);
    return nextSession;
  };

  const currentConsent = consent ?? session?.consent ?? createInitialBuddyTrialConsent();
  const consentReady = hasRequiredBuddyTrialConsent(currentConsent);
  const preScanState = !session || session.state === "INVITED";
  const consentAlreadyAccepted = Boolean(session?.consent.acceptedAt && hasRequiredBuddyTrialConsent(session.consent));
  const compactConsentChecked = consentAlreadyAccepted || (consentReady && independentAcknowledged);
  const showScanHandoff = preScanState || session?.state === "CONSENTED" || session?.state === "SCAN_IN_PROGRESS";
  const nextAction = session ? getBuddyTrialNextAction(session) : "Review the invite and start when ready.";
  const stageCopy = getBuddyTrialStageCopy(session, nextAction);
  const showScanAction = showScanHandoff;
  const showOwnerReviewActiveBody = Boolean(ownerReviewDemo && session && !["INVITED", "CONSENTED", "SCAN_IN_PROGRESS"].includes(session.state));

  const updateCompactConsentAcknowledgment = (checked: boolean) => {
    const activeSession = ensureSession();
    const nextConsent = {
      ...activeSession.consent,
      acknowledgments: {
        ...activeSession.consent.acknowledgments,
        ageEligibility: checked,
        subjectPermission: checked,
        cameraUse: checked,
        currentFaceAnalysis: checked,
        temporaryProcessing: checked
      }
    };
    const nextSession = { ...activeSession, consent: nextConsent };
    setIndependentAcknowledged(checked);
    setConsent(nextConsent);
    persistSession(nextSession);
  };

  const startScan = () => {
    const activeSession = ensureSession();
    const currentStateRequiresConsent = activeSession.state === "INVITED";
    if (currentStateRequiresConsent && (!consentReady || !compactConsentChecked)) {
      return;
    }
    const consented = currentStateRequiresConsent ? applyBuddyTrialConsent({ ...activeSession, consent: currentConsent }, currentConsent) : activeSession;
    const nextSession =
      consented.state === "CONSENTED" ? transitionBuddyTrialSession(consented, "SCAN_IN_PROGRESS", new Date(), "Buddy Trial scan started.") : consented;
    persistSession(nextSession);
    if (typeof window !== "undefined" && nextSession.state === "SCAN_IN_PROGRESS") {
      try {
        window.sessionStorage.setItem(BUDDY_TRIAL_ACTIVE_INVITE_POINTER_KEY, inviteId);
      } catch {
        // The URL query remains the primary beta authorization handoff if sessionStorage is unavailable.
      }
      window.location.assign(`/?buddyTrialInvite=${encodeURIComponent(inviteId)}#start`);
    }
  };

  const deleteTrialData = () => {
    const activeSession = ensureSession();
    const nextSession =
      activeSession.state === "DELETED" ? activeSession : transitionBuddyTrialSession(activeSession, "DELETED", new Date(), "Buddy Trial data deleted locally.");
    persistSession(nextSession);
  };

  const moveTrialTo = (nextState: BuddyTrialState, note: string) => {
    const activeSession = ensureSession();
    persistSession(transitionBuddyTrialSession(activeSession, nextState, new Date(), note));
  };

  const startBuildGuide = (stepCount: number) => {
    const activeSession = ensureSession();
    const transitioned = transitionBuddyTrialSession(activeSession, "BUILD_IN_PROGRESS", new Date(), "Owner Review Demo build guide started.");
    persistSession(
      updateBuddyTrialBuildGuideProgress(transitioned, {
        totalStepCount: stepCount,
        currentStepIndex: transitioned.buildGuide?.currentStepIndex ?? 0,
        completedStepIds: transitioned.buildGuide?.completedStepIds ?? [],
        viewMode: transitioned.buildGuide?.viewMode ?? "step"
      })
    );
  };

  const updateBuildGuide = (patch: Partial<Pick<BuddyTrialBuildGuideProgress, "totalStepCount" | "currentStepIndex" | "completedStepIds" | "viewMode">>) => {
    const activeSession = ensureSession();
    persistSession(updateBuddyTrialBuildGuideProgress(activeSession, patch));
  };

  const updateRefinementGuide = (patch: Partial<Pick<BuddyTrialBuildGuideProgress, "totalStepCount" | "currentStepIndex" | "completedStepIds" | "viewMode">>) => {
    const activeSession = ensureSession();
    persistSession(updateBuddyTrialRefinementGuideProgress(activeSession, patch));
  };

  const completeBuildGuide = (patch: Partial<Pick<BuddyTrialBuildGuideProgress, "totalStepCount" | "currentStepIndex" | "completedStepIds" | "viewMode">>) => {
    const activeSession = ensureSession();
    const withProgress = updateBuddyTrialBuildGuideProgress(activeSession, patch);
    persistSession(transitionBuddyTrialSession(withProgress, "VIDEO_1_REQUIRED", new Date(), "Owner Review Demo build guide completed."));
  };

  const saveVideoOneReview = (review: CharacterVideoReviewResult) => {
    const activeSession = ensureSession();
    const withReview = attachBuddyTrialVideoOneReview(activeSession, createPersistableCharacterVideoReview(review));
    const shouldAdvance = activeSession.state === "VIDEO_1_REQUIRED" && review.status === "usable";
    persistSession(
      shouldAdvance
        ? transitionBuddyTrialSession(withReview, "VIDEO_1_PROCESSING", new Date(), "Owner Review Demo first character video processed locally.")
        : withReview
    );
  };

  const saveVideoTwoReview = (review: CharacterVideoReviewResult) => {
    const activeSession = ensureSession();
    const withReview = attachBuddyTrialVideoTwoReview(activeSession, createPersistableCharacterVideoReview(review));
    const shouldAdvance = activeSession.state === "VIDEO_2_REQUIRED" && review.status === "usable";
    persistSession(
      shouldAdvance
        ? transitionBuddyTrialSession(withReview, "FINAL_RESULT_READY", new Date(), "Owner Review Demo second character video processed locally.")
        : withReview
    );
  };

  const saveResultPhotoFeedbackDraft = (feedback: BuddyTrialResultPhotoFeedback) => {
    const activeSession = ensureSession();
    persistSession(attachBuddyTrialResultPhotoFeedback(activeSession, feedback));
  };

  const completeTrialWithPhotoFeedback = (feedback: BuddyTrialResultPhotoFeedback) => {
    const activeSession = ensureSession();
    const withFeedback = attachBuddyTrialResultPhotoFeedback(activeSession, feedback);
    persistSession(transitionBuddyTrialSession(withFeedback, "COMPLETE", new Date(), "Buddy Trial CF27 result photos and feedback submitted."));
  };

  const startRefinementGuide = (stepCount: number) => {
    const activeSession = ensureSession();
    const withProgress = updateBuddyTrialRefinementGuideProgress(activeSession, {
      totalStepCount: stepCount,
      currentStepIndex: 0,
      completedStepIds: [],
      viewMode: "step"
    });
    persistSession(transitionBuddyTrialSession(withProgress, "VIDEO_2_REQUIRED", new Date(), "Owner Review Demo refinement walkthrough started."));
  };

  const completeRefinementGuide = () => {
    const activeSession = ensureSession();
    const stepCount = ownerReviewDemo?.refinementPlan.refinementBuildGuideSteps.length ?? activeSession.refinementGuide?.totalStepCount ?? 0;
    const stepIds = ownerReviewDemo?.refinementPlan.refinementBuildGuideSteps.map((step) => step.id) ?? activeSession.refinementGuide?.completedStepIds ?? [];
    persistSession(
      updateBuddyTrialRefinementGuideProgress(activeSession, {
        totalStepCount: stepCount,
        currentStepIndex: Math.max(0, stepCount - 1),
        completedStepIds: stepIds,
        viewMode: "step"
      })
    );
  };

  const completeTrialWithOutcome = (outcome: BuddyTrialFinalOutcome) => {
    const activeSession = ensureSession();
    const withOutcome = attachBuddyTrialFinalOutcome(activeSession, outcome);
    const learningRecord = ownerReviewDemo
      ? createBuddyTrialLearningRecord({
          session: withOutcome,
          source: "owner_review_demo",
          profile: ownerReviewDemo.profile,
          ownerReviewDemo,
          productImprovementOptIn: outcome.productImprovementOptIn,
          productImprovementConsentVersion: outcome.productImprovementConsentVersion
        })
      : null;
    const withLearning = learningRecord ? attachBuddyTrialLearningRecord(withOutcome, learningRecord) : withOutcome;
    persistSession(transitionBuddyTrialSession(withLearning, "COMPLETE", new Date(), "Owner Review Demo final before/after result and tester feedback submitted."));
  };

  const ownerReviewDemoPanel = ownerReviewDemo ? (
    <OwnerReviewDemoPanel
      session={session}
      result={ownerReviewDemo}
      onStartRecommendations={() => moveTrialTo("RECOMMENDATION_READY", "Owner Review Demo recommendations opened with test data.")}
      onStartBuild={() => startBuildGuide(ownerReviewDemo.buildGuideSteps.length)}
      onUpdateBuildGuide={updateBuildGuide}
      onCompleteBuildGuide={completeBuildGuide}
      onSaveVideoOneReview={saveVideoOneReview}
      onRestartVideoOne={() => moveTrialTo("VIDEO_1_REQUIRED", "Owner Review Demo first character video retry requested.")}
      onDeliverRefinement={() => moveTrialTo("REFINEMENT_READY", "Owner Review Demo refinement fixture delivered.")}
      onStartRefinementGuide={() => startRefinementGuide(ownerReviewDemo.refinementPlan.refinementBuildGuideSteps.length)}
      onUpdateRefinementGuide={updateRefinementGuide}
      onCompleteRefinementGuide={completeRefinementGuide}
      onSaveVideoTwoReview={saveVideoTwoReview}
      onRestartVideoTwo={() => moveTrialTo("VIDEO_2_REQUIRED", "Owner Review Demo second character video retry requested.")}
      onSaveResultPhotoFeedback={saveResultPhotoFeedbackDraft}
      onCompletePhotoFeedback={completeTrialWithPhotoFeedback}
      onDeleteTrialData={deleteTrialData}
      onComplete={completeTrialWithOutcome}
    />
  ) : null;

  if (inviteResolution.status !== "active") {
    return (
      <main className="buddy-trial-page">
        <section className="buddy-trial-shell" aria-labelledby="buddy-trial-status-title">
          <p className="buddy-trial-kicker">GameFace Match private trial</p>
          <h1 id="buddy-trial-status-title">{getInviteStatusTitle(inviteResolution.status)}</h1>
          <p className="buddy-trial-copy">{inviteResolution.message}</p>
          <p className="buddy-trial-disclaimer">{INDEPENDENT_APP_DISCLAIMER}</p>
        </section>
      </main>
    );
  }

  if (initialization.status === "storage_error") {
    return (
      <main className="buddy-trial-page">
        <section className="buddy-trial-shell" aria-labelledby="buddy-trial-storage-title">
          <p className="buddy-trial-kicker">GameFace Match private trial</p>
          <h1 id="buddy-trial-storage-title">Private trial storage is blocked</h1>
          <p className="buddy-trial-copy">{initialization.message}</p>
          <p className="buddy-trial-copy">Turn on browser storage for this site, then refresh this private link. GameFace Match uses local trial storage so you can leave Safari and return to the same step.</p>
          <button className="buddy-trial-primary" type="button" onClick={() => window.location.reload()}>
            Try Again
          </button>
          <p className="buddy-trial-disclaimer">{INDEPENDENT_APP_DISCLAIMER}</p>
        </section>
      </main>
    );
  }

  if (session?.state === "DELETED") {
    return (
      <main className="buddy-trial-page">
        <section className="buddy-trial-shell" aria-labelledby="buddy-trial-deleted-title">
          <p className="buddy-trial-kicker">GameFace Match private trial</p>
          <h1 id="buddy-trial-deleted-title">Trial data removed</h1>
          <p className="buddy-trial-copy">This browser no longer has the local Buddy Trial session for this invite.</p>
          <p className="buddy-trial-disclaimer">{INDEPENDENT_APP_DISCLAIMER}</p>
        </section>
      </main>
    );
  }

  if (session?.state === "COMPLETE") {
    if (ownerReviewDemo && session.resultPhotoFeedback?.feedback.submittedAt) {
      return (
        <main className="buddy-trial-page">
          <section className="buddy-trial-shell" aria-labelledby="buddy-trial-complete-title">
            <div className="buddy-trial-brand" aria-label="GameFace Match">
              <span className="buddy-trial-mark" aria-hidden="true">
                G
              </span>
              <span>GameFace Match</span>
            </div>
            <p className="buddy-trial-kicker">Private Buddy Trial</p>
            <h1 id="buddy-trial-complete-title">GameFace feedback sent.</h1>
            <BuddyTrialResultPhotoCompletionSummary feedback={session.resultPhotoFeedback} />
            <p className="buddy-trial-disclaimer">{INDEPENDENT_APP_DISCLAIMER}</p>
          </section>
        </main>
      );
    }
    if (ownerReviewDemo && session.finalOutcome) {
      return (
        <main className="buddy-trial-page">
          <section className="buddy-trial-shell" aria-labelledby="buddy-trial-complete-title">
            <div className="buddy-trial-brand" aria-label="GameFace Match">
              <span className="buddy-trial-mark" aria-hidden="true">
                G
              </span>
              <span>GameFace Match</span>
            </div>
            <p className="buddy-trial-kicker">Private Buddy Trial</p>
            <h1 id="buddy-trial-complete-title">GameFace complete.</h1>
            <OwnerReviewDemoCompletionSummary outcome={session.finalOutcome} />
            <p className="buddy-trial-disclaimer">{INDEPENDENT_APP_DISCLAIMER}</p>
          </section>
        </main>
      );
    }
    return (
      <main className="buddy-trial-page">
        <section className="buddy-trial-shell" aria-labelledby="buddy-trial-complete-title">
          <p className="buddy-trial-kicker">GameFace Match private trial</p>
          <h1 id="buddy-trial-complete-title">Trial complete</h1>
          <p className="buddy-trial-copy">Thanks for completing this Buddy Trial. No additional session is started from this link.</p>
          <p className="buddy-trial-disclaimer">{INDEPENDENT_APP_DISCLAIMER}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="buddy-trial-page">
      <section className={`buddy-trial-shell${showOwnerReviewActiveBody ? " buddy-trial-shell--active" : ""}`} aria-labelledby="buddy-trial-title">
        <div className="buddy-trial-brand" aria-label="GameFace Match">
          <span className="buddy-trial-mark" aria-hidden="true">
            G
          </span>
          <span>GameFace Match</span>
        </div>
        <p className="buddy-trial-kicker">GameFace Match Private Beta</p>
        <h1 id="buddy-trial-title">{showOwnerReviewActiveBody ? "Your GameFace trial" : "Build yourself in College Football 27."}</h1>
        {!showOwnerReviewActiveBody ? <p className="buddy-trial-copy">Open the guided scan when you are ready.</p> : null}

        {ownerReviewDemoEnabled ? (
          <div className="buddy-trial-demo-banner" role="status">
            {OWNER_REVIEW_DEMO_BANNER_COPY}
          </div>
        ) : null}

        {!showOwnerReviewActiveBody ? (
          <div className="buddy-trial-status-card" aria-live="polite">
            <span className="buddy-trial-status-label">Next up</span>
            <strong>{stageCopy.label}</strong>
            <span>{stageCopy.action}</span>
          </div>
        ) : null}

        {showOwnerReviewActiveBody ? ownerReviewDemoPanel : null}

        {!showOwnerReviewActiveBody ? (
          <>
            {session?.catalogGate === "production_catalog_unavailable" ? (
              <div className="buddy-trial-warning" role="status">
                Real College Football 27 settings are not available yet. This link can still test the scan, build guide, video review, and deletion flow without
                showing made-up live settings.
              </div>
            ) : null}
            {session?.catalogGate === "beta_research_available" ? (
              <div className="buddy-trial-beta-note" role="status">
                GameFace Match Private Beta — this free invite uses experimental research settings. No payment is required, and production catalog records stay
                separate.
              </div>
            ) : null}
          </>
        ) : null}

        <div className="buddy-trial-actions">
          {showScanAction ? (
            <>
              <label className="buddy-trial-compact-consent">
                <input
                  type="checkbox"
                  checked={compactConsentChecked}
                  onChange={(event) => updateCompactConsentAcknowledgment(event.target.checked)}
                  aria-describedby="buddy-trial-compact-consent-copy"
                />
                <span id="buddy-trial-compact-consent-copy">{compactScanConsentCopy}</span>
              </label>
              <button className="buddy-trial-primary" type="button" onClick={startScan} disabled={!compactConsentChecked}>
                Continue guided scan
              </button>
            </>
          ) : null}
          {!showOwnerReviewActiveBody ? (
            <button className="buddy-trial-secondary" type="button" onClick={deleteTrialData}>
              Delete My Trial Data
            </button>
          ) : null}
        </div>

        {!showOwnerReviewActiveBody ? (
          <details className="buddy-trial-privacy">
            <summary>Privacy details</summary>
            <p>
              This private trial saves progress and choices in this browser so you can come back after using the console. Basic use does not require an account.
              Raw face photos or video are not saved by default. Cloud backup, public sharing, model training, and marketing use are not included in this
              consent.
            </p>
            <p>{INDEPENDENT_APP_DISCLAIMER}</p>
            <ul>
              {REQUIRED_BUDDY_TRIAL_CONSENTS.map((id) => {
                const definition = getConsentDefinition(id);
                return definition ? <li key={id}>{definition.description}</li> : null;
              })}
            </ul>
          </details>
        ) : null}

        {!showOwnerReviewActiveBody ? <p className="buddy-trial-resume">You can leave and come back with this same private link on this iPhone.</p> : null}
      </section>
    </main>
  );
}

function OwnerReviewDemoPanel({
  session,
  result,
  onStartRecommendations,
  onStartBuild,
  onUpdateBuildGuide,
  onCompleteBuildGuide,
  onSaveVideoOneReview,
  onRestartVideoOne,
  onDeliverRefinement,
  onStartRefinementGuide,
  onUpdateRefinementGuide,
  onCompleteRefinementGuide,
  onSaveVideoTwoReview,
  onRestartVideoTwo,
  onSaveResultPhotoFeedback,
  onCompletePhotoFeedback,
  onDeleteTrialData,
  onComplete
}: {
  session: BuddyTrialSession | null;
  result: OwnerReviewDemoRecommendationResult;
  onStartRecommendations: () => void;
  onStartBuild: () => void;
  onUpdateBuildGuide: (patch: Partial<Pick<BuddyTrialBuildGuideProgress, "totalStepCount" | "currentStepIndex" | "completedStepIds" | "viewMode">>) => void;
  onCompleteBuildGuide: (patch: Partial<Pick<BuddyTrialBuildGuideProgress, "totalStepCount" | "currentStepIndex" | "completedStepIds" | "viewMode">>) => void;
  onSaveVideoOneReview: (review: CharacterVideoReviewResult) => void;
  onRestartVideoOne: () => void;
  onDeliverRefinement: () => void;
  onStartRefinementGuide: () => void;
  onUpdateRefinementGuide: (patch: Partial<Pick<BuddyTrialBuildGuideProgress, "totalStepCount" | "currentStepIndex" | "completedStepIds" | "viewMode">>) => void;
  onCompleteRefinementGuide: () => void;
  onSaveVideoTwoReview: (review: CharacterVideoReviewResult) => void;
  onRestartVideoTwo: () => void;
  onSaveResultPhotoFeedback: (feedback: BuddyTrialResultPhotoFeedback) => void;
  onCompletePhotoFeedback: (feedback: BuddyTrialResultPhotoFeedback) => void;
  onDeleteTrialData: () => void;
  onComplete: (outcome: BuddyTrialFinalOutcome) => void;
}) {
  const state = session?.state ?? "INVITED";
  const bestMatch = result.matches[0];
  const progress = session?.buildGuide;
  const currentStepIndex = Math.min(progress?.currentStepIndex ?? 0, Math.max(result.buildGuideSteps.length - 1, 0));
  const completedStepIds = progress?.completedStepIds ?? [];
  const completedCount = completedStepIds.length;
  const refinementProgress = session?.refinementGuide ?? createBuddyTrialBuildGuideProgress(result.refinementPlan.refinementBuildGuideSteps.length);
  const [videoReviewState, setVideoReviewState] = useState<CharacterVideoReviewUiState>(() => createInitialCharacterVideoReviewUiState(session));
  const [videoTwoReviewState, setVideoTwoReviewState] = useState<CharacterVideoReviewUiState>(() => createInitialCharacterVideoReviewUiState(session, 2));
  const videoReviewStateRef = useRef(videoReviewState);
  const videoTwoReviewStateRef = useRef(videoTwoReviewState);
  const activeVideoIterationRef = useRef<CharacterVideoReviewResult["iteration"]>(1);
  const [selectedFrameIDs, setSelectedFrameIDs] = useState<Partial<Record<CharacterVideoViewID, string>>>({});
  const [selectedVideoTwoFrameIDs, setSelectedVideoTwoFrameIDs] = useState<Partial<Record<CharacterVideoViewID, string>>>({});
  const [finalPreference, setFinalPreference] = useState<BuddyTrialVersionPreference | "">(session?.finalOutcome?.userPreference ?? "");
  const [resemblanceRating, setResemblanceRating] = useState<number>(session?.finalOutcome?.resemblanceRating ?? 0);
  const [stillLooksOff, setStillLooksOff] = useState(session?.finalOutcome?.stillLooksOff ?? "");
  const [productImprovementOptIn, setProductImprovementOptIn] = useState(Boolean(session?.finalOutcome?.productImprovementOptIn));
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<Partial<Record<BuddyTrialResultPhotoViewID, string>>>({});
  const photoPreviewUrlsRef = useRef(photoPreviewUrls);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    videoReviewStateRef.current = videoReviewState;
  }, [videoReviewState]);

  useEffect(() => {
    videoTwoReviewStateRef.current = videoTwoReviewState;
  }, [videoTwoReviewState]);

  useEffect(() => {
    photoPreviewUrlsRef.current = photoPreviewUrls;
  }, [photoPreviewUrls]);

  useEffect(() => {
    return () => {
      revokeCharacterVideoUrls(videoReviewStateRef.current);
      revokeCharacterVideoUrls(videoTwoReviewStateRef.current);
      for (const url of Object.values(photoPreviewUrlsRef.current)) {
        if (url) URL.revokeObjectURL(url);
      }
      stopCharacterRecording(recordingStreamRef.current, mediaRecorderRef.current);
    };
  }, []);

  async function processCharacterVideoFile(file: File, source: CharacterVideoSource, iteration: CharacterVideoReviewResult["iteration"] = 1) {
    const currentState = iteration === 1 ? videoReviewState : videoTwoReviewState;
    const setCurrentState = iteration === 1 ? setVideoReviewState : setVideoTwoReviewState;
    const saveReview = iteration === 1 ? onSaveVideoOneReview : onSaveVideoTwoReview;
    const setCurrentSelection = iteration === 1 ? setSelectedFrameIDs : setSelectedVideoTwoFrameIDs;
    revokeCharacterVideoUrls(currentState);
    const objectUrl = URL.createObjectURL(file);
    setCurrentState({
      status: "processing",
      progressLabel: "Reading character video metadata locally.",
      objectUrl,
      fileName: file.name,
      review: null,
      candidateFrames: [],
      error: null
    });
    try {
      const metadata = await readCharacterVideoMetadata(objectUrl, file, source);
      const baseReview = createCharacterVideoReviewResult({ metadata, iteration });
      if (baseReview.status === "blocked") {
        URL.revokeObjectURL(objectUrl);
        setCurrentState({
          status: "blocked",
          progressLabel: "This video needs a retake before GameFace Match can compare it.",
          objectUrl: null,
          fileName: file.name,
          review: baseReview,
          candidateFrames: [],
          error: baseReview.processingSummary
        });
        saveReview(baseReview);
        return;
      }

      setCurrentState((current) => ({ ...current, progressLabel: "Extracting front, left, and right candidate views." }));
      const candidateFrames = await extractCharacterVideoFrameCandidates(objectUrl, metadata, iteration);
      URL.revokeObjectURL(objectUrl);
      const review = createCharacterVideoReviewResult({ metadata, iteration, candidateFrames, objectUrlsRevokedAfterProcessing: true });
      const initialSelection = Object.fromEntries(review.standardizedViews.map((view) => [view.viewID, view.selectedFrameID])) as Partial<Record<CharacterVideoViewID, string>>;
      setCurrentSelection(initialSelection);
      setCurrentState({
        status: review.manualSelectionRequired ? "manual_selection_required" : "usable",
        progressLabel: review.processingSummary,
        objectUrl: null,
        fileName: file.name,
        review,
        candidateFrames,
        error: null
      });
      saveReview(review);
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      setCurrentState({
        status: "blocked",
        progressLabel: "The browser could not process this video.",
        objectUrl: null,
        fileName: file.name,
        review: null,
        candidateFrames: [],
        error: error instanceof Error ? error.message : "The browser could not decode this video."
      });
    }
  }

  async function startCharacterRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVideoReviewState((current) => ({
        ...current,
        status: "blocked",
        progressLabel: "Browser recording is unavailable here. Upload an existing iPhone, TV, monitor, or console video instead.",
        error: "Browser recording is unavailable here."
      }));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "video/webm" });
        const iteration = activeVideoIterationRef.current;
        const file = new File([blob], `gameface-character-video-${iteration}-${new Date().toISOString()}.webm`, { type: blob.type || "video/webm" });
        stopCharacterRecording(stream, recorder);
        recordingStreamRef.current = null;
        mediaRecorderRef.current = null;
        void processCharacterVideoFile(file, "recording", iteration);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(500);
      setVideoReviewState((current) => ({
        ...current,
        status: "recording",
        progressLabel: "Recording. Start forward, rotate left, return center, rotate right, and return center.",
        error: null
      }));
    } catch {
      setVideoReviewState((current) => ({
        ...current,
        status: "blocked",
        progressLabel: "Camera recording permission failed. Upload an existing video instead.",
        error: "Camera recording permission failed or no camera was available."
      }));
    }
  }

  function stopCurrentCharacterRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      setVideoReviewState((current) => ({ ...current, progressLabel: "Recording stopped. Processing the character video locally." }));
    }
  }

  function confirmSelectedCharacterFrames() {
    confirmSelectedCharacterFramesForIteration(1);
  }

  function confirmSelectedVideoTwoFrames() {
    confirmSelectedCharacterFramesForIteration(2);
  }

  function confirmSelectedCharacterFramesForIteration(iteration: CharacterVideoReviewResult["iteration"]) {
    const currentState = iteration === 1 ? videoReviewState : videoTwoReviewState;
    const setCurrentState = iteration === 1 ? setVideoReviewState : setVideoTwoReviewState;
    const selected = iteration === 1 ? selectedFrameIDs : selectedVideoTwoFrameIDs;
    const saveReview = iteration === 1 ? onSaveVideoOneReview : onSaveVideoTwoReview;
    if (!currentState.review) return;
    const confirmed = confirmManualCharacterVideoSelection(
      {
        ...currentState.review,
        candidateFrames: currentState.candidateFrames
      },
      selected
    );
    setCurrentState((current) => ({
      ...current,
      status: confirmed.status === "usable" ? "usable" : "blocked",
      review: confirmed,
      progressLabel: confirmed.processingSummary,
      error: confirmed.status === "blocked" ? confirmed.processingSummary : null
    }));
    saveReview(confirmed);
  }

  function retryCharacterVideo() {
    revokeCharacterVideoUrls(videoReviewState);
    setSelectedFrameIDs({});
    setVideoReviewState(createInitialCharacterVideoReviewUiState(session));
  }

  function retryVideoTwo() {
    revokeCharacterVideoUrls(videoTwoReviewState);
    setSelectedVideoTwoFrameIDs({});
    setVideoTwoReviewState(createInitialCharacterVideoReviewUiState(session, 2));
    onRestartVideoTwo();
  }

  function createSubmittedOutcome(): BuddyTrialFinalOutcome {
    return {
      schemaVersion: "buddy-trial-final-outcome-v1",
      source: "owner_review_demo",
      initialRecommendationLabel: bestMatch.catalogItem.visibleGameLabelOrIndex,
      finalSettingsSummary: result.beforeAfterResult.finalSettings,
      beforeScore: result.beforeAfterResult.initialBuildScore,
      afterScore: result.beforeAfterResult.refinedBuildScore,
      scoreDelta: result.beforeAfterResult.scoreDelta,
      trend: result.beforeAfterResult.trend,
      improved: result.beforeAfterResult.improved,
      stillDifferent: result.beforeAfterResult.stillDifferent,
      scoreLanguage: result.beforeAfterResult.scoreLanguage,
      userPreference: finalPreference || null,
      resemblanceRating: resemblanceRating || null,
      stillLooksOff: stillLooksOff.trim() || null,
      productImprovementOptIn,
      productImprovementConsentVersion: productImprovementOptIn ? session?.consent.consentVersion ?? null : null,
      submittedAt: new Date().toISOString(),
      rawMediaRetained: false
    };
  }

  if (state === "INVITED" || state === "CONSENTED" || state === "SCAN_IN_PROGRESS") {
    return (
      <section className="buddy-trial-demo-card" aria-labelledby="owner-review-demo-title">
        <h2 id="owner-review-demo-title">What happens next</h2>
        <p>
          After the guided scan, this private link brings you back here for demo settings, a couch-friendly build guide, and video review. The settings are clearly
          marked as test data.
        </p>
      </section>
    );
  }

  if (state === "SCAN_COMPLETE" && session && canAdvanceBuddyTrialToRecommendation(session)) {
    return (
      <section className="buddy-trial-demo-card buddy-trial-processing-card" aria-labelledby="owner-review-demo-ready" aria-live="polite">
        <div className="buddy-trial-processing-orb" aria-hidden="true" />
        <p className="buddy-trial-step-label">Scan complete</p>
        <h2 id="owner-review-demo-ready">Building your GameFace...</h2>
        <p>
          We&apos;re preparing your demo settings now. These are test settings for owner review, not live College Football 27 recommendations.
        </p>
        <button className="buddy-trial-primary" type="button" onClick={onStartRecommendations}>
          View my GameFace recommendation
        </button>
      </section>
    );
  }

  if (state === "RECOMMENDATION_READY") {
    return (
      <section className="buddy-trial-demo-card buddy-trial-result-card" aria-labelledby="owner-review-demo-recommendations">
        <p className="buddy-trial-step-label">Demo result</p>
        <h2 id="owner-review-demo-recommendations">Your GameFace recommendation</h2>
        <div className="buddy-trial-best-match">
          <span>Best Match</span>
          <strong>{bestMatch.catalogItem.visibleGameLabelOrIndex}</strong>
          <small>
            Match Score {bestMatch.score}/100 · {bestMatch.confidence.label} confidence · test settings
          </small>
        </div>
        <div className="buddy-trial-demo-explanation">
          <h3>Why this was selected</h3>
          <p>{bestMatch.explanation.summary}</p>
          <ul>
            {bestMatch.explanation.strongestSimilarities.slice(0, 3).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
        <OwnerReviewDemoTopThree result={result} />
        <OwnerReviewDemoSettings result={result} />
        <button className="buddy-trial-primary" type="button" onClick={onStartBuild}>
          Build This in College Football 27
        </button>
      </section>
    );
  }

  if (state === "BUILD_IN_PROGRESS") {
    const currentStep = result.buildGuideSteps[currentStepIndex];
    const isSummary = progress?.viewMode === "summary";
    const completed = new Set(completedStepIds);
    const markStepDone = () => {
      const nextCompleted = completed.has(currentStep.id) ? [...completed] : [...completed, currentStep.id];
      const lastStep = currentStepIndex >= result.buildGuideSteps.length - 1;
      if (lastStep) {
        onCompleteBuildGuide({ totalStepCount: result.buildGuideSteps.length, currentStepIndex, completedStepIds: nextCompleted, viewMode: "step" });
        return;
      }
      onUpdateBuildGuide({
        totalStepCount: result.buildGuideSteps.length,
        currentStepIndex: currentStepIndex + 1,
        completedStepIds: nextCompleted,
        viewMode: "step"
      });
    };

    return (
      <section className="buddy-trial-demo-card buddy-trial-build-guide" aria-labelledby="owner-review-demo-build-guide">
        <div className="buddy-trial-build-header">
          <p className="buddy-trial-step-label">Step {currentStepIndex + 1} of {result.buildGuideSteps.length}</p>
          <h2 id="owner-review-demo-build-guide">Build This in College Football 27</h2>
          <span>{completedCount} complete</span>
        </div>

        {isSummary ? (
          <OwnerReviewDemoBuildSummary result={result} completedStepIds={completedStepIds} />
        ) : (
          <article className="buddy-trial-build-step">
            <p className="buddy-trial-step-category">{currentStep.category}</p>
            <h3>{currentStep.title}</h3>
            <nav aria-label="Game menu path" className="buddy-trial-menu-path">
              {currentStep.menuPath.map((part) => (
                <span key={part}>{part}</span>
              ))}
            </nav>
            <div className="buddy-trial-build-controls">
              {currentStep.controls.map((control) => (
                <div key={`${currentStep.id}-${control.label}`}>
                  <span>{control.label}</span>
                  <strong>{control.value}</strong>
                  <small>{formatControlKind(control.controlKind)}</small>
                </div>
              ))}
            </div>
            <p className="buddy-trial-build-rationale">{currentStep.rationale}</p>
          </article>
        )}

        <div className="buddy-trial-build-nav">
          <button
            className="buddy-trial-secondary"
            type="button"
            onClick={() => onUpdateBuildGuide({ totalStepCount: result.buildGuideSteps.length, currentStepIndex: Math.max(0, currentStepIndex - 1), viewMode: "step" })}
            disabled={currentStepIndex === 0}
          >
            Back
          </button>
          <button
            className="buddy-trial-secondary"
            type="button"
            onClick={() => onUpdateBuildGuide({ totalStepCount: result.buildGuideSteps.length, viewMode: isSummary ? "step" : "summary" })}
          >
            {isSummary ? "Show Current Step" : "View All Settings"}
          </button>
          <button className="buddy-trial-primary" type="button" onClick={markStepDone}>
            {currentStepIndex >= result.buildGuideSteps.length - 1 ? "Done" : completed.has(currentStep.id) ? "Next" : "Done"}
          </button>
        </div>
      </section>
    );
  }

  if (state === "VIDEO_1_REQUIRED") {
    return (
      <section className="buddy-trial-demo-card buddy-trial-video-review" aria-labelledby="owner-review-demo-photo-feedback">
        <p className="buddy-trial-step-label">Build guide complete</p>
        <h2 id="owner-review-demo-photo-feedback">I built it in College Football 27</h2>
        <BuddyTrialResultPhotoFeedbackPanel
          session={session}
          result={result}
          photoPreviewUrls={photoPreviewUrls}
          onPreviewUrl={(viewID, url) => {
            setPhotoPreviewUrls((current) => {
              const previous = current[viewID];
              if (previous) URL.revokeObjectURL(previous);
              return { ...current, [viewID]: url };
            });
          }}
          onDeletePreviewUrl={(viewID) => {
            setPhotoPreviewUrls((current) => {
              const previous = current[viewID];
              if (previous) URL.revokeObjectURL(previous);
              const next = { ...current };
              delete next[viewID];
              return next;
            });
          }}
          onSave={onSaveResultPhotoFeedback}
          onSubmit={onCompletePhotoFeedback}
          onDeleteTrialData={onDeleteTrialData}
        />
      </section>
    );
  }

  if (state === "VIDEO_1_PROCESSING") {
    return (
      <section className="buddy-trial-demo-card buddy-trial-video-review" aria-labelledby="owner-review-demo-processing">
        <p className="buddy-trial-step-label">Video #1 processed</p>
        <h2 id="owner-review-demo-processing">GameFace found these views</h2>
        <p>{session?.videoOneReview?.processingSummary ?? videoReviewState.review?.processingSummary ?? "Video #1 is ready for comparison."}</p>
        <CharacterVideoStandardizedViews review={videoReviewState.review ?? session?.videoOneReview ?? null} />
        <p>This score compares the build with the face scan using available game controls. It is not an identity score.</p>
        <div className="buddy-trial-build-nav">
          <button
            className="buddy-trial-secondary"
            type="button"
            onClick={() => {
              retryCharacterVideo();
              onRestartVideoOne();
            }}
          >
            Retry Video #1
          </button>
          <button className="buddy-trial-primary" type="button" onClick={onDeliverRefinement}>
            See GameFace Review
          </button>
        </div>
      </section>
    );
  }

  if (state === "REFINEMENT_READY") {
    return (
      <section className="buddy-trial-demo-card buddy-trial-refinement-review" aria-labelledby="owner-review-demo-refinement">
        <p className="buddy-trial-step-label">Video #1 comparison</p>
        <h2 id="owner-review-demo-refinement">GAMEFACE REVIEW</h2>
        <OwnerReviewDemoBuildReview review={result.refinementPlan.buildReview} />
        <button className="buddy-trial-primary" type="button" onClick={onStartRefinementGuide} disabled={result.refinementPlan.refinementBuildGuideSteps.length === 0}>
          Update My Player
        </button>
      </section>
    );
  }

  if (state === "VIDEO_2_REQUIRED") {
    const refinementComplete =
      result.refinementPlan.refinementBuildGuideSteps.length === 0 ||
      result.refinementPlan.refinementBuildGuideSteps.every((step) => refinementProgress.completedStepIds.includes(step.id));
    if (refinementComplete) {
      return (
        <section className="buddy-trial-demo-card buddy-trial-video-review" aria-labelledby="owner-review-demo-video-two">
          <p className="buddy-trial-step-label">Refinement applied</p>
          <h2 id="owner-review-demo-video-two">SHOW US THE UPDATED PLAYER</h2>
          <ol className="buddy-trial-demo-list">
            <li>Open the updated player after applying the recommended changes.</li>
            <li>Keep helmet/accessories off the face.</li>
            <li>Start facing forward.</li>
            <li>Slowly rotate left.</li>
            <li>Return to center.</li>
            <li>Slowly rotate right.</li>
            <li>Return to center.</li>
          </ol>
          <CharacterVideoReviewPanel
            state={videoTwoReviewState}
            selectedFrameIDs={selectedVideoTwoFrameIDs}
            onSelectFrame={(viewID, frameID) => setSelectedVideoTwoFrameIDs((current) => ({ ...current, [viewID]: frameID }))}
            onUpload={(file) => void processCharacterVideoFile(file, "upload", 2)}
            onRecord={() => {
              activeVideoIterationRef.current = 2;
              void startCharacterRecording();
            }}
            onStopRecording={stopCurrentCharacterRecording}
            onConfirmFrames={confirmSelectedVideoTwoFrames}
            onRetry={retryVideoTwo}
            onContinue={() => {
              if ((session?.videoTwoReview ?? videoTwoReviewState.review)?.status === "usable") {
                onSaveVideoTwoReview((videoTwoReviewState.review ?? session?.videoTwoReview) as CharacterVideoReviewResult);
              }
            }}
            continueLabel="Compare before and after"
          />
        </section>
      );
    }
    return (
      <OwnerReviewDemoRefinementGuide
        steps={result.refinementPlan.refinementBuildGuideSteps}
        progress={refinementProgress}
        onUpdate={onUpdateRefinementGuide}
        onComplete={onCompleteRefinementGuide}
      />
    );
  }

  if (state === "FINAL_RESULT_READY") {
    return (
      <section className="buddy-trial-demo-card buddy-trial-final-result" aria-labelledby="owner-review-demo-final">
        <p className="buddy-trial-step-label">Video #2 comparison</p>
        <h2 id="owner-review-demo-final">YOUR GAMEFACE RESULT</h2>
        <OwnerReviewDemoBeforeAfterResultView result={result.beforeAfterResult} />
        <section className="buddy-trial-feedback-card" aria-labelledby="buddy-trial-feedback-title">
          <h3 id="buddy-trial-feedback-title">Tell us what you see</h3>
          <fieldset>
            <legend>Which looks more like you?</legend>
            {[
              ["original", "Original"],
              ["refined", "Refined"],
              ["about_the_same", "About the same"]
            ].map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="gameface-version-preference"
                  value={value}
                  checked={finalPreference === value}
                  onChange={() => setFinalPreference(value as BuddyTrialVersionPreference)}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <label className="buddy-trial-rating-control">
            <span>How much does the final player look like you?</span>
            <select value={resemblanceRating} onChange={(event) => setResemblanceRating(Number(event.currentTarget.value))}>
              <option value={0}>Choose 1-10</option>
              {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
          </label>
          <label className="buddy-trial-feedback-text">
            <span>What still looks off?</span>
            <textarea value={stillLooksOff} onChange={(event) => setStillLooksOff(event.currentTarget.value)} placeholder="Optional" rows={3} />
          </label>
          <label className="buddy-trial-learning-consent">
              <input type="checkbox" checked={productImprovementOptIn} onChange={(event) => setProductImprovementOptIn(event.currentTarget.checked)} />
              <span>
                Use my scores, settings, and written feedback to improve GameFace Match. Raw face media is not saved by default.
              </span>
            </label>
          </section>
        <p className="buddy-trial-demo-note">Owner Review Demo stays separate from real beta results.</p>
        <button className="buddy-trial-primary" type="button" onClick={() => onComplete(createSubmittedOutcome())} disabled={!finalPreference || resemblanceRating < 1}>
          GameFace complete
        </button>
      </section>
    );
  }

  return (
    <section className="buddy-trial-demo-card" aria-labelledby="owner-review-demo-complete">
      <h2 id="owner-review-demo-complete">Owner Review Demo complete</h2>
      <p>Test settings stayed separate from real customer results and live game recommendations.</p>
    </section>
  );
}

function OwnerReviewDemoTopThree({ result }: { result: OwnerReviewDemoRecommendationResult }) {
  return (
    <ol className="buddy-trial-demo-top-three" aria-label="Top three GameFace choices">
      {result.matches.map((match) => (
        <li key={match.id}>
          <strong>
            #{match.rank} {match.catalogItem.visibleGameLabelOrIndex}
          </strong>
          <span>
            {match.score}/100 · {match.confidence.label} confidence · test settings
          </span>
        </li>
      ))}
    </ol>
  );
}

function OwnerReviewDemoBuildSummary({ result, completedStepIds }: { result: OwnerReviewDemoRecommendationResult; completedStepIds: string[] }) {
  return <OwnerReviewDemoStepSummary steps={result.buildGuideSteps} completedStepIds={completedStepIds} ariaLabel="All build settings" />;
}

function OwnerReviewDemoStepSummary({
  steps,
  completedStepIds,
  ariaLabel
}: {
  steps: OwnerReviewDemoBuildStep[];
  completedStepIds: string[];
  ariaLabel: string;
}) {
  const completed = new Set(completedStepIds);
  return (
    <div className="buddy-trial-build-summary" aria-label={ariaLabel}>
      {steps.map((step, index) => (
        <article key={step.id}>
          <span>
            Step {index + 1} · {completed.has(step.id) ? "Done" : "Not done"}
          </span>
          <strong>{step.title}</strong>
          <small>{step.menuPath.join(" > ")}</small>
          <ul>
            {step.controls.map((control) => (
              <li key={`${step.id}-${control.label}`}>
                {control.label}: {control.value}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

function BuddyTrialResultPhotoFeedbackPanel({
  session,
  result,
  photoPreviewUrls,
  onPreviewUrl,
  onDeletePreviewUrl,
  onSave,
  onSubmit,
  onDeleteTrialData
}: {
  session: BuddyTrialSession | null;
  result: OwnerReviewDemoRecommendationResult;
  photoPreviewUrls: Partial<Record<BuddyTrialResultPhotoViewID, string>>;
  onPreviewUrl: (viewID: BuddyTrialResultPhotoViewID, url: string) => void;
  onDeletePreviewUrl: (viewID: BuddyTrialResultPhotoViewID) => void;
  onSave: (feedback: BuddyTrialResultPhotoFeedback) => void;
  onSubmit: (feedback: BuddyTrialResultPhotoFeedback) => void;
  onDeleteTrialData: () => void;
}) {
  const initialFeedback = useMemo(() => {
    if (!session) return null;
    return session.resultPhotoFeedback ?? createInitialResultPhotoFeedbackForSession(session, result);
  }, [session, result]);
  const [photoFeedback, setPhotoFeedback] = useState<BuddyTrialResultPhotoFeedback | null>(initialFeedback);
  const [feedbackForm, setFeedbackForm] = useState<BuddyTrialResultFeedback>(() => initialFeedback?.feedback ?? createBlankPhotoFeedback());
  const [fileErrors, setFileErrors] = useState<Partial<Record<BuddyTrialResultPhotoViewID, string>>>({});
  const [processingView, setProcessingView] = useState<BuddyTrialResultPhotoViewID | null>(null);
  const validation = photoFeedback ? validateBuddyTrialResultPhotoFeedback({ ...photoFeedback, feedback: feedbackForm }) : { ok: false, errors: ["Trial session is not ready."] };
  const activePhotos = photoFeedback?.photos.filter((photo) => photo.uploadStatus !== "deleted") ?? [];
  const frontPhotoReady = activePhotos.some((photo) => photo.viewID === "front" && photo.validationStatus === "usable");

  useEffect(() => {
    if (initialFeedback) {
      setPhotoFeedback(initialFeedback);
      setFeedbackForm(initialFeedback.feedback);
    }
  }, [initialFeedback]);

  async function handlePhotoFile(viewID: BuddyTrialResultPhotoViewID, file: File) {
    if (!session || !photoFeedback) return;
    setProcessingView(viewID);
    setFileErrors((current) => ({ ...current, [viewID]: "" }));
    const preliminaryErrors = validateResultPhotoFile(file);
    if (preliminaryErrors.length) {
      setFileErrors((current) => ({ ...current, [viewID]: preliminaryErrors.join(" ") }));
      setProcessingView(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const dimensions = await readImageDimensions(objectUrl);
      const sha256 = await sha256Hex(await file.arrayBuffer());
      const record = createBuddyTrialResultPhotoRecord({
        trialID: photoFeedback.trialID,
        inviteID: session.inviteId,
        viewID,
        originalFilename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        width: dimensions.width,
        height: dimensions.height,
        sha256,
        uploadedAt: new Date().toISOString()
      });
      if (record.validationStatus === "blocked") {
        URL.revokeObjectURL(objectUrl);
        setFileErrors((current) => ({ ...current, [viewID]: record.validationErrors.join(" ") }));
        setProcessingView(null);
        return;
      }
      onPreviewUrl(viewID, objectUrl);
      const next = upsertBuddyTrialResultPhoto(photoFeedback, record);
      setPhotoFeedback(next);
      onSave(next);
    } catch {
      URL.revokeObjectURL(objectUrl);
      setFileErrors((current) => ({ ...current, [viewID]: "This image could not be decoded. Try a JPEG, PNG, or WebP screenshot/photo." }));
    } finally {
      setProcessingView(null);
    }
  }

  function deletePhoto(viewID: BuddyTrialResultPhotoViewID) {
    if (!photoFeedback) return;
    onDeletePreviewUrl(viewID);
    const next = removeBuddyTrialResultPhoto(photoFeedback, viewID);
    setPhotoFeedback(next);
    onSave(next);
  }

  function updateFeedback(patch: Partial<BuddyTrialResultFeedback>) {
    const next = { ...feedbackForm, ...patch };
    setFeedbackForm(next);
    if (photoFeedback) {
      const draft = { ...photoFeedback, feedback: next };
      setPhotoFeedback(draft);
      onSave(draft);
    }
  }

  function submitFeedback() {
    if (!photoFeedback) return;
    const submitted = submitBuddyTrialResultFeedback({ ...photoFeedback, feedback: feedbackForm }, feedbackForm);
    setPhotoFeedback(submitted);
    onSubmit(submitted);
  }

  if (!session || !photoFeedback) {
    return <p className="buddy-trial-video-error">This trial session is not ready for photo feedback. Refresh the private link and try again.</p>;
  }

  return (
    <div className="buddy-trial-photo-feedback-panel">
      <p>Take a photo of the player you built on your TV/monitor, or upload a direct game screenshot. Use the appearance screen if you can.</p>
      <ol className="buddy-trial-demo-list">
        <li>No helmet or face-covering accessories.</li>
        <li>Keep the created player&apos;s face visible and centered.</li>
        <li>Avoid severe glare or blur.</li>
        <li>Front view is required. Left and right three-quarter views are optional.</li>
      </ol>

      <div className="buddy-trial-photo-slot-grid">
        {(["front", "leftThreeQuarter", "rightThreeQuarter"] as BuddyTrialResultPhotoViewID[]).map((viewID) => {
          const photo = activePhotos.find((item) => item.viewID === viewID) ?? null;
          const preview = photoPreviewUrls[viewID] ?? null;
          const required = viewID === "front";
          return (
            <article key={viewID} className="buddy-trial-photo-slot">
              <div>
                <span>{required ? "Required" : "Optional"}</span>
                <strong>{getBuddyTrialResultPhotoViewLabel(viewID)}</strong>
              </div>
              {preview ? <img src={preview} alt={`${getBuddyTrialResultPhotoViewLabel(viewID)} result preview`} /> : <div className="buddy-trial-photo-placeholder">No image selected</div>}
              {photo ? (
                <small>
                  {photo.originalFilename} · {photo.width}x{photo.height} · private beta storage path ready
                </small>
              ) : null}
              {fileErrors[viewID] ? <p className="buddy-trial-video-error">{fileErrors[viewID]}</p> : null}
              <label className="buddy-trial-file-button">
                <span>{processingView === viewID ? "Checking image..." : photo ? "Replace image" : "Upload image"}</span>
                <input
                  type="file"
                  accept={BUDDY_TRIAL_RESULT_PHOTO_ACCEPTED_MIME_TYPES.join(",")}
                  disabled={processingView !== null}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) void handlePhotoFile(viewID, file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {photo ? (
                <button className="buddy-trial-secondary buddy-trial-small-button" type="button" onClick={() => deletePhoto(viewID)}>
                  Delete photo
                </button>
              ) : null}
            </article>
          );
        })}
      </div>

      <section className="buddy-trial-feedback-card" aria-labelledby="buddy-trial-photo-feedback-title">
        <h3 id="buddy-trial-photo-feedback-title">Quick feedback</h3>
        <label className="buddy-trial-rating-control">
          <span>Which recommendation did you build?</span>
          <select value={feedbackForm.selectedRecommendationRank ?? ""} onChange={(event) => updateFeedback({ selectedRecommendationRank: Number(event.currentTarget.value) as 1 | 2 | 3 })}>
            <option value="">Choose one</option>
            {result.matches.slice(0, 3).map((match) => (
              <option key={match.id} value={match.rank}>
                #{match.rank} {match.catalogItem.visibleGameLabelOrIndex}
              </option>
            ))}
          </select>
        </label>
        <label className="buddy-trial-rating-control">
          <span>How much does this look like you?</span>
          <select value={feedbackForm.resemblanceRating ?? ""} onChange={(event) => updateFeedback({ resemblanceRating: Number(event.currentTarget.value) as 1 | 2 | 3 | 4 | 5 })}>
            <option value="">Choose 1-5</option>
            {[1, 2, 3, 4, 5].map((rating) => (
              <option key={rating} value={rating}>
                {rating}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Was one of the other top-three options better?</legend>
          {[
            ["no", "No"],
            ["yes", "Yes"],
            ["not_sure", "Not sure"]
          ].map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name="buddy-trial-other-option-better"
                value={value}
                checked={feedbackForm.otherTopThreeBetter === value}
                onChange={() => updateFeedback({ otherTopThreeBetter: value as BuddyTrialOtherRecommendationAnswer })}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <label className="buddy-trial-feedback-text">
          <span>What looks most wrong?</span>
          <textarea
            value={feedbackForm.mostWrong ?? ""}
            onChange={(event) => updateFeedback({ mostWrong: event.currentTarget.value })}
            placeholder="Example: jaw too wide, hair too short, nose looks off, or nothing obvious"
            rows={3}
          />
        </label>
        <fieldset>
          <legend>Did you change any recommended setting manually?</legend>
          {[
            ["no", "No"],
            ["yes", "Yes"]
          ].map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name="buddy-trial-manual-setting-change"
                value={value}
                checked={feedbackForm.changedSettingsManually === (value === "yes")}
                onChange={() => updateFeedback({ changedSettingsManually: value === "yes" })}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        {feedbackForm.changedSettingsManually ? (
          <label className="buddy-trial-feedback-text">
            <span>What did you change?</span>
            <textarea
              value={feedbackForm.manualSettingChangeSummary ?? ""}
              onChange={(event) => updateFeedback({ manualSettingChangeSummary: event.currentTarget.value })}
              placeholder="Example: changed hair color from dark brown to black"
              rows={2}
            />
          </label>
        ) : null}
        <label className="buddy-trial-feedback-text">
          <span>Optional notes</span>
          <textarea value={feedbackForm.notes ?? ""} onChange={(event) => updateFeedback({ notes: event.currentTarget.value })} placeholder="Anything else Wyatt should know?" rows={3} />
        </label>
        <label className="buddy-trial-learning-consent">
          <input
            type="checkbox"
            checked={feedbackForm.productImprovementOptIn}
            onChange={(event) =>
              updateFeedback({
                productImprovementOptIn: event.currentTarget.checked,
                productImprovementConsentVersion: event.currentTarget.checked ? session.consent.consentVersion : null
              })
            }
          />
          <span>Use my rating, settings, player photos, and written feedback to improve GameFace Match. Raw face scan media is not saved by default.</span>
        </label>
      </section>

      <div className="buddy-trial-photo-storage-note">
        <strong>{frontPhotoReady ? "Front image ready" : "Front image required"}</strong>
        <span>Images are bound to this beta session and prepared for the private beta game-result bucket. They are not production catalog evidence.</span>
      </div>
      {validation.errors.length ? (
        <div className="buddy-trial-video-retake" role="status">
          <strong>Before you submit</strong>
          <ul>
            {validation.errors.slice(0, 5).map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="buddy-trial-build-nav">
        <button className="buddy-trial-secondary" type="button" onClick={onDeleteTrialData}>
          Delete beta data
        </button>
        <button className="buddy-trial-primary" type="button" onClick={submitFeedback} disabled={!validation.ok || processingView !== null}>
          Submit feedback
        </button>
      </div>
    </div>
  );
}

function createInitialResultPhotoFeedbackForSession(session: BuddyTrialSession | null, result: OwnerReviewDemoRecommendationResult) {
  if (!session) return null;
  const persistence = createPrivateBetaTrialPersistenceRecord({ session });
  const bestMatch = result.matches[0];
  return createEmptyBuddyTrialResultPhotoFeedback({
    trialID: persistence.trialID,
    inviteID: session.inviteId,
    sessionID: session.sessionId,
    source: result.mode === "OWNER_REVIEW_DEMO" ? "owner_review_demo" : "beta_research",
    recommendationBinding: {
      recommendationVersion: OWNER_REVIEW_DEMO_MATCHING_CONFIG_VERSION,
      catalogVersionID: result.catalog.catalogVersion.identifier,
      evidenceVersionID: result.catalog.packageChecksum ?? null,
      selectedRecommendationRank: bestMatch.rank as 1 | 2 | 3,
      selectedRecommendationLabel: bestMatch.catalogItem.visibleGameLabelOrIndex
    }
  });
}

function createBlankPhotoFeedback(): BuddyTrialResultFeedback {
  return {
    selectedRecommendationRank: 1,
    resemblanceRating: null,
    otherTopThreeBetter: null,
    mostWrong: null,
    notes: null,
    changedSettingsManually: null,
    manualSettingChangeSummary: null,
    productImprovementOptIn: false,
    productImprovementConsentVersion: null,
    submittedAt: null
  };
}

function validateResultPhotoFile(file: File) {
  const errors: string[] = [];
  if (!BUDDY_TRIAL_RESULT_PHOTO_ACCEPTED_MIME_TYPES.includes(file.type as (typeof BUDDY_TRIAL_RESULT_PHOTO_ACCEPTED_MIME_TYPES)[number])) {
    errors.push("Use a JPEG, PNG, or WebP image.");
  }
  if (file.size <= 0) errors.push("The image file is empty or unreadable.");
  if (file.size > 25 * 1024 * 1024) errors.push("Use an image smaller than 25 MB.");
  return errors;
}

async function readImageDimensions(objectUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Image could not be decoded."));
    image.src = objectUrl;
  });
}

async function sha256Hex(buffer: ArrayBuffer) {
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  let hash = 0;
  for (const byte of new Uint8Array(buffer)) {
    hash = (hash * 31 + byte) >>> 0;
  }
  return hash.toString(16).padStart(64, "0").slice(-64);
}

interface CharacterVideoReviewUiState {
  status: "idle" | "recording" | "processing" | "manual_selection_required" | "usable" | "blocked";
  progressLabel: string;
  objectUrl: string | null;
  fileName: string | null;
  review: CharacterVideoReviewResult | null;
  candidateFrames: CharacterVideoFrameCandidate[];
  error: string | null;
}

function CharacterVideoReviewPanel({
  state,
  selectedFrameIDs,
  onSelectFrame,
  onUpload,
  onRecord,
  onStopRecording,
  onConfirmFrames,
  onRetry,
  onContinue,
  continueLabel
}: {
  state: CharacterVideoReviewUiState;
  selectedFrameIDs: Partial<Record<CharacterVideoViewID, string>>;
  onSelectFrame: (viewID: CharacterVideoViewID, frameID: string) => void;
  onUpload: (file: File) => void;
  onRecord: () => void;
  onStopRecording: () => void;
  onConfirmFrames: () => void;
  onRetry: () => void;
  onContinue: () => void;
  continueLabel: string;
}) {
  const isBusy = state.status === "processing" || state.status === "recording";
  const canConfirm = ["front", "leftThreeQuarter", "rightThreeQuarter"].every((viewID) => selectedFrameIDs[viewID as CharacterVideoViewID]);
  return (
    <div className="buddy-trial-video-panel" aria-live="polite">
      <p>
        Record the player on your TV or upload a console clip. Keep the face clear. MP4, MOV, M4V, or WebM, 4-45 seconds, up to 250 MB.
      </p>
      <div className="buddy-trial-video-actions">
        {state.status === "recording" ? (
          <button className="buddy-trial-primary" type="button" onClick={onStopRecording}>
            Stop Recording
          </button>
        ) : (
          <button className="buddy-trial-secondary" type="button" onClick={onRecord} disabled={isBusy}>
            Record Video
          </button>
        )}
        <label className="buddy-trial-file-button">
          <span>Upload Existing Video</span>
          <input
            type="file"
            accept={CHARACTER_VIDEO_ACCEPTED_MIME_TYPES.join(",")}
            disabled={isBusy}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) onUpload(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      {state.progressLabel ? <p className="buddy-trial-video-progress">{state.progressLabel}</p> : null}
      {state.error ? <p className="buddy-trial-video-error">{state.error}</p> : null}
      {state.review?.validation.errors.length ? (
        <div className="buddy-trial-video-retake">
          <strong>Retake this video</strong>
          <ul>
            {state.review.validation.retakeInstructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {state.status === "manual_selection_required" && state.review ? (
        <div className="buddy-trial-video-picker">
          <h3>Select the best frames</h3>
          <p>Pick the clearest front, left, and right frames before GameFace compares the build.</p>
          {(["front", "leftThreeQuarter", "rightThreeQuarter", "leftProfile", "rightProfile"] as CharacterVideoViewID[]).map((viewID) => {
            const frames = state.candidateFrames.filter((frame) => frame.expectedView === viewID);
            if (frames.length === 0) return null;
            return (
              <fieldset key={viewID}>
                <legend>{formatCharacterView(viewID)}</legend>
                <div className="buddy-trial-frame-options">
                  {frames.map((frame) => (
                    <label key={frame.frameID}>
                      <input
                        type="radio"
                        name={`character-video-${viewID}`}
                        checked={selectedFrameIDs[viewID] === frame.frameID}
                        onChange={() => onSelectFrame(viewID, frame.frameID)}
                      />
                      {frame.thumbnailUrl ? <img src={frame.thumbnailUrl} alt={`${formatCharacterView(viewID)} candidate at ${frame.timestampSeconds}s`} /> : null}
                      <span>{frame.timestampSeconds.toFixed(1)}s</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}
          <div className="buddy-trial-build-nav">
            <button className="buddy-trial-secondary" type="button" onClick={onRetry}>
              Retry
            </button>
            <button className="buddy-trial-primary" type="button" onClick={onConfirmFrames} disabled={!canConfirm}>
              Confirm selected frames
            </button>
          </div>
        </div>
      ) : null}

      {state.status === "usable" && state.review ? (
        <>
          <CharacterVideoStandardizedViews review={state.review} />
          <button className="buddy-trial-primary" type="button" onClick={onContinue}>
            {continueLabel}
          </button>
        </>
      ) : null}

      {state.status === "blocked" ? (
        <button className="buddy-trial-secondary" type="button" onClick={onRetry}>
          Try another video
        </button>
      ) : null}
    </div>
  );
}

function CharacterVideoStandardizedViews({ review }: { review: CharacterVideoReviewResult | BuddyTrialSession["videoOneReview"] | null }) {
  if (!review || review.standardizedViews.length === 0) {
    return <p>No player views are ready yet.</p>;
  }
  return (
    <div className="buddy-trial-standardized-views" aria-label="Player views selected for comparison">
      {review.standardizedViews.map((view) => (
        <article key={view.viewID}>
          <span>{formatCharacterView(view.viewID)}</span>
          <strong>{view.timestampSeconds.toFixed(1)}s</strong>
          <small>{view.qualityStatus.replaceAll("_", " ")}</small>
          {view.issues.length ? (
            <ul>
              {view.issues.slice(0, 2).map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function OwnerReviewDemoBuildReview({ review }: { review: OwnerReviewDemoBuildMatchReview }) {
  return (
    <div className="buddy-trial-build-review">
      <div className="buddy-trial-score-panel" aria-label="Initial Build Match">
        <span>Initial Build Match</span>
        <strong>{review.buildMatchScore} / 100</strong>
        <p>{review.scoreLanguage}</p>
      </div>
      <div className="buddy-trial-review-columns">
        <section aria-labelledby="buddy-trial-looks-strong">
          <h3 id="buddy-trial-looks-strong">LOOKS STRONG</h3>
          <ul>
            {review.strengths.map((strength) => (
              <li key={strength}>{strength}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="buddy-trial-could-be-closer">
          <h3 id="buddy-trial-could-be-closer">COULD BE CLOSER</h3>
          {review.weaknesses.length ? (
            <ul>
              {review.weaknesses.map((weakness) => (
                <li key={weakness}>{weakness}</li>
              ))}
            </ul>
          ) : (
            <p>{review.noChangeReason ?? "No supported changes are recommended from this review."}</p>
          )}
        </section>
      </div>
      <section className="buddy-trial-adjustments" aria-labelledby="buddy-trial-try-changes">
        <h3 id="buddy-trial-try-changes">TRY THESE CHANGES</h3>
        {review.adjustments.length ? (
          <div className="buddy-trial-adjustment-list">
            {review.adjustments.map((adjustment) => (
              <article key={adjustment.id}>
                <span>{adjustment.label}</span>
                <strong>
                  {adjustment.currentValue} {"->"} {adjustment.recommendedValue}
                </strong>
                <p>{adjustment.reason}</p>
                <small>{adjustment.expectedEffect}</small>
              </article>
            ))}
          </div>
        ) : (
          <p>{review.noChangeReason ?? review.uncertaintyReasons[0] ?? "No clear change is available from this video."}</p>
        )}
        {review.alternativeHeadRecommendation ? (
          <article className="buddy-trial-alternative-head">
            <span>Alternative head / preset</span>
            <strong>{review.alternativeHeadRecommendation.label}</strong>
            <p>{review.alternativeHeadRecommendation.reason}</p>
          </article>
        ) : null}
      </section>
      {review.uncertaintyReasons.length ? (
        <section className="buddy-trial-video-retake" aria-label="Uncertain comparison">
          <strong>Needs a clearer video</strong>
          <ul>
            {review.uncertaintyReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function OwnerReviewDemoBeforeAfterResultView({ result }: { result: OwnerReviewDemoBeforeAfterResult }) {
  const deltaLabel = result.scoreDelta > 0 ? `+${result.scoreDelta}` : `${result.scoreDelta}`;
  const trendLabel = result.trend === "improvement" ? "Improvement" : result.trend === "regression" ? "Regression" : "No change";
  return (
    <div className="buddy-trial-before-after">
      <div className="buddy-trial-score-row" aria-label="Before and after build scores">
        <article>
          <span>Initial Build</span>
          <strong>{result.initialBuildScore} / 100</strong>
        </article>
        <article>
          <span>Refined Build</span>
          <strong>{result.refinedBuildScore} / 100</strong>
        </article>
        <article data-trend={result.trend}>
          <span>{trendLabel}</span>
          <strong>{deltaLabel}</strong>
        </article>
      </div>
      <p className="buddy-trial-score-language">{result.scoreLanguage}</p>
      <div className="buddy-trial-review-columns">
        <section aria-labelledby="buddy-trial-improved">
          <h3 id="buddy-trial-improved">IMPROVED</h3>
          {result.improved.length ? (
            <ul>
              {result.improved.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No measurable improvement was detected.</p>
          )}
        </section>
        <section aria-labelledby="buddy-trial-still-different">
          <h3 id="buddy-trial-still-different">STILL DIFFERENT</h3>
          {result.stillDifferent.length ? (
            <ul>
              {result.stillDifferent.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No major remaining difference was detected by the demo comparison.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function OwnerReviewDemoCompletionSummary({ outcome }: { outcome: BuddyTrialFinalOutcome }) {
  const deltaLabel = outcome.scoreDelta > 0 ? `+${outcome.scoreDelta}` : `${outcome.scoreDelta}`;
  return (
    <div className="buddy-trial-completion-summary">
      <div className="buddy-trial-score-row" aria-label="Completed Buddy Trial scores">
        <article>
          <span>Initial Build</span>
          <strong>{outcome.beforeScore} / 100</strong>
        </article>
        <article>
          <span>Final Build</span>
          <strong>{outcome.afterScore} / 100</strong>
        </article>
        <article data-trend={outcome.trend}>
          <span>{outcome.trend === "improvement" ? "Improvement" : outcome.trend === "regression" ? "Regression" : "No change"}</span>
          <strong>{deltaLabel}</strong>
        </article>
      </div>
      <section className="buddy-trial-completion-card" aria-labelledby="buddy-trial-final-settings">
        <h2 id="buddy-trial-final-settings">Final settings</h2>
        <div className="buddy-trial-demo-settings">
          {outcome.finalSettingsSummary.slice(0, 12).map((setting) => (
            <article key={`${setting.label}-${setting.value}`}>
              <span>{setting.label}</span>
              <strong>{setting.value}</strong>
              <small>{setting.menuPath.join(" > ")}</small>
            </article>
          ))}
        </div>
      </section>
      <section className="buddy-trial-completion-card" aria-labelledby="buddy-trial-user-rating">
        <h2 id="buddy-trial-user-rating">Your feedback</h2>
        <p>Version preference: {formatVersionPreference(outcome.userPreference)}</p>
        <p>Resemblance rating: {outcome.resemblanceRating ?? "Not provided"} / 10</p>
        <p>Shared for improvements: {outcome.productImprovementOptIn ? "Yes" : "No"}</p>
        {outcome.stillLooksOff ? <p>Still looks off: {outcome.stillLooksOff}</p> : null}
      </section>
    </div>
  );
}

function BuddyTrialResultPhotoCompletionSummary({ feedback }: { feedback: BuddyTrialResultPhotoFeedback }) {
  const activePhotos = feedback.photos.filter((photo) => photo.uploadStatus !== "deleted");
  return (
    <div className="buddy-trial-completion-summary">
      <section className="buddy-trial-completion-card" aria-labelledby="buddy-trial-photo-feedback-summary">
        <h2 id="buddy-trial-photo-feedback-summary">Photo feedback</h2>
        <p>Recommendation built: #{feedback.feedback.selectedRecommendationRank ?? "Not provided"}</p>
        <p>Resemblance rating: {feedback.feedback.resemblanceRating ?? "Not provided"} / 5</p>
        <p>Changed settings manually: {feedback.feedback.changedSettingsManually ? "Yes" : "No"}</p>
        <p>Photos submitted: {activePhotos.length}</p>
        <div className="buddy-trial-demo-settings">
          {activePhotos.map((photo) => (
            <article key={photo.photoID}>
              <span>{photo.label}</span>
              <strong>{photo.originalFilename}</strong>
              <small>
                {photo.width}x{photo.height} · {photo.storageBucket}
              </small>
            </article>
          ))}
        </div>
      </section>
      <section className="buddy-trial-completion-card" aria-labelledby="buddy-trial-photo-feedback-notes">
        <h2 id="buddy-trial-photo-feedback-notes">What you told us</h2>
        <p>Other top-three better: {formatOtherRecommendationAnswer(feedback.feedback.otherTopThreeBetter)}</p>
        <p>Looks most wrong: {feedback.feedback.mostWrong ?? "Not provided"}</p>
        {feedback.feedback.manualSettingChangeSummary ? <p>Manual changes: {feedback.feedback.manualSettingChangeSummary}</p> : null}
        {feedback.feedback.notes ? <p>Notes: {feedback.feedback.notes}</p> : null}
        <p>Shared for improvements: {feedback.feedback.productImprovementOptIn ? "Yes" : "No"}</p>
      </section>
      <section className="buddy-trial-completion-card" aria-labelledby="buddy-trial-photo-feedback-research">
        <h2 id="buddy-trial-photo-feedback-research">Research status</h2>
        <p>These photos and ratings are private beta research signals. They are not production catalog evidence and do not publish recommendations.</p>
        {feedback.refinementSignals.map((signal) => (
          <p key={`${signal.modelVersion}-${signal.createdAt}`}>{signal.summary}</p>
        ))}
      </section>
    </div>
  );
}

function OwnerReviewDemoRefinementGuide({
  steps,
  progress,
  onUpdate,
  onComplete
}: {
  steps: OwnerReviewDemoBuildStep[];
  progress: BuddyTrialBuildGuideProgress;
  onUpdate: (patch: Partial<Pick<BuddyTrialBuildGuideProgress, "totalStepCount" | "currentStepIndex" | "completedStepIds" | "viewMode">>) => void;
  onComplete: () => void;
}) {
  const currentStepIndex = Math.min(progress.currentStepIndex, Math.max(steps.length - 1, 0));
  const currentStep = steps[currentStepIndex];
  const completed = new Set(progress.completedStepIds);
  const isSummary = progress.viewMode === "summary";

  if (steps.length === 0) {
    return (
      <section className="buddy-trial-demo-card" aria-labelledby="owner-review-demo-no-refinement">
      <h2 id="owner-review-demo-no-refinement">No supported changes</h2>
      <p>This review did not find a clear change to walk through.</p>
        <button className="buddy-trial-primary" type="button" onClick={onComplete}>
          Continue
        </button>
      </section>
    );
  }

  const markStepDone = () => {
    const nextCompleted = Array.from(new Set([...progress.completedStepIds, currentStep.id]));
    if (currentStepIndex >= steps.length - 1) {
      onUpdate({
        totalStepCount: steps.length,
        currentStepIndex,
        completedStepIds: nextCompleted,
        viewMode: "step"
      });
      onComplete();
      return;
    }
    onUpdate({
      totalStepCount: steps.length,
      currentStepIndex: currentStepIndex + 1,
      completedStepIds: nextCompleted,
      viewMode: "step"
    });
  };

  return (
    <section className="buddy-trial-demo-card buddy-trial-build-guide" aria-labelledby="owner-review-demo-refinement-guide">
      <p className="buddy-trial-step-label">Update My Player</p>
      <h2 id="owner-review-demo-refinement-guide">Apply the recommended changes</h2>
      {isSummary ? (
        <OwnerReviewDemoStepSummary steps={steps} completedStepIds={progress.completedStepIds} ariaLabel="All build settings" />
      ) : (
        <article className="buddy-trial-build-step">
          <span>
            Step {currentStepIndex + 1} of {steps.length}
          </span>
          <h3>{currentStep.title}</h3>
          <p>{currentStep.menuPath.join(" > ")}</p>
          <ul>
            {currentStep.controls.map((control) => (
              <li key={`${currentStep.id}-${control.label}`}>
                <strong>{control.label}</strong>
                <span>{control.value}</span>
              </li>
            ))}
          </ul>
          <p>{currentStep.rationale}</p>
        </article>
      )}
      <div className="buddy-trial-build-progress" aria-label="Refinement guide progress">
        {progress.completedStepIds.length} of {steps.length} changes applied
      </div>
      <div className="buddy-trial-build-nav">
        <button
          className="buddy-trial-secondary"
          type="button"
          onClick={() => onUpdate({ totalStepCount: steps.length, currentStepIndex: Math.max(0, currentStepIndex - 1), viewMode: "step" })}
          disabled={isSummary || currentStepIndex === 0}
        >
          Back
        </button>
        <button
          className="buddy-trial-secondary"
          type="button"
          onClick={() => onUpdate({ totalStepCount: steps.length, viewMode: isSummary ? "step" : "summary" })}
        >
          {isSummary ? "Show Current Change" : "View All Changes"}
        </button>
        <button className="buddy-trial-primary" type="button" onClick={markStepDone}>
          {currentStepIndex >= steps.length - 1 ? "Done" : completed.has(currentStep.id) ? "Next" : "Done"}
        </button>
      </div>
    </section>
  );
}

function OwnerReviewDemoSettings({ result }: { result: OwnerReviewDemoRecommendationResult }) {
  return (
    <div className="buddy-trial-demo-settings" aria-label="Owner Review Demo settings">
      {result.primarySettings.map((setting) => (
        <article key={setting.id}>
          <span>{setting.category}</span>
          <strong>{setting.value}</strong>
          <small>
            {formatControlKind(setting.controlKind)} · {setting.menuPath.join(" > ")}
          </small>
        </article>
      ))}
    </div>
  );
}

function getInviteStatusTitle(status: "expired" | "used" | "invalid" | "active") {
  if (status === "expired") {
    return "This private link expired";
  }
  if (status === "used") {
    return "This private link is complete";
  }
  if (status === "invalid") {
    return "This private link is not valid";
  }
  return "Private link ready";
}

function formatVersionPreference(preference: BuddyTrialVersionPreference | null) {
  if (preference === "original") return "Original";
  if (preference === "refined") return "Refined";
  if (preference === "about_the_same") return "About the same";
  return "Not provided";
}

function formatOtherRecommendationAnswer(answer: BuddyTrialOtherRecommendationAnswer | null) {
  if (answer === "yes") return "Yes";
  if (answer === "no") return "No";
  if (answer === "not_sure") return "Not sure";
  return "Not provided";
}

function createInitialCharacterVideoReviewUiState(session: BuddyTrialSession | null, iteration: CharacterVideoReviewResult["iteration"] = 1): CharacterVideoReviewUiState {
  const storedReview = iteration === 1 ? session?.videoOneReview : session?.videoTwoReview;
  return {
    status: storedReview?.status === "usable" ? "usable" : "idle",
    progressLabel: storedReview?.processingSummary ?? "",
    objectUrl: null,
    fileName: storedReview?.metadata.fileName ?? null,
    review: storedReview ?? null,
    candidateFrames: [],
    error: null
  };
}

function revokeCharacterVideoUrls(state: CharacterVideoReviewUiState) {
  if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
  state.candidateFrames.forEach((frame) => {
    if (frame.thumbnailUrl) URL.revokeObjectURL(frame.thumbnailUrl);
  });
}

function stopCharacterRecording(stream: MediaStream | null, recorder: MediaRecorder | null) {
  if (recorder && recorder.state !== "inactive") recorder.stop();
  stream?.getTracks().forEach((track) => track.stop());
}

function readCharacterVideoMetadata(objectUrl: string, file: File, source: CharacterVideoSource): Promise<CharacterVideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      resolve({
        fileName: file.name,
        fileType: file.type,
        fileSizeBytes: file.size,
        durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        source
      });
      video.removeAttribute("src");
      video.load();
    };
    video.onerror = () => reject(new Error("The browser could not decode this video. Try a fresh MP4, MOV, M4V, or WebM file."));
    video.src = objectUrl;
  });
}

async function extractCharacterVideoFrameCandidates(
  objectUrl: string,
  metadata: CharacterVideoMetadata,
  iteration: CharacterVideoReviewResult["iteration"]
): Promise<CharacterVideoFrameCandidate[]> {
  const baseReview = createCharacterVideoReviewResult({ metadata, iteration });
  const candidates = baseReview.candidateFrames;
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = objectUrl;
  await waitForCharacterVideoMetadata(video);

  const width = video.videoWidth || metadata.width || 640;
  const height = video.videoHeight || metadata.height || 640;
  const scale = Math.min(1, 720 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas video processing is unavailable in this browser.");

  const extracted: CharacterVideoFrameCandidate[] = [];
  let previousSignature: number[] | null = null;
  for (const candidate of candidates) {
    await seekCharacterVideo(video, candidate.timestampSeconds);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const signature = createCharacterFrameSignature(imageData);
    const duplicateRisk = previousSignature && compareCharacterFrameSignatures(previousSignature, signature) > 0.98 ? "high" : "low";
    previousSignature = signature;
    extracted.push({
      ...candidate,
      quality: {
        ...candidate.quality,
        blur: estimateCharacterFrameSharpness(imageData) < 10 ? "high" : "unknown",
        frameSize: canvas.width >= 360 && canvas.height >= 360 ? "usable" : "small",
        duplicateRisk
      },
      thumbnailUrl: await characterCanvasToObjectUrl(canvas)
    });
  }
  video.pause();
  video.removeAttribute("src");
  video.load();
  return extracted;
}

function waitForCharacterVideoMetadata(video: HTMLVideoElement) {
  return new Promise<void>((resolve, reject) => {
    if (video.readyState >= 1) {
      resolve();
      return;
    }
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("The browser could not load video metadata."));
  });
}

function seekCharacterVideo(video: HTMLVideoElement, timestampSeconds: number) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("The browser could not sample a video frame."));
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.currentTime = Math.min(Math.max(timestampSeconds, 0), Math.max(0, (video.duration || timestampSeconds) - 0.05));
  });
}

function characterCanvasToObjectUrl(canvas: HTMLCanvasElement) {
  return new Promise<string>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("The browser could not create a frame preview."));
        return;
      }
      resolve(URL.createObjectURL(blob));
    }, "image/jpeg", 0.78);
  });
}

function createCharacterFrameSignature(imageData: ImageData) {
  const signature: number[] = [];
  const stride = Math.max(4, Math.floor(imageData.data.length / 32));
  for (let offset = 0; offset < imageData.data.length; offset += stride) {
    signature.push(Math.round((imageData.data[offset] + imageData.data[offset + 1] + imageData.data[offset + 2]) / 3));
  }
  return signature;
}

function compareCharacterFrameSignatures(first: number[], second: number[]) {
  const length = Math.min(first.length, second.length);
  if (length === 0) return 0;
  let totalDifference = 0;
  for (let index = 0; index < length; index += 1) totalDifference += Math.abs(first[index] - second[index]);
  return 1 - Math.min(1, totalDifference / (length * 255));
}

function estimateCharacterFrameSharpness(imageData: ImageData) {
  const data = imageData.data;
  let total = 0;
  let count = 0;
  for (let index = 4; index < data.length; index += 16) {
    const current = (data[index] + data[index + 1] + data[index + 2]) / 3;
    const previous = (data[index - 4] + data[index - 3] + data[index - 2]) / 3;
    total += Math.abs(current - previous);
    count += 1;
  }
  return count > 0 ? total / count : 0;
}

function formatCharacterView(viewID: CharacterVideoViewID) {
  const labels: Record<CharacterVideoViewID, string> = {
    front: "Front",
    leftThreeQuarter: "Left 3/4",
    rightThreeQuarter: "Right 3/4",
    leftProfile: "Left profile",
    rightProfile: "Right profile"
  };
  return labels[viewID];
}

export function getBuddyTrialStateMachineForTests() {
  return BUDDY_TRIAL_STATES;
}
