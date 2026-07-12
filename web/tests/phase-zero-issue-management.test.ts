import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PHASE0_AUDIT_ISSUE_KINDS,
  addAuditIssue,
  createAuditIssue,
  createEmptyIssueRegister,
  getRecaptureQueue,
  getUnresolvedBlockingIssues,
  resolveAuditIssue,
  summarizeIssueRegister,
  validateIssueRegister,
  type Phase0AuditIssue,
  type Phase0AuditIssueKind,
  type Phase0IssueRegister
} from "@/lib/phase-zero/phase-zero-issue-management";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 issue management", () => {
  it("documents the machine-readable issue register schema fields", () => {
    const schema = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/schemas/issue-register.schema.json"), "utf8"));

    expect(schema.required).toEqual(["schemaVersion", "registerID", "createdAt", "updatedAt", "issues"]);
    for (const field of [
      "kind",
      "owner",
      "severity",
      "status",
      "affectedRecordIDs",
      "affectedEvidenceFileIDs",
      "resolutionNotes",
      "recaptureRequest"
    ]) {
      expect(schema.$defs.issue.required).toContain(field);
    }
    expect(schema.$defs.issueKind.enum).toEqual(PHASE0_AUDIT_ISSUE_KINDS);
  });

  it("supports every required audit defect kind", () => {
    expect(PHASE0_AUDIT_ISSUE_KINDS).toEqual([
      "missingEvidence",
      "wrongOptionAssociation",
      "countMismatch",
      "orderMismatch",
      "inconsistentFraming",
      "inconsistentLighting",
      "wrongCanonicalHair",
      "wrongFacialHair",
      "versionMismatch",
      "platformMismatch",
      "dependencyUncertainty",
      "duplicateAmbiguity",
      "corruptFile",
      "unresolvedPath",
      "recaptureRequired"
    ]);
  });

  it.each<Phase0AuditIssueKind>(PHASE0_AUDIT_ISSUE_KINDS)("accepts a complete %s issue", (kind) => {
    const report = validateIssueRegister(registerWithIssues([completeIssue({ kind, severity: "warning" })]));

    expect(report.ok).toBe(true);
  });

  it("reports unresolved blocking issues and blocks production completion", () => {
    const register = registerWithIssues([completeIssue({ severity: "blocking", status: "open" })]);
    const report = validateIssueRegister(register);
    const summary = summarizeIssueRegister(register);

    expect(report.productionCompletionAllowed).toBe(false);
    expect(getUnresolvedBlockingIssues(register)).toHaveLength(1);
    expect(summary.blockers[0]).toMatch(/Synthetic audit issue/);
  });

  it("tracks recapture queue items separately from other open issues", () => {
    const register = registerWithIssues([
      completeIssue({
        kind: "recaptureRequired",
        severity: "critical",
        status: "recaptureQueued",
        recaptureRequest: {
          required: true,
          queueStatus: "queued",
          requestedAngles: ["straightOn", "left45"],
          requestedEvidenceKinds: ["full-screen-menu"],
          owner: "recapture-owner-synthetic",
          priority: "critical",
          notes: "Synthetic recapture request."
        }
      })
    ]);

    expect(getRecaptureQueue(register)).toHaveLength(1);
    expect(validateIssueRegister(register).errors).toEqual([]);
    expect(validateIssueRegister(register).productionCompletionAllowed).toBe(false);
  });

  it("requires owner, affected records, evidence, and resolution notes when closed", () => {
    const closed = completeIssue({ status: "resolved" });
    closed.owner = "";
    closed.affectedRecordIDs = [];
    closed.affectedEvidenceFileIDs = [];
    closed.resolutionNotes = "";
    const report = validateIssueRegister(registerWithIssues([closed]));

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "missingIssueField",
      "missingAffectedRecord",
      "missingIssueEvidence",
      "missingResolutionNotes"
    ]));
  });

  it("requires recapture scope and queue status when recapture is required", () => {
    const recapture = completeIssue({
      kind: "recaptureRequired",
      status: "recaptureQueued",
      recaptureRequest: {
        required: true,
        queueStatus: "notQueued",
        requestedAngles: [],
        requestedEvidenceKinds: [],
        owner: "",
        priority: "blocking",
        notes: ""
      }
    });
    const report = validateIssueRegister(registerWithIssues([recapture]));

    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "recaptureNotQueued",
      "missingRecaptureScope",
      "missingRecaptureOwner"
    ]));
    expect(report.warnings.map((warning) => warning.code)).toContain("missingRecaptureNotes");
  });

  it("removes an issue from unresolved blockers after resolution", () => {
    const register = registerWithIssues([completeIssue({ severity: "blocking" })]);
    const resolved = resolveAuditIssue(register, "issue-synthetic-1", "Synthetic issue resolved with replacement evidence.", now);

    expect(getUnresolvedBlockingIssues(resolved)).toHaveLength(0);
    expect(validateIssueRegister(resolved).productionCompletionAllowed).toBe(true);
  });
});

function baseRegister(): Phase0IssueRegister {
  return createEmptyIssueRegister({
    registerID: "issue-register-synthetic",
    nowISO: now
  });
}

function registerWithIssues(issues: Phase0AuditIssue[]): Phase0IssueRegister {
  let register = baseRegister();
  for (const issue of issues) {
    register = addAuditIssue(register, issue, now);
  }
  return register;
}

function completeIssue(overrides: Partial<Phase0AuditIssue> = {}): Phase0AuditIssue {
  const defaultRecaptureRequest = overrides.kind === "recaptureRequired"
    ? {
        required: true,
        queueStatus: "queued" as const,
        requestedAngles: ["straightOn" as const],
        requestedEvidenceKinds: ["full-screen-menu"],
        owner: "recapture-owner-synthetic",
        priority: "blocking" as const,
        notes: "Synthetic recapture request."
      }
    : {
        required: false,
        queueStatus: "notQueued" as const,
        requestedAngles: [],
        requestedEvidenceKinds: [],
        owner: "",
        priority: "warning" as const,
        notes: ""
      };
  return createAuditIssue({
    issueID: overrides.issueID ?? "issue-synthetic-1",
    kind: overrides.kind ?? "missingEvidence",
    title: overrides.title ?? "Synthetic audit issue",
    description: overrides.description ?? "Synthetic audit issue description.",
    owner: overrides.owner ?? "owner-synthetic",
    severity: overrides.severity ?? "warning",
    status: overrides.status ?? "open",
    affectedRecordIDs: overrides.affectedRecordIDs ?? ["record-synthetic-1"],
    affectedEvidenceFileIDs: overrides.affectedEvidenceFileIDs ?? ["evidence-synthetic-1"],
    resolutionNotes: overrides.resolutionNotes ?? (overrides.status === "resolved" || overrides.status === "wontFix" ? "Synthetic resolution." : ""),
    recaptureRequest: overrides.recaptureRequest ?? defaultRecaptureRequest,
    nowISO: now
  });
}
