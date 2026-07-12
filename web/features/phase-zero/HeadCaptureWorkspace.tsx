"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, SelectField, StatusBadge, TextField } from "@/components/design-system";
import {
  addHeadCaptureEntry,
  addHeadDoubleCountRun,
  assignHeadStableID,
  createEmptyHeadCaptureWorkspace,
  createHeadCaptureEntry,
  createHeadEvidenceReference,
  getMissingHeadViews,
  PHASE0_REQUIRED_HEAD_CAPTURE_VIEW_IDS,
  validateHeadCaptureWorkspace,
  type Phase0CatalogManagerDisposition,
  type Phase0HeadCaptureCompletionStatus,
  type Phase0HeadCaptureEntry,
  type Phase0HeadCaptureViewID,
  type Phase0HeadDuplicateObservationKind,
  type Phase0HeadLockStatus,
  type Phase0HeadSelectorWrapBehavior
} from "@/lib/phase-zero/phase-zero-head-capture-workspace";
import type { Phase0VerificationState } from "@/lib/phase-zero/phase-zero-domain";

interface HeadEntryDraft {
  platformCode: string;
  modeCode: string;
  nativeOrder: string;
  visibleGameLabelOrIndex: string;
  selectorWrapBehavior: Phase0HeadSelectorWrapBehavior;
  lockStatus: Phase0HeadLockStatus;
  entitlementDependency: string;
  forcedAttributes: string;
  canonicalSettingsConfirmed: boolean;
  canonicalSettingsHash: string;
  fullScreenMenuEvidenceIDs: string;
  sourceVideoID: string;
  viewEvidenceIDs: Record<Phase0HeadCaptureViewID, string>;
  viewTimestamps: Record<Phase0HeadCaptureViewID, string>;
  duplicateKind: Phase0HeadDuplicateObservationKind;
  duplicateStableID: string;
  duplicateEvidenceIDs: string;
  duplicateNotes: string;
  captureCompletionStatus: Phase0HeadCaptureCompletionStatus;
  verificationStatus: Phase0VerificationState;
  catalogManagerDisposition: Phase0CatalogManagerDisposition;
  notes: string;
}

const viewLabels: Record<Phase0HeadCaptureViewID, string> = {
  front: "Front",
  leftThreeQuarter: "Left three-quarter",
  leftProfile: "Left profile",
  rightThreeQuarter: "Right three-quarter",
  rightProfile: "Right profile",
  elevated: "Elevated",
  lowered: "Lowered"
};

const initialViewValues = PHASE0_REQUIRED_HEAD_CAPTURE_VIEW_IDS.reduce((values, viewID) => {
  values[viewID] = "";
  return values;
}, {} as Record<Phase0HeadCaptureViewID, string>);

const initialDraft: HeadEntryDraft = {
  platformCode: "SYNTHETIC",
  modeCode: "SYNTHETICMODE",
  nativeOrder: "1",
  visibleGameLabelOrIndex: "",
  selectorWrapBehavior: "unknown",
  lockStatus: "unknown",
  entitlementDependency: "",
  forcedAttributes: "",
  canonicalSettingsConfirmed: false,
  canonicalSettingsHash: "",
  fullScreenMenuEvidenceIDs: "",
  sourceVideoID: "",
  viewEvidenceIDs: initialViewValues,
  viewTimestamps: initialViewValues,
  duplicateKind: "nearDuplicate",
  duplicateStableID: "",
  duplicateEvidenceIDs: "",
  duplicateNotes: "",
  captureCompletionStatus: "notStarted",
  verificationStatus: "draft",
  catalogManagerDisposition: "notReady",
  notes: "Research draft awaiting direct evidence."
};

export function HeadCaptureWorkspace() {
  const [workspace, setWorkspace] = useState(() =>
    createEmptyHeadCaptureWorkspace({
      workspaceID: "cf27-head-capture-workspace-draft",
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
  const [draft, setDraft] = useState<HeadEntryDraft>(initialDraft);
  const [countOne, setCountOne] = useState("");
  const [countTwo, setCountTwo] = useState("");
  const validation = useMemo(() => validateHeadCaptureWorkspace(workspace), [workspace]);
  const assignedStableID = assignHeadStableID(draft.platformCode, draft.modeCode, Number.parseInt(draft.nativeOrder, 10));

  function updateDraft<Key extends keyof HeadEntryDraft>(key: Key, value: HeadEntryDraft[Key]) {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
  }

  function updateViewEvidence(viewID: Phase0HeadCaptureViewID, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      viewEvidenceIDs: { ...currentDraft.viewEvidenceIDs, [viewID]: value }
    }));
  }

  function updateViewTimestamp(viewID: Phase0HeadCaptureViewID, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      viewTimestamps: { ...currentDraft.viewTimestamps, [viewID]: value }
    }));
  }

  function recordDoubleCountRuns() {
    const nowISO = new Date().toISOString();
    const firstCount = parseOptionalInteger(countOne);
    const secondCount = parseOptionalInteger(countTwo);
    setWorkspace((currentWorkspace) => {
      const withFirst = addHeadDoubleCountRun(currentWorkspace, {
        runID: "head-double-count-run-1",
        runNumber: 1,
        observedCount: firstCount,
        startedAt: nowISO,
        completedAt: firstCount === null ? null : nowISO,
        sourceVideoEvidenceID: null,
        notes: "First operator count run."
      }, nowISO);
      return addHeadDoubleCountRun(withFirst, {
        runID: "head-double-count-run-2",
        runNumber: 2,
        observedCount: secondCount,
        startedAt: nowISO,
        completedAt: secondCount === null ? null : nowISO,
        sourceVideoEvidenceID: null,
        notes: "Second operator count run."
      }, nowISO);
    });
  }

  function addEntry() {
    const nowISO = new Date().toISOString();
    const nativeOrder = Number.parseInt(draft.nativeOrder, 10);
    const entry = createHeadCaptureEntry({
      platformCode: draft.platformCode,
      modeCode: draft.modeCode,
      nativeOrder,
      visibleGameLabelOrIndex: draft.visibleGameLabelOrIndex,
      nowISO
    });
    const nextEntry: Phase0HeadCaptureEntry = {
      ...entry,
      selectorWrapBehavior: draft.selectorWrapBehavior,
      lockStatus: draft.lockStatus,
      entitlementDependency: draft.entitlementDependency.trim() || null,
      forcedAttributes: splitList(draft.forcedAttributes),
      canonicalSettingsConfirmed: draft.canonicalSettingsConfirmed,
      canonicalSettingsHash: draft.canonicalSettingsHash.trim() || null,
      fullScreenMenuEvidenceIDs: splitList(draft.fullScreenMenuEvidenceIDs),
      viewEvidence: PHASE0_REQUIRED_HEAD_CAPTURE_VIEW_IDS.flatMap((viewID) => {
        const evidenceFileID = draft.viewEvidenceIDs[viewID].trim();
        if (!evidenceFileID) return [];
        return createHeadEvidenceReference({
          evidenceFileID,
          viewID,
          sourceVideoID: draft.sourceVideoID,
          sourceVideoTimestamp: draft.viewTimestamps[viewID] || null,
          notes: `${viewLabels[viewID]} capture evidence.`
        });
      }),
      duplicateObservations: draft.duplicateStableID.trim()
        ? [{
            observationID: `${entry.entryID}-duplicate-1`,
            kind: draft.duplicateKind,
            comparedStableID: draft.duplicateStableID.trim(),
            evidenceFileIDs: splitList(draft.duplicateEvidenceIDs),
            notes: draft.duplicateNotes.trim()
          }]
        : [],
      captureCompletionStatus: draft.captureCompletionStatus,
      verificationStatus: draft.verificationStatus,
      catalogManagerDisposition: draft.catalogManagerDisposition,
      notes: draft.notes.trim()
    };
    setWorkspace((currentWorkspace) => ({
      ...addHeadCaptureEntry(currentWorkspace, nextEntry, nowISO),
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
    <section className="screen-stack" aria-labelledby="head-capture-workspace-title">
      <div className="status-row">
        <div>
          <p className="eyebrow">Internal audit tool</p>
          <h2 id="head-capture-workspace-title">Head-catalog capture workspace</h2>
        </div>
        <StatusBadge tone={validation.productionCompletionAllowed ? "success" : "danger"}>
          {validation.productionCompletionAllowed ? "production complete" : "production blocked"}
        </StatusBadge>
      </div>
      <p className="supporting">
        Record head catalog capture evidence from direct game observation. This workspace assigns stable IDs from native order but does not create
        production records or infer missing options.
      </p>
      <Alert title="Verified evidence required" tone="warning" role="alert">
        Production completion remains blocked until double-count runs, full-screen menu evidence, all required views, canonical settings confirmation,
        and verification status are complete.
      </Alert>
      <div className="card-grid">
        <Card>
          <h3>Double-count runs</h3>
          <div className="form-stack">
            <TextField label="First observed count" inputMode="numeric" value={countOne} onChange={(event) => setCountOne(event.currentTarget.value)} />
            <TextField label="Second observed count" inputMode="numeric" value={countTwo} onChange={(event) => setCountTwo(event.currentTarget.value)} />
            <Button onClick={recordDoubleCountRuns}>Record double-count runs</Button>
          </div>
        </Card>
        <Card>
          <h3>Stable ID and selector state</h3>
          <div className="form-stack">
            <TextField label="Platform code" value={draft.platformCode} onChange={(event) => updateDraft("platformCode", event.currentTarget.value)} />
            <TextField label="Mode code" value={draft.modeCode} onChange={(event) => updateDraft("modeCode", event.currentTarget.value)} />
            <TextField label="Native order" inputMode="numeric" value={draft.nativeOrder} onChange={(event) => updateDraft("nativeOrder", event.currentTarget.value)} />
            <TextField label="Visible game label or index" value={draft.visibleGameLabelOrIndex} onChange={(event) => updateDraft("visibleGameLabelOrIndex", event.currentTarget.value)} />
            <p className="supporting">Assigned stable ID: {assignedStableID}</p>
            <SelectField label="Selector wrap behavior" value={draft.selectorWrapBehavior} onChange={(event) => updateDraft("selectorWrapBehavior", event.currentTarget.value as Phase0HeadSelectorWrapBehavior)}>
              {["wraps", "clamps", "unknown"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Locked or entitlement status" value={draft.lockStatus} onChange={(event) => updateDraft("lockStatus", event.currentTarget.value as Phase0HeadLockStatus)}>
              {["unlocked", "locked", "entitlementDependent", "unknown"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <TextField label="Entitlement dependency" value={draft.entitlementDependency} onChange={(event) => updateDraft("entitlementDependency", event.currentTarget.value)} />
            <TextField label="Forced attributes" value={draft.forcedAttributes} onChange={(event) => updateDraft("forcedAttributes", event.currentTarget.value)} note="Comma-separated observed forced attributes." />
          </div>
        </Card>
        <Card>
          <h3>Canonical settings and menu evidence</h3>
          <div className="form-stack">
            <label className="form-field">
              <span>Canonical settings confirmed</span>
              <input type="checkbox" checked={draft.canonicalSettingsConfirmed} onChange={(event) => updateDraft("canonicalSettingsConfirmed", event.currentTarget.checked)} />
            </label>
            <TextField label="Canonical settings hash" value={draft.canonicalSettingsHash} onChange={(event) => updateDraft("canonicalSettingsHash", event.currentTarget.value)} />
            <TextField label="Full-screen menu evidence IDs" value={draft.fullScreenMenuEvidenceIDs} onChange={(event) => updateDraft("fullScreenMenuEvidenceIDs", event.currentTarget.value)} note="Comma-separated evidence IDs." />
            <TextField label="Source video ID" value={draft.sourceVideoID} onChange={(event) => updateDraft("sourceVideoID", event.currentTarget.value)} />
          </div>
        </Card>
        <Card>
          <h3>Completion and review</h3>
          <div className="form-stack">
            <SelectField label="Capture completion status" value={draft.captureCompletionStatus} onChange={(event) => updateDraft("captureCompletionStatus", event.currentTarget.value as Phase0HeadCaptureCompletionStatus)}>
              {["notStarted", "inProgress", "complete", "blocked"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Verification status" value={draft.verificationStatus} onChange={(event) => updateDraft("verificationStatus", event.currentTarget.value as Phase0VerificationState)}>
              {["draft", "firstReviewPending", "firstReviewApproved", "secondReviewPending", "verified", "rejected", "retired"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Catalog-manager disposition" value={draft.catalogManagerDisposition} onChange={(event) => updateDraft("catalogManagerDisposition", event.currentTarget.value as Phase0CatalogManagerDisposition)}>
              {["notReady", "readyForReview", "accepted", "rejected", "deferred"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <TextField label="Notes" value={draft.notes} onChange={(event) => updateDraft("notes", event.currentTarget.value)} />
            <Button onClick={addEntry}>Add head capture entry</Button>
          </div>
        </Card>
      </div>
      <div className="card-grid">
        <Card>
          <h3>Required view evidence</h3>
          <div className="form-stack">
            {PHASE0_REQUIRED_HEAD_CAPTURE_VIEW_IDS.map((viewID) => (
              <div className="card-grid" key={viewID}>
                <TextField label={`${viewLabels[viewID]} evidence ID`} value={draft.viewEvidenceIDs[viewID]} onChange={(event) => updateViewEvidence(viewID, event.currentTarget.value)} />
                <TextField label={`${viewLabels[viewID]} source timestamp`} value={draft.viewTimestamps[viewID]} onChange={(event) => updateViewTimestamp(viewID, event.currentTarget.value)} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3>Duplicate observations</h3>
          <div className="form-stack">
            <SelectField label="Observation kind" value={draft.duplicateKind} onChange={(event) => updateDraft("duplicateKind", event.currentTarget.value as Phase0HeadDuplicateObservationKind)}>
              {["duplicate", "nearDuplicate"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <TextField label="Compared stable ID" value={draft.duplicateStableID} onChange={(event) => updateDraft("duplicateStableID", event.currentTarget.value)} />
            <TextField label="Duplicate evidence IDs" value={draft.duplicateEvidenceIDs} onChange={(event) => updateDraft("duplicateEvidenceIDs", event.currentTarget.value)} />
            <TextField label="Duplicate notes" value={draft.duplicateNotes} onChange={(event) => updateDraft("duplicateNotes", event.currentTarget.value)} />
          </div>
        </Card>
      </div>
      <div className="card-grid">
        <Card>
          <h3>Production completion gate</h3>
          {validation.errors.length === 0 ? <p className="supporting">No blocking errors.</p> : null}
          <ul className="compact-list">
            {validation.errors.slice(0, 8).map((error) => <li key={`${error.code}-${error.entryID ?? error.message}`}>{error.message}</li>)}
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
          <h3>Captured entries</h3>
          {workspace.entries.length === 0 ? <p className="supporting">No head entries recorded yet.</p> : null}
          <ul className="compact-list">
            {workspace.entries.map((entry) => (
              <li key={entry.entryID}>
                <strong>{entry.stableInternalID}</strong> order {entry.nativeOrder}; missing views: {getMissingHeadViews(entry).join(", ") || "none"}.
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
