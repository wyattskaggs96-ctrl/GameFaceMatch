import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root source-video CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { inspectSourceVideoAsync, sha256FileStream as sha256SourceVideoFileStream } from "../../scripts/source-video-intake.mjs";
import {
  PHASE0_SOURCE_VIDEO_SCHEMA_VERSION,
  availableFrameExtractionCapability,
  createDerivativeFrameRecord,
  createSourceVideoLocalStore,
  createVideoTimestampReference,
  planDerivativeFrameExtraction,
  previewTimestampReference,
  registerSourceVideo,
  unavailableFrameExtractionCapability,
  validateSourceVideoRecord,
  validateTimestampReference,
  type Phase0SourceVideoFileLike
} from "@/lib/phase-zero/phase-zero-source-video";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 source-video intake", () => {
  it("documents source-video, timestamp, and derivative-frame schema fields", () => {
    const schema = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/schemas/source-video-intake.schema.json"), "utf8"));

    expect(schema.required).toEqual(["schemaVersion", "videos", "timestampReferences", "derivativeFrames"]);
    expect(schema.$defs.sourceVideo.required).toContain("metadata");
    expect(schema.$defs.timestampReference.required).toContain("timestampSeconds");
    expect(schema.$defs.derivativeFrame.properties.derivativeState.const).toBe("derivative");
    expect(schema.$defs.derivativeFrame.required).toContain("sourceVideoProvenance");
  });

  it("registers original source videos as preserved master metadata", () => {
    const video = validVideo();

    expect(video.schemaVersion).toBe(PHASE0_SOURCE_VIDEO_SCHEMA_VERSION);
    expect(video.status).toBe("registered");
    expect(video.metadata).toMatchObject({
      durationSeconds: 93.25,
      width: 1920,
      height: 1080,
      frameRate: 59.94
    });
    expect(video.preservationNote).toMatch(/not serialized, recompressed, or uploaded/);
    expect(JSON.stringify(video)).not.toContain("fileBytes");
    expect(validateSourceVideoRecord(video).errors).toEqual([]);
  });

  it("warns honestly when duration or dimensions are unavailable", () => {
    const video = validVideo({
      durationSeconds: null,
      width: null,
      height: null
    });
    const report = validateSourceVideoRecord(video);

    expect(video.status).toBe("metadataIncomplete");
    expect(report.ok).toBe(true);
    expect(report.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining(["missingDuration", "missingVideoDimensions"]));
  });

  it("rejects unsafe paths, unsupported video types, and invalid checksums", () => {
    const video = validVideo({ relativePath: "../masters/source.mov", type: "application/octet-stream", sha256: "abc" });
    const codes = validateSourceVideoRecord(video).errors.map((error) => error.code);

    expect(codes).toEqual(expect.arrayContaining(["unsafeSourceVideoPath", "unsupportedSourceVideoType", "invalidSha256"]));
  });

  it("records and previews catalog-item timestamp references", () => {
    const video = validVideo();
    const reference = createVideoTimestampReference({
      referenceID: "timestamp-synthetic-front",
      video,
      catalogItemID: "catalog-item-synthetic",
      view: "straightOn",
      timestampSeconds: 12.3456,
      label: "front-view source frame",
      notes: "Synthetic timestamp for source-video testing.",
      createdAt: now
    });
    const preview = previewTimestampReference(video, reference);

    expect(reference.timestampSeconds).toBe(12.346);
    expect(validateTimestampReference(video, reference).errors).toEqual([]);
    expect(preview.mediaFragment).toBe("data/audit/college-football-27/evidence/masters/source-video.mov#t=12.346");
    expect(preview.canPreviewInBrowser).toBe(true);
  });

  it("rejects timestamp references outside the source video duration", () => {
    const video = validVideo({ durationSeconds: 10 });
    const reference = createVideoTimestampReference({
      referenceID: "timestamp-beyond-duration",
      video,
      catalogItemID: null,
      view: "leftProfile",
      timestampSeconds: 11,
      label: "synthetic profile timestamp",
      notes: "Synthetic timestamp beyond duration.",
      createdAt: now
    });

    expect(validateTimestampReference(video, reference).errors.map((error) => error.code)).toContain("timestampBeyondDuration");
  });

  it("gracefully disables derivative frame extraction when FFmpeg is unavailable", () => {
    const plan = planDerivativeFrameExtraction(extractionRequest(), unavailableFrameExtractionCapability("ffmpeg was not found on PATH."));

    expect(plan.status).toBe("disabled");
    expect(plan.command).toEqual([]);
    expect(plan.warnings).toContain("ffmpeg was not found on PATH.");
  });

  it("creates extraction plans that never overwrite or recompress source video masters", () => {
    const plan = planDerivativeFrameExtraction(extractionRequest(), availableFrameExtractionCapability());

    expect(plan.status).toBe("ready");
    expect(plan.command).toEqual([
      "ffmpeg",
      "-y",
      "-ss",
      "12.346",
      "-i",
      "data/audit/college-football-27/evidence/masters/source-video.mov",
      "-frames:v",
      "1",
      "data/audit/college-football-27/evidence/derivatives/source-video-front.png"
    ]);
    expect(plan.preservationNote).toMatch(/master source video is input-only/);
    expect(plan.sourceRelativePath).not.toBe(plan.outputRelativePath);
  });

  it("marks extracted frame records as derivatives with provenance", () => {
    const request = extractionRequest();
    const frame = createDerivativeFrameRecord(request);

    expect(frame.derivativeState).toBe("derivative");
    expect(frame.sourceVideoProvenance).toMatchObject({
      videoID: request.sourceVideo.videoID,
      originalFilename: request.sourceVideo.originalFilename,
      relativePath: request.sourceVideo.relativePath
    });
    expect(frame.view).toBe("straightOn");
    expect(JSON.stringify(frame)).not.toContain("fileBytes");
  });

  it("stores only source-video metadata in local storage", () => {
    const storage = fakeStorage();
    const store = createSourceVideoLocalStore(storage);
    store.save([validVideo()]);
    const raw = storage.getItem("gameface-match.phase0.source-video.metadata.v1") ?? "";

    expect(store.load()).toHaveLength(1);
    expect(raw).toContain("source-video.mov");
    expect(raw).not.toContain("data:video");
    expect(raw).not.toContain("ArrayBuffer");
    store.clear();
    expect(store.load()).toEqual([]);
  });

  it("streams source-video checksums without serializing video bytes", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-source-video-"));
    const videoPath = path.join(tempDir, "synthetic-source.mov");
    fs.writeFileSync(videoPath, Buffer.alloc(1024 * 1024 + 17, 7));

    const report = await inspectSourceVideoAsync("synthetic-source.mov", { root: tempDir, nowISO: now });

    expect(report.ok).toBe(true);
    expect(report.performance).toEqual({ checksumMode: "streaming-sha256" });
    expect(report.sourceVideo.sha256).toBe(await sha256SourceVideoFileStream(videoPath));
    expect(JSON.stringify(report)).not.toContain("fileBytes");
    expect(JSON.stringify(report)).not.toContain("ArrayBuffer");
  });
});

function validVideo(overrides: Partial<Phase0SourceVideoFileLike> = {}) {
  return registerSourceVideo({
    videoID: "source-video-synthetic",
    file: {
      name: "source-video.mov",
      size: 4096,
      type: "video/quicktime",
      lastModified: 1783814400000,
      relativePath: "data/audit/college-football-27/evidence/masters/source-video.mov",
      durationSeconds: 93.25,
      width: 1920,
      height: 1080,
      frameRate: 59.94,
      videoCodec: "h264",
      audioCodec: "aac",
      containerFormat: "mov",
      sha256: "a".repeat(64),
      ...overrides
    },
    captureMethod: "captureCard",
    captureDevice: "synthetic-capture-card",
    platformID: "platform-synthetic",
    gameVersionID: "game-version-synthetic",
    patchID: "patch-synthetic",
    mode: "synthetic-mode",
    creationPathID: "creation-path-synthetic",
    environmentID: "environment-synthetic",
    registeredAt: now,
    notes: "Synthetic source-video metadata."
  });
}

function extractionRequest() {
  const video = validVideo();
  const timestampReference = createVideoTimestampReference({
    referenceID: "timestamp-synthetic-front",
    video,
    catalogItemID: "catalog-item-synthetic",
    view: "straightOn",
    timestampSeconds: 12.3456,
    label: "front-view source frame",
    notes: "Synthetic timestamp for extraction testing.",
    createdAt: now
  });
  return {
    sourceVideo: video,
    timestampReference,
    outputRelativePath: "data/audit/college-football-27/evidence/derivatives/source-video-front.png",
    outputFrameID: "frame-synthetic-front",
    fileRole: "standardAngle" as const,
    extractedAt: now
  };
}

function fakeStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    }
  };
}
