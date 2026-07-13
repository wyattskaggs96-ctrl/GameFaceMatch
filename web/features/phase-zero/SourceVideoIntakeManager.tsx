"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Alert, Button, Card, SelectField, StatusBadge, TextField } from "@/components/design-system";
import {
  createSourceVideoLocalStore,
  createVideoTimestampReference,
  planDerivativeFrameExtraction,
  previewTimestampReference,
  registerSourceVideo,
  unavailableFrameExtractionCapability,
  validateSourceVideoRecord,
  validateTimestampReference,
  type Phase0SourceVideoRecord,
  type Phase0VideoTimestampReference
} from "@/lib/phase-zero/phase-zero-source-video";
import type { Phase0EvidenceView } from "@/lib/phase-zero/phase-zero-evidence";

const views: Phase0EvidenceView[] = ["straightOn", "left45", "right45", "leftProfile", "rightProfile", "navigationEvidence", "menuOverview", "environment", "notApplicable"];

export function SourceVideoIntakeManager() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [objectURL, setObjectURL] = useState("");
  const [videos, setVideos] = useState<Phase0SourceVideoRecord[]>([]);
  const [timestampReferences, setTimestampReferences] = useState<Phase0VideoTimestampReference[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [context, setContext] = useState({
    platformID: "",
    gameVersionID: "",
    patchID: "",
    mode: "",
    creationPathID: "",
    environmentID: "",
    captureDevice: "",
    durationSeconds: "",
    width: "",
    height: "",
    frameRate: "",
    notes: ""
  });
  const [timestampForm, setTimestampForm] = useState({
    catalogItemID: "",
    view: "straightOn" as Phase0EvidenceView,
    timestampSeconds: "",
    label: "",
    notes: ""
  });
  const currentVideo = videos[0] ?? null;
  const extractionCapability = useMemo(() => unavailableFrameExtractionCapability("Frame extraction is disabled in the browser UI unless the local FFmpeg script is available."), []);
  const extractionPlan = useMemo(() => {
    const reference = timestampReferences[0];
    if (!currentVideo || !reference) return null;
    return planDerivativeFrameExtraction({
      sourceVideo: currentVideo,
      timestampReference: reference,
      outputRelativePath: `data/audit/college-football-27/evidence/derivatives/${reference.referenceID}.png`,
      outputFrameID: `${reference.referenceID}-frame`,
      fileRole: "standardAngle",
      extractedAt: new Date().toISOString()
    }, extractionCapability);
  }, [currentVideo, extractionCapability, timestampReferences]);
  const videoReport = currentVideo ? validateSourceVideoRecord(currentVideo) : null;
  const timestampReport = currentVideo && timestampReferences[0] ? validateTimestampReference(currentVideo, timestampReferences[0]) : null;
  const timestampPreview = currentVideo && timestampReferences[0] ? previewTimestampReference(currentVideo, timestampReferences[0]) : null;

  useEffect(() => {
    if (!selectedFile) {
      setObjectURL("");
      return;
    }
    const nextURL = URL.createObjectURL(selectedFile);
    setObjectURL(nextURL);
    return () => URL.revokeObjectURL(nextURL);
  }, [selectedFile]);

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    setSelectedFile(file);
    event.currentTarget.value = "";
  }

  function registerSelectedVideo() {
    if (!selectedFile) return;
    const video = registerSourceVideo({
      videoID: "phase-zero-local-source-video",
      file: {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        lastModified: selectedFile.lastModified,
        relativePath: selectedFile.webkitRelativePath || selectedFile.name,
        durationSeconds: parseOptionalNumber(context.durationSeconds),
        width: parseOptionalInteger(context.width),
        height: parseOptionalInteger(context.height),
        frameRate: parseOptionalNumber(context.frameRate)
      },
      captureMethod: "captureCard",
      captureDevice: context.captureDevice,
      platformID: context.platformID,
      gameVersionID: context.gameVersionID,
      patchID: context.patchID,
      mode: context.mode,
      creationPathID: context.creationPathID,
      environmentID: context.environmentID,
      registeredAt: new Date().toISOString(),
      notes: context.notes
    });
    setVideos([video]);
  }

  function addTimestampReference() {
    if (!currentVideo) return;
    const reference = createVideoTimestampReference({
      referenceID: `phase-zero-source-timestamp-${timestampReferences.length + 1}`,
      video: currentVideo,
      catalogItemID: timestampForm.catalogItemID || null,
      view: timestampForm.view,
      timestampSeconds: Number.parseFloat(timestampForm.timestampSeconds),
      label: timestampForm.label,
      notes: timestampForm.notes,
      createdAt: new Date().toISOString()
    });
    setTimestampReferences((current) => [reference, ...current]);
  }

  function saveMetadata() {
    if (typeof window === "undefined") return;
    const store = createSourceVideoLocalStore(window.localStorage);
    store.save(videos);
    setSavedCount(store.load().length);
  }

  return (
    <section className="screen-stack" aria-labelledby="source-video-title">
      <div className="status-row">
        <div>
          <p className="eyebrow">Internal audit tool</p>
          <h2 id="source-video-title">Source-video intake</h2>
        </div>
        <StatusBadge tone={currentVideo && videoReport?.ok ? "success" : "warning"}>
          {currentVideo ? currentVideo.status : "no video"}
        </StatusBadge>
      </div>
      <p className="supporting">
        Register original source videos, record exact timestamps for catalog evidence, and preserve provenance for derivative still frames. Original
        video files stay local and are not recompressed, serialized, or uploaded.
      </p>
      <Alert title="Frame extraction" tone="warning">
        Browser metadata intake is available now. Still-frame extraction is disabled here unless the local FFmpeg command-line helper is available.
      </Alert>
      <Card>
        <div className="status-row">
          <h3>Register source video</h3>
          <Button onClick={() => fileInputRef.current?.click()}>Choose video</Button>
        </div>
        <input ref={fileInputRef} className="visually-hidden" type="file" accept="video/mp4,video/quicktime,video/webm" onChange={handleFileInput} />
        {selectedFile ? <p className="supporting">Selected: {selectedFile.name}</p> : <p className="supporting">Choose a local source video from private audit storage.</p>}
        <div className="card-grid">
          <TextField label="Platform ID" value={context.platformID} onChange={(event) => updateContext("platformID", event.currentTarget.value)} />
          <TextField label="Game version ID" value={context.gameVersionID} onChange={(event) => updateContext("gameVersionID", event.currentTarget.value)} />
          <TextField label="Patch ID" value={context.patchID} onChange={(event) => updateContext("patchID", event.currentTarget.value)} />
          <TextField label="Mode" value={context.mode} onChange={(event) => updateContext("mode", event.currentTarget.value)} />
          <TextField label="Creation path ID" value={context.creationPathID} onChange={(event) => updateContext("creationPathID", event.currentTarget.value)} />
          <TextField label="Environment ID" value={context.environmentID} onChange={(event) => updateContext("environmentID", event.currentTarget.value)} />
          <TextField label="Capture device" value={context.captureDevice} onChange={(event) => updateContext("captureDevice", event.currentTarget.value)} />
          <TextField label="Duration seconds" value={context.durationSeconds} onChange={(event) => updateContext("durationSeconds", event.currentTarget.value)} />
          <TextField label="Width" value={context.width} onChange={(event) => updateContext("width", event.currentTarget.value)} />
          <TextField label="Height" value={context.height} onChange={(event) => updateContext("height", event.currentTarget.value)} />
          <TextField label="Frame rate" value={context.frameRate} onChange={(event) => updateContext("frameRate", event.currentTarget.value)} />
          <TextField label="Notes" value={context.notes} onChange={(event) => updateContext("notes", event.currentTarget.value)} />
        </div>
        <div className="button-row">
          <Button disabled={!selectedFile} onClick={registerSelectedVideo}>Register metadata</Button>
          <Button variant="secondary" disabled={videos.length === 0} onClick={saveMetadata}>Save metadata only</Button>
        </div>
        <p className="supporting">Saved source-video metadata records: {savedCount}</p>
      </Card>
      {currentVideo ? (
        <Card tone={videoReport?.errors.length ? "warning" : "neutral"}>
          <h3>Registered video</h3>
          <dl className="metadata-list">
            <div>
              <dt>Path</dt>
              <dd>{currentVideo.relativePath}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{currentVideo.metadata.durationSeconds ?? "Not recorded"}</dd>
            </div>
            <div>
              <dt>Dimensions</dt>
              <dd>{currentVideo.metadata.width && currentVideo.metadata.height ? `${currentVideo.metadata.width} x ${currentVideo.metadata.height}` : "Not recorded"}</dd>
            </div>
          </dl>
          {[...(videoReport?.errors ?? []), ...(videoReport?.warnings ?? [])].map((issue) => <p className="supporting" key={`${issue.code}-${issue.message}`}>{issue.message}</p>)}
        </Card>
      ) : null}
      {currentVideo ? (
        <Card>
          <h3>Timestamp reference</h3>
          <div className="card-grid">
            <TextField label="Catalog item ID" value={timestampForm.catalogItemID} onChange={(event) => updateTimestamp("catalogItemID", event.currentTarget.value)} />
            <SelectField label="View" value={timestampForm.view} onChange={(event) => updateTimestamp("view", event.currentTarget.value as Phase0EvidenceView)}>
              {views.map((view) => <option key={view} value={view}>{view}</option>)}
            </SelectField>
            <TextField label="Timestamp seconds" value={timestampForm.timestampSeconds} onChange={(event) => updateTimestamp("timestampSeconds", event.currentTarget.value)} />
            <TextField label="Label" value={timestampForm.label} onChange={(event) => updateTimestamp("label", event.currentTarget.value)} />
            <TextField label="Notes" value={timestampForm.notes} onChange={(event) => updateTimestamp("notes", event.currentTarget.value)} />
          </div>
          <Button onClick={addTimestampReference}>Add timestamp</Button>
          {objectURL && timestampReferences[0] ? (
            <video className="media-preview" controls src={`${objectURL}#t=${timestampReferences[0].timestampSeconds.toFixed(3)}`}>
              <track kind="captions" />
            </video>
          ) : null}
          {timestampPreview ? <p className="supporting">Preview: {timestampPreview.label}</p> : null}
          {[...(timestampReport?.errors ?? []), ...(timestampReport?.warnings ?? [])].map((issue) => <p className="supporting" key={`${issue.code}-${issue.message}`}>{issue.message}</p>)}
        </Card>
      ) : null}
      {extractionPlan ? (
        <Card tone="warning">
          <div className="status-row">
            <h3>Derivative-frame extraction</h3>
            <StatusBadge tone={extractionPlan.status === "ready" ? "success" : "warning"}>{extractionPlan.status}</StatusBadge>
          </div>
          <p className="supporting">{extractionPlan.preservationNote}</p>
          {extractionPlan.command.length > 0 ? <code>{extractionPlan.command.join(" ")}</code> : <p className="supporting">{extractionPlan.warnings.join(" ")}</p>}
        </Card>
      ) : null}
    </section>
  );

  function updateContext(field: keyof typeof context, value: string) {
    setContext((current) => ({ ...current, [field]: value }));
  }

  function updateTimestamp(field: keyof typeof timestampForm, value: string | Phase0EvidenceView) {
    setTimestampForm((current) => ({ ...current, [field]: value }));
  }
}

function parseOptionalNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalInteger(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}
