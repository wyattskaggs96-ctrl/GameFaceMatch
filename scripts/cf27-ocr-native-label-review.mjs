#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_OCR_NATIVE_LABEL_REVIEW_SCHEMA_VERSION = "cf27-ocr-native-label-review-v1";
export const ocrNativeLabelReviewLabel = "OCR-ASSISTED NATIVE LABEL REVIEW — NOT PRODUCTION VERIFIED";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutputDirectory = "data/research/cf27/reports/ocr-native-label-review";
const defaultCropRoot = "data/research/cf27/generated/ocr-label-crops";

export const defaultOcrLabelReviewCategories = [
  categoryConfig({
    key: "skinDetails",
    displayName: "Skin Details",
    candidatePath: "data/research/cf27/catalog-candidates/research/skin-details-options-001-010/skin_details_research_candidates.json",
    frameManifestPath: "data/research/cf27/manifests/skin-details-evidence-frames/skin_details_evidence_frame_manifest.json",
    menuRoles: ["MENU"],
    labelCrop: crop(470, 224, 250, 54),
    confidenceThreshold: 0.86
  }),
  categoryConfig({
    key: "eyeShape",
    displayName: "Eye Shape",
    candidatePath: "data/research/cf27/catalog-candidates/research/eye-shape-options-001-005/eye_shape_research_candidates.json",
    frameManifestPath: "data/research/cf27/manifests/eye-shape-evidence-frames/eye_shape_evidence_frame_manifest.json",
    menuRoles: ["MENU"],
    labelCrop: crop(470, 224, 250, 54),
    confidenceThreshold: 0.86
  }),
  categoryConfig({
    key: "eyeColor",
    displayName: "Eye Color",
    candidatePath: "data/research/cf27/catalog-candidates/research/eye-color-options-001-007/eye_color_research_candidates.json",
    frameManifestPath: "data/research/cf27/manifests/eye-color-evidence-frames/eye_color_evidence_frame_manifest.json",
    menuRoles: ["MENU_THUMBNAIL_EVIDENCE"],
    labelCrop: crop(470, 224, 280, 54),
    confidenceThreshold: 0.86
  }),
  categoryConfig({
    key: "nose",
    displayName: "Nose",
    candidatePath: "data/research/cf27/catalog-candidates/research/nose-options-001-007/nose_research_candidates.json",
    frameManifestPath: "data/research/cf27/manifests/nose-evidence-frames/nose_evidence_frame_manifest.json",
    menuRoles: ["MENU_EVIDENCE"],
    labelCrop: crop(470, 224, 250, 54),
    confidenceThreshold: 0.86
  }),
  categoryConfig({
    key: "earShape",
    displayName: "Ear Shape",
    candidatePath: "data/research/cf27/catalog-candidates/research/ear-shape-options-001-004/ear_shape_research_candidates.json",
    frameManifestPath: "data/research/cf27/manifests/ear-shape-evidence-frames/ear_shape_evidence_frame_manifest.json",
    menuRoles: ["MENU_EVIDENCE"],
    labelCrop: crop(470, 224, 310, 54),
    confidenceThreshold: 0.86
  })
];

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] ?? "generate";
  if (["--help", "-h", "help"].includes(command)) {
    printHelp();
  } else if (command === "generate") {
    const report = buildOcrNativeLabelReviewReport({
      root: repositoryRoot,
      generatedAt: new Date().toISOString(),
      ocrEnginePath: cliValue("--ocr-engine"),
      sipsPath: cliValue("--sips"),
      runOcr: !hasFlag("--no-ocr")
    });
    const output = writeOcrNativeLabelReviewOutputs(report, {
      root: repositoryRoot,
      outputDirectory: cliValue("--output-directory") ?? defaultOutputDirectory
    });
    console.log(JSON.stringify({ ok: true, summary: report.summary, files: output.files }, null, 2));
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exitCode = 1;
  }
}

export function buildOcrNativeLabelReviewReport({
  root = repositoryRoot,
  generatedAt = new Date().toISOString(),
  categoryConfigs = defaultOcrLabelReviewCategories,
  runOcr = true,
  ocrEnginePath,
  sipsPath,
  cropRoot = defaultCropRoot
} = {}) {
  const engine = resolveOcrEngine({ requestedPath: ocrEnginePath, runOcr });
  const cropper = resolveCropper({ requestedPath: sipsPath });
  const categories = categoryConfigs.map((config) => analyzeCategory({
    root,
    config,
    engine,
    cropper,
    cropRoot
  }));
  const records = categories.flatMap((category) => category.records);
  const rawOcrOutputs = records.map((record) => record.rawOcrOutput);
  const manualReviewQueue = records
    .filter((record) => record.manualReviewRequired)
    .map((record) => ({
      reviewID: record.reviewID,
      categoryKey: record.categoryKey,
      categoryDisplayName: record.categoryDisplayName,
      stableInternalID: record.stableInternalID,
      nativeOrder: record.nativeOrder,
      candidateNativeLabel: record.candidateNativeLabel,
      ocrTextNormalized: record.ocr.normalizedText,
      ocrConfidence: record.ocr.confidence,
      reviewReason: record.reviewReason,
      priority: record.reviewPriority,
      frameID: record.frame.frameID,
      framePath: record.frame.outputRelativePath,
      cropCoordinates: record.crop.coordinates,
      requiredAction: "Visually inspect the original frame and targeted crop region before confirming or correcting the native label."
    }));

  return {
    schemaVersion: CF27_OCR_NATIVE_LABEL_REVIEW_SCHEMA_VERSION,
    reportLabel: ocrNativeLabelReviewLabel,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PRIMARY_RESEARCH_CANDIDATE",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "OCR_ASSIST_ONLY_VISUAL_CONFIRMATION_REQUIRED",
    scope: categories.map((category) => category.categoryDisplayName),
    policy: {
      ocrRole: "OCR is a secondary aid only. Native labels must be visually confirmed before promotion or publication.",
      cropPolicy: "OCR attempts target one menu-label crop per selected research candidate frame, not full videos.",
      rawOutputPolicy: "Raw OCR output is stored separately from catalog candidates.",
      uncertaintyPolicy: "Low-confidence, missing, unavailable, or mismatched OCR never silently corrects existing labels.",
      productionUseAllowed: false,
      sourceMasterHandling: "The tool reads manifests and generated research frame derivatives only. It never modifies source-video masters.",
      catalogMutationPolicy: "This workflow does not write native labels back into catalog candidate records."
    },
    ocrEngine: {
      requested: runOcr,
      name: engine.name,
      executablePath: engine.executablePath,
      available: engine.available,
      version: engine.version,
      unavailableReason: engine.unavailableReason,
      cropper: {
        name: cropper.name,
        executablePath: cropper.executablePath,
        available: cropper.available,
        unavailableReason: cropper.unavailableReason
      }
    },
    summary: {
      categoriesReviewed: categories.length,
      candidateLabelCount: records.length,
      rawOcrOutputCount: rawOcrOutputs.length,
      ocrAttemptedCount: rawOcrOutputs.filter((output) => output.status === "OCR_ATTEMPTED").length,
      ocrUnavailableCount: rawOcrOutputs.filter((output) => output.status === "OCR_ENGINE_UNAVAILABLE").length,
      highConfidenceAssistCount: records.filter((record) => record.ocr.status === "HIGH_CONFIDENCE_ASSIST").length,
      lowConfidenceQueueCount: records.filter((record) => record.reviewReason === "lowConfidenceOcr").length,
      visualConfirmationRequiredCount: manualReviewQueue.length,
      visuallyConfirmedLabelCount: records.filter((record) => record.visualConfirmation.status === "CONFIRMED").length,
      labelMismatchSuggestionCount: records.filter((record) => record.reviewReason === "ocrCandidateMismatch").length
    },
    categories,
    manualReviewQueue,
    rawOcrOutputs
  };
}

export function writeOcrNativeLabelReviewOutputs(report, {
  root = repositoryRoot,
  outputDirectory = defaultOutputDirectory
} = {}) {
  const absoluteOutputDirectory = path.resolve(root, outputDirectory);
  assertResearchReportOutput(root, absoluteOutputDirectory);
  fs.mkdirSync(absoluteOutputDirectory, { recursive: true });
  const files = {
    report: path.join(absoluteOutputDirectory, "native_label_ocr_review_report.json"),
    rawOcr: path.join(absoluteOutputDirectory, "raw_ocr_outputs.json"),
    queueJson: path.join(absoluteOutputDirectory, "manual_label_review_queue.json"),
    queueCsv: path.join(absoluteOutputDirectory, "manual_label_review_queue.csv"),
    markdown: path.join(absoluteOutputDirectory, "native_label_ocr_review.md")
  };
  fs.writeFileSync(files.report, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(files.rawOcr, `${JSON.stringify({
    schemaVersion: report.schemaVersion,
    reportLabel: report.reportLabel,
    generatedAt: report.generatedAt,
    productionStatus: report.productionStatus,
    rawOcrOutputs: report.rawOcrOutputs
  }, null, 2)}\n`, "utf8");
  fs.writeFileSync(files.queueJson, `${JSON.stringify({
    schemaVersion: report.schemaVersion,
    reportLabel: report.reportLabel,
    generatedAt: report.generatedAt,
    productionStatus: report.productionStatus,
    manualReviewQueue: report.manualReviewQueue
  }, null, 2)}\n`, "utf8");
  fs.writeFileSync(files.queueCsv, formatManualReviewCSV(report.manualReviewQueue), "utf8");
  fs.writeFileSync(files.markdown, formatMarkdownReport(report), "utf8");
  return {
    ok: true,
    outputDirectory: normalizePath(path.relative(root, absoluteOutputDirectory)),
    files: Object.values(files).map((filePath) => normalizePath(path.relative(root, filePath)))
  };
}

export function analyzeCategory({ root, config, engine, cropper, cropRoot = defaultCropRoot }) {
  const candidatePackage = readJson(path.resolve(root, config.candidatePath));
  const frameManifest = readJson(path.resolve(root, config.frameManifestPath));
  const framesByStableID = groupBy(frameManifest.frames ?? [], (frame) => frame.stableInternalID);
  const records = (candidatePackage.records ?? []).map((candidate) => {
    const frame = pickMenuFrame(framesByStableID.get(candidate.stableInternalID) ?? [], config.menuRoles);
    return buildRecordReview({
      root,
      config,
      candidate,
      frame,
      engine,
      cropper,
      cropRoot
    });
  });
  return {
    categoryKey: config.key,
    categoryDisplayName: config.displayName,
    candidatePath: config.candidatePath,
    frameManifestPath: config.frameManifestPath,
    productionStatus: candidatePackage.productionStatus,
    verificationStatus: candidatePackage.verificationStatus,
    candidateLabelCount: records.length,
    visualConfirmationRequiredCount: records.filter((record) => record.manualReviewRequired).length,
    records
  };
}

export function buildRecordReview({ root, config, candidate, frame, engine, cropper, cropRoot = defaultCropRoot }) {
  const reviewID = `ocr-review-${candidate.stableInternalID.toLowerCase()}`;
  const cropInfo = buildCropInfo({
    root,
    cropRoot,
    candidate,
    frame,
    cropDefinition: config.labelCrop
  });
  const rawOcrOutput = runTargetedOcr({
    root,
    engine,
    cropper,
    frame,
    cropInfo,
    candidate,
    categoryKey: config.key
  });
  const ocr = summarizeOcr({
    rawOcrOutput,
    candidateNativeLabel: candidate.nativeLabelOriginalText,
    confidenceThreshold: config.confidenceThreshold
  });
  const review = classifyReview({
    ocr,
    frame,
    candidateNativeLabel: candidate.nativeLabelOriginalText
  });

  return {
    reviewID,
    categoryKey: config.key,
    categoryDisplayName: config.displayName,
    stableInternalID: candidate.stableInternalID,
    nativeOrder: candidate.nativeOrder,
    candidateNativeLabel: candidate.nativeLabelOriginalText,
    candidateVisibleGameLabelOrIndex: candidate.visibleGameLabelOrIndex,
    candidateVerificationState: candidate.verificationState,
    productionStatus: candidate.productionStatus,
    sourceEvidence: candidate.selectedMenuEvidence ?? [],
    frame: frame ? {
      frameID: frame.frameID,
      role: frame.role,
      outputRelativePath: frame.outputRelativePath,
      outputSha256: frame.outputSha256,
      sourceVideoID: frame.sourceVideoID,
      sourceWorkingFilename: frame.sourceWorkingFilename,
      portableRelativeEvidencePath: frame.portableRelativeEvidencePath,
      sourceTimestampSeconds: frame.sourceTimestampSeconds,
      width: frame.width,
      height: frame.height
    } : null,
    crop: cropInfo,
    ocr,
    rawOcrOutput,
    visualConfirmation: {
      required: true,
      status: "REQUIRED_NOT_COMPLETED",
      confirmedBy: null,
      confirmedAt: null,
      confirmedNativeLabel: null,
      notes: "A human reviewer must inspect the original menu frame and crop region. OCR cannot independently create or correct a native label."
    },
    manualReviewRequired: review.manualReviewRequired,
    reviewReason: review.reason,
    reviewPriority: review.priority,
    catalogCandidateLabelAction: "BLOCK_PROMOTION_UNTIL_VISUALLY_CONFIRMED",
    factStatus: "ocr_assist_not_verified_game_fact"
  };
}

export function summarizeOcr({ rawOcrOutput, candidateNativeLabel, confidenceThreshold = 0.86 }) {
  const normalizedText = normalizeOcrText(rawOcrOutput.rawText ?? "");
  const candidateNormalized = normalizeOcrText(candidateNativeLabel ?? "");
  const confidence = Number.isFinite(rawOcrOutput.confidence) ? rawOcrOutput.confidence : 0;
  const exactCandidateMatch = Boolean(normalizedText) && normalizedText === candidateNormalized;
  let status = "UNAVAILABLE";
  if (rawOcrOutput.status === "OCR_ATTEMPTED") {
    status = confidence >= confidenceThreshold ? "HIGH_CONFIDENCE_ASSIST" : "LOW_CONFIDENCE_ASSIST";
  } else if (rawOcrOutput.status === "OCR_ENGINE_UNAVAILABLE") {
    status = "ENGINE_UNAVAILABLE";
  } else if (rawOcrOutput.status === "FRAME_UNAVAILABLE") {
    status = "FRAME_UNAVAILABLE";
  } else if (rawOcrOutput.status === "OCR_ERROR") {
    status = "ERROR";
  }
  return {
    status,
    rawText: rawOcrOutput.rawText,
    normalizedText,
    confidence,
    confidenceSource: rawOcrOutput.confidenceSource,
    confidenceThreshold,
    exactCandidateMatch,
    candidateNormalized,
    canPromoteLabel: false,
    promotionBlockedReason: "Visual confirmation is required even when OCR text appears to match."
  };
}

function classifyReview({ ocr, frame, candidateNativeLabel }) {
  if (!frame) return { manualReviewRequired: true, reason: "missingMenuFrame", priority: "high" };
  if (ocr.status === "ENGINE_UNAVAILABLE") return { manualReviewRequired: true, reason: "ocrEngineUnavailable", priority: "medium" };
  if (ocr.status === "FRAME_UNAVAILABLE") return { manualReviewRequired: true, reason: "frameUnavailable", priority: "high" };
  if (ocr.status === "ERROR") return { manualReviewRequired: true, reason: "ocrError", priority: "high" };
  if (!ocr.normalizedText) return { manualReviewRequired: true, reason: "emptyOcrText", priority: "high" };
  if (!ocr.exactCandidateMatch) return { manualReviewRequired: true, reason: "ocrCandidateMismatch", priority: "high" };
  if (ocr.confidence < ocr.confidenceThreshold) return { manualReviewRequired: true, reason: "lowConfidenceOcr", priority: "medium" };
  if (!candidateNativeLabel) return { manualReviewRequired: true, reason: "missingCandidateNativeLabel", priority: "high" };
  return { manualReviewRequired: true, reason: "visualConfirmationRequired", priority: "low" };
}

function runTargetedOcr({ root, engine, cropper, frame, cropInfo, candidate, categoryKey }) {
  const base = {
    rawOutputID: `raw-ocr-${candidate.stableInternalID.toLowerCase()}`,
    categoryKey,
    stableInternalID: candidate.stableInternalID,
    candidateNativeLabel: candidate.nativeLabelOriginalText,
    frameID: frame?.frameID ?? null,
    framePath: frame?.outputRelativePath ?? null,
    sourceTimestampSeconds: frame?.sourceTimestampSeconds ?? null,
    cropCoordinates: cropInfo.coordinates,
    cropImageRelativePath: cropInfo.cropRelativePath,
    rawText: "",
    confidence: 0,
    confidenceSource: "not_available",
    engineName: engine.name,
    engineVersion: engine.version,
    status: "OCR_ENGINE_UNAVAILABLE",
    error: null
  };

  if (!frame) return { ...base, status: "FRAME_UNAVAILABLE", error: "No menu frame was available for this candidate." };
  if (!engine.available) return { ...base, status: "OCR_ENGINE_UNAVAILABLE", error: engine.unavailableReason };
  if (!cropper.available) return { ...base, status: "OCR_ERROR", error: cropper.unavailableReason };
  const frameAbsolutePath = path.resolve(root, frame.outputRelativePath);
  if (!fs.existsSync(frameAbsolutePath)) {
    return { ...base, status: "FRAME_UNAVAILABLE", error: `Generated frame derivative is missing locally: ${frame.outputRelativePath}` };
  }

  const cropAbsolutePath = path.resolve(root, cropInfo.cropRelativePath);
  fs.mkdirSync(path.dirname(cropAbsolutePath), { recursive: true });
  const cropResult = cropImageWithSips({
    sipsPath: cropper.executablePath,
    inputPath: frameAbsolutePath,
    outputPath: cropAbsolutePath,
    coordinates: cropInfo.coordinates
  });
  if (!cropResult.ok) return { ...base, status: "OCR_ERROR", error: cropResult.error };

  const outputBase = path.join(os.tmpdir(), `${base.rawOutputID}-${Date.now()}`);
  const ocrResult = spawnSync(engine.executablePath, [cropAbsolutePath, outputBase, "--psm", "7", "tsv"], {
    encoding: "utf8",
    timeout: 20_000
  });
  if (ocrResult.status !== 0) {
    return { ...base, status: "OCR_ERROR", error: (ocrResult.stderr || ocrResult.error?.message || "OCR command failed").trim() };
  }
  const tsvPath = `${outputBase}.tsv`;
  const tsv = fs.existsSync(tsvPath) ? fs.readFileSync(tsvPath, "utf8") : "";
  const parsed = parseTesseractTSV(tsv);
  try {
    if (fs.existsSync(tsvPath)) fs.unlinkSync(tsvPath);
  } catch {
    // Best-effort cleanup only; raw OCR content is persisted in the report.
  }
  return {
    ...base,
    rawText: parsed.text,
    confidence: parsed.confidence,
    confidenceSource: "tesseract_tsv_mean_word_confidence",
    status: "OCR_ATTEMPTED",
    error: null
  };
}

function cropImageWithSips({ sipsPath, inputPath, outputPath, coordinates }) {
  const tempPath = `${outputPath}.tmp.png`;
  const cropResult = spawnSync(sipsPath, [
    "--cropOffset",
    String(coordinates.y),
    String(coordinates.x),
    "--cropToHeightWidth",
    String(coordinates.height),
    String(coordinates.width),
    inputPath,
    "--out",
    tempPath
  ], { encoding: "utf8", timeout: 20_000 });
  if (cropResult.status !== 0) {
    return { ok: false, error: (cropResult.stderr || cropResult.error?.message || "sips crop failed").trim() };
  }
  fs.renameSync(tempPath, outputPath);
  return { ok: true };
}

function parseTesseractTSV(tsv) {
  const lines = tsv.trim().split(/\r?\n/);
  if (lines.length < 2) return { text: "", confidence: 0 };
  const headers = lines[0].split("\t");
  const textIndex = headers.indexOf("text");
  const confidenceIndex = headers.indexOf("conf");
  const words = [];
  const confidences = [];
  for (const line of lines.slice(1)) {
    const cells = line.split("\t");
    const text = (cells[textIndex] ?? "").trim();
    const confidence = Number(cells[confidenceIndex]);
    if (!text) continue;
    words.push(text);
    if (Number.isFinite(confidence) && confidence >= 0) confidences.push(confidence / 100);
  }
  const meanConfidence = confidences.length
    ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
    : 0;
  return { text: words.join(" "), confidence: round(meanConfidence, 4) };
}

function buildCropInfo({ root, cropRoot, candidate, frame, cropDefinition }) {
  const relativeCropPath = normalizePath(path.join(
    cropRoot,
    candidate.stableInternalID,
    `${candidate.stableInternalID}_MENU_LABEL_CROP.png`
  ));
  return {
    sourceFrameID: frame?.frameID ?? null,
    sourceFrameRelativePath: frame?.outputRelativePath ?? null,
    cropRelativePath: relativeCropPath,
    cropExistsLocally: fs.existsSync(path.resolve(root, relativeCropPath)),
    coordinates: { ...cropDefinition },
    coordinateSystem: "pixel coordinates in the generated full-resolution menu frame; x/y are upper-left origin",
    target: "native menu label text region",
    reviewerInstruction: "Inspect the full frame and this crop region. Confirm native text visually before changing any catalog candidate."
  };
}

function pickMenuFrame(frames, menuRoles) {
  return frames.find((frame) => menuRoles.includes(frame.role)) ?? frames.find((frame) => String(frame.role).includes("MENU")) ?? null;
}

function categoryConfig(config) {
  return config;
}

function crop(x, y, width, height) {
  return { x, y, width, height };
}

function resolveOcrEngine({ requestedPath, runOcr }) {
  if (!runOcr) {
    return {
      name: "tesseract",
      executablePath: null,
      available: false,
      version: null,
      unavailableReason: "OCR execution disabled by command option."
    };
  }
  const executablePath = requestedPath ?? which("tesseract");
  if (!executablePath) {
    return {
      name: "tesseract",
      executablePath: null,
      available: false,
      version: null,
      unavailableReason: "No local tesseract executable found on PATH. OCR output is unavailable; visual review is required."
    };
  }
  const versionResult = spawnSync(executablePath, ["--version"], { encoding: "utf8", timeout: 10_000 });
  return {
    name: "tesseract",
    executablePath,
    available: versionResult.status === 0,
    version: versionResult.status === 0 ? (versionResult.stdout.split(/\r?\n/)[0] ?? "unknown").trim() : null,
    unavailableReason: versionResult.status === 0 ? null : "Configured tesseract executable did not run successfully."
  };
}

function resolveCropper({ requestedPath }) {
  const executablePath = requestedPath ?? which("sips");
  if (!executablePath) {
    return {
      name: "sips",
      executablePath: null,
      available: false,
      unavailableReason: "No local sips executable found on PATH for targeted crop generation."
    };
  }
  return { name: "sips", executablePath, available: true, unavailableReason: null };
}

function which(binary) {
  const pathEntries = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  for (const pathEntry of pathEntries) {
    const candidatePath = path.join(pathEntry, binary);
    try {
      fs.accessSync(candidatePath, fs.constants.X_OK);
      return candidatePath;
    } catch {
      // Keep searching PATH.
    }
  }
  return null;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function groupBy(items, keyFn) {
  const grouped = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }
  return grouped;
}

function normalizeOcrText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function formatManualReviewCSV(queue) {
  const header = [
    "reviewID",
    "category",
    "stableInternalID",
    "nativeOrder",
    "candidateNativeLabel",
    "ocrTextNormalized",
    "ocrConfidence",
    "reviewReason",
    "priority",
    "frameID",
    "framePath",
    "cropX",
    "cropY",
    "cropWidth",
    "cropHeight",
    "requiredAction"
  ];
  const rows = queue.map((item) => [
    item.reviewID,
    item.categoryDisplayName,
    item.stableInternalID,
    item.nativeOrder,
    item.candidateNativeLabel,
    item.ocrTextNormalized,
    item.ocrConfidence,
    item.reviewReason,
    item.priority,
    item.frameID,
    item.framePath,
    item.cropCoordinates.x,
    item.cropCoordinates.y,
    item.cropCoordinates.width,
    item.cropCoordinates.height,
    item.requiredAction
  ]);
  return `${[header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
}

function formatMarkdownReport(report) {
  const lines = [
    "# CF27 OCR-Assisted Native Label Review",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `**${report.reportLabel}**`,
    "",
    "OCR is a secondary aid only. Every native label still requires visual confirmation against the original menu frame before it can be promoted, verified, or published.",
    "",
    "## Summary",
    "",
    `- Candidate labels reviewed: ${report.summary.candidateLabelCount}`,
    `- OCR attempted: ${report.summary.ocrAttemptedCount}`,
    `- OCR unavailable: ${report.summary.ocrUnavailableCount}`,
    `- Visual confirmations required: ${report.summary.visualConfirmationRequiredCount}`,
    `- Label mismatch suggestions: ${report.summary.labelMismatchSuggestionCount}`,
    "",
    "## Engine",
    "",
    `- OCR engine: ${report.ocrEngine.name}`,
    `- Available: ${report.ocrEngine.available ? "yes" : "no"}`,
    `- Version: ${report.ocrEngine.version ?? "not available"}`,
    `- Cropper: ${report.ocrEngine.cropper.name} (${report.ocrEngine.cropper.available ? "available" : "unavailable"})`,
    "",
    "## Manual Review Queue",
    "",
    "| Category | Record | Candidate label | OCR text | Confidence | Reason |",
    "| --- | --- | --- | --- | ---: | --- |"
  ];
  for (const item of report.manualReviewQueue) {
    lines.push(`| ${item.categoryDisplayName} | ${item.stableInternalID} | ${item.candidateNativeLabel} | ${item.ocrTextNormalized || "not available"} | ${item.ocrConfidence} | ${item.reviewReason} |`);
  }
  return `${lines.join("\n")}\n`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

function assertResearchReportOutput(root, absoluteOutputDirectory) {
  const relative = normalizePath(path.relative(root, absoluteOutputDirectory));
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside repository: ${absoluteOutputDirectory}`);
  }
  if (!relative.startsWith("data/research/cf27/reports/")) {
    throw new Error(`Refusing to write OCR review outputs outside data/research/cf27/reports: ${relative}`);
  }
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function cliValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function printHelp() {
  console.log(`Usage:
  node scripts/cf27-ocr-native-label-review.mjs generate [--output-directory <dir>] [--ocr-engine <path>] [--sips <path>] [--no-ocr]

Creates research-only OCR-assisted native-label review reports for Skin Details, Eye Shape, Eye Color, Nose, and Ear Shape.
OCR is secondary only; visual confirmation is always required before label promotion.`);
}
