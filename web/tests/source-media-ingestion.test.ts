import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-ignore Root media ingestion CLI is plain ESM JavaScript and is exercised as the command source of truth.
import { classifySourceMedia, discoverSourceMediaFiles, runSourceMediaIngest, stableSourceMediaID } from "../../scripts/source-media-ingest.mjs";

const generatedAt = "2026-08-02T12:00:00.000Z";

describe("source media ingestion", () => {
  it("creates deterministic media IDs from explicit game identity and checksum", () => {
    const checksum = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

    expect(stableSourceMediaID("cf27", checksum)).toBe("GFM_MEDIA_CF27_ABCDEF012345");
    expect(stableSourceMediaID("ea-sports-fc-26", checksum)).toBe("GFM_MEDIA_EA_SPORTS_FC_26_ABCDEF012345");
  });

  it("recursively discovers extensionless, uppercase, and unsupported source files", () => {
    const workspace = createWorkspace();
    fs.mkdirSync(path.join(workspace.root, "source-media", "Game", "nested"), { recursive: true });
    fs.writeFileSync(path.join(workspace.root, "source-media", "Game", "clip.MP4"), Buffer.from("mp4"));
    fs.writeFileSync(path.join(workspace.root, "source-media", "Game", "nested", "352535"), Buffer.from("extensionless"));
    fs.writeFileSync(path.join(workspace.root, "source-media", ".DS_Store"), Buffer.from("metadata"));

    const files = discoverSourceMediaFiles(path.join(workspace.root, "source-media"), workspace.root);

    expect(files.map((file: { relativePath: string }) => file.relativePath)).toEqual([
      "source-media/.DS_Store",
      "source-media/Game/clip.MP4",
      "source-media/Game/nested/352535"
    ]);
  });

  it("keeps FC26 and College Football classifications separated", () => {
    const workspace = createWorkspace();
    writeJson(path.join(workspace.root, "data/research/fc26/player_creator_research.json"), {
      sourceVideos: [{ relativePath: "source-media/Fc26/player-creator/fc26-player-creator-part-01.mp4", originalFilename: "fc26-player-creator-part-01.mp4" }]
    });
    writeJson(path.join(workspace.root, "data/phase-zero/august_2026_source_recordings_ingest.json"), {
      videos: [{
        originalFilename: "EA SPORTS™ College Football 27-2026_08_02-21_13_02.mp4",
        observedContent: "Head & Skin",
        sourceLocation: { portableRelativeEvidencePath: "source-media/NCAA 26/EA SPORTS™ College Football 27-2026_08_02-21_13_02.mp4" }
      }]
    });

    expect(classifySourceMedia(source("source-media/Fc26/player-creator/fc26-player-creator-part-01.mp4"), {}, workspace.root)).toMatchObject({
      suspectedGame: "fc26",
      gameIdentificationConfidence: "high"
    });
    expect(classifySourceMedia(source("source-media/NCAA 26/EA SPORTS™ College Football 27-2026_08_02-21_13_02.mp4"), {}, workspace.root)).toMatchObject({
      suspectedGame: "cf27",
      gameIdentificationConfidence: "high"
    });
  });

  it("does not classify hidden system files as game evidence from folder names alone", () => {
    expect(classifySourceMedia(source("source-media/Fc26/.DS_Store"), {}, createWorkspace().root)).toMatchObject({
      suspectedGame: "unknown",
      suspectedCategory: "unknown_category"
    });
  });

  it("detects exact duplicates and keeps automated records non-production", async () => {
    const workspace = createWorkspace();
    fs.mkdirSync(path.join(workspace.root, "source-media", "Fc26"), { recursive: true });
    const bytes = Buffer.from("duplicate-source");
    fs.writeFileSync(path.join(workspace.root, "source-media", "Fc26", "a.bin"), bytes);
    fs.writeFileSync(path.join(workspace.root, "source-media", "Fc26", "b.bin"), bytes);

    const result = await runSourceMediaIngest({
      root: workspace.root,
      source: "source-media",
      generatedAt,
      runID: "GFM_MEDIA_INGEST_TEST",
      writeOutputs: false
    });

    expect(result.manifest.summary.totalSourceFiles).toBe(2);
    expect(result.manifest.summary.exactDuplicates).toBe(1);
    expect(result.manifest.sources.every((record: { production_status: string }) => record.production_status === "NOT_PRODUCTION_DATA")).toBe(true);
    expect(result.standardizedViews.views).toEqual([]);
  });

  it("imports existing research values as review candidates without second verification or production approval", async () => {
    const workspace = createWorkspace();
    const sourcePath = path.join(workspace.root, "source-media", "Fc26", "player-creator", "fc26-player-creator-part-01.mp4");
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    fs.writeFileSync(sourcePath, Buffer.from("not-a-real-video-but-inventoried"));
    const checksum = crypto.createHash("sha256").update(Buffer.from("not-a-real-video-but-inventoried")).digest("hex");
    writeJson(path.join(workspace.root, "data/research/fc26/player_creator_research.json"), {
      game: { gameID: "ea-sports-fc-26", mode: "Player Creator" },
      sourceVideos: [{ videoID: "fc26-1", relativePath: "source-media/Fc26/player-creator/fc26-player-creator-part-01.mp4", originalFilename: "fc26-player-creator-part-01.mp4" }],
      controls: [{
        controlID: "FC26_TEST_CONTROL",
        label: "Test Control",
        rangeComplete: false,
        observedValues: [{ value: "Test 1", videoID: "fc26-1", timestampSeconds: 3, confidence: "verified" }]
      }]
    });

    const result = await runSourceMediaIngest({
      root: workspace.root,
      source: "source-media",
      generatedAt,
      runID: "GFM_MEDIA_INGEST_TEST",
      writeOutputs: false
    });

    expect(result.manifest.sources[0]).toMatchObject({
      source_media_id: stableSourceMediaID("fc26", checksum),
      suspected_game: "fc26"
    });
    expect(result.candidateManifest.candidates).toHaveLength(1);
    expect(result.candidateManifest.candidates[0]).toMatchObject({
      game_id: "ea-sports-fc-26",
      primary_review_status: "NEEDS_PRIMARY_REVIEW",
      second_verification_status: "NOT_VERIFIED",
      production_status: "NOT_PRODUCTION_DATA"
    });
  });
});

function createWorkspace() {
  return { root: fs.mkdtempSync(path.join(os.tmpdir(), "gfm-source-media-ingest-")) };
}

function source(relativePath: string) {
  return {
    absolutePath: relativePath,
    relativePath,
    originalFilename: path.basename(relativePath),
    topLevelSourceFolder: relativePath.split("/")[1],
    extension: path.extname(relativePath).toLowerCase(),
    sizeBytes: 0,
    filesystemModifiedAt: generatedAt
  };
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
