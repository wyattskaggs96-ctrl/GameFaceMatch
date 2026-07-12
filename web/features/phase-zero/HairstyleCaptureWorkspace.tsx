"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, SelectField, StatusBadge, TextField } from "@/components/design-system";
import {
  addHairstyleCaptureEntry,
  addHairstyleDoubleCountRun,
  assignHairstyleStableID,
  createEmptyHairstyleCaptureWorkspace,
  createHairstyleCaptureEntry,
  createHairstyleEvidenceReference,
  detectHairstyleRecaptureNeeds,
  getMissingHairstyleViews,
  PHASE0_REQUIRED_HAIRSTYLE_CAPTURE_VIEW_IDS,
  PHASE0_REQUIRED_HAIRSTYLE_DEPENDENCY_KINDS,
  validateHairstyleCaptureWorkspace,
  type Phase0HairstyleCaptureCompletionStatus,
  type Phase0HairstyleCaptureEntry,
  type Phase0HairstyleCaptureViewID,
  type Phase0HairstyleDependencyKind,
  type Phase0ResearcherHairLength,
  type Phase0ResearcherHairTexture
} from "@/lib/phase-zero/phase-zero-hairstyle-capture-workspace";
import type { Phase0VerificationState } from "@/lib/phase-zero/phase-zero-domain";
import type { Phase0CatalogManagerDisposition } from "@/lib/phase-zero/phase-zero-head-capture-workspace";

interface HairstyleEntryDraft {
  platformCode: string;
  modeCode: string;
  nativeOrder: string;
  nativeCategoryLabel: string;
  visibleGameLabelOrIndex: string;
  canonicalHeadStableID: string;
  canonicalHeadConfirmed: boolean;
  canonicalHairColor: string;
  fullScreenMenuEvidenceIDs: string;
  sourceVideoID: string;
  viewEvidenceIDs: Record<Phase0HairstyleCaptureViewID, string>;
  viewTimestamps: Record<Phase0HairstyleCaptureViewID, string>;
  dependencies: Record<Phase0HairstyleDependencyKind, string>;
  dependencyEvidenceIDs: Record<Phase0HairstyleDependencyKind, string>;
  hairLength: Phase0ResearcherHairLength;
  hairTexture: Phase0ResearcherHairTexture;
  obscuresForehead: "unknown" | "yes" | "no";
  obscuresEars: "unknown" | "yes" | "no";
  silhouetteNotes: string;
  visualNotes: string;
  openRecaptureView: Phase0HairstyleCaptureViewID | "none";
  recaptureReason: string;
  captureCompletionStatus: Phase0HairstyleCaptureCompletionStatus;
  verificationStatus: Phase0VerificationState;
  catalogManagerDisposition: Phase0CatalogManagerDisposition;
  notes: string;
}

const viewLabels: Record<Phase0HairstyleCaptureViewID, string> = {
  front: "Front",
  leftThreeQuarter: "Left three-quarter",
  leftProfile: "Left profile",
  rear: "Rear",
  rightProfile: "Right profile",
  rightThreeQuarter: "Right three-quarter"
};

const dependencyLabels: Record<Phase0HairstyleDependencyKind, string> = {
  head: "Head",
  mode: "Mode",
  body: "Body",
  position: "Position",
  archetype: "Archetype",
  account: "Account",
  platform: "Platform",
  skinTone: "Skin tone",
  unlock: "Unlock"
};

const emptyViewValues = PHASE0_REQUIRED_HAIRSTYLE_CAPTURE_VIEW_IDS.reduce((values, viewID) => {
  values[viewID] = "";
  return values;
}, {} as Record<Phase0HairstyleCaptureViewID, string>);

const emptyDependencyValues = PHASE0_REQUIRED_HAIRSTYLE_DEPENDENCY_KINDS.reduce((values, kind) => {
  values[kind] = "";
  return values;
}, {} as Record<Phase0HairstyleDependencyKind, string>);

const initialDraft: HairstyleEntryDraft = {
  platformCode: "SYNTHETIC",
  modeCode: "SYNTHETICMODE",
  nativeOrder: "1",
  nativeCategoryLabel: "",
  visibleGameLabelOrIndex: "",
  canonicalHeadStableID: "",
  canonicalHeadConfirmed: false,
  canonicalHairColor: "",
  fullScreenMenuEvidenceIDs: "",
  sourceVideoID: "",
  viewEvidenceIDs: emptyViewValues,
  viewTimestamps: emptyViewValues,
  dependencies: emptyDependencyValues,
  dependencyEvidenceIDs: emptyDependencyValues,
  hairLength: "unknown",
  hairTexture: "unknown",
  obscuresForehead: "unknown",
  obscuresEars: "unknown",
  silhouetteNotes: "",
  visualNotes: "",
  openRecaptureView: "none",
  recaptureReason: "",
  captureCompletionStatus: "notStarted",
  verificationStatus: "draft",
  catalogManagerDisposition: "notReady",
  notes: "Research draft awaiting direct evidence."
};

export function HairstyleCaptureWorkspace() {
  const [workspace, setWorkspace] = useState(() =>
    createEmptyHairstyleCaptureWorkspace({
      workspaceID: "cf27-hairstyle-capture-workspace-draft",
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
  const [draft, setDraft] = useState<HairstyleEntryDraft>(initialDraft);
  const [countOne, setCountOne] = useState("");
  const [countTwo, setCountTwo] = useState("");
  const validation = useMemo(() => validateHairstyleCaptureWorkspace(workspace), [workspace]);
  const assignedStableID = assignHairstyleStableID(draft.platformCode, draft.modeCode, Number.parseInt(draft.nativeOrder, 10));

  function updateDraft<Key extends keyof HairstyleEntryDraft>(key: Key, value: HairstyleEntryDraft[Key]) {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
  }

  function updateViewEvidence(viewID: Phase0HairstyleCaptureViewID, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      viewEvidenceIDs: { ...currentDraft.viewEvidenceIDs, [viewID]: value }
    }));
  }

  function updateViewTimestamp(viewID: Phase0HairstyleCaptureViewID, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      viewTimestamps: { ...currentDraft.viewTimestamps, [viewID]: value }
    }));
  }

  function updateDependency(kind: Phase0HairstyleDependencyKind, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      dependencies: { ...currentDraft.dependencies, [kind]: value }
    }));
  }

  function updateDependencyEvidence(kind: Phase0HairstyleDependencyKind, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      dependencyEvidenceIDs: { ...currentDraft.dependencyEvidenceIDs, [kind]: value }
    }));
  }

  function recordDoubleCountRuns() {
    const nowISO = new Date().toISOString();
    const firstCount = parseOptionalInteger(countOne);
    const secondCount = parseOptionalInteger(countTwo);
    setWorkspace((currentWorkspace) => {
      const withFirst = addHairstyleDoubleCountRun(currentWorkspace, {
        runID: "hairstyle-double-count-run-1",
        runNumber: 1,
        observedCount: firstCount,
        startedAt: nowISO,
        completedAt: firstCount === null ? null : nowISO,
        sourceVideoEvidenceID: null,
        notes: "First operator hairstyle count run."
      }, nowISO);
      return addHairstyleDoubleCountRun(withFirst, {
        runID: "hairstyle-double-count-run-2",
        runNumber: 2,
        observedCount: secondCount,
        startedAt: nowISO,
        completedAt: secondCount === null ? null : nowISO,
        sourceVideoEvidenceID: null,
        notes: "Second operator hairstyle count run."
      }, nowISO);
    });
  }

  function addEntry() {
    const nowISO = new Date().toISOString();
    const nativeOrder = Number.parseInt(draft.nativeOrder, 10);
    const entry = createHairstyleCaptureEntry({
      platformCode: draft.platformCode,
      modeCode: draft.modeCode,
      nativeOrder,
      nativeCategoryLabel: draft.nativeCategoryLabel,
      visibleGameLabelOrIndex: draft.visibleGameLabelOrIndex,
      nowISO
    });
    const nextEntry: Phase0HairstyleCaptureEntry = {
      ...entry,
      canonicalHeadStableID: draft.canonicalHeadStableID.trim(),
      canonicalHeadConfirmed: draft.canonicalHeadConfirmed,
      canonicalHairColor: draft.canonicalHairColor.trim(),
      fullScreenMenuEvidenceIDs: splitList(draft.fullScreenMenuEvidenceIDs),
      viewEvidence: PHASE0_REQUIRED_HAIRSTYLE_CAPTURE_VIEW_IDS.flatMap((viewID) => {
        const evidenceFileID = draft.viewEvidenceIDs[viewID].trim();
        if (!evidenceFileID) return [];
        return createHairstyleEvidenceReference({
          evidenceFileID,
          viewID,
          sourceVideoID: draft.sourceVideoID,
          sourceVideoTimestamp: draft.viewTimestamps[viewID] || null,
          notes: `${viewLabels[viewID]} hairstyle capture evidence.`
        });
      }),
      dependencies: PHASE0_REQUIRED_HAIRSTYLE_DEPENDENCY_KINDS.flatMap((kind) => {
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
      researcherVisualMetadata: {
        metadataID: `${entry.entryID}-visual-metadata`,
        standardizedHairLength: draft.hairLength,
        standardizedHairTexture: draft.hairTexture,
        obscuresForehead: triStateBoolean(draft.obscuresForehead),
        obscuresEars: triStateBoolean(draft.obscuresEars),
        silhouetteNotes: draft.silhouetteNotes.trim(),
        visualNotes: draft.visualNotes.trim()
      },
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
      ...addHairstyleCaptureEntry(currentWorkspace, nextEntry, nowISO),
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
    <section className="screen-stack" aria-labelledby="hairstyle-capture-workspace-title">
      <div className="status-row">
        <div>
          <p className="eyebrow">Internal audit tool</p>
          <h2 id="hairstyle-capture-workspace-title">Hairstyle catalog workspace</h2>
        </div>
        <StatusBadge tone={validation.productionCompletionAllowed ? "success" : "danger"}>
          {validation.productionCompletionAllowed ? "production complete" : "production blocked"}
        </StatusBadge>
      </div>
      <p className="supporting">
        Record hairstyle catalog evidence from direct game observation. Researcher-applied visual metadata is stored separately from native labels and
        cannot create production options by itself.
      </p>
      <Alert title="No invented hairstyle records" tone="warning" role="alert">
        Production completion remains blocked until double counts, canonical head and hair color, dependency evidence, full-screen menu evidence, all
        required views, and recapture requests are resolved.
      </Alert>
      <div className="card-grid">
        <Card>
          <h3>Double counts</h3>
          <div className="form-stack">
            <TextField label="First observed count" inputMode="numeric" value={countOne} onChange={(event) => setCountOne(event.currentTarget.value)} />
            <TextField label="Second observed count" inputMode="numeric" value={countTwo} onChange={(event) => setCountTwo(event.currentTarget.value)} />
            <Button onClick={recordDoubleCountRuns}>Record hairstyle counts</Button>
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
            <TextField label="Canonical hair color" value={draft.canonicalHairColor} onChange={(event) => updateDraft("canonicalHairColor", event.currentTarget.value)} />
            <TextField label="Full-screen menu evidence IDs" value={draft.fullScreenMenuEvidenceIDs} onChange={(event) => updateDraft("fullScreenMenuEvidenceIDs", event.currentTarget.value)} note="Comma-separated evidence IDs." />
            <TextField label="Source video ID" value={draft.sourceVideoID} onChange={(event) => updateDraft("sourceVideoID", event.currentTarget.value)} />
          </div>
        </Card>
        <Card>
          <h3>Researcher visual metadata</h3>
          <div className="form-stack">
            <SelectField label="Hair length" value={draft.hairLength} onChange={(event) => updateDraft("hairLength", event.currentTarget.value as Phase0ResearcherHairLength)}>
              {["unknown", "short", "medium", "long"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Hair texture" value={draft.hairTexture} onChange={(event) => updateDraft("hairTexture", event.currentTarget.value as Phase0ResearcherHairTexture)}>
              {["unknown", "straight", "wavy", "curly", "coiled", "shaved", "covered"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Obscures forehead" value={draft.obscuresForehead} onChange={(event) => updateDraft("obscuresForehead", event.currentTarget.value as HairstyleEntryDraft["obscuresForehead"])}>
              {["unknown", "yes", "no"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Obscures ears" value={draft.obscuresEars} onChange={(event) => updateDraft("obscuresEars", event.currentTarget.value as HairstyleEntryDraft["obscuresEars"])}>
              {["unknown", "yes", "no"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <TextField label="Silhouette notes" value={draft.silhouetteNotes} onChange={(event) => updateDraft("silhouetteNotes", event.currentTarget.value)} />
            <TextField label="Visual notes" value={draft.visualNotes} onChange={(event) => updateDraft("visualNotes", event.currentTarget.value)} />
          </div>
        </Card>
      </div>
      <div className="card-grid">
        <Card>
          <h3>Required view evidence</h3>
          <div className="form-stack">
            {PHASE0_REQUIRED_HAIRSTYLE_CAPTURE_VIEW_IDS.map((viewID) => (
              <div className="card-grid" key={viewID}>
                <TextField label={`${viewLabels[viewID]} evidence ID`} value={draft.viewEvidenceIDs[viewID]} onChange={(event) => updateViewEvidence(viewID, event.currentTarget.value)} />
                <TextField label={`${viewLabels[viewID]} source timestamp`} value={draft.viewTimestamps[viewID]} onChange={(event) => updateViewTimestamp(viewID, event.currentTarget.value)} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3>Dependency evidence</h3>
          <div className="form-stack">
            {PHASE0_REQUIRED_HAIRSTYLE_DEPENDENCY_KINDS.map((kind) => (
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
            <SelectField label="Open recapture view" value={draft.openRecaptureView} onChange={(event) => updateDraft("openRecaptureView", event.currentTarget.value as HairstyleEntryDraft["openRecaptureView"])}>
              {["none", ...PHASE0_REQUIRED_HAIRSTYLE_CAPTURE_VIEW_IDS].map((value) => <option key={value} value={value}>{value === "none" ? "None" : viewLabels[value as Phase0HairstyleCaptureViewID]}</option>)}
            </SelectField>
            <TextField label="Recapture reason" value={draft.recaptureReason} onChange={(event) => updateDraft("recaptureReason", event.currentTarget.value)} />
            <SelectField label="Capture completion status" value={draft.captureCompletionStatus} onChange={(event) => updateDraft("captureCompletionStatus", event.currentTarget.value as Phase0HairstyleCaptureCompletionStatus)}>
              {["notStarted", "inProgress", "complete", "blocked"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Verification status" value={draft.verificationStatus} onChange={(event) => updateDraft("verificationStatus", event.currentTarget.value as Phase0VerificationState)}>
              {["draft", "firstReviewPending", "firstReviewApproved", "secondReviewPending", "verified", "rejected", "retired"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Catalog-manager disposition" value={draft.catalogManagerDisposition} onChange={(event) => updateDraft("catalogManagerDisposition", event.currentTarget.value as Phase0CatalogManagerDisposition)}>
              {["notReady", "readyForReview", "accepted", "rejected", "deferred"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <TextField label="Notes" value={draft.notes} onChange={(event) => updateDraft("notes", event.currentTarget.value)} />
            <Button onClick={addEntry}>Add hairstyle entry</Button>
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
          <h3>Captured hairstyle entries</h3>
          {workspace.entries.length === 0 ? <p className="supporting">No hairstyle entries recorded yet.</p> : null}
          <ul className="compact-list">
            {workspace.entries.map((entry) => (
              <li key={entry.entryID}>
                <strong>{entry.stableInternalID}</strong> order {entry.nativeOrder}; missing views: {getMissingHairstyleViews(entry).join(", ") || "none"};
                recapture needs: {detectHairstyleRecaptureNeeds(entry).length}.
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
