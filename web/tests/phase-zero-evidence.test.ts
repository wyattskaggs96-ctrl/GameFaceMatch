import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PHASE0_CAPTURE_LOG_SCHEMA_VERSION,
  PHASE0_EVIDENCE_SCHEMA_VERSION,
  validatePhase0CaptureLog,
  validatePhase0EvidenceFile,
  type Phase0CaptureLog,
  type Phase0EvidenceFileRecord
} from "@/lib/phase-zero/phase-zero-evidence";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 evidence and capture-log schemas", () => {
  it("requires all source evidence metadata fields", () => {
    const schema = readSchema("evidence-file");
    for (const field of [
      "stableEvidenceID",
      "relativePath",
      "derivativeState",
      "fileRole",
      "sha256",
      "sizeBytes",
      "mimeType",
      "platformID",
      "gameVersionID",
      "patchID",
      "mode",
      "creationPathID",
      "environmentID",
      "catalogItemID",
      "view",
      "captureMethod",
      "captureDevice",
      "capturedAt",
      "researcherID",
      "verifierID",
      "verificationStatus",
      "supersededEvidenceID",
      "notes"
    ]) {
      expect(schema.required).toContain(field);
    }
  });

  it("requires chronological capture-log fields", () => {
    const schema = readSchema("capture-log");
    for (const field of ["actions", "settingSnapshots", "generatedEvidenceIDs", "issueIDs", "retakeCount", "primaryOperatorID"]) {
      expect(schema.required).toContain(field);
    }
    expect(schema.$defs.action.required).toEqual([
      "actionID",
      "actionAt",
      "actionKind",
      "operatorID",
      "settingSnapshotIDs",
      "generatedEvidenceIDs",
      "issueIDs",
      "retakeOfEvidenceID",
      "notes"
    ]);
  });

  it("accepts valid synthetic evidence and capture logs", () => {
    expect(validatePhase0EvidenceFile(validEvidence()).errors).toEqual([]);
    expect(validatePhase0CaptureLog(validCaptureLog()).errors).toEqual([]);
  });

  it("rejects production evidence paths that are absolute, URLs, or parent traversal", () => {
    for (const relativePath of ["/Users/wyatt/evidence.png", "https://example.test/evidence.png", "../evidence.png"]) {
      const evidence = validEvidence();
      evidence.relativePath = relativePath;
      expect(validatePhase0EvidenceFile(evidence).errors.map((error) => error.code)).toContain("absoluteProductionEvidencePath");
    }
  });

  it("rejects invalid hashes, sizes, MIME types, timestamps, and verifier metadata", () => {
    const evidence = validEvidence();
    evidence.sha256 = "abc";
    evidence.sizeBytes = 0;
    evidence.mimeType = "image";
    evidence.capturedAt = "not-a-date";
    evidence.verificationStatus = "verified";
    evidence.verifierID = null;
    const codes = validatePhase0EvidenceFile(evidence).errors.map((error) => error.code);
    expect(codes).toContain("invalidSha256");
    expect(codes).toContain("invalidEvidenceSize");
    expect(codes).toContain("invalidMimeType");
    expect(codes).toContain("invalidTimestamp");
    expect(codes).toContain("missingVerifier");
  });

  it("rejects non-chronological logs, missing setting snapshots, and retake mismatches", () => {
    const log = validCaptureLog();
    log.actions[1].actionAt = "2026-07-11T23:59:00.000Z";
    log.actions[2].settingSnapshotIDs = ["missing-snapshot"];
    log.retakeCount = 1;
    const codes = validatePhase0CaptureLog(log).errors.map((error) => error.code);
    expect(codes).toContain("nonChronologicalCaptureLog");
    expect(codes).toContain("missingSettingSnapshot");
    expect(codes).toContain("retakeCountMismatch");
  });

  it("requires retake actions to reference evidence being retaken", () => {
    const log = validCaptureLog();
    log.actions.push({
      actionID: "action-retake",
      actionAt: "2026-07-12T00:04:00.000Z",
      actionKind: "retakeRequested",
      operatorID: "operator-synthetic",
      settingSnapshotIDs: [],
      generatedEvidenceIDs: [],
      issueIDs: ["issue-synthetic"],
      retakeOfEvidenceID: null,
      notes: "Synthetic retake requested."
    });
    log.retakeCount = 1;
    expect(validatePhase0CaptureLog(log).errors.map((error) => error.code)).toContain("missingRetakeReference");
  });
});

function readSchema(name: string) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), `../data/schemas/${name}.schema.json`), "utf8"));
}

function validEvidence(): Phase0EvidenceFileRecord {
  return {
    schemaVersion: PHASE0_EVIDENCE_SCHEMA_VERSION,
    stableEvidenceID: "evidence-synthetic-001",
    relativePath: "data/audit/college-football-27/evidence/synthetic/synthetic-front.png",
    derivativeState: "master",
    fileRole: "standardAngle",
    sha256: "a".repeat(64),
    sizeBytes: 2048,
    mimeType: "image/png",
    platformID: "platform-synthetic",
    gameVersionID: "version-synthetic",
    patchID: "patch-synthetic",
    mode: "synthetic-mode",
    creationPathID: "creation-path-synthetic",
    environmentID: "environment-synthetic",
    catalogItemID: "catalog-item-synthetic",
    view: "straightOn",
    captureMethod: "captureCard",
    captureDevice: "synthetic-capture-device",
    capturedAt: now,
    researcherID: "researcher-synthetic",
    verifierID: null,
    verificationStatus: "firstReviewPending",
    supersededEvidenceID: null,
    notes: "Synthetic evidence metadata."
  };
}

function validCaptureLog(): Phase0CaptureLog {
  return {
    schemaVersion: PHASE0_CAPTURE_LOG_SCHEMA_VERSION,
    captureLogID: "capture-log-synthetic",
    auditSessionID: "audit-session-synthetic",
    environmentID: "environment-synthetic",
    platformID: "platform-synthetic",
    gameVersionID: "version-synthetic",
    patchID: "patch-synthetic",
    mode: "synthetic-mode",
    creationPathID: "creation-path-synthetic",
    catalogItemID: "catalog-item-synthetic",
    startedAt: now,
    completedAt: "2026-07-12T00:03:00.000Z",
    primaryOperatorID: "operator-synthetic",
    actions: [
      {
        actionID: "action-start",
        actionAt: now,
        actionKind: "sessionStarted",
        operatorID: "operator-synthetic",
        settingSnapshotIDs: [],
        generatedEvidenceIDs: [],
        issueIDs: [],
        retakeOfEvidenceID: null,
        notes: "Synthetic session started."
      },
      {
        actionID: "action-snapshot",
        actionAt: "2026-07-12T00:01:00.000Z",
        actionKind: "settingSnapshot",
        operatorID: "operator-synthetic",
        settingSnapshotIDs: ["snapshot-synthetic"],
        generatedEvidenceIDs: [],
        issueIDs: [],
        retakeOfEvidenceID: null,
        notes: "Synthetic setting snapshot."
      },
      {
        actionID: "action-evidence",
        actionAt: "2026-07-12T00:02:00.000Z",
        actionKind: "evidenceCaptured",
        operatorID: "operator-synthetic",
        settingSnapshotIDs: ["snapshot-synthetic"],
        generatedEvidenceIDs: ["evidence-synthetic-001"],
        issueIDs: [],
        retakeOfEvidenceID: null,
        notes: "Synthetic evidence captured."
      }
    ],
    settingSnapshots: [
      {
        snapshotID: "snapshot-synthetic",
        menuMapID: "menu-map-synthetic",
        menuItemID: "menu-item-synthetic",
        visibleLabelOrIndex: "synthetic-visible-label",
        nativeOrder: 1,
        canonicalValue: "synthetic-value",
        evidenceFileIDs: ["evidence-synthetic-001"],
        notes: "Synthetic setting snapshot."
      }
    ],
    generatedEvidenceIDs: ["evidence-synthetic-001"],
    issueIDs: [],
    retakeCount: 0,
    notes: "Synthetic capture log."
  };
}
