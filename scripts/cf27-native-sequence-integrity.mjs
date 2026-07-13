#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_NATIVE_SEQUENCE_INTEGRITY_SCHEMA_VERSION = "cf27-native-sequence-integrity-v1";
export const sequenceIntegrityLabel = "PRIMARY RESEARCH SEQUENCE REVIEW — NOT PRODUCTION VERIFIED";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultTimelineIndexPath = "data/research/cf27/video_timeline_index.json";
const defaultOutputDirectory = "data/research/cf27/reports/native-sequence-integrity";

export const defaultSequenceCategoryConfigs = [
  {
    key: "headTemplates",
    displayName: "Head Templates 1-29",
    categoryName: "Head Template",
    candidatePath: "data/research/cf27/catalog-candidates/research/head-templates-faces-001-029/head_template_research_candidates.json",
    timelineVideoIDs: ["video-002", "video-003"],
    timelineHeadings: ["HEAD TEMPLATE", "Head Template"],
    labelPattern: /^Face\s+(\d+)$/i,
    requestedScopeNote: "Prompt 103 scope covers current Head Template research candidates Face 1 through Face 29 only. Later visible selected labels must be reviewed before creating more records."
  },
  {
    key: "skinTone",
    displayName: "Skin Tone",
    categoryName: "Skin Tone",
    candidatePath: "data/research/cf27/catalog-candidates/research/skin-tone-values-001-024/skin_tone_research_candidates.json",
    timelineVideoIDs: ["video-004"],
    timelineHeadings: ["SKIN TONE", "Skin Tone"],
    labelPattern: /^Skin Tone\s+0?(\d+)$/i
  },
  {
    key: "skinDetails",
    displayName: "Skin Details",
    categoryName: "Skin Details",
    candidatePath: "data/research/cf27/catalog-candidates/research/skin-details-options-001-010/skin_details_research_candidates.json",
    timelineVideoIDs: ["video-005"],
    timelineHeadings: ["SKIN DETAILS", "Skin Details"]
  },
  {
    key: "eyeShape",
    displayName: "Eye Shape",
    categoryName: "Eye Shape",
    candidatePath: "data/research/cf27/catalog-candidates/research/eye-shape-options-001-005/eye_shape_research_candidates.json",
    timelineVideoIDs: ["video-006"],
    timelineHeadings: ["EYE SHAPE", "Eye Shape"]
  },
  {
    key: "eyeColor",
    displayName: "Eye Color",
    categoryName: "Eye Color",
    candidatePath: "data/research/cf27/catalog-candidates/research/eye-color-options-001-007/eye_color_research_candidates.json",
    timelineVideoIDs: ["video-007"],
    timelineHeadings: ["EYE COLOR", "Eye Color"]
  },
  {
    key: "nose",
    displayName: "Nose",
    categoryName: "Nose",
    candidatePath: "data/research/cf27/catalog-candidates/research/nose-options-001-007/nose_research_candidates.json",
    timelineVideoIDs: ["video-008"],
    timelineHeadings: ["NOSE", "Nose"]
  },
  {
    key: "earShape",
    displayName: "Ear Shape",
    categoryName: "Ear Shape",
    candidatePath: "data/research/cf27/catalog-candidates/research/ear-shape-options-001-004/ear_shape_research_candidates.json",
    timelineVideoIDs: ["video-009"],
    timelineHeadings: ["EAR SHAPE", "Ear Shape"]
  }
];

export function buildNativeSequenceIntegrityReport({
  root = repositoryRoot,
  timelineIndexPath = defaultTimelineIndexPath,
  categoryConfigs = defaultSequenceCategoryConfigs,
  generatedAt = new Date().toISOString()
} = {}) {
  const timelineIndex = readJSON(path.resolve(root, timelineIndexPath));
  const categories = categoryConfigs.map((config) => analyzeCategory({
    root,
    config,
    timelineEvents: timelineIndex.events ?? [],
    timelineVideos: timelineIndex.videos ?? []
  }));
  const reviewQueue = categories.flatMap((category) => category.reviewSuggestions);
  const summary = {
    categoriesAnalyzed: categories.length,
    candidateRecordsReviewed: categories.reduce((sum, category) => sum + category.candidateRecordCount, 0),
    deliberateSelectionEvents: categories.reduce((sum, category) => sum + category.deliberateSelectionEventCount, 0),
    reviewSuggestionCount: reviewQueue.length,
    repeatedSelectionSuggestions: countByCode(reviewQueue, "repeatedSelection"),
    skippedIndexSuggestions: countByCode(reviewQueue, "skippedIndices"),
    reversedMovementSuggestions: countByCode(reviewQueue, "reversedMovement"),
    accidentalJumpSuggestions: countByCode(reviewQueue, "accidentalJump"),
    selectorWrapSuggestions: countByCode(reviewQueue, "selectorWrap"),
    overlappingClipSuggestions: countByCode(reviewQueue, "overlappingClip"),
    incompleteEndingSuggestions: countByCode(reviewQueue, "incompleteSelectorEnding"),
    thumbnailOnlySuggestions: countByCode(reviewQueue, "thumbnailOnlyObservation"),
    unknownSelectedLabelSuggestions: countByCode(reviewQueue, "selectedLabelOutsideCandidateScope")
  };

  return {
    schemaVersion: CF27_NATIVE_SEQUENCE_INTEGRITY_SCHEMA_VERSION,
    reportLabel: sequenceIntegrityLabel,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PRIMARY_RESEARCH_CANDIDATE",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "REVIEW_SUGGESTIONS_ONLY_NOT_GAME_FACTS",
    sourceTimelineIndex: timelineIndexPath,
    scope: [
      "Head Templates 1-29",
      "Skin Tone",
      "Skin Details",
      "Eye Shape",
      "Eye Color",
      "Nose",
      "Ear Shape"
    ],
    policy: {
      factStatus: "Automated findings are human-review suggestions, not verified game facts.",
      selectedOptionPolicy: "Only timeline events marked deliberately_selected are treated as selected-sequence observations.",
      thumbnailPolicy: "Visible neighboring labels or thumbnails are tracked separately and are never promoted to selected options by this tool.",
      productionUseAllowed: false,
      masterHandling: "The tool reads JSON metadata only and does not touch source-video masters or generated media."
    },
    summary,
    categories,
    humanReviewQueue: reviewQueue
  };
}

export function writeNativeSequenceIntegrityOutputs(report, {
  root = repositoryRoot,
  outputDirectory = defaultOutputDirectory
} = {}) {
  const absoluteOutputDirectory = path.resolve(root, outputDirectory);
  assertResearchReportOutput(root, absoluteOutputDirectory);
  fs.mkdirSync(absoluteOutputDirectory, { recursive: true });
  const jsonPath = path.join(absoluteOutputDirectory, "native_sequence_integrity_report.json");
  const queueJsonPath = path.join(absoluteOutputDirectory, "native_sequence_human_review_queue.json");
  const queueCsvPath = path.join(absoluteOutputDirectory, "native_sequence_human_review_queue.csv");
  const markdownPath = path.join(absoluteOutputDirectory, "native_sequence_integrity_review.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(queueJsonPath, `${JSON.stringify({
    schemaVersion: report.schemaVersion,
    reportLabel: report.reportLabel,
    generatedAt: report.generatedAt,
    dataClass: report.dataClass,
    productionStatus: report.productionStatus,
    verificationStatus: report.verificationStatus,
    humanReviewQueue: report.humanReviewQueue
  }, null, 2)}\n`, "utf8");
  fs.writeFileSync(queueCsvPath, formatReviewQueueCSV(report.humanReviewQueue), "utf8");
  fs.writeFileSync(markdownPath, formatSequenceIntegrityMarkdown(report), "utf8");
  return {
    ok: true,
    outputDirectory: normalizePath(path.relative(root, absoluteOutputDirectory)),
    files: [
      "native_sequence_integrity_report.json",
      "native_sequence_human_review_queue.json",
      "native_sequence_human_review_queue.csv",
      "native_sequence_integrity_review.md"
    ].map((fileName) => normalizePath(path.relative(root, path.join(absoluteOutputDirectory, fileName))))
  };
}

export function analyzeNativeSequence(records, events, {
  categoryKey = "unknown",
  displayName = "Unknown",
  labelPattern = null,
  candidateScopeNote = null
} = {}) {
  const recordsByLabel = buildRecordsByLabel(records);
  const selectedEvents = events
    .filter((event) => event.selectionState === "deliberately_selected")
    .map((event, index) => enrichSelectedEvent(event, index, recordsByLabel, labelPattern))
    .sort((first, second) => first.absoluteSequence - second.absoluteSequence);
  const suggestions = [];

  const repeatedByLabel = groupBy(selectedEvents.filter((event) => event.selectedNativeOptionLabel), (event) => normalizeLabel(event.selectedNativeOptionLabel));
  for (const [normalizedLabel, repeatedEvents] of repeatedByLabel.entries()) {
    if (repeatedEvents.length < 2) continue;
    suggestions.push(reviewSuggestion({
      categoryKey,
      displayName,
      code: "repeatedSelection",
      severity: "review",
      priority: repeatedEvents.some((event) => !event.knownCandidateRecord) ? "high" : "medium",
      timelineIDs: repeatedEvents.map((event) => event.timelineId),
      labels: repeatedEvents.map((event) => event.selectedNativeOptionLabel),
      nativeOrders: unique(repeatedEvents.map((event) => event.nativeOrder).filter(Number.isFinite)),
      message: `${repeatedEvents[0].selectedNativeOptionLabel} appears more than once in deliberately selected timeline events.`,
      reviewAction: "Confirm whether this is intentional overlap, selector wrap, or an accidental repeated selection before publication.",
      confidence: 0.85
    }));
  }

  for (let index = 1; index < selectedEvents.length; index += 1) {
    const previous = selectedEvents[index - 1];
    const current = selectedEvents[index];
    if (!Number.isFinite(previous.nativeOrder) || !Number.isFinite(current.nativeOrder)) continue;
    const delta = current.nativeOrder - previous.nativeOrder;
    if (delta < 0) {
      suggestions.push(reviewSuggestion({
        categoryKey,
        displayName,
        code: "reversedMovement",
        severity: "review",
        priority: Math.abs(delta) > 1 ? "high" : "medium",
        timelineIDs: [previous.timelineId, current.timelineId],
        labels: [previous.selectedNativeOptionLabel, current.selectedNativeOptionLabel],
        nativeOrders: [previous.nativeOrder, current.nativeOrder],
        message: `Chronological selection moved backward from native order ${previous.nativeOrder} to ${current.nativeOrder}.`,
        reviewAction: "Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue.",
        confidence: 0.8
      }));
    }
    if (Math.abs(delta) > 1) {
      suggestions.push(reviewSuggestion({
        categoryKey,
        displayName,
        code: "skippedIndices",
        severity: "review",
        priority: Math.abs(delta) > 3 ? "high" : "medium",
        timelineIDs: [previous.timelineId, current.timelineId],
        labels: [previous.selectedNativeOptionLabel, current.selectedNativeOptionLabel],
        nativeOrders: [previous.nativeOrder, current.nativeOrder],
        message: `Chronological selection jumped by ${delta} native-order positions.`,
        reviewAction: "Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip.",
        confidence: 0.75
      }));
      suggestions.push(reviewSuggestion({
        categoryKey,
        displayName,
        code: "accidentalJump",
        severity: "review",
        priority: Math.abs(delta) > 3 ? "high" : "medium",
        timelineIDs: [previous.timelineId, current.timelineId],
        labels: [previous.selectedNativeOptionLabel, current.selectedNativeOptionLabel],
        nativeOrders: [previous.nativeOrder, current.nativeOrder],
        message: `Large selector movement from ${previous.selectedNativeOptionLabel} to ${current.selectedNativeOptionLabel} may indicate an accidental jump or grid traversal.`,
        reviewAction: "Inspect the exact source timestamps and document the navigation intent.",
        confidence: 0.55
      }));
    }
    if (delta < 0 && previous.nativeOrder >= Math.max(...records.map((record) => Number(record.nativeOrder) || 0)) - 1 && current.nativeOrder <= 2) {
      suggestions.push(reviewSuggestion({
        categoryKey,
        displayName,
        code: "selectorWrap",
        severity: "review",
        priority: "high",
        timelineIDs: [previous.timelineId, current.timelineId],
        labels: [previous.selectedNativeOptionLabel, current.selectedNativeOptionLabel],
        nativeOrders: [previous.nativeOrder, current.nativeOrder],
        message: "Selection moved from a high native order to a low native order, suggesting possible selector wrap.",
        reviewAction: "Verify wrap behavior from direct video evidence before recording it as a selector property.",
        confidence: 0.7
      }));
    }
  }

  for (const event of selectedEvents.filter((entry) => !entry.knownCandidateRecord)) {
    suggestions.push(reviewSuggestion({
      categoryKey,
      displayName,
      code: "selectedLabelOutsideCandidateScope",
      severity: "review",
      priority: "high",
      timelineIDs: [event.timelineId],
      labels: [event.selectedNativeOptionLabel],
      nativeOrders: [],
      message: `${event.selectedNativeOptionLabel} is deliberately selected in the timeline but is not present in the current candidate records.`,
      reviewAction: candidateScopeNote ?? "Review source evidence before creating, excluding, or deferring this candidate record.",
      confidence: 0.9
    }));
  }

  const recordsSeen = new Set(selectedEvents.filter((event) => event.knownCandidateRecord).map((event) => event.stableInternalID));
  const missingCandidateRecords = records.filter((record) => !recordsSeen.has(record.stableInternalID));
  for (const record of missingCandidateRecords) {
    suggestions.push(reviewSuggestion({
      categoryKey,
      displayName,
      code: "candidateRecordWithoutTimelineSelection",
      severity: "review",
      priority: "medium",
      timelineIDs: [],
      labels: [record.visibleGameLabelOrIndex ?? record.nativeLabelOriginalText ?? record.stableInternalID],
      nativeOrders: [record.nativeOrder],
      message: `${record.visibleGameLabelOrIndex ?? record.nativeLabelOriginalText ?? record.stableInternalID} exists as a candidate record but was not matched to a deliberately selected timeline event.`,
      reviewAction: "Confirm the candidate selected-menu evidence and timeline mapping before publication.",
      confidence: 0.75
    }));
  }

  return {
    selectedEvents,
    suggestions
  };
}

function analyzeCategory({ root, config, timelineEvents, timelineVideos }) {
  const candidatePackage = readJSON(path.resolve(root, config.candidatePath));
  const records = [...(candidatePackage.records ?? [])].sort(compareNativeOrder);
  const categoryEvents = filterTimelineEvents(timelineEvents, config);
  const selectedTimelineEvents = categoryEvents.filter((event) => event.selectionState === "deliberately_selected");
  const thumbnailOnlyObservations = categoryEvents.flatMap((event) => (event.visibleNonSelectedLabels ?? []).map((label) => ({
    timelineId: event.timelineId,
    videoId: event.videoId,
    startSeconds: event.startSeconds,
    endSeconds: event.endSeconds,
    label,
    menuHeading: event.menuHeading,
    note: "Visible non-selected label or thumbnail only; not promoted to selected option."
  })));
  const sequence = analyzeNativeSequence(records, selectedTimelineEvents, {
    categoryKey: config.key,
    displayName: config.displayName,
    labelPattern: config.labelPattern,
    candidateScopeNote: config.requestedScopeNote
  });
  const overlappingClipSuggestions = buildOverlappingClipSuggestions(config, selectedTimelineEvents);
  const incompleteEndingSuggestions = buildIncompleteEndingSuggestions(config, records, sequence.selectedEvents, candidatePackage);
  const thumbnailSuggestions = thumbnailOnlyObservations.map((observation) => reviewSuggestion({
    categoryKey: config.key,
    displayName: config.displayName,
    code: "thumbnailOnlyObservation",
    severity: "info",
    priority: "low",
    timelineIDs: [observation.timelineId],
    labels: [observation.label],
    nativeOrders: [],
    message: `${observation.label} was visible only as a neighboring thumbnail/non-selected label.`,
    reviewAction: "Do not create or verify a record from this observation unless a later selected-state event exists.",
    confidence: 0.9
  }));
  const reviewSuggestions = [
    ...sequence.suggestions,
    ...overlappingClipSuggestions,
    ...incompleteEndingSuggestions,
    ...thumbnailSuggestions
  ].sort(compareReviewSuggestions);
  const selectedByRecordID = Object.fromEntries(sequence.selectedEvents
    .filter((event) => event.knownCandidateRecord)
    .map((event) => [event.stableInternalID, true]));
  const videos = timelineVideos.filter((video) => config.timelineVideoIDs.includes(video.videoId));

  return {
    categoryKey: config.key,
    displayName: config.displayName,
    categoryName: config.categoryName,
    sourceCandidatePackage: config.candidatePath,
    sourceVideos: videos.map((video) => ({
      videoId: video.videoId,
      workingFilename: video.workingFilename,
      identifiedContent: video.identifiedContent,
      productionStatus: video.productionStatus,
      verificationStatus: video.verificationStatus
    })),
    candidateRecordCount: records.length,
    deliberateSelectionEventCount: selectedTimelineEvents.length,
    uniqueKnownSelectedRecordCount: new Set(sequence.selectedEvents.filter((event) => event.knownCandidateRecord).map((event) => event.stableInternalID)).size,
    thumbnailOnlyObservationCount: thumbnailOnlyObservations.length,
    selectorCompletenessClaim: selectorCompletenessClaim(candidatePackage),
    nativeOrderRecords: records.map((record) => ({
      stableInternalID: record.stableInternalID,
      nativeOrder: record.nativeOrder,
      visibleGameLabelOrIndex: record.visibleGameLabelOrIndex ?? record.nativeLabelOriginalText ?? "",
      matchedDeliberateSelection: Boolean(selectedByRecordID[record.stableInternalID]),
      verificationState: record.verificationState,
      productionStatus: record.productionStatus
    })),
    deliberateSelectedSequence: sequence.selectedEvents,
    thumbnailOnlyObservations,
    reviewSuggestions,
    summary: {
      reviewSuggestionCount: reviewSuggestions.length,
      repeatedSelections: countByCode(reviewSuggestions, "repeatedSelection"),
      skippedIndices: countByCode(reviewSuggestions, "skippedIndices"),
      reversedMovements: countByCode(reviewSuggestions, "reversedMovement"),
      accidentalJumps: countByCode(reviewSuggestions, "accidentalJump"),
      selectorWraps: countByCode(reviewSuggestions, "selectorWrap"),
      overlappingClips: countByCode(reviewSuggestions, "overlappingClip"),
      incompleteSelectorEndings: countByCode(reviewSuggestions, "incompleteSelectorEnding"),
      selectedLabelsOutsideCandidateScope: countByCode(reviewSuggestions, "selectedLabelOutsideCandidateScope"),
      thumbnailOnlyObservations: countByCode(reviewSuggestions, "thumbnailOnlyObservation")
    }
  };
}

function filterTimelineEvents(events, config) {
  return events
    .filter((event) => config.timelineVideoIDs.includes(event.videoId))
    .filter((event) => {
      if (event.selectionState === "deliberately_selected") return true;
      const heading = normalizeLabel(event.menuHeading);
      return config.timelineHeadings.some((candidate) => heading === normalizeLabel(candidate));
    })
    .sort((first, second) => {
      const videoDelta = config.timelineVideoIDs.indexOf(first.videoId) - config.timelineVideoIDs.indexOf(second.videoId);
      if (videoDelta !== 0) return videoDelta;
      return Number(first.startSeconds) - Number(second.startSeconds);
    });
}

function enrichSelectedEvent(event, index, recordsByLabel, labelPattern) {
  const label = event.selectedNativeOptionLabel ?? "";
  const matchedRecord = recordsByLabel.get(normalizeLabel(label));
  const parsedOrder = parseOrderFromLabel(label, labelPattern);
  return {
    timelineId: event.timelineId,
    videoId: event.videoId,
    startSeconds: event.startSeconds,
    endSeconds: event.endSeconds,
    menuHeading: event.menuHeading,
    selectedNativeOptionLabel: label,
    selectionState: event.selectionState,
    visibleNonSelectedLabels: event.visibleNonSelectedLabels ?? [],
    viewCoverage: event.viewCoverage ?? [],
    stableVisualPeriod: Boolean(event.stableVisualPeriod),
    characterLoading: Boolean(event.characterLoading),
    motionBlurObserved: Boolean(event.motionBlurObserved),
    notificationOverlayObserved: Boolean(event.notificationOverlayObserved),
    knownCandidateRecord: Boolean(matchedRecord),
    stableInternalID: matchedRecord?.stableInternalID ?? null,
    nativeOrder: matchedRecord?.nativeOrder ?? parsedOrder,
    parsedOrderFromLabel: parsedOrder,
    evidenceStatus: matchedRecord ? "matched_candidate_record" : "timeline_selected_label_without_candidate_record",
    absoluteSequence: index
  };
}

function buildRecordsByLabel(records) {
  const index = new Map();
  for (const record of records) {
    for (const label of [record.visibleGameLabelOrIndex, record.nativeLabelOriginalText].filter(Boolean)) {
      index.set(normalizeLabel(label), record);
    }
  }
  return index;
}

function buildOverlappingClipSuggestions(config, selectedEvents) {
  const byLabel = groupBy(selectedEvents.filter((event) => event.selectedNativeOptionLabel), (event) => normalizeLabel(event.selectedNativeOptionLabel));
  const suggestions = [];
  for (const repeatedEvents of byLabel.values()) {
    const videos = unique(repeatedEvents.map((event) => event.videoId));
    if (videos.length < 2) continue;
    suggestions.push(reviewSuggestion({
      categoryKey: config.key,
      displayName: config.displayName,
      code: "overlappingClip",
      severity: "review",
      priority: "medium",
      timelineIDs: repeatedEvents.map((event) => event.timelineId),
      labels: repeatedEvents.map((event) => event.selectedNativeOptionLabel),
      nativeOrders: unique(repeatedEvents.map((event) => parseOrderFromLabel(event.selectedNativeOptionLabel, config.labelPattern)).filter(Number.isFinite)),
      message: `${repeatedEvents[0].selectedNativeOptionLabel} appears in multiple source videos.`,
      reviewAction: "Confirm this is intentional clip overlap and preserve both evidence references without creating duplicate catalog identities.",
      confidence: 0.9
    }));
  }
  return suggestions;
}

function buildIncompleteEndingSuggestions(config, records, selectedEvents, candidatePackage) {
  const suggestions = [];
  const knownSelected = selectedEvents.filter((event) => event.knownCandidateRecord && Number.isFinite(event.nativeOrder));
  const lastKnown = knownSelected[knownSelected.length - 1];
  const maxNativeOrder = Math.max(...records.map((record) => Number(record.nativeOrder)).filter(Number.isFinite));
  const completenessClaim = selectorCompletenessClaim(candidatePackage);
  if (completenessClaim !== "proven_complete") {
    suggestions.push(reviewSuggestion({
      categoryKey: config.key,
      displayName: config.displayName,
      code: "incompleteSelectorEnding",
      severity: "review",
      priority: "high",
      timelineIDs: lastKnown ? [lastKnown.timelineId] : [],
      labels: lastKnown ? [lastKnown.selectedNativeOptionLabel] : [],
      nativeOrders: lastKnown ? [lastKnown.nativeOrder] : [],
      message: `Selector boundary is not proven complete for ${config.displayName}.`,
      reviewAction: "Record first/final value, boundary, wrap behavior, and category exit evidence before production publication.",
      confidence: 0.85
    }));
  } else if (lastKnown && lastKnown.nativeOrder !== maxNativeOrder) {
    suggestions.push(reviewSuggestion({
      categoryKey: config.key,
      displayName: config.displayName,
      code: "incompleteSelectorEnding",
      severity: "review",
      priority: "medium",
      timelineIDs: [lastKnown.timelineId],
      labels: [lastKnown.selectedNativeOptionLabel],
      nativeOrders: [lastKnown.nativeOrder],
      message: `Last known selected candidate is native order ${lastKnown.nativeOrder}, but current candidate max is ${maxNativeOrder}.`,
      reviewAction: "Confirm whether the recording ended before the selector boundary or continued in another clip.",
      confidence: 0.65
    }));
  }
  return suggestions;
}

function selectorCompletenessClaim(candidatePackage) {
  const observations = candidatePackage.selectorObservations ?? {};
  const warnings = candidatePackage.categoryCompletenessWarnings ?? [];
  if (observations.selectorCompletenessProven === true || observations.completeSelectorBoundaryProven === true) return "proven_complete";
  if (warnings.length > 0) return "not_proven_with_warnings";
  return "not_proven";
}

function parseOrderFromLabel(label, pattern) {
  if (!pattern || !label) return null;
  const match = String(label).match(pattern);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

function reviewSuggestion({ categoryKey, displayName, code, severity, priority, timelineIDs, labels, nativeOrders, message, reviewAction, confidence }) {
  return {
    suggestionID: `seq-${categoryKey}-${code}-${safeToken([...timelineIDs, ...labels, ...nativeOrders].join("-")).slice(0, 80) || "category"}`,
    categoryKey,
    category: displayName,
    code,
    severity,
    priority,
    timelineIDs,
    labels,
    nativeOrders,
    message,
    reviewAction,
    confidence,
    factStatus: "review_suggestion_not_verified_game_fact",
    productionStatus: "NOT_PRODUCTION_DATA"
  };
}

function formatReviewQueueCSV(queue) {
  const header = [
    "suggestionID",
    "category",
    "code",
    "priority",
    "severity",
    "timelineIDs",
    "labels",
    "nativeOrders",
    "confidence",
    "message",
    "reviewAction",
    "factStatus"
  ];
  const rows = queue.map((item) => csvRow([
    item.suggestionID,
    item.category,
    item.code,
    item.priority,
    item.severity,
    item.timelineIDs.join("|"),
    item.labels.join("|"),
    item.nativeOrders.join("|"),
    item.confidence,
    item.message,
    item.reviewAction,
    item.factStatus
  ]));
  return `${header.join(",")}\n${rows.join("\n")}\n`;
}

function formatSequenceIntegrityMarkdown(report) {
  const lines = [
    "# Native Option Sequence Integrity Review",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "**PRIMARY RESEARCH SEQUENCE REVIEW — NOT PRODUCTION VERIFIED**",
    "",
    "Automated findings in this report are human-review suggestions only. They do not verify College Football 27 options, counts, order, wrap behavior, or production readiness.",
    "",
    "## Summary",
    "",
    `- Categories analyzed: ${report.summary.categoriesAnalyzed}`,
    `- Candidate records reviewed: ${report.summary.candidateRecordsReviewed}`,
    `- Deliberate selection events reviewed: ${report.summary.deliberateSelectionEvents}`,
    `- Human-review suggestions: ${report.summary.reviewSuggestionCount}`,
    "",
    "## Category Results",
    ""
  ];
  for (const category of report.categories) {
    lines.push(`### ${category.displayName}`);
    lines.push("");
    lines.push(`- Candidate records: ${category.candidateRecordCount}`);
    lines.push(`- Deliberate selected events: ${category.deliberateSelectionEventCount}`);
    lines.push(`- Matched known selected records: ${category.uniqueKnownSelectedRecordCount}`);
    lines.push(`- Selector completeness claim: ${category.selectorCompletenessClaim}`);
    lines.push(`- Review suggestions: ${category.summary.reviewSuggestionCount}`);
    if (category.reviewSuggestions.length > 0) {
      lines.push("");
      lines.push("| Priority | Code | Labels | Timeline IDs | Review action |");
      lines.push("| --- | --- | --- | --- | --- |");
      for (const suggestion of category.reviewSuggestions) {
        lines.push(`| ${suggestion.priority} | ${suggestion.code} | ${escapeMarkdownCell(suggestion.labels.join(", "))} | ${escapeMarkdownCell(suggestion.timelineIDs.join(", "))} | ${escapeMarkdownCell(suggestion.reviewAction)} |`);
      }
    }
    lines.push("");
  }
  lines.push("## Human Review Queue");
  lines.push("");
  lines.push("Use `native_sequence_human_review_queue.csv` for operational review beside the source videos.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function compareNativeOrder(first, second) {
  return Number(first.nativeOrder ?? 0) - Number(second.nativeOrder ?? 0) || String(first.stableInternalID).localeCompare(String(second.stableInternalID));
}

function compareReviewSuggestions(first, second) {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return (priorityOrder[first.priority] ?? 9) - (priorityOrder[second.priority] ?? 9)
    || first.category.localeCompare(second.category)
    || first.code.localeCompare(second.code)
    || first.suggestionID.localeCompare(second.suggestionID);
}

function countByCode(items, code) {
  return items.filter((item) => item.code === code).length;
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    const values = map.get(key) ?? [];
    values.push(item);
    map.set(key, values);
  }
  return map;
}

function unique(values) {
  return [...new Set(values)];
}

function csvRow(values) {
  return values.map((value) => {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
  }).join(",");
}

function normalizeLabel(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function safeToken(value) {
  return String(value).trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function escapeMarkdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\r?\n/g, " ");
}

function readJSON(absolutePath) {
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function normalizePath(value) {
  return value.replaceAll("\\", "/").replace(/^\.\/+/, "").split("/").filter((part) => part && part !== ".").join("/");
}

function assertResearchReportOutput(root, absoluteOutputDirectory) {
  const normalizedRoot = path.resolve(root);
  const normalizedOutput = path.resolve(absoluteOutputDirectory);
  const allowed = path.resolve(root, "data/research/cf27/reports");
  if (!normalizedOutput.startsWith(allowed) || normalizedOutput.includes(`${path.sep}data${path.sep}catalog${path.sep}production${path.sep}`)) {
    throw new Error(`Refusing to write sequence-integrity output outside data/research/cf27/reports: ${path.relative(normalizedRoot, normalizedOutput)}`);
  }
}

function cliValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function printHelp() {
  console.log([
    "Usage:",
    "  node scripts/cf27-native-sequence-integrity.mjs generate [--output-directory <dir>]",
    "  node scripts/cf27-native-sequence-integrity.mjs --help",
    "",
    "Generates review-only sequence-integrity reports for current CF27 research-candidate grid/carousel recordings.",
    "Findings are suggestions for human review and are never verified production game facts."
  ].join("\n"));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  if (!command || command === "--help") {
    printHelp();
    process.exit(0);
  }
  if (command === "generate") {
    const report = buildNativeSequenceIntegrityReport({ root: repositoryRoot });
    const result = writeNativeSequenceIntegrityOutputs(report, {
      root: repositoryRoot,
      outputDirectory: cliValue("--output-directory") ?? defaultOutputDirectory
    });
    console.log(JSON.stringify({ ok: true, summary: report.summary, outputs: result.files }, null, 2));
    process.exit(0);
  }
  printHelp();
  process.exit(1);
}
