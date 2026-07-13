import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root evidence manifest CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { EVIDENCE_MANIFEST_SCHEMA_VERSION, compareEvidenceManifests, formatEvidenceManifestReport, generateEvidenceManifest, generateEvidenceManifestAsync, readMetadataFile, sha256FileStream, writeManifest } from "../../scripts/evidence-manifest.mjs";

const root = path.resolve(process.cwd(), "..");
const fixtureDirectory = "data/fixtures/test-only/evidence-manifest/approved";
const metadataPath = "data/fixtures/test-only/evidence-manifest/metadata.json";
const frontFixturePath = `${fixtureDirectory}/CF27_PS5_RTG_HEAD_001_front_1.0.0_patch-test_20260712.txt`;
const leftFixturePath = `${fixtureDirectory}/CF27_PS5_RTG_HEAD_001_leftProfile_1.0.0_patch-test_20260712.json`;

describe("Phase 0 evidence manifest generator", () => {
  it("documents the required manifest fields", () => {
    const schema = JSON.parse(fs.readFileSync(path.resolve(root, "data/schemas/evidence-manifest.schema.json"), "utf8"));

    expect(schema.properties.uploadPolicy.const).toBe("local-only; no external upload performed");
    expect(schema.$defs.entry.required).toEqual([
      "relativePath",
      "sha256",
      "sizeBytes",
      "mimeType",
      "fileRole",
      "derivativeState",
      "environmentID",
      "catalogItemID",
      "view",
      "captureMetadata"
    ]);
  });

  it("scans approved evidence directories and calculates checksums, sizes, MIME types, and metadata", () => {
    const manifest = generateEvidenceManifest({
      root,
      directories: [fixtureDirectory],
      metadataByPath: readMetadataFile(metadataPath, root),
      generatedAt: "2026-07-12T00:00:00.000Z"
    });
    const front = manifest.entries.find((entry: { relativePath: string }) => entry.relativePath === frontFixturePath);
    const expectedHash = sha256(fs.readFileSync(path.resolve(root, frontFixturePath)));

    expect(manifest.schemaVersion).toBe(EVIDENCE_MANIFEST_SCHEMA_VERSION);
    expect(manifest.uploadPolicy).toBe("local-only; no external upload performed");
    expect(manifest.entries).toHaveLength(2);
    expect(front).toMatchObject({
      relativePath: frontFixturePath,
      sha256: expectedHash,
      sizeBytes: fs.statSync(path.resolve(root, frontFixturePath)).size,
      mimeType: "text/plain",
      fileRole: "standardAngle",
      derivativeState: "master",
      environmentID: "environment-test-only",
      catalogItemID: "CF27_PS5_RTG_HEAD_001",
      view: "straightOn"
    });
    expect(front.captureMetadata).toMatchObject({
      platformID: "platform-test-only",
      gameVersionID: "version-test-only",
      patchID: "patch-test-only",
      captureMethod: "manualEntry"
    });
  });

  it("supports streaming checksum generation for larger evidence sets", async () => {
    const manifest = await generateEvidenceManifestAsync({
      root,
      directories: [fixtureDirectory],
      metadataByPath: readMetadataFile(metadataPath, root),
      generatedAt: "2026-07-12T00:00:00.000Z"
    });
    const front = manifest.entries.find((entry: { relativePath: string }) => entry.relativePath === frontFixturePath);

    expect(manifest.performance).toEqual({
      checksumMode: "streaming-sha256",
      fileTraversal: "async-recursive-directory-iterator"
    });
    expect(front?.sha256).toBe(await sha256FileStream(path.resolve(root, frontFixturePath)));
    expect(front?.sha256).toBe(sha256(fs.readFileSync(path.resolve(root, frontFixturePath))));
  });

  it("detects changed, missing, and unexpected files between scans", () => {
    const current = generateEvidenceManifest({
      root,
      directories: [fixtureDirectory],
      metadataByPath: readMetadataFile(metadataPath, root),
      generatedAt: "2026-07-12T00:00:00.000Z"
    });
    const previous = {
      entries: [
        { ...current.entries[0], sha256: "0".repeat(64), sizeBytes: current.entries[0].sizeBytes + 1 },
        { relativePath: "data/fixtures/test-only/evidence-manifest/approved/missing.txt", sha256: "1".repeat(64), sizeBytes: 10 }
      ]
    };
    const comparison = compareEvidenceManifests(previous, current);

    expect(comparison.changed).toContain(current.entries[0].relativePath);
    expect(comparison.missing).toContain("data/fixtures/test-only/evidence-manifest/approved/missing.txt");
    expect(comparison.unexpected).toContain(current.entries[1].relativePath);
  });

  it("reports missing metadata without inventing associations", () => {
    const manifest = generateEvidenceManifest({
      root,
      directories: [fixtureDirectory],
      metadataByPath: {},
      generatedAt: "2026-07-12T00:00:00.000Z"
    });

    expect(manifest.warnings.map((warning: { code: string }) => warning.code)).toContain("missingMetadata");
    expect(manifest.entries[0].environmentID).toBeNull();
    expect(manifest.entries[0].catalogItemID).toBeNull();
    expect(manifest.entries[0].captureMetadata.gameVersionID).toBe("unknown");
  });

  it("skips unapproved directories and keeps reports readable", () => {
    const manifest = generateEvidenceManifest({
      root,
      directories: ["web"],
      generatedAt: "2026-07-12T00:00:00.000Z"
    });
    const report = formatEvidenceManifestReport(manifest);

    expect(manifest.entries).toEqual([]);
    expect(manifest.warnings.map((warning: { code: string }) => warning.code)).toContain("unapprovedDirectory");
    expect(report).toContain("Evidence manifest: 0 files");
    expect(report).toContain("Upload policy: local-only; no external upload performed");
  });

  it("writes manifests locally without modifying evidence files", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-evidence-manifest-"));
    const before = fs.readFileSync(path.resolve(root, frontFixturePath), "utf8");
    const outputPath = path.join(tempDir, "manifest.json");
    const manifest = generateEvidenceManifest({
      root,
      directories: [fixtureDirectory],
      metadataByPath: readMetadataFile(metadataPath, root),
      generatedAt: "2026-07-12T00:00:00.000Z"
    });

    writeManifest(manifest, outputPath, root);
    const written = JSON.parse(fs.readFileSync(outputPath, "utf8"));

    expect(written.entries).toHaveLength(2);
    expect(fs.readFileSync(path.resolve(root, frontFixturePath), "utf8")).toBe(before);
  });

  it("retains JSON MIME type and derivative metadata for secondary fixture evidence", () => {
    const manifest = generateEvidenceManifest({
      root,
      directories: [fixtureDirectory],
      metadataByPath: readMetadataFile(metadataPath, root),
      generatedAt: "2026-07-12T00:00:00.000Z"
    });
    const left = manifest.entries.find((entry: { relativePath: string }) => entry.relativePath === leftFixturePath);

    expect(left).toMatchObject({
      mimeType: "application/json",
      derivativeState: "derivative",
      view: "leftProfile"
    });
  });
});

function sha256(value: Buffer) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
