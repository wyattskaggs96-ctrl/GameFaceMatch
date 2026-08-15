"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/AppShell";
import { Alert, Button, Card, LoadingState, ProgressBar, ScreenHeader, StepFlowRail } from "@/components/design-system";
import { createLocalAnalyticsRecorder, type AnalyticsEventName, type AnalyticsPayload, type PrivacySafeAnalytics } from "@/lib/analytics/privacy-safe-analytics";
import { AttributeConfirmation } from "@/features/attributes/AttributeConfirmation";
import { BrowserCapabilityPanel } from "@/features/capture/BrowserCapabilityPanel";
import { CaptureLightingCheck } from "@/features/capture/CaptureLightingCheck";
import { GuidedCaptureFlow } from "@/features/capture/GuidedCaptureFlow";
import { GameCatalogStatus } from "@/features/catalog/GameCatalogStatus";
import { PricingScaffold } from "@/features/commerce/PricingScaffold";
import { Fc26FaceMatchingMvp } from "@/features/fc26/Fc26FaceMatchingMvp";
import { ScanEntryScreen } from "@/features/onboarding/ScanEntryScreen";
import { ProfileReview } from "@/features/profile/ProfileReview";
import { ConsentPanel } from "@/features/privacy/ConsentPanel";
import { PrivacyCenter } from "@/features/privacy/PrivacyCenter";
import { ResultsExperience } from "@/features/results/ResultsExperience";
import { SavedBuildsEmpty } from "@/features/saved-builds/SavedBuildsEmpty";
import { ScreenshotRefinementEntry } from "@/features/refinement/ScreenshotRefinementEntry";
import { SettingsPanel } from "@/features/settings/SettingsPanel";
import { createInitialCaptureSession, type ActiveCaptureSession } from "@/lib/capture/capture-session";
import { createBrowserCameraService } from "@/lib/capture/browser-camera-service";
import {
  BUDDY_TRIAL_ACTIVE_INVITE_POINTER_KEY,
  createBuddyTrialStorageKey,
  getBuddyTrialInvite,
  hasRequiredBuddyTrialConsent,
  markBuddyTrialScanCompleteInStorage,
  parseBuddyTrialSession
} from "@/lib/buddy-trial/buddy-trial-session";
import { createBundledCatalogRepository, type CatalogRuntimeStatus } from "@/lib/catalog/catalog-repository";
import { productionCatalogManifest } from "@/lib/catalog/production-manifest";
import {
  canEnterHome,
  getNextOnboardingScreen,
  getScreenFromHash,
  getStepFlowProgress,
  MOBILE_NAV_ITEMS,
  PRIMARY_NAV_ITEMS,
  STEP_FLOW_DETAILS,
  toScreenHash,
  type AppScreen
} from "@/lib/navigation";
import { createInitialConsentState, hasRequiredCaptureConsent, isConsentGranted, updateConsent, type ConsentID, type ConsentState } from "@/lib/privacy/consent";
import { createDataInventory, createNonRawPrivacyExport, type DeletionScope } from "@/lib/privacy/data-lifecycle";
import { createMemoryPrivacyStore } from "@/lib/privacy/local-privacy-store";
import {
  createConsentRevocationRetentionPlan,
  createProfileCreationRetentionPlan,
  createRefinementCompletionRetentionPlan,
  removeRawImagesFromCaptureSession,
  type RetentionAction
} from "@/lib/privacy/retention-policy";
import {
  createBrowserSavedProfileStorage,
  createMemorySavedProfileStorage,
  type SavedProfileStorage,
  type SavedProfileStorageStatus,
  type SavedProfileSummary
} from "@/lib/privacy/profile-storage";
import {
  createCaptureRecoverySnapshot,
  createCaptureRecoveryStore,
  createOfflineRecoveryStatus,
  hasRecoverableCaptureProgress,
  type OfflineRecoveryStatus
} from "@/lib/recovery/offline-recovery";
import {
  createInitialLoadPerformanceRecord,
  createLocalPerformanceMonitor,
  createMobileResponsivenessRecord,
  createPerformanceRecord,
  estimateTemporaryImageMemoryBytes,
  measureSyncPerformance,
  type LocalPerformanceMonitor,
  type PerformanceMetricRecord
} from "@/lib/performance/performance-monitor";
import { createInitialAttributeConfirmation, type AttributeConfirmationState } from "@/lib/profile/attribute-confirmation";
import { createStandardFaceProfile } from "@/lib/profile/standard-face-profile";
import { createInitialScreenshotRefinementSession, deleteScreenshotRefinementSession } from "@/lib/refinement/screenshot-refinement";
import { createRuleBasedMatchingEngine } from "@/lib/matching/matching-engine";
import { getScanEntryEnvironment } from "@/lib/onboarding/scan-entry";
import { isOwnerReviewDemoEnabled } from "@/lib/owner-review-demo/owner-review-demo";
import { createBuildInstructions } from "@/lib/results/results-experience";
import { isProductionCatalogEmpty, shouldShowDevelopmentCatalogBanner } from "@/lib/ui/catalog-status";
import { CATALOG_UNAVAILABLE_MESSAGE, INDEPENDENT_APP_DISCLAIMER, PRODUCT_EXPLANATION } from "@/lib/product-copy";
import type { GameAppearanceMatch, RefinementResult, StandardFaceProfile } from "@/types/domain";

const DevelopmentCatalogAuditInspector =
  process.env.NODE_ENV === "production"
    ? null
    : dynamic(() => import("@/features/catalog/CatalogAuditInspector").then((module) => module.CatalogAuditInspector), {
        ssr: false,
        loading: () => <LoadingState label="Loading catalog inspector" />
      });

const DevelopmentMatchingLab =
  process.env.NODE_ENV === "production"
    ? null
    : dynamic(() => import("@/features/matching/MatchingLab").then((module) => module.MatchingLab), {
        ssr: false,
        loading: () => <LoadingState label="Loading matching laboratory" />
      });

const DevelopmentMobileQAStatus =
  process.env.NODE_ENV === "production"
    ? null
    : dynamic(() => import("@/features/qa/MobileQAStatus").then((module) => module.MobileQAStatus), {
        ssr: false,
        loading: () => <LoadingState label="Loading mobile QA status" />
      });

const DevelopmentAnalyticsDashboard =
  process.env.NODE_ENV === "production"
    ? null
    : dynamic(() => import("@/features/analytics/AnalyticsDashboard").then((module) => module.AnalyticsDashboard), {
        ssr: false,
        loading: () => <LoadingState label="Loading analytics dashboard" />
      });

const DevelopmentPerformanceDashboard =
  process.env.NODE_ENV === "production"
    ? null
    : dynamic(() => import("@/features/performance/PerformanceDashboard").then((module) => module.PerformanceDashboard), {
        ssr: false,
        loading: () => <LoadingState label="Loading performance dashboard" />
      });

const DevelopmentPhase0Status =
  process.env.NODE_ENV === "production"
    ? null
    : dynamic(() => import("@/features/phase-zero/Phase0StatusPanel").then((module) => module.Phase0StatusPanel), {
        ssr: false,
        loading: () => <LoadingState label="Loading Phase 0 status" />
      });

const DevelopmentManualMatchingStudyDashboard =
  process.env.NODE_ENV === "production"
    ? null
    : dynamic(() => import("@/features/phase-zero/ManualMatchingStudyDashboard").then((module) => module.ManualMatchingStudyDashboard), {
        ssr: false,
        loading: () => <LoadingState label="Loading manual matching study dashboard" />
      });

const DevelopmentEvidenceGallery =
  process.env.NODE_ENV === "production"
    ? null
    : dynamic(() => import("@/features/phase-zero/CurrentEvidenceGallery").then((module) => module.CurrentEvidenceGallery), {
        ssr: false,
        loading: () => <LoadingState label="Loading research evidence gallery" />
      });

const DevelopmentSourceVideoEvidenceInspector =
  process.env.NODE_ENV === "production"
    ? null
    : dynamic(() => import("@/features/phase-zero/SourceVideoEvidenceInspector").then((module) => module.SourceVideoEvidenceInspector), {
        ssr: false,
        loading: () => <LoadingState label="Loading source video evidence inspector" />
      });

function getBuddyTrialInviteIdFromLocation() {
  if (typeof window === "undefined") return null;
  const fromSearch = new URLSearchParams(window.location.search).get("buddyTrialInvite");
  if (fromSearch) return fromSearch;
  const hashQueryStart = window.location.hash.indexOf("?");
  if (hashQueryStart >= 0) {
    const fromHash = new URLSearchParams(window.location.hash.slice(hashQueryStart + 1)).get("buddyTrialInvite");
    if (fromHash) return fromHash;
  }
  try {
    return window.sessionStorage.getItem(BUDDY_TRIAL_ACTIVE_INVITE_POINTER_KEY);
  } catch {
    return null;
  }
}

export default function HomePage() {
  const [screen, setScreen] = useState<AppScreen>("welcome");
  const [session, setSession] = useState(() => createInitialCaptureSession());
  const [attributeConfirmation, setAttributeConfirmation] = useState<AttributeConfirmationState>(() => createInitialAttributeConfirmation());
  const [standardProfile, setStandardProfile] = useState<StandardFaceProfile | null>(null);
  const [deletionRecorded, setDeletionRecorded] = useState(false);
  const [consentState, setConsentState] = useState<ConsentState>(() => createInitialConsentState());
  const [screenshotSession, setScreenshotSession] = useState(() => createInitialScreenshotRefinementSession());
  const [latestMatches, setLatestMatches] = useState<GameAppearanceMatch[]>([]);
  const [latestMatchingError, setLatestMatchingError] = useState<string | null>(null);
  const [privacyRevision, setPrivacyRevision] = useState(0);
  const [catalogRuntimeStatus, setCatalogRuntimeStatus] = useState<CatalogRuntimeStatus | null>(null);
  const [catalogRuntimeError, setCatalogRuntimeError] = useState<string | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfileSummary[]>([]);
  const [savedProfileStatus, setSavedProfileStatus] = useState<SavedProfileStorageStatus | null>(null);
  const [profileSaveStatusMessage, setProfileSaveStatusMessage] = useState<string | null>(null);
  const [profileSaveErrorMessage, setProfileSaveErrorMessage] = useState<string | null>(null);
  const [captureRecoveryNotice, setCaptureRecoveryNotice] = useState<string | null>(null);
  const [offlineRecoveryStatus, setOfflineRecoveryStatus] = useState<OfflineRecoveryStatus | null>(null);
  const [buddyTrialInviteId, setBuddyTrialInviteId] = useState<string | null>(null);
  const [buddyTrialScanReady, setBuddyTrialScanReady] = useState(false);
  const [analyticsRevision, setAnalyticsRevision] = useState(0);
  const [performanceRevision, setPerformanceRevision] = useState(0);
  const cameraService = useMemo(() => createBrowserCameraService(), []);
  const matchingEngine = useMemo(() => createRuleBasedMatchingEngine(), []);
  const privacyStore = useMemo(() => createMemoryPrivacyStore(), []);
  const analytics = useMemo<PrivacySafeAnalytics>(() => createLocalAnalyticsRecorder(), []);
  const performanceMonitor = useMemo<LocalPerformanceMonitor>(() => createLocalPerformanceMonitor(), []);
  const savedProfileStorage = useMemo<SavedProfileStorage>(
    () => (typeof window === "undefined" ? createMemorySavedProfileStorage() : createBrowserSavedProfileStorage(window.sessionStorage, window.crypto)),
    []
  );
  const catalogIsEmpty = isProductionCatalogEmpty(productionCatalogManifest);
  const isDevelopment = process.env.NODE_ENV !== "production";
  const scanEntryEnvironment = getScanEntryEnvironment(process.env.NODE_ENV);
  const scanEntryPreviewModeEnabled = process.env.NEXT_PUBLIC_GAMEFACE_SCAN_ENTRY_PREVIEW === "1";
  const ownerReviewDemoEnabled = isOwnerReviewDemoEnabled({
    NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO: process.env.NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO,
    NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV: process.env.NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV
  });
  const activeBuddyTrialInviteInUrl = Boolean(buddyTrialInviteId && getBuddyTrialInvite(buddyTrialInviteId).status === "active");
  const privateBetaInviteMode = activeBuddyTrialInviteInUrl ? (buddyTrialScanReady ? "ready" : "needsConsent") : "none";
  const buddyTrialCustomerScanMode = Boolean(privateBetaInviteMode === "ready" && buddyTrialInviteId);
  const consentReady = hasRequiredCaptureConsent(consentState);
  const navItems = isDevelopment
    ? [
        ...PRIMARY_NAV_ITEMS,
        { id: "pricing" as const, label: "Pricing" },
        { id: "audit" as const, label: "Audit" },
        { id: "evidence-gallery" as const, label: "Evidence Gallery" },
        { id: "video-inspector" as const, label: "Video Inspector" },
        { id: "phase-0" as const, label: "Phase 0" },
        { id: "manual-study" as const, label: "Manual Study" },
        { id: "matching-lab" as const, label: "Matching Lab" },
        { id: "mobile-qa" as const, label: "Mobile QA" },
        { id: "analytics" as const, label: "Analytics" },
        { id: "performance" as const, label: "Performance" }
      ]
    : PRIMARY_NAV_ITEMS;
  const stepFlowProgress = getStepFlowProgress(screen);
  const immersiveSetupScreen = screen === "welcome" || screen === "start" || screen === "capture" || screen === "preparation";

  const completedAngles = session.angles.filter((angle) => angle.status === "complete").length;
  const requiredAngles = session.angles.length;
  const savedBuilds = useMemo(() => privacyStore.getSavedBuilds(), [privacyStore, privacyRevision]);
  const deletionRecords = useMemo(() => privacyStore.getDeletionRecords(), [privacyStore, privacyRevision]);
  const privacyInventory = useMemo(
    () =>
      createDataInventory({
        consentState,
        captureSession: session,
        attributes: attributeConfirmation,
        derivedProfile: standardProfile,
        savedBuilds,
        screenshotSession,
        deletionRecords,
        preferences: privacyStore.getApplicationPreferences(),
        savedProfileCount: savedProfiles.length,
        savedProfileStorageLocation:
          savedProfileStatus?.storageLocation === "browser-session-storage" ? "Browser sessionStorage profile vault" : "Memory profile vault",
        savedProfileEncryptionDescription: savedProfileStatus?.encryptionDescription
      }),
    [attributeConfirmation, consentState, deletionRecords, privacyStore, savedBuilds, savedProfileStatus, savedProfiles.length, screenshotSession, session, standardProfile]
  );
  const nonRawExportJson = useMemo(
    () =>
      JSON.stringify(
        createNonRawPrivacyExport(
          {
            consentState,
            captureSession: session,
            attributes: attributeConfirmation,
            derivedProfile: standardProfile,
            savedBuilds,
            screenshotSession,
            deletionRecords,
            preferences: privacyStore.getApplicationPreferences(),
            savedProfileCount: savedProfiles.length,
            savedProfileStorageLocation:
              savedProfileStatus?.storageLocation === "browser-session-storage" ? "Browser sessionStorage profile vault" : "Memory profile vault",
            savedProfileEncryptionDescription: savedProfileStatus?.encryptionDescription,
            savedProfileSummaries: savedProfiles.map((profile) => ({
              profileID: profile.profileID,
              savedAt: profile.savedAt,
              encryptionStatus: profile.encryptionStatus
            }))
          },
          new Date()
        ),
        null,
        2
      ),
    [attributeConfirmation, consentState, deletionRecords, privacyStore, savedBuilds, savedProfileStatus, savedProfiles, screenshotSession, session, standardProfile]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    trackAnalytics("appSessionStarted");
    trackPerformance(createInitialLoadPerformanceRecord(window.performance));
    trackPerformance(
      createMobileResponsivenessRecord({
        viewportWidth: window.visualViewport?.width ?? window.innerWidth,
        viewportHeight: window.visualViewport?.height ?? window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      })
    );
    const initialScreen = getScreenFromHash(window.location.hash);
    if (initialScreen) {
      setScreen(initialScreen);
      return;
    }
    window.history.replaceState({ screen: "welcome" }, "", `${window.location.pathname}${window.location.search}${toScreenHash("welcome")}`);
  }, []);

  useEffect(() => {
    const repository = createBundledCatalogRepository();
    const startedAt = typeof performance === "undefined" ? Date.now() : performance.now();
    void repository
      .loadRuntimeStatus()
      .then((status) => {
        trackPerformance(
          createPerformanceRecord({
            operation: "catalogLoading",
            durationMs: (typeof performance === "undefined" ? Date.now() : performance.now()) - startedAt,
            itemCount: status.manifest.items.length,
            notes: ["Validated bundled production catalog manifest and integrity state."]
          })
        );
        setCatalogRuntimeStatus(status);
        setCatalogRuntimeError(null);
      })
      .catch((error: unknown) => {
        trackPerformance(
          createPerformanceRecord({
            operation: "catalogLoading",
            durationMs: (typeof performance === "undefined" ? Date.now() : performance.now()) - startedAt,
            itemCount: productionCatalogManifest.items.length,
            notes: ["Catalog loading failed closed."]
          })
        );
        setCatalogRuntimeError(error instanceof Error ? error.message : "Catalog runtime validation failed closed.");
      });
  }, []);

  useEffect(() => {
    refreshSavedProfileState();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBuddyTrialInviteId(getBuddyTrialInviteIdFromLocation());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !buddyTrialInviteId || getBuddyTrialInvite(buddyTrialInviteId).status !== "active") {
      setBuddyTrialScanReady(false);
      return;
    }
    const storedSession = parseBuddyTrialSession(window.localStorage.getItem(createBuddyTrialStorageKey(buddyTrialInviteId)));
    const scanEligibleState = Boolean(storedSession && !["DELETED", "COMPLETE"].includes(storedSession.state));
    setBuddyTrialScanReady(Boolean(storedSession && scanEligibleState && hasRequiredBuddyTrialConsent(storedSession.consent)));
  }, [buddyTrialInviteId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const snapshot = createCaptureRecoveryStore(window.sessionStorage).load();
    if (snapshot && hasRecoverableCaptureProgress(snapshot)) {
      trackPerformance(
        createPerformanceRecord({
          operation: "interruptedSessionRecovery",
          durationMs: 0,
          itemCount: snapshot.completedAngleCount,
          notes: ["Recovered non-raw capture metadata only; raw images are not restored."]
        })
      );
      setCaptureRecoveryNotice(
        `Recovered metadata for ${snapshot.completedAngleCount} of ${snapshot.totalAngleCount} capture angles from a previous browser session. Raw images are not restored; retake or re-upload any needed angle before continuing.`
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    function updateRecoveryStatus() {
      setOfflineRecoveryStatus(
        createOfflineRecoveryStatus({
          browserOnline: navigator.onLine,
          externalResources: {
            "Production catalog runtime": catalogRuntimeError ? "unavailable" : catalogRuntimeStatus ? "available" : "unknown"
          }
        })
      );
    }
    updateRecoveryStatus();
    window.addEventListener("online", updateRecoveryStatus);
    window.addEventListener("offline", updateRecoveryStatus);
    return () => {
      window.removeEventListener("online", updateRecoveryStatus);
      window.removeEventListener("offline", updateRecoveryStatus);
    };
  }, [catalogRuntimeError, catalogRuntimeStatus]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function handlePopState() {
      const nextScreen = getScreenFromHash(window.location.hash) ?? "welcome";
      if (nextScreen === "home" && !hasRequiredCaptureConsent(consentState)) {
        setScreen("consent");
        return;
      }
      setScreen(nextScreen);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [consentState]);

  function commitScreen(nextScreen: AppScreen, replace = false) {
    setScreen(nextScreen);
    if (typeof window !== "undefined") {
      const nextUrl = `${window.location.pathname}${window.location.search}${toScreenHash(nextScreen)}`;
      if (replace) {
        window.history.replaceState({ screen: nextScreen }, "", nextUrl);
      } else if (window.location.hash !== toScreenHash(nextScreen)) {
        window.history.pushState({ screen: nextScreen }, "", nextUrl);
      }
    }
  }

  function navigate(nextScreen: AppScreen) {
    if (nextScreen === "home" && !canEnterHome(consentReady)) {
      commitScreen("consent");
      return;
    }
    if (nextScreen === "refinement" && screen !== "refinement") {
      trackAnalytics("refinementStarted", { catalogVersionID: productionCatalogManifest.catalogVersion.identifier });
    }
    commitScreen(nextScreen);
  }

  function markBuddyTrialScanCompleteIfPresent() {
    if (typeof window === "undefined") return;
    const inviteId = getBuddyTrialInviteIdFromLocation();
    if (!inviteId || getBuddyTrialInvite(inviteId).status !== "active") return;
    markBuddyTrialScanCompleteInStorage({
      inviteId,
      productionCatalogRecordCount: productionCatalogManifest.items.length,
      betaResearchEnabled: true,
      ownerReviewDemoEnabled,
      storage: window.localStorage
    });
    trackPerformance(
      createPerformanceRecord({
        operation: "interruptedSessionRecovery",
        durationMs: 0,
        itemCount: 1,
        notes: ["Marked Buddy Trial scan complete from existing guided capture continue action; no raw face media stored."]
      })
    );
  }

  function handleGuidedCaptureCancelled(cancelledSession: ActiveCaptureSession) {
    privacyStore.deleteCurrentSession();
    privacyStore.recordDeletionCompletion("active-capture-session");
    setDeletionRecorded(true);
    setSession(cancelledSession);
    setStandardProfile(null);
    setLatestMatches([]);
    setLatestMatchingError(null);
    refreshPrivacyState();
  }

  function handleGuidedCaptureContinue() {
    markBuddyTrialScanCompleteIfPresent();
    if (buddyTrialCustomerScanMode && buddyTrialInviteId && typeof window !== "undefined") {
      window.location.assign(`/trial/${encodeURIComponent(buddyTrialInviteId)}`);
      return;
    }
    navigate("attributes");
  }

  function refreshPrivacyState() {
    setPrivacyRevision((value) => value + 1);
  }

  const trackPerformance = useCallback(
    (record: PerformanceMetricRecord) => {
      performanceMonitor.record(record);
      setPerformanceRevision((value) => value + 1);
    },
    [performanceMonitor]
  );

  function trackAnalytics(name: AnalyticsEventName, payload: AnalyticsPayload = {}) {
    const result = analytics.track(name, payload);
    if (result.ok) setAnalyticsRevision((value) => value + 1);
  }

  function refreshSavedProfileState() {
    setSavedProfiles(savedProfileStorage.listProfileSummaries());
    setSavedProfileStatus(savedProfileStorage.getStatus());
  }

  function handleConsentChange(nextConsent: ConsentState) {
    if (!consentState.cameraUse.granted && nextConsent.cameraUse.granted) {
      trackAnalytics("permissionAccepted", { permissionKind: "camera", permissionOutcome: "accepted" });
    }
    if (!consentState.currentFaceAnalysis.granted && nextConsent.currentFaceAnalysis.granted) {
      trackAnalytics("permissionAccepted", { permissionKind: "currentFaceAnalysis", permissionOutcome: "accepted" });
    }
    if (!consentState.temporaryProcessing.granted && nextConsent.temporaryProcessing.granted) {
      trackAnalytics("permissionAccepted", { permissionKind: "temporaryProcessing", permissionOutcome: "accepted" });
    }
    setConsentState(nextConsent);
    privacyStore.saveConsentState(nextConsent);
    refreshPrivacyState();
  }

  function revokeOptionalConsent(consentID: ConsentID) {
    const nextConsent = updateConsent(consentState, consentID, false);
    setConsentState(nextConsent);
    privacyStore.saveConsentState(nextConsent);
    applyConsentRevocationRetention(consentID);
    refreshPrivacyState();
  }

  function recordRetentionActions(actions: RetentionAction[]) {
    revokeObjectUrls(actions.flatMap((action) => action.objectUrlsToRevoke));
    actions.forEach((action) => privacyStore.recordDeletionCompletion(action.deletionAuditScope));
    if (actions.length > 0) setDeletionRecorded(true);
  }

  function applyConsentRevocationRetention(consentID: ConsentID) {
    const actions = createConsentRevocationRetentionPlan(consentID);
    actions.forEach((action) => {
      if (action.scope === "saved-profiles") {
        savedProfileStorage.deleteAllProfiles();
        privacyStore.deleteDerivedProfile();
        refreshSavedProfileState();
      }
      if (action.scope === "saved-builds") privacyStore.deleteSavedBuilds();
      if (action.scope === "screenshot-session") {
        const mutation = deleteScreenshotRefinementSession(screenshotSession);
        revokeObjectUrls(mutation.objectUrlsToRevoke);
        setScreenshotSession(mutation.session);
        privacyStore.deleteScreenshotSession();
      }
    });
    recordRetentionActions(actions);
  }

  function handleSessionChange(nextSession: typeof session) {
    const previousCompletedAngles = session.angles.filter((angle) => angle.status === "complete").length;
    const nextCompletedAngles = nextSession.angles.filter((angle) => angle.status === "complete").length;
    if (nextCompletedAngles < previousCompletedAngles) {
      trackAnalytics("retake", { captureMode: "webRgbGuided", completedAngleCount: nextCompletedAngles, requiredAngleCount: nextSession.angles.length });
    }
    if (nextCompletedAngles === nextSession.angles.length && previousCompletedAngles < session.angles.length) {
      trackAnalytics("captureCompleted", {
        captureMode: "webRgbGuided",
        captureSource: inferCaptureSource(nextSession),
        completedAngleCount: nextCompletedAngles,
        requiredAngleCount: nextSession.angles.length,
        usedUploadFallback: nextSession.angles.some((angle) => angle.source === "upload")
      });
    }
    const invalidAngles = nextSession.angles.filter((angle) => angle.validationErrors.length > 0 || angle.validationStatus === "invalid");
    if (invalidAngles.length > 0) {
      trackAnalytics("qualityFailureCategory", {
        captureMode: "webRgbGuided",
        qualityFailureCategory: classifyQualityFailure(invalidAngles.flatMap((angle) => angle.validationErrors)),
        failedAngleCount: invalidAngles.length
      });
    }
    trackPerformance(
      createPerformanceRecord({
        operation: "memoryUsage",
        memoryBytes: estimateTemporaryImageMemoryBytes(nextSession.angles.flatMap((angle) => (angle.image ? [angle.image] : []))),
        itemCount: nextSession.angles.filter((angle) => Boolean(angle.image)).length,
        notes: ["Estimated active capture-image memory from metadata; raw image bytes are not stored in the metric."]
      })
    );
    setSession(nextSession);
    privacyStore.setCurrentSessionImages(nextSession.angles.flatMap((angle) => (angle.image ? [angle.image] : [])));
    if (typeof window !== "undefined") {
      const recoveryStore = createCaptureRecoveryStore(window.sessionStorage);
      if (nextSession.angles.some((angle) => angle.status !== "empty" || angle.validationErrors.length > 0)) {
        recoveryStore.save(createCaptureRecoverySnapshot(nextSession));
      } else {
        recoveryStore.clear();
      }
    }
    refreshPrivacyState();
  }

  function deleteCurrentSession() {
    const startedAt = typeof performance === "undefined" ? Date.now() : performance.now();
    trackAnalytics("deletionRequested", { deletionScope: "activeCaptureSession" });
    revokeObjectUrls(session.angles.flatMap((angle) => (angle.image?.objectUrl ? [angle.image.objectUrl] : [])));
    if (typeof window !== "undefined") createCaptureRecoveryStore(window.sessionStorage).clear();
    privacyStore.deleteCurrentSession();
    setSession(createInitialCaptureSession());
    setAttributeConfirmation(createInitialAttributeConfirmation());
    setStandardProfile(null);
    setLatestMatches([]);
    setLatestMatchingError(null);
    setProfileSaveStatusMessage(null);
    setProfileSaveErrorMessage(null);
    setCaptureRecoveryNotice(null);
    privacyStore.recordDeletionCompletion("active-capture-session");
    trackAnalytics("deletionCompleted", { deletionScope: "activeCaptureSession" });
    trackPerformance(
      createPerformanceRecord({
        operation: "failureRecovery",
        durationMs: (typeof performance === "undefined" ? Date.now() : performance.now()) - startedAt,
        notes: ["Deleted active capture session, temporary references, and recovery metadata."]
      })
    );
    setDeletionRecorded(true);
    refreshPrivacyState();
  }

  function deleteTemporaryImages() {
    trackAnalytics("deletionRequested", { deletionScope: "temporaryImages" });
    revokeObjectUrls(session.angles.flatMap((angle) => (angle.image?.objectUrl ? [angle.image.objectUrl] : [])));
    if (typeof window !== "undefined") createCaptureRecoveryStore(window.sessionStorage).clear();
    privacyStore.deleteTemporaryImages();
    setSession(createInitialCaptureSession());
    privacyStore.recordDeletionCompletion("temporary-images");
    trackAnalytics("deletionCompleted", { deletionScope: "temporaryImages" });
    setDeletionRecorded(true);
    refreshPrivacyState();
  }

  function deleteDerivedProfile() {
    trackAnalytics("deletionRequested", { deletionScope: "derivedProfile" });
    privacyStore.deleteDerivedProfile(standardProfile?.id);
    setStandardProfile(null);
    setLatestMatches([]);
    setLatestMatchingError(null);
    setProfileSaveStatusMessage(null);
    setProfileSaveErrorMessage(null);
    privacyStore.recordDeletionCompletion("derived-profile");
    trackAnalytics("deletionCompleted", { deletionScope: "derivedProfile" });
    trackAnalytics("profileDeleted", { deletionScope: "derivedProfile" });
    setDeletionRecorded(true);
    refreshPrivacyState();
  }

  function deleteSavedBuild(buildID: string) {
    trackAnalytics("deletionRequested", { deletionScope: "savedBuild" });
    privacyStore.deleteSavedBuild(buildID);
    privacyStore.recordDeletionCompletion("saved-build");
    trackAnalytics("deletionCompleted", { deletionScope: "savedBuild" });
    setDeletionRecorded(true);
    refreshPrivacyState();
  }

  function deleteAllSavedBuilds() {
    trackAnalytics("deletionRequested", { deletionScope: "savedBuild" });
    privacyStore.deleteSavedBuilds();
    privacyStore.recordDeletionCompletion("saved-builds");
    trackAnalytics("deletionCompleted", { deletionScope: "savedBuild" });
    setDeletionRecorded(true);
    refreshPrivacyState();
  }

  function deleteSavedProfile(profileID: string) {
    trackAnalytics("deletionRequested", { deletionScope: "savedProfile" });
    savedProfileStorage.deleteProfile(profileID);
    privacyStore.deleteDerivedProfile(profileID);
    privacyStore.recordDeletionCompletion("saved-profile");
    trackAnalytics("deletionCompleted", { deletionScope: "savedProfile" });
    trackAnalytics("profileDeleted", { deletionScope: "savedProfile" });
    setDeletionRecorded(true);
    refreshSavedProfileState();
    refreshPrivacyState();
  }

  function deleteAllSavedProfiles() {
    trackAnalytics("deletionRequested", { deletionScope: "savedProfile" });
    savedProfileStorage.deleteAllProfiles();
    privacyStore.deleteDerivedProfile();
    privacyStore.recordDeletionCompletion("saved-profiles");
    trackAnalytics("deletionCompleted", { deletionScope: "savedProfile" });
    setDeletionRecorded(true);
    refreshSavedProfileState();
    refreshPrivacyState();
  }

  function deleteScreenshotSessionData() {
    trackAnalytics("deletionRequested", { deletionScope: "screenshotSession" });
    const mutation = deleteScreenshotRefinementSession(screenshotSession);
    revokeObjectUrls(mutation.objectUrlsToRevoke);
    privacyStore.deleteScreenshotSession();
    setScreenshotSession(mutation.session);
    privacyStore.recordDeletionCompletion("screenshot-session");
    trackAnalytics("deletionCompleted", { deletionScope: "screenshotSession" });
    setDeletionRecorded(true);
    refreshPrivacyState();
  }

  function deleteAllLocalData() {
    const startedAt = typeof performance === "undefined" ? Date.now() : performance.now();
    trackAnalytics("deletionRequested", { deletionScope: "allLocalData" });
    revokeObjectUrls([
      ...session.angles.flatMap((angle) => (angle.image?.objectUrl ? [angle.image.objectUrl] : [])),
      ...screenshotSession.slots.flatMap((slot) => (slot.screenshot?.objectUrl ? [slot.screenshot.objectUrl] : []))
    ]);
    if (typeof window !== "undefined") createCaptureRecoveryStore(window.sessionStorage).clear();
    privacyStore.deleteAllLocalData();
    savedProfileStorage.deleteAllProfiles();
    setSession(createInitialCaptureSession());
    setAttributeConfirmation(createInitialAttributeConfirmation());
    setStandardProfile(null);
    setScreenshotSession(createInitialScreenshotRefinementSession());
    setConsentState(createInitialConsentState());
    setSavedProfiles([]);
    setSavedProfileStatus(savedProfileStorage.getStatus());
    setLatestMatches([]);
    setLatestMatchingError(null);
    setProfileSaveStatusMessage(null);
    setProfileSaveErrorMessage(null);
    setCaptureRecoveryNotice(null);
    setDeletionRecorded(true);
    trackAnalytics("deletionCompleted", { deletionScope: "allLocalData" });
    trackPerformance(
      createPerformanceRecord({
        operation: "failureRecovery",
        durationMs: (typeof performance === "undefined" ? Date.now() : performance.now()) - startedAt,
        notes: ["Deleted all local app data and reset in-memory state."]
      })
    );
    refreshPrivacyState();
  }

  function deleteByScope(scope: DeletionScope) {
    if (scope === "active-capture-session") deleteCurrentSession();
    if (scope === "raw-videos") {
      privacyStore.recordDeletionCompletion("raw-videos");
      setDeletionRecorded(true);
      refreshPrivacyState();
    }
    if (scope === "rejected-frames") {
      privacyStore.recordDeletionCompletion("rejected-frames");
      setDeletionRecorded(true);
      refreshPrivacyState();
    }
    if (scope === "temporary-images") deleteTemporaryImages();
    if (scope === "derived-profile") deleteDerivedProfile();
    if (scope === "saved-profiles") deleteAllSavedProfiles();
    if (scope === "saved-builds") deleteAllSavedBuilds();
    if (scope === "screenshot-session") deleteScreenshotSessionData();
    if (scope === "diagnostic-logs") {
      privacyStore.recordDeletionCompletion("diagnostic-logs");
      setDeletionRecorded(true);
      refreshPrivacyState();
    }
    if (scope === "application-preferences") {
      privacyStore.deleteApplicationPreferences();
      privacyStore.recordDeletionCompletion("application-preferences");
      setDeletionRecorded(true);
      refreshPrivacyState();
    }
    if (scope === "all-local-data") deleteAllLocalData();
  }

  function createProfileFromCurrentSession() {
    const startedAt = typeof performance === "undefined" ? Date.now() : performance.now();
    const profile = measureSyncPerformance(
      "profileGeneration",
      () =>
        createStandardFaceProfile({
          session,
          attributes: attributeConfirmation,
          userAgent: typeof navigator === "undefined" ? undefined : navigator.userAgent
        }),
      trackPerformance,
      {
        itemCount: session.angles.length,
        notes: ["Generated StandardFaceProfile from local metadata, quality summaries, and user-confirmed attributes."]
      }
    );
    const retentionActions = createProfileCreationRetentionPlan(session);
    const retainedSession = removeRawImagesFromCaptureSession(session);
    setStandardProfile(profile);
    setLatestMatches([]);
    setLatestMatchingError(null);
    setSession(retainedSession);
    privacyStore.deleteTemporaryImages();
    if (typeof window !== "undefined") {
      createCaptureRecoveryStore(window.sessionStorage).save(createCaptureRecoverySnapshot(retainedSession));
    }
    recordRetentionActions(retentionActions);
    const endedAt = typeof performance === "undefined" ? Date.now() : performance.now();
    trackAnalytics("latencyRecorded", { latencyOperation: "profileCreation", latencyMs: Math.round(Math.max(endedAt - startedAt, 0)) });
    setProfileSaveStatusMessage(null);
    setProfileSaveErrorMessage(null);
    refreshPrivacyState();
    navigate("profile-review");
  }

  async function saveCurrentProfile() {
    if (!standardProfile) {
      setProfileSaveErrorMessage("Create a profile before saving.");
      return;
    }
    if (!isConsentGranted(consentState, "saveDerivedProfile")) {
      setProfileSaveErrorMessage("Enable the separate save-derived-profile consent before saving.");
      return;
    }
    const result = await savedProfileStorage.saveProfile(standardProfile);
    if (result.ok && result.summary) {
      privacyStore.saveDerivedProfile(standardProfile);
      trackAnalytics("buildSaved", { saveTarget: "derivedProfile", profileSaved: true });
      setProfileSaveStatusMessage(
        `Saved non-image profile ${result.summary.profileID} locally with ${result.summary.encryptionStatus === "encrypted" ? "WebCrypto encryption" : "session-only fallback storage"}.`
      );
      setProfileSaveErrorMessage(null);
    } else {
      trackAnalytics("errorOccurred", { errorCategory: "saveFailure" });
      setProfileSaveStatusMessage(null);
      setProfileSaveErrorMessage(result.error ?? "Profile could not be saved locally.");
    }
    refreshSavedProfileState();
    refreshPrivacyState();
  }

  function startOver() {
    deleteCurrentSession();
    setAttributeConfirmation(createInitialAttributeConfirmation());
    navigate("start");
  }

  const content = (() => {
    switch (screen) {
      case "welcome":
        return (
          <WelcomeFaceIDStyleScreen onGetStarted={() => navigate("preparation")} />
        );
      case "product":
        return (
          <InfoScreen
            eyebrow="Product explanation"
            title="Closest available settings, not a face import"
            body={PRODUCT_EXPLANATION}
            detail="The web MVP helps you collect consistent RGB reference images and then fails closed until a verified College Football 27 catalog exists."
            actionLabel="Continue to disclaimer"
            onAction={() => navigate(getNextOnboardingScreen("product", consentReady))}
          />
        );
      case "disclaimer":
        return (
          <InfoScreen
            eyebrow="Independent-app disclaimer"
            title="Independent companion"
            body={INDEPENDENT_APP_DISCLAIMER}
            detail="GameFace Match provides manual guidance only. It does not control a console, modify game files, or access hidden game assets."
            actionLabel="I understand"
            onAction={() => navigate(getNextOnboardingScreen("disclaimer", consentReady))}
          />
        );
      case "privacy":
        return (
          <InfoScreen
            eyebrow="Privacy summary"
            title="Privacy summary"
            body="The first web prototype keeps capture images in the active browser session only, does not upload face images, does not identify people, and stores saved builds locally only when a user chooses to save derived results."
            detail="Raw face images are not written to localStorage. You can delete the current session or all local app data from the privacy center."
            actionLabel="Continue"
            onAction={() => navigate(getNextOnboardingScreen("privacy", consentReady))}
          />
        );
      case "consent":
        return (
          <ConsentPanel
            consentState={consentState}
            onConsentChange={handleConsentChange}
            onContinue={() => {
              trackAnalytics("onboardingCompleted", { onboardingStepCount: 5 });
              navigate("home");
            }}
          />
        );
      case "home":
        return <Dashboard completedAngles={completedAngles} requiredAngles={requiredAngles} onNavigate={navigate} />;
      case "start":
        return (
          <ScanEntryScreen
            consentState={consentState}
            onConsentChange={handleConsentChange}
            catalogAvailable={!catalogIsEmpty}
            environment={scanEntryEnvironment}
            previewModeEnabled={scanEntryPreviewModeEnabled}
            ownerReviewBuddyTrialReady={false}
            privateBetaInviteMode={privateBetaInviteMode}
            onAnalytics={trackAnalytics}
            onCancel={() => navigate("home")}
            onReadyToPrepare={() => {
              trackAnalytics("captureStarted", { captureMode: "webRgbGuided", requiredAngleCount: requiredAngles });
              navigate("preparation");
            }}
          />
        );
      case "preparation":
        return (
          <GuidedCaptureFlow
            session={session}
            cameraService={cameraService}
            customerMode
            autoStartCamera
            onSessionChange={handleSessionChange}
            onPerformanceRecord={trackPerformance}
            onCancelSession={handleGuidedCaptureCancelled}
            onClose={() => navigate("home")}
            onContinue={handleGuidedCaptureContinue}
          />
        );
      case "lighting":
        return <CaptureLightingCheck onContinue={() => navigate("capability")} />;
      case "capability":
        return <BrowserCapabilityPanel cameraService={cameraService} onContinue={() => navigate("capture")} />;
      case "capture":
        return (
          <GuidedCaptureFlow
            session={session}
            cameraService={cameraService}
            customerMode={buddyTrialCustomerScanMode}
            onSessionChange={handleSessionChange}
            onPerformanceRecord={trackPerformance}
            onCancelSession={handleGuidedCaptureCancelled}
            onClose={() => navigate("home")}
            onContinue={handleGuidedCaptureContinue}
          />
        );
      case "attributes":
        return (
          <AttributeConfirmation
            value={attributeConfirmation}
            onChange={setAttributeConfirmation}
            onConfirm={createProfileFromCurrentSession}
          />
        );
      case "profile-review":
        return (
          <ProfileReview
            profile={standardProfile}
            onBack={() => navigate("attributes")}
            onContinue={() => navigate("processing")}
            canSaveProfile={isConsentGranted(consentState, "saveDerivedProfile")}
            onSaveProfile={saveCurrentProfile}
            saveStatusMessage={profileSaveStatusMessage}
            saveErrorMessage={profileSaveErrorMessage}
          />
        );
      case "processing":
        return (
          <InfoScreen
            eyebrow="Processing"
            title="Processing"
            body="The app has created a local standardized profile from capture metadata, local RGB landmark measurements where defensible, quality checks, and user-confirmed attributes. It does not identify people, infer sensitive traits, or claim TrueDepth-level geometry."
            detail={CATALOG_UNAVAILABLE_MESSAGE}
            actionLabel="View results"
            onAction={() => {
              const matchingStartedAt = typeof performance === "undefined" ? Date.now() : performance.now();
              const activeManifest = catalogRuntimeStatus?.manifest ?? productionCatalogManifest;
              const nextMatches =
                standardProfile && !catalogIsEmpty && !catalogRuntimeError
                  ? matchingEngine.matchTopThree({
                      profile: standardProfile,
                      catalog: activeManifest,
                      limit: 3
                    })
                  : [];
              setLatestMatches(nextMatches);
              setLatestMatchingError(!catalogIsEmpty && !catalogRuntimeError && standardProfile && nextMatches.length === 0 ? CATALOG_UNAVAILABLE_MESSAGE : null);
              trackAnalytics("resultGenerated", {
                resultOutcome: catalogIsEmpty ? "unavailable" : catalogRuntimeError || nextMatches.length === 0 ? "error" : "success",
                resultBlockReason: catalogIsEmpty ? "catalogUnavailable" : catalogRuntimeError || nextMatches.length === 0 ? "matchingError" : undefined,
                catalogVersionID: productionCatalogManifest.catalogVersion.identifier,
                catalogRecordCount: catalogRuntimeStatus?.manifest.items.length ?? productionCatalogManifest.items.length,
                recommendationCount: nextMatches.length
              });
              if (catalogIsEmpty) {
                trackAnalytics("catalogUnavailable", {
                  resultBlockReason: "catalogUnavailable",
                  catalogVersionID: productionCatalogManifest.catalogVersion.identifier,
                  catalogRecordCount: 0
                });
                trackAnalytics("resultBlocked", {
                  resultBlockReason: "catalogUnavailable",
                  catalogVersionID: productionCatalogManifest.catalogVersion.identifier,
                  catalogRecordCount: 0
                });
              }
              trackPerformance(
                createPerformanceRecord({
                  operation: "matchingLatency",
                  durationMs: (typeof performance === "undefined" ? Date.now() : performance.now()) - matchingStartedAt,
                  itemCount: catalogRuntimeStatus?.manifest.items.length ?? productionCatalogManifest.items.length,
                  notes: [
                    catalogIsEmpty
                      ? "Recommendation gate failed closed because the verified production catalog is empty."
                      : "Recommendation gate and matching path evaluated against the current production catalog."
                  ]
                })
              );
              navigate("results");
            }}
            loading
          />
        );
      case "results":
        return (
          <ResultsExperience
            profile={standardProfile}
            catalogIsEmpty={catalogIsEmpty}
            matches={latestMatches}
            errorMessage={catalogRuntimeError ?? latestMatchingError}
            catalogVersionID={productionCatalogManifest.catalogVersion.identifier}
            catalogVerificationDate={productionCatalogManifest.catalogVersion.verifiedAt}
            catalogRecordCount={catalogRuntimeStatus?.manifest.items.length ?? productionCatalogManifest.items.length}
            catalogStatusMessage={catalogRuntimeError ?? catalogRuntimeStatus?.integrity.message ?? "Catalog status pending."}
            catalogStalenessMessage={catalogRuntimeStatus?.staleness.message}
            onStartOver={startOver}
            onRetryCatalog={() => navigate("catalog")}
            canSaveBuild={isConsentGranted(consentState, "saveCompletedBuild")}
            onSaveBuild={(match) =>
              {
                const buildInstructions = createBuildInstructions(match);
                trackAnalytics("buildSaved", {
                  saveTarget: "completedBuild",
                  catalogVersionID: match.catalogVersion.identifier,
                  recommendationCount: 1,
                  buildGuideStepCount: buildInstructions.length
                });
                privacyStore.saveBuild({
                id: `saved-build-${new Date().toISOString()}`,
                createdAt: new Date().toISOString(),
                profileVersion: standardProfile?.profileVersion ?? "unknown",
                match,
                buildInstructions,
                catalogVersion: match.catalogVersion
                });
                refreshPrivacyState();
              }
            }
            onDeleteResult={() => setStandardProfile(null)}
            onTopThreeViewed={(matchCount) =>
              trackAnalytics("topThreeViewed", {
                resultOutcome: "success",
                recommendationCount: matchCount,
                topThreeVisible: matchCount > 0,
                catalogVersionID: productionCatalogManifest.catalogVersion.identifier
              })
            }
            onRecommendationSelected={(rank) => trackAnalytics("recommendationSelected", { selectedRecommendationRank: rank })}
            onBuildGuideUsed={(stepCount) => trackAnalytics("buildGuideUsed", { buildGuideStepCount: stepCount })}
          />
        );
      case "catalog":
        return <GameCatalogStatus />;
      case "fc26":
        return <Fc26FaceMatchingMvp />;
      case "audit":
        return isDevelopment && DevelopmentCatalogAuditInspector ? <DevelopmentCatalogAuditInspector manifest={productionCatalogManifest} /> : <GameCatalogStatus />;
      case "evidence-gallery":
        return isDevelopment && DevelopmentEvidenceGallery ? <DevelopmentEvidenceGallery /> : <GameCatalogStatus />;
      case "video-inspector":
        return isDevelopment && DevelopmentSourceVideoEvidenceInspector ? <DevelopmentSourceVideoEvidenceInspector /> : <GameCatalogStatus />;
      case "phase-0":
        return isDevelopment && DevelopmentPhase0Status ? <DevelopmentPhase0Status /> : <GameCatalogStatus />;
      case "manual-study":
        return isDevelopment && DevelopmentManualMatchingStudyDashboard ? <DevelopmentManualMatchingStudyDashboard /> : <GameCatalogStatus />;
      case "matching-lab":
        return isDevelopment && DevelopmentMatchingLab ? <DevelopmentMatchingLab /> : <GameCatalogStatus />;
      case "mobile-qa":
        return isDevelopment && DevelopmentMobileQAStatus ? <DevelopmentMobileQAStatus /> : <GameCatalogStatus />;
      case "analytics":
        return isDevelopment && DevelopmentAnalyticsDashboard ? (
          <DevelopmentAnalyticsDashboard events={analytics.getLocalEvents()} key={analyticsRevision} />
        ) : (
          <GameCatalogStatus />
        );
      case "performance":
        return isDevelopment && DevelopmentPerformanceDashboard ? (
          <DevelopmentPerformanceDashboard records={performanceMonitor.getRecords()} key={performanceRevision} />
        ) : (
          <GameCatalogStatus />
        );
      case "saved":
        return <SavedBuildsEmpty savedBuilds={savedBuilds} onDeleteSavedBuild={deleteSavedBuild} />;
      case "refinement":
        return (
          <ScreenshotRefinementEntry
            session={screenshotSession}
            profile={standardProfile}
            rankedMatches={latestMatches}
            currentMatch={latestMatches[0] ?? null}
            onSessionChange={(nextSession) => {
              setScreenshotSession(nextSession);
              privacyStore.setScreenshotSessionImages(nextSession.slots.flatMap((slot) => (slot.screenshot ? [slot.screenshot] : [])));
              refreshPrivacyState();
            }}
            onSessionDeleted={() => {
              privacyStore.recordDeletionCompletion("screenshot-session");
              setDeletionRecorded(true);
              refreshPrivacyState();
            }}
            onRefinementCompleted={(completedSession, result) => {
              const startedAt = typeof performance === "undefined" ? Date.now() : performance.now();
              const retentionActions = createRefinementCompletionRetentionPlan(completedSession);
              const mutation = deleteScreenshotRefinementSession(completedSession);
              setScreenshotSession(mutation.session);
              privacyStore.deleteScreenshotSession();
              recordRetentionActions(retentionActions);
              trackAnalytics("refinementCompleted", { refinementOutcome: refinementAnalyticsOutcome(result) });
              trackPerformance(
                createPerformanceRecord({
                  operation: "screenshotRefinement",
                  durationMs: (typeof performance === "undefined" ? Date.now() : performance.now()) - startedAt,
                  memoryBytes: estimateTemporaryImageMemoryBytes(completedSession.slots.flatMap((slot) => (slot.screenshot ? [slot.screenshot] : []))),
                  itemCount: completedSession.slots.filter((slot) => Boolean(slot.screenshot)).length,
                  notes: ["Completed local screenshot-refinement scaffold and deleted screenshot session data."]
                })
              );
              refreshPrivacyState();
            }}
          />
        );
      case "pricing":
        return <PricingScaffold catalogIsEmpty={catalogIsEmpty} />;
      case "privacy-center":
        return (
          <PrivacyCenter
            inventory={privacyInventory}
            deletionRecords={deletionRecords}
            savedBuilds={savedBuilds}
            savedProfiles={savedProfiles}
            savedProfileStatus={
              savedProfileStatus ??
              ({
                storageLocation: "memory",
                encryptionAvailable: false,
                encryptionDescription: "Saved profile storage status is loading.",
                storedProfileCount: savedProfiles.length,
                unreadableProfileCount: 0,
                lastError: null
              } satisfies SavedProfileStorageStatus)
            }
            consentState={consentState}
            nonRawExportJson={nonRawExportJson}
            deletionRecorded={deletionRecorded}
            onDeleteScope={deleteByScope}
            onDeleteSavedBuild={deleteSavedBuild}
            onDeleteSavedProfile={deleteSavedProfile}
            onRevokeOptionalConsent={revokeOptionalConsent}
          />
        );
      case "settings":
        return <SettingsPanel />;
    }
  })();

  return (
    <AppShell
      navItems={navItems}
      mobileNavItems={MOBILE_NAV_ITEMS}
      activeScreen={screen}
      onNavigate={navigate}
      completedAngles={completedAngles}
      requiredAngles={requiredAngles}
      showDevelopmentCatalogBanner={shouldShowDevelopmentCatalogBanner(process.env.NODE_ENV, catalogIsEmpty)}
      immersive={immersiveSetupScreen}
    >
      <div className="sr-only" role="status" aria-live="polite">
        Current screen: {screen}. {completedAngles} of {requiredAngles} capture angles completed.
      </div>
      {captureRecoveryNotice ? (
        <Alert title="Capture recovery" tone="warning" role="status">
          {captureRecoveryNotice} Draft recovery is not production-ready.
        </Alert>
      ) : null}
      {offlineRecoveryStatus && (!offlineRecoveryStatus.browserOnline || catalogRuntimeError) ? (
        <Alert title="Offline and external-resource status" tone="warning" role="status">
          {offlineRecoveryStatus.messages.map((message) => message.message).join(" ")}
        </Alert>
      ) : null}
      {stepFlowProgress.isInStepFlow && !immersiveSetupScreen ? (
        <div className="flow-layout">
          <StepFlowRail steps={STEP_FLOW_DETAILS} activeScreen={screen} onNavigate={navigate} />
          <div>{content}</div>
        </div>
      ) : (
        content
      )}
    </AppShell>
  );
}

function revokeObjectUrls(objectUrls: string[]) {
  objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
}

function inferCaptureSource(session: ActiveCaptureSession) {
  const sources = new Set(session.angles.map((angle) => angle.source ?? angle.image?.source ?? "unknown"));
  if (sources.has("camera") && sources.has("upload")) return "mixed";
  if (sources.has("camera")) return "camera";
  if (sources.has("upload")) return "upload";
  return "unknown";
}

function classifyQualityFailure(errors: string[]) {
  const joined = errors.join(" ").toLowerCase();
  if (joined.includes("missing") || joined.includes("required")) return "missingRequiredAngle";
  if (joined.includes("format") || joined.includes("type") || joined.includes("heic") || joined.includes("heif")) return "unsupportedFormat";
  if (joined.includes("decode") || joined.includes("readable") || joined.includes("unreadable")) return "unreadableImage";
  if (joined.includes("small") || joined.includes("dimension")) return "imageTooSmall";
  if (joined.includes("large") || joined.includes("12 mb") || joined.includes("size")) return "imageTooLarge";
  if (joined.includes("duplicate")) return "exactDuplicate";
  if (joined.includes("light") || joined.includes("dark") || joined.includes("shadow") || joined.includes("exposed")) return "poorLighting";
  if (joined.includes("blur")) return "blur";
  if (joined.includes("multiple")) return "multipleFaces";
  if (joined.includes("face not found") || joined.includes("no face")) return "faceNotFound";
  if (joined.includes("confirm")) return "manualConfirmationMissing";
  return "unknown";
}

function refinementAnalyticsOutcome(result: RefinementResult) {
  if (result.status === "unavailable") return "unavailable";
  if (result.status === "invalidScreenshot") return "cancelled";
  return "completedWithLimitations";
}

function WelcomeFaceIDStyleScreen({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="face-id-welcome-screen" aria-labelledby="welcome-title">
      <h1 id="welcome-title" className="face-id-welcome-title">
        Quick Scan to put you in the game
      </h1>

      <div className="face-id-scan-illustration" aria-hidden="true">
        <div className="face-id-dotted-ring" />
        <svg className="face-id-smile-icon" viewBox="0 0 140 124" role="img" aria-label="">
          <ellipse cx="70" cy="62" rx="50" ry="49" />
          <path d="M44 54v13" />
          <path d="M96 54v13" />
          <path d="M70 52v26" />
          <path d="M47 84c10 16 36 16 46 0" />
        </svg>
      </div>

      <div className="face-id-welcome-instructions">
        <h2>How your quick scan works</h2>
        <p>
          Position your face in the camera frame. Then slowly move your head in a circle so we can capture the angles needed to build your closest
          in-game look.
        </p>
      </div>

      <button className="face-id-welcome-button" type="button" onClick={onGetStarted}>
        Get Started
      </button>
    </section>
  );
}

function Dashboard({
  completedAngles,
  requiredAngles,
  onNavigate
}: {
  completedAngles: number;
  requiredAngles: number;
  onNavigate: (screen: AppScreen) => void;
}) {
  const cards: Array<{ title: string; body: string; action: string; target: AppScreen; tone?: "neutral" | "warning" | "info" }> = [
    {
      title: "Start a face match",
      body: "Guided RGB capture with a manual upload fallback for every required angle.",
      action: "Start",
      target: "start",
      tone: "info"
    },
    {
      title: "Browser capability",
      body: "Check camera support, permission state, secure context, and upload fallback.",
      action: "Check",
      target: "capability"
    },
    {
      title: "Game catalog status",
      body: CATALOG_UNAVAILABLE_MESSAGE,
      action: "View",
      target: "catalog"
    },
    {
      title: "EA SPORTS FC 26 recipe MVP",
      body: "Upload three reference photos, generate a local human-in-the-loop recipe, and compare FC 26 screenshots without mixing College Football data.",
      action: "Open FC 26",
      target: "fc26",
      tone: "info"
    },
    {
      title: "Saved builds",
      body: "No builds are saved until derived results are explicitly saved locally.",
      action: "Open",
      target: "saved"
    },
    {
      title: "Screenshot refinement",
      body: "Upload a created-player screenshot for local checks. Verified catalog matching is required before suggestions appear.",
      action: "Open",
      target: "refinement"
    },
    {
      title: "Privacy center",
      body: "Delete the active session, saved builds, or all local app data.",
      action: "Manage",
      target: "privacy-center"
    }
  ];

  return (
    <section className="screen-stack" aria-labelledby="home-title">
      <ScreenHeader eyebrow="Dashboard" title="Ready near your console" id="home-title">
        <p>
          Capture progress: {completedAngles} of {requiredAngles} required angles completed.
        </p>
      </ScreenHeader>
      <div className="card-grid">
        {cards.map((card) => (
          <Card className="action-card" tone={card.tone ?? "neutral"} key={card.title}>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
            <Button variant="secondary" onClick={() => onNavigate(card.target)}>
              {card.action}
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}

function InfoScreen({
  eyebrow,
  title,
  body,
  detail,
  actionLabel,
  onAction,
  loading = false
}: {
  eyebrow: string;
  title: string;
  body: string;
  detail: string;
  actionLabel: string;
  onAction: () => void;
  loading?: boolean;
}) {
  const titleId = `${title.replaceAll(" ", "-").toLowerCase()}-title`;
  return (
    <section className="screen-stack narrow" aria-labelledby={titleId}>
      <ScreenHeader eyebrow={eyebrow} title={title} id={titleId}>
        <p>{body}</p>
      </ScreenHeader>
      {loading ? <LoadingState label="Checking foundation state" /> : null}
      <Alert title={CATALOG_UNAVAILABLE_MESSAGE} tone="warning">
        {detail}
      </Alert>
      <Button onClick={onAction}>
        {loading ? "Continue when ready" : actionLabel}
      </Button>
    </section>
  );
}
