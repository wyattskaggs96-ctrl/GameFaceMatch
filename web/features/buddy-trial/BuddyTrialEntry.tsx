"use client";

import { useEffect, useMemo, useState } from "react";
import { productionCatalogManifest } from "@/lib/catalog/production-manifest";
import { INDEPENDENT_APP_DISCLAIMER } from "@/lib/product-copy";
import {
  applyBuddyTrialConsent,
  BUDDY_TRIAL_ACTIVE_INVITE_ID,
  BUDDY_TRIAL_STATES,
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
  type BuddyTrialConsentRecord,
  type BuddyTrialSession
} from "@/lib/buddy-trial/buddy-trial-session";
import { getConsentDefinition } from "@/lib/privacy/consent";

interface BuddyTrialEntryProps {
  inviteId: string;
}

export function BuddyTrialEntry({ inviteId }: BuddyTrialEntryProps) {
  const inviteResolution = useMemo(() => getBuddyTrialInvite(inviteId), [inviteId]);
  const storageKey = useMemo(() => createBuddyTrialStorageKey(inviteId), [inviteId]);
  const productionCatalogRecordCount = productionCatalogManifest.items.length;
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
      productionCatalogRecordCount
    });
    persistSession(nextSession);
    return nextSession;
  };

  const currentConsent = consent ?? session?.consent ?? createInitialBuddyTrialConsent();
  const consentReady = hasRequiredBuddyTrialConsent(currentConsent);
  const nextAction = session ? getBuddyTrialNextAction(session) : "Review the invite and start when ready.";

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

        {session?.catalogGate === "production_catalog_unavailable" || productionCatalogRecordCount === 0 ? (
          <div className="buddy-trial-warning" role="status">
            Verified College Football 27 recommendations are currently unavailable because the production catalog has 0 approved records. The trial can test
            entry, consent, scan handoff, resume, and deletion without showing fabricated settings.
          </div>
        ) : null}

        <div className="buddy-trial-actions">
          {session?.state === "SCAN_IN_PROGRESS" ? (
            <>
              <a className="buddy-trial-primary" href={`/?buddyTrialInvite=${encodeURIComponent(inviteId)}#start`}>
                Continue guided scan
              </a>
            </>
          ) : (
            <button className="buddy-trial-primary" type="button" onClick={startScan} disabled={!consentReady}>
              Begin face scan
            </button>
          )}
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
