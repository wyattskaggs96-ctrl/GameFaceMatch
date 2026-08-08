"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, ProgressBar, ScreenHeader, StatusBadge } from "@/components/design-system";
import { RecoveryActionList } from "@/components/reliability";
import { CameraAccessError, type BrowserCameraService, type CameraDeviceOption, type CameraFacingMode } from "@/lib/capture/browser-camera-service";
import {
  createCaptureGuidanceSession,
  evaluateCaptureGuidanceFrame
} from "@/lib/capture/capture-guidance-service";
import {
  applyCoverageFrame,
  canBeginGuidedCapture,
  createInitialGuidedScanState,
  getGuidedScanCoveragePercent,
  getSecondPassTargets,
  getSelectiveRetakeRegion,
  type GuidedScanCoverageStatus,
  type GuidedScanPassID,
  type GuidedScanQualityGate,
  type GuidedScanReviewRegion,
  type GuidedScanState
} from "@/lib/capture/guided-scan-strategy";
import {
  createInitialGuidedLiveCoverageAccumulatorState,
  evaluateGuidedLiveFrameDecision,
  guidedSegmentToCaptureAngle,
  updateGuidedLiveCoverageAccumulator,
  type GuidedLiveAcceptedFrame,
  type GuidedLiveCoverageAccumulatorState,
  type GuidedLiveFrameDecision
} from "@/lib/capture/guided-live-coverage";
import {
  evaluateMobileScanRuntime,
  getCameraBlockedRecoverySteps,
  getMobileScanLifecycleNotice,
  type MobileScanRuntimeState
} from "@/lib/capture/mobile-safari-scan-hardening";
import {
  cancelCaptureSession,
  getCompletedAngleCount,
  getCurrentAngle,
  removeAngleCapture,
  retakeAngle,
  setAngleCapture,
  setAngleError,
  setAngleManualConfirmation,
  setCurrentAngle,
  type ActiveCaptureSession
} from "@/lib/capture/capture-session";
import {
  applyManualConfirmationToReport,
  calculateImageMeasurements,
  createBrowserImageQualityService,
  createCaptureReviewReport
} from "@/lib/capture/image-quality-service";
import { createTemporaryImageReference, isHeicOrHeif, prepareImageForAnalysis, validateImageFile } from "@/lib/capture/image-validation";
import { createLocalFaceLandmarkProvider } from "@/lib/face-landmarks/face-landmark-worker-client";
import {
  createPerformanceRecord,
  estimateTemporaryImageMemoryBytes,
  shouldSkipLiveFrameAnalysis,
  type PerformanceMetricRecord
} from "@/lib/performance/performance-monitor";
import { getRecoveryPlan, recoveryPlanForCameraError, recoveryPlanForGuidanceIssue, recoveryPlanForImageMessage } from "@/lib/reliability/recovery-actions";
import type { CaptureCoverageRegion, CaptureCoverageState } from "@/lib/capture/capture-coverage";
import type { CapturedAngle, CapturedAngleID, CaptureGuidanceReport, CaptureSource, FaceLandmarkReport, ImageQualityReport } from "@/types/domain";

type GuidedCircularStage = "positioning" | "firstPass" | "firstPassComplete" | "secondPass" | "coverageReview" | "selectiveRetake";
type SetupReferenceVisualState =
  | "positioning"
  | "scan-empty"
  | "scan-partial"
  | "scan-near-complete"
  | "complete"
  | "denied"
  | "multiple"
  | "accessibility";

export function GuidedCaptureFlow({
  session,
  cameraService,
  onSessionChange,
  onCancelSession,
  onClose,
  onContinue,
  onPerformanceRecord,
  customerMode = false
}: {
  session: ActiveCaptureSession;
  cameraService: BrowserCameraService;
  onSessionChange: (session: ActiveCaptureSession) => void;
  onCancelSession: (session: ActiveCaptureSession) => void;
  onClose?: () => void;
  onContinue: () => void;
  onPerformanceRecord?: (record: PerformanceMetricRecord) => void;
  customerMode?: boolean;
}) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraErrorCode, setCameraErrorCode] = useState<CameraAccessError["code"] | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [captureMode, setCaptureMode] = useState<"camera" | "upload">("camera");
  const [cameraDevices, setCameraDevices] = useState<CameraDeviceOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [selectedFacingMode, setSelectedFacingMode] = useState<CameraFacingMode>("user");
  const [lifecycleNotice, setLifecycleNotice] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [mobileRuntime, setMobileRuntime] = useState<MobileScanRuntimeState | null>(null);
  const [liveGuidance, setLiveGuidance] = useState<CaptureGuidanceReport | null>(null);
  const [baseGuidedScanState, setBaseGuidedScanState] = useState(() => createInitialGuidedScanState());
  const [liveCoverageDecision, setLiveCoverageDecision] = useState<GuidedLiveFrameDecision | null>(null);
  const [acceptedLiveFrames, setAcceptedLiveFrames] = useState<GuidedLiveAcceptedFrame[]>([]);
  const [isAnalyzingGuidance, setIsAnalyzingGuidance] = useState(false);
  const [useExtendedHold, setUseExtendedHold] = useState(false);
  const [captureWorkflow, setCaptureWorkflow] = useState<"guidedCircular" | "fiveAngleFallback">("guidedCircular");
  const [customerAssistedMode, setCustomerAssistedMode] = useState(false);
  const [guidedStage, setGuidedStage] = useState<GuidedCircularStage>("positioning");
  const visualState = useSetupReferenceVisualState();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef(session);
  const guidedStageRef = useRef<GuidedCircularStage>(guidedStage);
  const guidedScanStateRef = useRef(baseGuidedScanState);
  const coverageAccumulatorRef = useRef<GuidedLiveCoverageAccumulatorState>(createInitialGuidedLiveCoverageAccumulatorState());
  const acceptedLiveFramesRef = useRef<GuidedLiveAcceptedFrame[]>([]);
  const autoCaptureAcceptedFrameRef = useRef<(frame: GuidedLiveAcceptedFrame) => Promise<void>>(async () => undefined);
  const liveAutoCaptureInFlightRef = useRef(false);
  const pendingAutoCaptureFramesRef = useRef<GuidedLiveAcceptedFrame[]>([]);
  const guidanceInFlightRef = useRef(false);
  const lastGuidanceStartedAtRef = useRef(0);
  const guidanceSampleCountRef = useRef(0);
  const qualityService = useMemo(() => createBrowserImageQualityService(), []);
  const faceLandmarkProvider = useMemo(() => createLocalFaceLandmarkProvider(), []);
  const guidanceSession = useMemo(() => createCaptureGuidanceSession(), []);
  const currentAngle = getCurrentAngle(session);
  const reviewReport = createCaptureReviewReport(session.angles);
  const completedAngles = getCompletedAngleCount(session.angles);
  const hasActiveCaptureData = completedAngles > 0 || Boolean(stream);
  const previewIsMirrored = selectedFacingMode === "user";
  const guidedScanState = useMemo(() => {
    const uiState = createUiGuidedScanState({
      permissionGranted: Boolean(stream),
      qualityGate: createGuidedScanQualityGate(liveGuidance)
    });
    return {
      ...baseGuidedScanState,
      permissionGranted: uiState.permissionGranted,
      initialQualityGate: uiState.initialQualityGate
    };
  }, [baseGuidedScanState, liveGuidance, stream]);
  const circularCanBegin = canBeginGuidedCapture(Boolean(stream), guidedScanState.initialQualityGate);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    guidedStageRef.current = guidedStage;
  }, [guidedStage]);

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => {
    guidedScanStateRef.current = baseGuidedScanState;
  }, [baseGuidedScanState]);

  useEffect(() => {
    acceptedLiveFramesRef.current = acceptedLiveFrames;
  }, [acceptedLiveFrames]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    function updateMobileRuntime() {
      setMobileRuntime(
        evaluateMobileScanRuntime({
          isSecureContext: window.isSecureContext,
          protocol: window.location.protocol,
          hostname: window.location.hostname,
          userAgent: navigator.userAgent,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          visualViewportWidth: window.visualViewport?.width,
          visualViewportHeight: window.visualViewport?.height,
          orientationType: typeof screen !== "undefined" ? screen.orientation?.type : undefined,
          prefersReducedMotion: motionQuery.matches,
          online: navigator.onLine
        })
      );
    }
    updateMobileRuntime();
    window.addEventListener("resize", updateMobileRuntime);
    window.addEventListener("orientationchange", updateMobileRuntime);
    window.visualViewport?.addEventListener("resize", updateMobileRuntime);
    if (typeof motionQuery.addEventListener === "function") {
      motionQuery.addEventListener("change", updateMobileRuntime);
    } else {
      motionQuery.addListener(updateMobileRuntime);
    }
    window.addEventListener("online", updateMobileRuntime);
    window.addEventListener("offline", updateMobileRuntime);
    return () => {
      window.removeEventListener("resize", updateMobileRuntime);
      window.removeEventListener("orientationchange", updateMobileRuntime);
      window.visualViewport?.removeEventListener("resize", updateMobileRuntime);
      if (typeof motionQuery.removeEventListener === "function") {
        motionQuery.removeEventListener("change", updateMobileRuntime);
      } else {
        motionQuery.removeListener(updateMobileRuntime);
      }
      window.removeEventListener("online", updateMobileRuntime);
      window.removeEventListener("offline", updateMobileRuntime);
    };
  }, []);

  useEffect(() => {
    const firstPass = baseGuidedScanState.passes.find((pass) => pass.id === "first");
    const secondPass = baseGuidedScanState.passes.find((pass) => pass.id === "second");
    if (guidedStage === "positioning" && acceptedLiveFrames.length > 0) {
      setGuidedStage("firstPass");
      return;
    }
    if (guidedStage === "firstPass" && firstPass?.completed) {
      triggerGuidedCaptureHaptic(35);
      setGuidedStage("firstPassComplete");
      return;
    }
    if (guidedStage === "secondPass" && secondPass?.completed) {
      triggerGuidedCaptureHaptic(45);
      setGuidedStage("coverageReview");
    }
  }, [acceptedLiveFrames.length, baseGuidedScanState.passes, guidedStage]);

  useEffect(() => {
    return () => {
      if (stream) {
        cameraService.stopCameraPreview(stream);
      }
    };
  }, [cameraService, stream]);

  useEffect(() => {
    return () => {
      void faceLandmarkProvider.dispose();
    };
  }, [faceLandmarkProvider]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    guidanceSession.reset();
    setLiveGuidance(null);
  }, [currentAngle.id, guidanceSession]);

  useEffect(() => {
    if (!stream) {
      guidanceSession.reset();
      setLiveGuidance(null);
      setLiveCoverageDecision(null);
      coverageAccumulatorRef.current = createInitialGuidedLiveCoverageAccumulatorState();
      pendingAutoCaptureFramesRef.current = [];
      liveAutoCaptureInFlightRef.current = false;
      setIsAnalyzingGuidance(false);
      return;
    }

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    async function analyzeFrame() {
      const video = videoRef.current;
      if (cancelled || !video || video.videoWidth === 0 || video.videoHeight === 0) {
        timeout = setTimeout(() => void analyzeFrame(), 500);
        return;
      }
      const frameStartedAt = performance.now();
      if (
        shouldSkipLiveFrameAnalysis({
          nowMs: frameStartedAt,
          lastStartedAtMs: lastGuidanceStartedAtRef.current,
          minIntervalMs: 500,
          isProcessing: guidanceInFlightRef.current,
          documentVisibilityState: typeof document === "undefined" ? undefined : document.visibilityState
        })
      ) {
        timeout = setTimeout(() => void analyzeFrame(), 300);
        return;
      }
      guidanceInFlightRef.current = true;
      lastGuidanceStartedAtRef.current = frameStartedAt;
      setIsAnalyzingGuidance(true);
      try {
        const previewQuality = createPreviewQualityReport(video);
        const faceLandmarkReport = await faceLandmarkProvider.detect(
          {
            image: video,
            width: video.videoWidth,
            height: video.videoHeight,
            angleID: currentAngle.id
          },
          {
            detectionTimeoutMs: 1_200
          }
        );
        if (!cancelled) {
          const timestampMs = performance.now();
          const guidanceReport = guidanceSession.evaluate({
            angleID: currentAngle.id,
            faceLandmarkReport,
            imageQualityReport: previewQuality,
            timestampMs,
            useExtendedHold
          });
          setLiveGuidance(guidanceReport);
          const frameDecision = evaluateGuidedLiveFrameDecision({
            passID: getLiveCoveragePassID(guidedStageRef.current),
            timestampMs,
            faceLandmarkReport,
            imageQualityReport: previewQuality,
            acceptedFrames: acceptedLiveFramesRef.current
          });
          const coverageUpdate = updateGuidedLiveCoverageAccumulator(coverageAccumulatorRef.current, frameDecision);
          coverageAccumulatorRef.current = coverageUpdate.accumulator;
          setLiveCoverageDecision(coverageUpdate.decision);
          if (coverageUpdate.coverageFrame) {
            setBaseGuidedScanState((previous) => applyCoverageFrame(previous, coverageUpdate.coverageFrame!));
          }
          if (coverageUpdate.acceptedFrame) {
            acceptedLiveFramesRef.current = [...acceptedLiveFramesRef.current, coverageUpdate.acceptedFrame];
            setAcceptedLiveFrames(acceptedLiveFramesRef.current);
            triggerGuidedCaptureHaptic(18);
            void autoCaptureAcceptedFrameRef.current(coverageUpdate.acceptedFrame);
          }
        }
      } finally {
        const durationMs = performance.now() - frameStartedAt;
        guidanceSampleCountRef.current += 1;
        const shouldRecordSample = guidanceSampleCountRef.current % 6 === 0 || durationMs > 120;
        if (shouldRecordSample) {
          onPerformanceRecord?.(
            createPerformanceRecord({
              operation: "liveGuidanceFrame",
              durationMs,
              itemCount: 1,
              notes: ["Local camera preview guidance frame; skipped when previous analysis is still running."]
            })
          );
        }
        guidanceInFlightRef.current = false;
        if (!cancelled) {
          setIsAnalyzingGuidance(false);
          timeout = setTimeout(() => void analyzeFrame(), 550);
        }
      }
    }

    timeout = setTimeout(() => void analyzeFrame(), 250);
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [currentAngle.id, faceLandmarkProvider, guidanceSession, onPerformanceRecord, stream, useExtendedHold]);

  useEffect(() => {
    setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        stopCamera();
        setLifecycleNotice(getMobileScanLifecycleNotice("visibilityHidden"));
      }
      if (document.visibilityState === "visible" && hasActiveCaptureData) {
        setLifecycleNotice(getMobileScanLifecycleNotice("visibilityVisible"));
      }
    }
    function handlePageHide() {
      stopCamera();
      setLifecycleNotice(getMobileScanLifecycleNotice("pageHide"));
    }
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted || hasActiveCaptureData) {
        setLifecycleNotice(getMobileScanLifecycleNotice("pageShow"));
      }
    }
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasActiveCaptureData) return;
      event.preventDefault();
      event.returnValue = "An active GameFace Match capture session is in progress.";
    }
    function handleOffline() {
      setIsOffline(true);
      setLifecycleNotice(getMobileScanLifecycleNotice("offline"));
    }
    function handleOnline() {
      setIsOffline(false);
      setLifecycleNotice(getMobileScanLifecycleNotice("online"));
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [hasActiveCaptureData, stream]);

  async function startCamera() {
    const startedAt = performance.now();
    setCameraError(null);
    setCameraErrorCode(null);
    setLifecycleNotice(null);
    setIsStartingCamera(true);
    try {
      if (mobileRuntime && !mobileRuntime.secureContext) {
        throw new CameraAccessError(
          "permissionBlocked",
          "Camera access requires HTTPS or localhost. Open the private trial from a secure website link, then start camera again."
        );
      }
      stopCamera();
      const nextStream = await cameraService.requestCameraPreview({
        deviceId: selectedDeviceId || undefined,
        facingMode: selectedDeviceId ? undefined : selectedFacingMode
      });
      setStream(nextStream);
      const nextDevices = await cameraService.getCameraDevices();
      setCameraDevices(nextDevices);
      const trackSettings = nextStream.getVideoTracks()[0]?.getSettings();
      const activeDevice = nextDevices.find((device) => device.deviceId === trackSettings?.deviceId);
      if (activeDevice?.deviceId) setSelectedDeviceId(activeDevice.deviceId);
      if (activeDevice?.facingMode === "user" || activeDevice?.facingMode === "environment") setSelectedFacingMode(activeDevice.facingMode);
      setCaptureMode("camera");
    } catch (error) {
      setCameraError(error instanceof CameraAccessError ? error.message : "Camera could not be started. Upload fallback remains available.");
      setCameraErrorCode(error instanceof CameraAccessError ? error.code : "unknownError");
      setCaptureMode("upload");
    } finally {
      onPerformanceRecord?.(
        createPerformanceRecord({
          operation: "cameraStart",
          durationMs: performance.now() - startedAt,
          itemCount: 1,
          notes: ["Camera preview request completed or fell back to upload without storing camera frames."]
        })
      );
      setIsStartingCamera(false);
    }
  }

  async function switchCamera() {
    const availableDevices = cameraDevices.length > 0 ? cameraDevices : await cameraService.getCameraDevices();
    setCameraDevices(availableDevices);
    if (availableDevices.length > 1) {
      const currentIndex = Math.max(
        availableDevices.findIndex((device) => device.deviceId === selectedDeviceId),
        0
      );
      const nextDevice = availableDevices[(currentIndex + 1) % availableDevices.length];
      setSelectedDeviceId(nextDevice.deviceId);
      if (nextDevice.facingMode === "user" || nextDevice.facingMode === "environment") setSelectedFacingMode(nextDevice.facingMode);
    } else {
      setSelectedDeviceId("");
      setSelectedFacingMode((mode) => (mode === "user" ? "environment" : "user"));
    }
    setLifecycleNotice("Camera selection changed. Start camera again to use the new selection.");
    stopCamera();
  }

  function stopCamera() {
    if (stream) {
      cameraService.stopCameraPreview(stream);
    }
    setStream(null);
  }

  async function captureAcceptedCoverageFrame(frame: GuidedLiveAcceptedFrame) {
    pendingAutoCaptureFramesRef.current.push(frame);
    if (liveAutoCaptureInFlightRef.current) return;
    liveAutoCaptureInFlightRef.current = true;
    try {
      let nextFrame = pendingAutoCaptureFramesRef.current.shift() ?? null;
      while (nextFrame) {
        const angleID = guidedSegmentToCaptureAngle(nextFrame.assignedSegmentID);
        const activeSession = sessionRef.current;
        const targetAngle = activeSession.angles.find((angle) => angle.id === angleID);
        if (targetAngle && targetAngle.status !== "complete") {
          await captureStillFrameForAngle(angleID, `guided-${nextFrame.passID}-${nextFrame.assignedSegmentID}`);
        }
        nextFrame = pendingAutoCaptureFramesRef.current.shift() ?? null;
      }
    } finally {
      liveAutoCaptureInFlightRef.current = false;
    }
  }

  autoCaptureAcceptedFrameRef.current = captureAcceptedCoverageFrame;

  async function captureStillFrame() {
    await captureStillFrameForAngle(currentAngle.id, currentAngle.id);
  }

  async function captureStillFrameForAngle(angleID: CapturedAngleID, fileLabel: string) {
    const video = videoRef.current;
    const activeStream = streamRef.current;
    const activeSession = sessionRef.current;
    if (!video || !activeStream || video.videoWidth === 0 || video.videoHeight === 0) {
      onSessionChange(setAngleError(activeSession, angleID, ["Camera preview is not ready. Try again or upload an image."]));
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      onSessionChange(setAngleError(activeSession, angleID, ["The browser could not capture a still frame."]));
      return;
    }
    if (previewIsMirrored) {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      onSessionChange(setAngleError(activeSession, angleID, ["The browser could not create a still image."]));
      return;
    }
    const file = new File([blob], `${fileLabel}-${Date.now()}.jpg`, { type: "image/jpeg" });
    const objectUrl = URL.createObjectURL(file);
    try {
      const imageElement = await readImageElement(objectUrl);
      await processFileForAngle(angleID, file, objectUrl, "camera", imageElement);
    } catch {
      URL.revokeObjectURL(objectUrl);
      onSessionChange(setAngleError(activeSession, angleID, ["The captured image could not be decoded."]));
    }
  }

  async function handleFile(angle: CapturedAngle, event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }
    if (isHeicOrHeif(file.name, file.type)) {
      onSessionChange(
        setAngleError(session, angle.id, [
          "HEIC/HEIF images are not supported in this web MVP. Export or upload JPEG, PNG, or WebP instead."
        ])
      );
      event.currentTarget.value = "";
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    try {
      const imageElement = await readImageElement(objectUrl);
      const prepared = await prepareImageForAnalysis({ file, objectUrl, imageElement });
      if (prepared.originalObjectUrl) URL.revokeObjectURL(prepared.originalObjectUrl);
      await processFileForAngle(angle.id, prepared.file, prepared.objectUrl, "upload", prepared.imageElement, prepared);
    } catch {
      URL.revokeObjectURL(objectUrl);
      onSessionChange(setAngleError(session, angle.id, ["The image could not be read."]));
    } finally {
      event.currentTarget.value = "";
    }
  }

  async function processFileForAngle(
    angleID: CapturedAngleID,
    file: File,
    objectUrl: string,
    source: CaptureSource,
    imageElement: HTMLImageElement,
    processing?: Awaited<ReturnType<typeof prepareImageForAnalysis>>
  ) {
    const startedAt = performance.now();
    const dimensions = { width: imageElement.naturalWidth, height: imageElement.naturalHeight };
    const activeSession = sessionRef.current;
    try {
      const validation = await validateImageFile(file, dimensions, activeSession.angles.filter((item) => item.id !== angleID), angleID, source, objectUrl);
      if (validation.errors.length > 0) {
        URL.revokeObjectURL(objectUrl);
        onSessionChange(setAngleError(activeSession, angleID, validation.errors));
        return;
      }
      const existingAngle = activeSession.angles.find((angle) => angle.id === angleID);
      const image = createTemporaryImageReference(
        {
          fileName: file.name,
          fileType: file.type,
          fileSizeBytes: file.size,
          width: dimensions.width,
          height: dimensions.height,
          originalWidth: processing?.originalWidth,
          originalHeight: processing?.originalHeight,
          originalFileSizeBytes: processing?.originalFileSizeBytes,
          processingNotes: processing?.processingNotes,
          wasDownscaled: processing?.wasDownscaled,
          source,
          associatedAngleID: angleID,
          objectUrl,
          signature: validation.signature
        },
        validation.signature
      );
      const imageQualityReport = qualityService.analyzeImageElement({
        image,
        imageElement,
        existingAngles: activeSession.angles.filter((item) => item.id !== angleID),
        manualConfirmation: existingAngle?.manualConfirmation
      });
      const faceLandmarkReport = await faceLandmarkProvider.detect(
        {
          image: imageElement,
          width: dimensions.width,
          height: dimensions.height,
          angleID
        },
        {
          detectionTimeoutMs: 6_000
        }
      );
      const captureGuidanceReport = evaluateCaptureGuidanceFrame({
        angleID,
        faceLandmarkReport,
        imageQualityReport,
        timestampMs: Date.now(),
        useExtendedHold
      });
      const mutation = setAngleCapture(
        sessionRef.current,
        angleID,
        image,
        source,
        imageQualityReport,
        faceLandmarkReport,
        captureGuidanceReport
      );
      revokeObjectUrls(mutation.objectUrlsToRevoke);
      onSessionChange(mutation.session);
    } finally {
      onPerformanceRecord?.(
        createPerformanceRecord({
          operation: "frameProcessing",
          durationMs: performance.now() - startedAt,
          memoryBytes: estimateTemporaryImageMemoryBytes([{ fileSizeBytes: file.size, width: dimensions.width, height: dimensions.height }]),
          itemCount: 1,
          notes: [`Processed one ${source} image for ${angleID}; metric excludes raw media bytes.`]
        })
      );
    }
  }

  function selectAngle(angleID: CapturedAngleID) {
    onSessionChange(setCurrentAngle(session, angleID));
  }

  function retake(angleID: CapturedAngleID) {
    const mutation = retakeAngle(session, angleID);
    revokeObjectUrls(mutation.objectUrlsToRevoke);
    onSessionChange(mutation.session);
  }

  function remove(angleID: CapturedAngleID) {
    const mutation = removeAngleCapture(session, angleID);
    revokeObjectUrls(mutation.objectUrlsToRevoke);
    onSessionChange(mutation.session);
  }

  function updateManualConfirmation(angle: CapturedAngle, key: keyof CapturedAngle["manualConfirmation"], checked: boolean) {
    const nextConfirmation = {
      ...angle.manualConfirmation,
      [key]: checked
    };
    const nextReport = angle.qualityReport ? applyManualConfirmationToReport(angle.qualityReport, nextConfirmation) : undefined;
    onSessionChange(setAngleManualConfirmation(session, angle.id, { [key]: checked }, nextReport));
  }

  function cancelSession() {
    stopCamera();
    coverageAccumulatorRef.current = createInitialGuidedLiveCoverageAccumulatorState();
    acceptedLiveFramesRef.current = [];
    pendingAutoCaptureFramesRef.current = [];
    setAcceptedLiveFrames([]);
    setLiveCoverageDecision(null);
    setBaseGuidedScanState(createInitialGuidedScanState());
    const mutation = cancelCaptureSession(session);
    revokeObjectUrls(mutation.objectUrlsToRevoke);
    onCancelSession(mutation.session);
  }

  function closeSession() {
    cancelSession();
    onClose?.();
  }

  function setPreviewVideoRef(node: HTMLVideoElement | null) {
    videoRef.current = node;
    if (node && stream) {
      node.srcObject = stream;
    }
  }

  if (captureWorkflow === "guidedCircular") {
    return (
      <section className="guided-circular-screen" aria-labelledby="guided-circular-title">
        <CircularGuidedCapturePanel
          cameraError={cameraError}
          cameraErrorCode={cameraErrorCode}
          circularCanBegin={circularCanBegin}
          currentAngle={currentAngle}
          guidedScanState={guidedScanState}
          guidedStage={guidedStage}
          visualState={visualState}
          isAnalyzingGuidance={isAnalyzingGuidance}
          isOffline={isOffline}
          isStartingCamera={isStartingCamera}
          lifecycleNotice={lifecycleNotice}
          liveCoverageDecision={liveCoverageDecision}
          liveGuidance={liveGuidance}
          mobileRuntime={mobileRuntime}
          customerAssistedMode={customerAssistedMode}
          customerMode={customerMode}
          acceptedLiveFrameCount={acceptedLiveFrames.length}
          previewIsMirrored={previewIsMirrored}
          reviewReportCanContinue={reviewReport.canContinue}
          streamActive={Boolean(stream)}
          videoRef={setPreviewVideoRef}
          onBeginFirstPass={() => setGuidedStage(guidedScanState.passes.find((pass) => pass.id === "first")?.completed ? "secondPass" : "firstPass")}
          onCancel={cancelSession}
          onCaptureStill={() => void captureStillFrame()}
          onClose={closeSession}
          onContinue={onContinue}
          onOpenCoverageReview={() => setGuidedStage("coverageReview")}
          onRetakeMissingArea={() => setGuidedStage("selectiveRetake")}
          onStartCamera={() => void startCamera()}
          onStopCamera={stopCamera}
          onSwitchCamera={() => void switchCamera()}
          onUseFallback={() => {
            if (customerMode) {
              setCustomerAssistedMode(true);
              setUseExtendedHold(true);
              setLifecycleNotice("Assisted mode is on. Move one direction at a time and hold still when the guide asks.");
              return;
            }
            setCaptureWorkflow("fiveAngleFallback");
          }}
        />
        {guidedStage === "coverageReview" || guidedStage === "selectiveRetake" || completedAngles > 0 || visualState === "complete" ? (
          <CircularCoverageReviewPanel
            completedAngles={completedAngles}
            coverageRegions={Object.values(session.coverageMap.regions)}
            guidedScanState={guidedScanState}
            onContinue={onContinue}
            onRetake={(angleID) => {
              retake(angleID);
              setCaptureWorkflow("fiveAngleFallback");
            }}
            onUseFallback={() => setCaptureWorkflow("fiveAngleFallback")}
            reviewReportCanContinue={reviewReport.canContinue}
            showDetail={guidedStage === "coverageReview" || guidedStage === "selectiveRetake" || completedAngles > 0}
          />
        ) : null}
        {cameraErrorCode ? <RecoveryActionList plans={[recoveryPlanForCameraError(cameraErrorCode)]} /> : null}
        {isOffline ? <RecoveryActionList plans={[getRecoveryPlan("networkFailure")]} /> : null}
        <div className="sr-only" role="status" aria-live="polite">
          Circular guided capture is open. {completedAngles} of 5 required fallback angles are complete.
        </div>
      </section>
    );
  }

  return (
    <section className="screen-stack" aria-labelledby="guided-capture-title">
      <button className="setup-top-control" type="button" onClick={closeSession} aria-label="Close face scan">
        <span aria-hidden="true">‹</span>
      </button>
      <ScreenHeader eyebrow="Guided capture" title={`${completedAngles} of 5 angles completed`} id="guided-capture-title">
        <p>
          Capture five RGB images. This does not perform identity recognition, face matching, TrueDepth capture, ARKit capture, 3D reconstruction, or
          advanced facial analysis.
        </p>
      </ScreenHeader>
      <Alert title="Assisted five-angle fallback" tone="info">
        You are using the accessible five-angle capture path. It preserves the same local RGB privacy rules and lets you complete or retake one view at a time.
      </Alert>
      <div className="button-row">
        <Button variant="secondary" onClick={() => setCaptureWorkflow("guidedCircular")}>
          Return to circular guided scan
        </Button>
      </div>
      <ProgressBar value={completedAngles} max={5} label="Required RGB angles" />
      <div className="result-grid">
        <Card tone="info">
          <h2>Angle plan</h2>
          <p>Capture one straight-on front view, two three-quarter views, and two full profile views. Complete all five before continuing.</p>
        </Card>
        <Card tone="info">
          <h2>Capture state</h2>
          <p>
            {session.captureState.completedRequiredCount} of {session.captureState.totalRequiredCount} required views complete. Optional elevated, lowered,
            hairline, and facial-hair detail views are tracked separately and do not block this MVP review.
          </p>
        </Card>
        <Card tone="info">
          <h2>One-face RGB guidance</h2>
          <p>Keep one person centered, use neutral expression with lips gently closed, and stay near arm's length unless guidance says to move.</p>
        </Card>
        <Card tone="warning">
          <h2>Retake without restarting</h2>
          <p>Use Retake or Replace upload for only the weak angle. Camera denial, unsupported browsers, or interrupted previews can use upload fallback.</p>
        </Card>
      </div>
      <div className="capture-workspace">
        <Card className="camera-panel">
          <div className="status-row">
            <div>
              <p className="eyebrow">Current angle</p>
              <h2>{currentAngle.label}</h2>
            </div>
            <StatusBadge tone={currentAngle.status === "complete" ? "success" : currentAngle.status === "error" ? "danger" : "info"}>
              {currentAngle.status}
            </StatusBadge>
          </div>
          <p>{currentAngle.instruction}</p>
          <div className="instruction-caption" role="note" aria-label="Current capture instruction">
            <strong>Captioned instruction:</strong>
            <span>{currentAngle.instruction}</span>
          </div>
          <Alert title="Mobile capture guidance" tone="info">
            Use portrait orientation when possible. The front-camera preview is mirrored like a selfie view, but captured still images are stored unmirrored for
            review. Browser RGB capture is not TrueDepth, depth geometry, ARKit, or 3D reconstruction.
          </Alert>
          {isOffline ? (
            <Alert title="Offline" tone="warning">
              The app is offline. Capture images remain local; no upload service exists.
            </Alert>
          ) : null}
          {isOffline ? <RecoveryActionList plans={[getRecoveryPlan("networkFailure")]} /> : null}
          {lifecycleNotice ? (
            <Alert title="Mobile session notice" tone="warning" role="status">
              {lifecycleNotice}
            </Alert>
          ) : null}
          <div className="camera-preview" data-active={Boolean(stream)} data-mirrored={previewIsMirrored}>
            {stream ? (
              <video ref={setPreviewVideoRef} autoPlay playsInline muted aria-label={`${currentAngle.label} camera preview`} />
            ) : (
              <div className="camera-placeholder" aria-live="polite">
                <strong>Camera preview stopped</strong>
                <span>Start the camera or skip to file upload for this angle.</span>
              </div>
            )}
          </div>
          <LiveGuidancePanel guidance={liveGuidance} isAnalyzing={isAnalyzingGuidance} isCameraActive={Boolean(stream)} />
          {cameraError ? (
            <Alert title="Camera unavailable" tone="warning" role="alert">
              {cameraError}
            </Alert>
          ) : null}
          {cameraErrorCode ? <RecoveryActionList plans={[recoveryPlanForCameraError(cameraErrorCode)]} /> : null}
          <div className="button-row">
            <Button onClick={() => void startCamera()} disabled={isStartingCamera} aria-label={`Start camera for ${currentAngle.label}`}>
              {isStartingCamera ? "Starting camera" : "Start camera"}
            </Button>
            <Button variant="secondary" onClick={stopCamera} disabled={!stream} aria-label={`Stop camera for ${currentAngle.label}`}>
              Stop camera
            </Button>
            <Button variant="secondary" onClick={() => void switchCamera()} aria-label="Switch between available cameras">
              Switch camera
            </Button>
            <Button variant="secondary" onClick={() => void captureStillFrame()} disabled={!stream} aria-label={`Capture still frame for ${currentAngle.label}`}>
              Capture still frame
            </Button>
            <Button variant="ghost" onClick={() => setCaptureMode("upload")} aria-label={`Skip to file upload for ${currentAngle.label}`}>
              Skip to file upload
            </Button>
          </div>
          {captureMode === "upload" ? (
            <label className="form-field">
              <span>Upload {currentAngle.label.toLowerCase()} image</span>
              <input
                className="file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                capture="user"
                onChange={(event) => void handleFile(currentAngle, event)}
              />
            </label>
          ) : null}
          <div className="metadata-list capability-list" aria-label="Camera selection details">
            <div>
              <span>Preferred camera</span>
              <strong>{selectedFacingMode === "user" ? "Front/selfie" : "Rear/environment"}</strong>
            </div>
            <div>
              <span>Preview mirror</span>
              <strong>{previewIsMirrored ? "Mirrored preview, unmirrored capture" : "Unmirrored preview and capture"}</strong>
            </div>
            <div>
              <span>Available cameras</span>
              <strong>{cameraDevices.length}</strong>
            </div>
          </div>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={useExtendedHold}
              onChange={(event) => setUseExtendedHold(event.currentTarget.checked)}
              aria-describedby="extended-hold-note"
            />
            <span>
              Use extended steady-hold timing
              <small id="extended-hold-note">Adds more time to settle before capture guidance calls the pose ready.</small>
            </span>
          </label>
          {cameraError ? (
            <Alert title="Permission reset help" tone="info">
              iPhone Safari: Settings, Safari, Camera, then allow or reset this site. Android Chrome: lock icon, Site settings, Camera, then allow or reset.
              Reload and start the camera again, or continue with upload fallback for each required RGB angle.
            </Alert>
          ) : null}
        </Card>
        <div className="angle-list" aria-label="Required capture angles">
          {session.angles.map((angle) => (
            <Card className="capture-card" tone={angle.status === "error" ? "danger" : angle.status === "complete" ? "success" : "neutral"} key={angle.id}>
              <div className="status-row">
                <h2>{angle.label}</h2>
                <StatusBadge tone={angle.status === "error" ? "danger" : angle.status === "complete" ? "success" : "neutral"}>
                  {angle.status}
                </StatusBadge>
              </div>
              <p>{angle.instruction}</p>
              <p className="field-note">Left and right are your left and right, not the viewer's.</p>
              {angle.image ? (
                <p className="field-note">
                  {angle.image.fileName} | {angle.image.width}x{angle.image.height} | {angle.image.source}
                </p>
              ) : null}
              {angle.validationErrors.length > 0 ? (
                <ul className="error-list" id={`${angle.id}-validation-errors`} role="alert">
                  {angle.validationErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : null}
              {angle.validationErrors.length > 0 ? (
                <RecoveryActionList plans={angle.validationErrors.map(recoveryPlanForImageMessage)} title="Upload recovery action" />
              ) : null}
              <label className="form-field">
                <span className="small-text" id={`${angle.id}-upload-label`}>
                  Upload fallback for {angle.label.toLowerCase()}
                </span>
                <input
                  className="file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  capture="user"
                  aria-labelledby={`${angle.id}-upload-label`}
                  aria-invalid={angle.validationErrors.length > 0 ? "true" : undefined}
                  aria-describedby={angle.validationErrors.length > 0 ? `${angle.id}-validation-errors` : undefined}
                  onChange={(event) => void handleFile(angle, event)}
                />
              </label>
              <div className="button-row compact-buttons">
                <Button variant="secondary" onClick={() => selectAngle(angle.id)} aria-label={`Make ${angle.label} the current capture angle`}>
                  Make current
                </Button>
                <Button variant="secondary" onClick={() => retake(angle.id)} aria-label={`Retake ${angle.label}`}>
                  Retake
                </Button>
                <Button variant="ghost" onClick={() => remove(angle.id)} aria-label={`Remove ${angle.label} capture`}>
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <Card className="capture-review-card">
        <div className="section-heading">
          <p className="eyebrow">Capture review</p>
          <h2>Resolve blocking issues, then confirm what the browser cannot detect</h2>
          <p className="supporting">
            Brightness, exposure, blur, dimensions, file size, exact duplicates, and local face-landmark availability are browser-side checks. Identity
            recognition and sensitive-trait inference are not performed. If local landmarks are unavailable, use the manual confirmations below.
          </p>
        </div>
        <CoverageMapPanel coverageRegions={Object.values(session.coverageMap.regions)} onRetake={retake} />
        <div className="review-grid" aria-label="Per-angle image quality review">
          {session.angles.map((angle) => {
            const report = reviewReport.angleReports[angle.id];
            return (
              <article className="quality-review-card" key={angle.id} aria-labelledby={`${angle.id}-review-title`}>
                <div className="status-row">
                  <div>
                    <p className="eyebrow">{angle.status === "complete" ? "Image present" : "Image needed"}</p>
                    <h3 id={`${angle.id}-review-title`}>{angle.label}</h3>
                  </div>
                  <StatusBadge tone={report.overallState === "blocked" ? "danger" : report.overallState === "ready" ? "success" : "warning"}>
                    {report.overallState}
                  </StatusBadge>
                </div>
                {angle.image ? (
                  <img className="capture-thumb" src={angle.image.objectUrl} alt={`${angle.label} captured preview`} />
                ) : (
                  <div className="empty-thumb">No image selected</div>
                )}
                <dl className="quality-metrics" aria-label={`${angle.label} quality metrics`}>
                  <div>
                    <dt>Size</dt>
                    <dd>
                      {report.width.value}x{report.height.value}
                    </dd>
                  </div>
                  <div>
                    <dt>File</dt>
                    <dd>{formatBytes(report.fileSizeBytes.value)}</dd>
                  </div>
                  <div>
                    <dt>Brightness</dt>
                    <dd>{formatMetric(report.brightnessEstimate.value)}</dd>
                  </div>
                  <div>
                    <dt>Sharpness</dt>
                    <dd>{formatMetric(report.sharpnessEstimate.value)}</dd>
                  </div>
                  <div>
                    <dt>Orientation</dt>
                    <dd>{report.orientation.value}</dd>
                  </div>
                  <div>
                    <dt>Processing</dt>
                    <dd>{angle.image?.wasDownscaled ? "Downscaled" : "Original size"}</dd>
                  </div>
                  <div>
                    <dt>Duplicate</dt>
                    <dd>{report.duplicateImage.value ? "Yes" : "No"}</dd>
                  </div>
                  <div>
                    <dt>Faces</dt>
                    <dd>{formatFaceCount(angle.faceLandmarkReport)}</dd>
                  </div>
                  <div>
                    <dt>Landmarks</dt>
                    <dd>{angle.faceLandmarkReport?.availabilityState ?? "not requested"}</dd>
                  </div>
                </dl>
                {angle.faceLandmarkReport ? (
                  <div className="metadata-list capability-list" aria-label={`${angle.label} local landmark summary`}>
                    <div>
                      <span>Provider</span>
                      <strong>{angle.faceLandmarkReport.provider.providerName}</strong>
                    </div>
                    <div>
                      <span>Head pose</span>
                      <strong>{formatHeadPose(angle.faceLandmarkReport)}</strong>
                    </div>
                    <div>
                      <span>Expression signals</span>
                      <strong>{formatExpression(angle.faceLandmarkReport)}</strong>
                    </div>
                  </div>
                ) : null}
                {angle.faceLandmarkReport?.blockingMessages.length ? (
                  <div>
                    <p className="message-title">Face detection blocking</p>
                    <ul className="message-list blocking-list">
                      {angle.faceLandmarkReport.blockingMessages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {angle.faceLandmarkReport?.advisoryMessages.length ? (
                  <div>
                    <p className="message-title">Landmark advisory</p>
                    <ul className="message-list advisory-list">
                      {angle.faceLandmarkReport.advisoryMessages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {angle.captureGuidanceReport ? <GuidanceIssueList guidance={angle.captureGuidanceReport} title="Pose guidance" /> : null}
                {report.blockingMessages.length > 0 ? (
                  <div role="alert">
                    <p className="message-title">Blocking</p>
                    <ul className="message-list blocking-list">
                      {report.blockingMessages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                    {angle.status !== "empty" && angle.validationErrors.length === 0 ? (
                      <RecoveryActionList plans={report.blockingMessages.map(recoveryPlanForImageMessage)} title="Quality recovery action" />
                    ) : null}
                  </div>
                ) : null}
                {report.advisoryMessages.length > 0 ? (
                  <div>
                    <p className="message-title">Advisory</p>
                    <ul className="message-list advisory-list">
                      {report.advisoryMessages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <fieldset className="confirmation-list">
                  <legend>Manual confirmations</legend>
                  <label>
                    <input
                      type="checkbox"
                      checked={angle.manualConfirmation.requestedAngle}
                      onChange={(event) => updateManualConfirmation(angle, "requestedAngle", event.currentTarget.checked)}
                      aria-label={`${angle.label}: requested angle followed`}
                    />
                    Requested angle followed
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={angle.manualConfirmation.neutralExpression}
                      onChange={(event) => updateManualConfirmation(angle, "neutralExpression", event.currentTarget.checked)}
                      aria-label={`${angle.label}: neutral expression with lips gently closed`}
                    />
                    Neutral expression, lips gently closed
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={angle.manualConfirmation.onePerson}
                      onChange={(event) => updateManualConfirmation(angle, "onePerson", event.currentTarget.checked)}
                      aria-label={`${angle.label}: one person visible`}
                    />
                    One person visible
                  </label>
                </fieldset>
                <label className="form-field">
                  <span className="small-text" id={`${angle.id}-replace-upload-label`}>
                    Replace upload for {angle.label.toLowerCase()}
                  </span>
                  <input
                    className="file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    capture="user"
                    aria-labelledby={`${angle.id}-replace-upload-label`}
                    aria-invalid={report.blockingMessages.length > 0 ? "true" : undefined}
                    onChange={(event) => void handleFile(angle, event)}
                  />
                </label>
                <div className="button-row compact-buttons">
                  <Button variant="secondary" onClick={() => retake(angle.id)} aria-label={`Retake ${angle.label} from quality review`}>
                    Retake
                  </Button>
                  <Button variant="ghost" onClick={() => remove(angle.id)} aria-label={`Remove ${angle.label} from quality review`}>
                    Remove
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </Card>
      {reviewReport.canContinue ? (
        <Alert title="Blocking checks resolved" tone="success">
          Required RGB images are present and blocking browser checks have passed. Advisory items remain honest guidance, not facial analysis.
        </Alert>
      ) : (
        <Alert title="Capture needs attention" tone="warning" role="alert">
          Resolve missing images, unsupported files, unreadable images, undersized images, oversized files, or exact duplicate angle images before continuing.
        </Alert>
      )}
      {!reviewReport.canContinue ? <RecoveryActionList plans={[getRecoveryPlan("missingView")]} /> : null}
      <div className="button-row">
        <Button disabled={!reviewReport.canContinue} onClick={onContinue}>
          Continue to attribute confirmation
        </Button>
        <Button variant="danger" onClick={cancelSession}>
          Cancel session and delete temporary images
        </Button>
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {completedAngles} of 5 required capture angles completed. Current angle is {currentAngle.label}.
      </div>
    </section>
  );
}

function CircularGuidedCapturePanel({
  cameraError,
  cameraErrorCode,
  circularCanBegin,
  currentAngle,
  guidedScanState,
  guidedStage,
  visualState,
  isAnalyzingGuidance,
  isOffline,
  isStartingCamera,
  lifecycleNotice,
  liveCoverageDecision,
  liveGuidance,
  mobileRuntime,
  customerAssistedMode,
  customerMode,
  acceptedLiveFrameCount,
  previewIsMirrored,
  reviewReportCanContinue,
  streamActive,
  videoRef,
  onBeginFirstPass,
  onCancel,
  onCaptureStill,
  onClose,
  onContinue,
  onOpenCoverageReview,
  onRetakeMissingArea,
  onStartCamera,
  onStopCamera,
  onSwitchCamera,
  onUseFallback
}: {
  cameraError: string | null;
  cameraErrorCode: CameraAccessError["code"] | null;
  circularCanBegin: boolean;
  currentAngle: CapturedAngle;
  guidedScanState: GuidedScanState;
  guidedStage: GuidedCircularStage;
  visualState: SetupReferenceVisualState | null;
  isAnalyzingGuidance: boolean;
  isOffline: boolean;
  isStartingCamera: boolean;
  lifecycleNotice: string | null;
  liveCoverageDecision: GuidedLiveFrameDecision | null;
  liveGuidance: CaptureGuidanceReport | null;
  mobileRuntime: MobileScanRuntimeState | null;
  customerAssistedMode: boolean;
  customerMode: boolean;
  acceptedLiveFrameCount: number;
  previewIsMirrored: boolean;
  reviewReportCanContinue: boolean;
  streamActive: boolean;
  videoRef: (node: HTMLVideoElement | null) => void;
  onBeginFirstPass: () => void;
  onCancel: () => void;
  onCaptureStill: () => void;
  onClose: () => void;
  onContinue: () => void;
  onOpenCoverageReview: () => void;
  onRetakeMissingArea: () => void;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onSwitchCamera: () => void;
  onUseFallback: () => void;
}) {
  const firstPass = guidedScanState.passes.find((pass) => pass.id === "first") ?? guidedScanState.passes[0];
  const secondPass = guidedScanState.passes.find((pass) => pass.id === "second") ?? guidedScanState.passes[1];
  const activePass = guidedStage === "secondPass" || guidedStage === "coverageReview" ? secondPass : firstPass;
  const displayedSegments = createDisplayedSegments(activePass.segments, visualState);
  const captureMode = getReferenceCaptureMode(guidedStage, streamActive, visualState);
  const completionVisible = captureMode === "complete";
  const activeInstruction = getCircularInstruction({
    stage: guidedStage,
    streamActive,
    circularCanBegin,
    liveGuidance,
    liveCoverageDecision
  });
  const displayInstruction = getReferenceInstruction(captureMode, activeInstruction, visualState);
  const firstProgress = getGuidedScanCoveragePercent(firstPass);
  const secondProgress = getGuidedScanCoveragePercent(secondPass);
  const secondTargets = getSecondPassTargets(guidedScanState);
  const selectiveRegion = getSelectiveRetakeRegion(guidedScanState);
  const primaryStatus = getReferenceStatusLabel({ captureMode, cameraError, circularCanBegin, liveCoverageDecision, visualState });
  const statusDetail = getReferenceStatusDetail({ cameraError, liveCoverageDecision, visualState });

  return (
    <section className="setup-flow-screen setup-capture-screen" aria-labelledby="guided-circular-title" data-testid={`setup-${captureMode}`}>
      <div className="setup-capture-topbar">
        <button className="setup-top-control" type="button" onClick={onClose} aria-label="Close face scan">
          <span aria-hidden="true">‹</span>
        </button>
        <span className="setup-camera-dot" aria-hidden="true" />
      </div>
      <div className="setup-capture-main">
        <div className="setup-camera-shell" data-mode={captureMode} data-active={streamActive || Boolean(visualState)} data-mirrored={previewIsMirrored}>
          <div className="setup-camera-frame" aria-label={completionVisible ? "Completed face scan preview" : "Guided face scan camera frame"}>
            {streamActive ? <video ref={videoRef} autoPlay playsInline muted aria-label="Guided face scan camera preview" /> : <SetupCameraPlaceholder mode={captureMode} />}
            <SegmentedCoverageRing segments={displayedSegments} passID={activePass.id} compact />
            <span className="setup-scan-sheen" aria-hidden="true" />
            <span className="guided-face-bracket guided-face-bracket-tl" aria-hidden="true" />
            <span className="guided-face-bracket guided-face-bracket-tr" aria-hidden="true" />
            <span className="guided-face-bracket guided-face-bracket-bl" aria-hidden="true" />
            <span className="guided-face-bracket guided-face-bracket-br" aria-hidden="true" />
          </div>
        </div>

        <div className="setup-capture-copy" aria-live="polite" aria-atomic="true">
          <h1 id="guided-circular-title">{completionVisible ? "First GameFace scan complete." : displayInstruction}</h1>
          <p>{completionVisible ? "Continue to build your GameFace." : statusDetail}</p>
          <span className="sr-only" role="status">
            {primaryStatus}. First pass {firstProgress}% complete. Second pass {secondProgress}% complete. Accepted live frames: {acceptedLiveFrameCount}.
          </span>
        </div>

        <div className="setup-bottom-actions setup-capture-actions">
          {cameraError ? (
            <Alert title={cameraErrorCode === "permissionDenied" ? "Camera denied" : "Camera unavailable"} tone="warning" role="alert">
              {cameraError} Allow camera access or use the assisted five-angle capture option.
            </Alert>
          ) : null}
          {mobileRuntime?.warnings.length ? (
            <Alert title={mobileRuntime.isLikelyIPhoneSafari ? "iPhone scan readiness" : "Mobile scan readiness"} tone="info" role="status">
              <ul className="message-list advisory-list">
                {mobileRuntime.warnings.slice(0, 3).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          {lifecycleNotice ? (
            <Alert title="Session paused" tone="warning" role="status">
              {lifecycleNotice}
            </Alert>
          ) : null}
          {customerAssistedMode ? (
            <Alert title="Assisted scan mode" tone="info" role="status">
              Move one direction at a time and hold still when the guide asks. The scan still uses the same quality checks.
            </Alert>
          ) : null}
          {isOffline ? (
            <Alert title="Offline" tone="warning">
              Capture remains local. Billing or catalog checks may need network before production scanning can continue.
            </Alert>
          ) : null}
          <Button
            className="setup-primary-button"
            onClick={completionVisible ? onContinue : streamActive ? onBeginFirstPass : onStartCamera}
            disabled={isStartingCamera || (!completionVisible && streamActive && !circularCanBegin)}
            aria-label={completionVisible ? "Continue after completed scan" : streamActive ? "Begin guided circular scan" : "Start camera"}
          >
            {completionVisible ? "Done" : streamActive ? (isStartingCamera ? "Starting..." : "Begin Scan") : isStartingCamera ? "Starting..." : "Start Camera"}
          </Button>
          {!completionVisible ? (
            <>
              <Button variant="secondary" className="setup-secondary-button" onClick={onUseFallback}>
                {customerMode && customerAssistedMode ? "Assisted Mode On" : "Accessibility Options"}
              </Button>
              <Button variant="secondary" className="setup-secondary-button" onClick={onCancel}>
                Start Over
              </Button>
            </>
          ) : (
            <Button variant="secondary" className="setup-secondary-button" onClick={onOpenCoverageReview}>
              Review coverage
            </Button>
          )}
          <details className="setup-disclosure">
            <summary>Scan details</summary>
            <p>
              {customerMode
                ? "This web version uses your camera to capture the angles needed for your GameFace. Progress counts only when the frame is clear and useful."
                : "Circular progress advances only after a stable, distinct live frame passes face, pose, blur, exposure, and duplicate-angle checks."}
            </p>
            <QualityGateList gate={guidedScanState.initialQualityGate} />
            <LiveCoverageDecisionPanel decision={liveCoverageDecision} acceptedLiveFrameCount={acceptedLiveFrameCount} streamActive={streamActive} />
            {cameraErrorCode ? <CameraBlockedRecoveryList steps={getCameraBlockedRecoverySteps({ isLikelyIPhoneSafari: Boolean(mobileRuntime?.isLikelyIPhoneSafari), secureContext: Boolean(mobileRuntime?.secureContext ?? true) })} /> : null}
            <p>Second-pass targets: {secondTargets.length > 0 ? secondTargets.map(formatGuidedRegionID).join(", ") : "none"}.</p>
            <div className="button-row compact-buttons">
              <Button variant="ghost" onClick={onCaptureStill} disabled={!streamActive} aria-label={`Capture fallback still for ${currentAngle.label}`}>
                Capture current view
              </Button>
              <Button variant="ghost" onClick={onSwitchCamera}>
                Switch camera
              </Button>
              <Button variant="ghost" onClick={onStopCamera} disabled={!streamActive}>
                Stop camera
              </Button>
              <Button variant="ghost" onClick={onRetakeMissingArea} disabled={!selectiveRegion && !reviewReportCanContinue}>
                Retake missing area
              </Button>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}

function SetupCameraPlaceholder({ mode }: { mode: "positioning" | "scan" | "complete" }) {
  if (mode === "complete") {
    return (
      <div className="setup-complete-glyph" aria-hidden="true">
        <svg viewBox="0 0 120 120" focusable="false">
          <circle cx="60" cy="60" r="42" />
          <path d="M40 63l14 14 29-35" />
        </svg>
      </div>
    );
  }
  return (
    <div className="guided-face-outline setup-face-placeholder" aria-hidden="true">
      <span className="guided-face-head" />
      <span className="guided-face-neck" />
      <span className="guided-face-shoulders" />
    </div>
  );
}

function SegmentedCoverageRing({
  compact = false,
  segments,
  passID
}: {
  compact?: boolean;
  segments: GuidedScanState["passes"][number]["segments"];
  passID: GuidedScanPassID;
}) {
  const visualTicksPerSegment = compact ? 4 : 1;
  const totalTicks = segments.length * visualTicksPerSegment;
  return (
    <div className="coverage-ring" data-compact={compact ? "true" : "false"} aria-label={`${passID === "first" ? "First" : "Second"} pass circular coverage`}>
      {segments.flatMap((segment, segmentIndex) =>
        Array.from({ length: visualTicksPerSegment }, (_, tickIndex) => {
          const tickNumber = segmentIndex * visualTicksPerSegment + tickIndex;
          return (
            <span
              aria-hidden={tickIndex === 0 ? undefined : "true"}
              aria-label={tickIndex === 0 ? `${segment.label}: ${formatCoverageStatus(segment.status)}` : undefined}
              className="coverage-ring-segment"
              data-status={segment.status}
              key={`${segment.id}-${tickIndex}`}
              style={{ transform: `rotate(${(tickNumber * 360) / totalTicks}deg)` }}
            />
          );
        })
      )}
    </div>
  );
}

function PassStatusCard({
  detail,
  id,
  instruction,
  progress,
  status,
  title
}: {
  detail?: string;
  id: GuidedScanPassID;
  instruction: string;
  progress: number;
  status: "waiting" | "active" | "complete";
  title: string;
}) {
  return (
    <article className="guided-pass-card" data-pass={id} data-status={status}>
      <div className="status-row">
        <div>
          <p className="eyebrow">{status === "complete" ? `${id === "first" ? "First scan" : "Second scan"} complete` : `${progress}% complete`}</p>
          <h2>{title}</h2>
        </div>
        <StatusBadge tone={status === "complete" ? "success" : status === "active" ? "info" : "neutral"}>{status}</StatusBadge>
      </div>
      <p>{instruction}</p>
      {detail ? <p className="field-note">{detail}</p> : null}
      <ProgressBar value={progress} max={100} label={`${title} accepted coverage`} />
    </article>
  );
}

function QualityGateList({ gate }: { gate: GuidedScanQualityGate }) {
  const items: Array<{ id: keyof GuidedScanQualityGate; label: string }> = [
    { id: "singleFace", label: "Exactly one face" },
    { id: "centered", label: "Face centered" },
    { id: "acceptableDistance", label: "Acceptable distance" },
    { id: "acceptableLighting", label: "Acceptable lighting" },
    { id: "acceptableSharpness", label: "Acceptable sharpness" },
    { id: "neutralExpression", label: "Neutral expression" },
    { id: "requiredRegionsVisible", label: "Required regions visible" }
  ];
  return (
    <ul className="guided-quality-list" aria-label="Initial quality gates">
      {items.map((item) => (
        <li key={item.id} data-passed={gate[item.id]}>
          <span aria-hidden="true">{gate[item.id] ? "OK" : "..."}</span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function LiveCoverageDecisionPanel({
  acceptedLiveFrameCount,
  decision,
  streamActive
}: {
  acceptedLiveFrameCount: number;
  decision: GuidedLiveFrameDecision | null;
  streamActive: boolean;
}) {
  const tone = !streamActive ? "neutral" : decision?.status === "accepted" ? "success" : decision?.status === "rejected" ? "warning" : "info";
  const status = !streamActive ? "waiting" : decision ? formatLiveDecisionStatus(decision.status) : "checking";
  return (
    <div className="guided-quality-card" aria-live="polite" aria-atomic="true">
      <div className="status-row">
        <strong>Live coverage decision</strong>
        <StatusBadge tone={tone}>{status}</StatusBadge>
      </div>
      <p className="supporting">
        {decision?.assignedSegmentID
          ? `Current region: ${formatSegmentLabel(decision.assignedSegmentID)}. Accepted live frames: ${acceptedLiveFrameCount}.`
          : streamActive
            ? `Accepted live frames: ${acceptedLiveFrameCount}. Waiting for a usable guided region.`
            : "Start the camera to evaluate live face coverage."}
      </p>
      {decision?.status === "rejected" && decision.rejectionReasons.length > 0 ? (
        <ul className="message-list advisory-list">
          {decision.rejectionReasons.slice(0, 3).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
      {decision?.status === "pendingStability" ? <p className="field-note">Hold this view briefly. Coverage is not counted until samples agree.</p> : null}
      {decision?.status === "accepted" ? <p className="field-note">This region was accepted and connected to the profile-capture queue.</p> : null}
    </div>
  );
}

function CameraBlockedRecoveryList({ steps }: { steps: string[] }) {
  return (
    <div className="guided-quality-card" aria-label="Camera blocked recovery steps">
      <strong>Camera access recovery</strong>
      <ol className="message-list advisory-list">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="field-note">You can also use Accessibility Options for the assisted five-angle capture path.</p>
    </div>
  );
}

function CircularCoverageReviewPanel({
  completedAngles,
  coverageRegions,
  guidedScanState,
  onContinue,
  onRetake,
  onUseFallback,
  reviewReportCanContinue,
  showDetail
}: {
  completedAngles: number;
  coverageRegions: CaptureCoverageRegion[];
  guidedScanState: GuidedScanState;
  onContinue: () => void;
  onRetake: (angleID: CapturedAngleID) => void;
  onUseFallback: () => void;
  reviewReportCanContinue: boolean;
  showDetail: boolean;
}) {
  const weakRegions = guidedScanState.reviewRegions.filter((region) => region.status !== "complete");
  const attentionRegions = coverageRegions.filter((region) => region.state !== "sufficient");
  const singleRetakeRegion = attentionRegions.find((region) => region.retakeAngleIDs.length === 1);
  return (
    <Card className="guided-review-panel" tone={reviewReportCanContinue ? "success" : "info"}>
      <div className="status-row">
        <div>
          <p className="eyebrow">Coverage review</p>
          <h2>{reviewReportCanContinue ? "Face scan complete" : "Review scan coverage"}</h2>
        </div>
        <StatusBadge tone={reviewReportCanContinue ? "success" : "warning"}>
          {reviewReportCanContinue ? "complete" : `${completedAngles} of 5 fallback views`}
        </StatusBadge>
      </div>
      <p>
        Circular coverage is based on accepted live frames. The profile step still requires the existing five validated RGB views, and accepted circular regions
        queue those same views without storing raw video in the saved profile.
      </p>
      {showDetail ? (
        <>
          <div className="guided-region-grid" aria-label="Guided scan region status">
            {guidedScanState.reviewRegions.map((region) => (
              <GuidedRegionCard key={region.id} region={region} />
            ))}
          </div>
          <div className="guided-region-grid" aria-label="Fallback capture coverage status">
            {coverageRegions.map((region) => (
              <article className={`coverage-region coverage-${region.state}`} key={region.definition.id}>
                <strong>{region.definition.label}</strong>
                <p>{region.statusText}</p>
                <p className="field-note">Supporting views: {formatAngleIDs(region.supportingAngleIDs)}</p>
                {region.retakeAngleIDs.length > 0 ? (
                  <div className="button-row compact-buttons">
                    {region.retakeAngleIDs.map((angleID) => (
                      <Button variant="secondary" key={angleID} onClick={() => onRetake(angleID)}>
                        Retake {angleLabel(angleID)}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </>
      ) : null}
      {weakRegions.length > 0 ? (
        <Alert title="Second-pass targets" tone="warning">
          One more scan for better detail should focus on {weakRegions.map((region) => region.label.toLowerCase()).join(", ")}.
        </Alert>
      ) : null}
      <div className="button-row">
        <Button disabled={!reviewReportCanContinue} onClick={onContinue}>
          Create my game face
        </Button>
        <Button variant="secondary" onClick={singleRetakeRegion ? () => onRetake(singleRetakeRegion.retakeAngleIDs[0]) : onUseFallback}>
          {singleRetakeRegion ? "Retake missing area" : "Use assisted five-angle capture"}
        </Button>
      </div>
    </Card>
  );
}

function GuidedRegionCard({ region }: { region: GuidedScanReviewRegion }) {
  return (
    <article className="guided-region-card" data-status={region.status}>
      <div className="status-row">
        <strong>{region.label}</strong>
        <StatusBadge tone={region.status === "complete" ? "success" : region.status === "optionalImprovement" ? "warning" : "danger"}>
          {formatRegionStatus(region.status)}
        </StatusBadge>
      </div>
      <p className="field-note">Circular support: {region.supportingSegments.map(formatSegmentLabel).join(", ")}</p>
    </article>
  );
}

function CoverageMapPanel({
  coverageRegions,
  onRetake
}: {
  coverageRegions: CaptureCoverageRegion[];
  onRetake: (angleID: CapturedAngleID) => void;
}) {
  const attentionCount = coverageRegions.filter((region) => region.state !== "sufficient").length;
  return (
    <section className="coverage-map-panel" aria-labelledby="coverage-map-title">
      <div className="status-row">
        <div>
          <p className="eyebrow">Coverage map</p>
          <h3 id="coverage-map-title">Selective retake by face region</h3>
        </div>
        <StatusBadge tone={attentionCount === 0 ? "success" : "warning"}>{attentionCount === 0 ? "All sufficient" : `${attentionCount} need review`}</StatusBadge>
      </div>
      <p className="supporting">
        Coverage is estimated from required RGB view presence, browser quality checks, local guidance messages, and your manual confirmations. Icons and text
        are shown with color so the map is readable without relying on color alone.
      </p>
      <div className="coverage-map-grid" aria-label="Face-region coverage states">
        {coverageRegions.map((region) => (
          <article
            className={`coverage-region coverage-${region.state}`}
            key={region.definition.id}
            aria-labelledby={`coverage-${region.definition.id}-title`}
            aria-describedby={`coverage-${region.definition.id}-message`}
          >
            <div className="coverage-region-header">
              <span className="coverage-icon" aria-hidden="true">
                {coverageIconForState(region.state)}
              </span>
              <div>
                <strong id={`coverage-${region.definition.id}-title`}>{region.definition.label}</strong>
                <span>{region.definition.icon} region cue</span>
              </div>
              <StatusBadge tone={coverageTone(region.state)}>{region.statusText}</StatusBadge>
            </div>
            <p id={`coverage-${region.definition.id}-message`}>{region.messages[0]}</p>
            <p className="field-note">Supporting views: {formatAngleIDs(region.supportingAngleIDs)}</p>
            {region.retakeAngleIDs.length > 0 ? (
              <div className="button-row compact-buttons">
                {region.retakeAngleIDs.map((angleID) => (
                  <Button
                    variant="secondary"
                    key={angleID}
                    onClick={() => onRetake(angleID)}
                    aria-label={`Retake ${angleLabel(angleID)} for ${region.definition.label} coverage`}
                  >
                    Retake {angleLabel(angleID)}
                  </Button>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function LiveGuidancePanel({
  guidance,
  isAnalyzing,
  isCameraActive
}: {
  guidance: CaptureGuidanceReport | null;
  isAnalyzing: boolean;
  isCameraActive: boolean;
}) {
  if (!isCameraActive) {
    return (
      <div className="live-guidance-card" aria-live="polite" aria-atomic="true">
        <div className="status-row">
          <strong>Live guidance</strong>
          <StatusBadge tone="neutral">inactive</StatusBadge>
        </div>
        <p className="supporting">Start the camera for local pose, distance, expression, lighting, blur, and hold guidance. Upload fallback stays available.</p>
      </div>
    );
  }
  const tone = guidance?.canCapture ? "success" : guidance?.blockingIssues.length ? "danger" : "warning";
  const status = guidance?.canCapture ? "ready" : guidance?.blockingIssues.length ? "adjust" : isAnalyzing ? "checking" : "review";
  return (
    <div className="live-guidance-card" aria-live="polite" aria-atomic="true">
      <div className="status-row">
        <strong>Live local guidance</strong>
        <StatusBadge tone={tone}>{status}</StatusBadge>
      </div>
      <p className="supporting">
        {guidance
          ? `Protocol ${guidance.protocolVersion}. Browser RGB guidance only; not TrueDepth or identity recognition.`
          : "Analyzing locally in this browser. Manual capture remains available."}
      </p>
      {guidance ? (
        <>
          <ProgressBar value={guidance.realtimeQuality.score} max={100} label="Live capture quality score" />
          <ProgressBar value={Math.min(guidance.holdDurationMs, guidance.holdTargetMs)} max={guidance.holdTargetMs} label="Steady hold" />
          <p className="supporting">
            Local quality score {guidance.realtimeQuality.score}/100. Blocking signals: {guidance.realtimeQuality.blockingSignalCount}; advisory signals:{" "}
            {guidance.realtimeQuality.advisorySignalCount}.
          </p>
          <GuidanceIssueList guidance={guidance} title="Live guidance" />
        </>
      ) : null}
      <div className="sr-only" role="status">
        {guidance ? guidance.readyMessages[0]?.message ?? guidance.blockingIssues[0]?.message ?? guidance.advisoryWarnings[0]?.message : "Live guidance pending."}
      </div>
    </div>
  );
}

function GuidanceIssueList({ guidance, title }: { guidance: CaptureGuidanceReport; title: string }) {
  const messages = [
    ...guidance.blockingIssues.map((issue) => ({ ...issue, className: "blocking-list" })),
    ...guidance.advisoryWarnings.map((issue) => ({ ...issue, className: "advisory-list" })),
    ...guidance.readyMessages.map((issue) => ({ ...issue, className: "ready-list" }))
  ];
  if (messages.length === 0) return null;
  return (
    <div>
      <p className="message-title">{title}</p>
      <ul className="message-list">
        {messages.map((issue) => (
          <li className={issue.className} key={`${issue.code}-${issue.message}`}>
            {issue.message}
          </li>
        ))}
      </ul>
      <RecoveryActionList plans={messages.map((issue) => recoveryPlanForGuidanceIssue(issue.code))} title="Capture recovery action" />
    </div>
  );
}

function readImageElement(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unreadable image"));
    image.src = objectUrl;
  });
}

function revokeObjectUrls(objectUrls: string[]) {
  objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
}

function formatBytes(value: number) {
  if (value <= 0) return "0 B";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${Math.round((value / (1024 * 1024)) * 10) / 10} MB`;
}

function formatMetric(value: number | null) {
  return value === null ? "Not measured" : String(value);
}

function createPreviewQualityReport(
  video: HTMLVideoElement
): Pick<
  ImageQualityReport,
  "brightnessEstimate" | "highlightClippingEstimate" | "shadowClippingEstimate" | "sharpnessEstimate" | "lightingImbalanceEstimate"
> | undefined {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (width === 0 || height === 0) return undefined;
  const sampleWidth = Math.min(width, 240);
  const sampleHeight = Math.max(1, Math.round((height / width) * sampleWidth));
  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return undefined;
  context.drawImage(video, 0, 0, sampleWidth, sampleHeight);
  const imageData = context.getImageData(0, 0, sampleWidth, sampleHeight);
  const measurements = calculateImageMeasurements({
    width: sampleWidth,
    height: sampleHeight,
    rgba: imageData.data
  });
  return {
    brightnessEstimate: {
      value: measurements.brightness,
      evidence: "estimated",
      label: "Live brightness estimate"
    },
    highlightClippingEstimate: {
      value: measurements.highlightClipping,
      evidence: "estimated",
      label: "Live highlight clipping estimate"
    },
    shadowClippingEstimate: {
      value: measurements.shadowClipping,
      evidence: "estimated",
      label: "Live shadow clipping estimate"
    },
    sharpnessEstimate: {
      value: measurements.sharpness,
      evidence: "estimated",
      label: "Live sharpness estimate"
    },
    lightingImbalanceEstimate: {
      value: measurements.lightingImbalance,
      evidence: "estimated",
      label: "Live lighting imbalance estimate"
    }
  };
}

function formatFaceCount(report?: FaceLandmarkReport) {
  if (!report) return "Not checked";
  if (report.faceCount === "zero") return "Zero";
  if (report.faceCount === "one") return "One";
  if (report.faceCount === "multiple") return `${report.detectedFaceCount ?? "Multiple"}`;
  if (report.faceCount === "error") return "Error";
  return "Unavailable";
}

function formatHeadPose(report: FaceLandmarkReport) {
  const pose = report.faces[0]?.approximateHeadPose;
  if (!pose || pose.availabilityState !== "available") return "Unavailable";
  return `Yaw ${pose.yawDegrees ?? "N/A"} / Pitch ${pose.pitchDegrees ?? "N/A"} / Roll ${pose.rollDegrees ?? "N/A"}`;
}

function formatExpression(report: FaceLandmarkReport) {
  const expression = report.faces[0]?.expression;
  if (!expression || expression.availabilityState !== "available") return "Unavailable";
  const parts = [
    expression.leftEyeOpenness === null ? null : `L eye ${expression.leftEyeOpenness}`,
    expression.rightEyeOpenness === null ? null : `R eye ${expression.rightEyeOpenness}`,
    expression.mouthOpenness === null ? null : `Mouth ${expression.mouthOpenness}`,
    expression.smileLikelihood === null ? null : `Smile ${expression.smileLikelihood}`
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "Unavailable";
}

function coverageTone(state: CaptureCoverageState) {
  if (state === "sufficient") return "success";
  if (state === "weak") return "warning";
  return "danger";
}

function coverageIconForState(state: CaptureCoverageState) {
  if (state === "sufficient") return "OK";
  if (state === "weak") return "!";
  if (state === "missing") return "X";
  return "?";
}

function formatAngleIDs(angleIDs: CapturedAngleID[]) {
  return angleIDs.map(angleLabel).join(", ");
}

function angleLabel(angleID: CapturedAngleID) {
  const labels: Record<CapturedAngleID, string> = {
    straightOn: "front",
    left45: "left 45",
    right45: "right 45",
    leftProfile: "left profile",
    rightProfile: "right profile"
  };
  return labels[angleID];
}

function useSetupReferenceVisualState(): SetupReferenceVisualState | null {
  const [visualState, setVisualState] = useState<SetupReferenceVisualState | null>(null);
  useEffect(() => {
    const visualTestsEnabled = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_GFM_SETUP_VISUAL_TESTS === "1";
    if (!visualTestsEnabled || typeof window === "undefined") return;
    const value = new URLSearchParams(window.location.search).get("setupVisualState");
    const allowed: SetupReferenceVisualState[] = ["positioning", "scan-empty", "scan-partial", "scan-near-complete", "complete", "denied", "multiple", "accessibility"];
    setVisualState(allowed.includes(value as SetupReferenceVisualState) ? (value as SetupReferenceVisualState) : null);
  }, []);
  return visualState;
}

function getReferenceCaptureMode(
  guidedStage: GuidedCircularStage,
  streamActive: boolean,
  visualState: SetupReferenceVisualState | null
): "positioning" | "scan" | "complete" {
  if (visualState === "complete") return "complete";
  if (visualState === "scan-empty" || visualState === "scan-partial" || visualState === "scan-near-complete") return "scan";
  if (guidedStage === "coverageReview") return "complete";
  if (guidedStage === "firstPass" || guidedStage === "secondPass" || guidedStage === "firstPassComplete") return "scan";
  return streamActive ? "positioning" : "positioning";
}

function getReferenceInstruction(captureMode: "positioning" | "scan" | "complete", activeInstruction: string, visualState: SetupReferenceVisualState | null) {
  if (visualState === "denied") return "Camera access is needed to continue.";
  if (visualState === "multiple") return "Only one face can be in the frame.";
  if (visualState === "accessibility") return "Use assisted capture if circular movement is difficult.";
  if (captureMode === "scan") return "Move your head slowly to complete the circle.";
  return activeInstruction === "Start the camera when you are ready." ? "Position your face within the frame." : activeInstruction;
}

function createDisplayedSegments(
  segments: GuidedScanState["passes"][number]["segments"],
  visualState: SetupReferenceVisualState | null
): GuidedScanState["passes"][number]["segments"] {
  const acceptedCount =
    visualState === "scan-partial" ? 5 : visualState === "scan-near-complete" ? 7 : visualState === "complete" ? segments.length : 0;
  if (acceptedCount === 0) return segments;
  return segments.map((segment, index) => ({
    ...segment,
    status: index < acceptedCount ? ("accepted" as const) : segment.status
  }));
}

function getReferenceStatusLabel({
  cameraError,
  captureMode,
  circularCanBegin,
  liveCoverageDecision,
  visualState
}: {
  cameraError: string | null;
  captureMode: "positioning" | "scan" | "complete";
  circularCanBegin: boolean;
  liveCoverageDecision: GuidedLiveFrameDecision | null;
  visualState: SetupReferenceVisualState | null;
}) {
  if (captureMode === "complete") return "First GameFace scan complete.";
  if (visualState === "denied" || cameraError) return "Camera permission denied.";
  if (visualState === "multiple") return "More than one face detected.";
  if (captureMode === "scan" && liveCoverageDecision?.assignedSegmentID) return `${formatSegmentLabel(liveCoverageDecision.assignedSegmentID)} accepted.`;
  if (captureMode === "scan") return "Move your head slowly to complete the circle.";
  return circularCanBegin ? "Face positioned." : "Position your face within the frame.";
}

function getReferenceStatusDetail({
  cameraError,
  liveCoverageDecision,
  visualState
}: {
  cameraError: string | null;
  liveCoverageDecision: GuidedLiveFrameDecision | null;
  visualState: SetupReferenceVisualState | null;
}) {
  if (visualState === "denied" || cameraError) return "Allow camera access or use the assisted five-angle capture option.";
  if (visualState === "multiple") return "Only one person can be in the scan.";
  if (visualState === "accessibility") return "Use assisted capture for a step-by-step set of poses instead of circular movement.";
  if (liveCoverageDecision?.status === "rejected" && liveCoverageDecision.rejectionReasons[0]) return liveCoverageDecision.rejectionReasons[0];
  return "Keep your face centered with even light and a neutral expression.";
}

function createUiGuidedScanState({
  permissionGranted,
  qualityGate
}: {
  permissionGranted: boolean;
  qualityGate: GuidedScanQualityGate;
}): GuidedScanState {
  const state = createInitialGuidedScanState();
  return {
    ...state,
    permissionGranted,
    initialQualityGate: qualityGate
  };
}

function createGuidedScanQualityGate(guidance: CaptureGuidanceReport | null): GuidedScanQualityGate {
  if (!guidance) {
    return {
      singleFace: false,
      centered: false,
      acceptableDistance: false,
      acceptableLighting: false,
      acceptableSharpness: false,
      neutralExpression: false,
      requiredRegionsVisible: false
    };
  }
  const blockingCodes = new Set(guidance.blockingIssues.map((issue) => issue.code));
  const advisoryCodes = new Set(guidance.advisoryWarnings.map((issue) => issue.code));
  return {
    singleFace: !blockingCodes.has("faceNotFound") && !blockingCodes.has("multipleFaces"),
    centered: !blockingCodes.has("faceOffCenter"),
    acceptableDistance: !blockingCodes.has("faceTooClose") && !blockingCodes.has("faceTooFar"),
    acceptableLighting: !blockingCodes.has("underexposed") && !blockingCodes.has("overexposed") && !blockingCodes.has("lightingImbalance"),
    acceptableSharpness: !blockingCodes.has("severeBlur"),
    neutralExpression: !advisoryCodes.has("mouthOpen") && !advisoryCodes.has("strongExpression"),
    requiredRegionsVisible: !blockingCodes.has("missingRequiredRegion") && !blockingCodes.has("occlusionLikely")
  };
}

function getCircularInstruction({
  circularCanBegin,
  liveCoverageDecision,
  liveGuidance,
  stage,
  streamActive
}: {
  circularCanBegin: boolean;
  liveCoverageDecision: GuidedLiveFrameDecision | null;
  liveGuidance: CaptureGuidanceReport | null;
  stage: GuidedCircularStage;
  streamActive: boolean;
}) {
  if (!streamActive) return "Start the camera when you are ready.";
  if (stage === "coverageReview") return "Review which areas are complete and which need another look.";
  if (stage === "selectiveRetake") return "Retake only the missing area instead of restarting the scan.";
  if (stage === "firstPassComplete") return "First scan complete";
  if (stage === "secondPass") return "One more scan for better detail";
  if (liveCoverageDecision?.status === "accepted" && liveCoverageDecision.assignedSegmentID) {
    return `${formatSegmentLabel(liveCoverageDecision.assignedSegmentID)} coverage accepted.`;
  }
  if (liveCoverageDecision?.status === "pendingStability") return "Hold still.";
  if (liveCoverageDecision?.status === "rejected" && liveCoverageDecision.rejectionReasons[0]) return liveCoverageDecision.rejectionReasons[0];
  const firstBlocking = liveGuidance?.blockingIssues[0]?.message;
  const firstReady = liveGuidance?.readyMessages[0]?.message;
  if (stage === "firstPass" && circularCanBegin) return "Move your head slowly to complete the circle";
  if (firstBlocking) return firstBlocking;
  if (firstReady) return "Hold still.";
  return "Position your face inside the circle";
}

function getLiveCoveragePassID(stage: GuidedCircularStage): GuidedScanPassID {
  if (stage === "secondPass" || stage === "coverageReview" || stage === "selectiveRetake") return "second";
  return "first";
}

function triggerGuidedCaptureHaptic(durationMs: number) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(durationMs);
  } catch {
    // Browser haptics are optional; capture must continue when unsupported.
  }
}

function formatLiveDecisionStatus(status: GuidedLiveFrameDecision["status"]) {
  const labels: Record<GuidedLiveFrameDecision["status"], string> = {
    accepted: "accepted",
    pendingStability: "hold",
    rejected: "adjust"
  };
  return labels[status];
}

function formatCoverageStatus(status: GuidedScanCoverageStatus) {
  const labels: Record<GuidedScanCoverageStatus, string> = {
    missing: "Missing",
    accepted: "Accepted",
    weak: "Weak",
    duplicateRejected: "Duplicate rejected",
    qualityRejected: "Quality rejected"
  };
  return labels[status];
}

function formatRegionStatus(status: GuidedScanReviewRegion["status"]) {
  const labels: Record<GuidedScanReviewRegion["status"], string> = {
    complete: "Complete",
    needsAnotherLook: "Needs another look",
    optionalImprovement: "Optional improvement"
  };
  return labels[status];
}

function formatGuidedRegionID(regionID: GuidedScanReviewRegion["id"]) {
  const labels: Record<GuidedScanReviewRegion["id"], string> = {
    frontView: "front view",
    leftSide: "left side",
    rightSide: "right side",
    jawAndChin: "jaw and chin",
    foreheadAndHairline: "forehead and hairline",
    overallQuality: "overall quality"
  };
  return labels[regionID];
}

function formatSegmentLabel(segmentID: GuidedScanState["passes"][number]["segments"][number]["id"]) {
  const labels: Record<GuidedScanState["passes"][number]["segments"][number]["id"], string> = {
    center: "center",
    upperLeft: "upper-left",
    left: "left",
    lowerLeft: "lower-left",
    lowerCenter: "lower-center",
    lowerRight: "lower-right",
    right: "right",
    upperRight: "upper-right"
  };
  return labels[segmentID];
}
