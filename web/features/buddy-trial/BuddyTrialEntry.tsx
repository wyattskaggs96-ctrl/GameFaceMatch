"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { productionCatalogManifest } from "@/lib/catalog/production-manifest";
import { INDEPENDENT_APP_DISCLAIMER } from "@/lib/product-copy";
import {
  attachBuddyTrialVideoOneReview,
  applyBuddyTrialConsent,
  BUDDY_TRIAL_ACTIVE_INVITE_ID,
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
  type BuddyTrialConsentRecord,
  type BuddyTrialBuildGuideProgress,
  type BuddyTrialState,
  type BuddyTrialSession
} from "@/lib/buddy-trial/buddy-trial-session";
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
  type OwnerReviewDemoBuildMatchReview,
  type OwnerReviewDemoBuildStep,
  type OwnerReviewDemoRecommendationResult
} from "@/lib/owner-review-demo/owner-review-demo";
import { getConsentDefinition } from "@/lib/privacy/consent";

interface BuddyTrialEntryProps {
  inviteId: string;
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
  const [hydrated, setHydrated] = useState(false);
  const [consent, setConsent] = useState<BuddyTrialConsentRecord | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const existing = parseBuddyTrialSession(window.localStorage.getItem(storageKey));
    setSession(existing);
    setConsent(existing?.consent ?? null);
    setHydrated(true);
  }, [storageKey]);

  const persistSession = (nextSession: BuddyTrialSession) => {
    setSession(nextSession);
    setConsent(nextSession.consent);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, serializeBuddyTrialSession(nextSession));
    }
  };

  const ensureSession = () => {
    if (session) {
      return session;
    }
    const nextSession = createBuddyTrialSession({
      inviteId,
      productionCatalogRecordCount,
      ownerReviewDemoEnabled
    });
    persistSession(nextSession);
    return nextSession;
  };

  const currentConsent = consent ?? session?.consent ?? createInitialBuddyTrialConsent();
  const consentReady = hasRequiredBuddyTrialConsent(currentConsent);
  const nextAction = session ? getBuddyTrialNextAction(session) : "Review the invite and start when ready.";
  const showScanAction = !session || session.state === "INVITED" || session.state === "CONSENTED" || session.state === "SCAN_IN_PROGRESS";

  const updateConsent = (id: keyof BuddyTrialConsentRecord["acknowledgments"], checked: boolean) => {
    const activeSession = ensureSession();
    const nextConsent = {
      ...activeSession.consent,
      acknowledgments: {
        ...activeSession.consent.acknowledgments,
        [id]: checked
      }
    };
    const nextSession = { ...activeSession, consent: nextConsent };
    setConsent(nextConsent);
    persistSession(nextSession);
  };

  const startScan = () => {
    const activeSession = ensureSession();
    const consented = applyBuddyTrialConsent({ ...activeSession, consent: currentConsent }, currentConsent);
    const nextSession =
      consented.state === "CONSENTED" ? transitionBuddyTrialSession(consented, "SCAN_IN_PROGRESS", new Date(), "Buddy Trial scan started.") : consented;
    persistSession(nextSession);
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

  if (!hydrated) {
    return (
      <main className="buddy-trial-page">
        <section className="buddy-trial-shell" aria-live="polite">
          <p className="buddy-trial-kicker">GameFace Match private trial</p>
          <h1>Loading your private link</h1>
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
      <section className="buddy-trial-shell" aria-labelledby="buddy-trial-title">
        <div className="buddy-trial-brand" aria-label="GameFace Match">
          <span className="buddy-trial-mark" aria-hidden="true">
            G
          </span>
          <span>GameFace Match</span>
        </div>
        <p className="buddy-trial-kicker">Private Buddy Trial</p>
        <h1 id="buddy-trial-title">Build your College Football 27 game face.</h1>
        <p className="buddy-trial-copy">
          Take a guided face scan, get the closest verified appearance settings when the catalog is available, then come back with screenshots or video so the
          result can be refined.
        </p>

        {ownerReviewDemoEnabled ? (
          <div className="buddy-trial-demo-banner" role="status">
            {OWNER_REVIEW_DEMO_BANNER_COPY}
          </div>
        ) : null}

        <div className="buddy-trial-status-card" aria-live="polite">
          <span className="buddy-trial-status-label">Session state</span>
          <strong>{session?.state ?? "INVITED"}</strong>
          <span>{nextAction}</span>
        </div>

        <section className="buddy-trial-info-grid" aria-label="Trial details">
          <article>
            <h2>What this does</h2>
            <p>GameFace Match recommends game appearance settings. It does not import your face into the game or identify who you are.</p>
          </article>
          <article>
            <h2>Camera and scan</h2>
            <p>The scan uses the browser camera only after you start the existing guided scan flow.</p>
          </article>
          <article>
            <h2>Retention default</h2>
            <p>Raw face media is temporary by default. The trial can save only pseudonymous progress, consent versions, quality metadata, and non-image derived results.</p>
          </article>
          <article>
            <h2>Persistence mode</h2>
            <p>Private-beta persistence currently uses the browser-local test adapter. Production Supabase storage remains disabled until credentials and RLS are activated.</p>
          </article>
          <article>
            <h2>Independent app</h2>
            <p>GameFace Match is an independent companion app, not an official game integration.</p>
          </article>
        </section>

        <section className="buddy-trial-consent" aria-labelledby="buddy-trial-consent-title">
          <h2 id="buddy-trial-consent-title">Required acknowledgments</h2>
          {REQUIRED_BUDDY_TRIAL_CONSENTS.map((id) => {
            const definition = getConsentDefinition(id);
            return (
              <label key={id} className="buddy-trial-checkbox">
                <input
                  type="checkbox"
                  checked={currentConsent.acknowledgments[id]}
                  onChange={(event) => updateConsent(id, event.target.checked)}
                  disabled={session?.state === "SCAN_IN_PROGRESS"}
                />
                <span>
                  <strong>{definition?.label}</strong>
                  <small>{definition?.description}</small>
                </span>
              </label>
            );
          })}
        </section>

        {session?.catalogGate === "production_catalog_unavailable" || (!ownerReviewDemoEnabled && productionCatalogRecordCount === 0) ? (
          <div className="buddy-trial-warning" role="status">
            Verified College Football 27 recommendations are currently unavailable because the production catalog has 0 approved records. The trial can test
            entry, consent, scan handoff, resume, and deletion without showing fabricated settings.
          </div>
        ) : null}

        {ownerReviewDemo ? (
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
            onDeliverFinal={() => moveTrialTo("FINAL_RESULT_READY", "Owner Review Demo second character video fixture processed.")}
            onComplete={() => moveTrialTo("COMPLETE", "Owner Review Demo completed without writing production evidence.")}
          />
        ) : null}

        <div className="buddy-trial-actions">
          {showScanAction ? (
            session?.state === "SCAN_IN_PROGRESS" ? (
              <a className="buddy-trial-primary" href={`/?buddyTrialInvite=${encodeURIComponent(inviteId)}#start`}>
                Continue guided scan
              </a>
            ) : (
              <button className="buddy-trial-primary" type="button" onClick={startScan} disabled={!consentReady}>
                Start My GameFace
              </button>
            )
          ) : null}
          <button className="buddy-trial-secondary" type="button" onClick={deleteTrialData}>
            Delete My Trial Data
          </button>
        </div>

        <details className="buddy-trial-privacy">
          <summary>Privacy details</summary>
          <p>
            This private trial records the invite session state, consent version, progress, and non-image derived metadata needed to resume the trial. Basic use does
            not require an account. Raw face photos or video are not written to the trial record by default. Cloud backup, public sharing, model training, and
            marketing use are not included in this consent.
          </p>
        </details>

        <p className="buddy-trial-resume">Resume with this same private URL in this browser: /trial/{inviteId}</p>
        <p className="buddy-trial-disclaimer">{INDEPENDENT_APP_DISCLAIMER}</p>
        {process.env.NODE_ENV !== "production" ? <p className="buddy-trial-fixture">Fixture invite for tests: {BUDDY_TRIAL_ACTIVE_INVITE_ID}</p> : null}
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
  onDeliverFinal,
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
  onDeliverFinal: () => void;
  onComplete: () => void;
}) {
  const state = session?.state ?? "INVITED";
  const bestMatch = result.matches[0];
  const learningRecord = createOwnerReviewDemoLearningRecord(session?.sessionId ?? "owner-review-demo-preview");
  const progress = session?.buildGuide;
  const currentStepIndex = Math.min(progress?.currentStepIndex ?? 0, Math.max(result.buildGuideSteps.length - 1, 0));
  const completedStepIds = progress?.completedStepIds ?? [];
  const completedCount = completedStepIds.length;
  const refinementProgress = session?.refinementGuide ?? createBuddyTrialBuildGuideProgress(result.refinementPlan.refinementBuildGuideSteps.length);
  const [videoReviewState, setVideoReviewState] = useState<CharacterVideoReviewUiState>(() => createInitialCharacterVideoReviewUiState(session));
  const videoReviewStateRef = useRef(videoReviewState);
  const [selectedFrameIDs, setSelectedFrameIDs] = useState<Partial<Record<CharacterVideoViewID, string>>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    videoReviewStateRef.current = videoReviewState;
  }, [videoReviewState]);

  useEffect(() => {
    return () => {
      revokeCharacterVideoUrls(videoReviewStateRef.current);
      stopCharacterRecording(recordingStreamRef.current, mediaRecorderRef.current);
    };
  }, []);

  async function processCharacterVideoFile(file: File, source: CharacterVideoSource) {
    revokeCharacterVideoUrls(videoReviewState);
    const objectUrl = URL.createObjectURL(file);
    setVideoReviewState({
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
      const baseReview = createCharacterVideoReviewResult({ metadata });
      if (baseReview.status === "blocked") {
        URL.revokeObjectURL(objectUrl);
        setVideoReviewState({
          status: "blocked",
          progressLabel: "This video needs a retake before GameFace Match can compare it.",
          objectUrl: null,
          fileName: file.name,
          review: baseReview,
          candidateFrames: [],
          error: baseReview.processingSummary
        });
        onSaveVideoOneReview(baseReview);
        return;
      }

      setVideoReviewState((current) => ({ ...current, progressLabel: "Extracting front, left, and right candidate views." }));
      const candidateFrames = await extractCharacterVideoFrameCandidates(objectUrl, metadata);
      URL.revokeObjectURL(objectUrl);
      const review = createCharacterVideoReviewResult({ metadata, candidateFrames, objectUrlsRevokedAfterProcessing: true });
      const initialSelection = Object.fromEntries(review.standardizedViews.map((view) => [view.viewID, view.selectedFrameID])) as Partial<Record<CharacterVideoViewID, string>>;
      setSelectedFrameIDs(initialSelection);
      setVideoReviewState({
        status: review.manualSelectionRequired ? "manual_selection_required" : "usable",
        progressLabel: review.processingSummary,
        objectUrl: null,
        fileName: file.name,
        review,
        candidateFrames,
        error: null
      });
      onSaveVideoOneReview(review);
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      setVideoReviewState({
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
        const file = new File([blob], `gameface-character-video-1-${new Date().toISOString()}.webm`, { type: blob.type || "video/webm" });
        stopCharacterRecording(stream, recorder);
        recordingStreamRef.current = null;
        mediaRecorderRef.current = null;
        void processCharacterVideoFile(file, "recording");
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
    if (!videoReviewState.review) return;
    const confirmed = confirmManualCharacterVideoSelection(
      {
        ...videoReviewState.review,
        candidateFrames: videoReviewState.candidateFrames
      },
      selectedFrameIDs
    );
    setVideoReviewState((current) => ({
      ...current,
      status: confirmed.status === "usable" ? "usable" : "blocked",
      review: confirmed,
      progressLabel: confirmed.processingSummary,
      error: confirmed.status === "blocked" ? confirmed.processingSummary : null
    }));
    onSaveVideoOneReview(confirmed);
  }

  function retryCharacterVideo() {
    revokeCharacterVideoUrls(videoReviewState);
    setSelectedFrameIDs({});
    setVideoReviewState(createInitialCharacterVideoReviewUiState(session));
  }

  if (state === "INVITED" || state === "CONSENTED" || state === "SCAN_IN_PROGRESS") {
    return (
      <section className="buddy-trial-demo-card" aria-labelledby="owner-review-demo-title">
        <h2 id="owner-review-demo-title">What happens next</h2>
        <p>
          After the guided scan, this private link returns here with a demo recommendation, exact settings, and a step-by-step College Football 27 build guide.
          The settings are test data for owner review.
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
          We are preparing your owner-review demo recommendation from synthetic catalog data. This does not use or publish real College Football 27 verification.
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
        <p className="buddy-trial-step-label">Owner Review Demo result</p>
        <h2 id="owner-review-demo-recommendations">Your GameFace recommendation</h2>
        <div className="buddy-trial-best-match">
          <span>Best Match</span>
          <strong>{bestMatch.catalogItem.visibleGameLabelOrIndex}</strong>
          <small>
            Match Score {bestMatch.score}/100 · {bestMatch.confidence.label} confidence · {bestMatch.evidenceSupportState.toLowerCase().replaceAll("_", " ")}
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
                  <small>{control.controlKind}</small>
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
      <section className="buddy-trial-demo-card buddy-trial-video-review" aria-labelledby="owner-review-demo-video-one">
        <p className="buddy-trial-step-label">Build guide complete</p>
        <h2 id="owner-review-demo-video-one">LET&apos;S SEE HOW WE DID</h2>
        <ol className="buddy-trial-demo-list">
          <li>Open your created player.</li>
          <li>Keep helmet/accessories off the face.</li>
          <li>Start facing forward.</li>
          <li>Slowly rotate left.</li>
          <li>Return to center.</li>
          <li>Slowly rotate right.</li>
          <li>Return to center.</li>
        </ol>
        <CharacterVideoReviewPanel
          state={videoReviewState}
          selectedFrameIDs={selectedFrameIDs}
          onSelectFrame={(viewID, frameID) => setSelectedFrameIDs((current) => ({ ...current, [viewID]: frameID }))}
          onUpload={(file) => void processCharacterVideoFile(file, "upload")}
          onRecord={startCharacterRecording}
          onStopRecording={stopCurrentCharacterRecording}
          onConfirmFrames={confirmSelectedCharacterFrames}
          onRetry={retryCharacterVideo}
          onContinue={onDeliverRefinement}
        />
      </section>
    );
  }

  if (state === "VIDEO_1_PROCESSING") {
    return (
      <section className="buddy-trial-demo-card buddy-trial-video-review" aria-labelledby="owner-review-demo-processing">
        <p className="buddy-trial-step-label">Video #1 processed</p>
        <h2 id="owner-review-demo-processing">Standardized character views</h2>
        <p>{session?.videoOneReview?.processingSummary ?? videoReviewState.review?.processingSummary ?? "Video #1 is ready for comparison."}</p>
        <CharacterVideoStandardizedViews review={videoReviewState.review ?? session?.videoOneReview ?? null} />
        <p>Build Match Score is based on available game controls. It is not identity probability.</p>
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
    return (
      <OwnerReviewDemoRefinementGuide
        steps={result.refinementPlan.refinementBuildGuideSteps}
        progress={refinementProgress}
        onUpdate={onUpdateRefinementGuide}
        onComplete={onDeliverFinal}
      />
    );
  }

  if (state === "FINAL_RESULT_READY") {
    return (
      <section className="buddy-trial-demo-card" aria-labelledby="owner-review-demo-final">
        <h2 id="owner-review-demo-final">Demo before and after</h2>
        <p>
          Initial build score: {result.refinementPlan.initialBuildScore}/100. Refined build score: {result.refinementPlan.refinedBuildScore}/100. Demo delta: +
          {result.refinementPlan.refinedBuildScore - result.refinementPlan.initialBuildScore}.
        </p>
        <p>Demo learning record: {learningRecord.analyticsDataset}. Production weight changes allowed: no.</p>
        <button className="buddy-trial-primary" type="button" onClick={onComplete}>
          Complete owner review demo
        </button>
      </section>
    );
  }

  return (
    <section className="buddy-trial-demo-card" aria-labelledby="owner-review-demo-complete">
      <h2 id="owner-review-demo-complete">Owner Review Demo complete</h2>
      <p>Demo data stayed isolated from production catalog, verifier, study, analytics, and learning state.</p>
    </section>
  );
}

function OwnerReviewDemoTopThree({ result }: { result: OwnerReviewDemoRecommendationResult }) {
  return (
    <ol className="buddy-trial-demo-top-three" aria-label="Owner Review Demo top three recommendations">
      {result.matches.map((match) => (
        <li key={match.id}>
          <strong>
            #{match.rank} {match.catalogItem.visibleGameLabelOrIndex}
          </strong>
          <span>
            {match.score}/100 · {match.confidence.label} demo confidence · {match.catalogItem.sourceType}
          </span>
        </li>
      ))}
    </ol>
  );
}

function OwnerReviewDemoBuildSummary({ result, completedStepIds }: { result: OwnerReviewDemoRecommendationResult; completedStepIds: string[] }) {
  return <OwnerReviewDemoStepSummary steps={result.buildGuideSteps} completedStepIds={completedStepIds} ariaLabel="All owner-review demo build settings" />;
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
  onContinue
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
}) {
  const isBusy = state.status === "processing" || state.status === "recording";
  const canConfirm = ["front", "leftThreeQuarter", "rightThreeQuarter"].every((viewID) => selectedFrameIDs[viewID as CharacterVideoViewID]);
  return (
    <div className="buddy-trial-video-panel" aria-live="polite">
      <p>
        Use a short iPhone video of your TV/monitor or upload a clean console-recorded file. Accepted formats: MP4, MOV, M4V, or WebM, 4-45 seconds, up to
        250 MB.
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
          <p>The browser found candidate views, but a person should confirm the front, left, and right frames before comparison.</p>
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
            Continue to refinement
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
    return <p>No standardized character views are available yet.</p>;
  }
  return (
    <div className="buddy-trial-standardized-views" aria-label="Standardized character views">
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
          <p>{review.noChangeReason ?? review.uncertaintyReasons[0] ?? "No defensible adjustment is available from this video."}</p>
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
          <strong>Needs clearer evidence</strong>
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
        <p>This review did not produce a defensible adjustment walkthrough.</p>
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
        <OwnerReviewDemoStepSummary steps={steps} completedStepIds={progress.completedStepIds} ariaLabel="All owner-review demo build settings" />
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
            {setting.controlKind} · {setting.menuPath.join(" > ")}
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

function createInitialCharacterVideoReviewUiState(session: BuddyTrialSession | null): CharacterVideoReviewUiState {
  return {
    status: session?.videoOneReview?.status === "usable" ? "usable" : "idle",
    progressLabel: session?.videoOneReview?.processingSummary ?? "",
    objectUrl: null,
    fileName: session?.videoOneReview?.metadata.fileName ?? null,
    review: session?.videoOneReview ?? null,
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

async function extractCharacterVideoFrameCandidates(objectUrl: string, metadata: CharacterVideoMetadata): Promise<CharacterVideoFrameCandidate[]> {
  const baseReview = createCharacterVideoReviewResult({ metadata });
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
