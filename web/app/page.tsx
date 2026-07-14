"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/AppShell";
import { Alert, Button, Card, LoadingState, ProgressBar, ScreenHeader, StepFlowRail } from "@/components/design-system";
import { AttributeConfirmation } from "@/features/attributes/AttributeConfirmation";
import { BrowserCapabilityPanel } from "@/features/capture/BrowserCapabilityPanel";
import { CapturePreparation } from "@/features/capture/CapturePreparation";
import { GuidedCaptureFlow } from "@/features/capture/GuidedCaptureFlow";
import { GameCatalogStatus } from "@/features/catalog/GameCatalogStatus";
import { PricingScaffold } from "@/features/commerce/PricingScaffold";
import { ProfileReview } from "@/features/profile/ProfileReview";
import { ConsentPanel } from "@/features/privacy/ConsentPanel";
import { PrivacyCenter } from "@/features/privacy/PrivacyCenter";
import { ResultsExperience } from "@/features/results/ResultsExperience";
import { SavedBuildsEmpty } from "@/features/saved-builds/SavedBuildsEmpty";
import { ScreenshotRefinementEntry } from "@/features/refinement/ScreenshotRefinementEntry";
import { SettingsPanel } from "@/features/settings/SettingsPanel";
import { createInitialCaptureSession } from "@/lib/capture/capture-session";
import { createBrowserCameraService } from "@/lib/capture/browser-camera-service";
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
import { createInitialConsentState, hasRequiredCaptureConsent, isConsentGranted, type ConsentState } from "@/lib/privacy/consent";
import { createDataInventory, type DeletionScope } from "@/lib/privacy/data-lifecycle";
import { createMemoryPrivacyStore } from "@/lib/privacy/local-privacy-store";
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
import { createInitialAttributeConfirmation, type AttributeConfirmationState } from "@/lib/profile/attribute-confirmation";
import { createStandardFaceProfile } from "@/lib/profile/standard-face-profile";
import { createInitialScreenshotRefinementSession, deleteScreenshotRefinementSession } from "@/lib/refinement/screenshot-refinement";
import { createBuildInstructions } from "@/lib/results/results-experience";
import { isProductionCatalogEmpty, shouldShowDevelopmentCatalogBanner } from "@/lib/ui/catalog-status";
import { CATALOG_UNAVAILABLE_MESSAGE, INDEPENDENT_APP_DISCLAIMER, PRODUCT_EXPLANATION } from "@/lib/product-copy";
import type { StandardFaceProfile } from "@/types/domain";

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

const DevelopmentPhase0Status =
  process.env.NODE_ENV === "production"
    ? null
    : dynamic(() => import("@/features/phase-zero/Phase0StatusPanel").then((module) => module.Phase0StatusPanel), {
        ssr: false,
        loading: () => <LoadingState label="Loading Phase 0 status" />
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

export default function HomePage() {
  const [screen, setScreen] = useState<AppScreen>("welcome");
  const [session, setSession] = useState(() => createInitialCaptureSession());
  const [attributeConfirmation, setAttributeConfirmation] = useState<AttributeConfirmationState>(() => createInitialAttributeConfirmation());
  const [standardProfile, setStandardProfile] = useState<StandardFaceProfile | null>(null);
  const [deletionRecorded, setDeletionRecorded] = useState(false);
  const [consentState, setConsentState] = useState<ConsentState>(() => createInitialConsentState());
  const [screenshotSession, setScreenshotSession] = useState(() => createInitialScreenshotRefinementSession());
  const [privacyRevision, setPrivacyRevision] = useState(0);
  const [catalogRuntimeStatus, setCatalogRuntimeStatus] = useState<CatalogRuntimeStatus | null>(null);
  const [catalogRuntimeError, setCatalogRuntimeError] = useState<string | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfileSummary[]>([]);
  const [savedProfileStatus, setSavedProfileStatus] = useState<SavedProfileStorageStatus | null>(null);
  const [profileSaveStatusMessage, setProfileSaveStatusMessage] = useState<string | null>(null);
  const [profileSaveErrorMessage, setProfileSaveErrorMessage] = useState<string | null>(null);
  const [captureRecoveryNotice, setCaptureRecoveryNotice] = useState<string | null>(null);
  const [offlineRecoveryStatus, setOfflineRecoveryStatus] = useState<OfflineRecoveryStatus | null>(null);
  const cameraService = useMemo(() => createBrowserCameraService(), []);
  const privacyStore = useMemo(() => createMemoryPrivacyStore(), []);
  const savedProfileStorage = useMemo<SavedProfileStorage>(
    () => (typeof window === "undefined" ? createMemorySavedProfileStorage() : createBrowserSavedProfileStorage(window.sessionStorage, window.crypto)),
    []
  );
  const catalogIsEmpty = isProductionCatalogEmpty(productionCatalogManifest);
  const isDevelopment = process.env.NODE_ENV !== "production";
  const consentReady = hasRequiredCaptureConsent(consentState);
  const navItems = isDevelopment
    ? [
        ...PRIMARY_NAV_ITEMS,
        { id: "pricing" as const, label: "Pricing" },
        { id: "audit" as const, label: "Audit" },
        { id: "evidence-gallery" as const, label: "Evidence Gallery" },
        { id: "video-inspector" as const, label: "Video Inspector" },
        { id: "phase-0" as const, label: "Phase 0" },
        { id: "matching-lab" as const, label: "Matching Lab" },
        { id: "mobile-qa" as const, label: "Mobile QA" }
      ]
    : PRIMARY_NAV_ITEMS;
  const stepFlowProgress = getStepFlowProgress(screen);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const initialScreen = getScreenFromHash(window.location.hash);
    if (initialScreen) {
      setScreen(initialScreen);
      return;
    }
    window.history.replaceState({ screen: "welcome" }, "", toScreenHash("welcome"));
  }, []);

  useEffect(() => {
    const repository = createBundledCatalogRepository();
    void repository
      .loadRuntimeStatus()
      .then((status) => {
        setCatalogRuntimeStatus(status);
        setCatalogRuntimeError(null);
      })
      .catch((error: unknown) => {
        setCatalogRuntimeError(error instanceof Error ? error.message : "Catalog runtime validation failed closed.");
      });
  }, []);

  useEffect(() => {
    refreshSavedProfileState();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const snapshot = createCaptureRecoveryStore(window.sessionStorage).load();
    if (snapshot && hasRecoverableCaptureProgress(snapshot)) {
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
      const nextUrl = toScreenHash(nextScreen);
      if (replace) {
        window.history.replaceState({ screen: nextScreen }, "", nextUrl);
      } else if (window.location.hash !== nextUrl) {
        window.history.pushState({ screen: nextScreen }, "", nextUrl);
      }
    }
  }

  function navigate(nextScreen: AppScreen) {
    if (nextScreen === "home" && !canEnterHome(consentReady)) {
      commitScreen("consent");
      return;
    }
    commitScreen(nextScreen);
  }

  function refreshPrivacyState() {
    setPrivacyRevision((value) => value + 1);
  }

  function refreshSavedProfileState() {
    setSavedProfiles(savedProfileStorage.listProfileSummaries());
    setSavedProfileStatus(savedProfileStorage.getStatus());
  }

  function handleConsentChange(nextConsent: ConsentState) {
    setConsentState(nextConsent);
    privacyStore.saveConsentState(nextConsent);
    refreshPrivacyState();
  }

  function handleSessionChange(nextSession: typeof session) {
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
    revokeObjectUrls(session.angles.flatMap((angle) => (angle.image?.objectUrl ? [angle.image.objectUrl] : [])));
    if (typeof window !== "undefined") createCaptureRecoveryStore(window.sessionStorage).clear();
    privacyStore.deleteCurrentSession();
    setSession(createInitialCaptureSession());
    setAttributeConfirmation(createInitialAttributeConfirmation());
    setStandardProfile(null);
    setProfileSaveStatusMessage(null);
    setProfileSaveErrorMessage(null);
    setCaptureRecoveryNotice(null);
    privacyStore.recordDeletionCompletion("active-capture-session");
    setDeletionRecorded(true);
    refreshPrivacyState();
  }

  function deleteTemporaryImages() {
    revokeObjectUrls(session.angles.flatMap((angle) => (angle.image?.objectUrl ? [angle.image.objectUrl] : [])));
    if (typeof window !== "undefined") createCaptureRecoveryStore(window.sessionStorage).clear();
    privacyStore.deleteTemporaryImages();
    setSession(createInitialCaptureSession());
    privacyStore.recordDeletionCompletion("temporary-images");
    setDeletionRecorded(true);
    refreshPrivacyState();
  }

  function deleteDerivedProfile() {
    privacyStore.deleteDerivedProfile(standardProfile?.id);
    setStandardProfile(null);
    setProfileSaveStatusMessage(null);
    setProfileSaveErrorMessage(null);
    privacyStore.recordDeletionCompletion("derived-profile");
    setDeletionRecorded(true);
    refreshPrivacyState();
  }

  function deleteSavedBuild(buildID: string) {
    privacyStore.deleteSavedBuild(buildID);
    privacyStore.recordDeletionCompletion("saved-build");
    setDeletionRecorded(true);
    refreshPrivacyState();
  }

  function deleteAllSavedBuilds() {
    privacyStore.deleteSavedBuilds();
    privacyStore.recordDeletionCompletion("saved-builds");
    setDeletionRecorded(true);
    refreshPrivacyState();
  }

  function deleteSavedProfile(profileID: string) {
    savedProfileStorage.deleteProfile(profileID);
    privacyStore.deleteDerivedProfile(profileID);
    privacyStore.recordDeletionCompletion("saved-profile");
    setDeletionRecorded(true);
    refreshSavedProfileState();
    refreshPrivacyState();
  }

  function deleteAllSavedProfiles() {
    savedProfileStorage.deleteAllProfiles();
    privacyStore.deleteDerivedProfile();
    privacyStore.recordDeletionCompletion("saved-profiles");
    setDeletionRecorded(true);
    refreshSavedProfileState();
    refreshPrivacyState();
  }

  function deleteScreenshotSessionData() {
    const mutation = deleteScreenshotRefinementSession(screenshotSession);
    revokeObjectUrls(mutation.objectUrlsToRevoke);
    privacyStore.deleteScreenshotSession();
    setScreenshotSession(mutation.session);
    privacyStore.recordDeletionCompletion("screenshot-session");
    setDeletionRecorded(true);
    refreshPrivacyState();
  }

  function deleteAllLocalData() {
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
    setProfileSaveStatusMessage(null);
    setProfileSaveErrorMessage(null);
    setCaptureRecoveryNotice(null);
    setDeletionRecorded(true);
    refreshPrivacyState();
  }

  function deleteByScope(scope: DeletionScope) {
    if (scope === "active-capture-session") deleteCurrentSession();
    if (scope === "temporary-images") deleteTemporaryImages();
    if (scope === "derived-profile") deleteDerivedProfile();
    if (scope === "saved-profiles") deleteAllSavedProfiles();
    if (scope === "saved-builds") deleteAllSavedBuilds();
    if (scope === "screenshot-session") deleteScreenshotSessionData();
    if (scope === "application-preferences") {
      privacyStore.deleteApplicationPreferences();
      privacyStore.recordDeletionCompletion("application-preferences");
      setDeletionRecorded(true);
      refreshPrivacyState();
    }
    if (scope === "all-local-data") deleteAllLocalData();
  }

  function createProfileFromCurrentSession() {
    const profile = createStandardFaceProfile({
      session,
      attributes: attributeConfirmation,
      userAgent: typeof navigator === "undefined" ? undefined : navigator.userAgent
    });
    setStandardProfile(profile);
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
      setProfileSaveStatusMessage(
        `Saved non-image profile ${result.summary.profileID} locally with ${result.summary.encryptionStatus === "encrypted" ? "WebCrypto encryption" : "session-only fallback storage"}.`
      );
      setProfileSaveErrorMessage(null);
    } else {
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
          <section className="hero-panel" aria-labelledby="welcome-title">
            <div className="hero-copy">
              <p className="eyebrow">Web MVP | College Football 27 companion</p>
              <h1 id="welcome-title">Build your Road to Glory look with confidence.</h1>
              <p className="lede">{PRODUCT_EXPLANATION}</p>
              <p className="supporting">Guided browser capture uses RGB images only, not native TrueDepth geometry.</p>
              <div className="hero-actions">
                <Button onClick={() => navigate("product")}>Start walkthrough</Button>
                <Button variant="secondary" onClick={() => navigate("catalog")}>
                  Check catalog status
                </Button>
              </div>
            </div>
            <Card className="scoreboard-card">
              <div className="scoreboard-row">
                <span>Catalog</span>
                <strong>{CATALOG_UNAVAILABLE_MESSAGE}</strong>
              </div>
              <div className="scoreboard-row">
                <span>Capture mode</span>
                <strong>Guided RGB images</strong>
              </div>
              <ProgressBar value={completedAngles} max={requiredAngles} label="Capture progress" />
            </Card>
          </section>
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
            onContinue={() => navigate("home")}
          />
        );
      case "home":
        return <Dashboard completedAngles={completedAngles} requiredAngles={requiredAngles} onNavigate={navigate} />;
      case "start":
        return (
          <InfoScreen
            eyebrow="Start match"
            title="Start a face match"
            body="You will capture five RGB reference angles: straight-on, left 45 degrees, right 45 degrees, left profile, and right profile. Matching remains unavailable until the verified catalog is loaded."
            detail="This walkthrough is structured for use near a TV or game console: short steps, clear states, and manual upload fallback."
            actionLabel="Prepare capture"
            onAction={() => navigate("preparation")}
          />
        );
      case "preparation":
        return <CapturePreparation onContinue={() => navigate("capability")} />;
      case "capability":
        return <BrowserCapabilityPanel cameraService={cameraService} onContinue={() => navigate("capture")} />;
      case "capture":
        return (
          <GuidedCaptureFlow
            session={session}
            cameraService={cameraService}
            onSessionChange={handleSessionChange}
            onCancelSession={(cancelledSession) => {
              privacyStore.deleteCurrentSession();
              privacyStore.recordDeletionCompletion("active-capture-session");
              setDeletionRecorded(true);
              setSession(cancelledSession);
              setStandardProfile(null);
              refreshPrivacyState();
            }}
            onContinue={() => navigate("attributes")}
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
            onAction={() => navigate("results")}
            loading
          />
        );
      case "results":
        return (
          <ResultsExperience
            profile={standardProfile}
            catalogIsEmpty={catalogIsEmpty}
            errorMessage={catalogRuntimeError}
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
                privacyStore.saveBuild({
                id: `saved-build-${new Date().toISOString()}`,
                createdAt: new Date().toISOString(),
                profileVersion: standardProfile?.profileVersion ?? "unknown",
                match,
                buildInstructions: createBuildInstructions(match),
                catalogVersion: match.catalogVersion
                });
                refreshPrivacyState();
              }
            }
            onDeleteResult={() => setStandardProfile(null)}
          />
        );
      case "catalog":
        return <GameCatalogStatus />;
      case "audit":
        return isDevelopment && DevelopmentCatalogAuditInspector ? <DevelopmentCatalogAuditInspector manifest={productionCatalogManifest} /> : <GameCatalogStatus />;
      case "evidence-gallery":
        return isDevelopment && DevelopmentEvidenceGallery ? <DevelopmentEvidenceGallery /> : <GameCatalogStatus />;
      case "video-inspector":
        return isDevelopment && DevelopmentSourceVideoEvidenceInspector ? <DevelopmentSourceVideoEvidenceInspector /> : <GameCatalogStatus />;
      case "phase-0":
        return isDevelopment && DevelopmentPhase0Status ? <DevelopmentPhase0Status /> : <GameCatalogStatus />;
      case "matching-lab":
        return isDevelopment && DevelopmentMatchingLab ? <DevelopmentMatchingLab /> : <GameCatalogStatus />;
      case "mobile-qa":
        return isDevelopment && DevelopmentMobileQAStatus ? <DevelopmentMobileQAStatus /> : <GameCatalogStatus />;
      case "saved":
        return <SavedBuildsEmpty savedBuilds={savedBuilds} onDeleteSavedBuild={deleteSavedBuild} />;
      case "refinement":
        return (
          <ScreenshotRefinementEntry
            session={screenshotSession}
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
            deletionRecorded={deletionRecorded}
            onDeleteScope={deleteByScope}
            onDeleteSavedBuild={deleteSavedBuild}
            onDeleteSavedProfile={deleteSavedProfile}
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
      {stepFlowProgress.isInStepFlow ? (
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
      title: "Saved builds",
      body: "No builds are saved until derived results are explicitly saved locally.",
      action: "Open",
      target: "saved"
    },
    {
      title: "Screenshot refinement",
      body: "Entry point only. Refinement will compare user screenshots after verified catalog matching exists.",
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
