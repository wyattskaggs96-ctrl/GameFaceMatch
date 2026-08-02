"use client";

import { useEffect, useRef, useState } from "react";
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
  type Fc26ScreenshotComparisonResult
} from "@/lib/fc26/fc26-face-matching";
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
  const [controls, setControls] = useState<Fc26ResearchControl[]>([]);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [referenceSlots, setReferenceSlots] = useState(() => emptySlots());
  const [screenshotSlots, setScreenshotSlots] = useState(() => emptySlots());
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
      void providerRef.current?.dispose();
    };
  }, []);

  const referenceReadyCount = Object.values(referenceSlots).filter((slot) => slot.qualityReport && slot.qualityReport.status !== "blocked").length;
  const screenshotReadyCount = Object.values(screenshotSlots).filter((slot) => slot.qualityReport && slot.qualityReport.status !== "blocked").length;
  const blockingReferenceMessages = Object.values(referenceSlots).flatMap((slot) => slot.qualityReport?.blockingMessages ?? []);

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
    setProcessingMessage(null);
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

  return (
    <section className="screen-stack" aria-labelledby="fc26-title">
      <ScreenHeader eyebrow="EA SPORTS FC 26 | Local recipe MVP" title="Build an FC 26 face recipe" id="fc26-title">
        <p>
          Upload three reference views, generate a human-in-the-loop recipe from locally measured proportions, then compare your FC 26 created-player
          screenshots for the next edit pass.
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
          <h2>Reference photos</h2>
          <ProgressBar value={referenceReadyCount} max={FC26_REQUIRED_REFERENCE_VIEWS.length} label="Usable views" />
        </Card>
        <Card>
          <h2>Saved FC 26 profiles</h2>
          <p>{savedProfiles.length} local non-image profile(s)</p>
          <StatusBadge tone="neutral">session storage</StatusBadge>
        </Card>
      </div>

      <section className="screen-stack" aria-labelledby="fc26-reference-title">
        <h2 id="fc26-reference-title">1. Add reference photos</h2>
        <p className="section-copy">
          Photos are processed locally in this browser. Object URLs are temporary, removable, and never stored inside the FC 26 profile JSON.
        </p>
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
        <div className="button-row">
          <Button onClick={analyzeReferencePhotos} disabled={referenceReadyCount === 0 || controls.length === 0}>
            Analyze face and generate recipe
          </Button>
          <Button variant="secondary" onClick={removeAllPhotos}>
            Remove all photos
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
