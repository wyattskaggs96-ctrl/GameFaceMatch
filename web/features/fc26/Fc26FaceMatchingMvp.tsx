"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Alert, Button, Card, ProgressBar, ScreenHeader, StatusBadge, TextField } from "@/components/design-system";
import { createLocalFaceLandmarkProvider } from "@/lib/face-landmarks/face-landmark-worker-client";
import {
  calculateFc26Measurements,
  compareFc26Screenshots,
  createFc26Profile,
  FC26_GAME_ID,
  FC26_REQUIRED_REFERENCE_VIEWS,
  generateFc26Recipe,
  getFc26ResearchControls,
  loadFc26ProfilesFromSessionStorage,
  removeFc26TemporaryPhotoObjectUrls,
  saveFc26ProfileToSessionStorage,
  updateFc26RecipeControl,
  validateFc26Photo,
  type Fc26FaceProfile,
  type Fc26Measurement,
  type Fc26PhotoQualityReport,
  type Fc26Recipe,
  type Fc26ResearchControl,
  type Fc26ResearchData,
  type Fc26ReferenceViewID,
  type Fc26ScreenshotComparisonResult,
  type Fc26SweepViewID
} from "@/lib/fc26/fc26-face-matching";
import {
  fuseFc26SweepMeasurements,
  metadataForFc26SweepProfile,
  selectBestFc26SweepFrames,
  validateFc26SweepVideo,
  type Fc26SelectedSweepFrame,
  type Fc26SweepFrameCandidate,
  type Fc26SweepFrameReview,
  type Fc26SweepVideoMetadata,
  type Fc26SweepVideoValidationReport
} from "@/lib/fc26/fc26-guided-sweep";
import type { FaceLandmarkReport } from "@/types/domain";

interface PhotoSlot {
  viewID: Fc26ReferenceViewID;
  objectUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSizeBytes: number | null;
  width: number | null;
  height: number | null;
  landmarkReport: FaceLandmarkReport | null;
  qualityReport: Fc26PhotoQualityReport | null;
  statusMessage: string;
}

type SlotKind = "reference" | "screenshot";
type Fc26CaptureMode = "guidedSweep" | "threePhoto";

interface SweepFramePreview extends Fc26SweepFrameReview {
  thumbnailUrl: string;
}

interface SweepVideoState {
  objectUrl: string | null;
  fileName: string | null;
  metadata: Fc26SweepVideoMetadata | null;
  validationReport: Fc26SweepVideoValidationReport | null;
  status: "idle" | "recording" | "processing" | "ready" | "blocked" | "cancelled";
  progressLabel: string;
  reviewedFrames: SweepFramePreview[];
  selectedFrames: Partial<Record<Fc26SweepViewID, SweepFramePreview>>;
  missingViews: Fc26SweepViewID[];
  warnings: string[];
}

interface SweepSampleResult {
  candidates: Fc26SweepFrameCandidate[];
  thumbnailUrls: Map<string, string>;
}

const emptySlots = () =>
  Object.fromEntries(
    FC26_REQUIRED_REFERENCE_VIEWS.map((view) => [
      view.id,
      {
        viewID: view.id,
        objectUrl: null,
        fileName: null,
        fileType: null,
        fileSizeBytes: null,
        width: null,
        height: null,
        landmarkReport: null,
        qualityReport: null,
        statusMessage: "No image selected."
      } satisfies PhotoSlot
    ])
  ) as Record<Fc26ReferenceViewID, PhotoSlot>;

export function Fc26FaceMatchingMvp() {
  const providerRef = useRef<ReturnType<typeof createLocalFaceLandmarkProvider> | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const sweepProcessTokenRef = useRef(0);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [controls, setControls] = useState<Fc26ResearchControl[]>([]);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [captureMode, setCaptureMode] = useState<Fc26CaptureMode>("guidedSweep");
  const [activeProfileCaptureMethod, setActiveProfileCaptureMethod] = useState<"guided_sweep" | "three_photo">("guided_sweep");
  const [referenceSlots, setReferenceSlots] = useState(() => emptySlots());
  const [screenshotSlots, setScreenshotSlots] = useState(() => emptySlots());
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [sweepVideo, setSweepVideo] = useState<SweepVideoState>({
    objectUrl: null,
    fileName: null,
    metadata: null,
    validationReport: null,
    status: "idle",
    progressLabel: "No sweep recording selected.",
    reviewedFrames: [],
    selectedFrames: {},
    missingViews: [],
    warnings: []
  });
  const sweepVideoRef = useRef(sweepVideo);
  const [measurements, setMeasurements] = useState<Fc26Measurement[]>([]);
  const [screenshotMeasurements, setScreenshotMeasurements] = useState<Fc26Measurement[]>([]);
  const [recipe, setRecipe] = useState<Fc26Recipe | null>(null);
  const [profileName, setProfileName] = useState("FC 26 recipe");
  const [profileNote, setProfileNote] = useState("");
  const [savedProfiles, setSavedProfiles] = useState<Fc26FaceProfile[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [comparison, setComparison] = useState<Fc26ScreenshotComparisonResult | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const referenceSlotsRef = useRef(referenceSlots);
  const screenshotSlotsRef = useRef(screenshotSlots);

  useEffect(() => {
    referenceSlotsRef.current = referenceSlots;
  }, [referenceSlots]);

  useEffect(() => {
    screenshotSlotsRef.current = screenshotSlots;
  }, [screenshotSlots]);

  useEffect(() => {
    cameraStreamRef.current = cameraStream;
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = cameraStream;
    }
    return () => {
      if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
    };
  }, [cameraStream]);

  useEffect(() => {
    sweepVideoRef.current = sweepVideo;
  }, [sweepVideo]);

  useEffect(() => {
    providerRef.current = createLocalFaceLandmarkProvider();
    if (typeof window !== "undefined") {
      try {
        setSavedProfiles(loadFc26ProfilesFromSessionStorage(window.sessionStorage));
      } catch {
        setSavedProfiles([]);
      }
    }
    void fetch("/api/internal/fc26-player-creator-research", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`FC 26 research data failed to load (${response.status}).`);
        return (await response.json()) as Fc26ResearchData;
      })
      .then((research) => {
        setControls(getFc26ResearchControls(research));
        setResearchError(null);
      })
      .catch((error: unknown) => {
        setResearchError(error instanceof Error ? error.message : "FC 26 research data failed to load.");
        setControls([]);
      });
    return () => {
      const urls = [
        ...Object.values(referenceSlotsRef.current).flatMap((slot) => (slot.objectUrl ? [slot.objectUrl] : [])),
        ...Object.values(screenshotSlotsRef.current).flatMap((slot) => (slot.objectUrl ? [slot.objectUrl] : []))
      ];
      urls.forEach((url) => URL.revokeObjectURL(url));
      stopCameraStream(cameraStreamRef.current);
      revokeSweepUrls(sweepVideoRef.current);
      sweepProcessTokenRef.current += 1;
      void providerRef.current?.dispose();
    };
  }, []);

  const referenceReadyCount = Object.values(referenceSlots).filter((slot) => slot.qualityReport && slot.qualityReport.status !== "blocked").length;
  const screenshotReadyCount = Object.values(screenshotSlots).filter((slot) => slot.qualityReport && slot.qualityReport.status !== "blocked").length;
  const blockingReferenceMessages = Object.values(referenceSlots).flatMap((slot) => slot.qualityReport?.blockingMessages ?? []);
  const sweepSelectedCount = Object.keys(sweepVideo.selectedFrames).length;

  async function handleUpload(kind: SlotKind, viewID: Fc26ReferenceViewID, file: File | null) {
    if (!file) return;
    const provider = providerRef.current;
    const currentSlot = kind === "reference" ? referenceSlots[viewID] : screenshotSlots[viewID];
    if (currentSlot.objectUrl) URL.revokeObjectURL(currentSlot.objectUrl);
    const objectUrl = URL.createObjectURL(file);
    updateSlot(kind, viewID, {
      objectUrl,
      fileName: file.name,
      fileType: file.type,
      fileSizeBytes: file.size,
      width: null,
      height: null,
      landmarkReport: null,
      qualityReport: null,
      statusMessage: "Reading image locally."
    });
    try {
      const image = await readImageElement(objectUrl);
      const report = provider
        ? await provider.detect({
            image,
            width: image.naturalWidth,
            height: image.naturalHeight,
            angleID: viewID
          })
        : null;
      const qualityReport = validateFc26Photo({
        viewID,
        fileName: file.name,
        fileType: file.type,
        fileSizeBytes: file.size,
        width: image.naturalWidth,
        height: image.naturalHeight,
        landmarkReport: report
      });
      updateSlot(kind, viewID, {
        objectUrl,
        fileName: file.name,
        fileType: file.type,
        fileSizeBytes: file.size,
        width: image.naturalWidth,
        height: image.naturalHeight,
        landmarkReport: report,
        qualityReport,
        statusMessage:
          qualityReport.status === "blocked"
            ? "Blocked until the image is replaced."
            : qualityReport.status === "needs_review"
              ? "Usable with review notes."
              : "Usable for MVP analysis."
      });
    } catch {
      updateSlot(kind, viewID, {
        objectUrl,
        fileName: file.name,
        fileType: file.type,
        fileSizeBytes: file.size,
        width: null,
        height: null,
        landmarkReport: null,
        qualityReport: null,
        statusMessage: "The browser could not decode this image."
      });
    }
  }

  function updateSlot(kind: SlotKind, viewID: Fc26ReferenceViewID, patch: Partial<PhotoSlot>) {
    const setter = kind === "reference" ? setReferenceSlots : setScreenshotSlots;
    setter((slots) => ({
      ...slots,
      [viewID]: {
        ...slots[viewID],
        ...patch
      }
    }));
  }

  function removeSlot(kind: SlotKind, viewID: Fc26ReferenceViewID) {
    const slot = kind === "reference" ? referenceSlots[viewID] : screenshotSlots[viewID];
    if (slot.objectUrl) URL.revokeObjectURL(slot.objectUrl);
    updateSlot(kind, viewID, emptySlots()[viewID]);
  }

  function removeAllPhotos() {
    const urls = removeFc26TemporaryPhotoObjectUrls([
      ...Object.values(referenceSlots).flatMap((slot) => (slot.objectUrl ? [slot.objectUrl] : [])),
      ...Object.values(screenshotSlots).flatMap((slot) => (slot.objectUrl ? [slot.objectUrl] : []))
    ]);
    urls.forEach((url) => URL.revokeObjectURL(url));
    setReferenceSlots(emptySlots());
    setScreenshotSlots(emptySlots());
    setMeasurements([]);
    setScreenshotMeasurements([]);
    setRecipe(null);
    setComparison(null);
    clearSweepVideoState();
    setSaveMessage("Temporary photo references were removed. Saved FC 26 profiles do not contain image bytes.");
  }

  function analyzeReferencePhotos() {
    if (controls.length === 0) {
      setProcessingMessage("FC 26 research controls are not loaded yet.");
      return;
    }
    setProcessingMessage("Analyzing locally from available landmark reports.");
    const nextMeasurements = calculateFc26Measurements(toReports(referenceSlots));
    const nextRecipe = generateFc26Recipe(nextMeasurements, controls);
    setMeasurements(nextMeasurements);
    setRecipe(nextRecipe);
    setComparison(null);
    setActiveProfileCaptureMethod("three_photo");
    setProcessingMessage(null);
  }

  function analyzeSweepFrames() {
    if (controls.length === 0) {
      setProcessingMessage("FC 26 research controls are not loaded yet.");
      return;
    }
    const fusion = fuseFc26SweepMeasurements(sweepVideo.selectedFrames as Partial<Record<Fc26SweepViewID, Fc26SelectedSweepFrame>>);
    const nextRecipe = generateFc26Recipe(fusion.measurements, controls);
    setMeasurements(fusion.measurements);
    setRecipe(nextRecipe);
    setComparison(null);
    setActiveProfileCaptureMethod("guided_sweep");
    setProcessingMessage(
      fusion.warnings.length > 0
        ? `Guided sweep measurements generated with review notes: ${fusion.warnings.join(" ")}`
        : "Guided sweep measurements generated locally from selected frames."
    );
  }

  function saveProfile() {
    if (!recipe) {
      setSaveMessage("Generate a recipe before saving.");
      return;
    }
    if (typeof window === "undefined") {
      setSaveMessage("Saved profile storage is only available in the browser.");
      return;
    }
    const profile = createFc26Profile({
      profileName,
      measurements,
      qualityReports: Object.values(referenceSlots).flatMap((slot) => (slot.qualityReport ? [slot.qualityReport] : [])),
      recipe,
      captureMethod: activeProfileCaptureMethod,
      selectedFrameMetadata:
        activeProfileCaptureMethod === "guided_sweep"
          ? metadataForFc26SweepProfile(sweepVideo.selectedFrames as Partial<Record<Fc26SweepViewID, Fc26SelectedSweepFrame>>)
          : [],
      qualityWarnings: activeProfileCaptureMethod === "guided_sweep" ? sweepVideo.warnings : [],
      userNotes: profileNote
    });
    const nextProfiles = saveFc26ProfileToSessionStorage(window.sessionStorage, profile);
    setSavedProfiles(nextProfiles);
    setSaveMessage(`Saved ${profile.profileName} locally as an FC 26 profile. Raw photos were not saved.`);
  }

  function compareScreenshots() {
    if (!recipe) {
      setComparison(null);
      setSaveMessage("Generate a reference recipe before comparing FC 26 screenshots.");
      return;
    }
    const nextScreenshotMeasurements = calculateFc26Measurements(toReports(screenshotSlots));
    const result = compareFc26Screenshots({
      referenceMeasurements: measurements,
      screenshotMeasurements: nextScreenshotMeasurements,
      recipe,
      iterationNumber: 1
    });
    setScreenshotMeasurements(nextScreenshotMeasurements);
    setComparison(result);
  }

  async function startSweepRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setSweepVideo((current) => ({
        ...current,
        status: "blocked",
        progressLabel: "Camera recording is unavailable in this browser. Upload an existing MP4, MOV, or WebM sweep instead.",
        warnings: ["Camera recording is unavailable in this browser."]
      }));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      setCameraStream(stream);
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
        const file = new File([blob], `fc26-guided-face-sweep-${new Date().toISOString()}.webm`, { type: blob.type });
        stopCameraStream(stream);
        setCameraStream(null);
        void processSweepFile(file);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(500);
      setSweepVideo((current) => ({
        ...current,
        status: "recording",
        progressLabel: "Recording. Move the camera slowly from one profile, through front, to the opposite profile."
      }));
    } catch {
      setSweepVideo((current) => ({
        ...current,
        status: "blocked",
        progressLabel: "Camera permission failed. Use the video upload fallback.",
        warnings: ["Camera permission failed or no camera was available."]
      }));
    }
  }

  function stopSweepRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      setSweepVideo((current) => ({ ...current, progressLabel: "Recording stopped. Preparing local video analysis." }));
    }
  }

  function cancelSweepProcessing() {
    sweepProcessTokenRef.current += 1;
    setSweepVideo((current) => ({ ...current, status: "cancelled", progressLabel: "Guided sweep processing was cancelled." }));
  }

  async function processSweepFile(file: File) {
    const token = sweepProcessTokenRef.current + 1;
    sweepProcessTokenRef.current = token;
    revokeSweepUrls(sweepVideo);
    const objectUrl = URL.createObjectURL(file);
    setSweepVideo({
      objectUrl,
      fileName: file.name,
      metadata: null,
      validationReport: null,
      status: "processing",
      progressLabel: "Reading video metadata locally.",
      reviewedFrames: [],
      selectedFrames: {},
      missingViews: [],
      warnings: []
    });
    try {
      const metadata = await readVideoMetadata(objectUrl, file);
      const validationReport = validateFc26SweepVideo(metadata);
      setSweepVideo((current) => ({
        ...current,
        metadata,
        validationReport,
        status: validationReport.status === "blocked" ? "blocked" : "processing",
        progressLabel: validationReport.status === "blocked" ? "Video needs replacement before analysis." : "Sampling sweep frames locally."
      }));
      if (validationReport.status === "blocked") return;
      const provider = providerRef.current;
      if (!provider) throw new Error("Local face landmark provider is unavailable.");
      const sampleResult = await sampleSweepCandidates({
        objectUrl,
        metadata,
        provider,
        isCancelled: () => sweepProcessTokenRef.current !== token,
        onProgress: (message) => setSweepVideo((current) => ({ ...current, progressLabel: message }))
      });
      if (sweepProcessTokenRef.current !== token) return;
      const selection = selectBestFc26SweepFrames(sampleResult.candidates);
      const thumbnailByID = sampleResult.thumbnailUrls;
      const reviewedFrames = selection.reviewedFrames.map((frame) => ({ ...frame, thumbnailUrl: thumbnailByID.get(frame.frameID) ?? "" }));
      const reviewedByID = new Map(reviewedFrames.map((frame) => [frame.frameID, frame]));
      const selectedFrames = Object.fromEntries(
        Object.entries(selection.selectedFrames).flatMap(([viewID, frame]) => {
          const reviewed = frame ? reviewedByID.get(frame.frameID) : null;
          return reviewed ? [[viewID, { ...reviewed, selectedForView: viewID as Fc26SweepViewID, decision: "selected" as const }]] : [];
        })
      ) as Partial<Record<Fc26SweepViewID, SweepFramePreview>>;
      setSweepVideo((current) => ({
        ...current,
        status: selection.blockingMessages.length > 0 ? "blocked" : "ready",
        progressLabel:
          selection.blockingMessages.length > 0
            ? "Sweep needs review or replacement before recipe generation."
            : "Sweep processed locally. Review the selected frames before generating the recipe.",
        reviewedFrames,
        selectedFrames,
        missingViews: selection.missingViews,
        warnings: [...validationReport.advisoryMessages, ...selection.advisoryMessages, ...selection.blockingMessages]
      }));
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      setSweepVideo((current) => ({
        ...current,
        status: "blocked",
        progressLabel: error instanceof Error ? error.message : "The browser could not process this video.",
        warnings: ["The recording could not be decoded or analyzed locally."]
      }));
    }
  }

  function chooseSweepFrame(viewID: Fc26SweepViewID, frameID: string) {
    const frame = sweepVideo.reviewedFrames.find((candidate) => candidate.frameID === frameID);
    if (!frame) return;
    setSweepVideo((current) => ({
      ...current,
      selectedFrames: {
        ...current.selectedFrames,
        [viewID]: { ...frame, selectedForView: viewID, decision: "selected", rejectionReason: null }
      },
      missingViews: current.missingViews.filter((missingView) => missingView !== viewID)
    }));
  }

  function removeSweepFrame(viewID: Fc26SweepViewID) {
    setSweepVideo((current) => {
      const nextSelected = { ...current.selectedFrames };
      delete nextSelected[viewID];
      return {
        ...current,
        selectedFrames: nextSelected,
        missingViews: Array.from(new Set([...current.missingViews, viewID]))
      };
    });
  }

  function clearSweepVideoState() {
    sweepProcessTokenRef.current += 1;
    stopCameraStream(cameraStream);
    setCameraStream(null);
    revokeSweepUrls(sweepVideo);
    setSweepVideo({
      objectUrl: null,
      fileName: null,
      metadata: null,
      validationReport: null,
      status: "idle",
      progressLabel: "No sweep recording selected.",
      reviewedFrames: [],
      selectedFrames: {},
      missingViews: [],
      warnings: []
    });
  }

  return (
    <section className="screen-stack" aria-labelledby="fc26-title">
      <ScreenHeader eyebrow="EA SPORTS FC 26 | Local recipe MVP" title="Build an FC 26 face recipe" id="fc26-title">
        <p>
          Record one slow face sweep or upload separate reference views, generate a human-in-the-loop recipe from locally measured proportions, then
          compare your FC 26 created-player screenshots for the next edit pass.
        </p>
      </ScreenHeader>

      <Alert title="Research-only FC 26 workflow" tone="warning">
        The recipe uses only controls observed in <code>data/research/fc26/player_creator_research.json</code>. It does not claim an exact likeness,
        does not identify a person, and does not enable FC 26 production catalog recommendations.
      </Alert>
      {researchError ? (
        <Alert title="FC 26 research data unavailable" tone="danger" role="alert">
          {researchError} Recipe generation stays blocked until the canonical research data can be read.
        </Alert>
      ) : null}

      <div className="result-grid">
        <Card tone="info">
          <h2>Game selected</h2>
          <p>EA SPORTS FC 26</p>
          <StatusBadge tone="info">{FC26_GAME_ID}</StatusBadge>
        </Card>
        <Card>
          <h2>Reference capture</h2>
          <ProgressBar
            value={captureMode === "guidedSweep" ? sweepSelectedCount : referenceReadyCount}
            max={captureMode === "guidedSweep" ? 5 : FC26_REQUIRED_REFERENCE_VIEWS.length}
            label={captureMode === "guidedSweep" ? "Selected sweep views" : "Usable photo views"}
          />
        </Card>
        <Card>
          <h2>Saved FC 26 profiles</h2>
          <p>{savedProfiles.length} local non-image profile(s)</p>
          <StatusBadge tone="neutral">session storage</StatusBadge>
        </Card>
      </div>

      <section className="screen-stack" aria-labelledby="fc26-reference-title">
        <h2 id="fc26-reference-title">1. Add reference capture</h2>
        <p className="section-copy">
          Reference media is processed locally in this browser. Object URLs are temporary, removable, and never stored inside the FC 26 profile JSON.
        </p>
        <div className="result-grid">
          <Card tone={captureMode === "guidedSweep" ? "info" : "neutral"}>
            <h3>Guided face sweep</h3>
            <p>Keep your head still while the camera moves slowly from one side of your face to the other.</p>
            <StatusBadge tone="info">recommended</StatusBadge>
            <Button variant={captureMode === "guidedSweep" ? "primary" : "secondary"} onClick={() => setCaptureMode("guidedSweep")}>
              Use guided face sweep
            </Button>
          </Card>
          <Card tone={captureMode === "threePhoto" ? "info" : "neutral"}>
            <h3>Upload three photos</h3>
            <p>Use separate front, three-quarter, and side-profile photos.</p>
            <StatusBadge tone="neutral">fallback</StatusBadge>
            <Button variant={captureMode === "threePhoto" ? "primary" : "secondary"} onClick={() => setCaptureMode("threePhoto")}>
              Use three-photo upload
            </Button>
          </Card>
        </div>
        {captureMode === "guidedSweep" ? (
          <GuidedSweepPanel
            liveVideoRef={liveVideoRef}
            cameraActive={Boolean(cameraStream)}
            sweepVideo={sweepVideo}
            onStartRecording={() => void startSweepRecording()}
            onStopRecording={stopSweepRecording}
            onUpload={(file) => void (file ? processSweepFile(file) : undefined)}
            onCancel={cancelSweepProcessing}
            onClear={clearSweepVideoState}
            onAnalyze={analyzeSweepFrames}
            onChooseFrame={chooseSweepFrame}
            onRemoveFrame={removeSweepFrame}
            controlsLoaded={controls.length > 0}
          />
        ) : (
          <>
            <div className="screenshot-grid">
              {FC26_REQUIRED_REFERENCE_VIEWS.map((view) => (
                <UploadCard
                  key={view.id}
                  viewID={view.id}
                  label={view.label}
                  instruction={view.instruction}
                  slot={referenceSlots[view.id]}
                  onUpload={(file) => void handleUpload("reference", view.id, file)}
                  onRemove={() => removeSlot("reference", view.id)}
                />
              ))}
            </div>
            {blockingReferenceMessages.length > 0 ? (
              <Alert title="Reference photo blockers" tone="danger" role="alert">
                {blockingReferenceMessages.join(" ")}
              </Alert>
            ) : null}
          </>
        )}
        <div className="button-row">
          {captureMode === "threePhoto" ? (
            <Button onClick={analyzeReferencePhotos} disabled={referenceReadyCount === 0 || controls.length === 0}>
              Analyze face and generate recipe
            </Button>
          ) : null}
          <Button variant="secondary" onClick={removeAllPhotos}>
            Remove video, extracted frames, and photos
          </Button>
        </div>
        {processingMessage ? <p className="field-note">{processingMessage}</p> : null}
      </section>

      <section className="screen-stack" aria-labelledby="fc26-measurements-title">
        <h2 id="fc26-measurements-title">2. Review measurements</h2>
        {measurements.length === 0 ? (
          <Card>
            <p>No measurements yet. Add at least one usable reference photo and run local analysis.</p>
          </Card>
        ) : (
          <div className="result-grid">
            {measurements.map((measurement) => (
              <Card key={measurement.id} tone={measurement.normalizedValue === null ? "warning" : "neutral"}>
                <h3>{measurement.displayLabel}</h3>
                <p>{measurement.normalizedValue === null ? "Unavailable" : measurement.normalizedValue.toFixed(3)}</p>
                <StatusBadge tone={measurement.confidence === "unavailable" ? "warning" : "info"}>{measurement.confidence}</StatusBadge>
                <p className="field-note">
                  {measurement.sourceView} | {measurement.explanation}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="screen-stack" aria-labelledby="fc26-recipe-title">
        <h2 id="fc26-recipe-title">3. Edit FC 26 recipe</h2>
        {!recipe ? (
          <Card>
            <p>Generate a recipe to see the observed FC 26 controls grouped by Skin, Head, Face, and Hair.</p>
          </Card>
        ) : (
          <>
            <Alert title="Manual console pass required" tone="info">
              Exact FC 26 preset values remain manual unless supported by the research. Directional guidance tells you which way to test first.
            </Alert>
            {(["Skin", "Head", "Face", "Hair", "Other"] as const).map((section) => {
              const sectionControls = recipe.controls.filter((control) => control.section === section);
              if (sectionControls.length === 0) return null;
              return (
                <div className="screen-stack" key={section}>
                  <h3>{section}</h3>
                  <div className="result-detail-grid">
                    {sectionControls.map((control) => (
                      <Card key={control.controlID} tone={control.status === "manual_selection_required" ? "warning" : "neutral"}>
                        <div className="stack-small">
                          <div>
                            <h4>{control.controlLabel}</h4>
                            <StatusBadge tone={control.status === "manual_selection_required" ? "warning" : "info"}>{control.status}</StatusBadge>
                          </div>
                          <p>
                            <strong>{control.direction ?? "Manual selection required"}</strong>
                          </p>
                          <p>{control.reason}</p>
                          <p className="field-note">Evidence: {formatEvidence(control.researchEvidence)}</p>
                          <label className="form-field">
                            <span>Manual FC 26 value or direction tested</span>
                            <input
                              value={control.manualValue}
                              onChange={(event) => setRecipe(updateFc26RecipeControl(recipe, control.controlID, { manualValue: event.currentTarget.value, state: "edited" }))}
                              placeholder="Example: wider jaw preset; exact value after console test"
                            />
                          </label>
                          <label className="form-field">
                            <span>Notes</span>
                            <textarea
                              rows={3}
                              value={control.userNote}
                              onChange={(event) => setRecipe(updateFc26RecipeControl(recipe, control.controlID, { userNote: event.currentTarget.value }))}
                              placeholder="What changed when you tested this setting?"
                            />
                          </label>
                          <div className="button-row">
                            <Button variant="secondary" onClick={() => setRecipe(updateFc26RecipeControl(recipe, control.controlID, { state: "accepted" }))}>
                              Accept
                            </Button>
                            <Button variant="secondary" onClick={() => setRecipe(updateFc26RecipeControl(recipe, control.controlID, { state: "tested" }))}>
                              Mark tested
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => setRecipe(updateFc26RecipeControl(recipe, control.controlID, { state: "unresolved", manualValue: "", userNote: "" }))}
                            >
                              Reset
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </section>

      <section className="screen-stack narrow" aria-labelledby="fc26-save-title">
        <h2 id="fc26-save-title">4. Save FC 26 profile</h2>
        <TextField label="Profile name" value={profileName} onChange={(event) => setProfileName(event.currentTarget.value)} />
        <label className="form-field">
          <span>User notes</span>
          <textarea rows={3} value={profileNote} onChange={(event) => setProfileNote(event.currentTarget.value)} />
        </label>
        <Button onClick={saveProfile} disabled={!recipe}>
          Save recipe profile locally
        </Button>
        {saveMessage ? (
          <Alert title="FC 26 profile status" tone="success">
            {saveMessage}
          </Alert>
        ) : null}
      </section>

      <section className="screen-stack" aria-labelledby="fc26-screenshots-title">
        <h2 id="fc26-screenshots-title">5. Upload FC 26 screenshots for iteration</h2>
        <p className="section-copy">
          Create the player on console, then add front, three-quarter, and side screenshots. The comparison reports directional mismatches, not identity
          probability.
        </p>
        <div className="screenshot-grid">
          {FC26_REQUIRED_REFERENCE_VIEWS.map((view) => (
            <UploadCard
              key={view.id}
              viewID={view.id}
              label={`${view.label} screenshot`}
              instruction="Use the created FC 26 player without helmets, masks, sunglasses, or menu overlays covering the face."
              slot={screenshotSlots[view.id]}
              onUpload={(file) => void handleUpload("screenshot", view.id, file)}
              onRemove={() => removeSlot("screenshot", view.id)}
            />
          ))}
        </div>
        <Button onClick={compareScreenshots} disabled={!recipe || screenshotReadyCount === 0}>
          Compare screenshots and suggest adjustments
        </Button>
        {comparison ? (
          <div className="screen-stack">
            <Card tone="info">
              <h3>Internal geometric similarity</h3>
              <p>{comparison.internalGeometricSimilarityScore === null ? "Not enough comparable measurements" : `${comparison.internalGeometricSimilarityScore}/100`}</p>
              <p className="field-note">{comparison.notes.join(" ")}</p>
            </Card>
            <div className="result-grid">
              {comparison.adjustmentSuggestions.map((suggestion) => (
                <Card key={`${suggestion.affectedControlID}-${suggestion.direction}`}>
                  <h4>{suggestion.affectedControlLabel}</h4>
                  <p>{suggestion.direction}</p>
                  <p>{suggestion.reason}</p>
                  <StatusBadge tone="info">{suggestion.confidence}</StatusBadge>
                </Card>
              ))}
              {comparison.adjustmentSuggestions.length === 0 ? (
                <Card>
                  <p>No strong adjustment suggestion was generated from the available screenshots.</p>
                </Card>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className="screen-stack" aria-labelledby="fc26-research-title">
        <h2 id="fc26-research-title">Observed FC 26 controls</h2>
        <div className="result-grid">
          {(["Skin", "Head", "Face", "Hair", "Other"] as const).map((section) => {
            const count = controls.filter((control) => control.section === section).length;
            return (
              <Card key={section}>
                <h3>{section}</h3>
                <p>{count} observed control(s)</p>
                <StatusBadge tone={count > 0 ? "info" : "neutral"}>{count > 0 ? "research observed" : "not observed"}</StatusBadge>
              </Card>
            );
          })}
        </div>
      </section>
    </section>
  );
}

function GuidedSweepPanel({
  liveVideoRef,
  cameraActive,
  sweepVideo,
  controlsLoaded,
  onStartRecording,
  onStopRecording,
  onUpload,
  onCancel,
  onClear,
  onAnalyze,
  onChooseFrame,
  onRemoveFrame
}: {
  liveVideoRef: RefObject<HTMLVideoElement | null>;
  cameraActive: boolean;
  sweepVideo: SweepVideoState;
  controlsLoaded: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onUpload: (file: File | null) => void;
  onCancel: () => void;
  onClear: () => void;
  onAnalyze: () => void;
  onChooseFrame: (viewID: Fc26SweepViewID, frameID: string) => void;
  onRemoveFrame: (viewID: Fc26SweepViewID) => void;
}) {
  const selectedCount = Object.keys(sweepVideo.selectedFrames).length;
  const candidateFrames = sweepVideo.reviewedFrames.filter((frame) => frame.decision !== "rejected");
  return (
    <div className="screen-stack" aria-labelledby="fc26-sweep-title">
      <Card tone="info">
        <h3 id="fc26-sweep-title">Record one slow sweep around the face</h3>
        <p>
          Keep a neutral expression, look straight ahead, keep the head still, remove hats and sunglasses, use even lighting, keep hair away from the
          jaw and ears when practical, and move the phone instead of turning the subject&apos;s head.
        </p>
        <p className="field-note">Left profile {"->"} left three-quarter {"->"} front {"->"} right three-quarter {"->"} right profile. Recommended length: 15-25 seconds.</p>
      </Card>

      <div className="result-grid">
        <Card>
          <h4>Record from camera</h4>
          {cameraActive ? <video className="media-preview" ref={liveVideoRef} autoPlay muted playsInline aria-label="Live sweep camera preview" /> : null}
          <div className="button-row">
            <Button onClick={onStartRecording} disabled={sweepVideo.status === "recording" || sweepVideo.status === "processing"}>
              Start recording
            </Button>
            <Button variant="secondary" onClick={onStopRecording} disabled={sweepVideo.status !== "recording"}>
              Stop recording
            </Button>
          </div>
        </Card>
        <Card>
          <h4>Upload existing video</h4>
          {sweepVideo.objectUrl ? <video className="media-preview" src={sweepVideo.objectUrl} controls preload="metadata" /> : <div className="empty-thumb">No sweep video selected</div>}
          <label className="form-field">
            <span>Upload guided sweep video</span>
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
              onChange={(event) => {
                onUpload(event.currentTarget.files?.[0] ?? null);
                event.currentTarget.value = "";
              }}
            />
          </label>
          {sweepVideo.metadata ? (
            <p className="field-note">
              {sweepVideo.fileName} | {sweepVideo.metadata.width ?? "?"}x{sweepVideo.metadata.height ?? "?"} |{" "}
              {sweepVideo.metadata.durationSeconds === null ? "unknown duration" : `${sweepVideo.metadata.durationSeconds.toFixed(1)}s`}
            </p>
          ) : null}
        </Card>
      </div>

      {sweepVideo.validationReport ? (
        <Alert title="Sweep validation" tone={sweepVideo.validationReport.status === "blocked" ? "danger" : "warning"}>
          {[...sweepVideo.validationReport.blockingMessages, ...sweepVideo.validationReport.advisoryMessages].join(" ") || "Video metadata looks usable."}
        </Alert>
      ) : null}

      <Card tone={sweepVideo.status === "blocked" ? "danger" : sweepVideo.status === "ready" ? "success" : "neutral"}>
        <h4>Processing status</h4>
        <p>{sweepVideo.progressLabel}</p>
        <ProgressBar value={selectedCount} max={5} label="Selected required views" />
        {sweepVideo.warnings.slice(0, 6).map((warning) => (
          <p className="field-note" key={warning}>
            {warning}
          </p>
        ))}
        <div className="button-row">
          <Button variant="secondary" onClick={onCancel} disabled={sweepVideo.status !== "processing"}>
            Cancel processing
          </Button>
          <Button variant="secondary" onClick={onClear}>
            Remove video and extracted frames
          </Button>
        </div>
      </Card>

      {sweepVideo.reviewedFrames.length > 0 ? (
        <>
          <section className="screen-stack" aria-labelledby="fc26-selected-sweep-frames">
            <h3 id="fc26-selected-sweep-frames">Review selected sweep frames</h3>
            <div className="screenshot-grid">
              {(["leftProfile", "leftThreeQuarter", "front", "rightThreeQuarter", "rightProfile"] as const).map((viewID) => {
                const frame = sweepVideo.selectedFrames[viewID];
                return (
                  <Card key={viewID} tone={frame ? "neutral" : "warning"}>
                    <h4>{formatSweepView(viewID)}</h4>
                    {frame ? <img className="media-preview" src={frame.thumbnailUrl} alt={`${formatSweepView(viewID)} selected frame`} /> : <div className="empty-thumb">Missing view</div>}
                    <p className="field-note">
                      {frame ? `${frame.timestampSeconds.toFixed(1)}s | yaw ${formatNumber(frame.estimatedYawDegrees)} | quality ${frame.qualityScore.toFixed(2)}` : "Choose a candidate frame or retry the sweep."}
                    </p>
                    {frame?.warnings.slice(0, 3).map((warning) => (
                      <p className="field-note" key={warning}>
                        {warning}
                      </p>
                    ))}
                    <Button variant="secondary" onClick={() => onRemoveFrame(viewID)} disabled={!frame}>
                      Remove
                    </Button>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="screen-stack" aria-labelledby="fc26-sweep-timeline">
            <h3 id="fc26-sweep-timeline">Compact candidate timeline</h3>
            <p className="section-copy">Use these sampled frames to replace a selected view. Rejected frames stay visible only as quality context.</p>
            <div className="screenshot-grid">
              {sweepVideo.reviewedFrames.slice(0, 30).map((frame) => (
                <Card key={frame.frameID} tone={frame.decision === "rejected" ? "warning" : "neutral"}>
                  <img className="media-preview" src={frame.thumbnailUrl} alt={`Sweep frame at ${frame.timestampSeconds.toFixed(1)} seconds`} />
                  <p className="field-note">
                    {frame.timestampSeconds.toFixed(1)}s | {frame.classifiedView ? formatSweepView(frame.classifiedView) : "unclassified"} | yaw{" "}
                    {formatNumber(frame.estimatedYawDegrees)}
                  </p>
                  <StatusBadge tone={frame.decision === "rejected" ? "warning" : frame.decision === "selected" ? "success" : "info"}>{frame.decision}</StatusBadge>
                  {frame.rejectionReason ? <p className="field-note">{frame.rejectionReason}</p> : null}
                  <div className="button-row">
                    {(["leftProfile", "leftThreeQuarter", "front", "rightThreeQuarter", "rightProfile"] as const).map((viewID) => (
                      <Button key={viewID} variant="ghost" onClick={() => onChooseFrame(viewID, frame.frameID)} disabled={frame.decision === "rejected"}>
                        {formatSweepViewShort(viewID)}
                      </Button>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
            {candidateFrames.length === 0 ? (
              <Alert title="No usable sweep frames" tone="danger">
                Try again with brighter, more even lighting and slower camera movement, or switch to the three-photo workflow.
              </Alert>
            ) : null}
          </section>
        </>
      ) : null}

      <div className="button-row">
        <Button onClick={onAnalyze} disabled={!controlsLoaded || !sweepVideo.selectedFrames.front || selectedCount < 3 || sweepVideo.status === "processing"}>
          Approve selected frames and generate recipe
        </Button>
      </div>
    </div>
  );
}

function UploadCard({
  viewID,
  label,
  instruction,
  slot,
  onUpload,
  onRemove
}: {
  viewID: Fc26ReferenceViewID;
  label: string;
  instruction: string;
  slot: PhotoSlot;
  onUpload: (file: File | null) => void;
  onRemove: () => void;
}) {
  return (
    <Card tone={slot.qualityReport?.status === "blocked" ? "danger" : slot.qualityReport?.status === "needs_review" ? "warning" : "neutral"}>
      <div className="stack-small">
        <h3>{label}</h3>
        <p>{instruction}</p>
        {slot.objectUrl ? <img className="media-preview" src={slot.objectUrl} alt={`${label} preview`} /> : <div className="empty-thumb">No image selected</div>}
        <label className="form-field">
          <span>Upload {label.toLowerCase()}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              onUpload(event.currentTarget.files?.[0] ?? null);
              event.currentTarget.value = "";
            }}
          />
        </label>
        <p className="field-note">
          {slot.fileName ?? viewID} {slot.width && slot.height ? `| ${slot.width}x${slot.height}` : ""} | {slot.statusMessage}
        </p>
        {slot.qualityReport ? (
          <div className="stack-small">
            <StatusBadge tone={slot.qualityReport.status === "blocked" ? "danger" : slot.qualityReport.status === "needs_review" ? "warning" : "success"}>
              {slot.qualityReport.status}
            </StatusBadge>
            {[...slot.qualityReport.blockingMessages, ...slot.qualityReport.advisoryMessages].slice(0, 5).map((message) => (
              <p className="field-note" key={message}>
                {message}
              </p>
            ))}
          </div>
        ) : null}
        {slot.objectUrl ? (
          <Button variant="secondary" onClick={onRemove}>
            Remove
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function toReports(slots: Record<Fc26ReferenceViewID, PhotoSlot>) {
  return Object.fromEntries(
    Object.values(slots).flatMap((slot) => (slot.landmarkReport ? [[slot.viewID, slot.landmarkReport]] : []))
  ) as Partial<Record<Fc26ReferenceViewID, FaceLandmarkReport>>;
}

function formatEvidence(evidence: Array<{ videoID: string; timestampSeconds: number; confidence: string }>) {
  if (evidence.length === 0) return "No direct observed value evidence.";
  return evidence.map((item) => `${item.videoID} @ ${item.timestampSeconds}s (${item.confidence})`).join("; ");
}

function readImageElement(objectUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unreadable image"));
    image.src = objectUrl;
  });
}

function readVideoMetadata(objectUrl: string, file: File): Promise<Fc26SweepVideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      resolve({
        fileName: file.name,
        fileType: file.type || guessVideoMimeType(file.name),
        fileSizeBytes: file.size,
        durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
        width: video.videoWidth || null,
        height: video.videoHeight || null
      });
      video.removeAttribute("src");
      video.load();
    };
    video.onerror = () => reject(new Error("The browser could not decode this video."));
    video.src = objectUrl;
  });
}

async function sampleSweepCandidates({
  objectUrl,
  metadata,
  provider,
  isCancelled,
  onProgress
}: {
  objectUrl: string;
  metadata: Fc26SweepVideoMetadata;
  provider: ReturnType<typeof createLocalFaceLandmarkProvider>;
  isCancelled: () => boolean;
  onProgress: (message: string) => void;
}): Promise<SweepSampleResult> {
  const duration = Math.max(0, metadata.durationSeconds ?? 0);
  if (duration <= 0) throw new Error("Video duration is unavailable.");
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = objectUrl;
  await waitForVideoMetadata(video);

  const sourceWidth = video.videoWidth || metadata.width || 640;
  const sourceHeight = video.videoHeight || metadata.height || 640;
  const scale = Math.min(1, 720 / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas analysis is unavailable in this browser.");

  const timestamps = frameSampleTimestamps(duration);
  const candidates: Fc26SweepFrameCandidate[] = [];
  const thumbnailUrls = new Map<string, string>();
  let previousSignature: number[] | null = null;

  for (let index = 0; index < timestamps.length; index += 1) {
    if (isCancelled()) break;
    const timestamp = timestamps[index];
    onProgress(`Sampling sweep frame ${index + 1} of ${timestamps.length}.`);
    await seekVideo(video, timestamp);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const signature = createFrameSignature(imageData);
    const duplicateSimilarityScore = previousSignature ? compareFrameSignatures(previousSignature, signature) : null;
    previousSignature = signature;
    const report = await provider.detect({
      image: canvas,
      width: canvas.width,
      height: canvas.height,
      angleID: "guidedSweep"
    });
    const face = report.faces[0];
    const frameID = `fc26-sweep-${index}-${timestamp.toFixed(2)}`;
    const thumbnailUrl = await canvasToObjectUrl(canvas);
    thumbnailUrls.set(frameID, thumbnailUrl);
    candidates.push({
      frameID,
      timestampSeconds: Math.round(timestamp * 1000) / 1000,
      report,
      estimatedYawDegrees: face?.approximateHeadPose.yawDegrees ?? null,
      estimatedPitchDegrees: face?.approximateHeadPose.pitchDegrees ?? null,
      estimatedRollDegrees: face?.approximateHeadPose.rollDegrees ?? null,
      faceBoxSize: face ? Math.max(face.boundingBox.width, face.boundingBox.height) : null,
      landmarkConfidence: face?.confidence.label ?? "unavailable",
      blurScore: estimateSharpnessScore(imageData),
      duplicateSimilarityScore,
      warnings: unique([...report.advisoryMessages, ...report.blockingMessages])
    });
  }

  video.pause();
  video.removeAttribute("src");
  video.load();
  return { candidates, thumbnailUrls };
}

function waitForVideoMetadata(video: HTMLVideoElement) {
  return new Promise<void>((resolve, reject) => {
    if (video.readyState >= 1) {
      resolve();
      return;
    }
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("The browser could not load video metadata."));
  });
}

function seekVideo(video: HTMLVideoElement, timestampSeconds: number) {
  return new Promise<void>((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Video seek failed during local sweep analysis."));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.currentTime = Math.min(Math.max(timestampSeconds, 0), Math.max(0, (video.duration || timestampSeconds) - 0.05));
  });
}

function frameSampleTimestamps(durationSeconds: number) {
  const count = Math.max(7, Math.min(31, Math.ceil(durationSeconds / 0.85)));
  if (count <= 1) return [0];
  const start = Math.min(0.5, durationSeconds / 10);
  const end = Math.max(start, durationSeconds - start);
  return Array.from({ length: count }, (_, index) => start + ((end - start) * index) / (count - 1));
}

function createFrameSignature(imageData: ImageData) {
  const data = imageData.data;
  const buckets = new Array(16).fill(0);
  const step = Math.max(4, Math.floor(data.length / 4 / buckets.length) * 4);
  for (let offset = 0, bucket = 0; offset < data.length && bucket < buckets.length; offset += step, bucket += 1) {
    buckets[bucket] = Math.round((data[offset] + data[offset + 1] + data[offset + 2]) / 3);
  }
  return buckets;
}

function compareFrameSignatures(first: number[], second: number[]) {
  const length = Math.min(first.length, second.length);
  if (length === 0) return null;
  const averageDifference = first.slice(0, length).reduce((sum, value, index) => sum + Math.abs(value - second[index]), 0) / length;
  return Math.round((1 - Math.min(averageDifference, 255) / 255) * 1000) / 1000;
}

function estimateSharpnessScore(imageData: ImageData) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  let total = 0;
  let count = 0;
  const stride = Math.max(1, Math.floor(Math.max(width, height) / 120));
  const luminanceAt = (x: number, y: number) => {
    const offset = (y * width + x) * 4;
    return data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114;
  };
  for (let y = stride; y < height - stride; y += stride) {
    for (let x = stride; x < width - stride; x += stride) {
      const center = luminanceAt(x, y);
      const edge = Math.abs(center - luminanceAt(x - stride, y)) + Math.abs(center - luminanceAt(x + stride, y)) + Math.abs(center - luminanceAt(x, y - stride)) + Math.abs(center - luminanceAt(x, y + stride));
      total += edge;
      count += 1;
    }
  }
  const normalized = count === 0 ? 0 : total / count / 80;
  return Math.max(0, Math.min(1, Math.round(normalized * 1000) / 1000));
}

function canvasToObjectUrl(canvas: HTMLCanvasElement) {
  return new Promise<string>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to create sweep frame preview."));
          return;
        }
        resolve(URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.72
    );
  });
}

function revokeSweepUrls(sweepVideo: SweepVideoState) {
  if (sweepVideo.objectUrl) URL.revokeObjectURL(sweepVideo.objectUrl);
  sweepVideo.reviewedFrames.forEach((frame) => {
    if (frame.thumbnailUrl.startsWith("blob:")) URL.revokeObjectURL(frame.thumbnailUrl);
  });
}

function stopCameraStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function guessVideoMimeType(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".m4v")) return "video/x-m4v";
  return "video/mp4";
}

function formatSweepView(viewID: Fc26SweepViewID) {
  const labels: Record<Fc26SweepViewID, string> = {
    leftProfile: "Left profile",
    leftThreeQuarter: "Left three-quarter",
    front: "Front",
    rightThreeQuarter: "Right three-quarter",
    rightProfile: "Right profile"
  };
  return labels[viewID];
}

function formatSweepViewShort(viewID: Fc26SweepViewID) {
  const labels: Record<Fc26SweepViewID, string> = {
    leftProfile: "LP",
    leftThreeQuarter: "L3Q",
    front: "F",
    rightThreeQuarter: "R3Q",
    rightProfile: "RP"
  };
  return labels[viewID];
}

function formatNumber(value: number | null) {
  return value === null ? "?" : value.toFixed(1);
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}
