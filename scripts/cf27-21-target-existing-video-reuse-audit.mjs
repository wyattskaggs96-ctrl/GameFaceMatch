#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_21_TARGET_REUSE_AUDIT_SCHEMA_VERSION = "cf27-21-target-existing-video-reuse-audit-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAt = "2026-08-02T23:35:00-04:00";

const outputPaths = {
  doc: "docs/status/CF27_21_TARGET_EXISTING_VIDEO_REUSE_AUDIT.md",
  auditJson: "data/phase-zero/cf27_21_target_existing_video_reuse_audit.json",
  auditCsv: "data/phase-zero/cf27_21_target_existing_video_reuse_audit.csv",
  coverageJson: "data/phase-zero/cf27_video_requirement_coverage_map.json",
  coverageCsv: "data/phase-zero/cf27_video_requirement_coverage_map.csv",
  restoreJson: "data/phase-zero/cf27_existing_master_restore_queue.json",
  restoreCsv: "data/phase-zero/cf27_existing_master_restore_queue.csv"
};

const sourcePaths = {
  videoInventory: "data/phase-zero/video_inventory.json",
  timeline: "data/phase-zero/video_timeline.json",
  legacyTimeline: "data/research/cf27/video_timeline_index.json",
  existingMediaAudit: "data/phase-zero/cf27_existing_media_verification_gap_audit.json",
  minimumRecaptureQueue: "data/phase-zero/cf27_minimum_recapture_queue.json",
  frameReextractions: "data/phase-zero/cf27_frame_reextractions.json",
  productionCatalogManifest: "data/catalog/production/catalog_manifest.json"
};

const allowedClassifications = [
  "COMPLETE_FROM_EXISTING_VIDEO",
  "COMPLETE_FROM_EXISTING_VIDEO_WITH_NOTES",
  "COMPLETE_FROM_COMBINED_EXISTING_VIDEOS",
  "EXISTING_MASTER_RESTORE_REQUIRED",
  "EXISTING_FRAME_EXTRACTION_REQUIRED",
  "SECOND_VERIFIER_CONFIRMATION_ONLY",
  "PARTIALLY_COVERED_BY_EXISTING_VIDEO",
  "TRUE_NEW_RECORDING_REQUIRED",
  "NOT_APPLICABLE_DIRECTLY_PROVEN"
];

const targetRows = [
  {
    targetNumber: 1,
    targetID: "REQ-VERSION-PATCH-PLATFORM",
    targetName: "Game title, version, update, and platform proof",
    category: "Environment evidence",
    primaryClassification: "PARTIALLY_COVERED_BY_EXISTING_VIDEO",
    currentEvidence: [
      ev("phase0-video-001", "0-73.57", "Road to Glory creation path and create-player entry are visible."),
      ev("CF27_XBOX_SOURCE_2026_08_02_001", "0-4", "College Football 27 create-player appearance UI is visible."),
      ev("CF27_XBOX_SOURCE_2026_08_02_002", "0-4", "Hair-row appearance UI is visible."),
      ev("CF27_XBOX_SOURCE_2026_08_02_003", "0-4", "Styles/body-context UI is visible.")
    ],
    clearlyShown: "Game context and CF27 create-player UI are visible across the existing masters.",
    notShown: "Executable version, patch/title update, console platform screen, online/account state, edition, and region are not directly visible.",
    derivativeFramesInspected: ["CF27_XBOX_SOURCE_2026_08_02_001_tl_001_appearance_menu_0p5s.png"],
    canFrameExtractionSolve: "no",
    canVerifierSolve: "no",
    requiresNewRecording: "yes",
    exactNextAction: "Record one short environment clip showing platform and game version/update text while avoiding private account details.",
    minimumNewRecording: "One environment/version clip only; do not rerecord appearance menus for this target.",
    productionEligibility: "NOT_ELIGIBLE"
  },
  {
    targetNumber: 2,
    targetID: "REQ-ORDER-head-template",
    targetName: "Head Template native order, first/final selector boundaries, and wrap/no-wrap proof",
    category: "Head records",
    primaryClassification: "PARTIALLY_COVERED_BY_EXISTING_VIDEO",
    currentEvidence: [
      ev("phase0-video-002", "10-108.8", "Head Template selected labels are directly readable for the first portion of the selector."),
      ev("phase0-video-003", "0-133.02", "Head Template selected labels continue through Face 29 and preserve overlap with part 1."),
      ev("CF27_XBOX_SOURCE_2026_08_02_001", "5-64", "Additional Head Template traversal is visible in August source footage.")
    ],
    clearlyShown: "Selected Head Template labels and continuity overlap are visible in existing footage.",
    notShown: "A single complete recount proving selector beginning, final value, and wrap/no-wrap behavior is still not production-proven.",
    derivativeFramesInspected: ["phase0 head-template derivative evidence referenced by the production-verification queue"],
    canFrameExtractionSolve: "no",
    canVerifierSolve: "no",
    requiresNewRecording: "yes",
    exactNextAction: "Record the shortest Head Template boundary clip that shows first value, every missing native transition needed for continuity, final value, and wrap/no-wrap behavior.",
    minimumNewRecording: "One continuous Head Template boundary/order clip, not a full multi-angle rerecord unless the view task also needs it.",
    productionEligibility: "NOT_ELIGIBLE"
  },
  {
    targetNumber: 3,
    targetID: "REQ-VIEWS-heads",
    targetName: "Head Template standardized required views",
    category: "Head records",
    primaryClassification: "PARTIALLY_COVERED_BY_EXISTING_VIDEO",
    currentEvidence: [
      ev("phase0-video-002", "10-108.8", "Head Template preview rotates through multiple angles for early faces."),
      ev("phase0-video-003", "0-133.02", "Head Template preview rotates through multiple angles for later faces.")
    ],
    clearlyShown: "Existing videos contain multi-angle head preview evidence for many head records.",
    notShown: "The current derivative set does not establish every required view for every affected head candidate listed in the verifier queue.",
    derivativeFramesInspected: ["phase0 head-template derivatives", "production_verification_queue missingViews for head records"],
    canFrameExtractionSolve: "partial",
    canVerifierSolve: "no",
    requiresNewRecording: "yes",
    exactNextAction: "Extract any missing views from the existing masters first; only record the specific head/view pairs that remain missing after extraction.",
    minimumNewRecording: "Targeted missing head/view pairs only, with menu label/index visible.",
    productionEligibility: "NOT_ELIGIBLE"
  },
  orderTarget(4, "REQ-ORDER-skin-tone", "Skin Tone native order and boundaries", "Skin tone", [ev("phase0-video-004", "8-53.82", "Selected Skin Tone labels are directly readable."), ev("CF27_XBOX_SOURCE_2026_08_02_001", "65-119", "Skin Tone 20 and grid traversal are visible.")]),
  orderTarget(5, "REQ-ORDER-skin-details", "Skin Details native order and boundaries", "Skin details", [ev("phase0-video-005", "8-31.72", "Selected Skin Details labels are directly readable."), ev("CF27_XBOX_SOURCE_2026_08_02_001", "120-144", "Skin Details traversal is visible.")]),
  orderTarget(6, "REQ-ORDER-eye-shape", "Eye Shape native order and boundaries", "Eye shape", [ev("phase0-video-006", "14-24.93", "Selected Eye Shape labels are directly readable."), ev("CF27_XBOX_SOURCE_2026_08_02_001", "145-159", "Eye Shape traversal is visible.")]),
  orderTarget(7, "REQ-ORDER-eye-color", "Eye Color native order and boundaries", "Eye color", [ev("phase0-video-007", "12-29.33", "Selected Eye Color labels are directly readable."), ev("CF27_XBOX_SOURCE_2026_08_02_001", "160-184", "Eye Color traversal is visible.")]),
  orderTarget(8, "REQ-ORDER-ear-shape", "Ear Shape native order and boundaries", "Ear shape", [ev("phase0-video-009", "16-30.21", "Selected Ear Shape labels are directly readable."), ev("CF27_XBOX_SOURCE_2026_08_02_001", "200-209", "Ear Shape traversal is visible.")]),
  {
    targetNumber: 9,
    targetID: "REQ-VIEWS-ear-shape",
    targetName: "Ear Shape profile evidence",
    category: "Ear shape",
    primaryClassification: "EXISTING_FRAME_EXTRACTION_REQUIRED",
    currentEvidence: [
      ev("phase0-video-009", "16-30.21", "Ear Shape selected labels and profile-oriented preview frames are visible."),
      ev("CF27_XBOX_SOURCE_2026_08_02_001", "200-209", "Supplemental Ear Shape menu traversal is visible.")
    ],
    clearlyShown: "Existing footage contains the Ear Shape menu and side/profile-oriented character preview.",
    notShown: "Current derivatives do not yet isolate the requested profile frames for every affected ear-shape candidate.",
    derivativeFramesInspected: ["phase0 ear-shape derivative frames", "CF27_XBOX_SOURCE_2026_08_02_001_tl_008 ear-shape derivative"],
    canFrameExtractionSolve: "yes",
    canVerifierSolve: "yes",
    requiresNewRecording: "no",
    exactNextAction: "Extract best full-resolution profile frames from the existing Ear Shape masters and route those derivatives to verifier review.",
    minimumNewRecording: "None unless extraction from the listed source windows fails.",
    productionEligibility: "NOT_ELIGIBLE"
  },
  orderTarget(10, "REQ-ORDER-nose", "Nose native order and boundaries", "Nose", [ev("phase0-video-008", "14-32.45", "Selected Nose labels are directly readable."), ev("CF27_XBOX_SOURCE_2026_08_02_001", "185-199", "Nose traversal is visible.")]),
  viewTarget(11, "REQ-VIEWS-nose", "Nose required views", "Nose", [ev("phase0-video-008", "14-32.45", "Nose selected labels and some angled preview frames are visible."), ev("CF27_XBOX_SOURCE_2026_08_02_001", "185-199", "Nose menu traversal is visible.")], "The current media does not prove the required front, left-profile, and right-profile views for every nose candidate."),
  viewTarget(12, "REQ-VIEWS-jaw-shape", "Jaw Shape required views", "Jaw shape", [ev("CF27_XBOX_SOURCE_2026_08_02_001", "220-229", "Jaw Shape Square label and front-ish preview are visible.")], "Current footage does not prove left-profile and right-profile Jaw Shape views."),
  viewTarget(13, "REQ-VIEWS-chin", "Chin required views", "Chin", [ev("CF27_XBOX_SOURCE_2026_08_02_001", "230-240.24", "Chin Square label and front-ish preview are visible.")], "Current footage does not prove left-profile and right-profile Chin views."),
  {
    targetNumber: 14,
    targetID: "REQ-EYEBROWS",
    targetName: "Eyebrow or brow-control presence",
    category: "Additional visible face-matching controls",
    primaryClassification: "NOT_APPLICABLE_DIRECTLY_PROVEN",
    currentEvidence: [
      ev("CF27_XBOX_SOURCE_2026_08_02_001", "0-240.24", "The inspected Head & Skin sweep shows Head Template, Skin Tone, Skin Details, Eye Shape, Eye Color, Nose, Ear Shape, Mouth Shape, Jaw Shape, and Chin."),
      ev("phase0-video-002", "6-108.8", "Head Template navigation and selected labels show no standalone brow row."),
      ev("phase0-video-006", "0-24.93", "Navigation into Eye Shape shows brow controls are not separately selected in that path.")
    ],
    clearlyShown: "No standalone Eyebrow/Brow Shape/Brow Color row appears in the directly inspected Head & Skin menu footage.",
    notShown: "A brow-specific control is not visible.",
    derivativeFramesInspected: ["Head & Skin menu/timeline derivatives"],
    canFrameExtractionSolve: "not_needed",
    canVerifierSolve: "yes",
    requiresNewRecording: "no",
    exactNextAction: "Second verifier should confirm absence during independent Head & Skin menu mapping; do not record a dedicated eyebrow clip unless a future menu row appears.",
    minimumNewRecording: "None.",
    productionEligibility: "NOT_ELIGIBLE"
  },
  orderTarget(15, "REQ-ORDER-hair-color", "Hair Color native order and boundaries", "Hair colors", [ev("CF27_XBOX_SOURCE_2026_08_02_002", "100-174", "Hair Color labels and selected values are visible.")]),
  orderTarget(16, "REQ-ORDER-hairstyles", "Hair Style native order and boundaries", "Hairstyles", [ev("CF27_XBOX_SOURCE_2026_08_02_002", "5-99", "Hair Style labels and selected values are visible.")]),
  {
    targetNumber: 17,
    targetID: "REQ-VIEWS-hairstyles",
    targetName: "Hairstyle standardized required views",
    category: "Hairstyles",
    primaryClassification: "EXISTING_FRAME_EXTRACTION_REQUIRED",
    currentEvidence: [ev("CF27_XBOX_SOURCE_2026_08_02_002", "5-99", "Hair Style labels and rotating preview angles are visible.")],
    clearlyShown: "Existing footage contains Hair Style menu evidence and multiple preview angles.",
    notShown: "Current derivatives do not isolate all requested front, three-quarter, profile, and rear hairstyle evidence frames.",
    derivativeFramesInspected: ["August 2026 hair-style derivatives", "production_verification_queue missingViews for hairstyles"],
    canFrameExtractionSolve: "yes",
    canVerifierSolve: "yes",
    requiresNewRecording: "no",
    exactNextAction: "Extract standardized hairstyle frames from the existing Hair Style master before requesting any new recording.",
    minimumNewRecording: "None unless extraction from CF27_XBOX_SOURCE_2026_08_02_002 fails for a specific style/view pair.",
    productionEligibility: "NOT_ELIGIBLE"
  },
  orderTarget(18, "REQ-ORDER-facial-hair-color", "Facial Hair Color native order and boundaries", "Facial-hair colors", [ev("CF27_XBOX_SOURCE_2026_08_02_002", "225-235.35", "Facial Hair Color values including Purple are visible.")]),
  orderTarget(19, "REQ-ORDER-facial-hair", "Facial Hair Style native order and boundaries", "Facial hair", [ev("CF27_XBOX_SOURCE_2026_08_02_002", "175-224", "Facial Hair Style labels including Mutton Chops are visible.")]),
  {
    targetNumber: 20,
    targetID: "REQ-VIEWS-facial-hair",
    targetName: "Facial Hair required views",
    category: "Facial hair",
    primaryClassification: "EXISTING_FRAME_EXTRACTION_REQUIRED",
    currentEvidence: [ev("CF27_XBOX_SOURCE_2026_08_02_002", "175-224", "Facial Hair Style labels and rotating preview angles are visible.")],
    clearlyShown: "Existing footage contains Facial Hair Style menu evidence and multiple preview angles.",
    notShown: "Current derivatives do not isolate all requested front, three-quarter, and profile facial-hair evidence frames.",
    derivativeFramesInspected: ["August 2026 facial-hair derivatives", "production_verification_queue missingViews for facial hair"],
    canFrameExtractionSolve: "yes",
    canVerifierSolve: "yes",
    requiresNewRecording: "no",
    exactNextAction: "Extract standardized facial-hair frames from the existing Facial Hair Style master before requesting any new recording.",
    minimumNewRecording: "None unless extraction from CF27_XBOX_SOURCE_2026_08_02_002 fails for a specific style/view pair.",
    productionEligibility: "NOT_ELIGIBLE"
  },
  {
    targetNumber: 21,
    targetID: "REQ-DEPENDENCY-TESTS",
    targetName: "Controlled dependency testing",
    category: "Dependency tests",
    primaryClassification: "PARTIALLY_COVERED_BY_EXISTING_VIDEO",
    currentEvidence: [
      ev("CF27_XBOX_SOURCE_2026_08_02_001", "5-240.24", "Head & Skin settings change during traversal."),
      ev("CF27_XBOX_SOURCE_2026_08_02_002", "5-235.35", "Hair and facial-hair settings change during traversal."),
      ev("CF27_XBOX_SOURCE_2026_08_02_003", "5-163.8", "Styles/body-context rows are visible.")
    ],
    clearlyShown: "Existing media shows appearance and style controls being changed in the same environment.",
    notShown: "Controlled one-variable dependency tests are not shown; natural menu traversal cannot prove reset behavior, platform differences, unlock state, or count/order dependencies.",
    derivativeFramesInspected: ["August 2026 timeline derivatives"],
    canFrameExtractionSolve: "no",
    canVerifierSolve: "no",
    requiresNewRecording: "yes",
    exactNextAction: "Record targeted one-variable dependency tests after primary category evidence is complete.",
    minimumNewRecording: "One dependency clip per unresolved variable actually needed for production; do not run broad tests until category boundaries are stable.",
    productionEligibility: "NOT_ELIGIBLE"
  }
];

if (import.meta.url === `file://${process.argv[1]}`) {
  const checkOnly = process.argv.includes("--check");
  const built = buildReuseAudit({ root: repositoryRoot });
  if (checkOnly) {
    checkReuseAudit(built, { root: repositoryRoot });
    console.log(`CF27 21-target existing-video reuse audit is current (${built.audit.summary.targetsAudited} targets; ${built.audit.summary.finalMinimumNewRecordingTasks} recording tasks).`);
  } else {
    writeReuseAudit(built, { root: repositoryRoot });
    console.log(`Wrote CF27 21-target existing-video reuse audit (${built.audit.summary.targetsAudited} targets; ${built.audit.summary.finalMinimumNewRecordingTasks} recording tasks).`);
  }
}

export function buildReuseAudit({ root = repositoryRoot, generatedAtISO = generatedAt } = {}) {
  const videoInventory = readJson(root, sourcePaths.videoInventory);
  const timeline = readJson(root, sourcePaths.timeline);
  const legacyTimeline = readJson(root, sourcePaths.legacyTimeline);
  const existingMediaAudit = readJson(root, sourcePaths.existingMediaAudit);
  const minimumRecaptureQueue = readJson(root, sourcePaths.minimumRecaptureQueue);
  const frameReextractions = readOptionalJson(root, sourcePaths.frameReextractions) ?? { rows: [] };
  const productionManifest = readOptionalJson(root, sourcePaths.productionCatalogManifest) ?? {};
  const inventoryRows = videoInventory.inventory ?? [];
  const uniqueMasters = uniqueInventoryRows(inventoryRows);
  const duplicateRows = inventoryRows.filter((row) => row.exactDuplicate === true || row.duplicate_status === "EXACT_DUPLICATE" || row.duplicateStatus === "DUPLICATE_UPLOAD_NO_NEW_COVERAGE");
  const ownerDownloadRows = inventoryRows.filter((row) => relativePathForVideo(row).startsWith("OWNER_DOWNLOADS/"));
  const restoreTasks = ownerDownloadRows
    .filter((row) => !resolveOwnerDownloadPath(root, row))
    .map((row, index) => ({
      restoreID: `CF27-MASTER-RESTORE-${String(index + 1).padStart(3, "0")}`,
      sourceVideoID: row.source_video_id ?? row.sourceVideoID,
      originalFilename: row.original_filename ?? row.originalFilename,
      portableReference: row.relative_path ?? row.relativePath,
      exactReason: "Portable OWNER_DOWNLOADS master reference is not locally resolvable; restoration is required before recapture is considered.",
      nextAction: "Re-add the original master through the approved intake workflow.",
      productionStatus: "NOT_PRODUCTION_DATA"
    }));

  const targets = targetRows.map((row) => normalizeTarget(row, minimumRecaptureQueue));
  const finalRecordingTasks = minimumRecaptureQueue.tasks ?? [];
  const coverageRows = buildCoverageRows({ targets, inventoryRows, timelineRecords: timeline.records ?? [], legacyEvents: legacyTimeline.events ?? [] });
  const validation = validateReuseAudit({ targets, finalRecordingTasks, restoreTasks, productionManifest });
  const summary = {
    targetsAudited: targets.length,
    expectedTargets: 21,
    finalMinimumNewRecordingTasks: finalRecordingTasks.length,
    originalPrompt094RecaptureTargets: 21,
    removedFromOwnerRecordingQueue: 21 - finalRecordingTasks.length,
    productionCatalogRecords: productionManifest.items?.length ?? productionManifest.manifest?.items?.length ?? 0,
    secondVerifierDecisionsCreated: 0,
    classificationCounts: countBy(targets, "primaryClassification"),
    uniqueMasterVideos: uniqueMasters.length,
    duplicateUploads: duplicateRows.length,
    ownerDownloadMastersReferenced: ownerDownloadRows.length,
    ownerDownloadMastersResolvableLocally: ownerDownloadRows.length - restoreTasks.length,
    existingMasterRestoreTasks: restoreTasks.length,
    frameExtractionTargets: targets.filter((target) => target.primaryClassification === "EXISTING_FRAME_EXTRACTION_REQUIRED").length,
    notApplicableDirectlyProvenTargets: targets.filter((target) => target.primaryClassification === "NOT_APPLICABLE_DIRECTLY_PROVEN").length,
    partialCoverageTargets: targets.filter((target) => target.primaryClassification === "PARTIALLY_COVERED_BY_EXISTING_VIDEO").length
  };

  const audit = {
    schemaVersion: CF27_21_TARGET_REUSE_AUDIT_SCHEMA_VERSION,
    generatedAt: generatedAtISO,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    prompt: "GFM | Q04 | PROMPT 098 | PHASE 02 | Prove existing video coverage before recapture",
    dataClass: "EXISTING_VIDEO_REUSE_AUDIT",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "PRIMARY_RESEARCH_AUDIT_NOT_SECOND_VERIFIED",
    productionRecommendationsEnabled: false,
    sourceArtifacts: sourcePaths,
    mediaInspectionBasis: {
      directSourceVideoInspection: true,
      contactSheetsGeneratedInIgnoredDirectory: "build-artifacts/cf27-video-reuse-audit/contact-sheets/",
      ffprobeEquivalentUsed: "/Applications/Plaud.app/Contents/Resources/ffmpeg",
      ffprobeAvailability: "ffprobe executable not available on PATH; ffmpeg metadata/decode and contact sheets were used as equivalent local inspection.",
      mastersWereModified: false
    },
    summary,
    videoInventory: inventoryRows.map(videoInventorySummaryRow),
    targets,
    finalMinimumRecordingTasks: finalRecordingTasks,
    frameExtractionQueue: targets.filter((target) => target.primaryClassification === "EXISTING_FRAME_EXTRACTION_REQUIRED"),
    verifierActions: targets.filter((target) => target.canVerifierSolve !== "no"),
    existingMasterRestoreQueue: restoreTasks,
    validation
  };

  const coverageMap = {
    schemaVersion: `${CF27_21_TARGET_REUSE_AUDIT_SCHEMA_VERSION}-coverage-map`,
    generatedAt: generatedAtISO,
    productionStatus: "NOT_PRODUCTION_DATA",
    summary: {
      rows: coverageRows.length,
      sourceVideos: unique(coverageRows.map((row) => row.sourceVideoID)).length,
      targetsCovered: unique(coverageRows.map((row) => row.targetID)).length
    },
    rows: coverageRows
  };

  const restoreQueue = {
    schemaVersion: `${CF27_21_TARGET_REUSE_AUDIT_SCHEMA_VERSION}-master-restore-queue`,
    generatedAt: generatedAtISO,
    productionStatus: "NOT_PRODUCTION_DATA",
    summary: {
      totalRestoreTasks: restoreTasks.length,
      ownerDownloadMastersReferenced: ownerDownloadRows.length,
      ownerDownloadMastersResolvableLocally: ownerDownloadRows.length - restoreTasks.length,
      sourceMediaMastersInRepository: inventoryRows.filter((row) => relativePathForVideo(row).startsWith("source-media/")).length,
      duplicateUploadsDocumented: duplicateRows.length
    },
    tasks: restoreTasks
  };

  return {
    audit,
    coverageMap,
    restoreQueue,
    files: {
      doc: formatMarkdownReport({ audit, coverageMap, restoreQueue, existingMediaAudit, frameReextractions }),
      auditJson: `${JSON.stringify(audit, null, 2)}\n`,
      auditCsv: toCsv(targets.map(targetCsvRow)),
      coverageJson: `${JSON.stringify(coverageMap, null, 2)}\n`,
      coverageCsv: toCsv(coverageRows),
      restoreJson: `${JSON.stringify(restoreQueue, null, 2)}\n`,
      restoreCsv: restoreTasks.length
        ? toCsv(restoreTasks)
        : "restoreID,sourceVideoID,originalFilename,portableReference,exactReason,nextAction,productionStatus\n"
    }
  };
}

export function writeReuseAudit(built, { root = repositoryRoot } = {}) {
  for (const [key, relativePath] of Object.entries(outputPaths)) writeText(root, relativePath, built.files[key]);
}

export function checkReuseAudit(built, { root = repositoryRoot } = {}) {
  if (!built.audit.validation.ok) throw new Error(`CF27 21-target reuse audit validation failed: ${built.audit.validation.errors.map((error) => error.message).join("; ")}`);
  for (const [key, relativePath] of Object.entries(outputPaths)) {
    const expected = built.files[key];
    const absolute = path.join(root, relativePath);
    if (!fs.existsSync(absolute)) throw new Error(`${relativePath} is missing. Run npm run cf27:21-target-video-reuse-audit.`);
    const actual = fs.readFileSync(absolute, "utf8");
    if (actual !== expected) throw new Error(`${relativePath} is stale. Run npm run cf27:21-target-video-reuse-audit.`);
  }
}

function ev(sourceVideoID, timestampRange, observation) {
  return { sourceVideoID, timestampRange, observation };
}

function orderTarget(targetNumber, targetID, targetName, category, currentEvidence) {
  return {
    targetNumber,
    targetID,
    targetName,
    category,
    primaryClassification: "PARTIALLY_COVERED_BY_EXISTING_VIDEO",
    currentEvidence,
    clearlyShown: `${category} selected labels/options are visible in existing media.`,
    notShown: "Selector beginning, final value, two-count continuity, and wrap/no-wrap behavior are not production-proven from existing footage alone.",
    derivativeFramesInspected: ["existing category derivatives", "count/order audit rows"],
    canFrameExtractionSolve: "no",
    canVerifierSolve: "no",
    requiresNewRecording: "yes",
    exactNextAction: `Record the shortest ${category} boundary/order clip showing first value, final value, and wrap/no-wrap proof with readable label/index.`,
    minimumNewRecording: `One boundary/order clip for ${category}; do not rerecord visual angle evidence unless another target requires it.`,
    productionEligibility: "NOT_ELIGIBLE"
  };
}

function viewTarget(targetNumber, targetID, targetName, category, currentEvidence, notShown) {
  return {
    targetNumber,
    targetID,
    targetName,
    category,
    primaryClassification: "PARTIALLY_COVERED_BY_EXISTING_VIDEO",
    currentEvidence,
    clearlyShown: `${category} selected labels and at least one character preview view are visible in existing media.`,
    notShown,
    derivativeFramesInspected: ["existing derivatives", "production_verification_queue missingViews"],
    canFrameExtractionSolve: "partial",
    canVerifierSolve: "no",
    requiresNewRecording: "yes",
    exactNextAction: `Extract usable frames first; then record only the specific ${category} view(s) still missing after extraction.`,
    minimumNewRecording: `Targeted ${category} missing views only, with native menu label/index visible.`,
    productionEligibility: "NOT_ELIGIBLE"
  };
}

function normalizeTarget(target, minimumRecaptureQueue) {
  const recaptureTask = (minimumRecaptureQueue.tasks ?? []).find((task) => task.candidateOrRequirementID === target.targetID);
  return {
    ...target,
    currentEvidence: target.currentEvidence.map((item) => ({ ...item })),
    existingSourceVideos: unique(target.currentEvidence.map((item) => item.sourceVideoID)).join("; "),
    timestampsInspected: target.currentEvidence.map((item) => `${item.sourceVideoID} @ ${item.timestampRange}`).join("; "),
    derivativeFramesInspected: target.derivativeFramesInspected.join("; "),
    canFrameReextractionSolveIt: target.canFrameExtractionSolve,
    canSecondVerifierReviewSolveIt: target.canVerifierSolve,
    requiresNewRecording: target.requiresNewRecording,
    exactReason: target.notShown,
    exactNextAction: target.exactNextAction,
    minimumNewRecording: target.minimumNewRecording,
    correspondingRecaptureID: recaptureTask?.recaptureID ?? "",
    finalOwnerRecordingQueueStatus: recaptureTask ? "IN_OWNER_MINIMUM_RECORDING_GUIDE" : "REMOVED_FROM_OWNER_RECORDING_GUIDE",
    productionEligibility: "NOT_ELIGIBLE",
    blockingReason: target.primaryClassification === "EXISTING_FRAME_EXTRACTION_REQUIRED"
      ? "Production remains blocked until extraction, second verification, and production promotion gates pass."
      : target.primaryClassification === "NOT_APPLICABLE_DIRECTLY_PROVEN"
      ? "Production remains blocked until the second verifier confirms menu absence and no production record is created for absent control."
      : "Production remains blocked until missing production evidence is captured, second verified, and release approved."
  };
}

function buildCoverageRows({ targets, inventoryRows, timelineRecords, legacyEvents }) {
  const rows = [];
  for (const target of targets) {
    for (const evidence of target.currentEvidence) {
      const video = inventoryRows.find((row) => videoID(row) === evidence.sourceVideoID)
        ?? {};
      const timelineMatches = timelineRecords.filter((record) => record.video_id === evidence.sourceVideoID && overlaps(record.start_timestamp, record.end_timestamp, evidence.timestampRange));
      const legacyMatches = legacyEvents.filter((event) => event.videoId === evidence.sourceVideoID || event.sourceVideoID === evidence.sourceVideoID);
      rows.push({
        targetNumber: target.targetNumber,
        targetID: target.targetID,
        targetName: target.targetName,
        category: target.category,
        sourceVideoID: evidence.sourceVideoID,
        timestampRange: evidence.timestampRange,
        observation: evidence.observation,
        originalFilename: video.original_filename ?? video.originalFilename ?? "",
        relativePath: video.relative_path ?? video.relativePath ?? "",
        sha256: video.sha256 ?? "",
        durationSeconds: video.duration_seconds ?? video.durationSeconds ?? "",
        resolution: video.resolution ?? "",
        codec: video.video_codec ?? video.codec ?? "",
        timelineRecordsMatched: timelineMatches.length,
        legacyTimelineEventsAvailable: legacyMatches.length,
        targetClassification: target.primaryClassification,
        productionStatus: "NOT_PRODUCTION_DATA"
      });
    }
  }
  return rows;
}

function overlaps(start, end, range) {
  if (typeof start !== "number" || typeof end !== "number") return false;
  const [rangeStart, rangeEnd] = String(range).split("-").map(Number);
  return Number.isFinite(rangeStart) && Number.isFinite(rangeEnd) && end >= rangeStart && start <= rangeEnd;
}

function validateReuseAudit({ targets, finalRecordingTasks, restoreTasks, productionManifest }) {
  const errors = [];
  const warnings = [];
  if (targets.length !== 21) errors.push(issue("targetCount", `Expected 21 targets, found ${targets.length}.`));
  const targetIDs = targets.map((target) => target.targetID);
  if (new Set(targetIDs).size !== targetIDs.length) errors.push(issue("duplicateTarget", "One or more targets appears more than once."));
  for (const target of targets) {
    if (!allowedClassifications.includes(target.primaryClassification)) errors.push(issue("invalidClassification", `${target.targetID} uses ${target.primaryClassification}.`));
    if (!target.exactReason || !target.exactNextAction) errors.push(issue("incompleteTarget", `${target.targetID} lacks reason/action.`));
    if (target.productionEligibility !== "NOT_ELIGIBLE") errors.push(issue("productionEligibility", `${target.targetID} was made production eligible.`));
  }
  const frameTargetIDs = new Set(targets.filter((target) => target.primaryClassification === "EXISTING_FRAME_EXTRACTION_REQUIRED").map((target) => target.targetID));
  const verifierOnlyIDs = new Set(targets.filter((target) => target.primaryClassification === "SECOND_VERIFIER_CONFIRMATION_ONLY").map((target) => target.targetID));
  for (const task of finalRecordingTasks) {
    if (task.classification !== "GENUINE_RECAPTURE_REQUIRED") errors.push(issue("nonGenuineTask", `${task.recaptureID} is not genuine recapture.`));
    if (frameTargetIDs.has(task.candidateOrRequirementID)) errors.push(issue("frameTaskQueued", `${task.candidateOrRequirementID} is frame extraction but still queued for recording.`));
    if (verifierOnlyIDs.has(task.candidateOrRequirementID)) errors.push(issue("verifierTaskQueued", `${task.candidateOrRequirementID} is verifier-only but still queued for recording.`));
    if (!task.exactBlockerCleared || !task.proposedFilename || !task.exactMenuPath) errors.push(issue("incompleteTask", `${task.recaptureID} lacks exact recording instruction.`));
  }
  if ((productionManifest.items?.length ?? productionManifest.manifest?.items?.length ?? 0) !== 0) errors.push(issue("productionRecords", "Production catalog is nonempty during this audit."));
  if (restoreTasks.length > 0) warnings.push(issue("restoreTasks", `${restoreTasks.length} existing master(s) need restoration before recapture is considered.`));
  return { ok: errors.length === 0, errors, warnings };
}

function videoInventorySummaryRow(row) {
  return {
    sourceVideoID: videoID(row),
    originalFilename: row.original_filename ?? row.originalFilename,
    relativePath: relativePathForVideo(row),
    sha256: row.sha256,
    fileSizeBytes: row.file_size_bytes ?? row.fileSizeBytes,
    durationSeconds: row.duration_seconds ?? row.durationSeconds,
    resolution: row.resolution ?? dimensionsForVideo(row),
    frameRate: row.frame_rate ?? row.frameRate,
    codec: row.video_codec ?? row.videoCodec ?? row.codec,
    duplicateStatus: row.exactDuplicate ? `EXACT_DUPLICATE_OF_${row.exactDuplicateOf}` : (row.duplicate_status ?? row.duplicateStatus ?? "UNIQUE_OR_UNASSESSED"),
    processingStatus: row.processing_status ?? row.processingStatus
  };
}

function targetCsvRow(target) {
  return {
    targetNumber: target.targetNumber,
    targetID: target.targetID,
    targetName: target.targetName,
    category: target.category,
    primaryClassification: target.primaryClassification,
    existingSourceVideos: target.existingSourceVideos,
    timestampsInspected: target.timestampsInspected,
    derivativeFramesInspected: target.derivativeFramesInspected,
    clearlyShown: target.clearlyShown,
    notShown: target.notShown,
    canFrameReextractionSolveIt: target.canFrameReextractionSolveIt,
    canSecondVerifierReviewSolveIt: target.canSecondVerifierReviewSolveIt,
    requiresNewRecording: target.requiresNewRecording,
    correspondingRecaptureID: target.correspondingRecaptureID,
    finalOwnerRecordingQueueStatus: target.finalOwnerRecordingQueueStatus,
    exactNextAction: target.exactNextAction,
    productionEligibility: target.productionEligibility
  };
}

function formatMarkdownReport({ audit, coverageMap, restoreQueue, existingMediaAudit, frameReextractions }) {
  const counts = audit.summary.classificationCounts;
  const videoRows = audit.videoInventory.map((video) => `| ${video.sourceVideoID} | ${video.originalFilename} | ${video.relativePath} | ${video.durationSeconds ?? ""} | ${video.resolution ?? ""} | ${video.codec ?? ""} | ${video.duplicateStatus} |`).join("\n");
  const targetRowsMarkdown = audit.targets.map((target) => `| ${target.targetNumber} | ${target.targetID} | ${target.category} | ${target.primaryClassification} | ${target.existingSourceVideos} | ${target.requiresNewRecording} | ${target.exactNextAction} |`).join("\n");
  const recordingRows = audit.finalMinimumRecordingTasks.map((task) => `| ${task.recaptureID} | ${task.candidateOrRequirementID} | ${task.exactCategory} | ${task.exactOptionOrRange} | ${task.exactViewsRequired} | ${task.proposedFilename} |`).join("\n");
  const extractionRows = audit.frameExtractionQueue.map((target) => `| ${target.targetID} | ${target.category} | ${target.existingSourceVideos} | ${target.exactNextAction} |`).join("\n");
  const verifierRows = audit.verifierActions.map((target) => `| ${target.targetID} | ${target.category} | ${target.primaryClassification} | ${target.exactNextAction} |`).join("\n");
  return `# CF27 21-Target Existing Video Reuse Audit

**Generated at:** ${audit.generatedAt}
**Status:** research/evidence audit only; not production data
**Production records created:** ${audit.summary.productionCatalogRecords}
**Second-verifier decisions created:** ${audit.summary.secondVerifierDecisionsCreated}

## 1. Executive Conclusion

Existing CF27 footage was inspected before asking Wyatt for new recording. The prior 21-task owner recording queue has been reduced to ${audit.summary.finalMinimumNewRecordingTasks} focused owner recording tasks. ${audit.summary.removedFromOwnerRecordingQueue} prior tasks were removed from the owner recording list because existing footage can support frame re-extraction or because the requested control is directly not shown in the inspected menu evidence.

This audit does not second-verify any record and does not promote any record to production. Production recommendations remain blocked.

## 2. Existing Video Inventory

| Source video ID | Original filename | Relative path | Duration seconds | Resolution | Codec | Duplicate status |
|---|---|---|---:|---|---|---|
${videoRows}

## 3. Duplicate Findings

- Unique master videos: ${audit.summary.uniqueMasterVideos}
- Duplicate uploads: ${audit.summary.duplicateUploads}
- Duplicate uploads remain documented and are not counted as new coverage.

## 4. Classification Counts

${Object.entries(counts).map(([key, value]) => `- ${key}: ${value}`).join("\n")}

## 5. Frame Re-Extraction Before Recapture

These tasks should be attempted from existing masters before any new Xbox recording:

| Requirement | Category | Existing source videos | Action |
|---|---|---|---|
${extractionRows || "| None | | | |"}

Previously completed frame extractions recorded in \`data/phase-zero/cf27_frame_reextractions.json\`: ${(frameReextractions.rows ?? []).length}

## 6. Existing Master Restore Queue

- Restore tasks: ${restoreQueue.summary.totalRestoreTasks}
- Owner Downloads masters referenced: ${restoreQueue.summary.ownerDownloadMastersReferenced}
- Owner Downloads masters resolvable locally: ${restoreQueue.summary.ownerDownloadMastersResolvableLocally}

## 7. Target-by-Target Matrix

| # | Requirement | Category | Classification | Existing source videos | New recording? | Next action |
|---:|---|---|---|---|---|---|
${targetRowsMarkdown}

## 8. Final Minimum New Recording List

Only the following tasks remain in \`data/phase-zero/cf27_minimum_recapture_queue.json\`.

| Task | Requirement | Category | Option/range | Required view | Proposed filename |
|---|---|---|---|---|---|
${recordingRows || "| None | | | | | |"}

## 9. Items That Do Not Need Recording Again

- Ear Shape profile evidence: extract frames from existing Ear Shape footage first.
- Hairstyle required views: extract standardized frames from existing Hair Style footage first.
- Facial Hair required views: extract standardized frames from existing Facial Hair Style footage first.
- Eyebrow/brow-control target: current Head & Skin footage directly shows no standalone eyebrow row; verifier should confirm absence during independent menu mapping.

## 10. Second-Verifier Actions

| Requirement | Category | Classification | Action |
|---|---|---|---|
${verifierRows || "| None | | |"}

## 11. Production-Readiness Implications

- Existing-media reuse improves capture efficiency, but production promotion remains blocked.
- Current production catalog record count remains ${audit.summary.productionCatalogRecords}.
- Second-person verification remains required for every production candidate.
- The existing media audit still reports ${existingMediaAudit.summary?.candidateRows ?? "unknown"} candidate rows requiring human verification.

## 12. Owner Actions

1. Do not rerecord the four removed tasks unless extraction or verifier review later fails.
2. Record only the ${audit.summary.finalMinimumNewRecordingTasks} tasks in \`docs/status/CF27_OWNER_MINIMUM_RECORDING_GUIDE.md\`.
3. Preserve master videos exactly and add any new clips through the approved intake workflow.

## 13. Validation

- Coverage-map rows: ${coverageMap.summary.rows}
- Targets covered by coverage map: ${coverageMap.summary.targetsCovered}
- Validation status: ${audit.validation.ok ? "PASS" : "FAIL"}
`;
}

function uniqueInventoryRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = row.sha256 || videoID(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resolveOwnerDownloadPath(root, row) {
  const relative = relativePathForVideo(row);
  const filename = relative.replace(/^OWNER_DOWNLOADS\//, "");
  const candidates = [
    path.join(root, relative),
    path.join("/Users/skaggssystems/Downloads", filename)
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? "";
}

function videoID(row) {
  return row.source_video_id ?? row.sourceVideoID ?? row.video_id ?? row.videoId ?? row.inventoryId ?? "";
}

function relativePathForVideo(row) {
  return row.relative_path
    ?? row.relativePath
    ?? row.sourceLocation?.portableRelativeEvidencePath
    ?? "";
}

function dimensionsForVideo(row) {
  if (row.dimensions && typeof row.dimensions === "object") return `${row.dimensions.width}x${row.dimensions.height}`;
  return "";
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readOptionalJson(root, relativePath) {
  const absolute = path.join(root, relativePath);
  return fs.existsSync(absolute) ? JSON.parse(fs.readFileSync(absolute, "utf8")) : null;
}

function writeText(root, relativePath, text) {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, text);
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Array.from(rows.reduce((set, row) => {
    for (const key of Object.keys(row)) set.add(key);
    return set;
  }, new Set()));
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((header) => csvCell(row[header])).join(","));
  return `${lines.join("\n")}\n`;
}

function csvCell(value) {
  if (Array.isArray(value)) value = value.join("; ");
  if (value && typeof value === "object") value = JSON.stringify(value);
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    counts[row[key]] = (counts[row[key]] ?? 0) + 1;
    return counts;
  }, {});
}

function issue(code, message) {
  return { code, message };
}
