"use client";

import { Alert, Button, Card, SelectField, StatusBadge, TextField } from "@/components/design-system";
import {
  PHASE0_AUDIT_ISSUE_KINDS,
  addAuditIssue,
  createAuditIssue,
  resolveAuditIssue,
  summarizeIssueRegister,
  validateIssueRegister,
  type Phase0AuditIssueKind,
  type Phase0AuditIssueSeverity,
  type Phase0AuditIssueStatus,
  type Phase0IssueRegister,
  type Phase0RecaptureQueueStatus
} from "@/lib/phase-zero/phase-zero-issue-management";
import type { CapturedAngleID } from "@/types/domain";
import { useMemo, useState } from "react";

interface IssueDraft {
  kind: Phase0AuditIssueKind;
  title: string;
  description: string;
  owner: string;
  severity: Phase0AuditIssueSeverity;
  status: Phase0AuditIssueStatus;
  affectedRecordIDs: string;
  affectedEvidenceFileIDs: string;
  resolutionNotes: string;
  recaptureRequired: "yes" | "no";
  recaptureQueueStatus: Phase0RecaptureQueueStatus;
  requestedAngles: string;
  requestedEvidenceKinds: string;
  recaptureOwner: string;
  recapturePriority: Phase0AuditIssueSeverity;
  recaptureNotes: string;
}

const initialDraft: IssueDraft = {
  kind: "missingEvidence",
  title: "Synthetic audit issue",
  description: "Synthetic issue description for workflow structure only.",
  owner: "audit-owner-synthetic",
  severity: "blocking",
  status: "open",
  affectedRecordIDs: "record-synthetic",
  affectedEvidenceFileIDs: "evidence-synthetic",
  resolutionNotes: "",
  recaptureRequired: "no",
  recaptureQueueStatus: "notQueued",
  requestedAngles: "straightOn",
  requestedEvidenceKinds: "full-screen-menu",
  recaptureOwner: "recapture-owner-synthetic",
  recapturePriority: "blocking",
  recaptureNotes: "Synthetic recapture instructions for workflow structure only."
};

const severities: Phase0AuditIssueSeverity[] = ["info", "warning", "blocking", "critical"];
const statuses: Phase0AuditIssueStatus[] = ["open", "inReview", "recaptureQueued", "resolved", "wontFix"];
const recaptureStatuses: Phase0RecaptureQueueStatus[] = ["notQueued", "queued", "captured", "verified", "cancelled"];
const capturedAngles: CapturedAngleID[] = ["straightOn", "left45", "right45", "leftProfile", "rightProfile"];

export function IssueManagementWorkspace({
  issueRegister,
  onIssueRegisterChange
}: {
  issueRegister: Phase0IssueRegister;
  onIssueRegisterChange: (issueRegister: Phase0IssueRegister) => void;
}) {
  const [draft, setDraft] = useState<IssueDraft>(initialDraft);
  const validation = useMemo(() => validateIssueRegister(issueRegister), [issueRegister]);
  const summary = useMemo(() => summarizeIssueRegister(issueRegister), [issueRegister]);

  function updateDraft<Key extends keyof IssueDraft>(key: Key, value: IssueDraft[Key]) {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
  }

  function addIssue() {
    const nowISO = new Date().toISOString();
    const issue = createAuditIssue({
      issueID: `audit-issue-${issueRegister.issues.length + 1}`,
      kind: draft.kind,
      title: draft.title,
      description: draft.description,
      owner: draft.owner,
      severity: draft.severity,
      status: draft.status,
      affectedRecordIDs: splitList(draft.affectedRecordIDs),
      affectedEvidenceFileIDs: splitList(draft.affectedEvidenceFileIDs),
      resolutionNotes: draft.resolutionNotes,
      recaptureRequest: {
        required: draft.recaptureRequired === "yes",
        queueStatus: draft.recaptureQueueStatus,
        requestedAngles: splitAngles(draft.requestedAngles),
        requestedEvidenceKinds: splitList(draft.requestedEvidenceKinds),
        owner: draft.recaptureOwner,
        priority: draft.recapturePriority,
        notes: draft.recaptureNotes
      },
      nowISO
    });
    onIssueRegisterChange(addAuditIssue(issueRegister, issue, nowISO));
    setDraft((currentDraft) => ({
      ...initialDraft,
      kind: currentDraft.kind,
      severity: currentDraft.severity,
      status: currentDraft.status
    }));
  }

  function resolveIssue(issueID: string) {
    onIssueRegisterChange(resolveAuditIssue(issueRegister, issueID, "Resolved from the local audit issue workspace.", new Date().toISOString()));
  }

  return (
    <section className="screen-stack" aria-labelledby="issue-management-title">
      <div className="status-row">
        <div>
          <p className="eyebrow">Internal audit tool</p>
          <h2 id="issue-management-title">Issue, exception, and recapture management</h2>
        </div>
        <StatusBadge tone={validation.productionCompletionAllowed ? "success" : "danger"}>
          {validation.productionCompletionAllowed ? "no blocking issues" : "production blocked"}
        </StatusBadge>
      </div>
      <p className="supporting">
        Track audit defects, owner assignments, affected records, evidence references, resolution notes, and recapture requests without creating or
        modifying College Football 27 catalog records.
      </p>
      <Alert title="Unresolved blockers feed the Phase 0 dashboard" tone={summary.unresolvedBlockingIssues > 0 ? "danger" : "info"} role="status">
        {summary.unresolvedBlockingIssues} unresolved blocking issues and {summary.recaptureQueueCount} queued recaptures are active.
      </Alert>
      <div className="card-grid">
        <Card>
          <h3>Issue details</h3>
          <div className="form-stack">
            <SelectField label="Issue kind" value={draft.kind} onChange={(event) => updateDraft("kind", event.currentTarget.value as Phase0AuditIssueKind)}>
              {PHASE0_AUDIT_ISSUE_KINDS.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <TextField label="Title" value={draft.title} onChange={(event) => updateDraft("title", event.currentTarget.value)} />
            <TextField label="Description" value={draft.description} onChange={(event) => updateDraft("description", event.currentTarget.value)} />
            <TextField label="Owner" value={draft.owner} onChange={(event) => updateDraft("owner", event.currentTarget.value)} />
            <SelectField label="Severity" value={draft.severity} onChange={(event) => updateDraft("severity", event.currentTarget.value as Phase0AuditIssueSeverity)}>
              {severities.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Status" value={draft.status} onChange={(event) => updateDraft("status", event.currentTarget.value as Phase0AuditIssueStatus)}>
              {statuses.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
          </div>
        </Card>
        <Card>
          <h3>Affected records and evidence</h3>
          <div className="form-stack">
            <TextField label="Affected record IDs" value={draft.affectedRecordIDs} onChange={(event) => updateDraft("affectedRecordIDs", event.currentTarget.value)} note="Comma-separated audit or catalog record IDs." />
            <TextField label="Affected evidence IDs" value={draft.affectedEvidenceFileIDs} onChange={(event) => updateDraft("affectedEvidenceFileIDs", event.currentTarget.value)} note="Comma-separated evidence references; no media bytes are stored here." />
            <TextField label="Resolution notes" value={draft.resolutionNotes} onChange={(event) => updateDraft("resolutionNotes", event.currentTarget.value)} />
          </div>
        </Card>
        <Card>
          <h3>Recapture queue</h3>
          <div className="form-stack">
            <SelectField label="Recapture required" value={draft.recaptureRequired} onChange={(event) => updateDraft("recaptureRequired", event.currentTarget.value as "yes" | "no")}>
              <option value="no">no</option>
              <option value="yes">yes</option>
            </SelectField>
            <SelectField label="Queue status" value={draft.recaptureQueueStatus} onChange={(event) => updateDraft("recaptureQueueStatus", event.currentTarget.value as Phase0RecaptureQueueStatus)}>
              {recaptureStatuses.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <TextField label="Requested angles" value={draft.requestedAngles} onChange={(event) => updateDraft("requestedAngles", event.currentTarget.value)} note={`Allowed: ${capturedAngles.join(", ")}`} />
            <TextField label="Requested evidence kinds" value={draft.requestedEvidenceKinds} onChange={(event) => updateDraft("requestedEvidenceKinds", event.currentTarget.value)} />
            <TextField label="Recapture owner" value={draft.recaptureOwner} onChange={(event) => updateDraft("recaptureOwner", event.currentTarget.value)} />
            <SelectField label="Recapture priority" value={draft.recapturePriority} onChange={(event) => updateDraft("recapturePriority", event.currentTarget.value as Phase0AuditIssueSeverity)}>
              {severities.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <TextField label="Recapture notes" value={draft.recaptureNotes} onChange={(event) => updateDraft("recaptureNotes", event.currentTarget.value)} />
            <Button onClick={addIssue}>Add issue</Button>
          </div>
        </Card>
      </div>
      <Card tone={validation.errors.length > 0 ? "danger" : "success"}>
        <h3>Validation report</h3>
        {validation.errors.length === 0 ? (
          <p className="supporting">Issue register is structurally valid.</p>
        ) : (
          <ul className="compact-list">
            {validation.errors.slice(0, 8).map((error) => (
              <li key={`${error.code}-${error.issueID ?? error.message}`}>{error.message}</li>
            ))}
          </ul>
        )}
      </Card>
      <div className="result-grid">
        {issueRegister.issues.map((auditIssue) => (
          <Card key={auditIssue.issueID} tone={auditIssue.severity === "blocking" || auditIssue.severity === "critical" ? "danger" : "warning"}>
            <div className="status-row">
              <h3>{auditIssue.title}</h3>
              <StatusBadge tone={auditIssue.status === "resolved" ? "success" : auditIssue.severity === "blocking" || auditIssue.severity === "critical" ? "danger" : "warning"}>
                {auditIssue.status}
              </StatusBadge>
            </div>
            <dl className="metadata-list">
              <div>
                <dt>Kind</dt>
                <dd>{auditIssue.kind}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{auditIssue.owner}</dd>
              </div>
              <div>
                <dt>Affected records</dt>
                <dd>{auditIssue.affectedRecordIDs.join(", ")}</dd>
              </div>
              <div>
                <dt>Recapture</dt>
                <dd>{auditIssue.recaptureRequest.required ? auditIssue.recaptureRequest.queueStatus : "not required"}</dd>
              </div>
            </dl>
            {auditIssue.status !== "resolved" && auditIssue.status !== "wontFix" ? (
              <Button variant="secondary" onClick={() => resolveIssue(auditIssue.issueID)}>Mark resolved</Button>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  );
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function splitAngles(value: string): CapturedAngleID[] {
  const allowed = new Set(capturedAngles);
  return splitList(value).filter((item): item is CapturedAngleID => allowed.has(item as CapturedAngleID));
}
