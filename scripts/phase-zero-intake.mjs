#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const PHASE_ZERO_INTAKE_SCHEMA_VERSION = "phase-zero-intake-manifest-v1";

const supportedVideoExtensions = new Set([".mp4", ".mov"]);
const supportedImageExtensions = new Set([".png", ".jpg", ".jpeg"]);
const supportedMetadataExtensions = new Set([".json", ".csv", ".txt", ".md"]);
const defaultInputPath = "data/phase-zero/intake/pending";
const defaultOutputRoot = "data/phase-zero/intake";
const defaultCaptureRequestsPath = "data/phase-zero/capture_requests.json";
const defaultEvidenceManifestPath = "data/phase-zero/evidence_manifest.json";
const defaultVideoInventoryPath = "data/phase-zero/video_inventory.json";
const defaultMarkdownReportPath = "docs/phase-zero/EVIDENCE_INTAKE_REPORT.md";

export async function runPhaseZeroIntake(options = {}) {
  const root = options.root ?? process.cwd();
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const inputPath = options.inputPath ?? defaultInputPath;
  const outputRoot = options.outputRoot ?? defaultOutputRoot;
  const writeOutputs = options.writeOutputs ?? true;

  const resolvedInputPath = path.isAbsolute(inputPath) ? inputPath : path.join(root, inputPath);
  const outputRootPath = path.isAbsolute(outputRoot) ? outputRoot : path.join(root, outputRoot);
  const captureRequests = readJson(path.join(root, options.captureRequestsPath ?? defaultCaptureRequestsPath), { requests: [] });
  const evidenceManifest = readJson(path.join(root, options.evidenceManifestPath ?? defaultEvidenceManifestPath), { entries: [] });
  const videoInventory = readJson(path.join(root, options.videoInventoryPath ?? defaultVideoInventoryPath), { inventory: [] });
  const previousIntakeManifest = readJson(path.join(outputRootPath, "intake_manifest.json"), { records: [] });

  const requests = Array.isArray(captureRequests.requests) ? captureRequests.requests : [];
  const knownHashes = collectKnownHashes({
    evidenceManifest,
    videoInventory,
    intakeManifest: previousIntakeManifest
  });

  const discovered = discoverFiles(resolvedInputPath);
  const batchHashes = new Map();
  const records = [];

  for (const filePath of discovered) {
    const record = await createIntakeRecord({
      root,
      filePath,
      generatedAt,
      requests,
      knownHashes,
      batchHashes,
      inspectVideoMetadata: options.inspectVideoMetadata
    });
    records.push(record);
    if (record.source_file_hash && !batchHashes.has(record.source_file_hash)) {
      batchHashes.set(record.source_file_hash, record.intake_id);
    }
  }

  const missingCoverage = buildMissingCoverage({ requests, records });
  const reviewQueue = records
    .filter((record) => record.review_status !== "NO_REVIEW_REQUIRED")
    .map((record) => ({
      intake_id: record.intake_id,
      original_filename: record.original_filename,
      assigned_capture_id: record.assigned_capture_id,
      processing_status: record.processing_status,
      review_status: record.review_status,
      duplicate_of: record.duplicate_of,
      reasons: record.review_reasons,
      notes: record.notes
    }));

  const manifest = {
    schemaVersion: PHASE_ZERO_INTAKE_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PHASE_ZERO_EVIDENCE_INTAKE_MANIFEST",
    sourceType: "research",
    productionStatus: "NOT_PRODUCTION_DATA",
    productionPromotion: {
      allowed: false,
      reason: "Intake records are unreviewed research evidence. They cannot become production catalog records without primary QA, independent verification, catalog-manager approval, and production release gates."
    },
    policy: {
      mastersPreserved: true,
      originalsRenamed: false,
      originalsMoved: false,
      automaticProductionPromotion: false,
      uncertainCaptureMappingsRequireReview: true
    },
    intakePath: {
      requestedPath: inputPath,
      portablePath: portablePath(root, resolvedInputPath)
    },
    summary: summarizeRecords({ records, requests, missingCoverage }),
    records
  };

  if (writeOutputs) {
    fs.mkdirSync(outputRootPath, { recursive: true });
    writeJson(path.join(outputRootPath, "intake_manifest.json"), manifest);
    writeCsv(path.join(outputRootPath, "intake_manifest.csv"), records, intakeCsvColumns);
    writeJson(path.join(outputRootPath, "review_queue.json"), {
      schemaVersion: "phase-zero-intake-review-queue-v1",
      generatedAt,
      dataClass: "PHASE_ZERO_EVIDENCE_INTAKE_REVIEW_QUEUE",
      sourceType: "research",
      productionStatus: "NOT_PRODUCTION_DATA",
      items: reviewQueue
    });
    writeCsv(path.join(outputRootPath, "review_queue.csv"), reviewQueue, reviewQueueCsvColumns);
    writeJson(path.join(outputRootPath, "missing_coverage.json"), {
      schemaVersion: "phase-zero-intake-missing-coverage-v1",
      generatedAt,
      dataClass: "PHASE_ZERO_INTAKE_MISSING_CAPTURE_COVERAGE",
      sourceType: "research",
      productionStatus: "NOT_PRODUCTION_DATA",
      missingCoverage
    });
    writeMarkdownReport(path.join(root, options.markdownReportPath ?? defaultMarkdownReportPath), manifest, reviewQueue, missingCoverage);
  }

  return { manifest, reviewQueue, missingCoverage };
}

export function discoverFiles(inputPath) {
  if (!fs.existsSync(inputPath)) return [];
  const results = [];
  const stack = [inputPath];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".DS_Store" || entry.name === ".gitkeep" || entry.name === "README.md") continue;
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile()) {
        results.push(entryPath);
      }
    }
  }
  return results.sort((a, b) => a.localeCompare(b));
}

async function createIntakeRecord({ root, filePath, generatedAt, requests, knownHashes, batchHashes, inspectVideoMetadata }) {
  const stat = fs.statSync(filePath);
  const originalFilename = path.basename(filePath);
  const hash = await sha256FileStream(filePath);
  const fileKind = classifyFile(filePath);
  const captureMatch = matchCaptureRequest(originalFilename, requests);
  const knownDuplicate = knownHashes.get(hash);
  const batchDuplicate = batchHashes.get(hash);
  const duplicateOf = knownDuplicate?.id ?? batchDuplicate ?? null;
  const metadata = await inspectFile({
    root,
    filePath,
    fileKind,
    inspectVideoMetadata
  });
  const sourceLocation = buildSourceLocation(root, filePath);
  const review = buildReviewState({
    fileKind,
    metadata,
    duplicateOf,
    captureMatch,
    sourceLocation
  });

  return {
    intake_id: makeIntakeID(hash, sourceLocation.portablePath),
    original_filename: originalFilename,
    canonical_filename: suggestedCanonicalFilename(originalFilename, captureMatch?.captureID ?? null),
    assigned_capture_id: captureMatch?.captureID ?? null,
    category: captureMatch?.request?.exactCategory ?? captureMatch?.request?.category ?? null,
    subcategory: captureMatch?.request?.title ?? captureMatch?.request?.subcategory ?? null,
    source_platform: captureMatch?.request?.sourcePlatform ?? captureMatch?.request?.platform ?? null,
    capture_date: captureDateFromFilename(originalFilename),
    source_file_hash: hash,
    file_size: stat.size,
    duration: metadata.duration,
    resolution: metadata.resolution,
    codec: metadata.codec,
    orientation: metadata.orientation,
    duplicate_of: duplicateOf,
    processing_status: review.processingStatus,
    review_status: review.reviewStatus,
    evidence_status: "UNREVIEWED_RESEARCH_EVIDENCE_NOT_PRODUCTION",
    notes: review.notes,
    actual_media_container: metadata.container,
    mime_type: metadata.mimeType,
    opens_successfully: metadata.opensSuccessfully,
    source_location: sourceLocation.portablePath,
    source_location_kind: sourceLocation.kind,
    manifest_match: captureMatch
      ? {
          capture_id: captureMatch.captureID,
          confidence: captureMatch.confidence,
          requires_explicit_review: true
        }
      : null,
    expected_content: captureMatch?.request?.title ?? null,
    review_reasons: review.reasons,
    production_status: "NOT_PRODUCTION_DATA",
    verification_status: "NOT_REVIEWED",
    generated_at: generatedAt
  };
}

function classifyFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (supportedVideoExtensions.has(extension)) return { supported: true, kind: "video", extension };
  if (supportedImageExtensions.has(extension)) return { supported: true, kind: "image", extension };
  if (supportedMetadataExtensions.has(extension)) return { supported: true, kind: "metadata", extension };
  return { supported: false, kind: "unsupported", extension };
}

async function inspectFile({ root, filePath, fileKind, inspectVideoMetadata }) {
  if (!fileKind.supported) {
    return {
      container: fileKind.extension ? fileKind.extension.slice(1).toUpperCase() : "UNKNOWN",
      codec: null,
      duration: null,
      resolution: null,
      orientation: "UNKNOWN",
      mimeType: "application/octet-stream",
      opensSuccessfully: false,
      inspectionError: "Unsupported file extension for Phase 0 intake."
    };
  }

  if (fileKind.kind === "video") {
    try {
      const metadata = inspectVideoMetadata
        ? await inspectVideoMetadata(filePath)
        : inspectVideoWithFfprobe(root, filePath);
      return {
        container: metadata.container ?? null,
        codec: metadata.codec ?? null,
        duration: metadata.duration ?? null,
        resolution: metadata.resolution ?? null,
        orientation: metadata.orientation ?? "UNKNOWN",
        mimeType: metadata.mimeType ?? mimeTypeForExtension(fileKind.extension),
        opensSuccessfully: true,
        inspectionError: null
      };
    } catch (error) {
      return {
        container: fileKind.extension.slice(1).toUpperCase(),
        codec: null,
        duration: null,
        resolution: null,
        orientation: "UNKNOWN",
        mimeType: mimeTypeForExtension(fileKind.extension),
        opensSuccessfully: false,
        inspectionError: error instanceof Error ? error.message : String(error)
      };
    }
  }

  if (fileKind.kind === "image") {
    try {
      const dimensions = readImageDimensions(filePath);
      return {
        container: fileKind.extension.slice(1).toUpperCase().replace("JPG", "JPEG"),
        codec: fileKind.extension.slice(1).toUpperCase().replace("JPG", "JPEG"),
        duration: null,
        resolution: `${dimensions.width}x${dimensions.height}`,
        orientation: orientationFromDimensions(dimensions.width, dimensions.height),
        mimeType: mimeTypeForExtension(fileKind.extension),
        opensSuccessfully: true,
        inspectionError: null
      };
    } catch (error) {
      return {
        container: fileKind.extension.slice(1).toUpperCase().replace("JPG", "JPEG"),
        codec: null,
        duration: null,
        resolution: null,
        orientation: "UNKNOWN",
        mimeType: mimeTypeForExtension(fileKind.extension),
        opensSuccessfully: false,
        inspectionError: error instanceof Error ? error.message : String(error)
      };
    }
  }

  const parseError = fileKind.extension === ".json" ? jsonParseError(filePath) : null;
  return {
    container: fileKind.extension.slice(1).toUpperCase(),
    codec: fileKind.extension.slice(1).toUpperCase(),
    duration: null,
    resolution: null,
    orientation: "NOT_APPLICABLE",
    mimeType: mimeTypeForExtension(fileKind.extension),
    opensSuccessfully: parseError === null,
    inspectionError: parseError
  };
}

function inspectVideoWithFfprobe(root, filePath) {
  const wrapperPath = path.join(root, "scripts/media/ffmpeg-wrapper");
  const output = execFileSync(wrapperPath, [
    "ffprobe",
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const probe = JSON.parse(output);
  const videoStream = Array.isArray(probe.streams)
    ? probe.streams.find((stream) => stream.codec_type === "video")
    : null;
  const audioStream = Array.isArray(probe.streams)
    ? probe.streams.find((stream) => stream.codec_type === "audio")
    : null;
  const width = Number(videoStream?.width ?? 0);
  const height = Number(videoStream?.height ?? 0);
  const rotate = videoStream?.tags?.rotate ?? findRotationSideData(videoStream);
  return {
    container: probe.format?.format_name ?? null,
    codec: [videoStream?.codec_name, audioStream?.codec_name].filter(Boolean).join("+") || null,
    duration: normalizeDuration(probe.format?.duration),
    resolution: width > 0 && height > 0 ? `${width}x${height}` : null,
    orientation: rotate ? `ROTATED_${rotate}` : orientationFromDimensions(width, height),
    mimeType: "video/*"
  };
}

function findRotationSideData(videoStream) {
  if (!Array.isArray(videoStream?.side_data_list)) return null;
  const displayMatrix = videoStream.side_data_list.find((item) => item.rotation !== undefined);
  return displayMatrix?.rotation ?? null;
}

function normalizeDuration(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Number(numeric.toFixed(3));
}

function buildReviewState({ fileKind, metadata, duplicateOf, captureMatch, sourceLocation }) {
  const reasons = [];
  if (!fileKind.supported) reasons.push("UNSUPPORTED_FILE_TYPE");
  if (!metadata.opensSuccessfully) reasons.push("UNREADABLE_OR_MISSING_METADATA");
  if (duplicateOf) reasons.push("EXACT_DUPLICATE_REVIEW_REQUIRED");
  if (!captureMatch) reasons.push("UNASSIGNED_CAPTURE_REVIEW_REQUIRED");
  if (sourceLocation.kind === "OWNER_EXTERNAL_REFERENCE") reasons.push("EXTERNAL_FILE_MUST_BE_IMPORTED_FOR_PORTABILITY");

  let processingStatus = "INVENTORIED_PENDING_REVIEW";
  if (!fileKind.supported) processingStatus = "UNSUPPORTED_FILE_REVIEW_REQUIRED";
  else if (!metadata.opensSuccessfully) processingStatus = "UNREADABLE_REVIEW_REQUIRED";
  else if (duplicateOf) processingStatus = "EXACT_DUPLICATE_REVIEW_REQUIRED";
  else if (!captureMatch) processingStatus = "UNASSIGNED_REVIEW_REQUIRED";
  else if (sourceLocation.kind === "OWNER_EXTERNAL_REFERENCE") processingStatus = "EXTERNAL_REFERENCE_REVIEW_REQUIRED";

  return {
    processingStatus,
    reviewStatus: duplicateOf ? "DUPLICATE_REVIEW_REQUIRED" : "PENDING_HUMAN_REVIEW",
    reasons,
    notes: reasons.length === 0
      ? "Mapped to a capture assignment, but still requires explicit human review before acceptance."
      : reasons.join("; ")
  };
}

function matchCaptureRequest(filename, requests) {
  const match = filename.toUpperCase().match(/GFM-CAP-\d{3}/);
  if (!match) return null;
  const captureID = match[0];
  const request = requests.find((candidate) => String(candidate.captureID ?? "").toUpperCase() === captureID);
  if (!request) return { captureID, request: null, confidence: "FILENAME_ID_ONLY_NO_OPEN_REQUEST" };
  return { captureID, request, confidence: "FILENAME_CAPTURE_ID_MATCH" };
}

function buildMissingCoverage({ requests, records }) {
  const covered = new Set(records
    .filter((record) => record.assigned_capture_id && !record.duplicate_of && record.opens_successfully)
    .map((record) => record.assigned_capture_id));
  return requests
    .filter((request) => !covered.has(request.captureID))
    .map((request) => ({
      capture_id: request.captureID,
      priority: request.priority ?? null,
      title: request.title ?? null,
      category: request.exactCategory ?? request.category ?? null,
      reason: "No unique readable intake file currently maps to this capture request."
    }));
}

function summarizeRecords({ records, requests, missingCoverage }) {
  return {
    filesScanned: records.length,
    supportedFiles: records.filter((record) => !record.review_reasons.includes("UNSUPPORTED_FILE_TYPE")).length,
    unsupportedFiles: records.filter((record) => record.review_reasons.includes("UNSUPPORTED_FILE_TYPE")).length,
    unreadableFiles: records.filter((record) => record.review_reasons.includes("UNREADABLE_OR_MISSING_METADATA")).length,
    exactDuplicates: records.filter((record) => record.duplicate_of).length,
    assignedFiles: records.filter((record) => record.assigned_capture_id).length,
    unassignedFiles: records.filter((record) => !record.assigned_capture_id).length,
    recordsRequiringReview: records.filter((record) => record.review_status !== "NO_REVIEW_REQUIRED").length,
    captureRequestsTotal: requests.length,
    captureRequestsCoveredByReadableUniqueIntake: requests.length - missingCoverage.length,
    captureRequestsMissingCoverage: missingCoverage.length,
    productionRecordsCreated: 0,
    productionCatalogRecordsPromoted: 0
  };
}

function collectKnownHashes({ evidenceManifest, videoInventory, intakeManifest }) {
  const hashes = new Map();
  collectHashEntries(evidenceManifest.entries, hashes, "evidence_manifest", ["sha256", "source_file_hash", "file_hash", "checksum"]);
  collectHashEntries(videoInventory.inventory ?? videoInventory.videos, hashes, "video_inventory", ["sha256", "source_file_hash", "file_hash", "checksum"]);
  collectHashEntries(intakeManifest.records, hashes, "previous_intake", ["source_file_hash"]);
  return hashes;
}

function collectHashEntries(entries, hashes, source, keys) {
  if (!Array.isArray(entries)) return;
  for (const entry of entries) {
    for (const key of keys) {
      const value = entry?.[key];
      if (typeof value === "string" && /^[a-f0-9]{64}$/i.test(value)) {
        hashes.set(value.toLowerCase(), {
          source,
          id: entry.evidence_id ?? entry.evidenceID ?? entry.video_id ?? entry.intake_id ?? entry.original_filename ?? source
        });
      }
    }
  }
}

function suggestedCanonicalFilename(originalFilename, captureID) {
  const sanitized = originalFilename.replace(/[^A-Za-z0-9._-]/g, "_");
  if (!captureID || sanitized.toUpperCase().includes(captureID)) return sanitized;
  return `${captureID}_${sanitized}`;
}

function captureDateFromFilename(filename) {
  const match = filename.match(/(20\d{2})[-_]?([01]\d)[-_]?([0-3]\d)/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function buildSourceLocation(root, filePath) {
  const relative = path.relative(root, filePath);
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
    return {
      kind: "REPOSITORY_RELATIVE",
      portablePath: normalizePath(relative)
    };
  }
  return {
    kind: "OWNER_EXTERNAL_REFERENCE",
    portablePath: `OWNER_EXTERNAL_REFERENCE/${path.basename(filePath)}`
  };
}

function portablePath(root, targetPath) {
  const relative = path.relative(root, targetPath);
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) return normalizePath(relative);
  return `OWNER_EXTERNAL_REFERENCE/${path.basename(targetPath)}`;
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function mimeTypeForExtension(extension) {
  switch (extension) {
    case ".mp4": return "video/mp4";
    case ".mov": return "video/quicktime";
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".json": return "application/json";
    case ".csv": return "text/csv";
    case ".txt": return "text/plain";
    case ".md": return "text/markdown";
    default: return "application/octet-stream";
  }
}

function orientationFromDimensions(width, height) {
  if (!width || !height) return "UNKNOWN";
  if (width > height) return "LANDSCAPE";
  if (height > width) return "PORTRAIT";
  return "SQUARE";
}

function readImageDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length >= 24 && buffer.toString("ascii", 1, 4) === "PNG") {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7)
        };
      }
      offset += 2 + length;
    }
  }
  throw new Error("Unsupported or unreadable image dimensions.");
}

function jsonParseError(filePath) {
  try {
    JSON.parse(fs.readFileSync(filePath, "utf8"));
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function makeIntakeID(hash, sourcePath) {
  const digest = crypto.createHash("sha256").update(`${hash}:${sourcePath}`).digest("hex");
  return `GFM-INTAKE-${digest.slice(0, 12).toUpperCase()}`;
}

function sha256FileStream(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

const intakeCsvColumns = [
  "intake_id",
  "original_filename",
  "canonical_filename",
  "assigned_capture_id",
  "category",
  "subcategory",
  "source_platform",
  "capture_date",
  "source_file_hash",
  "file_size",
  "duration",
  "resolution",
  "codec",
  "orientation",
  "duplicate_of",
  "processing_status",
  "review_status",
  "evidence_status",
  "source_location",
  "mime_type",
  "notes"
];

const reviewQueueCsvColumns = [
  "intake_id",
  "original_filename",
  "assigned_capture_id",
  "processing_status",
  "review_status",
  "duplicate_of",
  "reasons",
  "notes"
];

function writeCsv(filePath, rows, columns) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvValue(Array.isArray(row[column]) ? row[column].join("; ") : row[column])).join(","));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function csvValue(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

function writeMarkdownReport(filePath, manifest, reviewQueue, missingCoverage) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const summary = manifest.summary;
  const lines = [
    "# Phase 0 Evidence Intake Report",
    "",
    `Generated: ${manifest.generatedAt}`,
    "",
    "This report covers unreviewed research evidence only. It does not create production catalog records or enable recommendations.",
    "",
    "## Summary",
    "",
    `- Files scanned: ${summary.filesScanned}`,
    `- Supported files: ${summary.supportedFiles}`,
    `- Unsupported files: ${summary.unsupportedFiles}`,
    `- Unreadable files: ${summary.unreadableFiles}`,
    `- Exact duplicates: ${summary.exactDuplicates}`,
    `- Assigned files: ${summary.assignedFiles}`,
    `- Unassigned files: ${summary.unassignedFiles}`,
    `- Capture requests missing coverage: ${summary.captureRequestsMissingCoverage}`,
    `- Production records created: ${summary.productionRecordsCreated}`,
    "",
    "## Review Queue",
    "",
    reviewQueue.length === 0 ? "- No files require review." : "| Intake ID | File | Capture | Status | Reasons |\n|---|---|---|---|---|",
    ...reviewQueue.map((item) => `| ${item.intake_id} | ${item.original_filename} | ${item.assigned_capture_id ?? ""} | ${item.processing_status} | ${(item.reasons ?? []).join("; ")} |`),
    "",
    "## Missing Capture Coverage",
    "",
    missingCoverage.length === 0 ? "- Every open capture request has at least one unique readable intake file in this scan." : "| Capture ID | Priority | Title | Reason |\n|---|---|---|---|",
    ...missingCoverage.map((item) => `| ${item.capture_id} | ${item.priority ?? ""} | ${item.title ?? ""} | ${item.reason} |`)
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function parseArgs(argv) {
  const args = {
    inputPath: defaultInputPath,
    outputRoot: defaultOutputRoot,
    writeOutputs: true
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--path") args.inputPath = argv[++index];
    else if (arg === "--output") args.outputRoot = argv[++index];
    else if (arg === "--dry-run") args.writeOutputs = false;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log([
    "Usage:",
    "  npm run phase-zero:intake -- --path <folder>",
    "",
    "Options:",
    "  --path <folder>   Folder to recursively inspect. Defaults to data/phase-zero/intake/pending.",
    "  --output <folder> Output folder for manifest/review artifacts. Defaults to data/phase-zero/intake.",
    "  --dry-run         Print a summary without writing artifacts."
  ].join("\n"));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      process.exit(0);
    }
    const { manifest, missingCoverage } = await runPhaseZeroIntake(args);
    console.log(`Phase 0 intake scanned ${manifest.summary.filesScanned} file(s).`);
    console.log(`Assigned: ${manifest.summary.assignedFiles}; unassigned: ${manifest.summary.unassignedFiles}; duplicates: ${manifest.summary.exactDuplicates}; missing capture coverage: ${missingCoverage.length}.`);
    if (!args.writeOutputs) console.log("Dry run: no intake artifacts were written.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
