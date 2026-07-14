#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_HEAD_TEMPLATE_RESEARCH_CATALOG_VERSION = "cf27-head-template-research-catalog-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAtDefault = "2026-07-14T00:30:00-04:00";
const verificationStatus = "OBSERVED_PENDING_VERIFICATION";
const productionStatus = "NOT_PRODUCTION_DATA";

const defaultTimelinePath = "data/phase-zero/video_timeline.json";
const defaultEvidenceManifestPath = "data/phase-zero/evidence_manifest.json";
const defaultCaptureLogPath = "data/phase-zero/capture_log.json";
const defaultCaptureLogCsvPath = "data/phase-zero/capture_log.csv";
const defaultFrameManifestPath = "data/research/cf27/manifests/head-template-evidence-frames/head_template_evidence_frame_manifest.json";
const defaultQAReportPath = "data/research/cf27/reports/head-template-standardization-qa/head_template_standardization_qa_report.json";
const defaultHeadsJsonPath = "data/phase-zero/heads.research.json";
const defaultHeadsCsvPath = "data/phase-zero/heads.research.csv";
const defaultHeadDocPath = "docs/phase-zero/HEAD_TEMPLATE_RESEARCH_CATALOG.md";
const defaultQualityDocPath = "docs/phase-zero/HEAD_CAPTURE_QUALITY_REPORT.md";
const defaultRecaptureJsonPath = "data/phase-zero/head_template_recapture_list.research.json";
const defaultRecaptureCsvPath = "data/phase-zero/head_template_recapture_list.research.csv";

const headTimelineVideoIDs = new Set(["phase0-video-002", "phase0-video-003"]);
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
  "notes",
  "head_research_catalog_id",
  "head_native_option_number",
  "head_research_flags"
];

export function generateHeadTemplateResearchCatalog(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const generatedAt = options.generatedAt ?? generatedAtDefault;
  const timeline = readJson(path.resolve(root, options.timelinePath ?? defaultTimelinePath));
  const evidenceManifest = readJson(path.resolve(root, options.evidenceManifestPath ?? defaultEvidenceManifestPath));
  const captureLog = readJson(path.resolve(root, options.captureLogPath ?? defaultCaptureLogPath));
  const frameManifest = readOptionalJson(path.resolve(root, options.frameManifestPath ?? defaultFrameManifestPath));
  const qaReport = readOptionalJson(path.resolve(root, options.qaReportPath ?? defaultQAReportPath));
  const evidenceByTimelineID = new Map((evidenceManifest.entries ?? [])
    .filter((entry) => entry.timeline_record_id)
    .map((entry) => [entry.timeline_record_id, entry]));

  const timelineRecords = (timeline.records ?? [])
    .filter((record) => headTimelineVideoIDs.has(record.video_id))
    .filter((record) => record.visible_menu_label === "HEAD TEMPLATE" && record.visible_option_label?.startsWith("Face "))
    .sort((left, right) => left.start_timestamp - right.start_timestamp || left.timeline_record_id.localeCompare(right.timeline_record_id));
  const observationsByNumber = groupHeadObservations(timelineRecords, evidenceByTimelineID);
  const records = [...observationsByNumber.entries()]
    .sort(([leftNumber], [rightNumber]) => leftNumber - rightNumber)
    .map(([nativeOptionNumber, observations]) => headRecord(nativeOptionNumber, observations, frameManifest, qaReport, generatedAt));

  const analysis = analyzeHeadTimeline(timelineRecords, records);
  const recaptureList = buildHeadRecaptureList(records, analysis, generatedAt);
  const updatedEvidenceManifest = annotateEvidenceManifest(evidenceManifest, records, analysis, generatedAt);
  const updatedCaptureLog = annotateCaptureLog(captureLog, records, analysis, generatedAt);

  const catalog = {
    schemaVersion: CF27_HEAD_TEMPLATE_RESEARCH_CATALOG_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "RESEARCH_CANDIDATE",
    sourceType: "shippingGameVideoResearch",
    productionStatus,
    verificationStatus,
    productionRecommendationsEnabled: false,
    sourceTimeline: options.timelinePath ?? defaultTimelinePath,
    sourceEvidenceManifest: options.evidenceManifestPath ?? defaultEvidenceManifestPath,
    sourceFrameManifest: options.frameManifestPath ?? defaultFrameManifestPath,
    sourceQAReport: options.qaReportPath ?? defaultQAReportPath,
    expectationReview: analysis.expectationReview,
    summary: {
      directlyObservedUniqueHeadTemplates: records.length,
      totalSelectedObservations: timelineRecords.length,
      observedMinimumNativeNumber: records[0]?.nativeOptionNumber ?? null,
      observedMaximumNativeNumber: records.at(-1)?.nativeOptionNumber ?? null,
      skippedNumbersWithinObservedRange: analysis.skippedNumbers,
      duplicateObservationNumbers: analysis.duplicateObservationNumbers,
      repeatedContinuityNumbers: analysis.repeatedContinuityNumbers,
      ambiguousRecordCount: records.filter((record) => record.ambiguities.length > 0).length,
      productionEligibleRecords: 0
    },
    timelineFindings: analysis.timelineFindings,
    records
  };

  return { catalog, updatedEvidenceManifest, updatedCaptureLog, recaptureList };
}

export function writeHeadTemplateResearchCatalog(outputs, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  writeText(root, options.headsJsonPath ?? defaultHeadsJsonPath, `${JSON.stringify(outputs.catalog, null, 2)}\n`);
  writeText(root, options.headsCsvPath ?? defaultHeadsCsvPath, formatHeadsCsv(outputs.catalog));
  writeText(root, options.headDocPath ?? defaultHeadDocPath, formatHeadCatalogMarkdown(outputs.catalog));
  writeText(root, options.qualityDocPath ?? defaultQualityDocPath, formatQualityMarkdown(outputs.catalog, outputs.recaptureList));
  writeText(root, options.recaptureJsonPath ?? defaultRecaptureJsonPath, `${JSON.stringify(outputs.recaptureList, null, 2)}\n`);
  writeText(root, options.recaptureCsvPath ?? defaultRecaptureCsvPath, formatRecaptureCsv(outputs.recaptureList));
  writeText(root, options.evidenceManifestPath ?? defaultEvidenceManifestPath, `${JSON.stringify(outputs.updatedEvidenceManifest, null, 2)}\n`);
  writeText(root, options.captureLogPath ?? defaultCaptureLogPath, `${JSON.stringify(outputs.updatedCaptureLog, null, 2)}\n`);
  writeText(root, options.captureLogCsvPath ?? defaultCaptureLogCsvPath, formatCaptureLogCsv(outputs.updatedCaptureLog));
}

function groupHeadObservations(timelineRecords, evidenceByTimelineID) {
  const byNumber = new Map();
  for (const record of timelineRecords) {
    const nativeOptionNumber = Number(record.visible_option_index);
    if (!Number.isInteger(nativeOptionNumber)) continue;
    const evidence = evidenceByTimelineID.get(record.timeline_record_id);
    const observation = {
      timelineRecordID: record.timeline_record_id,
      videoID: record.video_id,
      sourceVideo: record.canonical_filename,
      originalFilename: record.original_filename,
      timestampRange: `${record.start_timestamp}-${record.end_timestamp}`,
      startTimestamp: record.start_timestamp,
      endTimestamp: record.end_timestamp,
      visibleOptionLabel: record.visible_option_label,
      visibleOptionIndex: nativeOptionNumber,
      evidenceID: evidence?.evidence_id ?? null,
      evidenceFramePath: record.extracted_frame_path || evidence?.relative_path || null,
      evidenceFrameTimestamp: evidence?.timestamp ?? null,
      menuNumberVisible: record.visible_option_label === `Face ${nativeOptionNumber}`,
      transitionAnimationFinished: record.transition_active === false && record.blur_present === false,
      transitionActive: Boolean(record.transition_active),
      blurPresent: Boolean(record.blur_present),
      obstructionPresent: Boolean(record.obstruction_present),
      timelineConfidence: record.confidence,
      notes: record.notes ?? ""
    };
    if (!byNumber.has(nativeOptionNumber)) byNumber.set(nativeOptionNumber, []);
    byNumber.get(nativeOptionNumber).push(observation);
  }
  return byNumber;
}

function headRecord(nativeOptionNumber, observations, frameManifest, qaReport, generatedAt) {
  const stableResearchCatalogID = `CF27_XBOXUNKNOWN_RTG_HEAD_${String(nativeOptionNumber).padStart(3, "0")}`;
  const selectedObservation = choosePrimaryObservation(observations);
  const frames = (frameManifest?.frames ?? []).filter((frame) => frame.stableInternalID === stableResearchCatalogID);
  const qa = (qaReport?.records ?? []).find((record) => record.stableInternalID === stableResearchCatalogID);
  const menuFrame = frames.find((frame) => frame.view === "MENU");
  const frameIDMismatch = selectedObservation.evidenceFramePath && !selectedObservation.evidenceFramePath.includes(stableResearchCatalogID);
  const visualLimitations = [
    "Black cheek eye paint is present in the current head-template footage.",
    "Hair/facial-hair state is not independently locked by evidence.",
    "Non-menu angles are approximate derivatives where available.",
    "Menu UI/framing is not a production geometric comparison protocol."
  ];
  const ambiguities = [];
  if (observations.length > 1) ambiguities.push("Duplicate selected observations exist and are preserved as provenance.");
  if (frameIDMismatch) ambiguities.push("Evidence frame path was generated by an older candidate package naming pass and does not match this direct native-number ID.");
  if (nativeOptionNumber > 29) ambiguities.push("This option appears beyond the earlier expected Face 29 endpoint; category ending is not proven.");

  return {
    stableResearchCatalogID,
    nativeOptionNumber,
    nativeOrder: nativeOptionNumber,
    visibleGameLabelOrIndex: `Face ${nativeOptionNumber}`,
    dataClass: "RESEARCH_CANDIDATE",
    sourceType: "shippingGameVideoResearch",
    productionStatus,
    verificationStatus,
    sourceVideos: [...new Set(observations.map((observation) => observation.videoID))],
    primarySourceVideo: selectedObservation.videoID,
    primaryTimestampRange: selectedObservation.timestampRange,
    sourceObservations: observations,
    evidenceFrame: {
      evidenceID: selectedObservation.evidenceID,
      timelineRecordID: selectedObservation.timelineRecordID,
      path: selectedObservation.evidenceFramePath,
      timestamp: selectedObservation.evidenceFrameTimestamp,
      frameManifestID: menuFrame?.frameID ?? null,
      frameManifestPath: menuFrame?.outputRelativePath ?? null,
      pathMatchesStableID: !frameIDMismatch
    },
    menuNumberVisible: observations.every((observation) => observation.menuNumberVisible),
    transitionAnimationFinished: observations.every((observation) => observation.transitionAnimationFinished),
    characterLoaded: qa ? qa.standardizedCaptureChecks.loadingAnimation.status !== "POSSIBLE_OR_PRESENT" : "UNKNOWN",
    constants: {
      hair: "NOT_CONTROLLED_OR_PROVEN",
      facialHair: "NOT_CONTROLLED_OR_PROVEN",
      skinTone: "NOT_CONTROLLED_OR_PROVEN",
      lighting: "GAME_MENU_LIGHTING_APPEARS_CONSISTENT_BUT_NOT_MEASURED",
      zoom: "NOT_LOCKED",
      framing: "NOT_LOCKED",
      characterSettings: "UNKNOWN_NOT_FULLY_DOCUMENTED"
    },
    visualEvidenceQuality: qa?.evidenceClassification?.limitedMatchingImage
      ? "LIMITED_RESEARCH_MENU_AND_APPROXIMATE_ROTATION_FRAMES"
      : "RESEARCH_MENU_EVIDENCE_ONLY",
    countConfidence: "PARTIAL_OBSERVED_SELECTION_ONLY_TOTAL_COUNT_NOT_PROVEN",
    orderingConfidence: frameIDMismatch
      ? "MEDIUM_NATIVE_NUMBER_VISIBLE_FRAME_ID_MISMATCH_REVIEW_REQUIRED"
      : "HIGH_NATIVE_NUMBER_VISIBLE_FOR_THIS_RECORD_SEQUENCE_INCOMPLETE",
    suitability: {
      menuPresence: true,
      ordering: true,
      counting: "PARTIAL_OBSERVED_PRESENCE_ONLY_NOT_TOTAL_COUNT",
      preliminaryVisualAnnotation: true,
      productionGeometricComparison: false
    },
    qualityFlags: [
      ...visualLimitations,
      ...(observations.some((observation) => observation.blurPresent) ? ["Blur present in at least one observation."] : []),
      ...(observations.some((observation) => observation.obstructionPresent) ? ["Obstruction or overlay present in at least one observation."] : []),
      ...(frameIDMismatch ? ["Frame-path/catalog-ID mismatch requires manual review before reuse."] : []),
      "Recapture required before production comparison."
    ],
    defects: [
      ...(observations.some((observation) => observation.transitionActive) ? ["transition_frame_or_loading_state_contamination"] : []),
      ...(observations.some((observation) => observation.blurPresent) ? ["motion_blur_or_unstable_frame"] : []),
      ...(observations.some((observation) => observation.obstructionPresent) ? ["overlay_or_obstruction_present"] : []),
      ...(frameIDMismatch ? ["legacy_frame_manifest_id_mismatch"] : [])
    ],
    ambiguities,
    productionEligibility: {
      eligible: false,
      reason: "Research-only selected Head Template observation. Requires complete category boundary proof, standardized recapture, second-person verification, and production publish gate approval."
    },
    createdAt: generatedAt,
    updatedAt: generatedAt
  };
}

function analyzeHeadTimeline(timelineRecords, records) {
  const video002 = timelineRecords.filter((record) => record.video_id === "phase0-video-002");
  const video003 = timelineRecords.filter((record) => record.video_id === "phase0-video-003");
  const video002Numbers = video002.map((record) => record.visible_option_index).filter(Number.isFinite);
  const video003Numbers = video003.map((record) => record.visible_option_index).filter(Number.isFinite);
  const observedNumbers = records.map((record) => record.nativeOptionNumber);
  const min = Math.min(...observedNumbers);
  const max = Math.max(...observedNumbers);
  const skippedNumbers = [];
  for (let number = min; number <= max; number += 1) {
    if (!observedNumbers.includes(number)) skippedNumbers.push(number);
  }
  const counts = new Map();
  for (const record of timelineRecords) counts.set(record.visible_option_index, (counts.get(record.visible_option_index) ?? 0) + 1);
  const duplicateObservationNumbers = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([number]) => number)
    .sort((left, right) => left - right);
  const repeatedContinuityNumbers = duplicateObservationNumbers.filter((number) => number === 12);

  return {
    expectationReview: {
      firstVideoExpectedCoverage: "Face 1 through Face 12",
      firstVideoFinding: video002Numbers.includes(16)
        ? "REJECTED_AS_COMPLETE_1_THROUGH_12_ONLY"
        : "SUPPORTED",
      firstVideoObservedNumbers: video002Numbers,
      firstVideoReason: video002Numbers.includes(16)
        ? "The first head-template video visibly includes Face 16 after Face 12, so it cannot be described as covering only Face 1 through Face 12."
        : "The observed selected labels do not contradict the expected range.",
      secondVideoExpectedCoverage: "Face 12 through Face 29",
      secondVideoFinding: video003Numbers.some((number) => number > 29)
        ? "REJECTED_AS_COMPLETE_12_THROUGH_29_ONLY"
        : "PARTIALLY_SUPPORTED",
      secondVideoObservedNumbers: video003Numbers,
      secondVideoReason: video003Numbers.some((number) => number > 29)
        ? "The second head-template video visibly includes Face 30 and Face 31 before ending on Face 29. Face 29 is not proven to be the final available head."
        : "The recording begins on Face 12 and ends on Face 29, but selector ending is not proven.",
      face12OverlapFinding: video002Numbers.includes(12) && video003Numbers.includes(12)
        ? "CONFIRMED_AS_REPEATED_CONTINUITY_ENTRY"
        : "NOT_CONFIRMED",
      face12OverlapReason: "Face 12 is selected near the end of video 002 and again at the beginning of video 003. It is one catalog identity with multiple evidence observations, not two records."
    },
    timelineFindings: {
      skippedNumbers,
      duplicateObservationNumbers,
      repeatedContinuityNumbers,
      ambiguousEntries: [
        ...(video002Numbers.includes(16) ? ["Video 002 contains Face 16 despite the previous working-name expectation of Face 1 through Face 12."] : []),
        ...(video003Numbers.some((number) => number > 29) ? ["Video 003 contains Face 30 and Face 31 despite the previous working-name expectation of Face 12 through Face 29."] : []),
        "Observed traversal is non-monotonic; native option numbers are preserved from visible labels, but full sequence/order continuity is incomplete.",
        "Face 29 is not treated as the final available head because selector ending/wrap is not directly demonstrated."
      ],
      transitionFrames: timelineRecords.filter((record) => record.transition_active || record.event_type === "loading_transition").map((record) => record.timeline_record_id),
      loadingStateContamination: timelineRecords.filter((record) => record.event_type === "loading_transition").map((record) => record.timeline_record_id),
      inconsistentFraming: "NOT_LOCKED_MENU_ROTATION_FRAMING",
      inconsistentCharacterSettings: "UNKNOWN_NOT_CONTROLLED",
      productionCountBoundary: "NOT_PROVEN"
    },
    skippedNumbers,
    duplicateObservationNumbers,
    repeatedContinuityNumbers
  };
}

function choosePrimaryObservation(observations) {
  const withResearchFrame = observations.find((observation) => observation.evidenceFramePath?.includes("data/research/cf27/generated"));
  return withResearchFrame ?? observations[0];
}

function buildHeadRecaptureList(records, analysis, generatedAt) {
  const items = [
    recaptureItem("head-template-boundary", "P0", "Head Template category boundary", "Record from the first Head Template through the final option and prove the end or wrap behavior. Do not assume Face 29, Face 31, or any other observed option is final.", ["First selected head", "Every selected head after current maximum", "Final-option or wrap evidence"], analysis.timelineFindings.productionCountBoundary),
    recaptureItem("head-template-skipped-numbers", "P0", "Skipped native numbers inside observed range", `Resolve missing observed numbers inside Face ${records[0]?.nativeOptionNumber}-Face ${records.at(-1)?.nativeOptionNumber}: ${analysis.skippedNumbers.join(", ")}. Record whether each is skipped by traversal, unavailable, or simply not captured.`, ["Controlled selected-option sequence", "Notes for each missing native number"], "ORDER_INCOMPLETE"),
    recaptureItem("head-template-standardized-pass", "P0", "Standardized production-comparison pass", "Recapture all observed and newly found heads with locked canonical settings, no eye black where possible, controlled hair/facial-hair state where possible, consistent zoom, no overlays, and required front/three-quarter/profile/rear views.", ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "REAR", "RIGHT_PROFILE", "RIGHT_3Q"], "PRODUCTION_COMPARISON_BLOCKED"),
    recaptureItem("head-template-frame-id-review", "P1", "Review legacy frame-manifest ID mismatches", "Review records whose direct native-number ID does not match the older derivative frame path naming. Preserve derivatives, but do not use mismatched derivative IDs as production catalog IDs.", ["Head records with legacy_frame_manifest_id_mismatch"], "MANUAL_REVIEW_REQUIRED")
  ];

  return {
    schemaVersion: `${CF27_HEAD_TEMPLATE_RESEARCH_CATALOG_VERSION}-recapture-list`,
    generatedAt,
    dataClass: "RESEARCH_CANDIDATE",
    productionStatus,
    verificationStatus,
    summary: {
      itemCount: items.length,
      recordsRequiringProductionRecapture: records.length,
      skippedNumbers: analysis.skippedNumbers,
      duplicateObservationNumbers: analysis.duplicateObservationNumbers
    },
    items
  };
}

function recaptureItem(id, priority, title, description, requiredEvidence, blocker) {
  return {
    id,
    priority,
    title,
    description,
    requiredEvidence,
    blocker,
    existingEvidenceRemainsUseful: true,
    productionStatus,
    verificationStatus
  };
}

function annotateEvidenceManifest(evidenceManifest, records, analysis, generatedAt) {
  const updated = structuredClone(evidenceManifest);
  updated.updatedAt = generatedAt;
  updated.headTemplateResearchCatalog = {
    generatedAt,
    catalogPath: defaultHeadsJsonPath,
    recordCount: records.length,
    productionStatus,
    verificationStatus,
    skippedNumbersWithinObservedRange: analysis.skippedNumbers,
    note: "Evidence entries remain source video masters or derivative frames. This annotation links the existing evidence manifest to the generated head-template research catalog; it does not create production assets."
  };
  const recordByEvidenceID = new Map();
  for (const record of records) {
    for (const observation of record.sourceObservations) {
      if (observation.evidenceID) recordByEvidenceID.set(observation.evidenceID, record);
    }
  }
  updated.entries = (updated.entries ?? []).map((entry) => {
    const record = recordByEvidenceID.get(entry.evidence_id);
    if (!record) return entry;
    return {
      ...entry,
      headResearchCatalogID: record.stableResearchCatalogID,
      headNativeOptionNumber: record.nativeOptionNumber,
      headResearchProductionStatus: productionStatus
    };
  });
  return updated;
}

function annotateCaptureLog(captureLog, records, analysis, generatedAt) {
  const updated = structuredClone(captureLog);
  updated.updatedAt = generatedAt;
  updated.headTemplateResearchCatalog = {
    generatedAt,
    catalogPath: defaultHeadsJsonPath,
    recordCount: records.length,
    productionStatus,
    verificationStatus,
    expectationReview: analysis.expectationReview
  };
  const recordByTimelineID = new Map();
  for (const record of records) {
    for (const observation of record.sourceObservations) {
      recordByTimelineID.set(observation.timelineRecordID, record);
    }
  }
  updated.events = (updated.events ?? []).map((event) => {
    const record = recordByTimelineID.get(event.timeline_record_id);
    if (!record) return event;
    return {
      ...event,
      head_research_catalog_id: record.stableResearchCatalogID,
      head_native_option_number: record.nativeOptionNumber,
      head_research_flags: record.qualityFlags
    };
  });
  return updated;
}

function formatHeadsCsv(catalog) {
  const columns = [
    "stableResearchCatalogID",
    "nativeOptionNumber",
    "nativeOrder",
    "visibleGameLabelOrIndex",
    "primarySourceVideo",
    "primaryTimestampRange",
    "evidenceID",
    "evidenceFramePath",
    "evidenceFrameTimestamp",
    "menuNumberVisible",
    "transitionAnimationFinished",
    "visualEvidenceQuality",
    "countConfidence",
    "orderingConfidence",
    "suitableMenuPresence",
    "suitableOrdering",
    "suitableCounting",
    "suitablePreliminaryVisualAnnotation",
    "suitableProductionGeometricComparison",
    "productionStatus",
    "verificationStatus"
  ];
  const rows = catalog.records.map((record) => ({
    stableResearchCatalogID: record.stableResearchCatalogID,
    nativeOptionNumber: record.nativeOptionNumber,
    nativeOrder: record.nativeOrder,
    visibleGameLabelOrIndex: record.visibleGameLabelOrIndex,
    primarySourceVideo: record.primarySourceVideo,
    primaryTimestampRange: record.primaryTimestampRange,
    evidenceID: record.evidenceFrame.evidenceID,
    evidenceFramePath: record.evidenceFrame.path,
    evidenceFrameTimestamp: record.evidenceFrame.timestamp,
    menuNumberVisible: record.menuNumberVisible,
    transitionAnimationFinished: record.transitionAnimationFinished,
    visualEvidenceQuality: record.visualEvidenceQuality,
    countConfidence: record.countConfidence,
    orderingConfidence: record.orderingConfidence,
    suitableMenuPresence: record.suitability.menuPresence,
    suitableOrdering: record.suitability.ordering,
    suitableCounting: record.suitability.counting,
    suitablePreliminaryVisualAnnotation: record.suitability.preliminaryVisualAnnotation,
    suitableProductionGeometricComparison: record.suitability.productionGeometricComparison,
    productionStatus: record.productionStatus,
    verificationStatus: record.verificationStatus
  }));
  return toCsv(columns, rows);
}

function formatRecaptureCsv(recaptureList) {
  const columns = ["id", "priority", "title", "description", "requiredEvidence", "blocker", "existingEvidenceRemainsUseful", "productionStatus", "verificationStatus"];
  return toCsv(columns, recaptureList.items.map((item) => ({
    ...item,
    requiredEvidence: item.requiredEvidence.join("|")
  })));
}

function formatCaptureLogCsv(captureLog) {
  return toCsv(captureLogColumns, (captureLog.events ?? []).map((event) => ({
    ...event,
    evidence_generated: Array.isArray(event.evidence_generated) ? event.evidence_generated.join("; ") : event.evidence_generated,
    issue_detected: Array.isArray(event.issue_detected) ? event.issue_detected.join("; ") : event.issue_detected,
    head_research_flags: Array.isArray(event.head_research_flags) ? event.head_research_flags.join("; ") : event.head_research_flags
  })));
}

function formatHeadCatalogMarkdown(catalog) {
  const lines = [
    "# Head Template Research Catalog",
    "",
    "This catalog is built from directly observed Head Template timeline evidence only. It is primary research, not production verification, and it does not enable recommendations.",
    "",
    "## Expectation Review",
    "",
    `- First video expectation: ${catalog.expectationReview.firstVideoExpectedCoverage}`,
    `- First video finding: ${catalog.expectationReview.firstVideoFinding}`,
    `- Reason: ${catalog.expectationReview.firstVideoReason}`,
    `- Second video expectation: ${catalog.expectationReview.secondVideoExpectedCoverage}`,
    `- Second video finding: ${catalog.expectationReview.secondVideoFinding}`,
    `- Reason: ${catalog.expectationReview.secondVideoReason}`,
    `- Face 12 overlap: ${catalog.expectationReview.face12OverlapFinding}`,
    `- Reason: ${catalog.expectationReview.face12OverlapReason}`,
    "",
    "## Summary",
    "",
    `- Directly observed unique Head Template records: ${catalog.summary.directlyObservedUniqueHeadTemplates}`,
    `- Selected observations: ${catalog.summary.totalSelectedObservations}`,
    `- Observed numeric range: Face ${catalog.summary.observedMinimumNativeNumber} through Face ${catalog.summary.observedMaximumNativeNumber}`,
    `- Skipped numbers within observed range: ${catalog.summary.skippedNumbersWithinObservedRange.join(", ") || "none"}`,
    `- Duplicate observation numbers: ${catalog.summary.duplicateObservationNumbers.join(", ") || "none"}`,
    `- Production-eligible records: ${catalog.summary.productionEligibleRecords}`,
    "",
    "## Records",
    "",
    "| Native # | Stable research ID | Source | Timestamp | Evidence frame | Menu # visible | Ordering confidence | Production geometric comparison |",
    "| ---: | --- | --- | --- | --- | --- | --- | --- |"
  ];
  for (const record of catalog.records) {
    lines.push(`| ${record.nativeOptionNumber} | ${record.stableResearchCatalogID} | ${record.primarySourceVideo} | ${record.primaryTimestampRange} | ${record.evidenceFrame.path ?? ""} | ${record.menuNumberVisible ? "yes" : "no"} | ${record.orderingConfidence} | ${record.suitability.productionGeometricComparison ? "yes" : "no"} |`);
  }
  lines.push("", "## Production Eligibility", "", "No head-template record is production eligible. Face 29 is not assumed to be final because selector ending/wrap is not directly demonstrated.");
  return `${lines.join("\n")}\n`;
}

function formatQualityMarkdown(catalog, recaptureList) {
  const lines = [
    "# Head Capture Quality Report",
    "",
    "Current head-template evidence is useful for menu presence and selected-number/order research. It is not suitable for production geometric comparison.",
    "",
    "## Timeline Findings",
    "",
    `- Skipped numbers inside observed range: ${catalog.timelineFindings.skippedNumbers.join(", ")}`,
    `- Duplicate observations: ${catalog.timelineFindings.duplicateObservationNumbers.join(", ")}`,
    `- Repeated continuity entries: ${catalog.timelineFindings.repeatedContinuityNumbers.join(", ")}`,
    `- Count boundary: ${catalog.timelineFindings.productionCountBoundary}`,
    `- Framing: ${catalog.timelineFindings.inconsistentFraming}`,
    `- Character settings: ${catalog.timelineFindings.inconsistentCharacterSettings}`,
    "",
    "## Quality Classification",
    "",
    "| Stable research ID | Visual quality | Count confidence | Production comparison | Flags |",
    "| --- | --- | --- | --- | --- |"
  ];
  for (const record of catalog.records) {
    lines.push(`| ${record.stableResearchCatalogID} | ${record.visualEvidenceQuality} | ${record.countConfidence} | ${record.suitability.productionGeometricComparison ? "yes" : "no"} | ${record.qualityFlags.join("; ")} |`);
  }
  lines.push("", "## Recapture List", "", "| Priority | Item | Blocker |", "| --- | --- | --- |");
  for (const item of recaptureList.items) {
    lines.push(`| ${item.priority} | ${item.title} | ${item.blocker} |`);
  }
  return `${lines.join("\n")}\n`;
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

function readOptionalJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return readJson(filePath);
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
  console.log("Usage: node scripts/cf27-head-template-research-catalog.mjs [--generated-at <iso>]");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }
    const outputs = generateHeadTemplateResearchCatalog(options);
    writeHeadTemplateResearchCatalog(outputs, options);
    console.log(`Head Template research catalog generated: ${outputs.catalog.records.length} records, ${outputs.recaptureList.items.length} recapture items.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
