import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root CF27 evidence manifest CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { CF27_CURRENT_EVIDENCE_MANIFEST_SCHEMA_VERSION, formatCurrentEvidenceManifestCSV, generateCurrentEvidenceManifest, validatePortableRelativePath } from "../../scripts/cf27-current-evidence-manifest.mjs";

const root = path.resolve(process.cwd(), "..");

describe("CF27 current evidence manifest", () => {
  it("includes every current source-video master without leaking absolute discovery paths", () => {
    const inventory = JSON.parse(fs.readFileSync(path.resolve(root, "data/research/cf27/video_inventory.json"), "utf8"));
    const manifest = generateCurrentEvidenceManifest({ root, generatedAt: "2026-07-13T00:00:00.000Z" });
    const sourceMasters = manifest.entries.filter((entry: { masterOrDerivative: string }) => entry.masterOrDerivative === "master");

    expect(manifest.schemaVersion).toBe(CF27_CURRENT_EVIDENCE_MANIFEST_SCHEMA_VERSION);
    expect(sourceMasters).toHaveLength(inventory.inventory.length);
    for (const video of inventory.inventory) {
      const entry = sourceMasters.find((candidate: { sourceVideo: string }) => candidate.sourceVideo === video.inventoryId);
      expect(entry).toMatchObject({
        relativePath: video.portableRelativeEvidencePath,
        sha256: video.sha256,
        sizeBytes: video.fileSizeBytes,
        fileRole: "sourceVideoMaster",
        verificationState: "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED"
      });
      expect(JSON.stringify(entry)).not.toContain(video.absoluteDiscoveryPathInternal);
      expect(entry.relativePath).toMatch(/^OWNER_DOWNLOADS\//);
      expect(validatePortableRelativePath(entry.relativePath)).toBe(true);
    }
  });

  it("includes every extracted derivative frame represented by the frame manifests", () => {
    const manifest = generateCurrentEvidenceManifest({ root, generatedAt: "2026-07-13T00:00:00.000Z" });
    const frameManifestPaths = fs
      .readdirSync(path.resolve(root, "data/research/cf27/manifests"), { recursive: true })
      .filter((filePath) => String(filePath).endsWith("_evidence_frame_manifest.json"));
    const expectedFrameCount = frameManifestPaths.reduce((total, filePath) => {
      const frameManifest = JSON.parse(fs.readFileSync(path.resolve(root, "data/research/cf27/manifests", String(filePath)), "utf8"));
      return total + frameManifest.frames.length;
    }, 0);
    const derivatives = manifest.entries.filter((entry: { masterOrDerivative: string }) => entry.masterOrDerivative === "derivative");

    expect(derivatives).toHaveLength(expectedFrameCount);
    expect(manifest.summary.derivativeFrames).toBe(expectedFrameCount);
    expect(manifest.validation.status).toBe("passed");
  });

  it("links derivative frames to catalog IDs, menu IDs, source videos, and source timestamps", () => {
    const manifest = generateCurrentEvidenceManifest({ root, generatedAt: "2026-07-13T00:00:00.000Z" });
    const earFrame = manifest.entries.find((entry: { evidenceID: string }) => entry.evidenceID === "evidence-frame-cf27_xboxunknown_rtg_earshape_001-best_available_side_or_three_quarter");

    expect(earFrame).toMatchObject({
      relativePath: "data/research/cf27/generated/full-resolution-frames/ear-shape-options-001-004/CF27_XBOXUNKNOWN_RTG_EARSHAPE_001/CF27_XBOXUNKNOWN_RTG_EARSHAPE_001_BEST_AVAILABLE_SIDE_OR_THREE_QUARTER_video-009_21p00s.png",
      masterOrDerivative: "derivative",
      fileRole: "standardAngleDerivativeFrame",
      sourceVideo: "video-009",
      timestamp: 21,
      environmentCandidate: "env-cf27-research-video-001-rtg-path",
      menuID: "cf27-menu-head-skin-ear-shape",
      catalogID: "CF27_XBOXUNKNOWN_RTG_EARSHAPE_001",
      view: "BEST_AVAILABLE_SIDE_OR_THREE_QUARTER",
      verificationState: "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
      supersessionState: "CURRENT"
    });
    expect(validatePortableRelativePath(earFrame.relativePath)).toBe(true);
  });

  it("marks exact duplicate source references without deleting their provenance", () => {
    const manifest = generateCurrentEvidenceManifest({ root, generatedAt: "2026-07-13T00:00:00.000Z" });
    const duplicateSkinTone = manifest.entries.find((entry: { sourceVideo: string; masterOrDerivative: string }) => entry.sourceVideo === "video-010" && entry.masterOrDerivative === "master");
    const duplicateSkinDetails = manifest.entries.find((entry: { sourceVideo: string; masterOrDerivative: string }) => entry.sourceVideo === "video-011" && entry.masterOrDerivative === "master");

    expect(duplicateSkinTone).toMatchObject({
      supersessionState: "DUPLICATE_OF_video-004",
      duplicateOfInventoryId: "video-004"
    });
    expect(duplicateSkinDetails).toMatchObject({
      supersessionState: "DUPLICATE_OF_video-005",
      duplicateOfInventoryId: "video-005"
    });
  });

  it("exports a readable CSV with the required Prompt 96 fields", () => {
    const manifest = generateCurrentEvidenceManifest({ root, generatedAt: "2026-07-13T00:00:00.000Z" });
    const csv = formatCurrentEvidenceManifestCSV(manifest);

    expect(csv.split("\n")[0]).toBe(
      "evidenceID,relativePath,masterOrDerivative,fileRole,sha256,sizeBytes,mimeType,sourceVideo,timestamp,environmentCandidate,menuID,catalogID,view,captureDate,researcher,verificationState,supersessionState,validationState,notes"
    );
    expect(csv).toContain("evidence-video-009-source-master");
    expect(csv).toContain("CF27_XBOXUNKNOWN_RTG_EARSHAPE_001");
    expect(csv).not.toContain("/Users/skaggssystems/");
  });
});
