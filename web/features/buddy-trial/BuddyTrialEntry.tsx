"use client";

import { useEffect, useMemo, useState } from "react";
import { productionCatalogManifest } from "@/lib/catalog/production-manifest";
import { INDEPENDENT_APP_DISCLAIMER } from "@/lib/product-copy";
import {
  applyBuddyTrialConsent,
  BUDDY_TRIAL_ACTIVE_INVITE_ID,
  BUDDY_TRIAL_STATES,
  canAdvanceBuddyTrialToRecommendation,
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
  type BuddyTrialConsentRecord,
  type BuddyTrialBuildGuideProgress,
  type BuddyTrialState,
  type BuddyTrialSession
} from "@/lib/buddy-trial/buddy-trial-session";
import {
  createOwnerReviewDemoLearningRecord,
  createOwnerReviewDemoRecommendationResult,
  isOwnerReviewDemoEnabled,
  OWNER_REVIEW_DEMO_BANNER_COPY,
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

  const completeBuildGuide = (patch: Partial<Pick<BuddyTrialBuildGuideProgress, "totalStepCount" | "currentStepIndex" | "completedStepIds" | "viewMode">>) => {
    const activeSession = ensureSession();
    const withProgress = updateBuddyTrialBuildGuideProgress(activeSession, patch);
    persistSession(transitionBuddyTrialSession(withProgress, "VIDEO_1_REQUIRED", new Date(), "Owner Review Demo build guide completed."));
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
            onProcessVideoOne={() => moveTrialTo("VIDEO_1_PROCESSING", "Owner Review Demo first character video fixture selected.")}
            onDeliverRefinement={() => moveTrialTo("REFINEMENT_READY", "Owner Review Demo refinement fixture delivered.")}
            onRequestVideoTwo={() => moveTrialTo("VIDEO_2_REQUIRED", "Owner Review Demo tester is applying fixture refinement.")}
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
  onProcessVideoOne,
  onDeliverRefinement,
  onRequestVideoTwo,
  onDeliverFinal,
  onComplete
}: {
  session: BuddyTrialSession | null;
  result: OwnerReviewDemoRecommendationResult;
  onStartRecommendations: () => void;
  onStartBuild: () => void;
  onUpdateBuildGuide: (patch: Partial<Pick<BuddyTrialBuildGuideProgress, "totalStepCount" | "currentStepIndex" | "completedStepIds" | "viewMode">>) => void;
  onCompleteBuildGuide: (patch: Partial<Pick<BuddyTrialBuildGuideProgress, "totalStepCount" | "currentStepIndex" | "completedStepIds" | "viewMode">>) => void;
  onProcessVideoOne: () => void;
  onDeliverRefinement: () => void;
  onRequestVideoTwo: () => void;
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
      <section className="buddy-trial-demo-card buddy-trial-built-card" aria-labelledby="owner-review-demo-video-one">
        <p className="buddy-trial-step-label">Build guide complete</p>
        <h2 id="owner-review-demo-video-one">Your player is built.</h2>
        <p>Now show us how it turned out. The next owner-review step will collect a character result for comparison and refinement.</p>
        <button className="buddy-trial-primary" type="button" onClick={onProcessVideoOne}>
          Review My GameFace
        </button>
      </section>
    );
  }

  if (state === "VIDEO_1_PROCESSING") {
    return (
      <section className="buddy-trial-demo-card" aria-labelledby="owner-review-demo-processing">
        <h2 id="owner-review-demo-processing">Demo processing complete</h2>
        <p>Initial build score: {result.refinementPlan.initialBuildScore}/100 based on demo scoring data.</p>
        <button className="buddy-trial-primary" type="button" onClick={onDeliverRefinement}>
          Show demo refinement
        </button>
      </section>
    );
  }

  if (state === "REFINEMENT_READY") {
    return (
      <section className="buddy-trial-demo-card" aria-labelledby="owner-review-demo-refinement">
        <h2 id="owner-review-demo-refinement">Demo refinement</h2>
        <ul className="buddy-trial-demo-list">
          {result.refinementPlan.recommendedChanges.map((change) => (
            <li key={change.id}>
              <strong>{change.label}</strong>
              <span>{change.reason}</span>
            </li>
          ))}
        </ul>
        <button className="buddy-trial-primary" type="button" onClick={onRequestVideoTwo}>
          I applied the demo changes
        </button>
      </section>
    );
  }

  if (state === "VIDEO_2_REQUIRED") {
    return (
      <section className="buddy-trial-demo-card" aria-labelledby="owner-review-demo-video-two">
        <h2 id="owner-review-demo-video-two">Demo Video #2</h2>
        <p>Fixture second-result metadata is ready to process. This remains excluded from real beta metrics.</p>
        <button className="buddy-trial-primary" type="button" onClick={onDeliverFinal}>
          Use fixture Video #2
        </button>
      </section>
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
  const completed = new Set(completedStepIds);
  return (
    <div className="buddy-trial-build-summary" aria-label="All owner-review demo build settings">
      {result.buildGuideSteps.map((step, index) => (
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

export function getBuddyTrialStateMachineForTests() {
  return BUDDY_TRIAL_STATES;
}
