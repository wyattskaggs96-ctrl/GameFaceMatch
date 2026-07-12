"use client";

import { useMemo, useRef, useState, type ChangeEvent, type DragEvent, type InputHTMLAttributes } from "react";
import { Alert, Button, Card, SelectField, StatusBadge, TextField } from "@/components/design-system";
import {
  addEvidenceFilesToBatch,
  createEmptyEvidenceIntakeBatch,
  createEvidenceIntakeLocalStore,
  finalizeEvidenceIntakeBatch,
  removeEvidenceIntakeItem,
  updateEvidenceIntakeMetadata,
  validateEvidenceIntakeBatch,
  type Phase0EvidenceClassification,
  type Phase0EvidenceIntakeBatch
} from "@/lib/phase-zero/phase-zero-evidence-intake";
import {
  createEvidenceRenamePlans,
  extensionFromFilename,
  type Phase0EvidenceRenamePlan
} from "@/lib/phase-zero/phase-zero-evidence-naming";
import type { Phase0EvidenceDerivativeState, Phase0EvidenceFileRole, Phase0EvidenceView } from "@/lib/phase-zero/phase-zero-evidence";

type DirectoryInputProps = InputHTMLAttributes<HTMLInputElement> & {
  webkitdirectory?: string;
  directory?: string;
};

const classifications: Array<Phase0EvidenceClassification | ""> = ["", "environment", "catalogItem", "menuNavigation", "standardAngle", "review", "other"];
const derivativeStates: Array<Phase0EvidenceDerivativeState | ""> = ["", "master", "derivative"];
const fileRoles: Array<Phase0EvidenceFileRole | ""> = ["", "standardAngle", "navigationEvidence", "menuState", "environment", "review", "checksumManifest", "notes", "other"];
const views: Array<Phase0EvidenceView | ""> = ["", "straightOn", "left45", "right45", "leftProfile", "rightProfile", "navigationEvidence", "menuOverview", "environment", "notApplicable"];

export function EvidenceIntakeManager() {
  const [batch, setBatch] = useState<Phase0EvidenceIntakeBatch>(() =>
    createEmptyEvidenceIntakeBatch({
      batchID: "phase-zero-local-evidence-intake",
      nowISO: new Date().toISOString()
    })
  );
  const [savedMetadataCount, setSavedMetadataCount] = useState(0);
  const [namingContext, setNamingContext] = useState({
    gameVersion: "",
    patch: "",
    date: new Date().toISOString().slice(0, 10).replaceAll("-", ""),
    targetDirectory: "data/audit/college-football-27/local-evidence"
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const report = useMemo(() => validateEvidenceIntakeBatch(batch), [batch]);
  const renamePlans = useMemo(() => {
    const activeItems = batch.items.filter((item) => item.status !== "removed");
    return createEvidenceRenamePlans(activeItems.map((item) => ({
      intakeID: item.intakeID,
      currentRelativePath: item.relativeSourcePath,
      targetDirectory: namingContext.targetDirectory,
      existingRelativePaths: activeItems.map((candidate) => candidate.relativeSourcePath),
      catalogID: item.metadata.catalogItemID ?? "",
      view: item.metadata.view,
      gameVersion: namingContext.gameVersion,
      patch: namingContext.patch,
      date: namingContext.date,
      extension: extensionFromFilename(item.originalFilename)
    })), new Date().toISOString());
  }, [batch.items, namingContext]);
  const renamePlanByIntakeID = useMemo(() => new Map(renamePlans.map((plan) => [plan.intakeID, plan])), [renamePlans]);

  function handleFiles(files: FileList | File[], source: "dragDrop" | "filePicker" | "folderPicker") {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setBatch((currentBatch) => addEvidenceFilesToBatch(currentBatch, fileArray, source, new Date().toISOString()));
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>, source: "filePicker" | "folderPicker") {
    if (event.currentTarget.files) handleFiles(event.currentTarget.files, source);
    event.currentTarget.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    handleFiles(event.dataTransfer.files, "dragDrop");
  }

  function finalizeBatch() {
    const finalized = finalizeEvidenceIntakeBatch(batch, new Date().toISOString());
    setBatch(finalized);
    if (typeof window !== "undefined") {
      const store = createEvidenceIntakeLocalStore(window.localStorage);
      store.save(finalized.finalizedRecords);
      setSavedMetadataCount(store.load().length);
    }
  }

  return (
    <section className="screen-stack" aria-labelledby="evidence-intake-title">
      <div className="status-row">
        <div>
          <p className="eyebrow">Internal audit tool</p>
          <h2 id="evidence-intake-title">Evidence intake manager</h2>
        </div>
        <StatusBadge tone={report.ok ? "success" : "warning"}>
          {report.ok ? "ready" : "metadata needed"}
        </StatusBadge>
      </div>
      <p className="supporting">
        Add local audit evidence, classify it, associate it to environment or catalog records, and finalize metadata without modifying originals or
        uploading files.
      </p>
      <div
        className="card card-info"
        role="button"
        tabIndex={0}
        aria-label="Drop evidence files here"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <h3>Drop evidence files</h3>
        <p className="supporting">Drag screenshots, recordings, manifests, notes, or folders from local audit storage. Original file bytes stay local.</p>
        <div className="button-row">
          <Button onClick={() => fileInputRef.current?.click()}>Choose files</Button>
          <Button variant="secondary" onClick={() => folderInputRef.current?.click()}>Choose folder</Button>
        </div>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          multiple
          onChange={(event) => handleFileInput(event, "filePicker")}
        />
        <input
          ref={folderInputRef}
          className="visually-hidden"
          type="file"
          multiple
          onChange={(event) => handleFileInput(event, "folderPicker")}
          {...({ webkitdirectory: "", directory: "" } satisfies DirectoryInputProps)}
        />
      </div>
      <Alert title="Local-only storage" tone="info">
        Finalization stores metadata only in browser localStorage. It does not serialize, transform, compress, rename, or upload the selected files.
      </Alert>
      <Card>
        <div className="status-row">
          <div>
            <h3>Rename-plan preview</h3>
            <p className="supporting">
              Generated names follow the approved token order with safe separators: catalog ID, view, game version, patch, date, and extension. This
              tool previews names only and never renames master files.
            </p>
          </div>
          <StatusBadge tone={renamePlans.every((plan) => plan.status === "ready") && renamePlans.length > 0 ? "success" : "warning"}>
            preview only
          </StatusBadge>
        </div>
        <div className="card-grid">
          <TextField label="Game version token" value={namingContext.gameVersion} onChange={(event) => updateNamingContext("gameVersion", event.currentTarget.value)} />
          <TextField label="Patch token" value={namingContext.patch} onChange={(event) => updateNamingContext("patch", event.currentTarget.value)} />
          <TextField label="Capture date YYYYMMDD" value={namingContext.date} onChange={(event) => updateNamingContext("date", event.currentTarget.value)} />
          <TextField label="Target relative folder" value={namingContext.targetDirectory} onChange={(event) => updateNamingContext("targetDirectory", event.currentTarget.value)} />
        </div>
      </Card>
      <div className="card-grid">
        <Card>
          <h3>Intake totals</h3>
          <dl className="metadata-list">
            <div>
              <dt>Active files</dt>
              <dd>{batch.items.filter((item) => item.status !== "removed").length}</dd>
            </div>
            <div>
              <dt>Warnings</dt>
              <dd>{report.warnings.length}</dd>
            </div>
            <div>
              <dt>Blocking metadata errors</dt>
              <dd>{report.errors.length}</dd>
            </div>
            <div>
              <dt>Saved metadata records</dt>
              <dd>{savedMetadataCount}</dd>
            </div>
          </dl>
          <Button disabled={!report.ok} onClick={finalizeBatch}>Finalize metadata</Button>
        </Card>
        <Card tone={report.errors.length > 0 ? "warning" : "success"}>
          <h3>Validation</h3>
          {[...report.errors, ...report.warnings].length === 0 ? (
            <p className="supporting">No intake warnings detected.</p>
          ) : (
            <ul className="compact-list">
              {[...report.errors, ...report.warnings].slice(0, 8).map((warning) => (
                <li key={`${warning.intakeID}-${warning.code}`}>{warning.message}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <div className="result-grid">
        {batch.items.filter((item) => item.status !== "removed").map((item) => (
          <Card key={item.intakeID} tone={item.warnings.some((warning) => warning.severity === "error") || renamePlanByIntakeID.get(item.intakeID)?.status === "blocked" ? "warning" : "neutral"}>
            <div className="status-row">
              <h3>{item.originalFilename}</h3>
              <StatusBadge tone={item.status === "finalized" ? "success" : item.warnings.length > 0 ? "warning" : "info"}>{item.status}</StatusBadge>
            </div>
            <dl className="metadata-list">
              <div>
                <dt>Source path</dt>
                <dd>{item.relativeSourcePath}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{item.mimeType}</dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>{Math.round(item.sizeBytes / 1024)} KB</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{item.source}</dd>
              </div>
            </dl>
            <RenamePlanPreview plan={renamePlanByIntakeID.get(item.intakeID)} />
            <div className="form-stack">
              <SelectField label="Classification" value={item.metadata.classification} onChange={(event) => updateItem(item.intakeID, { classification: event.currentTarget.value as Phase0EvidenceClassification | "" })}>
                {classifications.map((value) => <option key={value || "blank"} value={value}>{value || "Select classification"}</option>)}
              </SelectField>
              <TextField label="Catalog item ID" value={item.metadata.catalogItemID ?? ""} onChange={(event) => updateItem(item.intakeID, { catalogItemID: event.currentTarget.value })} />
              <TextField label="Environment ID" value={item.metadata.environmentID ?? ""} onChange={(event) => updateItem(item.intakeID, { environmentID: event.currentTarget.value })} />
              <SelectField label="Master or derivative" value={item.metadata.derivativeState} onChange={(event) => updateItem(item.intakeID, { derivativeState: event.currentTarget.value as Phase0EvidenceDerivativeState | "" })}>
                {derivativeStates.map((value) => <option key={value || "blank"} value={value}>{value || "Select state"}</option>)}
              </SelectField>
              <SelectField label="File role" value={item.metadata.fileRole} onChange={(event) => updateItem(item.intakeID, { fileRole: event.currentTarget.value as Phase0EvidenceFileRole | "" })}>
                {fileRoles.map((value) => <option key={value || "blank"} value={value}>{value || "Select role"}</option>)}
              </SelectField>
              <SelectField label="View" value={item.metadata.view} onChange={(event) => updateItem(item.intakeID, { view: event.currentTarget.value as Phase0EvidenceView | "" })}>
                {views.map((value) => <option key={value || "blank"} value={value}>{value || "Select view"}</option>)}
              </SelectField>
              <TextField label="Notes" value={item.metadata.notes} onChange={(event) => updateItem(item.intakeID, { notes: event.currentTarget.value })} />
              <Button variant="danger" onClick={() => setBatch((currentBatch) => removeEvidenceIntakeItem(currentBatch, item.intakeID, new Date().toISOString()))}>
                Remove before finalization
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );

  function updateItem(intakeID: string, metadata: Parameters<typeof updateEvidenceIntakeMetadata>[2]) {
    setBatch((currentBatch) => updateEvidenceIntakeMetadata(currentBatch, intakeID, metadata, new Date().toISOString()));
  }

  function updateNamingContext(field: keyof typeof namingContext, value: string) {
    setNamingContext((currentContext) => ({ ...currentContext, [field]: value }));
  }
}

function RenamePlanPreview({ plan }: { plan: Phase0EvidenceRenamePlan | undefined }) {
  if (!plan) return null;
  return (
    <div className="card card-info">
      <div className="status-row">
        <h4>Generated name preview</h4>
        <StatusBadge tone={plan.status === "ready" ? "success" : "warning"}>{plan.status}</StatusBadge>
      </div>
      <dl className="metadata-list">
        <div>
          <dt>Filename</dt>
          <dd>{plan.generatedFilename ?? "Required fields missing"}</dd>
        </div>
        <div>
          <dt>Target path</dt>
          <dd>{plan.targetRelativePath ?? "Unavailable until naming fields pass validation"}</dd>
        </div>
      </dl>
      {plan.issues.length > 0 ? (
        <ul className="compact-list">
          {plan.issues.map((issue, index) => <li key={`${plan.intakeID}-${issue.code}-${issue.field ?? "plan"}-${index}`}>{issue.message}</li>)}
        </ul>
      ) : (
        <p className="supporting">Preview is ready. Explicit operator confirmation would still be required before any future rename action.</p>
      )}
    </div>
  );
}
