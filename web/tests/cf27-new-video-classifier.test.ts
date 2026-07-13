import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root new-video classifier is plain ESM JavaScript and is exercised here as the command source of truth.
import { acceptClassificationReport, classifyNewVideoBatch, identifyVisibleMenuHeadingFromImage, suggestWorkingFilename } from "../../scripts/cf27-new-video-classifier.mjs";
// @ts-expect-error Root media inspection CLI is plain ESM JavaScript and shares the streaming checksum utility.
import { sha256FileStream } from "../../scripts/cf27-media-inspect.mjs";

const now = "2026-07-13T14:00:00.000Z";
const fixtureImageRoot = path.resolve(process.cwd(), "../data/fixtures/test-only/cf27/new-video-classification");

describe("CF27 new-video classification and relabeling", () => {
  it("identifies controlled menu headings from static menu-like test fixture images", () => {
    const head = identifyVisibleMenuHeadingFromImage(path.join(fixtureImageRoot, "head-template-menu.svg"));
    const skin = identifyVisibleMenuHeadingFromImage(path.join(fixtureImageRoot, "skin-tone-menu.svg"));

    expect(head).toMatchObject({ status: "detected", heading: "Head Template", category: "head_templates" });
    expect(skin).toMatchObject({ status: "detected", heading: "Skin Tone", category: "skin_tones" });
    expect(suggestWorkingFilename({ sequence: 2, originalFilename: "owner-upload", detectedHeading: skin })).toBe("02_Skin_Tone.mp4");
  });

  it("scans intake videos, generates reports, suggests working filenames, and preserves masters", async () => {
    const fixture = createWorkspace();
    const headVideo = writeGeneratedVideo(fixture.intakeDir, "owner-head-template-upload.MOV", "head-template-video");
    const extensionlessVideo = writeGeneratedVideo(fixture.intakeDir, "owner-skin-tone-extensionless", "skin-tone-video");
    const headHashBefore = await sha256FileStream(headVideo);
    const extensionlessHashBefore = await sha256FileStream(extensionlessVideo);

    const report = await classifyNewVideoBatch("intake", fixture.options);

    expect(report.schemaVersion).toBe("cf27-new-video-classification-v1");
    expect(report.totalFilesScanned).toBe(2);
    expect(report.acceptanceRequired).toBe(true);
    expect(report.destructiveRenamePerformed).toBe(false);
    expect(report.records.map((record: { originalFilename: string }) => record.originalFilename)).toEqual([
      "owner-head-template-upload.MOV",
      "owner-skin-tone-extensionless"
    ]);
    expect(report.records[0]).toMatchObject({
      visibleMenuHeading: { heading: "Head Template", category: "head_templates" },
      suggestedWorkingFilename: "01_Head_Templates.mov",
      acceptance: { status: "pendingOperatorAcceptance" },
      destructiveRenamePerformed: false
    });
    expect(report.records[1]).toMatchObject({
      visibleMenuHeading: { heading: "Skin Tone", category: "skin_tones" },
      suggestedWorkingFilename: "02_Skin_Tone.mp4",
      acceptance: { status: "pendingOperatorAcceptance" }
    });
    expect(fs.existsSync(path.join(fixture.root, report.records[0].contactSheet))).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, "classification/new_video_classification_report.json"))).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, "classification/pending_manifest_update.json"))).toBe(true);
    expect(await sha256FileStream(headVideo)).toBe(headHashBefore);
    expect(await sha256FileStream(extensionlessVideo)).toBe(extensionlessHashBefore);
  });

  it("detects exact duplicates, likely continuations, and category overlaps without auto-accepting records", async () => {
    const fixture = createWorkspace();
    const duplicateVideo = writeGeneratedVideo(fixture.intakeDir, "duplicate-head-template.mov", "duplicate-head-template");
    const duplicateHash = await sha256FileStream(duplicateVideo);
    writeGeneratedVideo(fixture.intakeDir, "head-template-part-2.mov", "head-template-continuation");
    writeCanonicalInventory(fixture.root, [
      {
        inventoryId: "video-existing-head",
        sha256: duplicateHash,
        fileSizeBytes: fs.statSync(duplicateVideo).size,
        durationSeconds: 2,
        workingFilename: "Existing_Head_Template.mov",
        identifiedContent: "Head Template captures"
      }
    ]);

    const report = await classifyNewVideoBatch("intake", fixture.options);
    const duplicate = report.records.find((record: { originalFilename: string }) => record.originalFilename === "duplicate-head-template.mov");
    const continuation = report.records.find((record: { originalFilename: string }) => record.originalFilename === "head-template-part-2.mov");

    expect(duplicate.duplicateSignals).toMatchObject({
      exactDuplicate: true,
      exactDuplicateOf: ["video-existing-head"]
    });
    expect(duplicate.classificationLabel).toBe("EXACT_DUPLICATE_REVIEW_ONLY");
    expect(continuation.continuation.likelyContinuation).toBe(true);
    expect(continuation.categoryOverlap.overlapsKnownCategory).toBe(true);
    expect(report.records.every((record: { acceptance: { status: string } }) => record.acceptance.status === "pendingOperatorAcceptance")).toBe(true);
  });

  it("requires explicit operator acceptance before updating the canonical manifest", async () => {
    const fixture = createWorkspace();
    writeGeneratedVideo(fixture.intakeDir, "owner-skin-tone.MP4", "skin-tone-video");
    const report = await classifyNewVideoBatch("intake", fixture.options);
    const reportPath = path.join(fixture.root, "reviewed-report.json");
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

    const rejected = acceptClassificationReport("reviewed-report.json", {
      root: fixture.root,
      canonicalManifestPath: "canonical.csv"
    });
    expect(rejected).toMatchObject({ ok: false, status: "noAcceptedRecords" });
    expect(fs.existsSync(path.join(fixture.root, "canonical.csv"))).toBe(false);

    report.records[0].acceptance.status = "operatorAccepted";
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    const accepted = acceptClassificationReport("reviewed-report.json", {
      root: fixture.root,
      canonicalManifestPath: "canonical.csv"
    });
    const manifestText = fs.readFileSync(path.join(fixture.root, "canonical.csv"), "utf8");

    expect(accepted).toMatchObject({ ok: true, status: "accepted", appendedRows: 1 });
    expect(manifestText).toContain("owner-skin-tone.MP4");
    expect(manifestText).toContain("01_Skin_Tone.mp4");
  });
});

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-cf27-new-video-classifier-"));
  const intakeDir = path.join(root, "intake");
  const tools = path.join(root, "tools");
  fs.mkdirSync(intakeDir, { recursive: true });
  fs.mkdirSync(tools, { recursive: true });
  const ffprobePath = path.join(tools, "ffprobe");
  const ffmpegPath = path.join(tools, "ffmpeg");
  fs.writeFileSync(ffprobePath, fakeFfprobeScript());
  fs.writeFileSync(ffmpegPath, fakeFfmpegScript());
  fs.chmodSync(ffprobePath, 0o755);
  fs.chmodSync(ffmpegPath, 0o755);
  writeCanonicalInventory(root, []);
  return {
    root,
    intakeDir,
    options: {
      root,
      outputRoot: "classification",
      canonicalInventoryPath: "video_inventory.json",
      mediaManifestRoot: "manifests/media-inspection",
      mediaGeneratedRoot: "generated/media-inspections",
      evidenceRootToken: "TEST_INTAKE",
      ffprobePath,
      ffmpegPath,
      nowISO: now,
      force: true
    }
  };
}

function writeGeneratedVideo(directory: string, filename: string, content: string) {
  const videoPath = path.join(directory, filename);
  fs.writeFileSync(videoPath, Buffer.from(content));
  return videoPath;
}

function writeCanonicalInventory(root: string, inventory: Array<Record<string, unknown>>) {
  fs.writeFileSync(path.join(root, "video_inventory.json"), `${JSON.stringify({ inventory }, null, 2)}\n`);
}

function fakeFfprobeScript() {
  return `#!/bin/sh
for arg in "$@"; do
  if [ "$arg" = "-version" ]; then
    echo "ffprobe synthetic"
    exit 0
  fi
done
cat <<'JSON'
{
  "streams": [
    {
      "codec_type": "video",
      "codec_name": "h264",
      "width": 160,
      "height": 90,
      "avg_frame_rate": "30/1",
      "duration": "2.000000"
    },
    {
      "codec_type": "audio",
      "codec_name": "aac"
    }
  ],
  "format": {
    "duration": "2.000000",
    "format_name": "mov,mp4,m4a,3gp,3g2,mj2"
  }
}
JSON
`;
}

function fakeFfmpegScript() {
  return `#!/bin/sh
input=""
last=""
previous=""
for arg in "$@"; do
  if [ "$previous" = "-i" ]; then
    input="$arg"
  fi
  previous="$arg"
  last="$arg"
  if [ "$arg" = "-version" ]; then
    echo "ffmpeg synthetic"
    exit 0
  fi
done
if [ "$last" = "-" ]; then
  echo "[Parsed_showinfo_1 @ synthetic] n:0 pts:15 pts_time:0.5 pos:0 fmt:yuv420p" 1>&2
  echo "[Parsed_showinfo_1 @ synthetic] n:1 pts:37 pts_time:1.25 pos:0 fmt:yuv420p" 1>&2
  exit 0
fi
case "$input" in
  *skin*tone*|*Skin*Tone*)
    heading="Skin Tone"
    ;;
  *)
    heading="Head Template"
    ;;
esac
printf "<svg><text>%s</text><text>SYNTHETIC TEST FRAME - NOT GAME EVIDENCE</text></svg>" "$heading" > "$last"
exit 0
`;
}
