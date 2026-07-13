#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_CURRENT_CAPTURE_LOG_SCHEMA_VERSION = "cf27-current-capture-log-v1";

export const defaultOutputDirectory = "data/research/cf27/catalog-candidates/research/current-capture-log";
export const defaultJsonOutputPath = `${defaultOutputDirectory}/capture_log.json`;
export const defaultCsvOutputPath = `${defaultOutputDirectory}/capture_log.csv`;
export const defaultReportOutputPath = "docs/catalog/CURRENT_CAPTURE_LOG.md";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const candidatePackagePaths = [
  "data/research/cf27/catalog-candidates/research/head-templates-faces-001-029/head_template_research_candidates.json",
  "data/research/cf27/catalog-candidates/research/skin-tone-values-001-024/skin_tone_research_candidates.json",
  "data/research/cf27/catalog-candidates/research/skin-details-options-001-010/skin_details_research_candidates.json",
  "data/research/cf27/catalog-candidates/research/eye-shape-options-001-005/eye_shape_research_candidates.json",
  "data/research/cf27/catalog-candidates/research/eye-color-options-001-007/eye_color_research_candidates.json",
  "data/research/cf27/catalog-candidates/research/nose-options-001-007/nose_research_candidates.json",
  "data/research/cf27/catalog-candidates/research/ear-shape-options-001-004/ear_shape_research_candidates.json"
];

const csvColumns = [
  "captureEventID",
  "sourceFilename",
  "beginningTimestamp",
  "endingTimestamp",
  "category",
  "nativeOption",
  "catalogCandidate",
  "action",
  "rotationOrMenuSelectionEvent",
  "evidenceGenerated",
  "issueDetected",
  "retakeStatus",
  "notes"
];

export function generateCurrentCaptureLog({
  root = repositoryRoot,
  generatedAt = null
} = {}) {
  const normalizedRoot = path.resolve(root);
  const timeline = readJSON(path.resolve(normalizedRoot, "data/research/cf27/video_timeline_index.json"));
  const inventory = readJSON(path.resolve(normalizedRoot, "data/research/cf27/video_inventory.json"));
  const evidenceManifest = readJSON(path.resolve(normalizedRoot, "data/research/cf27/manifests/current-evidence/current_evidence_manifest.json"));
  const headQA = readOptionalJSON(normalizedRoot, "data/research/cf27/reports/head-template-standardization-qa/head_template_standardization_qa_report.json");
  const candidateIndex = buildCandidateIndex(normalizedRoot, headQA);
  const evidenceIndex = buildEvidenceIndex(evidenceManifest);
  const uniqueVideos = (inventory.inventory ?? []).filter((video) => !video.exactDuplicate);
  const uniqueVideoIDs = new Set(uniqueVideos.map((video) => video.inventoryId));
  const videosByID = new Map(uniqueVideos.map((video) => [video.inventoryId, video]));
  const validationIssues = [];
  const events = [];

  for (const event of timeline.events ?? []) {
    if (!uniqueVideoIDs.has(event.videoId)) continue;
    const video = videosByID.get(event.videoId);
    const candidateMatch = matchCandidate(event, candidateIndex);
    const candidate = candidateMatch?.candidate ?? null;
    const issues = buildIssues(event, candidateMatch);
    const evidenceGenerated = buildEvidenceGenerated(event, candidate, evidenceIndex);
    const captureEvent = {
      captureEventID: `capture-event-${event.timelineId}`,
      sourceVideoID: event.videoId,
      sourceFilename: video?.workingFilename ?? event.videoId,
      portableRelativeEvidencePath: video?.portableRelativeEvidencePath ?? null,
      beginningTimestamp: event.startSeconds,
      endingTimestamp: event.endSeconds,
      category: candidate?.category ?? categoryFromEvent(event),
      nativeOption: nativeOptionFromEvent(event),
      catalogCandidate: candidate?.stableInternalID ?? null,
      action: actionFromEvent(event),
      rotationOrMenuSelectionEvent: rotationOrMenuSelectionEventFromEvent(event),
      selectionState: event.selectionState,
      optionVisibility: optionVisibilityFromEvent(event),
      deliberateOptionSelection: event.selectionState === "deliberately_selected" || event.selectionState === "deliberately_reselected_same_native_identity",
      incidentalThumbnailVisibility: event.selectionState === "deliberately_selected" || event.selectionState === "deliberately_reselected_same_native_identity"
        ? "neighboring thumbnails may be visible but are not promoted as selected options"
        : "not used as selected-option evidence",
      evidenceGenerated,
      issueDetected: issues,
      retakeStatus: retakeStatusForCandidate(candidate),
      uncertainty: uncertaintyForEvent(event, candidateMatch),
      timestampPrecision: event.timestampPrecision,
      notes: notesForEvent(event, candidateMatch)
    };
    validateCaptureEvent(captureEvent, validationIssues);
    events.push(captureEvent);
  }

  events.sort((a, b) => {
    const byVideo = a.sourceVideoID.localeCompare(b.sourceVideoID);
    if (byVideo !== 0) return byVideo;
    return a.beginningTimestamp - b.beginningTimestamp;
  });

  const selectedEvents = events.filter((event) => event.optionVisibility === "deliberate_selection");
  const unmatchedSelectedEvents = selectedEvents.filter((event) => !event.catalogCandidate);

  return {
    schemaVersion: CF27_CURRENT_CAPTURE_LOG_SCHEMA_VERSION,
    generatedAt: generatedAt ?? timeline.generatedAt ?? new Date().toISOString(),
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "RESEARCH_CAPTURE_LOG",
    sourceType: "research",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    scope: "Chronological capture log for the nine current unique Xbox screen recordings.",
    sourceTimeline: "data/research/cf27/video_timeline_index.json",
    sourceInventory: "data/research/cf27/video_inventory.json",
    sourceEvidenceManifest: "data/research/cf27/manifests/current-evidence/current_evidence_manifest.json",
    selectionPolicy: {
      selectedOptions: "Only events with direct selected-state UI evidence are treated as deliberate option selections.",
      incidentalVisibility: "Neighboring thumbnails, swatches, cards, and context labels are retained as notes or visibleNonSelectedLabels but are not promoted to selected catalog records.",
      uncertainty: "Candidate linkage records whether the match came from overlapping evidence, label fallback, or no candidate package record."
    },
    summary: {
      uniqueRecordingsCovered: uniqueVideos.length,
      duplicateRecordingsExcluded: (inventory.inventory ?? []).filter((video) => video.exactDuplicate).length,
      captureEvents: events.length,
      deliberateSelectionEvents: selectedEvents.length,
      unmatchedDeliberateSelections: unmatchedSelectedEvents.length,
      eventsWithGeneratedDerivativeEvidence: events.filter((event) => event.evidenceGenerated.some((evidenceID) => evidenceID.startsWith("evidence-frame-"))).length,
      eventsWithIssues: events.filter((event) => event.issueDetected.length > 0).length,
      validationIssueCount: validationIssues.length
    },
    validation: {
      status: validationIssues.some((issue) => issue.severity === "error") ? "failed" : "passed",
      issues: validationIssues
    },
    events
  };
}

export function writeCurrentCaptureLog(captureLog, {
  root = repositoryRoot,
  jsonOutputPath = defaultJsonOutputPath,
  csvOutputPath = defaultCsvOutputPath,
  reportOutputPath = defaultReportOutputPath
} = {}) {
  writeTextFile(root, jsonOutputPath, `${JSON.stringify(captureLog, null, 2)}\n`);
  writeTextFile(root, csvOutputPath, formatCurrentCaptureLogCSV(captureLog));
  writeTextFile(root, reportOutputPath, formatCurrentCaptureLogReport(captureLog));
}

export function formatCurrentCaptureLogCSV(captureLog) {
  const rows = [csvColumns.join(",")];
  for (const event of captureLog.events) {
    rows.push(csvColumns.map((column) => csvEscape(formatCsvValue(event[column]))).join(","));
  }
  return `${rows.join("\n")}\n`;
}

export function formatCurrentCaptureLogReport(captureLog) {
  const lines = [
    "# Current CF27 Capture Log",
    "",
    "This capture log is research evidence only. It is not a verified production catalog and does not enable recommendations.",
    "",
    "## Summary",
    "",
    `- Generated at: ${captureLog.generatedAt}`,
    `- Unique recordings covered: ${captureLog.summary.uniqueRecordingsCovered}`,
    `- Duplicate recordings excluded: ${captureLog.summary.duplicateRecordingsExcluded}`,
    `- Capture events: ${captureLog.summary.captureEvents}`,
    `- Deliberate selection events: ${captureLog.summary.deliberateSelectionEvents}`,
    `- Unmatched deliberate selections: ${captureLog.summary.unmatchedDeliberateSelections}`,
    `- Events with generated derivative evidence: ${captureLog.summary.eventsWithGeneratedDerivativeEvidence}`,
    `- Events with issues: ${captureLog.summary.eventsWithIssues}`,
    `- Validation status: ${captureLog.validation.status}`,
    "",
    "## Selection Policy",
    "",
    "- Direct selected-state labels are capture-log observations.",
    "- Incidental thumbnails, swatches, cards, and neighboring labels are not promoted as selected options.",
    "- Catalog candidates remain research candidates unless separately verified by the production workflow.",
    "",
    "## Outputs",
    "",
    `- JSON: \`${defaultJsonOutputPath}\``,
    `- CSV: \`${defaultCsvOutputPath}\``,
    "",
    "## Validation",
    ""
  ];

  if (captureLog.validation.issues.length === 0) {
    lines.push("- No capture-log validation issues were found.");
  } else {
    for (const issue of captureLog.validation.issues) {
      lines.push(`- ${issue.severity.toUpperCase()} ${issue.code}: ${issue.message}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function buildCandidateIndex(root, headQA) {
  const candidates = [];
  const headQAByID = new Map((headQA?.records ?? []).map((record) => [record.stableInternalID, record]));

  for (const packagePath of candidatePackagePaths) {
    const packageJSON = readJSON(path.resolve(root, packagePath));
    const category = packageJSON.scope?.category ?? packageJSON.context?.category ?? inferCategoryFromPackagePath(packagePath);
    for (const record of packageJSON.records ?? []) {
      const label = record.visibleGameLabelOrIndex ?? record.nativeLabelOriginalText ?? null;
      const qaRecord = headQAByID.get(record.stableInternalID);
      candidates.push({
        stableInternalID: record.stableInternalID,
        category: record.category ?? category,
        label,
        nativeOrder: record.nativeOrder,
        selectedMenuEvidence: record.selectedMenuEvidence ?? [],
        sourceImageReferences: record.sourceImageReferences ?? [],
        verificationState: record.verificationState ?? packageJSON.verificationStateForAllRecords ?? packageJSON.verificationStatus,
        recaptureRequired: Boolean(record.recaptureNeed?.required || qaRecord?.evidenceClassification?.recaptureRequiredForProductionComparison),
        recaptureReason: record.recaptureNeed?.reasons?.join(" ") ?? qaRecord?.recaptureQueue?.recaptureReason ?? null
      });
    }
  }

  return candidates;
}

function buildEvidenceIndex(evidenceManifest) {
  const sourceMasterByVideo = new Map();
  const derivativeEvidenceByCatalogAndVideo = new Map();
  for (const entry of evidenceManifest.entries ?? []) {
    if (entry.masterOrDerivative === "master" && entry.sourceVideo) sourceMasterByVideo.set(entry.sourceVideo, entry.evidenceID);
    if (entry.masterOrDerivative === "derivative" && entry.catalogID && entry.sourceVideo) {
      const key = `${entry.catalogID}|${entry.sourceVideo}`;
      const existing = derivativeEvidenceByCatalogAndVideo.get(key) ?? [];
      existing.push(entry.evidenceID);
      derivativeEvidenceByCatalogAndVideo.set(key, existing.sort());
    }
  }
  return { sourceMasterByVideo, derivativeEvidenceByCatalogAndVideo };
}

function matchCandidate(event, candidates) {
  if (!event.selectedNativeOptionLabel) return { matchKind: "notApplicable", candidate: null };
  const sameVideoCandidates = candidates.filter((candidate) =>
    candidate.label === event.selectedNativeOptionLabel &&
    candidate.selectedMenuEvidence.some((evidence) => evidence.videoID === event.videoId)
  );
  const overlapping = sameVideoCandidates.find((candidate) =>
    candidate.selectedMenuEvidence.some((evidence) => evidence.videoID === event.videoId && rangesOverlap(parseRange(evidence.timestampRangeSeconds), [event.startSeconds, event.endSeconds]))
  );
  if (overlapping) return { matchKind: "overlappingEvidenceRange", candidate: overlapping };

  if (sameVideoCandidates.length > 0) return { matchKind: "labelOnlyTimestampMismatch", candidate: sameVideoCandidates[0] };

  const labelCandidates = candidates.filter((candidate) => candidate.label === event.selectedNativeOptionLabel);
  if (labelCandidates.length > 0) return { matchKind: "labelOnlyDifferentVideo", candidate: labelCandidates[0] };

  return { matchKind: "noCandidateRecord", candidate: null };
}

function buildEvidenceGenerated(event, candidate, evidenceIndex) {
  const evidence = [];
  const sourceMaster = evidenceIndex.sourceMasterByVideo.get(event.videoId);
  if (sourceMaster) evidence.push(sourceMaster);
  if (candidate?.stableInternalID) {
    const derivativeEvidence = evidenceIndex.derivativeEvidenceByCatalogAndVideo.get(`${candidate.stableInternalID}|${event.videoId}`) ?? [];
    evidence.push(...derivativeEvidence);
  }
  return [...new Set(evidence)].sort();
}

function buildIssues(event, candidateMatch) {
  const issues = [];
  if (event.characterLoading) issues.push(issue("characterLoading", "Character or menu loading is visible during this timestamp range."));
  if (event.notificationOverlayObserved) issues.push(issue("notificationOverlay", "A notification overlay is visible and may limit visual evidence."));
  if (event.motionBlurObserved) issues.push(issue("motionBlur", "Motion blur is observed in this timestamp range."));
  if (event.recordingGapObserved) issues.push(issue("recordingGap", "A recording gap is observed."));
  if (event.menuExitObserved) issues.push(issue("menuExit", "A menu exit or exit modal is observed."));
  if (event.selectionState === "visible_cards_not_catalog_options") {
    issues.push(issue("contextLabelsNotCatalogOptions", "Visible setup cards are creation-flow context only and are not appearance catalog options."));
  }
  if ((event.selectionState === "deliberately_selected" || event.selectionState === "deliberately_reselected_same_native_identity") && candidateMatch?.matchKind === "noCandidateRecord") {
    issues.push(issue("selectedOptionWithoutCandidateRecord", "A selected native option is logged, but no research-candidate catalog record currently exists for it."));
  }
  if (candidateMatch?.matchKind === "labelOnlyTimestampMismatch") {
    issues.push(issue("candidateTimestampMismatch", "Candidate identity was matched by label/video, but candidate evidence timestamps do not overlap this timeline event."));
  }
  if (candidateMatch?.matchKind === "labelOnlyDifferentVideo") {
    issues.push(issue("candidateMatchedFromDifferentVideo", "Candidate identity was matched by label from a different source video."));
  }
  return issues;
}

function retakeStatusForCandidate(candidate) {
  if (!candidate) return "not_recorded";
  if (candidate.recaptureRequired) return "recapture_required_for_production_comparison";
  return "no_retake_recorded";
}

function uncertaintyForEvent(event, candidateMatch) {
  return {
    timestampPrecision: event.timestampPrecision,
    inspectionBasis: event.inspectionBasis,
    selectedOptionCertainty: certaintyForSelectionState(event.selectionState),
    catalogCandidateMatch: candidateMatch?.matchKind ?? "notApplicable",
    optionSource: event.selectedNativeOptionLabel ? "timeline_selectedNativeOptionLabel" : "none",
    incidentalThumbnailHandling: "not_promoted_to_selected_option"
  };
}

function notesForEvent(event, candidateMatch) {
  const notes = [event.notes];
  if (candidateMatch?.candidate?.recaptureReason) notes.push(candidateMatch.candidate.recaptureReason);
  if (candidateMatch?.matchKind === "noCandidateRecord") notes.push("No catalog candidate was created by this capture-log task.");
  return notes.filter(Boolean).join(" ");
}

function actionFromEvent(event) {
  if (event.characterLoading) return "loading";
  if (event.selectionState === "deliberately_selected") return "optionSelection";
  if (event.selectionState === "deliberately_reselected_same_native_identity") return "optionReselection";
  if (event.selectionState === "initial_loaded_label_before_grid") return "initialLoadedSelection";
  if (event.selectionState === "visible_cards_not_catalog_options") return "contextObservation";
  if (event.menuExitObserved) return "menuExit";
  if (event.rotationObserved) return "rotationCapture";
  if (event.eventTypes?.includes("navigation_screens")) return "navigation";
  return "observation";
}

function rotationOrMenuSelectionEventFromEvent(event) {
  const isSelection = event.selectionState === "deliberately_selected" || event.selectionState === "deliberately_reselected_same_native_identity" || event.selectionState === "initial_loaded_label_before_grid";
  if (event.rotationObserved && isSelection) return "menu_selection_and_rotation";
  if (event.rotationObserved) return "rotation";
  if (isSelection) return "menu_selection";
  return "none";
}

function optionVisibilityFromEvent(event) {
  if (event.selectionState === "deliberately_selected" || event.selectionState === "deliberately_reselected_same_native_identity") return "deliberate_selection";
  if (event.selectionState === "initial_loaded_label_before_grid") return "initial_loaded_selection";
  if (event.selectionState === "visible_cards_not_catalog_options" || event.visibleNonSelectedLabels?.length > 0) return "context_or_incidental_visibility";
  return "none";
}

function nativeOptionFromEvent(event) {
  if (!event.selectedNativeOptionLabel) return null;
  return event.selectedNativeOptionLabel;
}

function categoryFromEvent(event) {
  const heading = String(event.menuHeading ?? "").trim();
  const upper = heading.toUpperCase();
  if (upper.includes("HEAD TEMPLATE")) return "Head Template";
  if (upper.includes("SKIN TONE")) return "Skin Tone";
  if (upper.includes("SKIN DETAILS")) return "Skin Details";
  if (upper.includes("EYE SHAPE")) return "Eye Shape";
  if (upper.includes("EYE COLOR")) return "Eye Color";
  if (upper.includes("NOSE")) return "Nose";
  if (upper.includes("EAR SHAPE")) return "Ear Shape";
  if (event.eventTypes?.includes("navigation_screens")) return "Navigation";
  return "Observation";
}

function certaintyForSelectionState(selectionState) {
  if (selectionState === "deliberately_selected" || selectionState === "deliberately_reselected_same_native_identity") return "direct_selected_state_observed";
  if (selectionState === "initial_loaded_label_before_grid") return "initial_loaded_selected_state_observed";
  if (selectionState === "visible_cards_not_catalog_options") return "context_only_not_catalog_evidence";
  return "no_selected_option";
}

function issue(code, message) {
  return { code, severity: "warning", message };
}

function validateCaptureEvent(event, validationIssues) {
  for (const key of csvColumns) {
    if (!(key in event)) {
      validationIssues.push({
        code: "missingCaptureLogField",
        severity: "error",
        captureEventID: event.captureEventID,
        message: `${event.captureEventID} is missing ${key}`
      });
    }
  }
  if (event.portableRelativeEvidencePath && !validatePortableRelativePath(event.portableRelativeEvidencePath)) {
    validationIssues.push({
      code: "unsafePortableEvidencePath",
      severity: "error",
      captureEventID: event.captureEventID,
      message: `${event.captureEventID} references an unsafe source path`
    });
  }
}

export function validatePortableRelativePath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.trim() === "") return false;
  if (path.isAbsolute(relativePath)) return false;
  if (/^[a-zA-Z]:[\\/]/.test(relativePath)) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(relativePath)) return false;
  const normalized = relativePath.replaceAll("\\", "/");
  if (normalized !== relativePath) return false;
  if (normalized.split("/").some((segment) => segment === ".." || segment === "")) return false;
  return !normalized.includes("\0");
}

function parseRange(value) {
  if (typeof value !== "string") return [Number.NaN, Number.NaN];
  const parts = value.split("-").map((part) => Number.parseFloat(part.trim()));
  if (parts.length === 1) return [parts[0], parts[0]];
  return [parts[0], parts[1]];
}

function rangesOverlap(a, b) {
  if (a.some(Number.isNaN) || b.some(Number.isNaN)) return false;
  return a[0] <= b[1] && b[0] <= a[1];
}

function inferCategoryFromPackagePath(packagePath) {
  if (packagePath.includes("head-template")) return "Head Template";
  if (packagePath.includes("skin-tone")) return "Skin Tone";
  if (packagePath.includes("skin-details")) return "Skin Details";
  if (packagePath.includes("eye-shape")) return "Eye Shape";
  if (packagePath.includes("eye-color")) return "Eye Color";
  if (packagePath.includes("nose")) return "Nose";
  if (packagePath.includes("ear-shape")) return "Ear Shape";
  return "Unknown";
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readOptionalJSON(root, relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return readJSON(absolutePath);
}

function writeTextFile(root, relativePath, contents) {
  const absolutePath = path.resolve(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents);
}

function formatCsvValue(value) {
  if (Array.isArray(value)) return value.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join("; ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return value ?? "";
}

function csvEscape(value) {
  const normalized = value === null || value === undefined ? "" : String(value);
  if (!/[",\n]/.test(normalized)) return normalized;
  return `"${normalized.replaceAll('"', '""')}"`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const captureLog = generateCurrentCaptureLog();
  writeCurrentCaptureLog(captureLog);
  console.log(formatCurrentCaptureLogReport(captureLog));
  if (captureLog.validation.status !== "passed") process.exitCode = 1;
}
