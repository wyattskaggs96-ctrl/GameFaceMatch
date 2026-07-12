"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, SelectField, StatusBadge, TextField } from "@/components/design-system";
import {
  addFacialHairCaptureEntry,
  addFacialHairDoubleCountRun,
  assignFacialHairStableID,
  createEmptyFacialHairCaptureWorkspace,
  createFacialHairCaptureEntry,
  createFacialHairEvidenceReference,
  detectFacialHairRecaptureNeeds,
  getMissingFacialHairViews,
  PHASE0_REQUIRED_FACIAL_HAIR_CAPTURE_VIEW_IDS,
  PHASE0_REQUIRED_FACIAL_HAIR_DEPENDENCY_KINDS,
  PHASE0_REQUIRED_FACIAL_HAIR_OBSERVATION_KINDS,
  validateFacialHairCaptureWorkspace,
  type Phase0FacialHairCaptureCompletionStatus,
  type Phase0FacialHairCaptureEntry,
  type Phase0FacialHairCaptureViewID,
  type Phase0FacialHairCoverage,
  type Phase0FacialHairDependencyKind,
  type Phase0FacialHairObservationKind
} from "@/lib/phase-zero/phase-zero-facial-hair-capture-workspace";
import type { Phase0VerificationState } from "@/lib/phase-zero/phase-zero-domain";
import type { Phase0CatalogManagerDisposition } from "@/lib/phase-zero/phase-zero-head-capture-workspace";

interface FacialHairEntryDraft {
  platformCode: string;
  modeCode: string;
  nativeOrder: string;
  nativeCategoryLabel: string;
  visibleGameLabelOrIndex: string;
  isNoneOption: boolean;
  canonicalHeadStableID: string;
  canonicalHeadConfirmed: boolean;
  canonicalHairstyleStableID: string;
  canonicalHairstyleConfirmed: boolean;
  facialHairColor: string;
  fullScreenMenuEvidenceIDs: string;
  sourceVideoID: string;
  viewEvidenceIDs: Record<Phase0FacialHairCaptureViewID, string>;
  viewTimestamps: Record<Phase0FacialHairCaptureViewID, string>;
  dependencies: Record<Phase0FacialHairDependencyKind, string>;
  dependencyEvidenceIDs: Record<Phase0FacialHairDependencyKind, string>;
  observations: Record<Phase0FacialHairObservationKind, string>;
  observationEvidenceIDs: Record<Phase0FacialHairObservationKind, string>;
  standardizedCoverage: Phase0FacialHairCoverage;
  obscuresJawline: "unknown" | "yes" | "no";
  obscuresMouth: "unknown" | "yes" | "no";
  coverageNotes: string;
  openRecaptureView: Phase0FacialHairCaptureViewID | "none";
  recaptureReason: string;
  captureCompletionStatus: Phase0FacialHairCaptureCompletionStatus;
  verificationStatus: Phase0VerificationState;
  catalogManagerDisposition: Phase0CatalogManagerDisposition;
  notes: string;
}

const viewLabels: Record<Phase0FacialHairCaptureViewID, string> = {
  front: "Front",
  leftThreeQuarter: "Left three-quarter",
  leftProfile: "Left profile",
  rightThreeQuarter: "Right three-quarter",
  rightProfile: "Right profile"
};

const dependencyLabels: Record<Phase0FacialHairDependencyKind, string> = {
  head: "Head",
  hairstyle: "Hairstyle",
  mode: "Mode",
  body: "Body",
  position: "Position",
  archetype: "Archetype",
  account: "Account",
  platform: "Platform",
  skinTone: "Skin tone",
  unlock: "Unlock"
};

const observationLabels: Record<Phase0FacialHairObservationKind, string> = {
  mustache: "Mustache",
  beard: "Beard",
  sideburn: "Sideburn",
  stubble: "Stubble",
  density: "Density",
  length: "Length",
  colorControl: "Color-control"
};

const emptyViewValues = PHASE0_REQUIRED_FACIAL_HAIR_CAPTURE_VIEW_IDS.reduce((values, viewID) => {
  values[viewID] = "";
  return values;
}, {} as Record<Phase0FacialHairCaptureViewID, string>);

const emptyDependencyValues = PHASE0_REQUIRED_FACIAL_HAIR_DEPENDENCY_KINDS.reduce((values, kind) => {
  values[kind] = "";
  return values;
}, {} as Record<Phase0FacialHairDependencyKind, string>);

const emptyObservationValues = PHASE0_REQUIRED_FACIAL_HAIR_OBSERVATION_KINDS.reduce((values, kind) => {
  values[kind] = "";
  return values;
}, {} as Record<Phase0FacialHairObservationKind, string>);

const initialDraft: FacialHairEntryDraft = {
  platformCode: "SYNTHETIC",
  modeCode: "SYNTHETICMODE",
  nativeOrder: "1",
  nativeCategoryLabel: "",
  visibleGameLabelOrIndex: "",
  isNoneOption: false,
  canonicalHeadStableID: "",
  canonicalHeadConfirmed: false,
  canonicalHairstyleStableID: "",
  canonicalHairstyleConfirmed: false,
  facialHairColor: "",
  fullScreenMenuEvidenceIDs: "",
  sourceVideoID: "",
  viewEvidenceIDs: emptyViewValues,
  viewTimestamps: emptyViewValues,
  dependencies: emptyDependencyValues,
  dependencyEvidenceIDs: emptyDependencyValues,
  observations: emptyObservationValues,
  observationEvidenceIDs: emptyObservationValues,
  standardizedCoverage: "unknown",
  obscuresJawline: "unknown",
  obscuresMouth: "unknown",
  coverageNotes: "",
  openRecaptureView: "none",
  recaptureReason: "",
  captureCompletionStatus: "notStarted",
  verificationStatus: "draft",
  catalogManagerDisposition: "notReady",
  notes: "Research draft awaiting direct evidence."
};

export function FacialHairCaptureWorkspace() {
  const [workspace, setWorkspace] = useState(() =>
    createEmptyFacialHairCaptureWorkspace({
      workspaceID: "cf27-facial-hair-capture-workspace-draft",
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
  const [draft, setDraft] = useState<FacialHairEntryDraft>(initialDraft);
  const [countOne, setCountOne] = useState("");
  const [countTwo, setCountTwo] = useState("");
  const validation = useMemo(() => validateFacialHairCaptureWorkspace(workspace), [workspace]);
  const assignedStableID = assignFacialHairStableID(draft.platformCode, draft.modeCode, Number.parseInt(draft.nativeOrder, 10));

  function updateDraft<Key extends keyof FacialHairEntryDraft>(key: Key, value: FacialHairEntryDraft[Key]) {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
  }

  function updateViewEvidence(viewID: Phase0FacialHairCaptureViewID, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      viewEvidenceIDs: { ...currentDraft.viewEvidenceIDs, [viewID]: value }
    }));
  }

  function updateViewTimestamp(viewID: Phase0FacialHairCaptureViewID, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      viewTimestamps: { ...currentDraft.viewTimestamps, [viewID]: value }
    }));
  }

  function updateDependency(kind: Phase0FacialHairDependencyKind, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      dependencies: { ...currentDraft.dependencies, [kind]: value }
    }));
  }

  function updateDependencyEvidence(kind: Phase0FacialHairDependencyKind, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      dependencyEvidenceIDs: { ...currentDraft.dependencyEvidenceIDs, [kind]: value }
    }));
  }

  function updateObservation(kind: Phase0FacialHairObservationKind, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      observations: { ...currentDraft.observations, [kind]: value }
    }));
  }

  function updateObservationEvidence(kind: Phase0FacialHairObservationKind, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      observationEvidenceIDs: { ...currentDraft.observationEvidenceIDs, [kind]: value }
    }));
  }

  function recordDoubleCountRuns() {
    const nowISO = new Date().toISOString();
    const firstCount = parseOptionalInteger(countOne);
    const secondCount = parseOptionalInteger(countTwo);
    setWorkspace((currentWorkspace) => {
      const withFirst = addFacialHairDoubleCountRun(currentWorkspace, {
        runID: "facial-hair-double-count-run-1",
        runNumber: 1,
        observedCount: firstCount,
        startedAt: nowISO,
        completedAt: firstCount === null ? null : nowISO,
        sourceVideoEvidenceID: null,
        notes: "First operator facial-hair count run."
      }, nowISO);
      return addFacialHairDoubleCountRun(withFirst, {
        runID: "facial-hair-double-count-run-2",
        runNumber: 2,
        observedCount: secondCount,
        startedAt: nowISO,
        completedAt: secondCount === null ? null : nowISO,
        sourceVideoEvidenceID: null,
        notes: "Second operator facial-hair count run."
      }, nowISO);
    });
  }

  function addEntry() {
    const nowISO = new Date().toISOString();
    const nativeOrder = Number.parseInt(draft.nativeOrder, 10);
    const entry = createFacialHairCaptureEntry({
      platformCode: draft.platformCode,
      modeCode: draft.modeCode,
      nativeOrder,
      nativeCategoryLabel: draft.nativeCategoryLabel,
      visibleGameLabelOrIndex: draft.visibleGameLabelOrIndex,
      isNoneOption: draft.isNoneOption,
      nowISO
    });
    const nextEntry: Phase0FacialHairCaptureEntry = {
      ...entry,
      canonicalHeadStableID: draft.canonicalHeadStableID.trim(),
      canonicalHeadConfirmed: draft.canonicalHeadConfirmed,
      canonicalHairstyleStableID: draft.canonicalHairstyleStableID.trim(),
      canonicalHairstyleConfirmed: draft.canonicalHairstyleConfirmed,
      facialHairColor: draft.isNoneOption ? null : draft.facialHairColor.trim() || null,
      fullScreenMenuEvidenceIDs: splitList(draft.fullScreenMenuEvidenceIDs),
      viewEvidence: PHASE0_REQUIRED_FACIAL_HAIR_CAPTURE_VIEW_IDS.flatMap((viewID) => {
        const evidenceFileID = draft.viewEvidenceIDs[viewID].trim();
        if (!evidenceFileID) return [];
        return createFacialHairEvidenceReference({
          evidenceFileID,
          viewID,
          sourceVideoID: draft.sourceVideoID,
          sourceVideoTimestamp: draft.viewTimestamps[viewID] || null,
          notes: `${viewLabels[viewID]} facial-hair capture evidence.`
        });
      }),
      dependencies: PHASE0_REQUIRED_FACIAL_HAIR_DEPENDENCY_KINDS.flatMap((kind) => {
        const observedValue = draft.dependencies[kind].trim();
        if (!observedValue) return [];
        return {
          dependencyID: `${entry.entryID}-dependency-${kind}`,
          kind,
          observedValue,
          evidenceFileIDs: splitList(draft.dependencyEvidenceIDs[kind]),
          notes: `${dependencyLabels[kind]} dependency recorded from direct observation.`
        };
      }),
      coverageMetadata: {
        metadataID: `${entry.entryID}-coverage-metadata`,
        standardizedCoverage: draft.isNoneOption ? "none" : draft.standardizedCoverage,
        obscuresJawline: triStateBoolean(draft.obscuresJawline),
        obscuresMouth: triStateBoolean(draft.obscuresMouth),
        coverageNotes: draft.coverageNotes.trim()
      },
      observations: PHASE0_REQUIRED_FACIAL_HAIR_OBSERVATION_KINDS.flatMap((kind) => {
        const observedState = draft.observations[kind].trim();
        if (!observedState) return [];
        return {
          observationID: `${entry.entryID}-observation-${kind}`,
          kind,
          observedState,
          evidenceFileIDs: splitList(draft.observationEvidenceIDs[kind]),
          notes: `${observationLabels[kind]} observation recorded from direct evidence.`
        };
      }),
      recaptureRequests: draft.openRecaptureView === "none" || !draft.recaptureReason.trim()
        ? []
        : [{
            requestID: `${entry.entryID}-recapture-${draft.openRecaptureView}`,
            viewID: draft.openRecaptureView,
            reason: draft.recaptureReason.trim(),
            status: "open",
            evidenceFileIDs: [],
            notes: "Operator-created recapture request."
          }],
      captureCompletionStatus: draft.captureCompletionStatus,
      verificationStatus: draft.verificationStatus,
      catalogManagerDisposition: draft.catalogManagerDisposition,
      notes: draft.notes.trim()
    };
    setWorkspace((currentWorkspace) => ({
      ...addFacialHairCaptureEntry(currentWorkspace, nextEntry, nowISO),
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
    <section className="screen-stack" aria-labelledby="facial-hair-capture-workspace-title">
      <div className="status-row">
        <div>
          <p className="eyebrow">Internal audit tool</p>
          <h2 id="facial-hair-capture-workspace-title">Facial-hair catalog workspace</h2>
        </div>
        <StatusBadge tone={validation.productionCompletionAllowed ? "success" : "danger"}>
          {validation.productionCompletionAllowed ? "production complete" : "production blocked"}
        </StatusBadge>
      </div>
      <p className="supporting">
        Record facial-hair catalog evidence from direct game observation, including the None option. Coverage and observation metadata are researcher
        annotations and are stored separately from native game labels.
      </p>
      <Alert title="Evidence required for every option" tone="warning" role="alert">
        Production completion remains blocked until None is included, double counts agree, canonical head and hairstyle are confirmed, full-screen menu
        evidence and required views exist, dependency tests are recorded, and facial-hair observations include evidence.
      </Alert>
      <div className="card-grid">
        <Card>
          <h3>Double counts</h3>
          <div className="form-stack">
            <TextField label="First observed count" inputMode="numeric" value={countOne} onChange={(event) => setCountOne(event.currentTarget.value)} />
            <TextField label="Second observed count" inputMode="numeric" value={countTwo} onChange={(event) => setCountTwo(event.currentTarget.value)} />
            <Button onClick={recordDoubleCountRuns}>Record facial-hair counts</Button>
          </div>
        </Card>
        <Card>
          <h3>Native order and labels</h3>
          <div className="form-stack">
            <TextField label="Platform code" value={draft.platformCode} onChange={(event) => updateDraft("platformCode", event.currentTarget.value)} />
            <TextField label="Mode code" value={draft.modeCode} onChange={(event) => updateDraft("modeCode", event.currentTarget.value)} />
            <TextField label="Native order" inputMode="numeric" value={draft.nativeOrder} onChange={(event) => updateDraft("nativeOrder", event.currentTarget.value)} />
            <TextField label="Native category label" value={draft.nativeCategoryLabel} onChange={(event) => updateDraft("nativeCategoryLabel", event.currentTarget.value)} />
            <TextField label="Visible game label or index" value={draft.visibleGameLabelOrIndex} onChange={(event) => updateDraft("visibleGameLabelOrIndex", event.currentTarget.value)} />
            <label className="form-field">
              <span>This is the None option</span>
              <input type="checkbox" checked={draft.isNoneOption} onChange={(event) => updateDraft("isNoneOption", event.currentTarget.checked)} />
            </label>
            <p className="supporting">Assigned stable ID: {assignedStableID}</p>
          </div>
        </Card>
        <Card>
          <h3>Canonical setup</h3>
          <div className="form-stack">
            <TextField label="Canonical head stable ID" value={draft.canonicalHeadStableID} onChange={(event) => updateDraft("canonicalHeadStableID", event.currentTarget.value)} />
            <label className="form-field">
              <span>Canonical head confirmed</span>
              <input type="checkbox" checked={draft.canonicalHeadConfirmed} onChange={(event) => updateDraft("canonicalHeadConfirmed", event.currentTarget.checked)} />
            </label>
            <TextField label="Canonical hairstyle stable ID" value={draft.canonicalHairstyleStableID} onChange={(event) => updateDraft("canonicalHairstyleStableID", event.currentTarget.value)} />
            <label className="form-field">
              <span>Canonical hairstyle confirmed</span>
              <input type="checkbox" checked={draft.canonicalHairstyleConfirmed} onChange={(event) => updateDraft("canonicalHairstyleConfirmed", event.currentTarget.checked)} />
            </label>
            <TextField label="Facial-hair color" value={draft.facialHairColor} onChange={(event) => updateDraft("facialHairColor", event.currentTarget.value)} note="Leave empty only when the entry is verified as None." />
            <TextField label="Full-screen menu evidence IDs" value={draft.fullScreenMenuEvidenceIDs} onChange={(event) => updateDraft("fullScreenMenuEvidenceIDs", event.currentTarget.value)} note="Comma-separated evidence IDs." />
            <TextField label="Source video ID" value={draft.sourceVideoID} onChange={(event) => updateDraft("sourceVideoID", event.currentTarget.value)} />
          </div>
        </Card>
        <Card>
          <h3>Coverage metadata</h3>
          <div className="form-stack">
            <SelectField label="Standardized coverage" value={draft.standardizedCoverage} onChange={(event) => updateDraft("standardizedCoverage", event.currentTarget.value as Phase0FacialHairCoverage)}>
              {["unknown", "none", "mustache", "goatee", "beard", "mixed"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Obscures jawline" value={draft.obscuresJawline} onChange={(event) => updateDraft("obscuresJawline", event.currentTarget.value as FacialHairEntryDraft["obscuresJawline"])}>
              {["unknown", "yes", "no"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Obscures mouth" value={draft.obscuresMouth} onChange={(event) => updateDraft("obscuresMouth", event.currentTarget.value as FacialHairEntryDraft["obscuresMouth"])}>
              {["unknown", "yes", "no"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <TextField label="Coverage notes" value={draft.coverageNotes} onChange={(event) => updateDraft("coverageNotes", event.currentTarget.value)} />
          </div>
        </Card>
      </div>
      <div className="card-grid">
        <Card>
          <h3>Required view evidence</h3>
          <div className="form-stack">
            {PHASE0_REQUIRED_FACIAL_HAIR_CAPTURE_VIEW_IDS.map((viewID) => (
              <div className="card-grid" key={viewID}>
                <TextField label={`${viewLabels[viewID]} evidence ID`} value={draft.viewEvidenceIDs[viewID]} onChange={(event) => updateViewEvidence(viewID, event.currentTarget.value)} />
                <TextField label={`${viewLabels[viewID]} source timestamp`} value={draft.viewTimestamps[viewID]} onChange={(event) => updateViewTimestamp(viewID, event.currentTarget.value)} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3>Observation evidence</h3>
          <div className="form-stack">
            {PHASE0_REQUIRED_FACIAL_HAIR_OBSERVATION_KINDS.map((kind) => (
              <div className="card-grid" key={kind}>
                <TextField label={`${observationLabels[kind]} observed state`} value={draft.observations[kind]} onChange={(event) => updateObservation(kind, event.currentTarget.value)} />
                <TextField label={`${observationLabels[kind]} evidence IDs`} value={draft.observationEvidenceIDs[kind]} onChange={(event) => updateObservationEvidence(kind, event.currentTarget.value)} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3>Dependency evidence</h3>
          <div className="form-stack">
            {PHASE0_REQUIRED_FACIAL_HAIR_DEPENDENCY_KINDS.map((kind) => (
              <div className="card-grid" key={kind}>
                <TextField label={`${dependencyLabels[kind]} observed value`} value={draft.dependencies[kind]} onChange={(event) => updateDependency(kind, event.currentTarget.value)} />
                <TextField label={`${dependencyLabels[kind]} evidence IDs`} value={draft.dependencyEvidenceIDs[kind]} onChange={(event) => updateDependencyEvidence(kind, event.currentTarget.value)} />
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="card-grid">
        <Card>
          <h3>Recapture and review</h3>
          <div className="form-stack">
            <SelectField label="Open recapture view" value={draft.openRecaptureView} onChange={(event) => updateDraft("openRecaptureView", event.currentTarget.value as FacialHairEntryDraft["openRecaptureView"])}>
              {["none", ...PHASE0_REQUIRED_FACIAL_HAIR_CAPTURE_VIEW_IDS].map((value) => <option key={value} value={value}>{value === "none" ? "None" : viewLabels[value as Phase0FacialHairCaptureViewID]}</option>)}
            </SelectField>
            <TextField label="Recapture reason" value={draft.recaptureReason} onChange={(event) => updateDraft("recaptureReason", event.currentTarget.value)} />
            <SelectField label="Capture completion status" value={draft.captureCompletionStatus} onChange={(event) => updateDraft("captureCompletionStatus", event.currentTarget.value as Phase0FacialHairCaptureCompletionStatus)}>
              {["notStarted", "inProgress", "complete", "blocked"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Verification status" value={draft.verificationStatus} onChange={(event) => updateDraft("verificationStatus", event.currentTarget.value as Phase0VerificationState)}>
              {["draft", "firstReviewPending", "firstReviewApproved", "secondReviewPending", "verified", "rejected", "retired"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Catalog-manager disposition" value={draft.catalogManagerDisposition} onChange={(event) => updateDraft("catalogManagerDisposition", event.currentTarget.value as Phase0CatalogManagerDisposition)}>
              {["notReady", "readyForReview", "accepted", "rejected", "deferred"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <TextField label="Notes" value={draft.notes} onChange={(event) => updateDraft("notes", event.currentTarget.value)} />
            <Button onClick={addEntry}>Add facial-hair entry</Button>
          </div>
        </Card>
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
          <h3>Captured facial-hair entries</h3>
          {workspace.entries.length === 0 ? <p className="supporting">No facial-hair entries recorded yet.</p> : null}
          <ul className="compact-list">
            {workspace.entries.map((entry) => (
              <li key={entry.entryID}>
                <strong>{entry.stableInternalID}</strong> order {entry.nativeOrder}; none: {entry.isNoneOption ? "yes" : "no"}; missing views: {getMissingFacialHairViews(entry).join(", ") || "none"};
                recapture needs: {detectFacialHairRecaptureNeeds(entry).length}.
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

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function triStateBoolean(value: "unknown" | "yes" | "no") {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}
