#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_STANDARDIZED_CAPTURE_QA_SCHEMA_VERSION = "cf27-standardized-capture-qa-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAtDefault = "2026-07-14T05:15:00-04:00";
const productionStatus = "NOT_PRODUCTION_DATA";
const verificationStatus = "OBSERVED_PENDING_VERIFICATION";

const defaultVideoInventoryPath = "data/phase-zero/video_inventory.json";
const defaultEnvironmentPath = "data/phase-zero/environment_manifest.research.json";
const defaultHeadsPath = "data/phase-zero/heads.research.json";
const defaultAdditionalAttributesPath = "data/phase-zero/additional_attributes.research.json";
const defaultBodyControlsPath = "data/phase-zero/body_controls.research.json";
const defaultOutputJsonPath = "data/phase-zero/standardized_capture_qa.research.json";
const defaultOutputCsvPath = "data/phase-zero/standardized_capture_qa.research.csv";
const defaultRecaptureJsonPath = "data/phase-zero/standardized_capture_recapture_queue.research.json";
const defaultRecaptureCsvPath = "data/phase-zero/standardized_capture_recapture_queue.research.csv";
const defaultMarkdownPath = "docs/phase-zero/STANDARDIZED_CAPTURE_QA_REPORT.md";

const allowedClassifications = new Set([
  "CONSISTENT",
  "CONSISTENT_WITH_NOTES",
  "COMPARISON_LIMITED",
  "RECAPTURE_REQUIRED",
  "UNUSABLE"
]);

const geometryRelevantCategories = new Set(["Head Template", "Eye Shape", "Nose", "Ear Shape"]);
const promptFields = [
  "gameMode",
  "position",
  "archetype",
  "head",
  "skinTone",
  "skinDetails",
  "hairstyle",
  "hairColor",
  "facialHair",
  "facialHairColor",
  "bodyType",
  "height",
  "weight",
  "uniform",
  "equipment",
  "lighting",
  "background",
  "zoom",
  "cameraAngle",
  "cameraDistance",
  "resolution",
  "hdrState",
  "loadingCompletion",
  "animationCompletion"
];

export function generateStandardizedCaptureQA(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const generatedAt = options.generatedAt ?? generatedAtDefault;
  const videoInventory = readJson(path.resolve(root, options.videoInventoryPath ?? defaultVideoInventoryPath));
  const environment = readJson(path.resolve(root, options.environmentPath ?? defaultEnvironmentPath));
  const heads = readJson(path.resolve(root, options.headsPath ?? defaultHeadsPath));
  const additionalAttributes = readJson(path.resolve(root, options.additionalAttributesPath ?? defaultAdditionalAttributesPath));
  const bodyControls = readJson(path.resolve(root, options.bodyControlsPath ?? defaultBodyControlsPath));

  const videoAssessments = (videoInventory.inventory ?? []).map((video) => assessVideo(video, environment));
  const catalogItemAssessments = [
    ...(heads.records ?? []).map((record) => assessHeadRecord(record, environment)),
    ...(additionalAttributes.records ?? []).map((record) => assessAdditionalAttributeRecord(record, environment)),
    ...(bodyControls.records ?? []).map((record) => assessBodyRecord(record, environment))
  ];
  const assessments = [...videoAssessments, ...catalogItemAssessments].map((assessment) => ({
    ...assessment,
    consistencyFingerprint: fingerprint(assessment.fingerprintSource)
  }));
  const recaptureQueue = assessments
    .filter((assessment) => assessment.classification === "RECAPTURE_REQUIRED")
    .map((assessment) => ({
      recaptureID: `standardized-recapture-${assessment.itemID.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
      itemID: assessment.itemID,
      itemType: assessment.itemType,
      nativeLabel: assessment.nativeLabel,
      priority: assessment.materialInconsistency ? "P0" : "P1",
      reason: assessment.blockingReasons.join(" | "),
      requiredAction: assessment.requiredAction,
      existingEvidenceUse: assessment.existingEvidenceUse,
      sourceEvidence: assessment.sourceEvidence
    }));

  return {
    schemaVersion: CF27_STANDARDIZED_CAPTURE_QA_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PHASE_ZERO_STANDARDIZED_CAPTURE_QA",
    sourceType: "shippingGameVideoResearch",
    productionStatus,
    verificationStatus,
    productionRecommendationsEnabled: false,
    sourceVideoInventory: options.videoInventoryPath ?? defaultVideoInventoryPath,
    sourceEnvironmentManifest: options.environmentPath ?? defaultEnvironmentPath,
    sourceHeadCatalog: options.headsPath ?? defaultHeadsPath,
    sourceAdditionalAttributes: options.additionalAttributesPath ?? defaultAdditionalAttributesPath,
    sourceBodyControls: options.bodyControlsPath ?? defaultBodyControlsPath,
    canonicalCaptureStandard: buildCanonicalStandard(environment),
    classificationPolicy: {
      allowedClassifications: [...allowedClassifications],
      geometricMatchingRule: "Only CONSISTENT or CONSISTENT_WITH_NOTES visual records may become geometric matching inputs after production verification. All current records are blocked.",
      recaptureQueueRule: "Only material inconsistencies that block visual/geometric comparison are queued. Context-only and presentation-only evidence remains comparison-limited without a material recapture item."
    },
    summary: summarize(assessments, recaptureQueue),
    assessments,
    recaptureQueue
  };
}

export function writeStandardizedCaptureQA(report, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  writeText(root, options.outputJsonPath ?? defaultOutputJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeText(root, options.outputCsvPath ?? defaultOutputCsvPath, formatAssessmentsCsv(report.assessments));
  writeText(root, options.recaptureJsonPath ?? defaultRecaptureJsonPath, `${JSON.stringify({
    schemaVersion: `${CF27_STANDARDIZED_CAPTURE_QA_SCHEMA_VERSION}-recapture-queue`,
    generatedAt: report.generatedAt,
    productionStatus,
    verificationStatus,
    summary: {
      itemCount: report.recaptureQueue.length,
      materialOnly: true
    },
    recaptureQueue: report.recaptureQueue
  }, null, 2)}\n`);
  writeText(root, options.recaptureCsvPath ?? defaultRecaptureCsvPath, formatRecaptureCsv(report.recaptureQueue));
  writeText(root, options.markdownPath ?? defaultMarkdownPath, formatMarkdown(report));
}

function assessVideo(video, environment) {
  const promptState = basePromptState(environment, {
    head: null,
    loadingCompletion: video.fileOpenStatus === "opens" ? "VIDEO_OPENS_TECHNICALLY" : "VIDEO_DOES_NOT_OPEN",
    animationCompletion: "NOT_APPLICABLE_SOURCE_VIDEO"
  });
  const blockingReasons = [];
  const warnings = [];
  if (video.fileOpenStatus !== "opens") blockingReasons.push("Source video does not open successfully.");
  if (!video.suitability?.productionQualityCatalogImagery) warnings.push("Source video is not production-quality standardized catalog imagery.");
  if (video.exactDuplicate) warnings.push("Exact duplicate video preserved for provenance.");
  const classification = video.fileOpenStatus !== "opens" ? "UNUSABLE" : "COMPARISON_LIMITED";
  return finalizeAssessment({
    itemID: video.inventoryId,
    itemType: "SOURCE_VIDEO",
    nativeLabel: video.canonicalFilename,
    category: "Source Video",
    sourceEvidence: [{
      evidenceID: video.inventoryId,
      canonicalFilename: video.canonicalFilename,
      originalFilename: video.originalFilename,
      sha256: video.sha256,
      portableRelativeEvidencePath: video.sourceLocation?.portableRelativeEvidencePath ?? null
    }],
    promptState,
    classification,
    materialInconsistency: false,
    geometricMatchingEligible: false,
    geometricMatchingGate: "NOT_GEOMETRIC_MATCHING_INPUT",
    blockingReasons,
    warnings,
    requiredAction: "Keep as preserved source evidence. Use derivative standardized captures before visual comparison.",
    existingEvidenceUse: "Menu, count, ordering, and provenance evidence where the source inventory marks it suitable."
  });
}

function assessHeadRecord(record, environment) {
  const promptState = basePromptState(environment, {
    head: record.nativeLabel,
    skinTone: "UNKNOWN_NOT_LOCKED",
    skinDetails: "UNKNOWN_NOT_LOCKED",
    hairstyle: "UNKNOWN_OR_TEMPLATE_VARIABLE",
    hairColor: "UNKNOWN_NOT_LOCKED",
    facialHair: "UNKNOWN_NOT_LOCKED",
    facialHairColor: "UNKNOWN_NOT_LOCKED",
    loadingCompletion: record.sourceObservations?.some((observation) => observation.transitionActive) ? "TRANSITION_OR_LOADING_RISK" : "NOT_VERIFIED_AS_COMPLETE",
    animationCompletion: record.sourceObservations?.some((observation) => observation.transitionAnimationFinished === false) ? "NOT_COMPLETE_IN_PRIMARY_OBSERVATION" : "NOT_VERIFIED_AS_COMPLETE",
    cameraAngle: "APPROXIMATE_MENU_ROTATION_NOT_VERIFIER_CONFIRMED",
    zoom: "LIVE_MENU_ZOOM_NOT_LOCKED",
    cameraDistance: "LIVE_MENU_DISTANCE_NOT_LOCKED"
  });
  const blockingReasons = [
    "Canonical head-template comparison settings are not locked.",
    "Angle, zoom, distance, crop, lighting, and obstruction checks are not approved for production geometry.",
    "Current head record is explicitly not suitable for production geometric comparison."
  ];
  if (record.qualityStatus?.includes("MENU_EVIDENCE_ONLY")) blockingReasons.push("Menu evidence only; matching views are missing or inadequate.");
  if (record.sourceObservations?.some((observation) => observation.transitionActive)) blockingReasons.push("Transition contamination is present in the source observation.");
  return finalizeAssessment({
    itemID: record.stableResearchCatalogID,
    itemType: "CATALOG_IMAGE_RECORD",
    nativeLabel: record.nativeLabel,
    category: "Head Template",
    sourceEvidence: compactSourceEvidence(record),
    promptState,
    classification: "RECAPTURE_REQUIRED",
    materialInconsistency: true,
    geometricMatchingEligible: false,
    geometricMatchingGate: "BLOCKED_STANDARDIZED_CAPTURE_REQUIRED",
    blockingReasons,
    warnings: record.ambiguities ?? [],
    requiredAction: "Recapture using locked canonical settings with verified front, three-quarter, profile, and rear views before geometric matching.",
    existingEvidenceUse: "Valid research identity/order/menu evidence; not production geometry."
  });
}

function assessAdditionalAttributeRecord(record, environment) {
  const geometryRelevant = geometryRelevantCategories.has(record.category);
  const promptState = basePromptState(environment, {
    head: "UNKNOWN_OR_CURRENT_PREVIEW_HEAD_NOT_LOCKED",
    skinTone: record.category === "Skin Tone" ? record.nativeDisplayLabel : "UNKNOWN_NOT_LOCKED",
    skinDetails: record.category === "Skin Details" ? record.nativeDisplayLabel : "UNKNOWN_NOT_LOCKED",
    hairColor: "UNKNOWN_NOT_LOCKED",
    hairstyle: "UNKNOWN_NOT_LOCKED",
    facialHair: "UNKNOWN_NOT_LOCKED",
    facialHairColor: "UNKNOWN_NOT_LOCKED",
    loadingCompletion: record.sourceObservations?.some((observation) => observation.transitionActive) ? "TRANSITION_OR_LOADING_RISK" : "NOT_VERIFIED_AS_COMPLETE",
    animationCompletion: "NOT_VERIFIED_AS_COMPLETE",
    cameraAngle: "MENU_FRAME_OR_REPRESENTATIVE_FRAME_NOT_STANDARDIZED",
    zoom: "LIVE_MENU_ZOOM_NOT_LOCKED",
    cameraDistance: "LIVE_MENU_DISTANCE_NOT_LOCKED"
  });
  const blockingReasons = [
    "Canonical capture settings are not fully locked.",
    "Selector boundaries, defaults, and production evidence are not verified."
  ];
  if (geometryRelevant) {
    blockingReasons.push("Geometry-relevant appearance-control imagery is not standardized for geometric matching.");
  }
  const classification = geometryRelevant ? "RECAPTURE_REQUIRED" : "COMPARISON_LIMITED";
  return finalizeAssessment({
    itemID: record.stableResearchCatalogID,
    itemType: "CATALOG_IMAGE_RECORD",
    nativeLabel: record.nativeDisplayLabel,
    category: record.category,
    sourceEvidence: compactSourceEvidence(record),
    promptState,
    classification,
    materialInconsistency: geometryRelevant,
    geometricMatchingEligible: false,
    geometricMatchingGate: geometryRelevant ? "BLOCKED_STANDARDIZED_CAPTURE_REQUIRED" : "NOT_GEOMETRIC_MATCHING_INPUT",
    blockingReasons,
    warnings: record.ambiguities ?? [],
    requiredAction: geometryRelevant
      ? "Recapture this control under the approved canonical comparison setup before geometric matching."
      : "Keep as research/menu evidence; do not use for geometric matching.",
    existingEvidenceUse: "Research menu/order/value evidence only."
  });
}

function assessBodyRecord(record, environment) {
  const promptState = basePromptState(environment, {
    head: "NOT_APPLICABLE_CONTEXT_RECORD",
    loadingCompletion: "VIDEO_CONTEXT_ONLY",
    animationCompletion: "VIDEO_CONTEXT_ONLY"
  });
  return finalizeAssessment({
    itemID: record.stableResearchID,
    itemType: "CONTEXT_VIDEO_RECORD",
    nativeLabel: record.nativeDisplayLabel,
    category: record.recordKind,
    sourceEvidence: record.sourceEvidence ?? [],
    promptState,
    classification: "COMPARISON_LIMITED",
    materialInconsistency: false,
    geometricMatchingEligible: false,
    geometricMatchingGate: "NOT_GEOMETRIC_MATCHING_INPUT",
    blockingReasons: ["Context record is not visual geometry evidence."],
    warnings: record.notes ?? [],
    requiredAction: "Use as creation-path context only until direct body-control and dependency evidence exists.",
    existingEvidenceUse: "Creation-path context and dependency planning."
  });
}

function finalizeAssessment(input) {
  if (!allowedClassifications.has(input.classification)) {
    throw new Error(`Unsupported classification ${input.classification}`);
  }
  return {
    itemID: input.itemID,
    itemType: input.itemType,
    nativeLabel: input.nativeLabel,
    category: input.category,
    classification: input.classification,
    materialInconsistency: input.materialInconsistency,
    geometricMatchingEligible: input.geometricMatchingEligible,
    geometricMatchingGate: input.geometricMatchingGate,
    promptState: input.promptState,
    fingerprintSource: {
      itemID: input.itemID,
      itemType: input.itemType,
      category: input.category,
      nativeLabel: input.nativeLabel,
      promptState: input.promptState,
      sourceEvidence: input.sourceEvidence
    },
    sourceEvidence: input.sourceEvidence,
    blockingReasons: input.blockingReasons,
    warnings: input.warnings,
    requiredAction: input.requiredAction,
    existingEvidenceUse: input.existingEvidenceUse
  };
}

function basePromptState(environment, overrides = {}) {
  return {
    gameMode: environment.gameMode ?? "UNKNOWN",
    position: environment.position ?? "UNKNOWN",
    archetype: environment.archetype ?? environment.observedJourneyTypeHighlight ?? "UNKNOWN",
    head: "UNKNOWN_NOT_LOCKED",
    skinTone: "UNKNOWN_NOT_LOCKED",
    skinDetails: "UNKNOWN_NOT_LOCKED",
    hairstyle: "UNKNOWN_NOT_LOCKED",
    hairColor: "UNKNOWN_NOT_LOCKED",
    facialHair: "UNKNOWN_NOT_LOCKED",
    facialHairColor: "UNKNOWN_NOT_LOCKED",
    bodyType: "UNKNOWN_NOT_CAPTURED",
    height: "UNKNOWN_NOT_CAPTURED",
    weight: "UNKNOWN_NOT_CAPTURED",
    uniform: "UNKNOWN_NOT_LOCKED",
    equipment: "UNKNOWN_NOT_LOCKED",
    lighting: "GAME_MENU_LIGHTING_NOT_STANDARDIZED",
    background: "GAME_MENU_BACKGROUND_NOT_STANDARDIZED",
    zoom: "UNKNOWN_NOT_LOCKED",
    cameraAngle: "UNKNOWN_NOT_VERIFIED",
    cameraDistance: "UNKNOWN_NOT_LOCKED",
    resolution: environment.sourceVideo?.dimensions
      ? `${environment.sourceVideo.dimensions.width}x${environment.sourceVideo.dimensions.height}`
      : "UNKNOWN",
    hdrState: "UNKNOWN_NOT_VISIBLE",
    loadingCompletion: "UNKNOWN_NOT_VERIFIED",
    animationCompletion: "UNKNOWN_NOT_VERIFIED",
    ...overrides
  };
}

function buildCanonicalStandard(environment) {
  return {
    status: "PARTIAL_RESEARCH_STANDARD_NOT_PRODUCTION_APPROVED",
    requiredFields: promptFields,
    currentlySupportedFields: {
      gameMode: environment.gameMode ?? null,
      position: environment.position ?? null,
      archetype: environment.archetype ?? null,
      observedJourneyTypeHighlight: environment.observedJourneyTypeHighlight ?? null,
      resolution: environment.sourceVideo?.dimensions ?? null,
      hdrState: null
    },
    unresolvedFields: promptFields.filter((field) => !["gameMode", "position", "resolution"].includes(field)),
    note: "The approved production capture standard is not complete. Unknown fields are preserved as unresolved and block visual/geometric matching."
  };
}

function compactSourceEvidence(record) {
  const primary = record.evidenceFrame ?? record.fullScreenEvidence ?? {};
  return [{
    evidenceID: primary.evidenceID ?? record.sourceObservations?.[0]?.evidenceID ?? null,
    timelineRecordID: primary.timelineRecordID ?? record.sourceObservations?.[0]?.timelineRecordID ?? null,
    path: primary.path ?? record.sourceObservations?.[0]?.evidenceFramePath ?? null,
    timestamp: primary.timestamp ?? record.sourceObservations?.[0]?.evidenceFrameTimestamp ?? null,
    sourceVideo: record.sourceVideo ?? record.primarySourceVideo ?? record.sourceObservations?.[0]?.sourceVideo ?? null
  }];
}

function summarize(assessments, recaptureQueue) {
  const counts = Object.fromEntries([...allowedClassifications].map((classification) => [
    classification,
    assessments.filter((assessment) => assessment.classification === classification).length
  ]));
  return {
    totalAssessments: assessments.length,
    videoAssessments: assessments.filter((assessment) => assessment.itemType === "SOURCE_VIDEO").length,
    catalogImageAssessments: assessments.filter((assessment) => assessment.itemType === "CATALOG_IMAGE_RECORD").length,
    contextAssessments: assessments.filter((assessment) => assessment.itemType === "CONTEXT_VIDEO_RECORD").length,
    classificationCounts: counts,
    geometricMatchingEligibleCount: assessments.filter((assessment) => assessment.geometricMatchingEligible).length,
    geometricMatchingBlockedCount: assessments.filter((assessment) => assessment.geometricMatchingGate === "BLOCKED_STANDARDIZED_CAPTURE_REQUIRED").length,
    materialRecaptureQueueCount: recaptureQueue.length,
    productionGateStatus: "BLOCKED_NO_STANDARDIZED_VERIFIED_COMPARISON_IMAGES"
  };
}

function formatAssessmentsCsv(assessments) {
  const columns = [
    "itemID",
    "itemType",
    "category",
    "nativeLabel",
    "classification",
    "consistencyFingerprint",
    "materialInconsistency",
    "geometricMatchingEligible",
    "geometricMatchingGate",
    "blockingReasons"
  ];
  return toCsv(columns, assessments.map((assessment) => ({
    ...assessment,
    blockingReasons: assessment.blockingReasons.join("; ")
  })));
}

function formatRecaptureCsv(queue) {
  const columns = ["recaptureID", "itemID", "itemType", "nativeLabel", "priority", "reason", "requiredAction"];
  return toCsv(columns, queue);
}

function formatMarkdown(report) {
  const lines = [
    "# Standardized Capture QA Report",
    "",
    "PRIMARY RESEARCH CANDIDATE - NOT PRODUCTION VERIFIED",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "This report audits current research catalog images and source videos against the current canonical capture standard. Unknown fields remain unresolved and block geometric matching.",
    "",
    "## Summary",
    "",
    `- Total assessments: ${report.summary.totalAssessments}`,
    `- Source videos assessed: ${report.summary.videoAssessments}`,
    `- Catalog image records assessed: ${report.summary.catalogImageAssessments}`,
    `- Context records assessed: ${report.summary.contextAssessments}`,
    `- Geometric matching eligible: ${report.summary.geometricMatchingEligibleCount}`,
    `- Geometric matching blocked by standardized-capture QA: ${report.summary.geometricMatchingBlockedCount}`,
    `- Material recapture queue items: ${report.summary.materialRecaptureQueueCount}`,
    `- Production gate: ${report.summary.productionGateStatus}`,
    "",
    "## Classification Counts",
    "",
    "| Classification | Count |",
    "| --- | ---: |"
  ];
  for (const [classification, count] of Object.entries(report.summary.classificationCounts)) {
    lines.push(`| ${classification} | ${count} |`);
  }
  lines.push("");
  lines.push("## Geometric Matching Gate");
  lines.push("");
  lines.push("No current research catalog image is eligible for geometric matching. Items classified as RECAPTURE_REQUIRED need standardized comparison evidence. Items classified as COMPARISON_LIMITED remain useful as research/menu/context evidence but are not geometric matching inputs.");
  lines.push("");
  lines.push("## Material Recapture Queue");
  lines.push("");
  lines.push("| Item | Category | Native label | Priority |");
  lines.push("| --- | --- | --- | --- |");
  for (const item of report.recaptureQueue) {
    const assessment = report.assessments.find((entry) => entry.itemID === item.itemID);
    lines.push(`| ${item.itemID} | ${assessment?.category ?? ""} | ${item.nativeLabel} | ${item.priority} |`);
  }
  lines.push("");
  lines.push("## Output Files");
  lines.push("");
  lines.push(`- Machine-readable QA: \`${defaultOutputJsonPath}\``);
  lines.push(`- CSV QA: \`${defaultOutputCsvPath}\``);
  lines.push(`- Machine-readable material recapture queue: \`${defaultRecaptureJsonPath}\``);
  lines.push(`- CSV material recapture queue: \`${defaultRecaptureCsvPath}\``);
  return `${lines.join("\n")}\n`;
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function toCsv(columns, rows) {
  return `${[columns, ...rows.map((row) => columns.map((column) => row[column] ?? ""))]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n")}\n`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeText(root, relativePath, text) {
  const filePath = path.resolve(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function parseCliArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--generated-at") options.generatedAt = argv[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log("Usage: node scripts/cf27-standardized-capture-qa.mjs [--generated-at <iso>]");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }
    const report = generateStandardizedCaptureQA(options);
    writeStandardizedCaptureQA(report, options);
    console.log(`Standardized capture QA generated: ${report.assessments.length} assessments, ${report.recaptureQueue.length} recapture items.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
