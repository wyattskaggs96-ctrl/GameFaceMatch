"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, SelectField, StatusBadge, TextField } from "@/components/design-system";
import {
  addAdditionalAttributeEntry,
  assignAdditionalAttributeStableID,
  createAdditionalAttributeEntry,
  createEmptyAdditionalAttributesWorkspace,
  validateAdditionalAttributesWorkspace,
  type Phase0AdditionalAttributeEntry,
  type Phase0AdditionalControlType,
  type Phase0AdditionalEffectState,
  type Phase0LaterVisibilityState,
  type Phase0RecommendationSuitability,
  type Phase0StableIdentifierAvailability
} from "@/lib/phase-zero/phase-zero-additional-attributes-workspace";
import type { Phase0VerificationState } from "@/lib/phase-zero/phase-zero-domain";
import type { Phase0CatalogManagerDisposition } from "@/lib/phase-zero/phase-zero-head-capture-workspace";

interface AdditionalAttributeDraft {
  platformCode: string;
  modeCode: string;
  attributeCode: string;
  nativeCategoryLabel: string;
  nativeControlLabel: string;
  nativeOrder: string;
  controlType: Phase0AdditionalControlType;
  count: string;
  defaultValue: string;
  minimum: string;
  maximum: string;
  step: string;
  geometryEffect: Phase0AdditionalEffectState;
  textureEffect: Phase0AdditionalEffectState;
  colorEffect: Phase0AdditionalEffectState;
  presentationOnlyEffect: Phase0AdditionalEffectState;
  resetOnHeadChange: "unknown" | "yes" | "no";
  laterVisibility: Phase0LaterVisibilityState;
  recommendationSuitability: Phase0RecommendationSuitability;
  stableIdentifierAvailability: Phase0StableIdentifierAvailability;
  boundaryEvidenceIDs: string;
  representativeEvidenceIDs: string;
  evidenceNotes: string;
  dependencyCondition: string;
  dependencyStableID: string;
  dependencyMenuID: string;
  dependencyEvidenceIDs: string;
  dependencyNotes: string;
  verificationStatus: Phase0VerificationState;
  catalogManagerDisposition: Phase0CatalogManagerDisposition;
  notes: string;
}

const initialDraft: AdditionalAttributeDraft = {
  platformCode: "SYNTHETIC",
  modeCode: "SYNTHETICMODE",
  attributeCode: "",
  nativeCategoryLabel: "",
  nativeControlLabel: "",
  nativeOrder: "1",
  controlType: "namedOptions",
  count: "",
  defaultValue: "",
  minimum: "",
  maximum: "",
  step: "",
  geometryEffect: "unknown",
  textureEffect: "unknown",
  colorEffect: "unknown",
  presentationOnlyEffect: "unknown",
  resetOnHeadChange: "unknown",
  laterVisibility: "unknown",
  recommendationSuitability: "unknown",
  stableIdentifierAvailability: "unknown",
  boundaryEvidenceIDs: "",
  representativeEvidenceIDs: "",
  evidenceNotes: "",
  dependencyCondition: "",
  dependencyStableID: "",
  dependencyMenuID: "",
  dependencyEvidenceIDs: "",
  dependencyNotes: "",
  verificationStatus: "draft",
  catalogManagerDisposition: "notReady",
  notes: "Research draft awaiting direct evidence."
};

const controlTypes: Phase0AdditionalControlType[] = ["preset", "carousel", "numberedOptions", "namedOptions", "slider", "color", "toggle"];
const effectStates: Phase0AdditionalEffectState[] = ["unknown", "none", "minor", "major"];
const visibilityStates: Phase0LaterVisibilityState[] = ["unknown", "visibleLater", "hiddenLater", "lockedLater", "notApplicable"];
const suitabilityStates: Phase0RecommendationSuitability[] = ["unknown", "suitable", "supportingOnly", "notSuitable", "blockedByEvidence"];
const stableIdentifierStates: Phase0StableIdentifierAvailability[] = ["unknown", "available", "derivedFromNativeOrder", "notAvailable", "requiresVerification"];

export function AdditionalAttributesWorkspace() {
  const [workspace, setWorkspace] = useState(() =>
    createEmptyAdditionalAttributesWorkspace({
      workspaceID: "cf27-additional-attributes-workspace-draft",
      gameID: "college-football-27",
      platformCode: initialDraft.platformCode,
      modeCode: initialDraft.modeCode,
      gameVersionID: "unconfirmed-game-version",
      patchID: "unconfirmed-patch",
      creationPathID: "unconfirmed-creation-path",
      menuMapID: "cf27-menu-map-draft",
      nowISO: new Date().toISOString()
    })
  );
  const [draft, setDraft] = useState<AdditionalAttributeDraft>(initialDraft);
  const validation = useMemo(() => validateAdditionalAttributesWorkspace(workspace), [workspace]);
  const parsedNativeOrder = Number.parseInt(draft.nativeOrder, 10);
  const assignedStableID = draft.attributeCode.trim()
    ? assignAdditionalAttributeStableID(draft.platformCode, draft.modeCode, draft.attributeCode, parsedNativeOrder)
    : "Enter observed attribute code";

  function updateDraft<Key extends keyof AdditionalAttributeDraft>(key: Key, value: AdditionalAttributeDraft[Key]) {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
  }

  function addEntry() {
    const nowISO = new Date().toISOString();
    const nativeOrder = Number.parseInt(draft.nativeOrder, 10);
    const entry = createAdditionalAttributeEntry({
      platformCode: draft.platformCode,
      modeCode: draft.modeCode,
      attributeCode: draft.attributeCode,
      nativeCategoryLabel: draft.nativeCategoryLabel,
      nativeControlLabel: draft.nativeControlLabel,
      nativeOrder,
      controlType: draft.controlType,
      stableIdentifierAvailability: draft.stableIdentifierAvailability,
      nowISO
    });
    const nextEntry: Phase0AdditionalAttributeEntry = {
      ...entry,
      range: {
        count: parseOptionalInteger(draft.count),
        defaultValue: parseDefaultValue(draft.defaultValue),
        minimum: parseOptionalNumber(draft.minimum),
        maximum: parseOptionalNumber(draft.maximum),
        step: parseOptionalNumber(draft.step)
      },
      effects: {
        geometryEffect: draft.geometryEffect,
        textureEffect: draft.textureEffect,
        colorEffect: draft.colorEffect,
        presentationOnlyEffect: draft.presentationOnlyEffect
      },
      resetOnHeadChange: triStateBoolean(draft.resetOnHeadChange),
      laterVisibility: draft.laterVisibility,
      recommendationSuitability: draft.recommendationSuitability,
      stableIdentifierAvailability: draft.stableIdentifierAvailability,
      evidence: {
        boundaryEvidenceIDs: splitList(draft.boundaryEvidenceIDs),
        representativeEvidenceIDs: splitList(draft.representativeEvidenceIDs),
        notes: draft.evidenceNotes.trim()
      },
      dependencies: draft.dependencyCondition.trim()
        ? [{
            dependencyID: `${entry.entryID}-dependency-1`,
            condition: draft.dependencyCondition.trim(),
            dependsOnStableID: draft.dependencyStableID.trim() || null,
            dependsOnMenuID: draft.dependencyMenuID.trim() || null,
            evidenceFileIDs: splitList(draft.dependencyEvidenceIDs),
            notes: draft.dependencyNotes.trim()
          }]
        : [],
      verificationStatus: draft.verificationStatus,
      catalogManagerDisposition: draft.catalogManagerDisposition,
      notes: draft.notes.trim()
    };
    setWorkspace((currentWorkspace) => ({
      ...addAdditionalAttributeEntry(currentWorkspace, nextEntry, nowISO),
      platformCode: draft.platformCode.trim().toUpperCase(),
      modeCode: draft.modeCode.trim().toUpperCase()
    }));
    setDraft((currentDraft) => ({
      ...initialDraft,
      platformCode: currentDraft.platformCode,
      modeCode: currentDraft.modeCode,
      nativeOrder: String(workspace.entries.length + 2)
    }));
  }

  return (
    <section className="screen-stack" aria-labelledby="additional-attributes-workspace-title">
      <div className="status-row">
        <div>
          <p className="eyebrow">Internal audit tool</p>
          <h2 id="additional-attributes-workspace-title">Additional attributes workspace</h2>
        </div>
        <StatusBadge tone={validation.productionCompletionAllowed ? "success" : "danger"}>
          {validation.productionCompletionAllowed ? "production complete" : "production blocked"}
        </StatusBadge>
      </div>
      <p className="supporting">
        Record other resemblance-related controls only after direct game observation. This workspace starts blank and does not pre-confirm categories,
        labels, ranges, or recommendation suitability.
      </p>
      <Alert title="Discovery only until verified" tone="warning" role="alert">
        Presets, carousels, numbered options, named options, sliders, colors, and toggles require boundary evidence, representative evidence, effect
        classification, stable identifier review, and verification before they can support recommendations.
      </Alert>
      <div className="card-grid">
        <Card>
          <h3>Observed control identity</h3>
          <div className="form-stack">
            <TextField label="Platform code" value={draft.platformCode} onChange={(event) => updateDraft("platformCode", event.currentTarget.value)} />
            <TextField label="Mode code" value={draft.modeCode} onChange={(event) => updateDraft("modeCode", event.currentTarget.value)} />
            <TextField label="Attribute code" value={draft.attributeCode} onChange={(event) => updateDraft("attributeCode", event.currentTarget.value)} note="Operator-defined code after direct observation, such as a menu/control abbreviation." />
            <TextField label="Native category label" value={draft.nativeCategoryLabel} onChange={(event) => updateDraft("nativeCategoryLabel", event.currentTarget.value)} />
            <TextField label="Native control label" value={draft.nativeControlLabel} onChange={(event) => updateDraft("nativeControlLabel", event.currentTarget.value)} />
            <TextField label="Native order" inputMode="numeric" value={draft.nativeOrder} onChange={(event) => updateDraft("nativeOrder", event.currentTarget.value)} />
            <p className="supporting">Possible stable ID: {assignedStableID}</p>
          </div>
        </Card>
        <Card>
          <h3>Control mechanics</h3>
          <div className="form-stack">
            <SelectField label="Control type" value={draft.controlType} onChange={(event) => updateDraft("controlType", event.currentTarget.value as Phase0AdditionalControlType)}>
              {controlTypes.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <TextField label="Count" inputMode="numeric" value={draft.count} onChange={(event) => updateDraft("count", event.currentTarget.value)} />
            <TextField label="Default" value={draft.defaultValue} onChange={(event) => updateDraft("defaultValue", event.currentTarget.value)} />
            <TextField label="Minimum" inputMode="decimal" value={draft.minimum} onChange={(event) => updateDraft("minimum", event.currentTarget.value)} />
            <TextField label="Maximum" inputMode="decimal" value={draft.maximum} onChange={(event) => updateDraft("maximum", event.currentTarget.value)} />
            <TextField label="Step" inputMode="decimal" value={draft.step} onChange={(event) => updateDraft("step", event.currentTarget.value)} />
          </div>
        </Card>
        <Card>
          <h3>Effects and suitability</h3>
          <div className="form-stack">
            <SelectField label="Geometry effect" value={draft.geometryEffect} onChange={(event) => updateDraft("geometryEffect", event.currentTarget.value as Phase0AdditionalEffectState)}>
              {effectStates.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Texture effect" value={draft.textureEffect} onChange={(event) => updateDraft("textureEffect", event.currentTarget.value as Phase0AdditionalEffectState)}>
              {effectStates.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Color effect" value={draft.colorEffect} onChange={(event) => updateDraft("colorEffect", event.currentTarget.value as Phase0AdditionalEffectState)}>
              {effectStates.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Presentation-only effect" value={draft.presentationOnlyEffect} onChange={(event) => updateDraft("presentationOnlyEffect", event.currentTarget.value as Phase0AdditionalEffectState)}>
              {effectStates.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Reset on head change" value={draft.resetOnHeadChange} onChange={(event) => updateDraft("resetOnHeadChange", event.currentTarget.value as AdditionalAttributeDraft["resetOnHeadChange"])}>
              {["unknown", "yes", "no"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Later visibility" value={draft.laterVisibility} onChange={(event) => updateDraft("laterVisibility", event.currentTarget.value as Phase0LaterVisibilityState)}>
              {visibilityStates.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Recommendation suitability" value={draft.recommendationSuitability} onChange={(event) => updateDraft("recommendationSuitability", event.currentTarget.value as Phase0RecommendationSuitability)}>
              {suitabilityStates.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Stable identifier availability" value={draft.stableIdentifierAvailability} onChange={(event) => updateDraft("stableIdentifierAvailability", event.currentTarget.value as Phase0StableIdentifierAvailability)}>
              {stableIdentifierStates.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
          </div>
        </Card>
      </div>
      <div className="card-grid">
        <Card>
          <h3>Evidence</h3>
          <div className="form-stack">
            <TextField label="Boundary evidence IDs" value={draft.boundaryEvidenceIDs} onChange={(event) => updateDraft("boundaryEvidenceIDs", event.currentTarget.value)} note="Comma-separated min/max/end-state evidence." />
            <TextField label="Representative evidence IDs" value={draft.representativeEvidenceIDs} onChange={(event) => updateDraft("representativeEvidenceIDs", event.currentTarget.value)} note="Comma-separated representative option evidence." />
            <TextField label="Evidence notes" value={draft.evidenceNotes} onChange={(event) => updateDraft("evidenceNotes", event.currentTarget.value)} />
          </div>
        </Card>
        <Card>
          <h3>Dependency</h3>
          <div className="form-stack">
            <TextField label="Dependency condition" value={draft.dependencyCondition} onChange={(event) => updateDraft("dependencyCondition", event.currentTarget.value)} />
            <TextField label="Depends on stable ID" value={draft.dependencyStableID} onChange={(event) => updateDraft("dependencyStableID", event.currentTarget.value)} />
            <TextField label="Depends on menu ID" value={draft.dependencyMenuID} onChange={(event) => updateDraft("dependencyMenuID", event.currentTarget.value)} />
            <TextField label="Dependency evidence IDs" value={draft.dependencyEvidenceIDs} onChange={(event) => updateDraft("dependencyEvidenceIDs", event.currentTarget.value)} />
            <TextField label="Dependency notes" value={draft.dependencyNotes} onChange={(event) => updateDraft("dependencyNotes", event.currentTarget.value)} />
          </div>
        </Card>
        <Card>
          <h3>Review</h3>
          <div className="form-stack">
            <SelectField label="Verification status" value={draft.verificationStatus} onChange={(event) => updateDraft("verificationStatus", event.currentTarget.value as Phase0VerificationState)}>
              {["draft", "firstReviewPending", "firstReviewApproved", "secondReviewPending", "verified", "rejected", "retired"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Catalog-manager disposition" value={draft.catalogManagerDisposition} onChange={(event) => updateDraft("catalogManagerDisposition", event.currentTarget.value as Phase0CatalogManagerDisposition)}>
              {["notReady", "readyForReview", "accepted", "rejected", "deferred"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <TextField label="Notes" value={draft.notes} onChange={(event) => updateDraft("notes", event.currentTarget.value)} />
            <Button onClick={addEntry}>Add additional attribute entry</Button>
          </div>
        </Card>
      </div>
      <div className="card-grid">
        <Card>
          <h3>Production completion gate</h3>
          {validation.errors.length === 0 ? <p className="supporting">No blocking errors.</p> : null}
          <ul className="compact-list">
            {validation.errors.slice(0, 10).map((error) => <li key={`${error.code}-${error.entryID ?? error.message}`}>{error.message}</li>)}
          </ul>
          {validation.warnings.length > 0 ? (
            <>
              <p className="supporting">Warnings:</p>
              <ul className="compact-list">
                {validation.warnings.slice(0, 6).map((warning) => <li key={`${warning.code}-${warning.entryID ?? warning.message}`}>{warning.message}</li>)}
              </ul>
            </>
          ) : null}
        </Card>
        <Card>
          <h3>Recorded controls</h3>
          {workspace.entries.length === 0 ? <p className="supporting">No additional controls recorded yet.</p> : null}
          <ul className="compact-list">
            {workspace.entries.map((entry) => (
              <li key={entry.entryID}>
                <strong>{entry.stableInternalID ?? entry.entryID}</strong> {entry.controlType}; suitability: {entry.recommendationSuitability}; verified: {entry.verificationStatus}.
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}

function parseOptionalInteger(value: string) {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDefaultValue(value: string): string | number | boolean | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "true") return true;
  if (trimmed.toLowerCase() === "false") return false;
  const numeric = Number.parseFloat(trimmed);
  return Number.isFinite(numeric) && String(numeric) === trimmed ? numeric : trimmed;
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function triStateBoolean(value: "unknown" | "yes" | "no") {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}
