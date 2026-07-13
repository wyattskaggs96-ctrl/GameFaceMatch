import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root media-inspection CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { inspectEvidenceVideo, inspectEvidenceVideoBatch, sha256FileStream } from "../../scripts/cf27-media-inspect.mjs";

const now = "2026-07-13T10:00:00.000Z";

describe("CF27 media inspection pipeline", () => {
  it("generates deterministic metadata, contact sheet, scene index, stable-frame index, and error report", async () => {
    const fixture = createFixtureWorkspace();
    const videoPath = writeGeneratedVideo(fixture.root, "synthetic-menu.mp4", "video-fixture-v1");
    const beforeHash = await sha256FileStream(videoPath);

    const report = await inspectEvidenceVideo("synthetic-menu.mp4", fixture.options);

    expect(report.ok).toBe(true);
    expect(report.status).toBe("processed");
    expect(report.sourceVideo.sha256).toBe(beforeHash);
    expect(report.media).toMatchObject({
      durationSeconds: 2,
      width: 160,
      height: 90,
      frameRate: 30,
      videoCodec: "h264",
      audioCodec: "aac"
    });
    expect(fs.existsSync(path.join(fixture.root, report.outputs.ffprobeMetadataJson))).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, report.outputs.sceneChangeIndexJson))).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, report.outputs.stableFrameIndexJson))).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, report.outputs.processingErrorReportJson))).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, report.outputs.contactSheet))).toBe(true);
    expect(await sha256FileStream(videoPath)).toBe(beforeHash);

    const sceneIndex = JSON.parse(fs.readFileSync(path.join(fixture.root, report.outputs.sceneChangeIndexJson), "utf8"));
    const stableIndex = JSON.parse(fs.readFileSync(path.join(fixture.root, report.outputs.stableFrameIndexJson), "utf8"));
    expect(sceneIndex.candidateMenuTransitions.map((transition: { timestampSeconds: number }) => transition.timestampSeconds)).toEqual([0.5, 1.25]);
    expect(stableIndex.candidateStableFrames.map((frame: { timestampSeconds: number }) => frame.timestampSeconds)).toEqual([0.25, 0.875, 1.625]);
  });

  it("skips already processed unchanged files", async () => {
    const fixture = createFixtureWorkspace();
    writeGeneratedVideo(fixture.root, "synthetic-menu.mp4", "video-fixture-v1");

    const first = await inspectEvidenceVideo("synthetic-menu.mp4", fixture.options);
    const second = await inspectEvidenceVideo("synthetic-menu.mp4", fixture.options);

    expect(first.status).toBe("processed");
    expect(second.status).toBe("skipped");
    expect(second.skipReason).toBe("alreadyProcessedUnchanged");
    expect(second.inspectionID).toBe(first.inspectionID);
    expect(second.performance.checksumCacheHit).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, "manifests/media-inspection/checksum-cache.json"))).toBe(true);
  });

  it("resumes from valid partial artifacts without rerunning unchanged contact-sheet and scene outputs", async () => {
    const fixture = createFixtureWorkspace();
    writeGeneratedVideo(fixture.root, "synthetic-menu.mp4", "video-fixture-v1");
    const first = await inspectEvidenceVideo("synthetic-menu.mp4", fixture.options);
    fs.unlinkSync(path.join(fixture.root, first.outputs.mediaReportJson));

    const resumed = await inspectEvidenceVideo("synthetic-menu.mp4", fixture.options);

    expect(resumed.status).toBe("processed");
    expect(resumed.inspectionID).toBe(first.inspectionID);
    expect(resumed.performance.reusedArtifacts).toEqual(expect.arrayContaining(["ffprobeMetadataJson", "sceneChangeIndexJson", "contactSheet"]));
    expect(resumed.performance.largeFileStrategy).toBe("streamed-checksum-ffmpeg-subprocess-no-full-video-buffer");
  });

  it("reports progress events and supports cancellation before expensive ffmpeg work", async () => {
    const fixture = createFixtureWorkspace();
    const cancellationFile = path.join(fixture.root, "cancel.flag");
    writeGeneratedVideo(fixture.root, "synthetic-menu.mp4", "video-fixture-v1");
    fs.writeFileSync(cancellationFile, "cancel");
    const stages: string[] = [];

    const report = await inspectEvidenceVideo("synthetic-menu.mp4", {
      ...fixture.options,
      cancellationFile,
      onProgress: (event: { stage: string }) => stages.push(event.stage)
    });

    expect(report.status).toBe("cancelled");
    expect(report.errors.map((error: { code: string }) => error.code)).toContain("processingCancelled");
    expect(stages).toEqual(expect.arrayContaining(["checksum:start", "checksum:complete"]));
    expect(fs.existsSync(path.join(fixture.root, report.outputs.processingErrorReportJson))).toBe(true);
  });

  it("reprocesses changed files by producing a new checksum-addressed inspection ID", async () => {
    const fixture = createFixtureWorkspace();
    const videoPath = writeGeneratedVideo(fixture.root, "synthetic-menu.mp4", "video-fixture-v1");
    const first = await inspectEvidenceVideo("synthetic-menu.mp4", fixture.options);
    fs.writeFileSync(videoPath, Buffer.from("video-fixture-v2"));

    const second = await inspectEvidenceVideo("synthetic-menu.mp4", fixture.options);

    expect(second.status).toBe("processed");
    expect(second.sourceVideo.sha256).not.toBe(first.sourceVideo.sha256);
    expect(second.inspectionID).not.toBe(first.inspectionID);
  });

  it("handles extensionless valid video files when ffprobe accepts them", async () => {
    const fixture = createFixtureWorkspace();
    writeGeneratedVideo(fixture.root, "extensionless-video", "extensionless-valid-video");

    const report = await inspectEvidenceVideo("extensionless-video", fixture.options);

    expect(report.ok).toBe(true);
    expect(report.sourceVideo.originalFilename).toBe("extensionless-video");
    expect(report.outputs.ffprobeMetadataJson).toContain("extensionless-video");
  });

  it("fails clearly on corrupt or unsupported media and writes a processing error report", async () => {
    const fixture = createFixtureWorkspace();
    writeGeneratedVideo(fixture.root, "corrupt-video.mp4", "not-a-valid-video");

    const report = await inspectEvidenceVideo("corrupt-video.mp4", fixture.options);

    expect(report.ok).toBe(false);
    expect(report.status).toBe("failed");
    expect(report.errors.map((error: { code: string }) => error.code)).toContain("ffprobeFailed");
    const errorReportPath = path.join(fixture.root, report.outputs.processingErrorReportJson);
    expect(JSON.parse(fs.readFileSync(errorReportPath, "utf8")).errors[0].code).toBe("ffprobeFailed");
  });

  it("processes multiple large-video candidates sequentially and skips unchanged files on rerun", async () => {
    const fixture = createFixtureWorkspace();
    writeGeneratedVideo(fixture.root, "a-synthetic-menu.mp4", "video-fixture-a");
    writeGeneratedVideo(fixture.root, "b-extensionless-video", "video-fixture-b");
    const events: Array<{ stage: string; inputPath?: string }> = [];

    const first = await inspectEvidenceVideoBatch(["a-synthetic-menu.mp4", "b-extensionless-video"], {
      ...fixture.options,
      onProgress: (event: { stage: string; inputPath?: string }) => events.push(event)
    });
    const second = await inspectEvidenceVideoBatch(["a-synthetic-menu.mp4", "b-extensionless-video"], fixture.options);

    expect(first).toMatchObject({ ok: true, status: "completed", totalInputs: 2, processed: 2, skipped: 0 });
    expect(second).toMatchObject({ ok: true, status: "completed", totalInputs: 2, processed: 0, skipped: 2 });
    expect(events.filter((event) => event.stage === "batch:item:start").map((event) => event.inputPath)).toEqual(["a-synthetic-menu.mp4", "b-extensionless-video"]);
  });
});

function createFixtureWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-cf27-media-inspect-"));
  const tools = path.join(root, "tools");
  fs.mkdirSync(tools);
  const ffprobePath = path.join(tools, "ffprobe");
  const ffmpegPath = path.join(tools, "ffmpeg");
  fs.writeFileSync(ffprobePath, fakeFfprobeScript());
  fs.writeFileSync(ffmpegPath, fakeFfmpegScript());
  fs.chmodSync(ffprobePath, 0o755);
  fs.chmodSync(ffmpegPath, 0o755);
  return {
    root,
    options: {
      root,
      manifestRoot: "manifests/media-inspection",
      generatedRoot: "generated/media-inspections",
      ffprobePath,
      ffmpegPath,
      nowISO: now
    }
  };
}

function writeGeneratedVideo(root: string, filename: string, content: string) {
  const videoPath = path.join(root, filename);
  fs.writeFileSync(videoPath, Buffer.from(content));
  return videoPath;
}

function fakeFfprobeScript() {
  return `#!/bin/sh
for arg in "$@"; do
  if [ "$arg" = "-version" ]; then
    echo "ffprobe synthetic"
    exit 0
  fi
  last="$arg"
done
case "$last" in
  *corrupt*)
    echo "synthetic corrupt media" 1>&2
    exit 1
    ;;
esac
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
for arg in "$@"; do
  if [ "$arg" = "-version" ]; then
    echo "ffmpeg synthetic"
    exit 0
  fi
  last="$arg"
done
if [ "$last" = "-" ]; then
  echo "[Parsed_showinfo_1 @ synthetic] n:0 pts:15 pts_time:0.5 pos:0 fmt:yuv420p" 1>&2
  echo "[Parsed_showinfo_1 @ synthetic] n:1 pts:37 pts_time:1.25 pos:0 fmt:yuv420p" 1>&2
  exit 0
fi
printf "synthetic contact sheet" > "$last"
exit 0
`;
}
