#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectEvidenceVideo } from "./cf27-media-inspect.mjs";

export const CF27_NEW_VIDEO_CLASSIFICATION_SCHEMA_VERSION = "cf27-new-video-classification-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultIntakeDir = "data/research/cf27/imports/tomorrow-additional-videos";
const defaultOutputRoot = "data/research/cf27/imports/tomorrow-additional-videos/classification";
const defaultCanonicalInventory = "data/research/cf27/video_inventory.json";
const defaultCanonicalManifest = "data/audit/college-football-27/video-evidence-operating-lock.csv";
const supportedVideoExtensions = new Set([".mp4", ".mov", ".m4v", ".webm", ""]);

export const CF27_VISIBLE_MENU_HEADINGS = [
  { heading: "Head Template", slug: "Head_Templates", category: "head_templates", workingLabel: "Head_Templates" },
  { heading: "Skin Tone", slug: "Skin_Tone", category: "skin_tones", workingLabel: "Skin_Tone" },
  { heading: "Skin Details", slug: "Skin_Details", category: "skin_details", workingLabel: "Skin_Details" },
  { heading: "Eye Shape", slug: "Eye_Shape", category: "eye_shapes", workingLabel: "Eye_Shape" },
  { heading: "Eye Color", slug: "Eye_Color", category: "eye_colors", workingLabel: "Eye_Color" },
  { heading: "Nose", slug: "Nose", category: "noses", workingLabel: "Nose" },
  { heading: "Ear Shape", slug: "Ear_Shape", category: "ear_shapes", workingLabel: "Ear_Shape" },
  { heading: "Mouth Shape", slug: "Mouth_Shape", category: "mouth_shapes", workingLabel: "Mouth_Shape" },
  { heading: "Jaw Shape", slug: "Jaw_Shape", category: "jaw_shapes", workingLabel: "Jaw_Shape" },
  { heading: "Chin", slug: "Chin", category: "chins", workingLabel: "Chin" },
  { heading: "Hair", slug: "Hair", category: "hair", workingLabel: "Hair" },
  { heading: "Road to Glory", slug: "Environment_and_Creation_Path", category: "creation_path", workingLabel: "Environment_and_Creation_Path" },
  { heading: "Create Player", slug: "Environment_and_Creation_Path", category: "creation_path", workingLabel: "Environment_and_Creation_Path" }
];

export async function classifyNewVideoBatch(intakeDir = defaultIntakeDir, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const absoluteIntakeDir = path.resolve(root, intakeDir);
  const outputRoot = path.resolve(root, options.outputRoot ?? defaultOutputRoot);
  const nowISO = options.nowISO ?? new Date().toISOString();
  const canonicalInventory = readCanonicalInventory(path.resolve(root, options.canonicalInventoryPath ?? defaultCanonicalInventory));
  const inputs = scanIntakeDirectory(absoluteIntakeDir, root);
  const results = [];

  fs.mkdirSync(outputRoot, { recursive: true });
  for (let index = 0; index < inputs.length; index += 1) {
    const input = inputs[index];
    const mediaReport = await inspectEvidenceVideo(input.relativePath, {
      root,
      manifestRoot: options.mediaManifestRoot ?? "data/research/cf27/manifests/media-inspection",
      generatedRoot: options.mediaGeneratedRoot ?? "data/research/cf27/generated/media-inspections",
      portableRelativeEvidencePath: `${options.evidenceRootToken ?? "TOMORROW_UPLOADS"}/${input.originalFilename}`,
      ffprobePath: options.ffprobePath,
      ffmpegPath: options.ffmpegPath,
      nowISO,
      force: options.force
    });
    results.push(classifyOneVideo({
      root,
      outputRoot,
      input,
      sequence: index + 1,
      mediaReport,
      canonicalInventory,
      previousResults: results,
      nowISO,
      ffmpegPath: options.ffmpegPath,
      evidenceRootToken: options.evidenceRootToken ?? "TOMORROW_UPLOADS"
    }));
  }

  const report = createBatchReport({ root, intakeDir: absoluteIntakeDir, outputRoot, nowISO, results, canonicalInventory });
  writeBatchOutputs(root, outputRoot, report);
  return report;
}

export function acceptClassificationReport(reportPath, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const absoluteReportPath = path.resolve(root, reportPath);
  const report = JSON.parse(fs.readFileSync(absoluteReportPath, "utf8"));
  if (report.schemaVersion !== CF27_NEW_VIDEO_CLASSIFICATION_SCHEMA_VERSION) {
    throw new Error("Unsupported new-video classification report schema.");
  }
  const acceptedRows = report.records.filter((record) => record.acceptance.status === "operatorAccepted");
  if (acceptedRows.length === 0) {
    return {
      ok: false,
      status: "noAcceptedRecords",
      message: "No records are marked operatorAccepted. Edit the pending manifest update or report before accepting."
    };
  }
  const manifestPath = path.resolve(root, options.canonicalManifestPath ?? defaultCanonicalManifest);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  const manifestExists = fs.existsSync(manifestPath);
  const existingText = manifestExists ? fs.readFileSync(manifestPath, "utf8").trimEnd() : "";
  const header = "source_type,sequence,working_name,manifest_original_filename,located_master_filename,located_source_root_token,duration_seconds,container,video_summary,audio_summary,size_bytes,sha256,visual_mapping_status,review_frame_timestamps_seconds,visible_sample_text,notes";
  const existingLines = existingText ? existingText.split(/\r?\n/) : [header];
  const maxSequence = existingLines.slice(1).map((line) => Number.parseInt(line.split(",")[1] ?? "0", 10)).filter(Number.isFinite).reduce((max, value) => Math.max(max, value), 0);
  const rows = acceptedRows.map((record, index) => csvRow([
    "researchCandidate",
    String(maxSequence + index + 1),
    record.suggestedWorkingFilename,
    record.originalFilename,
    record.originalFilename,
    record.evidenceRootToken,
    record.media.durationSeconds ?? "",
    record.media.containerFormat ?? "",
    record.media.videoCodec ? `${record.media.videoCodec} ${record.media.width ?? "unknown"}x${record.media.height ?? "unknown"}` : "metadata unavailable",
    record.media.audioCodec ?? "audio metadata unavailable",
    record.sizeBytes,
    record.sha256,
    record.visibleMenuHeading.status,
    record.visibleMenuHeading.evidenceTimestampsSeconds.join(";"),
    record.visibleMenuHeading.heading ?? "UNKNOWN",
    `${record.classificationLabel}; operator accepted from ${path.relative(root, absoluteReportPath)}`
  ]));
  const nextText = `${existingLines.join("\n")}\n${rows.join("\n")}\n`;
  fs.writeFileSync(manifestPath, nextText);
  return {
    ok: true,
    status: "accepted",
    canonicalManifestPath: normalizeRelativePath(path.relative(root, manifestPath)),
    appendedRows: rows.length
  };
}

export function identifyVisibleMenuHeadingFromImage(imagePath) {
  const bytes = fs.readFileSync(imagePath);
  const text = bytes.toString("utf8").replace(/\0/g, " ");
  const matches = CF27_VISIBLE_MENU_HEADINGS.filter((candidate) => new RegExp(`\\b${escapeRegExp(candidate.heading)}\\b`, "i").test(text));
  if (matches.length === 0) {
    return {
      status: "unknown",
      heading: null,
      category: null,
      confidence: 0,
      method: "text-visible-in-sampled-frame-or-fixture",
      note: "No controlled heading text was detected in sampled frame bytes. Manual frame review is required."
    };
  }
  const winner = matches.sort((left, right) => right.heading.length - left.heading.length)[0];
  return {
    status: "detected",
    heading: winner.heading,
    category: winner.category,
    confidence: 0.9,
    method: "text-visible-in-sampled-frame-or-fixture",
    note: "Detected controlled heading text in sampled frame bytes. Treat as a suggestion pending direct visual review."
  };
}

export function suggestWorkingFilename({ sequence, originalFilename, detectedHeading }) {
  const extension = extensionForSuggestion(originalFilename);
  const sequencePrefix = String(sequence).padStart(2, "0");
  if (detectedHeading?.heading) {
    const heading = CF27_VISIBLE_MENU_HEADINGS.find((candidate) => candidate.heading === detectedHeading.heading);
    return `${sequencePrefix}_${heading?.workingLabel ?? safeToken(detectedHeading.heading)}${extension}`;
  }
  return `${sequencePrefix}_Manual_Review_Required_${safeToken(path.parse(originalFilename).name || originalFilename).slice(0, 48)}${extension}`;
}

function classifyOneVideo({ root, outputRoot, input, sequence, mediaReport, canonicalInventory, previousResults, nowISO, ffmpegPath, evidenceRootToken }) {
  const sampleRoot = path.join(outputRoot, "sample-frames", mediaReport.inspectionID ?? safeToken(input.originalFilename));
  const sampleTimestamps = chooseSampleTimestamps(root, mediaReport);
  const samples = sampleTimestamps.map((timestamp, index) => extractSampleFrame({
    root,
    sourceRelativePath: input.relativePath,
    outputPath: path.join(sampleRoot, `sample-${String(index + 1).padStart(2, "0")}-${timestamp.toFixed(3).replace(".", "p")}.jpg`),
    timestamp,
    ffmpegPath
  }));
  const headingEvidence = summarizeHeadingEvidence(samples);
  const detectedHeading = headingEvidence.bestHeading;
  const suggestedWorkingFilename = suggestWorkingFilename({
    sequence,
    originalFilename: input.originalFilename,
    detectedHeading
  });
  const duplicateSignals = detectDuplicateSignals(mediaReport, canonicalInventory, previousResults);
  const categoryOverlap = detectCategoryOverlap(detectedHeading, canonicalInventory);
  const continuation = detectContinuation({ input, detectedHeading, categoryOverlap, duplicateSignals, previousResults });
  return {
    recordID: `new-video-classification-${String(sequence).padStart(3, "0")}`,
    schemaVersion: CF27_NEW_VIDEO_CLASSIFICATION_SCHEMA_VERSION,
    dataClass: "PRIMARY_RESEARCH_CANDIDATE",
    productionStatus: "NOT_PRODUCTION_DATA",
    acceptanceRequired: true,
    acceptance: {
      status: "pendingOperatorAcceptance",
      acceptedAt: null,
      acceptedBy: null,
      canonicalManifestUpdated: false
    },
    originalFilename: input.originalFilename,
    originalRelativePath: input.relativePath,
    evidenceRootToken,
    sha256: mediaReport.sourceVideo?.sha256 ?? "unavailable",
    sizeBytes: mediaReport.sourceVideo?.sizeBytes ?? input.sizeBytes,
    media: mediaReport.media ?? {},
    mediaInspectionID: mediaReport.inspectionID,
    contactSheet: mediaReport.outputs?.contactSheet ?? null,
    sampleFrames: samples.map((sample) => ({
      timestampSeconds: sample.timestampSeconds,
      relativePath: sample.relativePath,
      extractionStatus: sample.status,
      detectedHeading: sample.detectedHeading
    })),
    visibleMenuHeading: {
      status: detectedHeading?.status ?? "unknown",
      heading: detectedHeading?.heading ?? null,
      category: detectedHeading?.category ?? null,
      confidence: headingEvidence.confidence,
      evidenceTimestampsSeconds: headingEvidence.evidenceTimestampsSeconds,
      method: "sampled-frame-heading-detection",
      note: headingEvidence.note
    },
    suggestedWorkingFilename,
    destructiveRenamePerformed: false,
    duplicateSignals,
    continuation,
    categoryOverlap,
    classificationLabel: classificationLabelFor({ detectedHeading, duplicateSignals, continuation, categoryOverlap }),
    generatedAt: nowISO,
    reviewerInstruction: "Review the source video and contact sheet. If the suggested filename is correct, mark this record operatorAccepted before running the accept command."
  };
}

function scanIntakeDirectory(absoluteIntakeDir, root) {
  if (!fs.existsSync(absoluteIntakeDir)) return [];
  return listFiles(absoluteIntakeDir)
    .filter((absolutePath) => {
      const extension = path.extname(absolutePath).toLowerCase();
      if (path.basename(absolutePath).startsWith(".")) return false;
      return supportedVideoExtensions.has(extension);
    })
    .map((absolutePath) => ({
      absolutePath,
      relativePath: normalizeRelativePath(path.relative(root, absolutePath)),
      originalFilename: path.basename(absolutePath),
      sizeBytes: fs.statSync(absolutePath).size
    }))
    .sort((left, right) => left.originalFilename.localeCompare(right.originalFilename));
}

function chooseSampleTimestamps(root, mediaReport) {
  const stableIndexPath = mediaReport.outputs?.stableFrameIndexJson ? path.resolve(root, mediaReport.outputs.stableFrameIndexJson) : null;
  const stableIndex = stableIndexPath && fs.existsSync(stableIndexPath) ? JSON.parse(fs.readFileSync(stableIndexPath, "utf8")) : null;
  const stableTimestamps = Array.isArray(stableIndex?.candidateStableFrames) ? stableIndex.candidateStableFrames.map((frame) => frame.timestampSeconds).filter(Number.isFinite) : [];
  if (stableTimestamps.length > 0) return stableTimestamps.slice(0, 5);
  const duration = mediaReport.media?.durationSeconds;
  if (!Number.isFinite(duration) || duration <= 0) return [1];
  return [0.15, 0.5, 0.85].map((ratio) => Math.round(duration * ratio * 1000) / 1000);
}

function extractSampleFrame({ root, sourceRelativePath, outputPath, timestamp, ffmpegPath }) {
  const absoluteSourcePath = path.resolve(root, sourceRelativePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const ffmpeg = firstWorkingCommand([ffmpegPath, process.env.CF27_FFMPEG_PATH, "ffmpeg"].filter(Boolean));
  if (!ffmpeg) {
    return sampleFrameResult({ root, outputPath, timestamp, status: "disabled", code: "ffmpegUnavailable" });
  }
  const result = spawnSync(ffmpeg, [
    "-hide_banner",
    "-y",
    "-ss",
    String(timestamp),
    "-i",
    absoluteSourcePath,
    "-frames:v",
    "1",
    outputPath
  ], { encoding: "utf8" });
  if (result.error || result.status !== 0 || !fs.existsSync(outputPath)) {
    return sampleFrameResult({ root, outputPath, timestamp, status: "failed", code: "sampleFrameExtractionFailed" });
  }
  return sampleFrameResult({ root, outputPath, timestamp, status: "extracted" });
}

function sampleFrameResult({ root, outputPath, timestamp, status, code = null }) {
  const relativePath = normalizeRelativePath(path.relative(root, outputPath));
  const detectedHeading = status === "extracted" ? identifyVisibleMenuHeadingFromImage(outputPath) : {
    status: "unknown",
    heading: null,
    category: null,
    confidence: 0,
    method: "sample-frame-unavailable",
    note: code ?? "sample frame unavailable"
  };
  return {
    status,
    code,
    timestampSeconds: timestamp,
    relativePath,
    detectedHeading
  };
}

function summarizeHeadingEvidence(samples) {
  const detected = samples.filter((sample) => sample.detectedHeading.status === "detected" && sample.detectedHeading.heading);
  if (detected.length === 0) {
    return {
      bestHeading: null,
      confidence: 0,
      evidenceTimestampsSeconds: [],
      note: "No sampled frame exposed a controlled menu heading. Manual review required before relabeling."
    };
  }
  const counts = new Map();
  for (const sample of detected) {
    const heading = sample.detectedHeading.heading;
    counts.set(heading, (counts.get(heading) ?? 0) + 1);
  }
  const [heading, count] = [...counts.entries()].sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])))[0];
  const matching = detected.filter((sample) => sample.detectedHeading.heading === heading);
  return {
    bestHeading: matching[0].detectedHeading,
    confidence: Math.round((count / Math.max(samples.length, 1)) * 100) / 100,
    evidenceTimestampsSeconds: matching.map((sample) => sample.timestampSeconds),
    note: "Heading is a classifier suggestion from sampled frames and still requires operator acceptance."
  };
}

function detectDuplicateSignals(mediaReport, canonicalInventory, previousResults) {
  const sha256 = mediaReport.sourceVideo?.sha256;
  const exactExisting = canonicalInventory.filter((entry) => entry.sha256 === sha256).map((entry) => entry.inventoryId ?? entry.workingFilename);
  const exactBatch = previousResults.filter((record) => record.sha256 === sha256).map((record) => record.originalFilename);
  const likelyMetadataMatches = canonicalInventory
    .filter((entry) => entry.sha256 !== sha256 && Number(entry.fileSizeBytes) === Number(mediaReport.sourceVideo?.sizeBytes) && Math.abs(Number(entry.durationSeconds) - Number(mediaReport.media?.durationSeconds)) < 0.2)
    .map((entry) => entry.inventoryId ?? entry.workingFilename);
  return {
    exactDuplicate: exactExisting.length > 0 || exactBatch.length > 0,
    exactDuplicateOf: [...exactExisting, ...exactBatch],
    likelyDuplicate: likelyMetadataMatches.length > 0,
    likelyDuplicateOf: likelyMetadataMatches,
    method: "sha256-primary-size-duration-secondary"
  };
}

function detectCategoryOverlap(detectedHeading, canonicalInventory) {
  if (!detectedHeading?.category) {
    return {
      overlapsKnownCategory: false,
      category: null,
      existingInventoryIDs: [],
      confidence: 0
    };
  }
  const normalizedHeading = detectedHeading.heading?.toLowerCase() ?? "";
  const matches = canonicalInventory.filter((entry) => String(entry.identifiedContent ?? "").toLowerCase().includes(normalizedHeading));
  return {
    overlapsKnownCategory: matches.length > 0,
    category: detectedHeading.category,
    existingInventoryIDs: matches.map((entry) => entry.inventoryId),
    confidence: matches.length > 0 ? 0.7 : 0.4
  };
}

function detectContinuation({ input, detectedHeading, categoryOverlap, duplicateSignals, previousResults }) {
  const filename = input.originalFilename.toLowerCase();
  const filenameSignal = /part[\s_-]*\d+|continued|continuation|clip[\s_-]*\d+/.test(filename);
  const previousSameCategory = detectedHeading?.category
    ? previousResults.filter((record) => record.visibleMenuHeading.category === detectedHeading.category && !record.duplicateSignals.exactDuplicate)
    : [];
  const likelyContinuation = !duplicateSignals.exactDuplicate && Boolean(filenameSignal || (categoryOverlap.overlapsKnownCategory && detectedHeading?.category) || previousSameCategory.length > 0);
  return {
    likelyContinuation,
    confidence: likelyContinuation ? (filenameSignal ? 0.75 : 0.55) : 0,
    signals: [
      filenameSignal ? "filename-continuation-token" : null,
      categoryOverlap.overlapsKnownCategory ? "same-known-category" : null,
      previousSameCategory.length > 0 ? "same-batch-category" : null
    ].filter(Boolean)
  };
}

function classificationLabelFor({ detectedHeading, duplicateSignals, continuation, categoryOverlap }) {
  if (duplicateSignals.exactDuplicate) return "EXACT_DUPLICATE_REVIEW_ONLY";
  if (!detectedHeading) return "UNKNOWN_MENU_HEADING_REQUIRES_MANUAL_REVIEW";
  if (continuation.likelyContinuation) return `LIKELY_CONTINUATION_${detectedHeading.category}`;
  if (categoryOverlap.overlapsKnownCategory) return `CATEGORY_OVERLAP_${detectedHeading.category}`;
  return `NEW_CATEGORY_CANDIDATE_${detectedHeading.category}`;
}

function createBatchReport({ root, intakeDir, outputRoot, nowISO, results, canonicalInventory }) {
  return {
    schemaVersion: CF27_NEW_VIDEO_CLASSIFICATION_SCHEMA_VERSION,
    generatedAt: nowISO,
    dataClass: "PRIMARY_RESEARCH_CANDIDATE",
    productionStatus: "NOT_PRODUCTION_DATA",
    intakeDirectory: normalizeRelativePath(path.relative(root, intakeDir)),
    outputDirectory: normalizeRelativePath(path.relative(root, outputRoot)),
    canonicalInventoryRecordCount: canonicalInventory.length,
    totalFilesScanned: results.length,
    acceptedAutomatically: 0,
    destructiveRenamePerformed: false,
    acceptanceRequired: true,
    records: results,
    pendingManifestUpdate: results.map((record) => ({
      originalFilename: record.originalFilename,
      suggestedWorkingFilename: record.suggestedWorkingFilename,
      visibleMenuHeading: record.visibleMenuHeading,
      duplicateSignals: record.duplicateSignals,
      continuation: record.continuation,
      acceptance: record.acceptance
    })),
    operatorInstructions: [
      "Review each source video, contact sheet, sampled-frame timestamps, duplicate signals, and suggested filename.",
      "Edit a copy of this report or the pending manifest update to mark records operatorAccepted only after visual confirmation.",
      "Run the accept command with the reviewed report to append accepted rows to the canonical manifest.",
      "The tool never renames or modifies source masters."
    ]
  };
}

function writeBatchOutputs(root, outputRoot, report) {
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, "new_video_classification_report.json"), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(outputRoot, "pending_manifest_update.json"), `${JSON.stringify(report.pendingManifestUpdate, null, 2)}\n`);
  fs.writeFileSync(path.join(outputRoot, "new_video_classification_report.csv"), createClassificationCSV(report));
}

function createClassificationCSV(report) {
  const header = [
    "record_id",
    "original_filename",
    "suggested_working_filename",
    "sha256",
    "duration_seconds",
    "heading",
    "heading_confidence",
    "classification_label",
    "exact_duplicate",
    "likely_continuation",
    "category_overlap",
    "acceptance_status"
  ];
  const rows = report.records.map((record) => csvRow([
    record.recordID,
    record.originalFilename,
    record.suggestedWorkingFilename,
    record.sha256,
    record.media.durationSeconds ?? "",
    record.visibleMenuHeading.heading ?? "UNKNOWN",
    record.visibleMenuHeading.confidence,
    record.classificationLabel,
    record.duplicateSignals.exactDuplicate,
    record.continuation.likelyContinuation,
    record.categoryOverlap.overlapsKnownCategory,
    record.acceptance.status
  ]));
  return `${header.join(",")}\n${rows.join("\n")}\n`;
}

function readCanonicalInventory(inventoryPath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
    return Array.isArray(parsed.inventory) ? parsed.inventory : [];
  } catch {
    return [];
  }
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(absolutePath);
    if (!entry.isFile()) return [];
    return [absolutePath];
  });
}

function firstWorkingCommand(candidates) {
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["-version"], { stdio: "ignore" });
    if (!result.error && result.status === 0) return candidate;
  }
  return null;
}

function extensionForSuggestion(originalFilename) {
  const extension = path.extname(originalFilename).toLowerCase();
  if (extension === ".mp4" || extension === ".mov" || extension === ".m4v" || extension === ".webm") return extension;
  return ".mp4";
}

function safeToken(value) {
  return String(value).trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "Unknown";
}

function csvRow(values) {
  return values.map((value) => {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
  }).join(",");
}

function normalizeRelativePath(value) {
  return value.replaceAll("\\", "/").replace(/^\.\/+/, "").split("/").filter((part) => part && part !== ".").join("/");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function printHelp() {
  console.log([
    "Usage:",
    "  node scripts/cf27-new-video-classifier.mjs scan [intake-dir] [--output-root <dir>] [--evidence-root-token <token>] [--ffprobe <path>] [--ffmpeg <path>] [--force]",
    "  node scripts/cf27-new-video-classifier.mjs accept <classification-report-json> [--canonical-manifest <path>]",
    "",
    "The scan command preserves source masters, writes contact sheets and sampled-frame review metadata, and creates a pending manifest update.",
    "The accept command appends only records already marked operatorAccepted. It never renames source files."
  ].join("\n"));
}

function readFlag(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, maybePath, ...args] = process.argv.slice(2);
  if (!command || command === "--help") {
    printHelp();
    process.exit(0);
  }
  if (command === "scan") {
    const report = await classifyNewVideoBatch(maybePath && !maybePath.startsWith("--") ? maybePath : defaultIntakeDir, {
      outputRoot: readFlag(args, "--output-root"),
      evidenceRootToken: readFlag(args, "--evidence-root-token"),
      ffprobePath: readFlag(args, "--ffprobe"),
      ffmpegPath: readFlag(args, "--ffmpeg"),
      force: args.includes("--force")
    });
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }
  if (command === "accept" && maybePath) {
    const result = acceptClassificationReport(maybePath, {
      canonicalManifestPath: readFlag(args, "--canonical-manifest")
    });
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }
  printHelp();
  process.exit(1);
}
