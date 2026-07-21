import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root Phase 0 intake CLI is plain ESM JavaScript and is tested as the command source of truth.
import { runPhaseZeroIntake } from "../../scripts/phase-zero-intake.mjs";

const now = "2026-07-20T12:00:00.000Z";

describe("Phase 0 evidence intake pipeline", () => {
  it("inventories supported files, hashes them, and maps GFM-CAP filenames to capture assignments", async () => {
    const fixture = createWorkspace();
    fs.mkdirSync(path.join(fixture.root, "incoming/nested"), { recursive: true });
    fs.writeFileSync(path.join(fixture.root, "incoming/nested/GFM-CAP-001_menu.png"), pngFixture());
    fs.writeFileSync(path.join(fixture.root, "incoming/unclear.jpg"), jpegFixture());

    const { manifest, reviewQueue, missingCoverage } = await runPhaseZeroIntake({
      ...fixture.options,
      inputPath: "incoming"
    });

    expect(manifest.summary).toMatchObject({
      filesScanned: 2,
      supportedFiles: 2,
      assignedFiles: 1,
      unassignedFiles: 1,
      productionRecordsCreated: 0,
      productionCatalogRecordsPromoted: 0
    });
    expect(manifest.records.find((record: Record<string, unknown>) => record.original_filename === "GFM-CAP-001_menu.png")).toMatchObject({
      assigned_capture_id: "GFM-CAP-001",
      category: "Appearance menu hierarchy",
      evidence_status: "UNREVIEWED_RESEARCH_EVIDENCE_NOT_PRODUCTION",
      production_status: "NOT_PRODUCTION_DATA"
    });
    expect(reviewQueue).toHaveLength(2);
    expect(missingCoverage.map((item: Record<string, unknown>) => item.capture_id)).toContain("GFM-CAP-002");
  });

  it("detects exact duplicates within the batch and against existing evidence", async () => {
    const fixture = createWorkspace();
    fs.mkdirSync(path.join(fixture.root, "incoming"), { recursive: true });
    const bytes = pngFixture();
    const hash = crypto.createHash("sha256").update(bytes).digest("hex");
    fixture.evidenceManifest.entries.push({
      evidence_id: "phase0-source-existing",
      sha256: hash,
      relative_path: "data/phase-zero/source-existing.png"
    });
    writeFixtureManifests(fixture);

    fs.writeFileSync(path.join(fixture.root, "incoming/GFM-CAP-001_duplicate-a.png"), bytes);
    fs.writeFileSync(path.join(fixture.root, "incoming/GFM-CAP-002_duplicate-b.png"), bytes);

    const { manifest } = await runPhaseZeroIntake({
      ...fixture.options,
      inputPath: "incoming"
    });

    expect(manifest.summary.exactDuplicates).toBe(2);
    expect(manifest.records[0]).toMatchObject({
      duplicate_of: "phase0-source-existing",
      processing_status: "EXACT_DUPLICATE_REVIEW_REQUIRED",
      review_status: "DUPLICATE_REVIEW_REQUIRED"
    });
  });

  it("keeps metadata files as reviewable research context and rejects unsupported files", async () => {
    const fixture = createWorkspace();
    fs.mkdirSync(path.join(fixture.root, "incoming"), { recursive: true });
    fs.writeFileSync(path.join(fixture.root, "incoming/GFM-CAP-001_notes.json"), JSON.stringify({ note: "source sidecar" }));
    fs.writeFileSync(path.join(fixture.root, "incoming/GFM-CAP-001_unsupported.heic"), "not supported");

    const { manifest } = await runPhaseZeroIntake({
      ...fixture.options,
      inputPath: "incoming"
    });

    expect(manifest.records.find((record: Record<string, unknown>) => record.original_filename === "GFM-CAP-001_notes.json")).toMatchObject({
      mime_type: "application/json",
      opens_successfully: true,
      evidence_status: "UNREVIEWED_RESEARCH_EVIDENCE_NOT_PRODUCTION"
    });
    expect(manifest.records.find((record: Record<string, unknown>) => record.original_filename === "GFM-CAP-001_unsupported.heic")).toMatchObject({
      processing_status: "UNSUPPORTED_FILE_REVIEW_REQUIRED",
      opens_successfully: false
    });
  });

  it("marks owner external files as non-portable until explicitly imported", async () => {
    const fixture = createWorkspace();
    const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gfm-external-intake-"));
    fs.writeFileSync(path.join(externalRoot, "GFM-CAP-001_external.png"), pngFixture());

    const { manifest } = await runPhaseZeroIntake({
      ...fixture.options,
      inputPath: externalRoot
    });

    expect(manifest.records[0]).toMatchObject({
      source_location_kind: "OWNER_EXTERNAL_REFERENCE",
      processing_status: "EXTERNAL_REFERENCE_REVIEW_REQUIRED"
    });
    expect(manifest.records[0].source_location).toContain("OWNER_EXTERNAL_REFERENCE");
  });

  it("writes manifest, review queue, missing coverage, and report outputs", async () => {
    const fixture = createWorkspace();
    fs.mkdirSync(path.join(fixture.root, "incoming"), { recursive: true });
    fs.writeFileSync(path.join(fixture.root, "incoming/GFM-CAP-001_menu.png"), pngFixture());

    await runPhaseZeroIntake({
      ...fixture.options,
      inputPath: "incoming",
      writeOutputs: true
    });

    expect(fs.existsSync(path.join(fixture.root, "data/phase-zero/intake/intake_manifest.json"))).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, "data/phase-zero/intake/review_queue.json"))).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, "data/phase-zero/intake/missing_coverage.json"))).toBe(true);
    expect(fs.readFileSync(path.join(fixture.root, "docs/phase-zero/EVIDENCE_INTAKE_REPORT.md"), "utf8")).toContain("Phase 0 Evidence Intake Report");
  });
});

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-phase-zero-intake-"));
  const evidenceManifest = { entries: [] as Array<Record<string, unknown>> };
  const videoInventory = { inventory: [] as Array<Record<string, unknown>> };
  const captureRequests = {
    requests: [
      {
        captureID: "GFM-CAP-001",
        title: "Appearance and Head & Skin boundary map",
        exactCategory: "Appearance menu hierarchy",
        priority: "P0"
      },
      {
        captureID: "GFM-CAP-002",
        title: "Game version and patch screen",
        exactCategory: "Environment",
        priority: "P0"
      }
    ]
  };
  const fixture = {
    root,
    evidenceManifest,
    videoInventory,
    captureRequests,
    options: {
      root,
      generatedAt: now,
      captureRequestsPath: "data/phase-zero/capture_requests.json",
      evidenceManifestPath: "data/phase-zero/evidence_manifest.json",
      videoInventoryPath: "data/phase-zero/video_inventory.json",
      outputRoot: "data/phase-zero/intake",
      markdownReportPath: "docs/phase-zero/EVIDENCE_INTAKE_REPORT.md",
      writeOutputs: false
    }
  };
  writeFixtureManifests(fixture);
  return fixture;
}

function writeFixtureManifests(fixture: {
  root: string;
  evidenceManifest: { entries: Array<Record<string, unknown>> };
  videoInventory: { inventory: Array<Record<string, unknown>> };
  captureRequests: { requests: Array<Record<string, unknown>> };
}) {
  writeJson(path.join(fixture.root, "data/phase-zero/evidence_manifest.json"), fixture.evidenceManifest);
  writeJson(path.join(fixture.root, "data/phase-zero/video_inventory.json"), fixture.videoInventory);
  writeJson(path.join(fixture.root, "data/phase-zero/capture_requests.json"), fixture.captureRequests);
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

function jpegFixture() {
  return Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/ASP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/ASP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Al//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EFBQRAQAAAAAAAAAAAAAAAAAAARD/2gAIAQMBAT8QH//EFBQRAQAAAAAAAAAAAAAAAAAAARD/2gAIAQIBAT8QH//EFBQBAQAAAAAAAAAAAAAAAAAAARD/2gAIAQEAAT8QH//Z", "base64");
}
