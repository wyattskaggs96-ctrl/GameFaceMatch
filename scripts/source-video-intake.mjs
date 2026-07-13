#!/usr/bin/env node
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SOURCE_VIDEO_INTAKE_SCHEMA_VERSION = "phase0-source-video-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const videoMimeTypes = new Map([
  [".mp4", "video/mp4"],
  [".mov", "video/quicktime"],
  [".webm", "video/webm"]
]);

export function inspectSourceVideo(videoPath, { root = repositoryRoot, nowISO = new Date().toISOString() } = {}) {
  const absolutePath = path.resolve(root, videoPath);
  if (!fs.existsSync(absolutePath)) {
    return {
      ok: false,
      code: "missingSourceVideo",
      message: `Source video does not exist: ${videoPath}`
    };
  }
  const stat = fs.statSync(absolutePath);
  const ffprobe = commandExists("ffprobe");
  const metadata = ffprobe ? readFfprobeMetadata(absolutePath) : unavailableMetadata("ffprobe is unavailable; duration and stream metadata must be entered manually.");
  return {
    ok: true,
    schemaVersion: SOURCE_VIDEO_INTAKE_SCHEMA_VERSION,
    inspectedAt: nowISO,
    sourceVideo: {
      originalFilename: path.basename(absolutePath),
      relativePath: normalizeRelativePath(path.relative(root, absolutePath)),
      sha256: sha256File(absolutePath),
      sizeBytes: stat.size,
      mimeType: mimeTypeForPath(absolutePath),
      lastModified: stat.mtimeMs,
      metadata,
      preservationNote: "Original source video was inspected only; the file was not modified, recompressed, or uploaded."
    },
    capabilities: {
      ffprobe: ffprobe ? "available" : "unavailable",
      ffmpeg: commandExists("ffmpeg") ? "available" : "unavailable"
    }
  };
}

export async function inspectSourceVideoAsync(videoPath, { root = repositoryRoot, nowISO = new Date().toISOString() } = {}) {
  const absolutePath = path.resolve(root, videoPath);
  if (!fs.existsSync(absolutePath)) {
    return {
      ok: false,
      code: "missingSourceVideo",
      message: `Source video does not exist: ${videoPath}`
    };
  }
  const stat = fs.statSync(absolutePath);
  const ffprobe = commandExists("ffprobe");
  const metadata = ffprobe ? readFfprobeMetadata(absolutePath) : unavailableMetadata("ffprobe is unavailable; duration and stream metadata must be entered manually.");
  return {
    ok: true,
    schemaVersion: SOURCE_VIDEO_INTAKE_SCHEMA_VERSION,
    inspectedAt: nowISO,
    sourceVideo: {
      originalFilename: path.basename(absolutePath),
      relativePath: normalizeRelativePath(path.relative(root, absolutePath)),
      sha256: await sha256FileStream(absolutePath),
      sizeBytes: stat.size,
      mimeType: mimeTypeForPath(absolutePath),
      lastModified: stat.mtimeMs,
      metadata,
      preservationNote: "Original source video was inspected only; the file was not modified, recompressed, or uploaded."
    },
    capabilities: {
      ffprobe: ffprobe ? "available" : "unavailable",
      ffmpeg: commandExists("ffmpeg") ? "available" : "unavailable"
    },
    performance: {
      checksumMode: "streaming-sha256"
    }
  };
}

export function extractSourceVideoFrame({
  videoPath,
  timestampSeconds,
  outputPath,
  root = repositoryRoot,
  checksumMode = "sync"
}) {
  const absoluteVideoPath = path.resolve(root, videoPath);
  const absoluteOutputPath = path.resolve(root, outputPath);
  if (!commandExists("ffmpeg")) {
    return {
      ok: false,
      status: "disabled",
      code: "frameExtractionUnavailable",
      message: "FFmpeg is unavailable. Register timestamp metadata and extract frames later from an environment with FFmpeg installed.",
      outputPath: normalizeRelativePath(path.relative(root, absoluteOutputPath))
    };
  }
  if (!fs.existsSync(absoluteVideoPath)) {
    return {
      ok: false,
      status: "failed",
      code: "missingSourceVideo",
      message: `Source video does not exist: ${videoPath}`
    };
  }
  if (path.resolve(absoluteVideoPath) === path.resolve(absoluteOutputPath)) {
    return {
      ok: false,
      status: "failed",
      code: "wouldOverwriteMaster",
      message: "Output frame path must differ from the source video path."
    };
  }
  fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
  const result = spawnSync("ffmpeg", [
    "-y",
    "-ss",
    String(timestampSeconds),
    "-i",
    absoluteVideoPath,
    "-frames:v",
    "1",
    absoluteOutputPath
  ], { encoding: "utf8" });
  if (result.status !== 0) {
    return {
      ok: false,
      status: "failed",
      code: "frameExtractionFailed",
      message: result.stderr.trim() || "FFmpeg frame extraction failed."
    };
  }
  const stat = fs.statSync(absoluteOutputPath);
  return {
    ok: true,
    status: "extracted",
    derivativeFrame: {
      relativePath: normalizeRelativePath(path.relative(root, absoluteOutputPath)),
      derivativeState: "derivative",
      sha256: checksumMode === "defer" ? "" : sha256File(absoluteOutputPath),
      sizeBytes: stat.size,
      mimeType: mimeTypeForPath(absoluteOutputPath),
      timestampSeconds,
      sourceVideoRelativePath: normalizeRelativePath(path.relative(root, absoluteVideoPath)),
      preservationNote: "Source video was used as input only. The original master file was not recompressed or modified."
    }
  };
}

export async function extractSourceVideoFrameAsync(input) {
  const report = extractSourceVideoFrame({ ...input, checksumMode: "defer" });
  if (report.ok && report.derivativeFrame?.relativePath) {
    const absoluteOutputPath = path.resolve(input.root ?? repositoryRoot, report.derivativeFrame.relativePath);
    report.derivativeFrame.sha256 = await sha256FileStream(absoluteOutputPath);
    report.performance = { checksumMode: "streaming-sha256" };
  }
  return report;
}

function readFfprobeMetadata(videoPath) {
  const result = spawnSync("ffprobe", [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    videoPath
  ], { encoding: "utf8" });
  if (result.status !== 0) return unavailableMetadata(result.stderr.trim() || "ffprobe could not read video metadata.");
  try {
    const parsed = JSON.parse(result.stdout);
    const videoStream = Array.isArray(parsed.streams) ? parsed.streams.find((stream) => stream.codec_type === "video") : null;
    const audioStream = Array.isArray(parsed.streams) ? parsed.streams.find((stream) => stream.codec_type === "audio") : null;
    return {
      durationSeconds: parseFiniteNumber(parsed.format?.duration ?? videoStream?.duration),
      width: parseFiniteInteger(videoStream?.width),
      height: parseFiniteInteger(videoStream?.height),
      frameRate: frameRateFromString(videoStream?.avg_frame_rate),
      videoCodec: typeof videoStream?.codec_name === "string" ? videoStream.codec_name : null,
      audioCodec: typeof audioStream?.codec_name === "string" ? audioStream.codec_name : null,
      containerFormat: typeof parsed.format?.format_name === "string" ? parsed.format.format_name : null,
      metadataSource: "ffprobe"
    };
  } catch {
    return unavailableMetadata("ffprobe returned unreadable metadata.");
  }
}

function unavailableMetadata(reason) {
  return {
    durationSeconds: null,
    width: null,
    height: null,
    frameRate: null,
    videoCodec: null,
    audioCodec: null,
    containerFormat: null,
    metadataSource: "manual-entry-required",
    reason
  };
}

function commandExists(command) {
  const result = spawnSync(command, ["-version"], { stdio: "ignore" });
  return !result.error && result.status === 0;
}

function frameRateFromString(value) {
  if (typeof value !== "string" || value === "0/0") return null;
  const [numerator, denominator] = value.split("/").map((part) => Number.parseFloat(part));
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return Math.round((numerator / denominator) * 1000) / 1000;
}

function parseFiniteNumber(value) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseFiniteInteger(value) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function mimeTypeForPath(filePath) {
  return videoMimeTypes.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream";
}

function normalizeRelativePath(value) {
  return value.replaceAll("\\", "/").replace(/^\.\/+/, "").split("/").filter((part) => part && part !== ".").join("/");
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

export function sha256FileStream(filePath, { highWaterMark = 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath, { highWaterMark });
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function printHelp() {
  console.log([
    "Usage:",
    "  node scripts/source-video-intake.mjs inspect <source-video>",
    "  node scripts/source-video-intake.mjs extract-frame <source-video> <timestamp-seconds> <output-frame>",
    "",
    "Inspects local source videos and optionally extracts derivative still frames when FFmpeg is installed.",
    "Original source videos are never recompressed, renamed, uploaded, or modified."
  ].join("\n"));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "--help") {
    printHelp();
    process.exit(0);
  }
  if (command === "inspect") {
    const report = await inspectSourceVideoAsync(args[0] ?? "");
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  }
  if (command === "extract-frame") {
    const report = await extractSourceVideoFrameAsync({
      videoPath: args[0] ?? "",
      timestampSeconds: Number.parseFloat(args[1] ?? ""),
      outputPath: args[2] ?? ""
    });
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.status === "failed" ? 1 : 0);
  }
  printHelp();
  process.exit(1);
}
