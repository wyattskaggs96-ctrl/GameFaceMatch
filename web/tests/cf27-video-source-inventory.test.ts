import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root inventory CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { createVideoSourceInventory, parseFfmpegMetadata } from "../../scripts/cf27-video-source-inventory.mjs";

describe("CF27 video source inventory", () => {
  it("detects exact duplicate source files by SHA-256 without modifying masters", async () => {
    const fixture = createFixtureWorkspace();
    const content = Buffer.from("synthetic-video-master");
    fs.writeFileSync(path.join(fixture.sourceRoot, "skin-tone-master.MP4"), content);
    fs.writeFileSync(path.join(fixture.sourceRoot, "skin-tone-copy.MP4"), content);
    fs.writeFileSync(path.join(fixture.sourceRoot, "RELABELED_VIDEO_MANIFEST.csv"), [
      "sequence,new_filename,original_filename,identified_content,duration_seconds,notes",
      "1,04_Skin_Tone.mp4,skin-tone-master.MP4,Skin Tone menu and options,53.821,Unique master"
    ].join("\n"));
    const before = fs.readFileSync(path.join(fixture.sourceRoot, "skin-tone-master.MP4"));

    const report = await createVideoSourceInventory({
      root: fixture.root,
      sourceRoot: fixture.sourceRoot,
      manifestPath: path.join(fixture.sourceRoot, "RELABELED_VIDEO_MANIFEST.csv"),
      ffmpegTool: fixture.ffmpegWrapper,
      outputJson: "data/phase-zero/video_inventory.json",
      outputCsv: "data/phase-zero/video_inventory.csv",
      outputMarkdown: "docs/phase-zero/VIDEO_SOURCE_INVENTORY.md",
      generatedAt: "2026-07-13T12:00:00.000Z"
    });

    expect(report.summary.inventoryRows).toBe(2);
    expect(report.summary.uniqueVideoFiles).toBe(1);
    expect(report.summary.exactDuplicateFiles).toBe(1);
    const duplicate = report.inventory.find((item: { discoveredFilename: string }) => item.discoveredFilename === "skin-tone-copy.MP4");
    expect(duplicate).toMatchObject({
      exactDuplicate: true,
      conditionAssessment: "exact_duplicate_reference_only",
      productionUseStatus: "not_production_data"
    });
    expect(fs.readFileSync(path.join(fixture.sourceRoot, "skin-tone-master.MP4"))).toEqual(before);
  });

  it("reports missing manifest source files as non-usable inventory rows", async () => {
    const fixture = createFixtureWorkspace();
    fs.writeFileSync(path.join(fixture.sourceRoot, "RELABELED_VIDEO_MANIFEST.csv"), [
      "sequence,new_filename,original_filename,identified_content,duration_seconds,notes",
      "1,08_Nose.mp4,missing-nose-source,Nose menu and options,32.449,Original lacked extension"
    ].join("\n"));

    const report = await createVideoSourceInventory({
      root: fixture.root,
      sourceRoot: fixture.sourceRoot,
      manifestPath: path.join(fixture.sourceRoot, "RELABELED_VIDEO_MANIFEST.csv"),
      ffmpegTool: fixture.ffmpegWrapper,
      outputJson: "data/phase-zero/video_inventory.json",
      outputCsv: "data/phase-zero/video_inventory.csv",
      outputMarkdown: "docs/phase-zero/VIDEO_SOURCE_INVENTORY.md",
      generatedAt: "2026-07-13T12:00:00.000Z"
    });

    expect(report.summary.missingManifestFiles).toBe(1);
    expect(report.inventory[0]).toMatchObject({
      discoveredFilename: null,
      fileOpenStatus: "missing",
      conditionAssessment: "missing",
      suitability: {
        menuEvidence: false,
        countEvidence: false,
        orderingEvidence: false,
        visualComparison: false,
        productionQualityCatalogImagery: false
      }
    });
  });

  it("parses FFmpeg metadata used by the inventory wrapper", () => {
    const metadata = parseFfmpegMetadata(`Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'source.MP4':
  Duration: 00:00:29.33, start: 0.000000, bitrate: 19972 kb/s
  Stream #0:0: Video: h264 (Main), yuv420p(tv, bt709), 1920x1080, 58.96 fps, 59.94 tbr
  Stream #0:1: Audio: aac (LC), 48000 Hz, stereo
`);

    expect(metadata).toMatchObject({
      container: "MP4",
      durationSeconds: 29.33,
      dimensions: { width: 1920, height: 1080 },
      frameRate: 58.96,
      videoCodec: "h264 (Main)",
      audioCodec: "aac (LC)"
    });
  });
});

function createFixtureWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-cf27-video-inventory-"));
  const sourceRoot = path.join(root, "source-videos");
  const tools = path.join(root, "tools");
  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.mkdirSync(tools, { recursive: true });
  const ffmpegWrapper = path.join(tools, "ffmpeg-wrapper");
  fs.writeFileSync(ffmpegWrapper, fakeFfmpegWrapperScript());
  fs.chmodSync(ffmpegWrapper, 0o755);
  return { root, sourceRoot, ffmpegWrapper };
}

function fakeFfmpegWrapperScript() {
  return `#!/bin/sh
if [ "$1" = "ffmpeg" ]; then
  shift
fi
for arg in "$@"; do
  last="$arg"
done
cat >&2 <<'EOF'
Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'fixture.MP4':
  Duration: 00:00:53.82, start: 0.000000, bitrate: 19097 kb/s
  Stream #0:0: Video: h264 (Main), yuv420p(tv, bt709), 1920x1080, 58.97 fps, 59.94 tbr
  Stream #0:1: Audio: aac (LC), 48000 Hz, stereo
EOF
exit 0
`;
}
