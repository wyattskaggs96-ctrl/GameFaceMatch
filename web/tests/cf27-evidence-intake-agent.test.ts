import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root evidence intake CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { discoverApprovedSourceCandidates, runEvidenceIntake } from "../../scripts/cf27-evidence-intake-agent.mjs";

const now = "2026-07-14T12:00:00.000Z";

describe("CF27 evidence intake agent", () => {
  it("ignores unrelated Downloads files unless they use an open capture-request ID", () => {
    const fixture = createWorkspace();
    const downloads = path.join(fixture.root, "downloads");
    fs.mkdirSync(downloads, { recursive: true });
    fs.writeFileSync(path.join(downloads, "IMG_9999.PNG"), pngFixture());

    const candidates = discoverApprovedSourceCandidates({
      root: fixture.root,
      sourceRoots: [{
        path: "downloads",
        rootToken: "OWNER_DOWNLOADS",
        mode: "capture-request-named",
        maxDepth: 1
      }],
      requests: fixture.requests.requests
    });

    expect(candidates).toEqual([]);
  });

  it("detects exact duplicate files already present in the evidence manifest", async () => {
    const fixture = createWorkspace();
    const sourcePath = path.join(fixture.root, "intake", "GFM-CAP-001_duplicate.png");
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    const bytes = pngFixture();
    fs.writeFileSync(sourcePath, bytes);
    const hash = crypto.createHash("sha256").update(bytes).digest("hex");
    fixture.evidenceManifest.entries.push({
      evidence_id: "phase0-source-existing",
      relative_path: "OWNER_DOWNLOADS/existing.png",
      sha256: hash,
      master_or_derivative: "master"
    });
    writeFixtureManifests(fixture);

    const { report } = await runEvidenceIntake(fixture.options);

    expect(report.summary.candidateFilesScanned).toBe(1);
    expect(report.summary.newSourceEvidence).toBe(0);
    expect(report.summary.duplicateEvidence).toBe(1);
    expect(report.records[0]).toMatchObject({
      intakeStatus: "DUPLICATE_OF_EXISTING_EVIDENCE",
      duplicate: {
        exactDuplicate: true,
        duplicateOfEvidenceID: "phase0-source-existing"
      }
    });
  });

  it("handles a missing intake directory without failing or creating source records", async () => {
    const fixture = createWorkspace();
    const { report, updates } = await runEvidenceIntake({
      ...fixture.options,
      sourceRoots: [{
        path: "missing-intake",
        rootToken: "MISSING",
        mode: "intake-directory",
        maxDepth: 1
      }]
    });

    expect(report.summary).toMatchObject({
      candidateFilesScanned: 0,
      newSourceEvidence: 0,
      duplicateEvidence: 0,
      captureRequestsClosed: 0,
      productionRecordsCreated: 0
    });
    expect(updates.evidenceManifest.entries).toEqual([]);
  });

  it("records new matched evidence as research-only and leaves the capture request open", async () => {
    const fixture = createWorkspace();
    fs.mkdirSync(path.join(fixture.root, "intake"), { recursive: true });
    fs.writeFileSync(path.join(fixture.root, "intake", "GFM-CAP-001_HEADSKIN_BOUNDARY.png"), pngFixture());

    const { report, updates } = await runEvidenceIntake(fixture.options);

    expect(report.summary).toMatchObject({
      candidateFilesScanned: 1,
      newSourceEvidence: 1,
      matchedCaptureRequests: 1,
      captureRequestsClosed: 0,
      productionRecordsCreated: 0,
      catalogRecordsCreated: 0
    });
    expect(report.records[0].captureRequestMatch).toMatchObject({ captureID: "GFM-CAP-001" });
    expect(report.records[0].requestSatisfaction).toMatchObject({
      status: "MATCHED_PENDING_TIMELINE_AND_ACCEPTANCE_REVIEW",
      fullySatisfied: false,
      closesCaptureRequest: false
    });
    expect(updates.evidenceManifest.entries[0]).toMatchObject({
      master_or_derivative: "master",
      file_role: "source_screenshot_master_reference",
      verification_state: "OBSERVED_PENDING_VERIFICATION"
    });
    expect(updates.captureLog.events[0]).toMatchObject({
      action: "source_evidence_intake",
      verification_state: "OBSERVED_PENDING_VERIFICATION"
    });
    expect(updates.issuesRegister.issues[0]).toMatchObject({
      issueType: "EVIDENCE_REQUIRES_REVIEW",
      productionBlocker: true
    });
  });
});

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-cf27-evidence-intake-"));
  const evidenceManifest = { entries: [] as Array<Record<string, unknown>> };
  const videoInventory = { inventory: [] as Array<Record<string, unknown>> };
  const captureLog = { events: [] as Array<Record<string, unknown>> };
  const issuesRegister = { issues: [] as Array<Record<string, unknown>> };
  const requests = {
    requests: [{
      captureID: "GFM-CAP-001",
      title: "Appearance and Head & Skin boundary map",
      exactCategory: "Appearance menu hierarchy",
      priority: "P0",
      verificationStatus: "REQUESTED_NOT_CAPTURED"
    }]
  };
  const fixture = {
    root,
    evidenceManifest,
    videoInventory,
    captureLog,
    issuesRegister,
    requests,
    options: {
      root,
      generatedAt: now,
      evidenceManifestPath: "data/phase-zero/evidence_manifest.json",
      videoInventoryPath: "data/phase-zero/video_inventory.json",
      captureRequestsPath: "data/phase-zero/capture_requests.json",
      captureLogPath: "data/phase-zero/capture_log.json",
      issuesRegisterPath: "data/phase-zero/issues_register.research.json",
      outputJsonPath: "data/phase-zero/evidence_intake_report.json",
      outputCsvPath: "data/phase-zero/evidence_intake_report.csv",
      outputMarkdownPath: "docs/phase-zero/EVIDENCE_INTAKE_REPORT.md",
      sourceRoots: [{
        path: "intake",
        rootToken: "TEST_INTAKE",
        mode: "intake-directory",
        maxDepth: 1
      }],
      applyUpdates: false
    }
  };
  writeFixtureManifests(fixture);
  return fixture;
}

function writeFixtureManifests(fixture: {
  root: string;
  evidenceManifest: { entries: Array<Record<string, unknown>> };
  videoInventory: { inventory: Array<Record<string, unknown>> };
  captureLog: { events: Array<Record<string, unknown>> };
  issuesRegister: { issues: Array<Record<string, unknown>> };
  requests: { requests: Array<Record<string, unknown>> };
}) {
  writeJson(path.join(fixture.root, "data/phase-zero/evidence_manifest.json"), fixture.evidenceManifest);
  writeJson(path.join(fixture.root, "data/phase-zero/video_inventory.json"), fixture.videoInventory);
  writeJson(path.join(fixture.root, "data/phase-zero/capture_requests.json"), fixture.requests);
  writeJson(path.join(fixture.root, "data/phase-zero/capture_log.json"), fixture.captureLog);
  writeJson(path.join(fixture.root, "data/phase-zero/issues_register.research.json"), fixture.issuesRegister);
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function pngFixture() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAADUlEQVR42mP8z8BQDwAFgwJ/lO4f1wAAAABJRU5ErkJggg==",
    "base64"
  );
}
