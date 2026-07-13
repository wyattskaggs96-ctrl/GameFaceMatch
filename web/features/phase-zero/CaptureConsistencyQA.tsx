"use client";

import { useMemo, useState } from "react";
import { Alert, Card, SelectField, StatusBadge, TextField } from "@/components/design-system";
import {
  createCaptureConsistencyReport,
  createDefaultCaptureConsistencyTolerances,
  createEmptyManualConsistencyFlags,
  type Phase0CaptureConsistencyEvidence,
  type Phase0CaptureConsistencyManualFlags,
  type Phase0CaptureConsistencyMeasurements,
  type Phase0CaptureConsistencyTolerances
} from "@/lib/phase-zero/phase-zero-capture-consistency";
import type { Phase0EvidenceView } from "@/lib/phase-zero/phase-zero-evidence";

const views: Phase0EvidenceView[] = ["straightOn", "left45", "right45", "leftProfile", "rightProfile", "navigationEvidence", "menuOverview", "environment", "notApplicable"];
const manualFlagFields: Array<[keyof Phase0CaptureConsistencyManualFlags, string]> = [
  ["overlayObstruction", "Overlay obstruction"],
  ["cursorObstruction", "Cursor obstruction"],
  ["missingSkullOrChin", "Missing skull or chin"],
  ["unexpectedHairstyle", "Unexpected hairstyle"],
  ["unexpectedFacialHair", "Unexpected facial hair"],
  ["suspectedLoadingAnimation", "Suspected loading animation"]
];

export function CaptureConsistencyQA() {
  const [environmentID, setEnvironmentID] = useState("phase-zero-local-environment");
  const [toleranceFields, setToleranceFields] = useState(() => toleranceForm(createDefaultCaptureConsistencyTolerances("phase-zero-local-environment")));
  const [evidence, setEvidence] = useState<Phase0CaptureConsistencyEvidence[]>(() => [
    createEvidence("evidence-local-front", "straightOn"),
    createEvidence("evidence-local-left45", "left45")
  ]);
  const tolerances = useMemo(() => tolerancesFromForm(environmentID, toleranceFields), [environmentID, toleranceFields]);
  const report = useMemo(() => createCaptureConsistencyReport({
    environmentID,
    generatedAt: new Date().toISOString(),
    tolerances,
    evidence
  }), [environmentID, evidence, tolerances]);

  function updateTolerance(field: keyof typeof toleranceFields, value: string) {
    setToleranceFields((current) => ({ ...current, [field]: value }));
  }

  function updateEvidence(index: number, updater: (record: Phase0CaptureConsistencyEvidence) => Phase0CaptureConsistencyEvidence) {
    setEvidence((current) => current.map((record, recordIndex) => recordIndex === index ? updater(record) : record));
  }

  return (
    <section className="screen-stack" aria-labelledby="capture-consistency-title">
      <div className="status-row">
        <div>
          <p className="eyebrow">Internal audit tool</p>
          <h2 id="capture-consistency-title">Capture consistency QA</h2>
        </div>
        <StatusBadge tone={report.summary.warningCount > 0 ? "warning" : "success"}>
          {report.summary.warningCount} QA warnings
        </StatusBadge>
      </div>
      <p className="supporting">
        Compare local evidence metadata against environment-specific tolerances for dimensions, crop, head framing, brightness, contrast, sharpness,
        and color balance. Manual flags capture overlays, cursor obstruction, missing skull or chin, unexpected hair, unexpected facial hair, and loading
        animation concerns. These findings are QA warnings only, not verified game facts.
      </p>
      <Alert title="No automatic verification" tone="warning">
        Capture-consistency warnings help decide whether to review, recapture, or annotate evidence. They never auto-verify records and never invent
        College Football 27 catalog data.
      </Alert>
      <Card>
        <h3>Environment tolerances</h3>
        <div className="card-grid">
          <TextField label="Environment ID" value={environmentID} onChange={(event) => setEnvironmentID(event.currentTarget.value)} />
          <TextField label="Expected width" inputMode="numeric" value={toleranceFields.expectedWidth} onChange={(event) => updateTolerance("expectedWidth", event.currentTarget.value)} />
          <TextField label="Expected height" inputMode="numeric" value={toleranceFields.expectedHeight} onChange={(event) => updateTolerance("expectedHeight", event.currentTarget.value)} />
          <TextField label="Dimension tolerance px" inputMode="decimal" value={toleranceFields.dimensionTolerance} onChange={(event) => updateTolerance("dimensionTolerance", event.currentTarget.value)} />
          <TextField label="Aspect ratio" inputMode="decimal" value={toleranceFields.aspectRatio} onChange={(event) => updateTolerance("aspectRatio", event.currentTarget.value)} />
          <TextField label="Aspect tolerance" inputMode="decimal" value={toleranceFields.aspectTolerance} onChange={(event) => updateTolerance("aspectTolerance", event.currentTarget.value)} />
          <TextField label="Crop tolerance 0-1" inputMode="decimal" value={toleranceFields.cropTolerance} onChange={(event) => updateTolerance("cropTolerance", event.currentTarget.value)} />
          <TextField label="Head center tolerance" inputMode="decimal" value={toleranceFields.headCenterTolerance} onChange={(event) => updateTolerance("headCenterTolerance", event.currentTarget.value)} />
          <TextField label="Brightness min" inputMode="decimal" value={toleranceFields.brightnessMin} onChange={(event) => updateTolerance("brightnessMin", event.currentTarget.value)} />
          <TextField label="Brightness max" inputMode="decimal" value={toleranceFields.brightnessMax} onChange={(event) => updateTolerance("brightnessMax", event.currentTarget.value)} />
          <TextField label="Contrast min" inputMode="decimal" value={toleranceFields.contrastMin} onChange={(event) => updateTolerance("contrastMin", event.currentTarget.value)} />
          <TextField label="Sharpness min" inputMode="decimal" value={toleranceFields.sharpnessMin} onChange={(event) => updateTolerance("sharpnessMin", event.currentTarget.value)} />
          <TextField label="Color spread max" inputMode="decimal" value={toleranceFields.colorSpreadMax} onChange={(event) => updateTolerance("colorSpreadMax", event.currentTarget.value)} />
        </div>
      </Card>
      <div className="result-grid">
        {evidence.map((record, index) => (
          <Card key={record.evidenceID}>
            <div className="status-row">
              <h3>{record.evidenceID}</h3>
              <StatusBadge tone="info">{record.view}</StatusBadge>
            </div>
            <div className="card-grid">
              <TextField label="Evidence ID" value={record.evidenceID} onChange={(event) => updateEvidence(index, (current) => ({ ...current, evidenceID: event.currentTarget.value }))} />
              <SelectField label="View" value={record.view} onChange={(event) => updateEvidence(index, (current) => ({ ...current, view: event.currentTarget.value as Phase0EvidenceView }))}>
                {views.map((view) => <option key={view} value={view}>{view}</option>)}
              </SelectField>
              <TextField label="Width" inputMode="numeric" value={String(record.dimensions.width)} onChange={(event) => updateEvidence(index, (current) => ({ ...current, dimensions: { ...current.dimensions, width: parseInteger(event.currentTarget.value) } }))} />
              <TextField label="Height" inputMode="numeric" value={String(record.dimensions.height)} onChange={(event) => updateEvidence(index, (current) => ({ ...current, dimensions: { ...current.dimensions, height: parseInteger(event.currentTarget.value) } }))} />
              <TextField label="Crop x" inputMode="decimal" value={String(record.crop?.x ?? "")} onChange={(event) => updateEvidence(index, (current) => ({ ...current, crop: { unit: "normalized", x: parseNumber(event.currentTarget.value), y: current.crop?.y ?? 0, width: current.crop?.width ?? 1, height: current.crop?.height ?? 1 } }))} />
              <TextField label="Crop y" inputMode="decimal" value={String(record.crop?.y ?? "")} onChange={(event) => updateEvidence(index, (current) => ({ ...current, crop: { unit: "normalized", x: current.crop?.x ?? 0, y: parseNumber(event.currentTarget.value), width: current.crop?.width ?? 1, height: current.crop?.height ?? 1 } }))} />
              <TextField label="Head x" inputMode="decimal" value={String(record.headBoundingBox?.x ?? "")} onChange={(event) => updateEvidence(index, (current) => ({ ...current, headBoundingBox: { ...(current.headBoundingBox ?? defaultHeadBox()), x: parseNumber(event.currentTarget.value) } }))} />
              <TextField label="Head y" inputMode="decimal" value={String(record.headBoundingBox?.y ?? "")} onChange={(event) => updateEvidence(index, (current) => ({ ...current, headBoundingBox: { ...(current.headBoundingBox ?? defaultHeadBox()), y: parseNumber(event.currentTarget.value) } }))} />
              <TextField label="Head width" inputMode="decimal" value={String(record.headBoundingBox?.width ?? "")} onChange={(event) => updateEvidence(index, (current) => ({ ...current, headBoundingBox: { ...(current.headBoundingBox ?? defaultHeadBox()), width: parseNumber(event.currentTarget.value) } }))} />
              <TextField label="Head height" inputMode="decimal" value={String(record.headBoundingBox?.height ?? "")} onChange={(event) => updateEvidence(index, (current) => ({ ...current, headBoundingBox: { ...(current.headBoundingBox ?? defaultHeadBox()), height: parseNumber(event.currentTarget.value) } }))} />
              <TextField label="Brightness" inputMode="decimal" value={String(record.measurements?.brightness.value ?? "")} onChange={(event) => updateEvidence(index, (current) => ({ ...current, measurements: updateMeasurement(current.measurements, "brightness", event.currentTarget.value) }))} />
              <TextField label="Contrast" inputMode="decimal" value={String(record.measurements?.contrast.value ?? "")} onChange={(event) => updateEvidence(index, (current) => ({ ...current, measurements: updateMeasurement(current.measurements, "contrast", event.currentTarget.value) }))} />
              <TextField label="Sharpness" inputMode="decimal" value={String(record.measurements?.sharpness.value ?? "")} onChange={(event) => updateEvidence(index, (current) => ({ ...current, measurements: updateMeasurement(current.measurements, "sharpness", event.currentTarget.value) }))} />
              <TextField label="Color spread" inputMode="decimal" value={String(record.measurements?.colorBalance?.channelSpread ?? "")} onChange={(event) => updateEvidence(index, (current) => ({ ...current, measurements: updateColorSpread(current.measurements, event.currentTarget.value) }))} />
            </div>
            <fieldset className="checkbox-grid">
              <legend>Manual QA flags</legend>
              {manualFlagFields.map(([field, label]) => (
                <label key={field}>
                  <input
                    type="checkbox"
                    checked={Boolean(record.manualFlags[field])}
                    onChange={(event) => updateEvidence(index, (current) => ({
                      ...current,
                      manualFlags: {
                        ...current.manualFlags,
                        [field]: event.currentTarget.checked
                      }
                    }))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
          </Card>
        ))}
      </div>
      <div className="card-grid">
        <Card tone={report.summary.warningCount > 0 ? "warning" : "success"}>
          <h3>QA summary</h3>
          <dl className="metadata-list">
            <div>
              <dt>Evidence records</dt>
              <dd>{report.evidenceCount}</dd>
            </div>
            <div>
              <dt>Automated warnings</dt>
              <dd>{report.summary.automatedWarningCount}</dd>
            </div>
            <div>
              <dt>Manual flags</dt>
              <dd>{report.summary.manualFlagCount}</dd>
            </div>
            <div>
              <dt>Verified facts created</dt>
              <dd>{String(report.summary.verifiedGameFactsCreated)}</dd>
            </div>
          </dl>
          <p className="supporting">{report.qaNotice}</p>
        </Card>
        <Card tone={report.findings.length > 0 ? "warning" : "success"}>
          <h3>Findings</h3>
          {report.findings.length === 0 ? (
            <p className="supporting">No consistency warnings detected with the current tolerances.</p>
          ) : (
            <ul className="compact-list">
              {report.findings.slice(0, 12).map((finding, index) => (
                <li key={`${finding.code}-${finding.evidenceID ?? "set"}-${index}`}>
                  {finding.evidenceID ? `${finding.evidenceID}: ` : ""}{finding.message}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}

function createEvidence(evidenceID: string, view: Phase0EvidenceView): Phase0CaptureConsistencyEvidence {
  return {
    evidenceID,
    view,
    dimensions: {
      width: 1920,
      height: 1080
    },
    crop: {
      unit: "normalized",
      x: 0,
      y: 0,
      width: 1,
      height: 1
    },
    headBoundingBox: defaultHeadBox(),
    measurements: createMeasurements(),
    manualFlags: createEmptyManualConsistencyFlags()
  };
}

function defaultHeadBox() {
  return {
    unit: "normalized" as const,
    x: 0.25,
    y: 0.16,
    width: 0.5,
    height: 0.56,
    source: "operatorEstimate" as const
  };
}

function createMeasurements(): Phase0CaptureConsistencyMeasurements {
  return {
    brightness: { value: 0.55, evidence: "estimated" },
    contrast: { value: 0.16, evidence: "estimated" },
    sharpness: { value: 18, evidence: "estimated" },
    colorBalance: {
      redMean: 0.5,
      greenMean: 0.5,
      blueMean: 0.5,
      channelSpread: 0.02
    }
  };
}

function updateMeasurement(
  current: Phase0CaptureConsistencyMeasurements | null,
  field: "brightness" | "contrast" | "sharpness",
  value: string
): Phase0CaptureConsistencyMeasurements {
  const measurements = current ?? createMeasurements();
  return {
    ...measurements,
    [field]: {
      value: parseNumber(value),
      evidence: "estimated"
    }
  };
}

function updateColorSpread(current: Phase0CaptureConsistencyMeasurements | null, value: string): Phase0CaptureConsistencyMeasurements {
  const measurements = current ?? createMeasurements();
  return {
    ...measurements,
    colorBalance: {
      redMean: 0.5,
      greenMean: 0.5,
      blueMean: 0.5,
      channelSpread: parseNumber(value)
    }
  };
}

function toleranceForm(tolerances: Phase0CaptureConsistencyTolerances) {
  return {
    expectedWidth: tolerances.dimensions.expectedWidth?.toString() ?? "1920",
    expectedHeight: tolerances.dimensions.expectedHeight?.toString() ?? "1080",
    dimensionTolerance: String(tolerances.dimensions.tolerancePixels),
    aspectRatio: "1.777",
    aspectTolerance: String(tolerances.aspectRatio.tolerance),
    cropTolerance: String(tolerances.crop.normalizedTolerance),
    headCenterTolerance: String(tolerances.headBoundingBox.centerXTolerance),
    brightnessMin: String(tolerances.brightness.minimum),
    brightnessMax: String(tolerances.brightness.maximum),
    contrastMin: String(tolerances.contrast.minimum),
    sharpnessMin: String(tolerances.sharpness.minimum),
    colorSpreadMax: String(tolerances.colorBalance.maxChannelSpread)
  };
}

function tolerancesFromForm(environmentID: string, form: ReturnType<typeof toleranceForm>) {
  return createDefaultCaptureConsistencyTolerances(environmentID, {
    dimensions: {
      expectedWidth: parseOptionalInteger(form.expectedWidth),
      expectedHeight: parseOptionalInteger(form.expectedHeight),
      tolerancePixels: parseNumber(form.dimensionTolerance),
      crossImageTolerancePixels: parseNumber(form.dimensionTolerance)
    },
    aspectRatio: {
      expected: parseOptionalNumber(form.aspectRatio),
      tolerance: parseNumber(form.aspectTolerance),
      crossImageTolerance: parseNumber(form.aspectTolerance)
    },
    crop: {
      normalizedTolerance: parseNumber(form.cropTolerance)
    },
    headBoundingBox: {
      centerXTolerance: parseNumber(form.headCenterTolerance),
      centerYTolerance: parseNumber(form.headCenterTolerance)
    },
    brightness: {
      minimum: parseNumber(form.brightnessMin),
      maximum: parseNumber(form.brightnessMax),
      crossImageTolerance: 0.18
    },
    contrast: {
      minimum: parseNumber(form.contrastMin),
      maximum: 0.42,
      crossImageTolerance: 0.16
    },
    sharpness: {
      minimum: parseNumber(form.sharpnessMin),
      crossImageTolerance: 12
    },
    colorBalance: {
      maxChannelSpread: parseNumber(form.colorSpreadMax),
      crossImageTolerance: 0.16
    }
  });
}

function parseInteger(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalInteger(value: string) {
  return value.trim() ? parseInteger(value) : null;
}

function parseOptionalNumber(value: string) {
  return value.trim() ? parseNumber(value) : null;
}

function parseNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}
