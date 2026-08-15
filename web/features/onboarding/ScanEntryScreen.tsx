"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/design-system";
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
  onCancel,
  onReadyToPrepare,
  catalogAvailable,
  environment,
  previewModeEnabled,
  billingState = "notConfigured",
  ownerReviewBuddyTrialReady = false,
  privateBetaInviteMode = "none",
  onAnalytics
}: {
  consentState: ConsentState;
  onConsentChange: (state: ConsentState) => void;
  onCancel: () => void;
  onReadyToPrepare: () => void;
  catalogAvailable: boolean;
  environment: ScanEntryEnvironment;
  previewModeEnabled: boolean;
  billingState?: BillingEligibilityState;
  ownerReviewBuddyTrialReady?: boolean;
  privateBetaInviteMode?: "none" | "ready" | "needsConsent";
  onAnalytics: (name: AnalyticsEventName, payload?: AnalyticsPayload) => void;
}) {
  const [selectedPlanID, setSelectedPlanID] = useState<ScanEntryPlanID>(DEFAULT_SCAN_ENTRY_PLAN_ID);
  const [isResolving, setIsResolving] = useState(false);
  const decision = useMemo(
    () =>
      privateBetaInviteMode === "ready" || ownerReviewBuddyTrialReady
        ? ({ allowed: true, reason: "ready", message: "Private beta consent is complete. Start the guided scan." } as const)
        : privateBetaInviteMode === "needsConsent"
          ? ({ allowed: false, reason: "missingConsent", message: "Return to your private beta invite link and accept the beta scan consent before starting." } as const)
        : evaluateScanEntryStartGate({
            selectedPlanID,
            consentState,
            billingState,
            catalogAvailable,
            environment,
            previewModeEnabled
          }),
    [billingState, catalogAvailable, consentState, environment, ownerReviewBuddyTrialReady, previewModeEnabled, privateBetaInviteMode, selectedPlanID]
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
    <section className="setup-flow-screen setup-intro-screen" aria-labelledby="scan-entry-title" data-testid="setup-introduction">
      <button className="setup-top-control" type="button" onClick={onCancel} aria-label="Close setup">
        <span aria-hidden="true">‹</span>
      </button>

      <div className="setup-intro-visual" aria-hidden="true">
        <SegmentedSetupRing />
        <GameFaceScanGlyph variant="neutral" />
      </div>

      <div className="setup-intro-copy">
        <p className="setup-brand">GameFace Match</p>
        <h1 id="scan-entry-title">Set Up Your GameFace</h1>
        <p>Position your face in the frame. Then slowly follow the on-screen guide.</p>
      </div>

      <div className="setup-bottom-actions">
        <Button className="scan-start-button setup-primary-button" disabled={!decision.allowed || isResolving} onClick={() => void startScan()}>
          {isResolving ? "Preparing..." : "Get Started"}
        </Button>
        {privateBetaInviteMode === "ready" ? (
          <p className="setup-start-status" role="status">
            Private beta access active.
          </p>
        ) : !decision.allowed ? (
          <p className="setup-start-status" role="alert">
            {decision.message}
          </p>
        ) : null}
        <details className="setup-disclosure">
          <summary>How the scan works</summary>
          {privateBetaInviteMode !== "none" || ownerReviewBuddyTrialReady ? (
            <p>This free private beta uses your camera to capture the angles needed for your GameFace. Your scan stays temporary by default.</p>
          ) : (
            <>
              <div className="setup-plan-list" role="radiogroup" aria-label="Scan plan">
                {SCAN_ENTRY_PLANS.map((plan) => {
                  const selected = selectedPlanID === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={`${plan.title} ${plan.price}`}
                      className="setup-plan-option"
                      onClick={() => selectPlan(plan.id)}
                    >
                      <strong>
                        {plan.title} · {plan.price}
                      </strong>
                      <span>{plan.description}</span>
                    </button>
                  );
                })}
              </div>
              <div className="scan-consent-list setup-consent-list">
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
              <p>
                The scan is used to recommend in-game appearance settings. It does not identify the person. Raw media is temporary session data by default.{" "}
                {getConsentDefinition("saveRawImages")?.description}
              </p>
              {environment !== "production" && previewModeEnabled ? (
                <p>Preview mode can test screen flow in development only. It is not a paid entitlement.</p>
              ) : null}
            </>
          )}
        </details>
        <p className="setup-footnote">
          Independent companion app. Not affiliated with or endorsed by EA SPORTS or any game publisher. <a href="#privacy-center">Privacy controls</a>
        </p>
        <span className="sr-only" role="status" aria-live="polite">
          Setup gate: {decision.reason}. Selected plan: {selectedPlan.title}.
        </span>
      </div>
    </section>
  );
}

function SegmentedSetupRing() {
  return (
    <div className="setup-segmented-ring" aria-hidden="true">
      {Array.from({ length: 64 }, (_, index) => (
        <span key={index} style={{ transform: `rotate(${index * 5.625}deg)` }} />
      ))}
    </div>
  );
}

function GameFaceScanGlyph({ variant = "neutral" }: { variant?: "neutral" | "complete" }) {
  return (
    <svg className="setup-face-glyph" data-variant={variant} viewBox="0 0 120 120" focusable="false" aria-hidden="true">
      <circle cx="60" cy="60" r="41" />
      <path d="M44 50v12M76 50v12M58 51v22c0 4 2 6 6 6M42 78c10 12 26 12 36 0" />
      {variant === "complete" ? <path d="M42 62l13 13 27-33" className="setup-face-check" /> : null}
    </svg>
  );
}

function analyticsConsentKind(id: ConsentID): AnalyticsPayload["consentKind"] {
  if (id === "cameraUse") return "camera";
  if (id === "currentFaceAnalysis" || id === "temporaryProcessing" || id === "saveDerivedProfile" || id === "saveCompletedBuild") return id;
  if (id === "ageEligibility" || id === "subjectPermission") return id;
  return undefined;
}
