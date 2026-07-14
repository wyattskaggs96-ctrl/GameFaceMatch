#!/usr/bin/env node
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_VIDEO_TIMELINE_MAP_SCHEMA_VERSION = "cf27-video-timeline-map-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultInventoryPath = "data/phase-zero/video_inventory.json";
const defaultSourceTimelinePath = "data/research/cf27/video_timeline_index.json";
const defaultResearchEvidencePath = "data/research/cf27/manifests/current-evidence/current_evidence_manifest.json";
const defaultTimelineJsonPath = "data/phase-zero/video_timeline.json";
const defaultTimelineCsvPath = "data/phase-zero/video_timeline.csv";
const defaultTimelineDocPath = "docs/phase-zero/VIDEO_TIMELINE_MAP.md";
const defaultEvidenceManifestJsonPath = "data/phase-zero/evidence_manifest.json";
const defaultEvidenceManifestCsvPath = "data/phase-zero/evidence_manifest.csv";
const defaultCaptureLogJsonPath = "data/phase-zero/capture_log.json";
const defaultCaptureLogCsvPath = "data/phase-zero/capture_log.csv";
const defaultDerivativeRoot = "data/phase-zero/derivative-frames";
const defaultFfmpegWrapper = "scripts/media/ffmpeg-wrapper";
const verificationStatus = "OBSERVED_PENDING_VERIFICATION";

const timelineColumns = [
  "video_id",
  "original_filename",
  "canonical_filename",
  "start_timestamp",
  "end_timestamp",
  "event_type",
  "parent_menu",
  "visible_menu_label",
  "visible_option_label",
  "visible_option_index",
  "observed_action",
  "confidence",
  "transition_active",
  "blur_present",
  "obstruction_present",
  "usable_for_count",
  "usable_for_order",
  "usable_for_visual_analysis",
  "extracted_frame_path",
  "notes"
];

const evidenceColumns = [
  "evidence_id",
  "timeline_record_id",
  "video_id",
  "relative_path",
  "master_or_derivative",
  "file_role",
  "sha256",
  "size_bytes",
  "mime_type",
  "source_video",
  "timestamp",
  "verification_state",
  "notes"
];

const captureLogColumns = [
  "capture_event_id",
  "timeline_record_id",
  "video_id",
  "start_timestamp",
  "end_timestamp",
  "category",
  "native_option",
  "action",
  "evidence_generated",
  "issue_detected",
  "verification_state",
  "notes"
];

export async function generateVideoTimelineMap(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const inventory = readJson(path.resolve(root, options.inventoryPath ?? defaultInventoryPath));
  const sourceTimeline = readJson(path.resolve(root, options.sourceTimelinePath ?? defaultSourceTimelinePath));
  const researchEvidence = readJson(path.resolve(root, options.researchEvidencePath ?? defaultResearchEvidencePath));
  const derivativeRoot = path.resolve(root, options.derivativeRoot ?? defaultDerivativeRoot);
  const ffmpegWrapper = path.resolve(root, options.ffmpegWrapper ?? defaultFfmpegWrapper);
  const shouldExtractFrames = options.extractFrames !== false;

  const videoMap = buildVideoMap(inventory);
  const researchEvidenceIndex = buildResearchEvidenceIndex(researchEvidence);
  const timelineRecords = [];
  const evidenceEntries = [];
  const captureEvents = [];
  const warnings = [];

  for (const video of videoMap.uniqueVideos) {
    evidenceEntries.push(sourceMasterEvidence(video));
  }

  for (const event of sourceTimeline.events ?? []) {
    const video = videoMap.byLegacyID.get(event.videoId);
    if (!video || video.exactDuplicate || video.fileOpenStatus !== "opens") continue;
    const linkedEvidence = findLinkedEvidence(event, researchEvidenceIndex);
    let extractedFramePath = linkedEvidence?.relativePath ?? "";
    let linkedEvidenceEntry = linkedEvidence ? timelineDerivativeEvidence(event, video, linkedEvidence, "existing_research_derivative") : null;

    if (!linkedEvidenceEntry && shouldExtractFrameForEvent(event)) {
      const extracted = await extractTimelineFrame(event, video, {
        root,
        derivativeRoot,
        ffmpegWrapper,
        extractor: options.extractor
      });
      if (extracted.ok) {
        extractedFramePath = extracted.relativePath;
        linkedEvidenceEntry = timelineDerivativeEvidence(event, video, extracted, "phase_zero_timeline_derivative");
      } else {
        warnings.push({
          code: "timelineFrameExtractionFailed",
          timelineID: event.timelineId,
          videoID: video.inventoryId,
          message: extracted.message
        });
      }
    }

    if (linkedEvidenceEntry) evidenceEntries.push(linkedEvidenceEntry);

    const record = timelineRecordForEvent(event, video, extractedFramePath);
    timelineRecords.push(record);
    captureEvents.push(captureLogEventFor(record, linkedEvidenceEntry));
  }

  const duplicateContinuity = findRepeatedOptions(timelineRecords);
  const summary = {
    videosCovered: new Set(timelineRecords.map((record) => record.video_id)).size,
    sourceEvents: sourceTimeline.events?.length ?? 0,
    timelineRecords: timelineRecords.length,
    optionChangeEvents: timelineRecords.filter((record) => record.event_type === "option_change").length,
    menuTransitionEvents: timelineRecords.filter((record) => record.event_type === "menu_transition").length,
    loadingEvents: timelineRecords.filter((record) => record.event_type === "loading_transition").length,
    blurryEvents: timelineRecords.filter((record) => record.blur_present).length,
    obstructedEvents: timelineRecords.filter((record) => record.obstruction_present).length,
    recordsWithFrames: timelineRecords.filter((record) => record.extracted_frame_path).length,
    sourceMasterEvidenceEntries: evidenceEntries.filter((entry) => entry.master_or_derivative === "master").length,
    derivativeEvidenceEntries: evidenceEntries.filter((entry) => entry.master_or_derivative === "derivative").length,
    repeatedOptionsForContinuity: duplicateContinuity.length,
    verificationStatus
  };

  const timeline = {
    schemaVersion: CF27_VIDEO_TIMELINE_MAP_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PHASE_ZERO_VIDEO_TIMELINE",
    sourceType: "research",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus,
    sourceInventory: options.inventoryPath ?? defaultInventoryPath,
    sourceTimeline: options.sourceTimelinePath ?? defaultSourceTimelinePath,
    sourceEvidenceManifest: options.researchEvidencePath ?? defaultResearchEvidencePath,
    inspectionBasis: "Direct visual timeline observations from the existing source-video timeline index. OCR is not used as final authority.",
    framePolicy: "Representative frames are existing full-resolution derivatives where available; additional frames are extracted only for useful selected-option events without an existing derivative.",
    summary,
    repeatedOptionsForContinuity: duplicateContinuity,
    warnings,
    records: timelineRecords
  };

  const evidenceManifest = {
    schemaVersion: `${CF27_VIDEO_TIMELINE_MAP_SCHEMA_VERSION}-evidence-manifest`,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PHASE_ZERO_TIMELINE_EVIDENCE_MANIFEST",
    sourceType: "research",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus,
    summary: {
      entries: evidenceEntries.length,
      sourceMasters: summary.sourceMasterEvidenceEntries,
      derivatives: summary.derivativeEvidenceEntries,
      generatedTimelineDerivatives: evidenceEntries.filter((entry) => entry.file_role === "phase_zero_timeline_derivative").length
    },
    entries: stableUniqueEvidenceEntries(evidenceEntries)
  };

  const captureLog = {
    schemaVersion: `${CF27_VIDEO_TIMELINE_MAP_SCHEMA_VERSION}-capture-log`,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PHASE_ZERO_TIMELINE_CAPTURE_LOG",
    sourceType: "research",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus,
    summary: {
      events: captureEvents.length,
      eventsWithEvidence: captureEvents.filter((event) => event.evidence_generated.length > 0).length,
      eventsWithIssues: captureEvents.filter((event) => event.issue_detected.length > 0).length
    },
    events: captureEvents
  };

  return { timeline, evidenceManifest, captureLog };
}

export function writeVideoTimelineMap(outputs, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  writeText(root, options.timelineJsonPath ?? defaultTimelineJsonPath, `${JSON.stringify(outputs.timeline, null, 2)}\n`);
  writeText(root, options.timelineCsvPath ?? defaultTimelineCsvPath, toCsv(timelineColumns, outputs.timeline.records));
  writeText(root, options.timelineDocPath ?? defaultTimelineDocPath, timelineMarkdown(outputs.timeline));
  writeText(root, options.evidenceManifestJsonPath ?? defaultEvidenceManifestJsonPath, `${JSON.stringify(outputs.evidenceManifest, null, 2)}\n`);
  writeText(root, options.evidenceManifestCsvPath ?? defaultEvidenceManifestCsvPath, toCsv(evidenceColumns, outputs.evidenceManifest.entries));
  writeText(root, options.captureLogJsonPath ?? defaultCaptureLogJsonPath, `${JSON.stringify(outputs.captureLog, null, 2)}\n`);
  writeText(root, options.captureLogCsvPath ?? defaultCaptureLogCsvPath, toCsv(captureLogColumns, outputs.captureLog.events));
}

function buildVideoMap(inventory) {
  const uniqueVideos = (inventory.inventory ?? []).filter((video) => !video.exactDuplicate && video.fileOpenStatus === "opens");
  const byLegacyID = new Map(uniqueVideos.map((video) => [legacyVideoID(video), video]));
  return { uniqueVideos, byLegacyID };
}

function legacyVideoID(video) {
  if (Number.isFinite(video.manifestSequence)) return `video-${String(video.manifestSequence).padStart(3, "0")}`;
  const match = video.inventoryId.match(/(\d+)$/);
  return match ? `video-${match[1]}` : video.inventoryId;
}

function buildResearchEvidenceIndex(researchEvidence) {
  const entries = researchEvidence.entries ?? [];
  return entries
    .filter((entry) => entry.masterOrDerivative === "derivative")
    .sort((left, right) => evidencePreference(left) - evidencePreference(right));
}

function evidencePreference(entry) {
  if (entry.fileRole === "menuEvidenceFrame") return 0;
  if (entry.view === "MENU") return 1;
  if (entry.fileRole === "menuThumbnailEvidenceFrame") return 2;
  return 10;
}

function findLinkedEvidence(event, evidenceEntries) {
  const candidates = evidenceEntries.filter((entry) => {
    if (entry.sourceVideo !== event.videoId) return false;
    if (!Number.isFinite(entry.timestamp)) return false;
    return entry.timestamp >= event.startSeconds && entry.timestamp <= event.endSeconds;
  });
  return candidates[0] ?? null;
}

function shouldExtractFrameForEvent(event) {
  if (event.characterLoading || event.motionBlurObserved) return false;
  if (event.selectionState === "deliberately_selected" || event.selectionState === "deliberately_reselected_same_native_identity") return true;
  return event.eventTypes?.includes("menu_exits") || event.notificationOverlayObserved;
}

async function extractTimelineFrame(event, video, { root, derivativeRoot, ffmpegWrapper, extractor }) {
  const timestamp = representativeTimestamp(event);
  const filename = `${event.timelineId}_${slug(video.canonicalFilename)}_${timestampLabel(timestamp)}.png`;
  const relativePath = normalizeRelativePath(path.relative(root, path.join(derivativeRoot, filename)));
  const absoluteOutput = path.resolve(root, relativePath);
  if (typeof extractor === "function") {
    return extractor({ event, video, timestamp, relativePath, absoluteOutput });
  }
  if (fs.existsSync(absoluteOutput)) {
    return fileEvidenceResult(relativePath, absoluteOutput, timestamp);
  }
  fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
  const sourcePath = video.sourceLocation?.absoluteDiscoveryPathInternal;
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return { ok: false, message: `Source video not available for extraction: ${video.inventoryId}` };
  }
  const result = spawnSync(ffmpegWrapper, [
    "ffmpeg",
    "-hide_banner",
    "-y",
    "-ss",
    String(timestamp),
    "-i",
    sourcePath,
    "-frames:v",
    "1",
    absoluteOutput
  ], { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    return {
      ok: false,
      message: result.error?.message ?? (result.stderr?.trim() || "ffmpeg frame extraction failed")
    };
  }
  return fileEvidenceResult(relativePath, absoluteOutput, timestamp);
}

function fileEvidenceResult(relativePath, absolutePath, timestamp) {
  const stat = fs.statSync(absolutePath);
  return {
    ok: true,
    relativePath,
    sha256: sha256File(absolutePath),
    sizeBytes: stat.size,
    mimeType: "image/png",
    timestamp
  };
}

function timelineRecordForEvent(event, video, extractedFramePath) {
  return {
    timeline_record_id: `phase0-${event.timelineId}`,
    video_id: video.inventoryId,
    source_timeline_id: event.timelineId,
    original_filename: video.originalFilename,
    canonical_filename: video.canonicalFilename,
    start_timestamp: event.startSeconds,
    end_timestamp: event.endSeconds,
    event_type: primaryEventType(event),
    parent_menu: parentMenuFor(event.menuHeading),
    visible_menu_label: event.menuHeading ?? "",
    visible_option_label: event.selectedNativeOptionLabel ?? "",
    visible_option_index: visibleOptionIndex(event.selectedNativeOptionLabel),
    observed_action: observedActionFor(event),
    confidence: confidenceFor(event),
    transition_active: Boolean(event.characterLoading || event.rotationObserved || event.menuExitObserved),
    blur_present: Boolean(event.motionBlurObserved),
    obstruction_present: Boolean(event.notificationOverlayObserved),
    usable_for_count: usableForCount(event),
    usable_for_order: usableForOrder(event),
    usable_for_visual_analysis: usableForVisualAnalysis(event),
    extracted_frame_path: extractedFramePath,
    verification_status: verificationStatus,
    notes: event.notes ?? ""
  };
}

function captureLogEventFor(record, evidenceEntry) {
  const issues = [];
  if (record.blur_present) issues.push("blur_present");
  if (record.obstruction_present) issues.push("obstruction_present");
  if (record.transition_active && record.event_type !== "option_change") issues.push("transition_active");
  if (!record.usable_for_visual_analysis && record.visible_option_label) issues.push("limited_visual_analysis");
  return {
    capture_event_id: `capture-${record.timeline_record_id}`,
    timeline_record_id: record.timeline_record_id,
    video_id: record.video_id,
    start_timestamp: record.start_timestamp,
    end_timestamp: record.end_timestamp,
    category: record.visible_menu_label,
    native_option: record.visible_option_label || null,
    action: record.observed_action,
    evidence_generated: evidenceEntry ? [evidenceEntry.evidence_id] : [],
    issue_detected: issues,
    verification_state: verificationStatus,
    notes: record.notes
  };
}

function sourceMasterEvidence(video) {
  return {
    evidence_id: `phase0-source-${video.inventoryId}`,
    timeline_record_id: null,
    video_id: video.inventoryId,
    relative_path: video.sourceLocation?.portableRelativeEvidencePath ?? "",
    master_or_derivative: "master",
    file_role: "source_video_master_reference",
    sha256: video.sha256,
    size_bytes: video.fileSizeBytes,
    mime_type: mimeTypeForFilename(video.discoveredFilename ?? video.originalFilename),
    source_video: video.canonicalFilename,
    timestamp: null,
    verification_state: verificationStatus,
    notes: "Portable reference to source master. Original file is preserved unchanged outside production catalog data."
  };
}

function timelineDerivativeEvidence(event, video, evidence, role) {
  return {
    evidence_id: `phase0-frame-${event.timelineId}`,
    timeline_record_id: `phase0-${event.timelineId}`,
    video_id: video.inventoryId,
    relative_path: evidence.relativePath,
    master_or_derivative: "derivative",
    file_role: role,
    sha256: evidence.sha256,
    size_bytes: evidence.sizeBytes,
    mime_type: evidence.mimeType ?? "image/png",
    source_video: video.canonicalFilename,
    timestamp: evidence.timestamp ?? representativeTimestamp(event),
    verification_state: verificationStatus,
    notes: role === "existing_research_derivative"
      ? "Existing research derivative frame linked to this timeline event; source video remains unchanged."
      : "Phase 0 timeline derivative extracted at full source resolution without cropping or appearance alteration."
  };
}

function stableUniqueEvidenceEntries(entries) {
  const byID = new Map();
  for (const entry of entries) {
    if (!byID.has(entry.evidence_id)) byID.set(entry.evidence_id, entry);
  }
  return [...byID.values()].sort((left, right) => left.evidence_id.localeCompare(right.evidence_id));
}

function findRepeatedOptions(records) {
  const seen = new Map();
  const repeated = [];
  for (const record of records) {
    if (!record.visible_option_label) continue;
    const key = `${record.visible_menu_label}::${record.visible_option_label}`;
    const first = seen.get(key);
    if (first) {
      repeated.push({
        menu: record.visible_menu_label,
        option: record.visible_option_label,
        firstTimelineRecordID: first.timeline_record_id,
        repeatedTimelineRecordID: record.timeline_record_id,
        note: "Repeated observed option retained for continuity and not silently merged."
      });
    } else {
      seen.set(key, record);
    }
  }
  return repeated;
}

function primaryEventType(event) {
  if (event.characterLoading) return "loading_transition";
  if (event.eventTypes?.includes("option_changes") && event.selectedNativeOptionLabel) return "option_change";
  if (event.eventTypes?.includes("menu_exits")) return "menu_exit";
  if (event.rotationObserved) return "rotation";
  if (event.eventTypes?.includes("navigation_screens")) return "menu_transition";
  if (event.stableVisualPeriod) return "pause_stable_period";
  return "observation";
}

function parentMenuFor(menuHeading) {
  if (!menuHeading) return "";
  const normalized = menuHeading.toUpperCase();
  if (["HEAD TEMPLATE", "SKIN TONE", "SKIN DETAILS", "EYE SHAPE", "EYE COLOR", "NOSE", "EAR SHAPE"].includes(normalized)) return "Head & Skin";
  if (menuHeading.includes("Create Player")) return "Create Player";
  if (menuHeading.includes("Road to Glory")) return "Road to Glory";
  return "";
}

function visibleOptionIndex(label) {
  if (!label) return null;
  const match = label.match(/(?:Face|Tone)\s+0*(\d+)/i);
  return match ? Number(match[1]) : null;
}

function observedActionFor(event) {
  if (event.selectionState === "deliberately_reselected_same_native_identity") return "repeated_option_for_continuity";
  if (event.selectionState === "deliberately_selected") return "selected_option_observed";
  if (event.selectionState === "visible_setup_label") return "creation_path_label_visible";
  if (event.selectionState === "visible_cards_not_catalog_options") return "context_labels_visible";
  if (event.characterLoading) return "loading_or_transition";
  if (event.rotationObserved) return "rotation_observed";
  if (event.menuExitObserved) return "menu_exit_observed";
  return "timeline_observation";
}

function confidenceFor(event) {
  if (event.motionBlurObserved || event.notificationOverlayObserved) return "LOW";
  if (event.characterLoading) return "LOW";
  if (event.selectedNativeOptionLabel && event.selectionState?.startsWith("deliberately")) return "HIGH";
  if (event.selectedNativeOptionLabel) return "MEDIUM";
  return "MEDIUM";
}

function usableForCount(event) {
  return Boolean(event.selectedNativeOptionLabel && event.selectionState?.startsWith("deliberately") && !event.characterLoading);
}

function usableForOrder(event) {
  return usableForCount(event);
}

function usableForVisualAnalysis(event) {
  return Boolean(event.selectedNativeOptionLabel && event.selectionState?.startsWith("deliberately") && event.stableVisualPeriod && !event.motionBlurObserved && !event.notificationOverlayObserved && !event.characterLoading);
}

function representativeTimestamp(event) {
  if (Number.isFinite(event.startSeconds) && Number.isFinite(event.endSeconds)) {
    return Math.round(((event.startSeconds + event.endSeconds) / 2) * 100) / 100;
  }
  return Number.isFinite(event.startSeconds) ? event.startSeconds : 0;
}

function timestampLabel(timestamp) {
  return `${String(timestamp).replace(".", "p")}s`;
}

function mimeTypeForFilename(filename) {
  const extension = path.extname(filename ?? "").toLowerCase();
  if (extension === ".mov") return "video/quicktime";
  if (extension === ".mp4" || extension === ".m4v") return "video/mp4";
  if (extension === ".webm") return "video/webm";
  return "application/octet-stream";
}

function toCsv(columns, rows) {
  return `${[columns, ...rows.map((row) => columns.map((column) => formatCsvValue(row[column])))]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n")}\n`;
}

function timelineMarkdown(timeline) {
  const lines = [
    "# Video Timeline Map",
    "",
    `Generated: ${timeline.generatedAt}`,
    "",
    "This map is Phase 0 research evidence only. It does not mark any College Football 27 record as verified and does not enable production recommendations.",
    "",
    "## Summary",
    "",
    `- Videos covered: ${timeline.summary.videosCovered}`,
    `- Timeline records: ${timeline.summary.timelineRecords}`,
    `- Option-change events: ${timeline.summary.optionChangeEvents}`,
    `- Menu-transition events: ${timeline.summary.menuTransitionEvents}`,
    `- Loading events: ${timeline.summary.loadingEvents}`,
    `- Blurry events: ${timeline.summary.blurryEvents}`,
    `- Obstructed events: ${timeline.summary.obstructedEvents}`,
    `- Records with representative frames: ${timeline.summary.recordsWithFrames}`,
    `- Repeated options retained for continuity: ${timeline.summary.repeatedOptionsForContinuity}`,
    `- Verification status: ${timeline.verificationStatus}`,
    "",
    "## Important Evidence Rules",
    "",
    "- OCR is not used as final authority.",
    "- Neighboring thumbnails are not promoted as selected options.",
    "- Repeated options remain separate timeline events for continuity.",
    "- Face 30/31 observations, if present, are timeline observations only and are not production catalog records.",
    "- Derivative frames are separate from master videos and preserve original aspect ratio.",
    "",
    "## Per-Video Coverage",
    "",
    "| Video | Canonical filename | Records | First option | Last option | Notes |",
    "| --- | --- | ---: | --- | --- | --- |"
  ];
  for (const group of groupTimelineByVideo(timeline.records)) {
    const selected = group.records.filter((record) => record.visible_option_label);
    lines.push(`| ${group.videoID} | \`${group.canonicalFilename}\` | ${group.records.length} | ${selected[0]?.visible_option_label ?? ""} | ${selected.at(-1)?.visible_option_label ?? ""} | ${group.notes} |`);
  }
  lines.push("", "## Outputs", "", "- JSON: `data/phase-zero/video_timeline.json`", "- CSV: `data/phase-zero/video_timeline.csv`", "- Evidence manifest: `data/phase-zero/evidence_manifest.json`", "- Capture log: `data/phase-zero/capture_log.json`");
  if (timeline.warnings.length) {
    lines.push("", "## Warnings", "");
    for (const warning of timeline.warnings) {
      lines.push(`- ${warning.code} ${warning.timelineID}: ${warning.message}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function groupTimelineByVideo(records) {
  const groups = new Map();
  for (const record of records) {
    if (!groups.has(record.video_id)) {
      groups.set(record.video_id, {
        videoID: record.video_id,
        canonicalFilename: record.canonical_filename,
        records: [],
        notes: ""
      });
    }
    groups.get(record.video_id).records.push(record);
  }
  for (const group of groups.values()) {
    const repeated = group.records.filter((record) => record.observed_action === "repeated_option_for_continuity").length;
    const partial = group.records.some((record) => record.notes.includes("overlap") || record.notes.includes("not treated as selected"));
    group.notes = [repeated ? `${repeated} continuity repeat(s)` : null, partial ? "contains limited/continuity observations" : null].filter(Boolean).join("; ");
  }
  return [...groups.values()];
}

function formatCsvValue(value) {
  if (Array.isArray(value)) return value.join("; ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return value ?? "";
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeText(root, relativePath, text) {
  const outputPath = path.resolve(root, relativePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, text);
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeRelativePath(value) {
  return value.replaceAll("\\", "/").replace(/^\.\/+/, "").split("/").filter((part) => part && part !== ".").join("/");
}

function printHelp() {
  console.log([
    "Usage:",
    "  node scripts/cf27-video-timeline-map.mjs [--no-extract-frames] [--generated-at <iso>]",
    "",
    "Creates Phase 0 timeline CSV/JSON, evidence manifest, capture log, and Markdown map from the authoritative video inventory and source timeline."
  ].join("\n"));
}

function parseCliArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--no-extract-frames") options.extractFrames = false;
    else if (arg === "--generated-at") options.generatedAt = argv[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }
    const outputs = await generateVideoTimelineMap(options);
    writeVideoTimelineMap(outputs, options);
    console.log(`Video timeline map generated: ${outputs.timeline.summary.timelineRecords} records, ${outputs.timeline.summary.recordsWithFrames} frame links.`);
    if (outputs.timeline.warnings.length) {
      console.error(`Warnings: ${outputs.timeline.warnings.length}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
