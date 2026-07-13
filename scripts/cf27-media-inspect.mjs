#!/usr/bin/env node
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_MEDIA_INSPECTION_SCHEMA_VERSION = "cf27-media-inspection-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultManifestRoot = "data/research/cf27/manifests/media-inspection";
const defaultGeneratedRoot = "data/research/cf27/generated/media-inspections";
const supportedContainers = new Set(["mp4", "mov", "m4v", "quicktime", "matroska,webm"]);

export async function inspectEvidenceVideo(inputPath, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const manifestRoot = path.resolve(root, options.manifestRoot ?? defaultManifestRoot);
  const generatedRoot = path.resolve(root, options.generatedRoot ?? defaultGeneratedRoot);
  const nowISO = options.nowISO ?? new Date().toISOString();
  const absoluteInputPath = path.resolve(root, inputPath);
  const inputLabel = normalizeRelativePath(path.relative(root, absoluteInputPath));
  const portableRelativeEvidencePath = options.portableRelativeEvidencePath ?? portablePathForInput(absoluteInputPath, root, options.evidenceRootToken);

  if (!fs.existsSync(absoluteInputPath)) {
    return failureReport({
      root,
      manifestRoot,
      generatedRoot,
      inputPath,
      absoluteInputPath,
      portableRelativeEvidencePath,
      nowISO,
      code: "missingInputVideo",
      message: `Input video does not exist: ${inputPath}`
    });
  }

  const stat = fs.statSync(absoluteInputPath);
  if (!stat.isFile()) {
    return failureReport({
      root,
      manifestRoot,
      generatedRoot,
      inputPath,
      absoluteInputPath,
      portableRelativeEvidencePath,
      nowISO,
      code: "inputIsNotFile",
      message: `Input path is not a file: ${inputPath}`
    });
  }

  const sha256 = await sha256FileStream(absoluteInputPath);
  const inspectionID = inspectionIdFor(absoluteInputPath, root, sha256);
  const paths = inspectionPaths({ root, manifestRoot, generatedRoot, inspectionID });
  const existing = readJsonIfExists(paths.report);
  if (!options.force && existing?.sourceVideo?.sha256 === sha256 && outputsComplete(paths)) {
    return {
      ok: true,
      status: "skipped",
      schemaVersion: CF27_MEDIA_INSPECTION_SCHEMA_VERSION,
      inspectionID,
      sourceVideo: existing.sourceVideo,
      outputs: existing.outputs,
      skipReason: "alreadyProcessedUnchanged"
    };
  }

  const tools = resolveTools(options);
  const errors = [];
  const warnings = [];
  fs.mkdirSync(paths.manifestDir, { recursive: true });
  fs.mkdirSync(path.dirname(paths.contactSheet), { recursive: true });

  if (!tools.ffprobe) {
    return failureReport({
      root,
      manifestRoot,
      generatedRoot,
      inputPath,
      absoluteInputPath,
      portableRelativeEvidencePath,
      nowISO,
      sha256,
      sizeBytes: stat.size,
      inspectionID,
      code: "ffprobeUnavailable",
      message: "ffprobe is required for CF27 media inspection. Set CF27_FFPROBE_PATH or install ffprobe on PATH."
    });
  }
  if (!tools.ffmpeg) {
    return failureReport({
      root,
      manifestRoot,
      generatedRoot,
      inputPath,
      absoluteInputPath,
      portableRelativeEvidencePath,
      nowISO,
      sha256,
      sizeBytes: stat.size,
      inspectionID,
      code: "ffmpegUnavailable",
      message: "ffmpeg is required for contact sheets and scene detection. Set CF27_FFMPEG_PATH or install ffmpeg on PATH."
    });
  }

  const ffprobe = runFfprobe(tools.ffprobe, absoluteInputPath);
  if (!ffprobe.ok) {
    return failureReport({
      root,
      manifestRoot,
      generatedRoot,
      inputPath,
      absoluteInputPath,
      portableRelativeEvidencePath,
      nowISO,
      sha256,
      sizeBytes: stat.size,
      inspectionID,
      code: "ffprobeFailed",
      message: ffprobe.error
    });
  }

  const parsedMetadata = parseFfprobe(ffprobe.metadata);
  if (!parsedMetadata.videoStream) {
    return failureReport({
      root,
      manifestRoot,
      generatedRoot,
      inputPath,
      absoluteInputPath,
      portableRelativeEvidencePath,
      nowISO,
      sha256,
      sizeBytes: stat.size,
      inspectionID,
      code: "noVideoStream",
      message: "ffprobe did not report a video stream."
    });
  }
  if (!isSupportedVideoMetadata(parsedMetadata)) {
    return failureReport({
      root,
      manifestRoot,
      generatedRoot,
      inputPath,
      absoluteInputPath,
      portableRelativeEvidencePath,
      nowISO,
      sha256,
      sizeBytes: stat.size,
      inspectionID,
      code: "unsupportedMediaContainer",
      message: `Unsupported or unreadable media container: ${parsedMetadata.containerFormat ?? "unknown"}`
    });
  }

  fs.writeFileSync(paths.ffprobe, `${JSON.stringify(ffprobe.metadata, null, 2)}\n`);

  const sceneIndex = runSceneDetection(tools.ffmpeg, absoluteInputPath, parsedMetadata.durationSeconds, options.sceneThreshold ?? 0.3);
  if (!sceneIndex.ok) {
    errors.push({
      code: "sceneDetectionFailed",
      message: sceneIndex.error
    });
  }
  const contactSheet = runContactSheet(tools.ffmpeg, absoluteInputPath, paths.contactSheet, parsedMetadata.durationSeconds, options.contactSheetColumns ?? 5);
  if (!contactSheet.ok) {
    errors.push({
      code: "contactSheetFailed",
      message: contactSheet.error
    });
  }

  const sceneChanges = sceneIndex.ok ? sceneIndex.timestamps : [];
  const stableFrames = candidateStableFrames(parsedMetadata.durationSeconds, sceneChanges);
  const menuTransitions = sceneChanges.map((timestamp, index) => ({
    transitionID: `transition-${String(index + 1).padStart(3, "0")}`,
    timestampSeconds: timestamp,
    source: "ffmpeg-scene-change",
    confidence: "candidate"
  }));

  const sourceVideo = {
    originalFilename: path.basename(absoluteInputPath),
    inputLabel,
    absoluteInputPathInternal: absoluteInputPath,
    portableRelativeEvidencePath,
    sha256,
    sizeBytes: stat.size,
    preservedMaster: true
  };
  const outputs = {
    manifestDirectory: normalizeRelativePath(path.relative(root, paths.manifestDir)),
    ffprobeMetadataJson: normalizeRelativePath(path.relative(root, paths.ffprobe)),
    mediaReportJson: normalizeRelativePath(path.relative(root, paths.report)),
    sceneChangeIndexJson: normalizeRelativePath(path.relative(root, paths.sceneIndex)),
    stableFrameIndexJson: normalizeRelativePath(path.relative(root, paths.stableIndex)),
    processingErrorReportJson: normalizeRelativePath(path.relative(root, paths.errors)),
    contactSheet: normalizeRelativePath(path.relative(root, paths.contactSheet))
  };
  const media = {
    durationSeconds: parsedMetadata.durationSeconds,
    width: parsedMetadata.width,
    height: parsedMetadata.height,
    frameRate: parsedMetadata.frameRate,
    videoCodec: parsedMetadata.videoCodec,
    audioCodec: parsedMetadata.audioCodec,
    containerFormat: parsedMetadata.containerFormat
  };
  const report = {
    ok: errors.length === 0,
    status: errors.length === 0 ? "processed" : "processedWithErrors",
    schemaVersion: CF27_MEDIA_INSPECTION_SCHEMA_VERSION,
    inspectionID,
    inspectedAt: nowISO,
    dataClass: "RESEARCH_CANDIDATE",
    productionStatus: "NOT_PRODUCTION_DATA",
    sourceVideo,
    media,
    sceneChangeCount: sceneChanges.length,
    candidateMenuTransitionCount: menuTransitions.length,
    candidateStableFrameCount: stableFrames.length,
    outputs,
    warnings,
    preservationNote: "Master video was read only. Contact sheets and indices are derivatives for research review."
  };
  const errorReport = {
    schemaVersion: CF27_MEDIA_INSPECTION_SCHEMA_VERSION,
    inspectionID,
    generatedAt: nowISO,
    ok: errors.length === 0,
    errors,
    warnings
  };

  fs.writeFileSync(paths.sceneIndex, `${JSON.stringify({
    schemaVersion: CF27_MEDIA_INSPECTION_SCHEMA_VERSION,
    inspectionID,
    sceneThreshold: options.sceneThreshold ?? 0.3,
    candidateMenuTransitions: menuTransitions,
    rawSceneChangeTimestampsSeconds: sceneChanges
  }, null, 2)}\n`);
  fs.writeFileSync(paths.stableIndex, `${JSON.stringify({
    schemaVersion: CF27_MEDIA_INSPECTION_SCHEMA_VERSION,
    inspectionID,
    candidateStableFrames: stableFrames
  }, null, 2)}\n`);
  fs.writeFileSync(paths.errors, `${JSON.stringify(errorReport, null, 2)}\n`);
  fs.writeFileSync(paths.report, `${JSON.stringify(report, null, 2)}\n`);

  return report;
}

function failureReport({
  root,
  manifestRoot,
  generatedRoot,
  inputPath,
  absoluteInputPath,
  portableRelativeEvidencePath,
  nowISO,
  sha256 = "unavailable",
  sizeBytes = null,
  inspectionID = null,
  code,
  message
}) {
  const fallbackID = inspectionID ?? inspectionIdFor(absoluteInputPath, root, sha256 === "unavailable" ? crypto.createHash("sha256").update(String(inputPath)).digest("hex") : sha256);
  const paths = inspectionPaths({ root, manifestRoot, generatedRoot, inspectionID: fallbackID });
  fs.mkdirSync(paths.manifestDir, { recursive: true });
  const report = {
    ok: false,
    status: "failed",
    schemaVersion: CF27_MEDIA_INSPECTION_SCHEMA_VERSION,
    inspectionID: fallbackID,
    inspectedAt: nowISO,
    dataClass: "RESEARCH_CANDIDATE",
    productionStatus: "NOT_PRODUCTION_DATA",
    sourceVideo: {
      originalFilename: path.basename(absoluteInputPath),
      inputLabel: inputPath,
      absoluteInputPathInternal: absoluteInputPath,
      portableRelativeEvidencePath,
      sha256,
      sizeBytes,
      preservedMaster: true
    },
    outputs: {
      manifestDirectory: normalizeRelativePath(path.relative(root, paths.manifestDir)),
      processingErrorReportJson: normalizeRelativePath(path.relative(root, paths.errors))
    },
    errors: [{ code, message }],
    preservationNote: "Master video was not modified. No production catalog data was created."
  };
  fs.writeFileSync(paths.errors, `${JSON.stringify({
    schemaVersion: CF27_MEDIA_INSPECTION_SCHEMA_VERSION,
    inspectionID: fallbackID,
    generatedAt: nowISO,
    ok: false,
    errors: report.errors,
    warnings: []
  }, null, 2)}\n`);
  return report;
}

function runFfprobe(ffprobePath, videoPath) {
  const result = spawnSync(ffprobePath, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    videoPath
  ], { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    return {
      ok: false,
      error: result.error?.message ?? (result.stderr.trim() || "ffprobe failed.")
    };
  }
  try {
    return {
      ok: true,
      metadata: JSON.parse(result.stdout)
    };
  } catch {
    return {
      ok: false,
      error: "ffprobe returned invalid JSON."
    };
  }
}

function runSceneDetection(ffmpegPath, videoPath, durationSeconds, threshold) {
  const result = spawnSync(ffmpegPath, [
    "-hide_banner",
    "-i",
    videoPath,
    "-filter:v",
    `select='gt(scene,${threshold})',showinfo`,
    "-f",
    "null",
    "-"
  ], { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    return {
      ok: false,
      error: result.error?.message ?? (result.stderr.trim() || "ffmpeg scene detection failed.")
    };
  }
  return {
    ok: true,
    timestamps: parseSceneTimestamps(`${result.stdout}\n${result.stderr}`, durationSeconds)
  };
}

function runContactSheet(ffmpegPath, videoPath, outputPath, durationSeconds, columns) {
  const interval = Math.max(0.25, Math.round((durationSeconds / Math.max(columns * 2, 1)) * 100) / 100);
  const result = spawnSync(ffmpegPath, [
    "-hide_banner",
    "-y",
    "-i",
    videoPath,
    "-vf",
    `fps=1/${interval},scale=320:-1,tile=${columns}x2`,
    "-frames:v",
    "1",
    outputPath
  ], { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    return {
      ok: false,
      error: result.error?.message ?? (result.stderr.trim() || "ffmpeg contact sheet generation failed.")
    };
  }
  return { ok: true };
}

function parseFfprobe(metadata) {
  const streams = Array.isArray(metadata.streams) ? metadata.streams : [];
  const videoStream = streams.find((stream) => stream.codec_type === "video") ?? null;
  const audioStream = streams.find((stream) => stream.codec_type === "audio") ?? null;
  return {
    videoStream,
    durationSeconds: parseFiniteNumber(metadata.format?.duration ?? videoStream?.duration),
    width: parseFiniteInteger(videoStream?.width),
    height: parseFiniteInteger(videoStream?.height),
    frameRate: frameRateFromString(videoStream?.avg_frame_rate ?? videoStream?.r_frame_rate),
    videoCodec: typeof videoStream?.codec_name === "string" ? videoStream.codec_name : null,
    audioCodec: typeof audioStream?.codec_name === "string" ? audioStream.codec_name : null,
    containerFormat: typeof metadata.format?.format_name === "string" ? metadata.format.format_name : null
  };
}

function isSupportedVideoMetadata(metadata) {
  if (!metadata.videoStream || !metadata.durationSeconds || !metadata.width || !metadata.height) return false;
  const container = String(metadata.containerFormat ?? "").toLowerCase();
  return [...supportedContainers].some((supported) => container.includes(supported));
}

function parseSceneTimestamps(output, durationSeconds) {
  const timestamps = [];
  for (const match of output.matchAll(/pts_time:([0-9]+(?:\.[0-9]+)?)/g)) {
    const timestamp = roundSeconds(Number.parseFloat(match[1]));
    if (Number.isFinite(timestamp) && timestamp > 0 && timestamp < durationSeconds) timestamps.push(timestamp);
  }
  return [...new Set(timestamps)].sort((first, second) => first - second);
}

function candidateStableFrames(durationSeconds, sceneChanges) {
  const boundaries = [0, ...sceneChanges.filter((value) => value > 0 && value < durationSeconds), durationSeconds]
    .sort((first, second) => first - second);
  const candidates = [];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    if (end - start < 0.25) continue;
    candidates.push({
      stableFrameID: `stable-${String(candidates.length + 1).padStart(3, "0")}`,
      timestampSeconds: roundSeconds(start + (end - start) / 2),
      windowStartSeconds: roundSeconds(start),
      windowEndSeconds: roundSeconds(end),
      source: "between-scene-changes",
      confidence: "candidate"
    });
  }
  return candidates;
}

function inspectionPaths({ root, manifestRoot, generatedRoot, inspectionID }) {
  const manifestDir = path.join(manifestRoot, inspectionID);
  return {
    manifestDir,
    ffprobe: path.join(manifestDir, "ffprobe.json"),
    report: path.join(manifestDir, "media-report.json"),
    sceneIndex: path.join(manifestDir, "scene-change-index.json"),
    stableIndex: path.join(manifestDir, "stable-frame-index.json"),
    errors: path.join(manifestDir, "processing-error-report.json"),
    contactSheet: path.join(generatedRoot, `${inspectionID}-contact-sheet.jpg`)
  };
}

function outputsComplete(paths) {
  return [paths.ffprobe, paths.report, paths.sceneIndex, paths.stableIndex, paths.errors, paths.contactSheet].every((file) => fs.existsSync(file));
}

function inspectionIdFor(inputPath, root, sha256) {
  const relative = normalizeRelativePath(path.relative(root, inputPath));
  const parsed = path.parse(relative);
  const base = parsed.name || parsed.base || "extensionless-video";
  const safeBase = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "video";
  return `${safeBase}-${sha256.slice(0, 12)}`;
}

function portablePathForInput(absoluteInputPath, root, evidenceRootToken) {
  const relative = normalizeRelativePath(path.relative(root, absoluteInputPath));
  if (!relative.startsWith("..")) return relative;
  const token = evidenceRootToken ?? "UNASSIGNED_SOURCE_ROOT";
  return `${token}/${path.basename(absoluteInputPath)}`;
}

function resolveTools(options) {
  const ffprobeCandidates = [options.ffprobePath, process.env.CF27_FFPROBE_PATH, "ffprobe"].filter(Boolean);
  const ffmpegCandidates = [options.ffmpegPath, process.env.CF27_FFMPEG_PATH, "ffmpeg"].filter(Boolean);
  return {
    ffprobe: firstWorkingCommand(ffprobeCandidates),
    ffmpeg: firstWorkingCommand(ffmpegCandidates)
  };
}

function firstWorkingCommand(candidates) {
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["-version"], { stdio: "ignore" });
    if (!result.error && result.status === 0) return candidate;
  }
  return null;
}

function readJsonIfExists(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function normalizeRelativePath(value) {
  return value.replaceAll("\\", "/").replace(/^\.\/+/, "").split("/").filter((part) => part && part !== ".").join("/");
}

function parseFiniteNumber(value) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseFiniteInteger(value) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function frameRateFromString(value) {
  if (typeof value !== "string" || value === "0/0") return null;
  const [numerator, denominator] = value.split("/").map((part) => Number.parseFloat(part));
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return Math.round((numerator / denominator) * 1000) / 1000;
}

function roundSeconds(value) {
  return Math.round(value * 1000) / 1000;
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
    "  node scripts/cf27-media-inspect.mjs inspect <video> [--manifest-root <dir>] [--generated-root <dir>] [--force]",
    "",
    "Environment overrides:",
    "  CF27_FFPROBE_PATH=/path/to/ffprobe",
    "  CF27_FFMPEG_PATH=/path/to/ffmpeg",
    "",
    "Preserves source masters and writes deterministic research-only inspection artifacts."
  ].join("\n"));
}

function readFlag(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, inputPath, ...args] = process.argv.slice(2);
  if (!command || command === "--help") {
    printHelp();
    process.exit(0);
  }
  if (command !== "inspect" || !inputPath) {
    printHelp();
    process.exit(1);
  }
  const report = await inspectEvidenceVideo(inputPath, {
    manifestRoot: readFlag(args, "--manifest-root"),
    generatedRoot: readFlag(args, "--generated-root"),
    portableRelativeEvidencePath: readFlag(args, "--portable-path"),
    evidenceRootToken: readFlag(args, "--evidence-root-token"),
    ffprobePath: readFlag(args, "--ffprobe"),
    ffmpegPath: readFlag(args, "--ffmpeg"),
    force: args.includes("--force")
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
