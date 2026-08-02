"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, StatusBadge } from "@/components/design-system";
import type { AnalyticsEventName, AnalyticsPayload } from "@/lib/analytics/privacy-safe-analytics";
import {
  DEFAULT_SCAN_ENTRY_PLAN_ID,
  SCAN_ENTRY_CONSENT_VERSION,
  SCAN_ENTRY_PLANS,
  evaluateScanEntryStartGate,
  type BillingEligibilityState,
  type ScanEntryEnvironment,
  type ScanEntryPlanID
} from "@/lib/onboarding/scan-entry";
import { getConsentDefinition, updateConsent, type ConsentID, type ConsentState } from "@/lib/privacy/consent";

const requiredConsentItems: Array<{ id: ConsentID; label: string; copy: string }> = [
  {
    id: "ageEligibility",
    label: "Age eligibility",
    copy: "I confirm that I meet the age requirement to use this service."
  },
  {
    id: "subjectPermission",
    label: "Permission to scan",
    copy: "I am scanning myself, or I have permission from the person being scanned."
  },
  {
    id: "currentFaceAnalysis",
    label: "Current-session face analysis",
    copy: "I consent to camera capture and face analysis for this appearance recommendation."
  }
];

const additionalRequiredConsentIDs: ConsentID[] = ["cameraUse", "temporaryProcessing"];

export function ScanEntryScreen({
  consentState,
  onConsentChange,
  onReadyToPrepare,
  catalogAvailable,
  environment,
  previewModeEnabled,
  billingState = "notConfigured",
  onAnalytics
}: {
  consentState: ConsentState;
  onConsentChange: (state: ConsentState) => void;
  onReadyToPrepare: () => void;
  catalogAvailable: boolean;
  environment: ScanEntryEnvironment;
  previewModeEnabled: boolean;
  billingState?: BillingEligibilityState;
  onAnalytics: (name: AnalyticsEventName, payload?: AnalyticsPayload) => void;
}) {
  const [selectedPlanID, setSelectedPlanID] = useState<ScanEntryPlanID>(DEFAULT_SCAN_ENTRY_PLAN_ID);
  const [isResolving, setIsResolving] = useState(false);
  const decision = useMemo(
    () =>
      evaluateScanEntryStartGate({
        selectedPlanID,
        consentState,
        billingState,
        catalogAvailable,
        environment,
        previewModeEnabled
      }),
    [billingState, catalogAvailable, consentState, environment, previewModeEnabled, selectedPlanID]
  );
  const selectedPlan = SCAN_ENTRY_PLANS.find((plan) => plan.id === selectedPlanID) ?? SCAN_ENTRY_PLANS[0];

  useEffect(() => {
    onAnalytics("scanEntryViewed", { selectedScanPlan: selectedPlanID, scanEntryGate: decision.reason });
  }, []);

  function selectPlan(planID: ScanEntryPlanID) {
    setSelectedPlanID(planID);
    onAnalytics("scanPlanSelected", { selectedScanPlan: planID });
  }

  function setRequiredConsent(id: ConsentID, granted: boolean) {
    const nextState = updateConsent(consentState, id, granted);
    let withSupportingRequired = nextState;
    if (id === "currentFaceAnalysis") {
      for (const supportingID of additionalRequiredConsentIDs) {
        withSupportingRequired = updateConsent(withSupportingRequired, supportingID, granted);
      }
    }
    onConsentChange(withSupportingRequired);
    onAnalytics("scanConsentChanged", { consentKind: analyticsConsentKind(id), consentGranted: granted });
  }

  async function startScan() {
    onAnalytics("scanStartTapped", { selectedScanPlan: selectedPlanID, scanEntryGate: decision.reason });
    if (!decision.allowed) {
      onAnalytics("scanEntryBlocked", { selectedScanPlan: selectedPlanID, scanEntryGate: decision.reason });
      return;
    }
    setIsResolving(true);
    onAnalytics("scanPurchaseCompleted", { selectedScanPlan: selectedPlanID });
    onAnalytics("scanPreparationOpened", { selectedScanPlan: selectedPlanID });
    try {
      onReadyToPrepare();
    } finally {
      setIsResolving(false);
    }
  }

  return (
    <section className="scan-entry-screen" aria-labelledby="scan-entry-title">
      <div className="scan-entry-brand">
        <strong>GameFace Match</strong>
        <span>From reality to game face.</span>
      </div>
      <div className="scan-entry-hero">
        <p className="scan-entry-kicker">FROM REALITY TO GAME FACE</p>
        <h1 id="scan-entry-title">Build yourself in the game.</h1>
        <p>
          Take a guided face scan and get the closest verified appearance settings for the game you choose. GameFace Match creates manual settings; it does not
          automatically transfer a face into a game.
        </p>
      </div>

      <FaceScanPreview />

      <Card className="scan-entry-card scan-plan-section">
        <div className="status-row">
          <h2>Choose access</h2>
          <StatusBadge tone="warning">Payment required before production scan</StatusBadge>
        </div>
        <div className="scan-plan-grid" role="radiogroup" aria-label="Scan plan">
          {SCAN_ENTRY_PLANS.map((plan) => {
            const selected = selectedPlanID === plan.id;
            return (
              <button
                className={`scan-plan-card ${selected ? "selected" : ""}`}
                key={plan.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => selectPlan(plan.id)}
              >
                <span className="scan-plan-title">{plan.title}</span>
                <strong>{plan.price}</strong>
                <span>{plan.description}</span>
                <small>{plan.entitlementRule}</small>
              </button>
            );
          })}
        </div>
        {environment !== "production" && previewModeEnabled ? (
          <Alert title="Preview mode - no charge" tone="warning">
            Preview mode can test screen flow in development only. It is not a paid entitlement and cannot unlock production scanning.
          </Alert>
        ) : null}
      </Card>

      <Card className="scan-entry-card">
        <div className="status-row">
          <h2>Required consent</h2>
          <StatusBadge tone="info">Version {SCAN_ENTRY_CONSENT_VERSION}</StatusBadge>
        </div>
        <div className="scan-consent-list">
          {requiredConsentItems.map((item) => (
            <label className="scan-consent-item" key={item.id}>
              <input
                type="checkbox"
                checked={consentState[item.id].granted}
                onChange={(event) => setRequiredConsent(item.id, event.currentTarget.checked)}
              />
              <span>
                <strong>{item.label}</strong>
                {item.copy}
              </span>
            </label>
          ))}
        </div>
        <details className="privacy-details">
          <summary>Privacy details</summary>
          <p>
            The scan is used to recommend in-game appearance settings. The product does not identify the person. Basic use does not require an account. Saving a
            reusable profile is optional, and cloud backup, model training, marketing use, or public sharing require separate opt-in consent if those features
            exist.
          </p>
          <p>
            Raw media is treated as temporary session data in this MVP. {getConsentDefinition("saveRawImages")?.description}
          </p>
        </details>
        <a href="#privacy-center">Complete privacy policy and local data controls</a>
      </Card>

      {!decision.allowed ? (
        <Alert title={errorTitle(decision.reason)} tone="warning" role="alert">
          {decision.message}
        </Alert>
      ) : null}

      <Button className="scan-start-button" disabled={!decision.allowed || isResolving} onClick={() => void startScan()} aria-describedby="scan-start-note">
        {isResolving ? "Preparing scan..." : "Start face scan"}
        <span id="scan-start-note">{selectedPlan.id === "all_access_annual" ? "All Access • $9.99/year" : "Launch Pack • $4.99"}</span>
      </Button>

      <p className="scan-entry-disclaimer">
        GameFace Match is an independent companion app and is not affiliated with or endorsed by EA SPORTS or any game publisher. <a href="#disclaimer">Legal disclaimer</a>
      </p>
    </section>
  );
}

function FaceScanPreview() {
  return (
    <Card className="scan-preview-card" aria-label="Guided face scan visual preview">
      <div className="scan-preview-stage" aria-hidden="true">
        <span className="scan-corner scan-corner-top-left" />
        <span className="scan-corner scan-corner-top-right" />
        <span className="scan-corner scan-corner-bottom-left" />
        <span className="scan-corner scan-corner-bottom-right" />
        <svg viewBox="0 0 220 220" className="scan-face-art" focusable="false" aria-hidden="true">
          <path d="M68 162c10-16 22-24 42-24s32 8 42 24" />
          <path d="M72 92c0-32 16-55 38-55s38 23 38 55c0 42-18 70-38 70S72 134 72 92Z" />
          <path d="M88 88c10-5 18-5 26 0M128 88c8-5 16-5 24 0M108 98c-2 13-5 22-10 31 8 3 18 3 25-1M96 136c10 7 22 7 33 0" />
        </svg>
        {["eye-left", "eye-right", "nose", "cheek-left", "cheek-right", "mouth", "jaw-left", "jaw-right", "chin"].map((point) => (
          <span className={`scan-landmark scan-landmark-${point}`} key={point} />
        ))}
        <span className="scan-beam" />
      </div>
      <div className="scan-preview-copy">
        <strong>Guided face scan</strong>
        <span>Usually takes about 30-45 seconds</span>
      </div>
    </Card>
  );
}

function errorTitle(reason: string) {
  const titles: Record<string, string> = {
    missingPlan: "Choose a plan",
    missingConsent: "Required consent missing",
    billingNotConfigured: "Purchase unavailable",
    catalogUnavailable: "Catalog unavailable",
    previewNotAllowedInProduction: "Scan temporarily unavailable",
    purchaseCancelled: "Purchase canceled",
    purchaseFailed: "Purchase verification failed"
  };
  return titles[reason] ?? "Scan temporarily unavailable";
}

function analyticsConsentKind(id: ConsentID): AnalyticsPayload["consentKind"] {
  if (id === "cameraUse") return "camera";
  if (id === "currentFaceAnalysis" || id === "temporaryProcessing" || id === "saveDerivedProfile" || id === "saveCompletedBuild") return id;
  if (id === "ageEligibility" || id === "subjectPermission") return id;
  return undefined;
}
