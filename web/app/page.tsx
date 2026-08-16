"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
import {
  createFallbackPostScanAvatarPreview,
  createPostScanGameAvatarPreview,
  type PostScanAvatarPreviewState
} from "@/lib/post-scan/avatar-preview";
import { createInitialScreenshotRefinementSession, deleteScreenshotRefinementSession } from "@/lib/refinement/screenshot-refinement";
import { createRuleBasedMatchingEngine } from "@/lib/matching/matching-engine";
import {
  GAME_SELECTION_TILES,
  createGameProfileContext,
  getGameSelectionTileByScreen,
  getSupportedGameDefinition,
  type GameSelectionScreenID,
  type GameSelectionTileDefinition,
  type GameSelectionTileID
} from "@/lib/adapters/game-registry";
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

function isPostScanGameScreen(screen: AppScreen): screen is GameSelectionScreenID {
  return (
    screen === "game-college-football-27" ||
    screen === "game-madden-nfl-26" ||
    screen === "game-nba-2k26" ||
    screen === "game-ea-sports-pga-tour" ||
    screen === "game-pba-pro-bowling-2026" ||
    screen === "game-ea-sports-fc-26"
  );
}

export default function HomePage() {
  const [screen, setScreen] = useState<AppScreen>("welcome");
  const [session, setSession] = useState(() => createInitialCaptureSession());
  const [attributeConfirmation, setAttributeConfirmation] = useState<AttributeConfirmationState>(() => createInitialAttributeConfirmation());
  const [standardProfile, setStandardProfile] = useState<StandardFaceProfile | null>(null);
  const [postScanAvatarPreview, setPostScanAvatarPreview] = useState<PostScanAvatarPreviewState | null>(null);
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
  const avatarPreviewSessionRef = useRef<string | null>(session.id);
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
  const immersiveSetupScreen =
    screen === "welcome" || screen === "start" || screen === "capture" || screen === "preparation" || screen === "game-selection" || isPostScanGameScreen(screen);

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
    avatarPreviewSessionRef.current = null;
    setPostScanAvatarPreview(null);
    setLatestMatches([]);
    setLatestMatchingError(null);
    refreshPrivacyState();
  }

  function handleGuidedCaptureContinue(completedSession: ActiveCaptureSession = session) {
    markBuddyTrialScanCompleteIfPresent();
    void createProfileFromCurrentSession("game-selection", completedSession);
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
    if (nextSession.angles.some((angle) => angle.status === "complete" && Boolean(angle.image?.objectUrl))) {
      avatarPreviewSessionRef.current = nextSession.id;
      void createPostScanGameAvatarPreview(nextSession).then((preview) => {
        if (avatarPreviewSessionRef.current === nextSession.id && preview.source === "scan") {
          setPostScanAvatarPreview(preview);
        }
      });
    }
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
    avatarPreviewSessionRef.current = null;
    setSession(createInitialCaptureSession());
    setAttributeConfirmation(createInitialAttributeConfirmation());
    setStandardProfile(null);
    setPostScanAvatarPreview(null);
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
    avatarPreviewSessionRef.current = null;
    setSession(createInitialCaptureSession());
    setPostScanAvatarPreview(null);
    privacyStore.recordDeletionCompletion("temporary-images");
    trackAnalytics("deletionCompleted", { deletionScope: "temporaryImages" });
    setDeletionRecorded(true);
    refreshPrivacyState();
  }

  function deleteDerivedProfile() {
    trackAnalytics("deletionRequested", { deletionScope: "derivedProfile" });
    privacyStore.deleteDerivedProfile(standardProfile?.id);
    setStandardProfile(null);
    avatarPreviewSessionRef.current = null;
    setPostScanAvatarPreview(null);
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
    avatarPreviewSessionRef.current = null;
    setSession(createInitialCaptureSession());
    setAttributeConfirmation(createInitialAttributeConfirmation());
    setStandardProfile(null);
    setPostScanAvatarPreview(null);
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

  async function createProfileFromCurrentSession(nextScreen: AppScreen = "profile-review", sourceSession: ActiveCaptureSession = session) {
    const startedAt = typeof performance === "undefined" ? Date.now() : performance.now();
    const avatarPreview = await createPostScanGameAvatarPreview(sourceSession);
    const profile = measureSyncPerformance(
      "profileGeneration",
      () =>
        createStandardFaceProfile({
          session: sourceSession,
          attributes: attributeConfirmation,
          userAgent: typeof navigator === "undefined" ? undefined : navigator.userAgent
        }),
      trackPerformance,
      {
        itemCount: sourceSession.angles.length,
        notes: ["Generated StandardFaceProfile from local metadata, quality summaries, and user-confirmed attributes."]
      }
    );
    const retentionActions = createProfileCreationRetentionPlan(sourceSession);
    const retainedSession = removeRawImagesFromCaptureSession(sourceSession);
    setStandardProfile(profile);
    setPostScanAvatarPreview(avatarPreview);
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
    navigate(nextScreen);
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
      case "game-selection":
        return (
          <PostScanGameSelectionScreen
            profile={standardProfile}
            avatarPreview={postScanAvatarPreview}
            onSelectGame={(tile) => {
              if (tile.gameID === "college-football-27") {
                trackAnalytics("recommendationSelected", { selectedRecommendationRank: 1, resultOutcome: "unavailable", resultBlockReason: "catalogUnavailable" });
              } else if (tile.gameID) {
                trackAnalytics("resultBlocked", { resultOutcome: "unavailable", resultBlockReason: "catalogUnavailable" });
              }
              navigate(tile.screenID);
            }}
          />
        );
      case "game-college-football-27":
      case "game-madden-nfl-26":
      case "game-nba-2k26":
      case "game-ea-sports-pga-tour":
      case "game-pba-pro-bowling-2026":
      case "game-ea-sports-fc-26":
        return (
          <PostScanGameFlowScreen
            tile={getGameSelectionTileByScreen(screen)}
            profile={standardProfile}
            catalogRecordCount={catalogRuntimeStatus?.manifest.items.length ?? productionCatalogManifest.items.length}
            catalogRuntimeError={catalogRuntimeError}
            onBackToGames={() => navigate("game-selection")}
            onStartScan={() => navigate("preparation")}
            onOpenCollegeFootballRecommendation={() => navigate("processing")}
          />
        );
      case "attributes":
        return (
          <AttributeConfirmation
            value={attributeConfirmation}
            onChange={setAttributeConfirmation}
            onConfirm={() => void createProfileFromCurrentSession()}
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

function PostScanGameSelectionScreen({
  profile,
  avatarPreview,
  onSelectGame
}: {
  profile: StandardFaceProfile | null;
  avatarPreview: PostScanAvatarPreviewState | null;
  onSelectGame: (tile: GameSelectionTileDefinition) => void;
}) {
  const preview = avatarPreview ?? createFallbackPostScanAvatarPreview();
  return (
    <section className="post-scan-game-screen" aria-labelledby="post-scan-game-title">
      <div className="post-scan-game-inner">
        <div className="post-scan-complete-card" aria-labelledby="post-scan-complete-title">
          <div className="post-scan-preview-wrap" aria-hidden="true">
            <div className="post-scan-preview-ring">
              <PostScanAvatarPreview preview={preview} profileAvailable={Boolean(profile)} />
            </div>
            <span className="post-scan-green-dot" />
          </div>
          <h1 id="post-scan-complete-title">
            <span>First Face ID</span>
            <span>scan complete.</span>
          </h1>
        </div>

        <h2 id="post-scan-game-title" className="post-scan-game-heading">
          See you in game players
        </h2>

        <div className="post-scan-game-grid" aria-label="Choose your game">
          {GAME_SELECTION_TILES.map((tile) => (
            <button
              aria-label={tile.ariaLabel}
              className="post-scan-game-tile"
              data-game={tile.tileID}
              key={tile.tileID}
              type="button"
              onClick={() => onSelectGame(tile)}
            >
              <GameTileArtwork id={tile.tileID} />
              <span>{tile.displayName}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function PostScanAvatarPreview({ preview, profileAvailable }: { preview: PostScanAvatarPreviewState; profileAvailable: boolean }) {
  if (preview.imageUrl) {
    return (
      <div
        className="post-scan-avatar-preview post-scan-avatar-preview-image"
        data-avatar-source={preview.source}
        data-selected-angle={preview.selectedAngleID ?? "none"}
        role="img"
        aria-label={preview.alt}
      >
        <img className="post-scan-avatar-photo" src={preview.imageUrl} alt="" aria-hidden="true" />
        <span className="post-scan-avatar-photo-grade" aria-hidden="true" />
        <span className="post-scan-avatar-photo-shoulders" aria-hidden="true" />
        <span className="post-scan-avatar-photo-rim" aria-hidden="true" />
      </div>
    );
  }

  return (
    <svg
      className="post-scan-avatar-preview post-scan-avatar-preview-fallback"
      data-avatar-source={preview.source}
      data-fallback-reason={preview.fallbackReason ?? "unknown"}
      data-profile-available={profileAvailable ? "true" : "false"}
      viewBox="0 0 180 180"
      role="img"
      aria-label={preview.alt}
      focusable="false"
    >
      <defs>
        <linearGradient id="post-scan-avatar-fallback-stadium" x1="24" x2="156" y1="12" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2f80ff" stopOpacity="0.46" />
          <stop offset="1" stopColor="#10141e" stopOpacity="0.94" />
        </linearGradient>
        <radialGradient id="post-scan-avatar-fallback-light" cx="50%" cy="24%" r="68%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="1" stopColor="#10141b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect className="post-scan-avatar-backdrop" width="180" height="180" rx="90" />
      <path className="post-scan-avatar-stadium-lines" d="M30 20l35 77M62 14l20 77M118 14L98 91M150 20l-35 77" />
      <path className="post-scan-avatar-fallback-shoulders" d="M32 166c8-33 34-52 58-52s50 19 58 52Z" />
      <path className="post-scan-avatar-fallback-neck" d="M72 105h36l6 38H66Z" />
      <path className="post-scan-avatar-fallback-head" d="M48 79c0-33 17-56 42-56s42 23 42 56c0 36-18 62-42 62S48 115 48 79Z" />
      <path className="post-scan-avatar-fallback-face-light" d="M62 55c11-13 29-18 46-10 15 8 21 25 17 47-8-23-23-35-43-35-8 0-15 0-20-2Z" />
      <path className="post-scan-avatar-fallback-jaw" d="M64 109c10 15 40 15 52 0" />
      <path className="post-scan-avatar-fallback-jersey" d="M61 143h58M84 118l-10 48M96 118l10 48" />
      <circle className="post-scan-avatar-fallback-light" cx="55" cy="34" r="7" />
    </svg>
  );
}

function PostScanGameFlowScreen({
  tile,
  profile,
  catalogRecordCount,
  catalogRuntimeError,
  onBackToGames,
  onStartScan,
  onOpenCollegeFootballRecommendation
}: {
  tile: GameSelectionTileDefinition;
  profile: StandardFaceProfile | null;
  catalogRecordCount: number;
  catalogRuntimeError: string | null;
  onBackToGames: () => void;
  onStartScan: () => void;
  onOpenCollegeFootballRecommendation: () => void;
}) {
  const definition = getSupportedGameDefinition(tile.gameID);
  const hasReusableProfile = Boolean(profile);
  const profileContext = profile ? createGameProfileContext(profile, tile.gameID) : null;
  const canOpenCollegeFootballRecommendation =
    tile.gameID === "college-football-27" &&
    hasReusableProfile &&
    !catalogRuntimeError &&
    catalogRecordCount > 0 &&
    definition.productionCatalogAvailability === "productionAvailable" &&
    definition.recommendationsEnabled;

  const notReadyMessage = getGameNotReadyMessage(definition.customerFacingSupportState, tile.displayName, catalogRuntimeError);

  return (
    <section className="post-scan-game-screen" aria-labelledby="post-scan-game-detail-title">
      <div className="post-scan-game-detail">
        <div className="post-scan-game-mini-art" aria-hidden="true">
          <GameTileArtwork id={tile.tileID} />
        </div>
        <p className="post-scan-game-kicker">Selected game</p>
        <h1 id="post-scan-game-detail-title">{tile.displayName}</h1>
        <p className="post-scan-game-ready-copy">Your scan is ready.</p>

        {hasReusableProfile ? (
          <div className="post-scan-game-status" aria-label="Reusable scan profile status">
            <span>Reusable scan profile</span>
            <strong>{profileContext?.profileID ?? "Ready"}</strong>
          </div>
        ) : (
          <div className="post-scan-game-status post-scan-game-status-warning" role="alert">
            <span>Scan needed</span>
            <strong>Complete one scan before choosing a game.</strong>
          </div>
        )}

        {canOpenCollegeFootballRecommendation ? (
          <>
            <p>{tile.displayName} recommendations are ready from the verified production catalog.</p>
            <button className="post-scan-primary-action" type="button" onClick={onOpenCollegeFootballRecommendation}>
              Open recommendation
            </button>
          </>
        ) : (
          <>
            <p>{hasReusableProfile ? notReadyMessage : "This game cannot generate a recommendation until the current scan profile exists."}</p>
            {hasReusableProfile ? (
              <p className="post-scan-game-limitation">
                This is fail-closed behavior: no fixture, synthetic, or other game's catalog data is used.
              </p>
            ) : null}
          </>
        )}

        <div className="post-scan-game-actions">
          <button className="post-scan-secondary-action" type="button" onClick={onBackToGames}>
            Back to games
          </button>
          {!hasReusableProfile ? (
            <button className="post-scan-primary-action" type="button" onClick={onStartScan}>
              Start scan
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function getGameNotReadyMessage(
  state: ReturnType<typeof getSupportedGameDefinition>["customerFacingSupportState"],
  displayName: string,
  catalogRuntimeError: string | null
) {
  if (catalogRuntimeError) return `The ${displayName} catalog check failed closed: ${catalogRuntimeError}`;
  if (state === "researchEvidenceCatalogUnavailable") {
    return `We're still verifying this game's appearance catalog before recommendations go live.`;
  }
  if (state === "notStartedUnavailable") {
    return `We're still building the ${displayName} appearance catalog before recommendations go live.`;
  }
  if (state === "researchOnlyUnavailable") {
    return `${displayName} is still research-only and is not available for customer recommendations yet.`;
  }
  return `${displayName} recommendations are not available yet.`;
}

function GameTileArtwork({ id }: { id: GameSelectionTileID }) {
  if (id === "cf27") {
    return (
      <svg className="post-scan-game-art" viewBox="0 0 180 170" aria-hidden="true" focusable="false">
        <path className="tile-light-beams" d="M22 -12l42 126M72 -10l21 126M142 -8l-28 124" />
        <path className="tile-field" d="M-12 104c50-10 101-11 204 0v66H-12Z" />
        <path className="tile-field-line" d="M18 114v43M52 109v53M88 107v58M124 109v53M160 114v43M0 134h180" />
        <ellipse className="tile-helmet-shell" cx="85" cy="62" rx="52" ry="39" />
        <path className="tile-helmet-crown" d="M45 62c9-26 31-39 64-33 20 4 34 16 39 34-28-12-69-14-103-1Z" />
        <path className="tile-helmet-shadow" d="M58 77c19 17 52 17 74 2-10 24-55 29-85 8 2-4 6-8 11-10Z" />
        <path className="tile-helmet-mask" d="M112 61h34M118 70l29 25M104 82h38M124 60v33" />
        <circle className="tile-stadium-light" cx="24" cy="22" r="10" />
        <circle className="tile-stadium-light tile-stadium-light-secondary" cx="151" cy="31" r="7" />
      </svg>
    );
  }
  if (id === "madden26") {
    return (
      <svg className="post-scan-game-art" viewBox="0 0 180 170" aria-hidden="true" focusable="false">
        <path className="tile-light-beams" d="M17 -10l55 124M68 -8l34 116M119 -10l-9 118M163 -10l-50 122" />
        <path className="tile-field" d="M0 112c55-10 119-8 180 4v54H0Z" />
        <path className="tile-field-line" d="M10 137h160M28 120v40M64 117v45M101 117v45M137 120v40" />
        <ellipse className="tile-football tile-football-shadow" cx="95" cy="78" rx="49" ry="27" transform="rotate(-18 95 78)" />
        <ellipse className="tile-football" cx="91" cy="68" rx="47" ry="27" transform="rotate(-18 91 68)" />
        <path className="tile-football-highlight" d="M59 62c16-15 49-20 70-5" />
        <path className="tile-football-lines" d="M73 60l37 11M83 54l-5 18M91 56l-5 18M99 59l-5 18M48 72c21 14 68 26 104 5" />
      </svg>
    );
  }
  if (id === "nba2k26") {
    return (
      <svg className="post-scan-game-art" viewBox="0 0 180 170" aria-hidden="true" focusable="false">
        <path className="tile-court-glow" d="M0 83h180v87H0Z" />
        <path className="tile-court-line" d="M18 121h144M90 83v87M54 126a36 36 0 0 0 72 0" />
        <circle className="tile-basketball tile-basketball-shadow" cx="98" cy="69" r="41" />
        <circle className="tile-basketball" cx="91" cy="61" r="41" />
        <path className="tile-basketball-highlight" d="M65 39c12-11 31-16 48-8" />
        <path className="tile-basketball-lines" d="M91 20v82M50 61h82M67 28c15 22 15 46 0 67M116 29c-16 22-16 45 0 65M59 40c20 14 44 18 66 7M58 83c20-13 44-16 67-6" />
      </svg>
    );
  }
  if (id === "pga") {
    return (
      <svg className="post-scan-game-art" viewBox="0 0 180 170" aria-hidden="true" focusable="false">
        <path className="tile-fairway" d="M-16 112c45-33 122-37 214-8v66H-16Z" />
        <path className="tile-fairway-stripe" d="M-10 141c55-17 123-18 199-4v33H-10Z" />
        <path className="tile-golf-club" d="M62 17l52 90 30-5" />
        <path className="tile-golf-club-face" d="M113 108l30-6 7 8-31 9Z" />
        <circle className="tile-golf-ball tile-golf-ball-shadow" cx="58" cy="116" r="21" />
        <circle className="tile-golf-ball" cx="55" cy="109" r="21" />
        <path className="tile-ball-dimples" d="M47 101h1M56 99h1M64 102h1M44 110h1M53 109h1M62 111h1M49 119h1M58 119h1M67 118h1" />
      </svg>
    );
  }
  if (id === "pba") {
    return (
      <svg className="post-scan-game-art" viewBox="0 0 180 170" aria-hidden="true" focusable="false">
        <path className="tile-lane" d="M15 0h62l-25 170H-8Z" />
        <path className="tile-lane-lines" d="M35 0L16 170M57 0L40 170M78 0L60 170" />
        <circle className="tile-bowling-ball tile-bowling-ball-shadow" cx="75" cy="99" r="40" />
        <circle className="tile-bowling-ball" cx="68" cy="91" r="40" />
        <path className="tile-bowling-gloss" d="M46 70c10-15 29-21 45-12" />
        <path className="tile-bowling-holes" d="M58 78h1M74 78h1M66 96h1" />
        <g className="tile-pins">
          <path d="M120 42c7 10 8 34 1 51h-16c-7-17-6-41 1-51Z" />
          <path d="M139 55c7 10 8 30 1 46h-16c-7-16-6-36 1-46Z" />
          <path d="M101 58c7 10 8 30 1 46H86c-7-16-6-36 1-46Z" />
        </g>
      </svg>
    );
  }
  if (id === "soccer26") {
    return (
      <svg className="post-scan-game-art" viewBox="0 0 180 170" aria-hidden="true" focusable="false">
        <rect className="tile-soccer-pitch" x="0" y="91" width="180" height="79" />
        <path className="tile-soccer-lines" d="M0 130h180M90 91v79M64 130a26 26 0 1 0 52 0 26 26 0 1 0-52 0" />
        <circle className="tile-soccer-ball tile-soccer-ball-shadow" cx="95" cy="71" r="38" />
        <circle className="tile-soccer-ball" cx="88" cy="63" r="38" />
        <path className="tile-soccer-panels" d="M88 34l17 13-7 21H78l-7-21Zm-17 13-19 10 7 21 19-10Zm34 0 19 10-7 21-19-10ZM78 68l-10 18 20 13 20-13-10-18Zm-26-11c-7 10-8 23-2 35m74-35c7 10 8 23 2 35" />
        <circle className="tile-stadium-light" cx="28" cy="24" r="9" />
      </svg>
    );
  }
  return (
    <svg className="post-scan-game-art" viewBox="0 0 180 170" aria-hidden="true" focusable="false">
      <path className="tile-grid-lines" d="M0 38h180M0 78h180M0 118h180M26 0l-18 170M72 0L50 170M118 0l18 170M158 0l32 170" />
      <path className="tile-controller-body" d="M54 64h72c12 0 22 10 22 22v8c0 12-8 20-18 20-8 0-13-5-19-13H69c-6 8-11 13-19 13-10 0-18-8-18-20v-8c0-12 10-22 22-22Z" />
      <path className="tile-controller-controls" d="M58 88h22M69 77v22M112 80h1M128 92h1" />
    </svg>
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
