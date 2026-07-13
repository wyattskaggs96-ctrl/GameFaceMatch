"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Alert, Button, Card, SelectField, StatusBadge, TextField } from "@/components/design-system";
import {
  createDefaultImageTransform,
  createImageDerivativeLocalStore,
  createImageDerivativePlan,
  type Phase0FramingGuide,
  type Phase0ImageDerivativeExportFormat,
  type Phase0ImageDerivativeRequest,
  type Phase0ImageTransformationMetadata
} from "@/lib/phase-zero/phase-zero-image-derivative";
import type { Phase0EvidenceView } from "@/lib/phase-zero/phase-zero-evidence";

const exportFormats: Phase0ImageDerivativeExportFormat[] = ["image/png", "image/jpeg", "image/webp"];
const views: Phase0EvidenceView[] = ["straightOn", "left45", "right45", "leftProfile", "rightProfile", "navigationEvidence", "menuOverview", "environment", "notApplicable"];
const framingGuides: Phase0FramingGuide[] = ["centerCrosshair", "safeMargin", "ruleOfThirds", "standardFiveAngle"];

export function ImageDerivativeTool() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const downloadRef = useRef<HTMLAnchorElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [objectURL, setObjectURL] = useState("");
  const [savedMetadataCount, setSavedMetadataCount] = useState(0);
  const [exportMessage, setExportMessage] = useState("");
  const [master, setMaster] = useState({
    stableEvidenceID: "",
    relativePath: "",
    sha256: "",
    width: "",
    height: "",
    view: "straightOn" as Phase0EvidenceView
  });
  const [requestFields, setRequestFields] = useState({
    derivativeID: "",
    outputRelativePath: "",
    exportFormat: "image/png" as Phase0ImageDerivativeExportFormat,
    operatorID: "",
    notes: ""
  });
  const [transform, setTransform] = useState<Phase0ImageTransformationMetadata>(() => createDefaultImageTransform());

  useEffect(() => {
    if (!selectedFile) {
      setObjectURL("");
      return;
    }
    const nextURL = URL.createObjectURL(selectedFile);
    setObjectURL(nextURL);
    return () => URL.revokeObjectURL(nextURL);
  }, [selectedFile]);

  useEffect(() => {
    if (!objectURL) return;
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      setMaster((current) => ({
        ...current,
        width: String(image.naturalWidth),
        height: String(image.naturalHeight)
      }));
    };
    image.src = objectURL;
    return () => {
      cancelled = true;
    };
  }, [objectURL]);

  const request = useMemo<Phase0ImageDerivativeRequest>(() => ({
    derivativeID: requestFields.derivativeID,
    sourceMaster: {
      stableEvidenceID: master.stableEvidenceID,
      relativePath: master.relativePath,
      sha256: master.sha256.trim() ? master.sha256.trim() : null,
      dimensions: {
        width: parseInteger(master.width),
        height: parseInteger(master.height)
      },
      view: master.view,
      derivativeState: "master"
    },
    outputRelativePath: requestFields.outputRelativePath,
    exportFormat: requestFields.exportFormat,
    transform,
    operatorID: requestFields.operatorID,
    exportedAt: new Date().toISOString(),
    notes: requestFields.notes
  }), [master, requestFields, transform]);
  const plan = useMemo(() => createImageDerivativePlan(request), [request]);

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    setSelectedFile(file);
    setExportMessage("");
    event.currentTarget.value = "";
  }

  async function exportDerivative() {
    if (!selectedFile || !objectURL || !plan.record) return;
    try {
      const blob = await renderDerivativeBlob(objectURL, request.transform, plan.record.outputDimensions, request.exportFormat);
      const derivativeURL = URL.createObjectURL(blob);
      const link = downloadRef.current;
      if (!link) return;
      link.href = derivativeURL;
      link.download = filenameFromPath(plan.record.outputRelativePath);
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(derivativeURL), 1000);
      const store = createImageDerivativeLocalStore(window.localStorage);
      const records = store.load().filter((record) => record.derivativeID !== plan.record?.derivativeID);
      store.save([plan.record, ...records]);
      setSavedMetadataCount(store.load().length);
      setExportMessage("Derivative download prepared and metadata saved. Move the downloaded derivative into the audited relative path after review.");
    } catch {
      setExportMessage("Derivative export failed locally. The original file was not modified.");
    }
  }

  function updateMaster(field: keyof typeof master, value: string) {
    setMaster((current) => ({ ...current, [field]: value }));
  }

  function updateRequest(field: keyof typeof requestFields, value: string) {
    setRequestFields((current) => ({ ...current, [field]: value }));
  }

  function updateCrop(field: "x" | "y" | "width" | "height", value: string) {
    setTransform((current) => ({
      ...current,
      crop: {
        ...current.crop,
        [field]: parseNumber(value)
      }
    }));
  }

  function updateAspect(field: "mode" | "width" | "height", value: string) {
    setTransform((current) => ({
      ...current,
      aspectRatio: {
        ...current.aspectRatio,
        [field]: field === "mode" ? value : value.trim() ? parseNumber(value) : null
      }
    }));
  }

  function toggleGuide(guide: Phase0FramingGuide) {
    setTransform((current) => ({
      ...current,
      framingGuides: current.framingGuides.includes(guide)
        ? current.framingGuides.filter((candidate) => candidate !== guide)
        : [...current.framingGuides, guide]
    }));
  }

  function updateFaceRegion(field: "enabled" | "operatorConfirmed" | "notes" | "target", value: string | boolean) {
    setTransform((current) => ({
      ...current,
      faceRegionAlignmentGuide: {
        ...current.faceRegionAlignmentGuide,
        [field]: value
      }
    }));
  }

  function updateFaceRegionRect(field: "x" | "y" | "width" | "height", value: string) {
    setTransform((current) => ({
      ...current,
      faceRegionAlignmentGuide: {
        ...current.faceRegionAlignmentGuide,
        region: {
          ...current.faceRegionAlignmentGuide.region,
          [field]: parseNumber(value)
        }
      }
    }));
  }

  return (
    <section className="screen-stack" aria-labelledby="image-derivative-title">
      <div className="status-row">
        <div>
          <p className="eyebrow">Internal audit tool</p>
          <h2 id="image-derivative-title">Derivative image crop and alignment</h2>
        </div>
        <StatusBadge tone={plan.status === "ready" ? "success" : "warning"}>
          {plan.status === "ready" ? "export ready" : "metadata needed"}
        </StatusBadge>
      </div>
      <p className="supporting">
        Create non-destructive derivative screenshots for catalog review. This tool supports crop, rotation correction, aspect-ratio preservation,
        standard framing guides, and face-region alignment guides only. It never overwrites the original and does not apply filters, generated edits,
        geometry warping, or option-changing visual modifications.
      </p>
      <Alert title="Local-only derivative workflow" tone="info">
        Selected image bytes stay in browser memory for the active session. Saving stores derivative metadata only; the browser download must be moved
        into the audited derivative folder by the operator.
      </Alert>
      <Card>
        <div className="status-row">
          <h3>Master evidence</h3>
          <Button onClick={() => fileInputRef.current?.click()}>Choose master image</Button>
        </div>
        <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileInput} />
        {selectedFile ? <p className="supporting">Selected: {selectedFile.name}</p> : <p className="supporting">Choose a local master screenshot or still frame from private audit storage.</p>}
        {objectURL ? (
          <div className="derivative-preview-frame" aria-label="Derivative image preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={objectURL} alt="Selected master evidence preview" />
            <span className="derivative-guide derivative-guide-center" aria-hidden="true" />
            <span className="derivative-guide derivative-guide-safe" aria-hidden="true" />
          </div>
        ) : null}
        <div className="card-grid">
          <TextField label="Master evidence ID" value={master.stableEvidenceID} onChange={(event) => updateMaster("stableEvidenceID", event.currentTarget.value)} />
          <TextField label="Master relative path" value={master.relativePath} onChange={(event) => updateMaster("relativePath", event.currentTarget.value)} />
          <TextField label="Master SHA-256" value={master.sha256} onChange={(event) => updateMaster("sha256", event.currentTarget.value)} />
          <SelectField label="Evidence view" value={master.view} onChange={(event) => updateMaster("view", event.currentTarget.value)}>
            {views.map((view) => <option key={view} value={view}>{view}</option>)}
          </SelectField>
          <TextField label="Source width" inputMode="numeric" value={master.width} onChange={(event) => updateMaster("width", event.currentTarget.value)} />
          <TextField label="Source height" inputMode="numeric" value={master.height} onChange={(event) => updateMaster("height", event.currentTarget.value)} />
        </div>
      </Card>
      <Card>
        <h3>Derivative output</h3>
        <div className="card-grid">
          <TextField label="Derivative ID" value={requestFields.derivativeID} onChange={(event) => updateRequest("derivativeID", event.currentTarget.value)} />
          <TextField label="Output relative path" value={requestFields.outputRelativePath} onChange={(event) => updateRequest("outputRelativePath", event.currentTarget.value)} />
          <SelectField label="Export format" value={requestFields.exportFormat} onChange={(event) => updateRequest("exportFormat", event.currentTarget.value)}>
            {exportFormats.map((format) => <option key={format} value={format}>{format}</option>)}
          </SelectField>
          <TextField label="Operator ID" value={requestFields.operatorID} onChange={(event) => updateRequest("operatorID", event.currentTarget.value)} />
          <TextField label="Notes" value={requestFields.notes} onChange={(event) => updateRequest("notes", event.currentTarget.value)} />
        </div>
      </Card>
      <Card>
        <h3>Transform</h3>
        <div className="card-grid">
          <TextField label="Crop x 0-1" inputMode="decimal" value={String(transform.crop.x)} onChange={(event) => updateCrop("x", event.currentTarget.value)} />
          <TextField label="Crop y 0-1" inputMode="decimal" value={String(transform.crop.y)} onChange={(event) => updateCrop("y", event.currentTarget.value)} />
          <TextField label="Crop width 0-1" inputMode="decimal" value={String(transform.crop.width)} onChange={(event) => updateCrop("width", event.currentTarget.value)} />
          <TextField label="Crop height 0-1" inputMode="decimal" value={String(transform.crop.height)} onChange={(event) => updateCrop("height", event.currentTarget.value)} />
          <TextField label="Rotation degrees" inputMode="decimal" value={String(transform.rotationDegrees)} onChange={(event) => setTransform((current) => ({ ...current, rotationDegrees: parseNumber(event.currentTarget.value) }))} />
          <SelectField label="Aspect ratio mode" value={transform.aspectRatio.mode} onChange={(event) => updateAspect("mode", event.currentTarget.value)}>
            <option value="preserveSource">Preserve source crop</option>
            <option value="fixed">Fixed ratio</option>
          </SelectField>
          <TextField label="Fixed ratio width" inputMode="decimal" value={transform.aspectRatio.width?.toString() ?? ""} onChange={(event) => updateAspect("width", event.currentTarget.value)} />
          <TextField label="Fixed ratio height" inputMode="decimal" value={transform.aspectRatio.height?.toString() ?? ""} onChange={(event) => updateAspect("height", event.currentTarget.value)} />
        </div>
        <fieldset className="checkbox-grid">
          <legend>Framing guides</legend>
          {framingGuides.map((guide) => (
            <label key={guide}>
              <input type="checkbox" checked={transform.framingGuides.includes(guide)} onChange={() => toggleGuide(guide)} />
              <span>{guide}</span>
            </label>
          ))}
        </fieldset>
      </Card>
      <Card>
        <h3>Face-region alignment guide</h3>
        <fieldset className="checkbox-grid">
          <legend>Guide confirmation</legend>
          <label>
            <input type="checkbox" checked={transform.faceRegionAlignmentGuide.enabled} onChange={(event) => updateFaceRegion("enabled", event.currentTarget.checked)} />
            <span>Enable guide</span>
          </label>
          <label>
            <input type="checkbox" checked={transform.faceRegionAlignmentGuide.operatorConfirmed} onChange={(event) => updateFaceRegion("operatorConfirmed", event.currentTarget.checked)} />
            <span>Operator confirmed</span>
          </label>
        </fieldset>
        <div className="card-grid">
          <SelectField label="Alignment target" value={transform.faceRegionAlignmentGuide.target} onChange={(event) => updateFaceRegion("target", event.currentTarget.value)}>
            <option value="center">Center</option>
            <option value="upperThird">Upper third</option>
            <option value="profileNoseRoom">Profile nose room</option>
          </SelectField>
          <TextField label="Region x 0-1" inputMode="decimal" value={String(transform.faceRegionAlignmentGuide.region.x)} onChange={(event) => updateFaceRegionRect("x", event.currentTarget.value)} />
          <TextField label="Region y 0-1" inputMode="decimal" value={String(transform.faceRegionAlignmentGuide.region.y)} onChange={(event) => updateFaceRegionRect("y", event.currentTarget.value)} />
          <TextField label="Region width 0-1" inputMode="decimal" value={String(transform.faceRegionAlignmentGuide.region.width)} onChange={(event) => updateFaceRegionRect("width", event.currentTarget.value)} />
          <TextField label="Region height 0-1" inputMode="decimal" value={String(transform.faceRegionAlignmentGuide.region.height)} onChange={(event) => updateFaceRegionRect("height", event.currentTarget.value)} />
          <TextField label="Guide notes" value={transform.faceRegionAlignmentGuide.notes} onChange={(event) => updateFaceRegion("notes", event.currentTarget.value)} />
        </div>
      </Card>
      <div className="card-grid">
        <Card tone={plan.status === "ready" ? "success" : "warning"}>
          <h3>Plan</h3>
          <dl className="metadata-list">
            <div>
              <dt>Status</dt>
              <dd>{plan.status}</dd>
            </div>
            <div>
              <dt>Estimated output</dt>
              <dd>{plan.record ? `${plan.record.outputDimensions.width} x ${plan.record.outputDimensions.height}` : "Blocked"}</dd>
            </div>
            <div>
              <dt>Saved metadata records</dt>
              <dd>{savedMetadataCount}</dd>
            </div>
          </dl>
          <div className="button-row">
            <Button disabled={!selectedFile || plan.status !== "ready"} onClick={exportDerivative}>Export derivative</Button>
            <Button variant="secondary" onClick={() => setTransform(createDefaultImageTransform())}>Reset transform</Button>
          </div>
          <a ref={downloadRef} className="visually-hidden" aria-hidden="true" tabIndex={-1}>Download derivative</a>
          {exportMessage ? <p className="supporting" role="status">{exportMessage}</p> : null}
        </Card>
        <Card tone={plan.issues.length > 0 ? "warning" : plan.warnings.length > 0 ? "info" : "success"}>
          <h3>Validation</h3>
          {[...plan.issues, ...plan.warnings].length === 0 ? (
            <p className="supporting">No derivative warnings detected.</p>
          ) : (
            <ul className="compact-list">
              {[...plan.issues, ...plan.warnings].map((issue) => (
                <li key={`${issue.code}-${issue.message}`}>{issue.message}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}

async function renderDerivativeBlob(
  sourceURL: string,
  transform: Phase0ImageTransformationMetadata,
  outputDimensions: { width: number; height: number },
  exportFormat: Phase0ImageDerivativeExportFormat
): Promise<Blob> {
  const image = new Image();
  image.src = sourceURL;
  await image.decode();

  const cropX = Math.round(image.naturalWidth * transform.crop.x);
  const cropY = Math.round(image.naturalHeight * transform.crop.y);
  const cropWidth = Math.round(image.naturalWidth * transform.crop.width);
  const cropHeight = Math.round(image.naturalHeight * transform.crop.height);
  const canvas = document.createElement("canvas");
  canvas.width = outputDimensions.width;
  canvas.height = outputDimensions.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");

  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((transform.rotationDegrees * Math.PI) / 180);
  context.drawImage(image, cropX, cropY, cropWidth, cropHeight, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
  context.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Derivative blob unavailable"));
        return;
      }
      resolve(blob);
    }, exportFormat);
  });
}

function filenameFromPath(value: string) {
  return value.split("/").filter(Boolean).at(-1) ?? "gameface-match-derivative.png";
}

function parseInteger(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}
