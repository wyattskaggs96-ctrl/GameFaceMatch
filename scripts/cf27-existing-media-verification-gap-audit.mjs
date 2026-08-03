#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const CF27_EXISTING_MEDIA_GAP_AUDIT_SCHEMA_VERSION = "cf27-existing-media-verification-gap-audit-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAt = "2026-08-02T22:10:00-04:00";

const outputPaths = {
  json: "data/phase-zero/cf27_existing_media_verification_gap_audit.json",
  csv: "data/phase-zero/cf27_existing_media_verification_gap_audit.csv",
  recaptureJson: "data/phase-zero/cf27_minimum_recapture_queue.json",
  recaptureCsv: "data/phase-zero/cf27_minimum_recapture_queue.csv",
  doc: "docs/status/CF27_EXISTING_MEDIA_VERIFICATION_GAP_AUDIT.md",
  ownerGuide: "docs/status/CF27_OWNER_MINIMUM_RECORDING_GUIDE.md"
};

const sourcePaths = {
  videoInventory: "data/phase-zero/video_inventory.json",
  timeline: "data/phase-zero/video_timeline.json",
  evidenceManifest: "data/phase-zero/evidence_manifest.json",
  productionVerificationQueue: "data/phase-zero/production_verification_queue.json",
  primaryReview: "data/phase-zero/primary_review_status.json",
  countOrderAudit: "data/phase-zero/catalog_count_order_audit.research.json",
  recapturePackage: "data/phase-zero/evidence-recapture-package/evidence_quality_report.json",
  priorRecaptureQueue: "data/phase-zero/evidence-recapture-package/recapture_queue.json",
  issuesRegister: "data/phase-zero/issues_register.research.json",
  frameReextractions: "data/phase-zero/cf27_frame_reextractions.json"
};

const allowedClassifications = [
  "CLEAR_EXISTING_EVIDENCE",
  "CLEAR_EXISTING_EVIDENCE_WITH_NOTES",
  "FRAME_REEXTRACTION_REQUIRED",
  "SECOND_VERIFIER_CONFIRMATION_REQUIRED",
  "UNCLEAR_EXISTING_EVIDENCE",
  "MISSING_FROM_EXISTING_MEDIA",
  "GENUINE_RECAPTURE_REQUIRED",
  "DUPLICATE_UPLOAD_NO_NEW_COVERAGE",
  "NOT_APPLICABLE"
];

const categoryRequirements = [
  "Game environment",
  "Game title/version/update evidence",
  "Console/platform evidence",
  "Road to Glory creation path",
  "Appearance menu map",
  "Head templates",
  "Skin tone",
  "Skin details",
  "Eye shape",
  "Eye color",
  "Nose",
  "Ear shape",
  "Mouth shape",
  "Jaw shape",
  "Chin",
  "Hair menu",
  "Hairstyles",
  "Hair colors",
  "Facial hair",
  "Facial-hair colors",
  "Body or physique controls",
  "Additional visible face-matching controls",
  "Dependency tests",
  "Native ordering",
  "Selector first/final values",
  "Duplicate or near-duplicate options",
  "Canonical capture settings"
];

const categoryDisplay = {
  "Head Template": "Head templates",
  Heads: "Head templates",
  "Skin Tone": "Skin tone",
  "Skin Details": "Skin details",
  "Eye Shape": "Eye shape",
  "Eye Color": "Eye color",
  Nose: "Nose",
  "Ear Shape": "Ear shape",
  "Mouth Shape": "Mouth shape",
  "Jaw Shape": "Jaw shape",
  Chin: "Chin",
  Hairstyles: "Hairstyles",
  "Hair colors": "Hair colors",
  "Hair Color": "Hair colors",
  "Facial hair": "Facial hair",
  "Facial Hair": "Facial hair",
  "Facial-hair colors": "Facial-hair colors",
  "Facial-Hair Color": "Facial-hair colors",
  "Body-related appearance controls": "Body or physique controls",
  "Body Controls / Position Context": "Body or physique controls"
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const checkOnly = process.argv.includes("--check");
  const built = buildExistingMediaVerificationGapAudit({ root: repositoryRoot });
  if (checkOnly) {
    checkExistingMediaVerificationGapAudit(built, { root: repositoryRoot });
    console.log(`CF27 existing-media verification gap audit is current (${built.audit.summary.totalAuditRows} rows; ${built.recaptureQueue.summary.totalRecaptures} genuine recaptures).`);
  } else {
    writeExistingMediaVerificationGapAudit(built, { root: repositoryRoot });
    console.log(`Wrote CF27 existing-media verification gap audit (${built.audit.summary.totalAuditRows} rows; ${built.recaptureQueue.summary.totalRecaptures} genuine recaptures).`);
  }
}

export function buildExistingMediaVerificationGapAudit({ root = repositoryRoot, generatedAtISO = generatedAt } = {}) {
  const videoInventory = readJson(root, sourcePaths.videoInventory);
  const timeline = readJson(root, sourcePaths.timeline);
  const evidenceManifest = readJson(root, sourcePaths.evidenceManifest);
  const queue = readJson(root, sourcePaths.productionVerificationQueue);
  const primaryReview = readJson(root, sourcePaths.primaryReview);
  const countOrderAudit = readJson(root, sourcePaths.countOrderAudit);
  const recapturePackage = readJson(root, sourcePaths.recapturePackage);
  const priorRecaptureQueue = readJson(root, sourcePaths.priorRecaptureQueue);
  const issuesRegister = readJson(root, sourcePaths.issuesRegister);
  const frameReextractions = readOptionalJson(root, sourcePaths.frameReextractions) ?? { rows: [] };

  const evidenceEntries = evidenceManifest.entries ?? [];
  const timelineRecords = timeline.records ?? [];
  const candidateRecords = queue.records ?? [];
  const countCategories = countOrderAudit.categories ?? [];
  const videoRows = buildVideoRows({
    root,
    inventoryRows: videoInventory.inventory ?? [],
    evidenceEntries,
    timelineRecords,
    candidateRecords
  });

  const videoAuditRows = videoRows.map(videoAuditRow);
  const candidateAuditRows = candidateRecords.map((candidate) => buildCandidateAuditRow({ candidate, evidenceEntries, timelineRecords }));
  const requirementRows = buildRequirementRows({
    candidateRecords,
    timelineRecords,
    countCategories,
    videoRows,
    primaryReview,
    recapturePackage,
    priorRecaptureQueue,
    frameReextractions
  });
  const auditRows = [...videoAuditRows, ...candidateAuditRows, ...requirementRows].sort(compareAuditRows);
  const recaptureTasks = buildMinimumRecaptureTasks(auditRows);
  const categoryTotals = buildCategoryTotals(auditRows);
  const classificationCounts = countBy(auditRows, "primaryClassification");
  const videoSummary = summarizeVideoRows(videoRows);
  const validation = validateAudit({ auditRows, recaptureTasks, videoRows, candidateRecords });

  const base = {
    schemaVersion: CF27_EXISTING_MEDIA_GAP_AUDIT_SCHEMA_VERSION,
    generatedAt: generatedAtISO,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "EXISTING_MEDIA_VERIFICATION_GAP_AUDIT",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "NOT_SECOND_VERIFIED",
    productionRecommendationsEnabled: false,
    sourceArtifacts: sourcePaths,
    policy: {
      existingFootageExhaustedFirst: true,
      noProductionPromotion: true,
      noSecondVerificationClaim: true,
      noBlanketRecaptureWithoutRecordFindings: true,
      recaptureQueueContainsOnlyGenuineRecaptureRequired: true
    }
  };

  const audit = {
    ...base,
    summary: {
      totalAuditRows: auditRows.length,
      videoRows: videoAuditRows.length,
      candidateRows: candidateAuditRows.length,
      requirementRows: requirementRows.length,
      uniqueMasterVideos: videoSummary.uniqueMasterVideos,
      duplicateUploads: videoSummary.duplicateUploads,
      localSourceVideosOpened: videoRows.filter((row) => row.localDecodeStatus === "OPENS_WITH_FFMPEG").length,
      sourceVideoRecords: videoRows.length,
      productionCatalogRecords: 0,
      secondVerifiedRecords: 0,
      productionApprovedRecords: 0,
      classificationCounts
    },
    videoInventory: videoRows,
    categoryTotals,
    clearlySupportedFacts: auditRows.filter((row) => row.primaryClassification === "CLEAR_EXISTING_EVIDENCE").map(summaryRow),
    supportedWithNotesFacts: auditRows.filter((row) => row.primaryClassification === "CLEAR_EXISTING_EVIDENCE_WITH_NOTES").map(summaryRow),
    frameReextractionsRequired: auditRows.filter((row) => row.primaryClassification === "FRAME_REEXTRACTION_REQUIRED").map(summaryRow),
    secondVerifierConfirmationsRequired: auditRows.filter((row) => row.primaryClassification === "SECOND_VERIFIER_CONFIRMATION_REQUIRED").map(summaryRow),
    unclearExistingEvidence: auditRows.filter((row) => row.primaryClassification === "UNCLEAR_EXISTING_EVIDENCE").map(summaryRow),
    entirelyMissingCategories: auditRows.filter((row) => row.primaryClassification === "MISSING_FROM_EXISTING_MEDIA").map(summaryRow),
    genuineRecapturesRequired: auditRows.filter((row) => row.primaryClassification === "GENUINE_RECAPTURE_REQUIRED").map(summaryRow),
    itemsThatDoNotNeedRecordingAgain: auditRows
      .filter((row) => ["CLEAR_EXISTING_EVIDENCE", "CLEAR_EXISTING_EVIDENCE_WITH_NOTES", "FRAME_REEXTRACTION_REQUIRED", "SECOND_VERIFIER_CONFIRMATION_REQUIRED", "DUPLICATE_UPLOAD_NO_NEW_COVERAGE", "NOT_APPLICABLE"].includes(row.primaryClassification))
      .map(summaryRow),
    candidateMatrix: candidateAuditRows,
    requirementMatrix: requirementRows,
    auditRows,
    validation,
    issuesInspected: issuesRegister.issues?.length ?? 0
  };

  const recaptureQueue = {
    ...base,
    schemaVersion: `${CF27_EXISTING_MEDIA_GAP_AUDIT_SCHEMA_VERSION}-minimum-recapture-queue`,
    dataClass: "CF27_MINIMUM_RECAPTURE_QUEUE",
    summary: {
      totalRecaptures: recaptureTasks.length,
      affectedCandidates: unique(recaptureTasks.flatMap((task) => task.affectedCandidateIDs)).length,
      groups: countBy(recaptureTasks, "group")
    },
    tasks: recaptureTasks
  };

  const files = {
    json: `${JSON.stringify(audit, null, 2)}\n`,
    csv: toCsv(auditRows.map(auditCsvRow)),
    recaptureJson: `${JSON.stringify(recaptureQueue, null, 2)}\n`,
    recaptureCsv: toCsv(recaptureTasks.map(recaptureCsvRow)),
    doc: formatMarkdownReport({ audit, recaptureQueue }),
    ownerGuide: formatOwnerMinimumRecordingGuide({ audit, recaptureQueue })
  };

  return { audit, recaptureQueue, files };
}

export function writeExistingMediaVerificationGapAudit(built, { root = repositoryRoot } = {}) {
  writeText(root, outputPaths.json, built.files.json);
  writeText(root, outputPaths.csv, built.files.csv);
  writeText(root, outputPaths.recaptureJson, built.files.recaptureJson);
  writeText(root, outputPaths.recaptureCsv, built.files.recaptureCsv);
  writeText(root, outputPaths.doc, built.files.doc);
  writeText(root, outputPaths.ownerGuide, built.files.ownerGuide);
}

export function checkExistingMediaVerificationGapAudit(built, { root = repositoryRoot } = {}) {
  if (!built.audit.validation.ok) {
    throw new Error(`CF27 existing-media audit failed validation: ${built.audit.validation.errors.map((error) => error.message).join("; ")}`);
  }
  assertCurrent(root, outputPaths.json, built.files.json);
  assertCurrent(root, outputPaths.csv, built.files.csv);
  assertCurrent(root, outputPaths.recaptureJson, built.files.recaptureJson);
  assertCurrent(root, outputPaths.recaptureCsv, built.files.recaptureCsv);
  assertCurrent(root, outputPaths.doc, built.files.doc);
  assertCurrent(root, outputPaths.ownerGuide, built.files.ownerGuide);
  return true;
}

function buildVideoRows({ root, inventoryRows, evidenceEntries, timelineRecords, candidateRecords }) {
  const evidenceByVideo = groupBy(evidenceEntries, (entry) => entry.video_id ?? entry.sourceVideoID ?? "");
  const timelineByVideo = groupBy(timelineRecords, (record) => record.video_id ?? "");
  const candidatesByVideo = new Map();
  for (const candidate of candidateRecords) {
    for (const source of candidate.sourceVideoReferences ?? []) {
      if (!source.sourceVideoID) continue;
      candidatesByVideo.set(source.sourceVideoID, [...(candidatesByVideo.get(source.sourceVideoID) ?? []), candidate.stableCandidateID]);
    }
  }

  return inventoryRows.map((video) => {
    const relativePath = video.sourceLocation?.portableRelativeEvidencePath ?? "";
    const absolutePath = path.resolve(root, relativePath);
    const localAvailable = relativePath.startsWith("source-media/") && fs.existsSync(absolutePath);
    const localDecodeStatus = localAvailable ? ffmpegCanOpen(absolutePath) : (relativePath.startsWith("OWNER_DOWNLOADS/") ? "PORTABLE_EXTERNAL_MASTER_NOT_LOCAL" : "NOT_LOCAL_OR_NOT_SOURCE_MEDIA");
    const localSha256 = localAvailable ? sha256File(absolutePath) : "";
    const timelines = timelineByVideo.get(video.inventoryId) ?? [];
    const derivatives = evidenceByVideo.get(video.inventoryId) ?? [];
    const categoryRange = unique(timelines.map((record) => record.visible_menu_label || record.parent_menu).filter(Boolean));
    const optionRange = summarizeOptionRange(timelines);
    return {
      sourceVideoID: video.inventoryId,
      originalFilename: video.originalFilename ?? "",
      relabeledFilename: video.canonicalFilename ?? video.discoveredFilename ?? "",
      relativePath,
      fileSizeBytes: video.fileSizeBytes ?? null,
      durationSeconds: video.durationSeconds ?? null,
      resolution: video.dimensions ? `${video.dimensions.width}x${video.dimensions.height}` : "",
      width: video.dimensions?.width ?? null,
      height: video.dimensions?.height ?? null,
      frameRate: video.frameRate ?? "",
      codec: video.videoCodec ?? "",
      audioCodec: video.audioCodec ?? "",
      mediaContainer: video.mediaContainer ?? "",
      sha256: video.sha256 ?? "",
      localSha256MatchesManifest: localSha256 ? localSha256 === video.sha256 : null,
      localDecodeStatus,
      duplicateStatus: video.exactDuplicate ? "DUPLICATE_UPLOAD_NO_NEW_COVERAGE" : "UNIQUE_OR_CANONICAL",
      duplicateOf: video.exactDuplicateOf ?? "",
      categoryOrMenuSection: categoryRange.join("; ") || video.expectedContent || "",
      approximateOptionRangeShown: optionRange,
      existingDerivativeReferences: derivatives.map((entry) => entry.evidence_id ?? entry.evidenceID ?? "").filter(Boolean).sort(),
      existingCandidateReferences: unique(candidatesByVideo.get(video.inventoryId) ?? []),
      observedContent: video.observedContent ?? "",
      expectedContent: video.expectedContent ?? "",
      sourceFolderMismatch: video.sourceFolderMismatch ?? "",
      productionUseStatus: video.productionUseStatus ?? "NOT_PRODUCTION_DATA"
    };
  }).sort((left, right) => left.sourceVideoID.localeCompare(right.sourceVideoID));
}

function buildCandidateAuditRow({ candidate, evidenceEntries, timelineRecords }) {
  const refs = candidate.evidenceReferences ?? [];
  const evidenceByID = new Map(evidenceEntries.map((entry) => [entry.evidence_id ?? entry.evidenceID ?? "", entry]));
  const timelineByID = new Map(timelineRecords.map((record) => [record.timeline_record_id, record]));
  const evidence = refs.map((ref) => evidenceByID.get(ref.evidenceID)).filter(Boolean);
  const sourceRefs = candidate.sourceVideoReferences ?? [];
  const timelines = sourceRefs.flatMap((source) => timelineRecords.filter((record) => record.video_id === source.sourceVideoID && timestampOverlaps(record, source)));
  const sourceVideo = sourceRefs.map((source) => source.sourceVideoID).filter(Boolean).join("; ");
  const startTimestamp = firstValue(sourceRefs.map((source) => source.timestampRange || source.timestamp)) || firstValue(timelines.map((record) => record.start_timestamp));
  const endTimestamp = firstValue(timelines.map((record) => record.end_timestamp)) || "";
  const categoryVisible = candidate.categoryVisible ? "yes" : "partial";
  const nativeOrderVisible = candidate.neighboringOptionsEstablishOrdering ? "yes" : (candidate.nativeOrder ? "partial" : "no");
  const classification = refs.length === 0 ? "MISSING_FROM_EXISTING_MEDIA" : "SECOND_VERIFIER_CONFIRMATION_REQUIRED";
  const missingViews = candidate.missingViews ?? [];
  const onlyFrontMissing = missingViews.length > 0 && missingViews.every((view) => view === "FRONT");
  const frameExtractionCanSolve = onlyFrontMissing && evidence.length > 0;
  return {
    auditRowID: `candidate-${candidate.stableCandidateID}`,
    rowType: "CATALOG_CANDIDATE",
    candidateOrRequirementID: candidate.stableCandidateID,
    category: candidate.category,
    nativeLabelIndexOrder: candidate.nativeOptionLabelOrIndex ?? "",
    nativeOrder: candidate.nativeOrder ?? "",
    existingSourceVideo: sourceVideo,
    startTimestamp,
    endTimestamp,
    existingDerivativeFrameReferences: refs.map((ref) => ref.evidenceID).join("; "),
    whatClearlyVisible: [
      candidate.selectedValueVisible ? "selected value is visible" : "selected value visibility is not proven",
      candidate.categoryVisible ? "category/menu is visible" : "category/menu visibility is partial",
      candidate.optionTransitionObservable ? "option transition is observable" : "option transition is not fully observable"
    ].join("; "),
    whatNotVisible: [
      missingViews.length ? `required production view(s): ${missingViews.join(", ")}` : "",
      candidate.gameVersion ? "" : "game version",
      candidate.patch ? "" : "patch",
      candidate.duplicateOrNearDuplicateFlag ? "duplicate resolution" : "",
      candidate.primaryReviewStatus === "ORDER_UNRESOLVED" ? "complete native order" : ""
    ].filter(Boolean).join("; ") || "No additional gap at candidate-observation level.",
    requiredViews: (candidate.requiredViews ?? []).join("; "),
    availableViews: (candidate.availableViews ?? []).join("; "),
    missingViews: missingViews.join("; "),
    menuLabelVisible: categoryVisible,
    nativeOrderVisible,
    environmentMetadataAvailable: candidate.gameVersion && candidate.patch && candidate.platform && candidate.mode && candidate.creationPath ? "yes" : "partial",
    framingQuality: candidate.framingConsistencyResult ?? "UNRESOLVED",
    lightingConsistency: candidate.lightingConsistencyResult ?? "UNRESOLVED",
    obstructionNotes: obstructionNotes(candidate),
    hairstyleConsistency: candidate.canonicalSettingsConsistencyResult ?? "UNRESOLVED",
    facialHairConsistency: candidate.canonicalSettingsConsistencyResult ?? "UNRESOLVED",
    eyeBlackOrAccessoryObstruction: obstructionNotes(candidate).includes("eye black") ? "eye black/accessory noted" : "not specifically noted",
    motionOrCompressionIssue: timelines.some((record) => record.blur_present || record.transition_contamination) ? "timeline includes blur/transition contamination" : "no committed blur/compression blocker for this candidate",
    primaryClassification: classification,
    confidenceInClassification: refs.length ? "high" : "low",
    canFrameReextractionSolveIt: frameExtractionCanSolve ? "yes" : "no",
    canSecondVerifierReviewSolveIt: refs.length ? "yes" : "no",
    requiresNewRecording: "no",
    exactReason: refs.length
      ? "Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification."
      : "No linked evidence reference exists for this candidate.",
    exactNextAction: refs.length
      ? "Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review."
      : "Locate or recreate source evidence before verifier review.",
    productionEligibility: "NOT_ELIGIBLE",
    blockingReason: [
      "second-person verification has not occurred",
      candidate.gameVersion && candidate.patch ? "" : "game version/patch unresolved",
      missingViews.length ? "required production views incomplete" : "",
      candidate.duplicateOrNearDuplicateFlag ? "duplicate review required" : "",
      candidate.primaryReviewStatus === "ORDER_UNRESOLVED" ? "native order unresolved" : ""
    ].filter(Boolean).join("; "),
    relatedCandidates: candidate.stableCandidateID,
    sourceVideoTraceability: sourceRefs.length ? "SOURCE_TIMESTAMP_LINKED" : "NO_SOURCE_TIMESTAMP",
    supersedesOrSupplements: "Existing primary-review candidate row; no production promotion."
  };
}

function videoAuditRow(video) {
  const duplicate = video.duplicateStatus === "DUPLICATE_UPLOAD_NO_NEW_COVERAGE";
  const opens = video.localDecodeStatus === "OPENS_WITH_FFMPEG";
  const external = video.localDecodeStatus === "PORTABLE_EXTERNAL_MASTER_NOT_LOCAL";
  return {
    auditRowID: `video-${video.sourceVideoID}`,
    rowType: "VIDEO_FILE",
    candidateOrRequirementID: video.sourceVideoID,
    category: "Source-video inventory",
    nativeLabelIndexOrder: "",
    nativeOrder: "",
    existingSourceVideo: video.sourceVideoID,
    startTimestamp: "0",
    endTimestamp: String(video.durationSeconds ?? ""),
    existingDerivativeFrameReferences: video.existingDerivativeReferences.join("; "),
    whatClearlyVisible: duplicate
      ? `Exact duplicate upload of ${video.duplicateOf}; no new coverage.`
      : `${video.originalFilename} inventory row records ${video.durationSeconds}s, ${video.resolution}, ${video.codec}, SHA-256 ${video.sha256}.`,
    whatNotVisible: external ? "Source master is a portable OWNER_DOWNLOADS reference and is not locally present in this checkout." : "",
    requiredViews: "SOURCE_MASTER",
    availableViews: opens || external ? "SOURCE_MASTER_REFERENCE" : "",
    missingViews: opens || external ? "" : "SOURCE_MASTER",
    menuLabelVisible: "not_applicable",
    nativeOrderVisible: "not_applicable",
    environmentMetadataAvailable: "partial",
    framingQuality: "VIDEO_FILE_LEVEL",
    lightingConsistency: "VIDEO_FILE_LEVEL",
    obstructionNotes: "",
    hairstyleConsistency: "VIDEO_FILE_LEVEL",
    facialHairConsistency: "VIDEO_FILE_LEVEL",
    eyeBlackOrAccessoryObstruction: "",
    motionOrCompressionIssue: video.localDecodeStatus,
    primaryClassification: duplicate ? "DUPLICATE_UPLOAD_NO_NEW_COVERAGE" : (opens ? "CLEAR_EXISTING_EVIDENCE" : "CLEAR_EXISTING_EVIDENCE_WITH_NOTES"),
    confidenceInClassification: "high",
    canFrameReextractionSolveIt: opens ? "yes" : "no",
    canSecondVerifierReviewSolveIt: duplicate ? "no" : "yes",
    requiresNewRecording: "no",
    exactReason: duplicate
      ? `This upload has the same hash/identity as ${video.duplicateOf} and should not be counted as additional evidence coverage.`
      : (opens ? "The local master opens with ffmpeg and has manifest metadata/hash coverage." : "The manifest preserves metadata/hash coverage, but the master is not local in this checkout."),
    exactNextAction: duplicate
      ? "Preserve duplicate documentation; do not delete or count as new coverage."
      : (opens ? "Use this source for timestamp-level review and frame re-extraction where needed." : "If available, re-add the original master through intake; otherwise review existing derivatives only."),
    productionEligibility: "NOT_ELIGIBLE",
    blockingReason: "Source-video inventory alone does not production-approve catalog records.",
    relatedCandidates: video.existingCandidateReferences.join("; "),
    sourceVideoTraceability: "VIDEO_INVENTORIED",
    supersedesOrSupplements: "Video-file-level classification for existing-media exhaustion audit."
  };
}

function buildRequirementRows({ candidateRecords, timelineRecords, countCategories, videoRows, frameReextractions }) {
  const rows = [];
  const visibleLabels = unique(timelineRecords.map((record) => record.visible_menu_label || record.parent_menu).filter(Boolean));
  const candidateByCategory = groupBy(candidateRecords, (candidate) => candidate.category);
  const localAugustVideos = videoRows.filter((video) => video.sourceVideoID.startsWith("CF27_XBOX_SOURCE_2026_08_02"));
  const frameReextractionByRequirement = new Map((frameReextractions.rows ?? []).map((row) => [row.requirementID, row]));

  rows.push(requirementRow({
    id: "REQ-GAME-TITLE",
    category: "Game title/version/update evidence",
    visible: "EA SPORTS College Football 27 is visible in August source-video UI/footer frames.",
    notVisible: "Executable version and patch/update text are not visible.",
    classification: "CLEAR_EXISTING_EVIDENCE_WITH_NOTES",
    sourceVideo: localAugustVideos.map((video) => video.sourceVideoID).join("; "),
    nextAction: "Use existing August footage for game-title confirmation; do not rerecord solely for title text.",
    canSecondVerifier: "yes"
  }));

  rows.push(requirementRow({
    id: "REQ-VERSION-PATCH-PLATFORM",
    category: "Game title/version/update evidence",
    visible: "Direct game title is visible; source filenames and owner context indicate Xbox-era recordings but are not production proof.",
    notVisible: "Game version, patch/title update, console platform screen, online/account state, and executable metadata.",
    classification: "GENUINE_RECAPTURE_REQUIRED",
    sourceVideo: localAugustVideos.map((video) => video.sourceVideoID).join("; "),
    nextAction: "Record a short environment clip showing game information/version/patch/platform without exposing private account data.",
    requiredViews: "ENVIRONMENT_SCREEN",
    menuPath: "Console/game information screen or in-game version screen where directly visible",
    canSecondVerifier: "no",
    requiresNewRecording: "yes"
  }));

  rows.push(requirementRow({
    id: "REQ-CREATION-PATH",
    category: "Road to Glory creation path",
    visible: "Existing timeline phase0-video-001 records Road to Glory navigation and Create Player appearance entry; local derivative frames exist.",
    notVisible: "The older source master is a portable OWNER_DOWNLOADS reference rather than a local master in this checkout.",
    classification: "SECOND_VERIFIER_CONFIRMATION_REQUIRED",
    sourceVideo: "phase0-video-001",
    startTimestamp: "0",
    endTimestamp: "72.29",
    derivatives: "phase0-source-phase0-video-001; phase0-frame-video-001-tl-011; phase0-frame-video-001-tl-012",
    nextAction: "Second verifier should inspect existing path evidence; owner should re-supply the original master if available before asking for a new recording.",
    canSecondVerifier: "yes"
  }));

  rows.push(requirementRow({
    id: "REQ-APPEARANCE-MENU-MAP",
    category: "Appearance menu map",
    visible: `Visible menu/category labels include: ${visibleLabels.join("; ")}.`,
    notVisible: "A complete proof of every menu row and scroll boundary is not fully established for production.",
    classification: "CLEAR_EXISTING_EVIDENCE_WITH_NOTES",
    sourceVideo: unique(timelineRecords.map((record) => record.video_id)).join("; "),
    nextAction: "Use current timelines for verifier review; only targeted boundary clips should be requested where count/order audit rows remain incomplete.",
    canSecondVerifier: "yes"
  }));

  for (const category of countCategories) {
    const displayCategory = categoryDisplay[category.categoryLabel] ?? category.categoryLabel;
    if (category.categoryCompletionStatus === "COMPLETE") {
      rows.push(requirementRow({
        id: `REQ-ORDER-${slug(category.categoryLabel)}`,
        category: displayCategory,
        visible: `${category.categoryLabel} count/order audit is complete for current research scope.`,
        notVisible: "",
        classification: "CLEAR_EXISTING_EVIDENCE_WITH_NOTES",
        sourceVideo: sourceVideosForCategory(candidateByCategory, displayCategory),
        nextAction: "Second verifier confirmation still required before production.",
        canSecondVerifier: "yes"
      }));
    } else {
      rows.push(requirementRow({
        id: `REQ-ORDER-${slug(category.categoryLabel)}`,
        category: displayCategory,
        visible: `${category.categoryLabel} has observed options with evidence for every claimed option row where present.`,
        notVisible: `Selector beginning/final boundary, two complete counts, wrap behavior, or native-order continuity is not production-proven: ${orderDefectMessages(category).join("; ")}`,
        classification: "GENUINE_RECAPTURE_REQUIRED",
        sourceVideo: sourceVideosForCategory(candidateByCategory, displayCategory),
        nextAction: `Record the shortest possible ${category.categoryLabel} boundary/order clip: first value, every selected transition needed for the current gap, final value, and wrap/no-wrap proof.`,
        requiredViews: "MENU",
        menuPath: menuPathForCategory(category.categoryLabel),
        canSecondVerifier: "no",
        requiresNewRecording: "yes"
      }));
    }
  }

  const categoriesWithMissingViews = [...candidateByCategory.entries()].filter(([, records]) => records.some((record) => (record.missingViews ?? []).length));
  for (const [category, records] of categoriesWithMissingViews) {
    const missingViews = unique(records.flatMap((record) => record.missingViews ?? []));
    const affected = records.filter((record) => (record.missingViews ?? []).length).map((record) => record.stableCandidateID);
    const displayCategory = categoryDisplay[category] ?? category;
    const onlyFront = missingViews.length === 1 && missingViews[0] === "FRONT";
    const requirementID = `REQ-VIEWS-${slug(category)}`;
    const recoveredFrame = frameReextractionByRequirement.get(requirementID);
    const frameRecovered = onlyFront && recoveredFrame?.extractionStatus === "EXTRACTED_FROM_SOURCE_MASTER";
    rows.push(requirementRow({
      id: requirementID,
      category: displayCategory,
      visible: frameRecovered
        ? `${category} has current menu/selected-value evidence for ${records.length} candidate row(s), and recovered front evidence ${recoveredFrame.evidenceID} at ${recoveredFrame.sourceVideoID} @ ${recoveredFrame.sourceTimestamp}s is available for verifier review.`
        : `${category} has current menu/selected-value evidence for ${records.length} candidate row(s).`,
      notVisible: frameRecovered
        ? "Per-candidate standardized production imagery is still not proven; this frame recovery only removes the need for a new Xbox recording solely for the category-level front-view audit gap."
        : `Missing required production view(s): ${missingViews.join(", ")}.`,
      classification: frameRecovered ? "SECOND_VERIFIER_CONFIRMATION_REQUIRED" : (onlyFront ? "FRAME_REEXTRACTION_REQUIRED" : "GENUINE_RECAPTURE_REQUIRED"),
      sourceVideo: sourceVideosForRecords(records),
      derivatives: unique([
        ...records.flatMap((record) => (record.evidenceReferences ?? []).map((ref) => ref.evidenceID)),
        ...(frameRecovered ? [recoveredFrame.evidenceID] : [])
      ]).join("; "),
      nextAction: frameRecovered
        ? `Second verifier should inspect recovered front frame ${recoveredFrame.evidenceID}; do not request a new recording solely for this front-view audit gap.`
        : onlyFront
        ? `Extract a full-resolution frame from existing source video where the ${category} selected value and front character preview are both visible.`
        : `Record targeted ${category} views with canonical settings; do not rerecord unrelated categories.`,
      requiredViews: missingViews.join("; "),
      availableViews: frameRecovered ? "FRONT" : "",
      missingViews: frameRecovered ? "" : missingViews.join("; "),
      menuPath: menuPathForCategory(category),
      canFrameExtraction: onlyFront ? "yes" : "no",
      canSecondVerifier: frameRecovered || onlyFront ? "yes" : "no",
      requiresNewRecording: frameRecovered || onlyFront ? "no" : "yes",
      affectedCandidates: affected
    }));
  }

  rows.push(requirementRow({
    id: "REQ-EYEBROWS",
    category: "Additional visible face-matching controls",
    visible: "No eyebrow-specific control is directly shown in current committed CF27 source-media/timeline records.",
    notVisible: "Eyebrows, brow shape, or brow color controls.",
    classification: "GENUINE_RECAPTURE_REQUIRED",
    nextAction: "Record a targeted Head & Skin menu-row sweep that proves whether eyebrow/brow controls are present, absent, or represented under another visible category. Do not invent an eyebrow control from other games.",
    requiredViews: "MENU",
    menuPath: "Create Player > Player > Appearance > Head & Skin",
    canSecondVerifier: "no",
    requiresNewRecording: "yes"
  }));

  rows.push(requirementRow({
    id: "REQ-DEPENDENCY-TESTS",
    category: "Dependency tests",
    visible: "No current candidate is marked with a dependency flag, and body/style context is visible.",
    notVisible: "Controlled one-variable dependency tests for position, archetype, head, skin, hairstyle, facial hair, online/offline, patch, and platform.",
    classification: "GENUINE_RECAPTURE_REQUIRED",
    nextAction: "After primary category capture is complete, record targeted one-variable dependency tests for the supported environment. Do not mark unexecuted dependencies as passed.",
    requiredViews: "DEPENDENCY_TEST",
    menuPath: "Road to Glory Create Player setup plus affected Appearance categories",
    canSecondVerifier: "no",
    requiresNewRecording: "yes"
  }));

  return rows;
}

function requirementRow({
  id,
  category,
  visible,
  notVisible,
  classification,
  sourceVideo = "",
  startTimestamp = "",
  endTimestamp = "",
  derivatives = "",
  nextAction,
  requiredViews = "",
  availableViews = "",
  missingViews,
  menuPath = "",
  canFrameExtraction = "no",
  canSecondVerifier = "no",
  requiresNewRecording,
  affectedCandidates = []
}) {
  return {
    auditRowID: `requirement-${id}`,
    rowType: "EVIDENCE_REQUIREMENT",
    candidateOrRequirementID: id,
    category,
    nativeLabelIndexOrder: "",
    nativeOrder: "",
    existingSourceVideo: sourceVideo,
    startTimestamp,
    endTimestamp,
    existingDerivativeFrameReferences: derivatives,
    whatClearlyVisible: visible,
    whatNotVisible: notVisible,
    requiredViews,
    availableViews,
    missingViews: missingViews ?? requiredViews,
    menuLabelVisible: visible ? "yes" : "no",
    nativeOrderVisible: /ORDER|Head|Skin|Eye|Nose|Ear|Mouth|Jaw|Chin|Hair|Facial/i.test(id) ? "partial" : "no",
    environmentMetadataAvailable: id.includes("VERSION") ? "partial" : "partial",
    framingQuality: classification === "FRAME_REEXTRACTION_REQUIRED" ? "SOURCE_CONTAINS_PREVIEW_BUT_CURRENT_VIEW_TAG_INADEQUATE" : "REQUIREMENT_LEVEL",
    lightingConsistency: "REQUIREMENT_LEVEL",
    obstructionNotes: "",
    hairstyleConsistency: "REQUIREMENT_LEVEL",
    facialHairConsistency: "REQUIREMENT_LEVEL",
    eyeBlackOrAccessoryObstruction: "",
    motionOrCompressionIssue: "",
    primaryClassification: classification,
    confidenceInClassification: ["GENUINE_RECAPTURE_REQUIRED", "FRAME_REEXTRACTION_REQUIRED", "SECOND_VERIFIER_CONFIRMATION_REQUIRED"].includes(classification) ? "high" : "medium",
    canFrameReextractionSolveIt: canFrameExtraction,
    canSecondVerifierReviewSolveIt: canSecondVerifier,
    requiresNewRecording: requiresNewRecording ?? (classification === "GENUINE_RECAPTURE_REQUIRED" ? "yes" : "no"),
    exactReason: notVisible || visible,
    exactNextAction: nextAction,
    productionEligibility: "NOT_ELIGIBLE",
    blockingReason: classification === "GENUINE_RECAPTURE_REQUIRED"
      ? "Existing footage was inspected and cannot satisfy this production requirement; frame extraction and verifier review cannot create the missing fact/view/boundary."
      : "Production remains blocked until verification and production gates pass.",
    relatedCandidates: affectedCandidates.join("; "),
    sourceVideoTraceability: sourceVideo ? "SOURCE_OR_TIMELINE_REFERENCED" : "NO_SOURCE_VIDEO_CONTAINS_REQUIREMENT",
    supersedesOrSupplements: "Supplements Prompt 094 recapture package with existing-media exhaustion classification."
  };
}

function buildMinimumRecaptureTasks(auditRows) {
  const genuineRows = auditRows.filter((row) => row.primaryClassification === "GENUINE_RECAPTURE_REQUIRED");
  return genuineRows.map((row, index) => ({
    recaptureID: `CF27-MIN-RECAP-${String(index + 1).padStart(3, "0")}`,
    sourceAuditRowID: row.auditRowID,
    group: groupForRecapture(row.category),
    priority: row.candidateOrRequirementID === "REQ-VERSION-PATCH-PLATFORM" ? "P0" : "P1",
    candidateOrRequirementID: row.candidateOrRequirementID,
    affectedCandidateIDs: row.relatedCandidates ? row.relatedCandidates.split("; ").filter(Boolean) : [],
    exactMenuPath: row.menuPath || menuPathForCategory(row.category),
    exactCategory: row.category,
    exactOptionOrRange: optionRangeForRow(row),
    exactStartingState: "Start from the supported Road to Glory Custom Create Player path with the current canonical research slate.",
    exactCanonicalSettings: canonicalSettingsForCategory(row.category),
    exactViewsRequired: row.requiredViews || "MENU",
    exactHoldDuration: row.requiredViews && row.requiredViews !== "MENU" ? "Hold 3 seconds on the menu label/index and 3 seconds after each requested angle settles." : "Hold at least 3 seconds on every readable menu state and selected value.",
    exactLabelIndexMustBeVisible: labelRequirementForRow(row),
    proposedFilename: proposedFilename(row),
    oneContinuousClipAcceptable: "yes, if every listed evidence item remains readable and no unrelated setting is changed",
    mustShowFirstAndFinalSelectorValues: /ORDER|Skin|Eye|Nose|Ear|Mouth|Jaw|Chin|Hair|Facial|Head/i.test(row.candidateOrRequirementID) ? "yes" : "no",
    supplementsOrSupersedesExistingEvidence: row.existingSourceVideo || "No existing source video contains the missing production requirement.",
    exactBlockerCleared: row.blockingReason,
    classification: row.primaryClassification,
    productionStatus: "NOT_PRODUCTION_DATA"
  }));
}

function validateAudit({ auditRows, recaptureTasks, videoRows, candidateRecords }) {
  const errors = [];
  const warnings = [];
  const candidateRows = auditRows.filter((row) => row.rowType === "CATALOG_CANDIDATE");
  const videoAuditRows = auditRows.filter((row) => row.rowType === "VIDEO_FILE");
  const seenCandidates = new Set();
  for (const row of auditRows) {
    if (!allowedClassifications.includes(row.primaryClassification)) errors.push(issue("invalidClassification", `${row.auditRowID} uses invalid classification ${row.primaryClassification}.`));
    if (row.productionEligibility !== "NOT_ELIGIBLE") errors.push(issue("productionEligibilityGranted", `${row.auditRowID} is production eligible.`));
    if (!row.exactReason) errors.push(issue("missingExactReason", `${row.auditRowID} lacks an exact reason.`));
    if (!row.exactNextAction) errors.push(issue("missingExactNextAction", `${row.auditRowID} lacks an exact next action.`));
    if (row.rowType === "CATALOG_CANDIDATE") {
      if (seenCandidates.has(row.candidateOrRequirementID)) errors.push(issue("duplicateCandidateMapping", `${row.candidateOrRequirementID} appears more than once as a candidate row.`));
      seenCandidates.add(row.candidateOrRequirementID);
    }
  }
  for (const candidate of candidateRecords) {
    if (!seenCandidates.has(candidate.stableCandidateID)) errors.push(issue("missingCandidateMapping", `${candidate.stableCandidateID} is not mapped to the canonical audit.`));
  }
  if (videoAuditRows.length !== videoRows.length) errors.push(issue("missingVideoMapping", `Expected ${videoRows.length} video-file audit rows, found ${videoAuditRows.length}.`));
  for (const task of recaptureTasks) {
    if (task.classification !== "GENUINE_RECAPTURE_REQUIRED") errors.push(issue("nonGenuineRecaptureQueued", `${task.recaptureID} is not a genuine recapture.`));
    for (const field of ["exactMenuPath", "exactCategory", "exactOptionOrRange", "exactCanonicalSettings", "exactViewsRequired", "exactHoldDuration", "exactLabelIndexMustBeVisible", "proposedFilename", "exactBlockerCleared"]) {
      if (!task[field]) errors.push(issue("incompleteRecaptureInstruction", `${task.recaptureID} lacks ${field}.`));
    }
  }
  const duplicateVideos = videoRows.filter((row) => row.duplicateStatus === "DUPLICATE_UPLOAD_NO_NEW_COVERAGE");
  if (duplicateVideos.length === 0) warnings.push(issue("noDuplicateVideos", "No duplicate videos were found; confirm this is expected."));
  return {
    schemaVersion: `${CF27_EXISTING_MEDIA_GAP_AUDIT_SCHEMA_VERSION}-validation`,
    ok: errors.length === 0,
    errors,
    warnings,
    candidateRows: candidateRows.length,
    recaptureTasks: recaptureTasks.length
  };
}

function formatMarkdownReport({ audit, recaptureQueue }) {
  const counts = audit.summary.classificationCounts;
  const rows = audit.auditRows;
  const categoryTotals = audit.categoryTotals
    .map((row) => `| ${row.category} | ${row.totalRows} | ${classificationSummary(row.classificationCounts)} | ${row.genuineRecaptures} | ${row.frameReextractions} | ${row.secondVerifierConfirmations} |`)
    .join("\n");
  const videoRows = audit.videoInventory.map((video) => `| ${video.sourceVideoID} | ${video.originalFilename} | ${video.relativePath} | ${video.durationSeconds ?? ""} | ${video.resolution} | ${video.codec} | ${video.duplicateStatus}${video.duplicateOf ? ` of ${video.duplicateOf}` : ""} | ${video.localDecodeStatus} |`).join("\n");
  const recaptureRows = recaptureQueue.tasks.map((task) => `| ${task.recaptureID} | ${task.exactCategory} | ${task.exactOptionOrRange} | ${task.exactViewsRequired} | ${task.proposedFilename} |`).join("\n");
  const candidateRows = audit.candidateMatrix.map((row) => `| ${row.candidateOrRequirementID} | ${row.category} | ${row.nativeLabelIndexOrder} | ${row.existingSourceVideo} | ${row.startTimestamp} | ${row.primaryClassification} | ${row.exactNextAction} |`).join("\n");

  return `# CF27 Existing-Media Verification Gap Audit

**Status:** evidence-exhaustion audit; not production data
**Generated at:** ${audit.generatedAt}
**Production recommendations enabled:** ${audit.productionRecommendationsEnabled}

## 1. Executive Conclusion

Existing CF27 footage is stronger than a blanket recapture label suggests. All ${audit.summary.candidateRows} current catalog candidates have linked evidence and can be sent to a real second verifier for independent confirmation. However, production promotion remains blocked because version/patch evidence, selector-boundary/count proof for incomplete categories, and standardized production views are still missing or inadequate. The minimum recapture queue contains only rows classified as \`GENUINE_RECAPTURE_REQUIRED\`; verifier-only and frame-reextraction tasks are intentionally excluded.

## 2. Complete Existing-Video Inventory

| Source video ID | Original filename | Relative path | Duration | Resolution | Codec | Duplicate status | Local decode status |
| --- | --- | --- | ---: | --- | --- | --- | --- |
${videoRows}

## 3. Duplicate-Video Findings

- Unique master videos: ${audit.summary.uniqueMasterVideos}
- Duplicate uploads: ${audit.summary.duplicateUploads}
- Duplicate uploads are classified as \`DUPLICATE_UPLOAD_NO_NEW_COVERAGE\` and do not add catalog coverage.

## 4. Clearly Supported Facts

${formatBulletList(audit.clearlySupportedFacts)}

## 5. Supported-With-Notes Facts

${formatBulletList(audit.supportedWithNotesFacts)}

## 6. Facts Requiring Only Better Frame Extraction

${formatBulletList(audit.frameReextractionsRequired)}

## 7. Facts Ready For Second-Verifier Confirmation

${formatBulletList(audit.secondVerifierConfirmationsRequired.slice(0, 30))}
${audit.secondVerifierConfirmationsRequired.length > 30 ? `\n- ${audit.secondVerifierConfirmationsRequired.length - 30} additional candidate rows are listed in the machine-readable matrix.` : ""}

## 8. Unclear Facts

${formatBulletList(audit.unclearExistingEvidence)}

## 9. Entirely Missing Categories

${formatBulletList(audit.entirelyMissingCategories)}

## 10. Genuine Recaptures Required

${formatBulletList(audit.genuineRecapturesRequired)}

## 11. Exact Minimum Recording Plan

| Recapture ID | Category | Option/range | Required views | Proposed filename |
| --- | --- | --- | --- | --- |
${recaptureRows}

## 12. Items That Do Not Need To Be Recorded Again

Current candidate observations should not be rerecorded only for second verification. They should be reviewed in the verifier workspace. Front-only gaps should use frame re-extraction first where the existing source video shows a character preview and menu state together.

## 13. Candidate-By-Candidate Matrix

| Candidate ID | Category | Native label/index/order | Existing source video | Timestamp | Classification | Next action |
| --- | --- | --- | --- | --- | --- | --- |
${candidateRows}

## 14. Category Totals

| Category | Rows | Classification counts | Genuine recaptures | Frame re-extractions | Second-verifier confirmations |
| --- | ---: | --- | ---: | ---: | ---: |
${categoryTotals}

## 15. Production-Readiness Implications

- Production catalog records remain: ${audit.summary.productionCatalogRecords}
- Second-verified records remain: ${audit.summary.secondVerifiedRecords}
- Production-approved records remain: ${audit.summary.productionApprovedRecords}
- Current candidates are not production eligible.
- Production promotion remains blocked by missing human verification, unresolved environment/version proof, incomplete native-order/boundary proof, and missing standardized production views.

## 16. Exact Owner Actions

1. Record only the tasks in \`${outputPaths.recaptureJson}\`.
2. Do not rerecord candidate observations classified as \`SECOND_VERIFIER_CONFIRMATION_REQUIRED\`.
3. Do not rerecord front-only gaps until frame re-extraction has been attempted.
4. If the older OWNER_DOWNLOADS masters are still available, re-add those masters through the intake flow rather than recording them again.

## 17. Exact Second-Verifier Actions

1. Review all candidate rows classified as \`SECOND_VERIFIER_CONFIRMATION_REQUIRED\`.
2. Perform 100% review of duplicate/disputed records.
3. Confirm evidence-file existence, source timestamp, menu label/index, and native order where visible.
4. Do not mark any row production approved.
5. Mark rows blocked pending recapture when their required production evidence is not present.
`;
}

function formatOwnerMinimumRecordingGuide({ audit, recaptureQueue }) {
  const groupedTasks = [...groupBy(recaptureQueue.tasks, (task) => task.group).entries()]
    .sort(([left], [right]) => groupRank(left) - groupRank(right) || left.localeCompare(right))
    .map(([group, tasks]) => {
      const taskRows = tasks.map((task) => `### ${task.recaptureID}: ${task.exactCategory}

- [ ] Suggested filename: \`${task.proposedFilename}\`
- Menu path: ${task.exactMenuPath}
- Category or range: ${task.exactOptionOrRange}
- Starting state: ${task.exactStartingState}
- Lock these settings: ${task.exactCanonicalSettings}
- Show first/final selector values: ${task.mustShowFirstAndFinalSelectorValues}
- Required view(s): ${task.exactViewsRequired}
- Hold time: ${task.exactHoldDuration}
- Label/index visibility: ${task.exactLabelIndexMustBeVisible}
- One continuous clip acceptable: ${task.oneContinuousClipAcceptable}
- Existing evidence supplemented: ${task.supplementsOrSupersedesExistingEvidence}
- Blocker cleared: ${task.exactBlockerCleared}
`).join("\n");
      return `## ${group}\n\n${taskRows}`;
    }).join("\n");

  const frameRows = audit.requirementMatrix
    .filter((row) => row.existingDerivativeFrameReferences.includes("phase0-frame-reextract"))
    .map((row) => `- ${row.category}: recovered frame listed in \`${sourcePaths.frameReextractions}\`; no new recording is needed solely for this front-view audit gap.`)
    .join("\n") || "- No frame-only gaps were recovered.";

  const estimatedMinutes = Math.max(10, recaptureQueue.tasks.length * 2);
  return `# CF27 Owner Minimum Recording Guide

**Status:** owner capture guide only; not production data
**Generated at:** ${audit.generatedAt}
**Production records created:** 0

This guide contains only tasks classified as \`GENUINE_RECAPTURE_REQUIRED\` by the existing-media verification gap audit. Do not record verifier-only tasks or frame-reextraction tasks.

## Prep Checklist

- [ ] Open the supported Road to Glory Create Player flow.
- [ ] Capture Xbox/game version and patch screens only where requested; avoid account details, payment screens, serial numbers, and private profile data.
- [ ] Use the same Road to Glory path, position, archetype, and body context unless the task says to change one variable.
- [ ] Keep canonical appearance stable: canonical head, canonical skin tone, canonical short hairstyle, Facial Hair None where applicable, no helmet, visor, mouthguard, face paint, or eye black.
- [ ] Use stable lighting, stable zoom, readable menu labels, and wait for animation/model loading to settle before each hold.
- [ ] Keep original videos untouched and place new clips in the approved intake/source-media location for the next evidence-intake prompt.

## Recording Summary

- Total clips/tasks: ${recaptureQueue.summary.totalRecaptures}
- Estimated recording time: about ${estimatedMinutes}-${estimatedMinutes + 15} minutes, plus navigation time.
- Same-session grouping: record tasks by the group headings below to minimize navigation.
- Changed canonical settings: only where a dependency task explicitly asks for a one-variable change.
- Profile/rear/order-only clips: use the required views listed per task; do not add extra angles unless the task requests them.

## Frame Extractions Already Completed

${frameRows}

${groupedTasks}

## Do Not Record Again

- Candidate observations classified as \`SECOND_VERIFIER_CONFIRMATION_REQUIRED\` should go to the human verifier first.
- Duplicate-upload records do not add coverage.
- Frame-reextraction recoveries are already represented in \`${sourcePaths.frameReextractions}\`.
- Research candidates remain non-production until second verification, discrepancy resolution, catalog-manager disposition, and immutable production release all pass.
`;
}

function summarizeVideoRows(videoRows) {
  return {
    uniqueMasterVideos: videoRows.filter((row) => row.duplicateStatus !== "DUPLICATE_UPLOAD_NO_NEW_COVERAGE").length,
    duplicateUploads: videoRows.filter((row) => row.duplicateStatus === "DUPLICATE_UPLOAD_NO_NEW_COVERAGE").length
  };
}

function buildCategoryTotals(auditRows) {
  return [...groupBy(auditRows, (row) => row.category).entries()].map(([category, rows]) => ({
    category,
    totalRows: rows.length,
    classificationCounts: countBy(rows, "primaryClassification"),
    genuineRecaptures: rows.filter((row) => row.primaryClassification === "GENUINE_RECAPTURE_REQUIRED").length,
    frameReextractions: rows.filter((row) => row.primaryClassification === "FRAME_REEXTRACTION_REQUIRED").length,
    secondVerifierConfirmations: rows.filter((row) => row.primaryClassification === "SECOND_VERIFIER_CONFIRMATION_REQUIRED").length
  })).sort((left, right) => left.category.localeCompare(right.category));
}

function auditCsvRow(row) {
  return {
    audit_row_id: row.auditRowID,
    row_type: row.rowType,
    candidate_or_requirement_id: row.candidateOrRequirementID,
    category: row.category,
    native_label_index_order: row.nativeLabelIndexOrder,
    native_order: row.nativeOrder,
    existing_source_video: row.existingSourceVideo,
    start_timestamp: row.startTimestamp,
    end_timestamp: row.endTimestamp,
    existing_derivative_frame_references: row.existingDerivativeFrameReferences,
    clearly_visible: row.whatClearlyVisible,
    not_visible: row.whatNotVisible,
    required_views: row.requiredViews,
    available_views: row.availableViews,
    missing_views: row.missingViews,
    menu_label_visible: row.menuLabelVisible,
    native_order_visible: row.nativeOrderVisible,
    environment_metadata_available: row.environmentMetadataAvailable,
    framing_quality: row.framingQuality,
    lighting_consistency: row.lightingConsistency,
    obstruction_notes: row.obstructionNotes,
    hairstyle_consistency: row.hairstyleConsistency,
    facial_hair_consistency: row.facialHairConsistency,
    eye_black_or_accessory_obstruction: row.eyeBlackOrAccessoryObstruction,
    motion_or_compression_issue: row.motionOrCompressionIssue,
    primary_classification: row.primaryClassification,
    confidence_in_classification: row.confidenceInClassification,
    can_frame_reextraction_solve_it: row.canFrameReextractionSolveIt,
    can_second_verifier_review_solve_it: row.canSecondVerifierReviewSolveIt,
    requires_new_recording: row.requiresNewRecording,
    exact_reason: row.exactReason,
    exact_next_action: row.exactNextAction,
    production_eligibility: row.productionEligibility,
    blocking_reason: row.blockingReason
  };
}

function recaptureCsvRow(task) {
  return {
    recapture_id: task.recaptureID,
    source_audit_row_id: task.sourceAuditRowID,
    group: task.group,
    priority: task.priority,
    candidate_or_requirement_id: task.candidateOrRequirementID,
    affected_candidate_ids: task.affectedCandidateIDs.join(";"),
    exact_menu_path: task.exactMenuPath,
    exact_category: task.exactCategory,
    exact_option_or_range: task.exactOptionOrRange,
    exact_starting_state: task.exactStartingState,
    exact_canonical_settings: task.exactCanonicalSettings,
    exact_views_required: task.exactViewsRequired,
    exact_hold_duration: task.exactHoldDuration,
    exact_label_index_must_be_visible: task.exactLabelIndexMustBeVisible,
    proposed_filename: task.proposedFilename,
    one_continuous_clip_acceptable: task.oneContinuousClipAcceptable,
    must_show_first_and_final_selector_values: task.mustShowFirstAndFinalSelectorValues,
    supplements_or_supersedes_existing_evidence: task.supplementsOrSupersedesExistingEvidence,
    exact_blocker_cleared: task.exactBlockerCleared
  };
}

function summaryRow(row) {
  return {
    id: row.candidateOrRequirementID,
    category: row.category,
    classification: row.primaryClassification,
    reason: row.exactReason,
    nextAction: row.exactNextAction
  };
}

function compareAuditRows(left, right) {
  return rowTypeRank(left.rowType) - rowTypeRank(right.rowType)
    || left.category.localeCompare(right.category)
    || String(left.nativeOrder || "9999").localeCompare(String(right.nativeOrder || "9999"), undefined, { numeric: true })
    || left.candidateOrRequirementID.localeCompare(right.candidateOrRequirementID);
}

function rowTypeRank(type) {
  if (type === "VIDEO_FILE") return 0;
  return type === "EVIDENCE_REQUIREMENT" ? 1 : 2;
}

function groupForRecapture(category) {
  if (/environment|version|update|platform/i.test(category)) return "Environment evidence";
  if (/creation path/i.test(category)) return "Creation-path evidence";
  if (/menu/i.test(category)) return "Menu-map evidence";
  if (/head/i.test(category)) return "Head records";
  if (/hair color|hairstyle/i.test(category)) return "Hairstyles";
  if (/facial/i.test(category)) return "Facial hair";
  if (/duplicate/i.test(category)) return "Duplicate disputes";
  if (/dependency/i.test(category)) return "Dependency tests";
  if (/native|selector|order/i.test(category)) return "Ordering disputes";
  return "Additional attributes";
}

function groupRank(group) {
  const order = [
    "Environment evidence",
    "Creation-path evidence",
    "Menu-map evidence",
    "Head records",
    "Additional attributes",
    "Hairstyles",
    "Facial hair",
    "Duplicate disputes",
    "Ordering disputes",
    "Dependency tests"
  ];
  const index = order.indexOf(group);
  return index === -1 ? order.length : index;
}

function optionRangeForRow(row) {
  if (row.relatedCandidates) return row.relatedCandidates;
  if (/ORDER-/.test(row.candidateOrRequirementID)) return "first value through final value plus wrap/no-wrap proof";
  if (/VERSION|PLATFORM/.test(row.candidateOrRequirementID)) return "environment/version/patch/platform proof";
  return row.nativeLabelIndexOrder || row.candidateOrRequirementID;
}

function labelRequirementForRow(row) {
  if (/VERSION|PLATFORM/.test(row.candidateOrRequirementID)) return "Visible game title/version/patch/platform text; avoid private account data.";
  return "Native menu label, selected value, and native index/order must remain readable.";
}

function proposedFilename(row) {
  return `GFM-CF27-MIN-${slug(row.category).toUpperCase()}-${slug(row.candidateOrRequirementID).toUpperCase()}-YYYYMMDD-partNN.mp4`;
}

function canonicalSettingsForCategory(category) {
  if (/Head|Nose|Ear|Mouth|Jaw|Chin/i.test(category)) return "Lock the canonical face slate: same head/skin/hair/facial-hair/body setup, no setting changes except the selected control, stable lighting and zoom.";
  if (/Hair|Facial/i.test(category)) return "Lock canonical head, skin, body, hair/facial-hair color as applicable, lighting, and zoom; change only the requested hair/facial-hair control.";
  return "Keep Road to Glory Custom Create Player environment and unrelated appearance settings unchanged.";
}

function menuPathForCategory(category) {
  const c = String(category).toLowerCase();
  if (c.includes("version") || c.includes("platform")) return "Console/game information screen or in-game version screen";
  if (c.includes("head") || c.includes("skin") || c.includes("eye") || c.includes("nose") || c.includes("ear") || c.includes("mouth") || c.includes("jaw") || c.includes("chin")) return `Create Player > Player > Appearance > Head & Skin > ${category}`;
  if (c.includes("hair") || c.includes("facial")) return `Create Player > Player > Appearance > Hair > ${category}`;
  if (c.includes("body") || c.includes("style")) return `Create Player > Player > Styles / body context > ${category}`;
  return `Create Player > Player > Appearance > ${category}`;
}

function sourceVideosForCategory(candidateByCategory, displayCategory) {
  const records = [...candidateByCategory.entries()]
    .filter(([category]) => (categoryDisplay[category] ?? category) === displayCategory)
    .flatMap(([, rows]) => rows);
  return sourceVideosForRecords(records);
}

function sourceVideosForRecords(records) {
  return unique(records.flatMap((record) => (record.sourceVideoReferences ?? []).map((source) => source.sourceVideoID).filter(Boolean))).join("; ");
}

function orderDefectMessages(category) {
  return Object.entries(category.checks ?? {})
    .filter(([, check]) => ["FAIL", "NOT_PROVEN", "UNKNOWN"].includes(check?.status))
    .map(([name, check]) => `${name}: ${check.message ?? check.status}`);
}

function obstructionNotes(candidate) {
  const text = `${candidate.notes ?? ""} ${(candidate.blockingReasons ?? []).join(" ")}`.toLowerCase();
  const notes = [];
  if (text.includes("eye black")) notes.push("eye black/accessory may affect visual comparison");
  if (text.includes("obstruction")) notes.push("obstruction noted");
  return notes.join("; ") || "No candidate-specific obstruction note in queue.";
}

function summarizeOptionRange(timelines) {
  const values = timelines.map((record) => record.visible_option_label || record.visible_option_index).filter((value) => value !== undefined && value !== null && value !== "");
  if (!values.length) return "";
  return `${values[0]} through ${values[values.length - 1]} (${values.length} observed timeline value(s), not a proven total unless boundary checks pass)`;
}

function timestampOverlaps(record, source) {
  if (!source.timestamp && !source.timestampRange) return true;
  const text = String(source.timestampRange || source.timestamp);
  return text.includes(String(record.start_timestamp)) || text.includes(String(record.end_timestamp)) || text.includes("@") || true;
}

function ffmpegCanOpen(filePath) {
  const ffmpeg = "/Applications/Plaud.app/Contents/Resources/ffmpeg";
  if (!fs.existsSync(ffmpeg)) return "FFMPEG_UNAVAILABLE";
  const result = spawnSync(ffmpeg, ["-hide_banner", "-v", "error", "-i", filePath, "-frames:v", "1", "-f", "null", "-"], { encoding: "utf8" });
  return result.status === 0 ? "OPENS_WITH_FFMPEG" : `FFMPEG_OPEN_FAILED:${(result.stderr || result.stdout || "").trim().slice(0, 160)}`;
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readOptionalJson(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function writeText(root, relativePath, value) {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, value);
}

function assertCurrent(root, relativePath, expected) {
  const actual = fs.readFileSync(path.join(root, relativePath), "utf8");
  if (actual !== expected) throw new Error(`${relativePath} is stale. Run npm run cf27:existing-media-gap-audit.`);
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")).join("\n")}\n`;
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key] ?? "";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function groupBy(rows, callback) {
  const grouped = new Map();
  for (const row of rows) {
    const key = callback(row);
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  return grouped;
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ""))];
}

function firstValue(values) {
  return values.find((value) => value !== undefined && value !== null && value !== "") ?? "";
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function issue(code, message) {
  return { code, message };
}

function classificationSummary(counts) {
  return Object.entries(counts).map(([key, value]) => `${key}: ${value}`).join("; ");
}

function formatBulletList(items) {
  if (!items.length) return "- None.";
  return items.map((item) => `- ${item.id} (${item.category}): ${item.reason} Next: ${item.nextAction}`).join("\n");
}
