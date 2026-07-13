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
const checksumCacheFilename = "checksum-cache.json";

export async function inspectEvidenceVideo(inputPath, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const manifestRoot = path.resolve(root, options.manifestRoot ?? defaultManifestRoot);
  const generatedRoot = path.resolve(root, options.generatedRoot ?? defaultGeneratedRoot);
  const nowISO = options.nowISO ?? new Date().toISOString();
  const startedAtMs = Date.now();
  const startedRss = process.memoryUsage().rss;
  const absoluteInputPath = path.resolve(root, inputPath);
  const inputLabel = normalizeRelativePath(path.relative(root, absoluteInputPath));
  const portableRelativeEvidencePath = options.portableRelativeEvidencePath ?? portablePathForInput(absoluteInputPath, root, options.evidenceRootToken);
  const progress = createProgressReporter(options);

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

  const checksum = await checksumForFile(absoluteInputPath, { root, manifestRoot, nowISO, force: options.force, progress });
  const sha256 = checksum.sha256;
  const inspectionID = inspectionIdFor(absoluteInputPath, root, sha256);
  const paths = inspectionPaths({ root, manifestRoot, generatedRoot, inspectionID });
  const basePerformance = {
    startedAt: nowISO,
    sourceSizeBytes: stat.size,
    checksumCacheHit: checksum.cacheHit,
    checksumDurationMs: checksum.durationMs,
    reusedArtifacts: [],
    generatedArtifacts: [],
    skippedArtifacts: [],
    cancellationChecks: 0,
    memoryRssStartBytes: startedRss
  };
  const cancellation = createCancellationChecker(options, paths, root, startedAtMs);
  const initialCancellation = cancellation.check("before-existing-report-check", basePerformance);
  if (initialCancellation) return initialCancellation;
  const existing = readJsonIfExists(paths.report);
  if (!options.force && existing?.sourceVideo?.sha256 === sha256 && outputsComplete(paths)) {
    progress("skipped", {
      inputPath,
      inspectionID,
      reason: "alreadyProcessedUnchanged"
    });
    return {
      ok: true,
      status: "skipped",
      schemaVersion: CF27_MEDIA_INSPECTION_SCHEMA_VERSION,
      inspectionID,
      sourceVideo: existing.sourceVideo,
      outputs: existing.outputs,
      skipReason: "alreadyProcessedUnchanged",
      performance: finalizePerformance({
        ...basePerformance,
        reusedArtifacts: ["ffprobeMetadataJson", "mediaReportJson", "sceneChangeIndexJson", "stableFrameIndexJson", "processingErrorReportJson", "contactSheet"]
      }, startedAtMs)
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

  const ffprobeCancellation = cancellation.check("before-ffprobe", basePerformance);
  if (ffprobeCancellation) return ffprobeCancellation;
  progress("ffprobe:start", { inputPath, inspectionID });
  const ffprobe = existingFileUsable(paths.ffprobe, options.force)
    ? { ok: true, metadata: readJsonIfExists(paths.ffprobe), reused: true }
    : runFfprobe(tools.ffprobe, absoluteInputPath);
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
  if (ffprobe.reused) basePerformance.reusedArtifacts.push("ffprobeMetadataJson");
  else basePerformance.generatedArtifacts.push("ffprobeMetadataJson");

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

  if (!ffprobe.reused) fs.writeFileSync(paths.ffprobe, `${JSON.stringify(ffprobe.metadata, null, 2)}\n`);

  const sceneCancellation = cancellation.check("before-scene-detection", basePerformance);
  if (sceneCancellation) return sceneCancellation;
  progress("scene-detection:start", { inputPath, inspectionID });
  const sceneIndex = reusableSceneIndex(paths.sceneIndex, options.force) ?? runSceneDetection(tools.ffmpeg, absoluteInputPath, parsedMetadata.durationSeconds, options.sceneThreshold ?? 0.3);
  if (!sceneIndex.ok) {
    errors.push({
      code: "sceneDetectionFailed",
      message: sceneIndex.error
    });
  }
  if (sceneIndex.reused) basePerformance.reusedArtifacts.push("sceneChangeIndexJson");
  else basePerformance.generatedArtifacts.push("sceneChangeIndexJson");

  const contactSheetCancellation = cancellation.check("before-contact-sheet", basePerformance);
  if (contactSheetCancellation) return contactSheetCancellation;
  progress("contact-sheet:start", { inputPath, inspectionID });
  const contactSheet = existingFileUsable(paths.contactSheet, options.force)
    ? { ok: true, reused: true }
    : runContactSheet(tools.ffmpeg, absoluteInputPath, paths.contactSheet, parsedMetadata.durationSeconds, {
      columns: options.contactSheetColumns ?? 5,
      rows: options.contactSheetRows ?? 2,
      thumbnailWidth: options.contactSheetThumbnailWidth ?? 320,
      threads: options.ffmpegThreads ?? 1
    });
  if (!contactSheet.ok) {
    errors.push({
      code: "contactSheetFailed",
      message: contactSheet.error
    });
  }
  if (contactSheet.reused) basePerformance.reusedArtifacts.push("contactSheet");
  else basePerformance.generatedArtifacts.push("contactSheet");

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
    performance: finalizePerformance(basePerformance, startedAtMs),
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

  if (!sceneIndex.reused) {
    fs.writeFileSync(paths.sceneIndex, `${JSON.stringify({
      schemaVersion: CF27_MEDIA_INSPECTION_SCHEMA_VERSION,
      inspectionID,
      sceneThreshold: options.sceneThreshold ?? 0.3,
      candidateMenuTransitions: menuTransitions,
      rawSceneChangeTimestampsSeconds: sceneChanges
    }, null, 2)}\n`);
  }
  fs.writeFileSync(paths.stableIndex, `${JSON.stringify({
    schemaVersion: CF27_MEDIA_INSPECTION_SCHEMA_VERSION,
    inspectionID,
    candidateStableFrames: stableFrames
  }, null, 2)}\n`);
  fs.writeFileSync(paths.errors, `${JSON.stringify(errorReport, null, 2)}\n`);
  fs.writeFileSync(paths.report, `${JSON.stringify(report, null, 2)}\n`);
  progress("complete", { inputPath, inspectionID, status: report.status, ok: report.ok });

  return report;
}

export async function inspectEvidenceVideoBatch(inputPaths, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const paths = Array.isArray(inputPaths) ? inputPaths : scanVideoInputs(path.resolve(root, inputPaths), root);
  const nowISO = options.nowISO ?? new Date().toISOString();
  const startedAtMs = Date.now();
  const results = [];
  const progress = createProgressReporter(options);
  progress("batch:start", { totalInputs: paths.length });
  for (let index = 0; index < paths.length; index += 1) {
    const inputPath = paths[index];
    progress("batch:item:start", { inputPath, index: index + 1, totalInputs: paths.length });
    const report = await inspectEvidenceVideo(inputPath, {
      ...options,
      root,
      nowISO,
      onProgress: options.onProgress
    });
    results.push(report);
    progress("batch:item:complete", {
      inputPath,
      index: index + 1,
      totalInputs: paths.length,
      status: report.status,
      ok: report.ok
    });
    if (report.status === "cancelled") break;
  }
  const summary = {
    ok: results.every((result) => result.ok || result.status === "skipped"),
    status: results.some((result) => result.status === "cancelled") ? "cancelled" : "completed",
    schemaVersion: CF27_MEDIA_INSPECTION_SCHEMA_VERSION,
    generatedAt: nowISO,
    totalInputs: paths.length,
    processed: results.filter((result) => result.status === "processed" || result.status === "processedWithErrors").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: results.filter((result) => result.status === "failed").length,
    cancelled: results.filter((result) => result.status === "cancelled").length,
    durationMs: Date.now() - startedAtMs,
    results
  };
  progress("batch:complete", summary);
  return summary;
}

async function checksumForFile(filePath, { root, manifestRoot, nowISO, force, progress }) {
  const startedAtMs = Date.now();
  const stat = fs.statSync(filePath);
  const cachePath = path.join(manifestRoot, checksumCacheFilename);
  const cache = readJsonIfExists(cachePath) ?? {
    schemaVersion: `${CF27_MEDIA_INSPECTION_SCHEMA_VERSION}-checksum-cache-v1`,
    updatedAt: nowISO,
    entries: {}
  };
  const cacheKey = normalizeRelativePath(path.relative(root, filePath));
  const cached = cache.entries?.[cacheKey];
  if (!force && cached && cached.sizeBytes === stat.size && cached.mtimeMs === stat.mtimeMs && typeof cached.sha256 === "string") {
    progress("checksum:cache-hit", { inputPath: cacheKey, sha256: cached.sha256 });
    return {
      sha256: cached.sha256,
      cacheHit: true,
      durationMs: Date.now() - startedAtMs
    };
  }

  progress("checksum:start", { inputPath: cacheKey, sizeBytes: stat.size });
  const sha256 = await sha256FileStream(filePath);
  fs.mkdirSync(manifestRoot, { recursive: true });
  const nextCache = {
    ...cache,
    updatedAt: nowISO,
    entries: {
      ...(cache.entries ?? {}),
      [cacheKey]: {
        sha256,
        sizeBytes: stat.size,
        mtimeMs: stat.mtimeMs,
        cachedAt: nowISO
      }
    }
  };
  fs.writeFileSync(cachePath, `${JSON.stringify(nextCache, null, 2)}\n`);
  progress("checksum:complete", { inputPath: cacheKey, sha256 });
  return {
    sha256,
    cacheHit: false,
    durationMs: Date.now() - startedAtMs
  };
}

function createProgressReporter(options) {
  return (stage, details = {}) => {
    if (typeof options.onProgress === "function") {
      options.onProgress({
        schemaVersion: CF27_MEDIA_INSPECTION_SCHEMA_VERSION,
        stage,
        at: options.nowISO ?? new Date().toISOString(),
        ...details
      });
    }
  };
}

function createCancellationChecker(options, paths, root, startedAtMs) {
  return {
    check(stage, performance) {
      performance.cancellationChecks += 1;
      const cancellationFile = options.cancellationFile ? path.resolve(options.cancellationFile) : null;
      const signalCancelled = Boolean(options.signal?.aborted);
      const fileCancelled = Boolean(cancellationFile && fs.existsSync(cancellationFile));
      if (!signalCancelled && !fileCancelled) return null;
      const reason = signalCancelled ? "signalAborted" : "cancellationFilePresent";
      const report = {
        ok: false,
        status: "cancelled",
        schemaVersion: CF27_MEDIA_INSPECTION_SCHEMA_VERSION,
        inspectionID: path.basename(paths.manifestDir),
        cancelledAtStage: stage,
        cancellationReason: reason,
        outputs: {
          manifestDirectory: normalizeRelativePath(path.relative(root, paths.manifestDir)),
          processingErrorReportJson: normalizeRelativePath(path.relative(root, paths.errors))
        },
        performance: finalizePerformance(performance, startedAtMs),
        errors: [{ code: "processingCancelled", message: `Processing cancelled at ${stage}: ${reason}.` }],
        preservationNote: "Master video was not modified. Partial derivative artifacts may be reused on resume."
      };
      fs.mkdirSync(paths.manifestDir, { recursive: true });
      fs.writeFileSync(paths.errors, `${JSON.stringify({
        schemaVersion: CF27_MEDIA_INSPECTION_SCHEMA_VERSION,
        inspectionID: report.inspectionID,
        generatedAt: options.nowISO ?? new Date().toISOString(),
        ok: false,
        errors: report.errors,
        warnings: []
      }, null, 2)}\n`);
      return report;
    }
  };
}

function existingFileUsable(filePath, force) {
  return !force && fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
}

function reusableSceneIndex(sceneIndexPath, force) {
  if (!existingFileUsable(sceneIndexPath, force)) return null;
  const existing = readJsonIfExists(sceneIndexPath);
  if (!existing || !Array.isArray(existing.rawSceneChangeTimestampsSeconds)) return null;
  return {
    ok: true,
    reused: true,
    timestamps: existing.rawSceneChangeTimestampsSeconds
  };
}

function finalizePerformance(performance, startedAtMs) {
  const currentRss = process.memoryUsage().rss;
  return {
    ...performance,
    durationMs: Math.max(0, Date.now() - startedAtMs),
    memoryRssEndBytes: currentRss,
    memoryRssDeltaBytes: currentRss - performance.memoryRssStartBytes,
    largeFileStrategy: "streamed-checksum-ffmpeg-subprocess-no-full-video-buffer",
    resumability: "checksum-addressed outputs are reused when complete and partial ffprobe/scene/contact artifacts are reused when valid"
  };
}

function scanVideoInputs(absoluteDirectory, root) {
  if (!fs.existsSync(absoluteDirectory)) return [];
  return listFiles(absoluteDirectory)
    .filter((absolutePath) => {
      const extension = path.extname(absolutePath).toLowerCase();
      if (path.basename(absolutePath).startsWith(".")) return false;
      return extension === "" || [".mp4", ".mov", ".m4v", ".webm"].includes(extension);
    })
    .map((absolutePath) => normalizeRelativePath(path.relative(root, absolutePath)))
    .sort((left, right) => left.localeCompare(right));
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(absolutePath);
    if (!entry.isFile()) return [];
    return [absolutePath];
  });
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

function runContactSheet(ffmpegPath, videoPath, outputPath, durationSeconds, { columns, rows, thumbnailWidth, threads }) {
  const interval = Math.max(0.25, Math.round((durationSeconds / Math.max(columns * rows, 1)) * 100) / 100);
  const result = spawnSync(ffmpegPath, [
    "-hide_banner",
    "-y",
    "-threads",
    String(threads),
    "-i",
    videoPath,
    "-an",
    "-sn",
    "-vf",
    `fps=1/${interval},scale=${thumbnailWidth}:-1,tile=${columns}x${rows}`,
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
    "  node scripts/cf27-media-inspect.mjs inspect <video> [--manifest-root <dir>] [--generated-root <dir>] [--cancel-file <path>] [--force]",
    "  node scripts/cf27-media-inspect.mjs inspect-batch <directory> [--manifest-root <dir>] [--generated-root <dir>] [--cancel-file <path>] [--force]",
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

function readIntegerFlag(args, name) {
  const value = readFlag(args, name);
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, inputPath, ...args] = process.argv.slice(2);
  if (!command || command === "--help") {
    printHelp();
    process.exit(0);
  }
  if (command === "inspect" && inputPath) {
    const report = await inspectEvidenceVideo(inputPath, {
      manifestRoot: readFlag(args, "--manifest-root"),
      generatedRoot: readFlag(args, "--generated-root"),
      portableRelativeEvidencePath: readFlag(args, "--portable-path"),
      evidenceRootToken: readFlag(args, "--evidence-root-token"),
      ffprobePath: readFlag(args, "--ffprobe"),
      ffmpegPath: readFlag(args, "--ffmpeg"),
      cancellationFile: readFlag(args, "--cancel-file"),
      contactSheetColumns: readIntegerFlag(args, "--contact-sheet-columns"),
      contactSheetRows: readIntegerFlag(args, "--contact-sheet-rows"),
      contactSheetThumbnailWidth: readIntegerFlag(args, "--contact-sheet-width"),
      ffmpegThreads: readIntegerFlag(args, "--ffmpeg-threads"),
      force: args.includes("--force")
    });
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  }
  if (command === "inspect-batch" && inputPath) {
    const report = await inspectEvidenceVideoBatch(inputPath, {
      manifestRoot: readFlag(args, "--manifest-root"),
      generatedRoot: readFlag(args, "--generated-root"),
      evidenceRootToken: readFlag(args, "--evidence-root-token"),
      ffprobePath: readFlag(args, "--ffprobe"),
      ffmpegPath: readFlag(args, "--ffmpeg"),
      cancellationFile: readFlag(args, "--cancel-file"),
      contactSheetColumns: readIntegerFlag(args, "--contact-sheet-columns"),
      contactSheetRows: readIntegerFlag(args, "--contact-sheet-rows"),
      contactSheetThumbnailWidth: readIntegerFlag(args, "--contact-sheet-width"),
      ffmpegThreads: readIntegerFlag(args, "--ffmpeg-threads"),
      force: args.includes("--force")
    });
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  }
  printHelp();
  process.exit(1);
}
