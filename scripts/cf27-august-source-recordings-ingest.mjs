#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAt = "2026-08-02T22:50:00-04:00";
const schemaVersion = "cf27-august-2026-source-recordings-ingest-v1";
const sourceFolder = "source-media/NCAA 26";

const sourceVideos = [
  {
    inventoryId: "CF27_XBOX_SOURCE_2026_08_02_001",
    originalFilename: "EA SPORTS™ College Football 27-2026_08_02-21_13_02.mp4",
    durationSeconds: 240.24,
    creationTimeUtc: "2026-08-02T21:09:02.000000Z",
    fileModifiedAtLocal: "2026-08-02T17:13:02-04:00",
    expectedContent: "New College Football 27 Head & Skin source recording covering Head Template, Skin Tone, Skin Details, Eye Shape, Eye Color, Nose, Ear Shape, Mouth Shape, Jaw Shape, and Chin.",
    observedContent: "Create Player > Player appearance menus; direct title/footer confirms EA SPORTS College Football 27. Includes Head & Skin tab traversal and partial selected values for skin, eye, nose, ear, mouth, jaw, and chin controls."
  },
  {
    inventoryId: "CF27_XBOX_SOURCE_2026_08_02_002",
    originalFilename: "EA SPORTS™ College Football 27-2026_08_02-21_18_14.mp4",
    durationSeconds: 235.35,
    creationTimeUtc: "2026-08-02T21:14:19.000000Z",
    fileModifiedAtLocal: "2026-08-02T17:18:14-04:00",
    expectedContent: "New College Football 27 Hair source recording covering Hair Style, Hair Color, Facial Hair Style, and Facial Hair Color.",
    observedContent: "Create Player > Player > Hair tabs are directly visible. Selected native labels are readable for Short Curly, Light Brown, Mutton Chops, and Purple in extracted full-screen frames."
  },
  {
    inventoryId: "CF27_XBOX_SOURCE_2026_08_02_003",
    originalFilename: "EA SPORTS™ College Football 27-2026_08_02-21_21_15.mp4",
    durationSeconds: 163.8,
    creationTimeUtc: "2026-08-02T21:18:33.000000Z",
    fileModifiedAtLocal: "2026-08-02T17:21:16-04:00",
    expectedContent: "New College Football 27 body/style context recording.",
    observedContent: "Create Player > Player > Styles screen with QB Throw Style and body/context style rows. This is context/dependency evidence, not facial appearance production evidence."
  }
];

const mediaTechnicalDefaults = {
  mediaContainer: "MP4",
  mediaContainerRaw: "mov,mp4,m4a,3gp,3g2,mj2",
  videoCodec: "h264 (Main) (avc1 / 0x31637661)",
  audioCodec: "aac (LC) (mp4a / 0x6134706D)",
  dimensions: { width: 1920, height: 1080 },
  frameRate: 58.96,
  mimeType: "video/mp4",
  fileOpenStatus: "opens",
  ffmpegStatus: "opens"
};

const timelineCounters = new Map();
const timelineRecords = [
  tl("001", 0, 4, "menu_transition", "Create Player > Player", "Appearance menu / Head & Skin row", "", "Appearance menu visible before Head & Skin traversal.", "MEDIUM", "CF27_XBOX_SOURCE_2026_08_02_001_tl_001_appearance_menu_0p5s.png", 0.5),
  tl("001", 5, 64, "option_change", "Create Player > Player > Appearance > Head & Skin", "Head Template", "Face values visible during traversal", "Head Template selector is traversed; new clip reinforces existing head/menu evidence but does not independently resolve complete count or duplicate review.", "MEDIUM", "CF27_XBOX_SOURCE_2026_08_02_001_tl_002_head_template_5p5s.png", 5.5),
  tl("001", 65, 119, "option_change", "Create Player > Player > Appearance > Head & Skin", "Skin Tone", "Skin Tone 20", "Skin Tone selector is directly visible; selected Skin Tone 20 frame is useful as supplemental evidence only because prior category completeness still requires boundary verification.", "HIGH", "CF27_XBOX_SOURCE_2026_08_02_001_tl_003_skin_tone_82p0s.png", 82),
  tl("001", 120, 144, "option_change", "Create Player > Player > Appearance > Head & Skin", "Skin Details", "Selected skin-detail labels visible in recording; representative frame only.", "Skin Details traversal is present but this ingest does not replace the existing category catalog without per-label review.", "MEDIUM", "CF27_XBOX_SOURCE_2026_08_02_001_tl_004_skin_details_125p5s.png", 125.5),
  tl("001", 145, 159, "option_change", "Create Player > Player > Appearance > Head & Skin", "Eye Shape", "Selected eye-shape label visible in recording; representative frame only.", "Eye Shape traversal is present but boundaries and every selected value still require normal category review.", "MEDIUM", "CF27_XBOX_SOURCE_2026_08_02_001_tl_005_eye_shape_155p5s.png", 155.5),
  tl("001", 160, 184, "option_change", "Create Player > Player > Appearance > Head & Skin", "Eye Color", "Selected eye-color labels visible in recording; representative frame only.", "Eye Color traversal is present. This clip supplements but does not replace existing category evidence review.", "MEDIUM", "CF27_XBOX_SOURCE_2026_08_02_001_tl_006_eye_color_170p5s.png", 170.5),
  tl("001", 185, 199, "option_change", "Create Player > Player > Appearance > Head & Skin", "Nose", "Selected nose labels visible in recording; representative frame only.", "Nose traversal is present but duplicate/order concerns remain a later review task.", "MEDIUM", "CF27_XBOX_SOURCE_2026_08_02_001_tl_007_nose_190p5s.png", 190.5),
  tl("001", 200, 209, "option_change", "Create Player > Player > Appearance > Head & Skin", "Ear Shape", "Selected ear-shape label visible in recording; representative frame only.", "Ear Shape appears briefly; frame is useful for menu/category traceability but does not prove both ears or full category completion.", "MEDIUM", "CF27_XBOX_SOURCE_2026_08_02_001_tl_008_ear_shape_205p5s.png", 205.5),
  tl("001", 210, 219, "option_change", "Create Player > Player > Appearance > Head & Skin", "Mouth Shape", "Heavy", "Selected native Mouth Shape label Heavy is directly readable; grid appears fully visible, but production still needs second verification.", "HIGH", "CF27_XBOX_SOURCE_2026_08_02_001_tl_009_mouth_shape_215p5s.png", 215.5),
  tl("001", 220, 229, "option_change", "Create Player > Player > Appearance > Head & Skin", "Jaw Shape", "Square", "Selected native Jaw Shape label Square is directly readable; grid appears fully visible, but production still needs second verification.", "HIGH", "CF27_XBOX_SOURCE_2026_08_02_001_tl_010_jaw_shape_225p5s.png", 225.5),
  tl("001", 230, 240.24, "option_change", "Create Player > Player > Appearance > Head & Skin", "Chin", "Square", "Selected native Chin label Square is directly readable; grid appears fully visible, but production still needs second verification.", "HIGH", "CF27_XBOX_SOURCE_2026_08_02_001_tl_011_chin_235p0s.png", 235),
  tl("002", 0, 4, "menu_transition", "Create Player > Player", "Appearance menu / Hair row", "", "Appearance menu begins on Hair row before opening Hair controls.", "MEDIUM", "", null),
  tl("002", 5, 99, "option_change", "Create Player > Player > Appearance > Hair", "Hair Style", "Short Curly", "Selected native Hair Style label Short Curly is directly readable. Broader traversal is visible but not all labels are cataloged by this intake.", "HIGH", "CF27_XBOX_SOURCE_2026_08_02_002_tl_002_hair_style_5p5s.png", 5.5),
  tl("002", 100, 174, "option_change", "Create Player > Player > Appearance > Hair", "Hair Color", "Light Brown", "Selected native Hair Color label Light Brown is directly readable, but the selector is scrolled so native order remains unresolved.", "HIGH", "CF27_XBOX_SOURCE_2026_08_02_002_tl_003_hair_color_100p5s.png", 100.5),
  tl("002", 175, 224, "option_change", "Create Player > Player > Appearance > Hair", "Facial Hair Style", "Mutton Chops", "Selected native Facial Hair Style label Mutton Chops is directly readable, but the selector is scrolled so native order remains unresolved.", "HIGH", "CF27_XBOX_SOURCE_2026_08_02_002_tl_004_facial_hair_style_175p5s.png", 175.5),
  tl("002", 225, 235.35, "option_change", "Create Player > Player > Appearance > Hair", "Facial Hair Color", "Purple", "Selected native Facial Hair Color label Purple is directly readable, but the selector is scrolled so native order remains unresolved.", "HIGH", "CF27_XBOX_SOURCE_2026_08_02_002_tl_005_facial_hair_color_225p5s.png", 225.5),
  tl("003", 0, 4, "menu_transition", "Create Player > Player", "Player body / Styles entry", "", "Recording begins in Player context before Styles row review.", "MEDIUM", "", null),
  tl("003", 5, 74, "option_change", "Create Player > Player > Styles", "QB Throw Style", "Over the Top 2", "Styles screen visible with QB Throw Style and other body/context rows. This is not facial-appearance catalog evidence.", "HIGH", "CF27_XBOX_SOURCE_2026_08_02_003_tl_002_styles_throw_style_5p5s.png", 5.5),
  tl("003", 75, 124, "option_change", "Create Player > Player > Styles", "Run Style", "Default / visible style values", "Run Style and related rows appear during traversal; used for context/dependency gap tracking only.", "MEDIUM", "CF27_XBOX_SOURCE_2026_08_02_003_tl_003_styles_run_style_75p5s.png", 75.5),
  tl("003", 125, 154, "option_change", "Create Player > Player > Styles", "QB Under Center Stance", "Visible stance values", "Under-center stance options are visible; no facial recommendation should use this evidence.", "MEDIUM", "CF27_XBOX_SOURCE_2026_08_02_003_tl_004_styles_under_center_stance_125p5s.png", 125.5),
  tl("003", 155, 163.8, "option_change", "Create Player > Player > Styles", "2-Point Stance rows", "Visible stance values", "Two-point stance rows are visible; no facial recommendation should use this evidence.", "MEDIUM", "CF27_XBOX_SOURCE_2026_08_02_003_tl_005_styles_point_stance_155p5s.png", 155.5)
];

const supplementalCandidates = [
  candidate("CF27_XBOXUNKNOWN_RTG_HAIRSTYLE_SHORT_CURLY", "Hairstyles", "hairstyles", 1, "Short Curly", "002", "CF27_XBOX_SOURCE_2026_08_02_002-tl-002", 5.5, "5-99", "phase0-frame-CF27_XBOX_SOURCE_2026_08_02_002-tl-002", "data/phase-zero/derivative-frames/august-2026-source-recordings/CF27_XBOX_SOURCE_2026_08_02_002_tl_002_hair_style_5p5s.png", { firstSelectorOptionKnown: true }),
  candidate("CF27_XBOXUNKNOWN_RTG_HAIRCOLOR_LIGHT_BROWN", "Hair colors", "hair-colors", null, "Light Brown", "002", "CF27_XBOX_SOURCE_2026_08_02_002-tl-003", 100.5, "100-174", "phase0-frame-CF27_XBOX_SOURCE_2026_08_02_002-tl-003", "data/phase-zero/derivative-frames/august-2026-source-recordings/CF27_XBOX_SOURCE_2026_08_02_002_tl_003_hair_color_100p5s.png", { ambiguous: true }),
  candidate("CF27_XBOXUNKNOWN_RTG_FACIALHAIR_MUTTON_CHOPS", "Facial hair", "facial-hair", null, "Mutton Chops", "002", "CF27_XBOX_SOURCE_2026_08_02_002-tl-004", 175.5, "175-224", "phase0-frame-CF27_XBOX_SOURCE_2026_08_02_002-tl-004", "data/phase-zero/derivative-frames/august-2026-source-recordings/CF27_XBOX_SOURCE_2026_08_02_002_tl_004_facial_hair_style_175p5s.png", { ambiguous: true }),
  candidate("CF27_XBOXUNKNOWN_RTG_FACIALHAIRCOLOR_PURPLE", "Facial-hair colors", "facial-hair-colors", null, "Purple", "002", "CF27_XBOX_SOURCE_2026_08_02_002-tl-005", 225.5, "225-235.35", "phase0-frame-CF27_XBOX_SOURCE_2026_08_02_002-tl-005", "data/phase-zero/derivative-frames/august-2026-source-recordings/CF27_XBOX_SOURCE_2026_08_02_002_tl_005_facial_hair_color_225p5s.png", { ambiguous: true }),
  candidate("CF27_XBOXUNKNOWN_RTG_MOUTHSHAPE_HEAVY", "Mouth Shape", "mouth-shape", 7, "Heavy", "001", "CF27_XBOX_SOURCE_2026_08_02_001-tl-009", 215.5, "210-219", "phase0-frame-CF27_XBOX_SOURCE_2026_08_02_001-tl-009", "data/phase-zero/derivative-frames/august-2026-source-recordings/CF27_XBOX_SOURCE_2026_08_02_001_tl_009_mouth_shape_215p5s.png", { firstSelectorOptionKnown: true, finalSelectorOptionKnown: true }),
  candidate("CF27_XBOXUNKNOWN_RTG_JAWSHAPE_SQUARE", "Jaw Shape", "jaw-shape", 2, "Square", "001", "CF27_XBOX_SOURCE_2026_08_02_001-tl-010", 225.5, "220-229", "phase0-frame-CF27_XBOX_SOURCE_2026_08_02_001-tl-010", "data/phase-zero/derivative-frames/august-2026-source-recordings/CF27_XBOX_SOURCE_2026_08_02_001_tl_010_jaw_shape_225p5s.png", { firstSelectorOptionKnown: true, finalSelectorOptionKnown: true }),
  candidate("CF27_XBOXUNKNOWN_RTG_CHIN_SQUARE", "Chin", "chin", 2, "Square", "001", "CF27_XBOX_SOURCE_2026_08_02_001-tl-011", 235, "230-240.24", "phase0-frame-CF27_XBOX_SOURCE_2026_08_02_001-tl-011", "data/phase-zero/derivative-frames/august-2026-source-recordings/CF27_XBOX_SOURCE_2026_08_02_001_tl_011_chin_235p0s.png", { firstSelectorOptionKnown: true, finalSelectorOptionKnown: true })
];

const outputPaths = {
  batchJson: "data/phase-zero/august_2026_source_recordings_ingest.json",
  batchCsv: "data/phase-zero/august_2026_source_recordings_ingest.csv",
  candidatesJson: "data/phase-zero/august_2026_intake_candidates.json",
  candidatesCsv: "data/phase-zero/august_2026_intake_candidates.csv",
  reportDoc: "docs/phase-zero/AUGUST_CF27_SOURCE_RECORDINGS_INGEST.md"
};

function main() {
  const checkOnly = process.argv.includes("--check");
  const artifacts = buildArtifacts();
  const files = [
    ...updateCoreArtifacts(artifacts),
    ...updateCategoryArtifacts(artifacts),
    [outputPaths.batchJson, `${JSON.stringify(artifacts.report, null, 2)}\n`],
    [outputPaths.batchCsv, csv(artifacts.timeline, ["timeline_record_id", "video_id", "start_timestamp", "end_timestamp", "visible_menu_label", "visible_option_label", "confidence", "extracted_frame_path"])],
    [outputPaths.candidatesJson, `${JSON.stringify({ schemaVersion: `${schemaVersion}-candidates`, generatedAt, productionStatus: "NOT_PRODUCTION_DATA", verificationStatus: "OBSERVED_PENDING_PRIMARY_REVIEW", productionRecommendationsEnabled: false, candidates: supplementalCandidates }, null, 2)}\n`],
    [outputPaths.candidatesCsv, csv(supplementalCandidates, ["candidateID", "category", "nativeOrder", "nativeVisibleLabelOrIndex", "sourceVideoID", "sourceTimestampRange", "evidenceIDs", "evidenceFiles", "productionRecommendationsEnabled"])],
    [outputPaths.reportDoc, markdown(artifacts)]
  ];

  if (checkOnly) {
    const mismatches = files.filter(([relativePath, content]) => readIfExists(relativePath) !== content).map(([relativePath]) => relativePath);
    if (mismatches.length) {
      console.error(`August CF27 source recording ingest check failed. Mismatched files:\n${mismatches.join("\n")}`);
      process.exit(1);
    }
    console.log("August CF27 source recording ingest check passed.");
    return;
  }
  for (const [relativePath, content] of files) write(relativePath, content);
  console.log("Wrote August CF27 source recording intake artifacts.");
}

function buildArtifacts() {
  const videos = sourceVideos.map((video, index) => {
    const relativePath = `${sourceFolder}/${video.originalFilename}`;
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) throw new Error(`Missing source video: ${relativePath}`);
    const stat = fs.statSync(absolutePath);
    return {
      ...video,
      manifestSequence: null,
      discoveredFilename: video.originalFilename,
      canonicalFilename: video.originalFilename,
      sourceLocation: {
        rootToken: "REPOSITORY_IGNORED_SOURCE_MEDIA",
        portableRelativeEvidencePath: relativePath,
        absoluteDiscoveryPathInternal: absolutePath
      },
      manifestMatch: {
        status: "new_august_2026_owner_recording_not_in_relabeled_manifest",
        expectedDurationSeconds: video.durationSeconds,
        manifestNotes: "Physical folder is source-media/NCAA 26, but filename/content show College Football 27."
      },
      sha256: sha256(relativePath),
      fileSizeBytes: stat.size,
      ...mediaTechnicalDefaults,
      matchedManifestRow: false,
      exactDuplicate: false,
      exactDuplicateOf: null,
      likelyDuplicateOf: null,
      conditionAssessment: "opens_successfully_new_owner_recording_partial_catalog_scope",
      suitability: {
        menuEvidence: true,
        countEvidence: index === 0 || index === 1,
        orderingEvidence: index === 0 || index === 1,
        visualComparison: true,
        productionQualityCatalogImagery: false
      },
      productionUseStatus: "NOT_PRODUCTION_DATA_RESEARCH_ONLY",
      gitTrackingStatus: "ignored_untracked_source_media",
      sourceFolderMismatch: {
        physicalFolder: sourceFolder,
        contentGame: "EA SPORTS College Football 27",
        note: "Do not relabel physical source path as College Football 26 or NCAA 26."
      }
    };
  });
  const timeline = timelineRecords.map((record) => {
    const video = videos.find((item) => item.inventoryId.endsWith(record.videoSuffix));
    return {
      ...record,
      video_id: video.inventoryId,
      original_filename: video.originalFilename,
      canonical_filename: video.canonicalFilename,
      source_video_checksum: video.sha256
    };
  });
  const derivatives = timeline
    .filter((record) => record.extracted_frame_path)
    .map((record) => derivativeEvidence(record));
  return {
    videos,
    timeline,
    derivatives,
    report: {
      schemaVersion,
      generatedAt,
      productionStatus: "NOT_PRODUCTION_DATA",
      verificationStatus: "OBSERVED_PENDING_VERIFICATION",
      productionRecommendationsEnabled: false,
      sourceFolderMismatch: {
        physicalFolder: sourceFolder,
        normalizedGame: "EA SPORTS College Football 27",
        action: "Recorded as mismatch; source files were not moved or renamed."
      },
      summary: {
        newSourceVideos: videos.length,
        timelineRecords: timeline.length,
        derivativeEvidenceFrames: derivatives.length,
        supplementalResearchCandidates: supplementalCandidates.length,
        secondVerifiedRecordsAdded: 0,
        productionApprovedRecordsAdded: 0,
        productionCatalogRecordsAdded: 0
      },
      videos,
      timeline,
      derivatives,
      supplementalCandidates,
      openIssueDisposition: openIssueDisposition(),
      duplicateReviewFindings: duplicateFindings(),
      environmentEvidence: environmentEvidence()
    }
  };
}

function updateCoreArtifacts({ videos, timeline, derivatives }) {
  const inventory = readJson("data/phase-zero/video_inventory.json");
  inventory.generatedAt = generatedAt;
  inventory.inventory = upsertBy(inventory.inventory ?? [], videos.map(videoInventoryRow), "inventoryId");
  inventory.summary = {
    ...inventory.summary,
    inventoryRows: inventory.inventory.length,
    filesFound: inventory.inventory.length,
    filesOpenSuccessfully: inventory.inventory.filter((item) => item.fileOpenStatus === "opens").length,
    uniqueVideoFiles: (inventory.inventory ?? []).filter((item) => !item.exactDuplicate).length,
    totalUniqueDurationSeconds: round2((inventory.inventory ?? []).filter((item) => !item.exactDuplicate).reduce((sum, item) => sum + Number(item.durationSeconds ?? 0), 0))
  };

  const evidence = readJson("data/phase-zero/evidence_manifest.json");
  evidence.generatedAt = generatedAt;
  evidence.updatedAt = generatedAt;
  const sourceEntries = videos.map(sourceEvidenceEntry);
  evidence.entries = upsertBy(evidence.entries ?? [], [...sourceEntries, ...derivatives], "evidence_id");
  evidence.summary = {
    entries: evidence.entries.length,
    sourceMasters: evidence.entries.filter((entry) => entry.master_or_derivative === "master").length,
    derivatives: evidence.entries.filter((entry) => entry.master_or_derivative === "derivative").length,
    generatedTimelineDerivatives: evidence.entries.filter((entry) => entry.file_role === "phase_zero_august_2026_timeline_derivative").length
  };

  const timelineJson = readJson("data/phase-zero/video_timeline.json");
  timelineJson.generatedAt = generatedAt;
  timelineJson.records = upsertBy(timelineJson.records ?? [], timeline.map(timelineRow), "timeline_record_id");
  timelineJson.videoProcessingResults = upsertBy(timelineJson.videoProcessingResults ?? [], videos.map(videoProcessingResult), "video_id");
  timelineJson.summary = {
    ...timelineJson.summary,
    videosCovered: new Set(timelineJson.records.map((record) => record.video_id)).size,
    sourceVideosProcessed: (inventory.inventory ?? []).length,
    fullyProcessedVideos: (timelineJson.videoProcessingResults ?? []).filter((item) => (item.processingResult ?? item.processing_result) === "FULLY_PROCESSED").length,
    timelineRecords: timelineJson.records.length,
    sourceEvents: timelineJson.records.length,
    optionChangeEvents: timelineJson.records.filter((record) => record.event_type === "option_change").length,
    menuTransitionEvents: timelineJson.records.filter((record) => record.event_type === "menu_transition").length,
    recordsWithFrames: timelineJson.records.filter((record) => record.extracted_frame_path).length,
    sourceMasterEvidenceEntries: evidence.summary.sourceMasters,
    derivativeEvidenceEntries: evidence.summary.derivatives
  };

  const captureLog = readJson("data/phase-zero/capture_log.json");
  captureLog.generatedAt = generatedAt;
  captureLog.updatedAt = generatedAt;
  captureLog.events = upsertBy(captureLog.events ?? [], timeline.map(captureEvent), "capture_event_id");
  captureLog.summary = {
    events: captureLog.events.length,
    eventsWithEvidence: captureLog.events.filter((event) => event.evidence_generated?.length).length,
    eventsWithIssues: captureLog.events.filter((event) => event.issue_detected?.length).length
  };

  return [
    ["data/phase-zero/video_inventory.json", `${JSON.stringify(inventory, null, 2)}\n`],
    ["data/phase-zero/video_inventory.csv", csv(inventory.inventory, ["inventoryId", "manifestSequence", "originalFilename", "discoveredFilename", "canonicalFilename", "sourceLocation.portableRelativeEvidencePath", "sha256", "fileSizeBytes", "mediaContainer", "videoCodec", "audioCodec", "durationSeconds", "dimensions.width", "dimensions.height", "frameRate", "fileOpenStatus", "manifestMatch.status", "exactDuplicate", "exactDuplicateOf", "likelyDuplicateOf", "expectedContent", "observedContent", "conditionAssessment", "suitability.menuEvidence", "suitability.countEvidence", "suitability.orderingEvidence", "suitability.visualComparison", "suitability.productionQualityCatalogImagery", "productionUseStatus"])],
    ["data/phase-zero/evidence_manifest.json", `${JSON.stringify(evidence, null, 2)}\n`],
    ["data/phase-zero/evidence_manifest.csv", csv(evidence.entries, ["evidence_id", "timeline_record_id", "video_id", "relative_path", "master_or_derivative", "file_role", "sha256", "size_bytes", "mime_type", "source_video", "timestamp", "verification_state", "notes"])],
    ["data/phase-zero/video_timeline.json", `${JSON.stringify(timelineJson, null, 2)}\n`],
    ["data/phase-zero/video_timeline.csv", csv(timelineJson.records, ["video_id", "original_filename", "canonical_filename", "source_video_checksum", "start_timestamp", "end_timestamp", "event_type", "parent_menu", "visible_menu_label", "visible_option_label", "visible_option_index", "native_order", "observed_action", "confidence", "transition_active", "transition_contamination", "blur_present", "obstruction_present", "model_fully_loaded", "menu_cursor_hides_relevant_information", "canonical_settings_changed", "usable_for_count", "usable_for_order", "usable_for_visual_analysis", "extracted_frame_path", "notes"])],
    ["data/phase-zero/capture_log.json", `${JSON.stringify(captureLog, null, 2)}\n`],
    ["data/phase-zero/capture_log.csv", csv(captureLog.events, ["capture_event_id", "timeline_record_id", "video_id", "start_timestamp", "end_timestamp", "category", "native_option", "action", "evidence_generated", "issue_detected", "verification_state", "notes", "head_research_catalog_id", "head_native_option_number", "head_research_flags"])]
  ];
}

function updateCategoryArtifacts({ report }) {
  return [
    ...categoryArtifact("hairstyles", "data/phase-zero/hairstyles.research.json", "data/phase-zero/hairstyles.research.csv", [supplementalCandidates[0]], "cf27-hairstyle-research-catalog-v1"),
    ...categoryArtifact("hair_colors", "data/phase-zero/hair_colors.research.json", "data/phase-zero/hair_colors.research.csv", [supplementalCandidates[1]], "cf27-hair-color-research-catalog-v1"),
    ...categoryArtifact("facial_hair", "data/phase-zero/facial_hair.research.json", "data/phase-zero/facial_hair.research.csv", [supplementalCandidates[2]], "cf27-facial-hair-research-catalog-v1"),
    ...categoryArtifact("facial_hair_colors", "data/phase-zero/facial_hair_colors.research.json", "data/phase-zero/facial_hair_colors.research.csv", [supplementalCandidates[3]], "cf27-facial-hair-color-research-catalog-v1"),
    ...detailedControlArtifact(report)
  ];
}

function categoryArtifact(kind, jsonPath, csvPath, candidates, schemaVersionValue) {
  const catalog = readJson(jsonPath);
  catalog.generatedAt = generatedAt;
  catalog.verificationStatus = "OBSERVED_PENDING_VERIFICATION";
  catalog.productionRecommendationsEnabled = false;
  catalog.summary = {
    ...catalog.summary,
    recordCount: candidates.length,
    productionEligibleRecords: 0,
    nativeOrderStatus: candidates.some((item) => item.nativeOrder === null) ? "PARTIAL_ORDER_UNRESOLVED" : "PARTIAL_ORDER_OBSERVED",
    countStatus: "COUNT_UNKNOWN",
    evidenceExtractionStatus: "PARTIAL_AUGUST_2026_SELECTED_VALUE_EVIDENCE_AVAILABLE",
    recaptureRequired: true,
    blocker: "August 2026 source recordings provide directly selected values, but complete selector boundaries, repeat counts, dependencies, and second verification remain unresolved."
  };
  catalog.sourceEvidence = {
    ...(catalog.sourceEvidence ?? {}),
    august2026SourceRecordings: candidates.map((item) => ({ candidateID: item.candidateID, evidenceIDs: item.evidenceIDs, evidenceFiles: item.evidenceFiles, sourceTimestampRange: item.sourceTimestampRange }))
  };
  catalog.records = candidates.map(categoryRecord);
  return [
    [jsonPath, `${JSON.stringify(catalog, null, 2)}\n`],
    [csvPath, csv(catalog.records, Object.keys(catalog.records[0] ?? { stableResearchID: "", nativeOrder: "", nativeGameLabel: "", nativeIndex: "", sourceVideoID: "", sourceTimestamp: "", verificationStatus: "", productionStatus: "" }))],
    [`docs/phase-zero/${kind.toUpperCase()}_AUGUST_2026_UPDATE.md`, `# ${kind.replaceAll("_", " ")} August 2026 Update\n\nStatus: **NOT PRODUCTION DATA**\n\nAugust 2026 source recordings added ${candidates.length} directly observed selected value(s) for this category. Complete selector boundaries, repeat counts, dependency tests, second verification, and catalog-manager approval are still required.\n`]
  ];
}

function detailedControlArtifact(report) {
  const jsonPath = "data/phase-zero/detailed_facial_controls.research.json";
  const catalog = readJson(jsonPath);
  const records = (catalog.records ?? []).filter((record) => !["CF27_XBOXUNKNOWN_RTG_MOUTHSHAPE_HEAVY", "CF27_XBOXUNKNOWN_RTG_JAWSHAPE_SQUARE", "CF27_XBOXUNKNOWN_RTG_CHIN_SQUARE"].includes(record.detailedControlID));
  records.push(...supplementalCandidates.slice(4).map((candidateItem) => ({
    detailedControlID: candidateItem.candidateID,
    nativeControlLabel: candidateItem.category,
    nativeDisplayLabel: candidateItem.nativeVisibleLabelOrIndex,
    nativeOptionNumber: null,
    nativeOrder: candidateItem.nativeOrder,
    valueKind: "named_geometry_option",
    dataClass: "RESEARCH_CANDIDATE",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "OBSERVED_PENDING_VERIFICATION",
    evidenceFramePath: candidateItem.evidenceFiles[0],
    sourceTimestampRange: candidateItem.sourceTimestampRange,
    recommendationSuitability: "UNSUITABLE_RESEARCH_ONLY_NOT_VERIFIED",
    sourceVideoID: candidateItem.sourceVideoID,
    evidenceIDs: candidateItem.evidenceIDs,
    primaryReview: {
      status: candidateItem.nativeOrder === null ? "ORDER_UNRESOLVED" : "PRIMARY_APPROVED_WITH_NOTES",
      notes: "August 2026 selected-value evidence; production remains blocked."
    }
  })));
  catalog.generatedAt = generatedAt;
  catalog.records = records;
  catalog.summary = {
    ...(catalog.summary ?? {}),
    directlyObservedValueCount: records.length,
    august2026SupplementalValues: supplementalCandidates.slice(4).length,
    productionEligibleRecordCount: 0
  };
  return [
    [jsonPath, `${JSON.stringify(catalog, null, 2)}\n`],
    ["data/phase-zero/detailed_facial_controls.research.csv", csv(records, ["detailedControlID", "nativeControlLabel", "nativeDisplayLabel", "nativeOptionNumber", "nativeOrder", "valueKind", "productionStatus", "verificationStatus", "evidenceFramePath", "sourceTimestampRange", "recommendationSuitability"])],
    ["docs/phase-zero/DETAILED_FACIAL_CONTROLS_AUGUST_2026_UPDATE.md", "# Detailed Facial Controls August 2026 Update\n\nStatus: **NOT PRODUCTION DATA**\n\nThe August 2026 source recording directly opens Mouth Shape, Jaw Shape, and Chin. Selected values Heavy, Square, and Square were added as supplemental research candidates. They remain unverified and production-blocked.\n"]
  ];
}

function tl(videoSuffix, start, end, eventType, parentMenu, visibleMenuLabel, visibleOptionLabel, notes, confidence, frame, frameTimestamp) {
  const next = (timelineCounters.get(videoSuffix) ?? 0) + 1;
  timelineCounters.set(videoSuffix, next);
  const id = `CF27_XBOX_SOURCE_2026_08_02_${videoSuffix}-tl-${String(next).padStart(3, "0")}`;
  return {
    timeline_record_id: id,
    videoSuffix,
    start_timestamp: start,
    end_timestamp: end,
    event_type: eventType,
    parent_menu: parentMenu,
    visible_menu_label: visibleMenuLabel,
    visible_option_label: visibleOptionLabel,
    visible_option_index: null,
    native_order: null,
    observed_action: eventType === "option_change" ? "selected_option_observed_or_traversed" : "timeline_observation",
    confidence,
    transition_active: false,
    transition_contamination: "NO",
    blur_present: false,
    obstruction_present: false,
    model_fully_loaded: "VISIBLE_PREVIEW_LOADED_FOR_EXTRACTED_FRAME",
    menu_cursor_hides_relevant_information: "NO",
    canonical_settings_changed: "YES_SETTING_CHANGES_OBSERVED_ACROSS_TRAVERSAL",
    usable_for_count: false,
    usable_for_order: confidence === "HIGH",
    usable_for_visual_analysis: Boolean(frame),
    extracted_frame_path: frame ? `data/phase-zero/derivative-frames/august-2026-source-recordings/${frame}` : "",
    extracted_frame_timestamp: frameTimestamp,
    verification_status: "OBSERVED_PENDING_VERIFICATION",
    notes
  };
}

function candidate(candidateID, category, categoryID, nativeOrder, nativeVisibleLabelOrIndex, videoSuffix, timelineRecordID, sourceTimestamp, sourceTimestampRange, evidenceID, evidencePath, overrides = {}) {
  return {
    candidateID,
    category,
    categoryID,
    nativeOrder,
    nativeVisibleLabelOrIndex,
    sourceVideoID: `CF27_XBOX_SOURCE_2026_08_02_${videoSuffix}`,
    sourceVideoFilename: sourceVideos.find((video) => video.inventoryId.endsWith(videoSuffix)).originalFilename,
    originalFilename: sourceVideos.find((video) => video.inventoryId.endsWith(videoSuffix)).originalFilename,
    sourceTimestamp,
    sourceTimestampRange,
    evidenceIDs: [evidenceID],
    evidenceFiles: [evidencePath],
    sourceObservations: [{ timelineRecordID, evidenceID, evidenceFramePath: evidencePath }],
    selectedValueVisible: true,
    categoryVisible: true,
    optionTransitionObservable: true,
    neighboringOptionsEstablishOrdering: nativeOrder === null ? "VISIBLE_NEIGHBORS_BUT_SCROLLED_ORDER_UNRESOLVED" : "VISIBLE_GRID_ORDER_SUPPORTS_SELECTED_VALUE_ORDER_WITHIN_OBSERVED_VIEW",
    firstSelectorOptionKnown: false,
    finalSelectorOptionKnown: false,
    selectorWrapKnown: false,
    framingSufficient: false,
    visualFeaturesUnobstructed: false,
    evidenceConditionsConsistent: false,
    duplicated: false,
    ambiguous: false,
    unsupportedInterpretation: false,
    productionRecommendationsEnabled: false,
    notes: ["Directly selected native label is readable in the cited August 2026 frame."],
    ...overrides
  };
}

function videoInventoryRow(video) {
  return video;
}

function sourceEvidenceEntry(video) {
  return {
    evidence_id: `phase0-source-${video.inventoryId}`,
    timeline_record_id: "",
    video_id: video.inventoryId,
    relative_path: video.sourceLocation.portableRelativeEvidencePath,
    master_or_derivative: "master",
    file_role: "phase_zero_source_master",
    sha256: video.sha256,
    size_bytes: video.fileSizeBytes,
    mime_type: video.mimeType,
    source_video: video.canonicalFilename,
    timestamp: null,
    verification_state: "OBSERVED_PENDING_VERIFICATION",
    notes: "Ignored immutable owner-supplied source master; not committed to Git. Physical folder name is source-media/NCAA 26 but filename/content identify College Football 27."
  };
}

function derivativeEvidence(record) {
  const relativePath = record.extracted_frame_path;
  const stat = fs.statSync(path.join(root, relativePath));
  return {
    evidence_id: `phase0-frame-${record.timeline_record_id}`,
    timeline_record_id: record.timeline_record_id,
    video_id: record.video_id,
    relative_path: relativePath,
    master_or_derivative: "derivative",
    file_role: "phase_zero_august_2026_timeline_derivative",
    sha256: sha256(relativePath),
    size_bytes: stat.size,
    mime_type: "image/png",
    source_video: record.canonical_filename,
    timestamp: record.extracted_frame_timestamp,
    verification_state: "OBSERVED_PENDING_VERIFICATION",
    notes: "Full-resolution August 2026 source-recording derivative; original aspect ratio preserved and menu labels retained."
  };
}

function timelineRow(record) {
  const { videoSuffix, extracted_frame_timestamp, ...row } = record;
  return row;
}

function captureEvent(record) {
  const evidenceID = record.extracted_frame_path ? `phase0-frame-${record.timeline_record_id}` : "";
  const issues = [];
  if (record.visible_menu_label.includes("Hair") || record.visible_menu_label.includes("Color")) issues.push("PARTIAL_SELECTOR_BOUNDARY_STILL_REQUIRED");
  if (record.visible_option_label && ["Light Brown", "Mutton Chops", "Purple"].includes(record.visible_option_label)) issues.push("ORDER_UNRESOLVED_SCROLLED_SELECTOR");
  return {
    capture_event_id: `capture-${record.timeline_record_id}`,
    timeline_record_id: record.timeline_record_id,
    video_id: record.video_id,
    start_timestamp: record.start_timestamp,
    end_timestamp: record.end_timestamp,
    category: record.visible_menu_label,
    native_option: record.visible_option_label || null,
    action: record.observed_action,
    evidence_generated: evidenceID ? [evidenceID] : [],
    issue_detected: issues,
    verification_state: "OBSERVED_PENDING_VERIFICATION",
    notes: record.notes,
    head_research_catalog_id: "",
    head_native_option_number: "",
    head_research_flags: []
  };
}

function videoProcessingResult(video) {
  return {
    video_id: video.inventoryId,
    original_filename: video.originalFilename,
    canonical_filename: video.canonicalFilename,
    processingResult: "FULLY_PROCESSED",
    sourceHash: video.sha256,
    categoriesRepresented: timelineRecords.filter((record) => video.inventoryId.endsWith(record.videoSuffix)).map((record) => record.visible_menu_label),
    notes: "August 2026 recording inspected end-to-end at segment level; partial candidates are research-only."
  };
}

function categoryRecord(item) {
  return {
    stableResearchID: item.candidateID,
    nativeOrder: item.nativeOrder,
    nativeGameLabel: item.nativeVisibleLabelOrIndex,
    nativeIndex: null,
    sourceVideoID: item.sourceVideoID,
    sourceTimestamp: item.sourceTimestamp,
    menuEvidencePath: item.evidenceFiles[0],
    frontEvidencePath: item.evidenceFiles[0],
    evidenceIDs: item.evidenceIDs,
    selectedValueVisible: true,
    selectorBoundaryStatus: item.finalSelectorOptionKnown ? "OBSERVED_GRID_BOUNDARY_IN_FRAME_PENDING_VERIFICATION" : "BOUNDARIES_UNKNOWN",
    selectorWrapStatus: "NOT_DEMONSTRATED",
    defaultStatus: "DEFAULT_NOT_DEMONSTRATED",
    dependencyObservations: "UNKNOWN_NOT_TESTED",
    verificationStatus: "OBSERVED_PENDING_VERIFICATION",
    productionStatus: "NOT_PRODUCTION_DATA",
    productionRecommendationsEnabled: false,
    recaptureStatus: "RECAPTURE_REQUIRED_FOR_COMPLETE_SELECTOR_AND_PRODUCTION_STANDARDIZATION"
  };
}

function openIssueDisposition() {
  return [
    { issueFamily: "hairstyles", disposition: "PARTIALLY_ADDRESSED", notes: "Hair Style control and Short Curly selected value are directly visible; complete count/order/boundaries remain required." },
    { issueFamily: "hair_colors", disposition: "PARTIALLY_ADDRESSED", notes: "Hair Color control and Light Brown selected value are directly visible; native order and boundaries remain unresolved." },
    { issueFamily: "facial_hair", disposition: "PARTIALLY_ADDRESSED", notes: "Facial Hair Style control and Mutton Chops selected value are directly visible; native order and boundaries remain unresolved." },
    { issueFamily: "facial_hair_colors", disposition: "PARTIALLY_ADDRESSED", notes: "Facial Hair Color control and Purple selected value are directly visible; native order and boundaries remain unresolved." },
    { issueFamily: "mouth_jaw_chin", disposition: "PARTIALLY_ADDRESSED", notes: "Mouth Shape, Jaw Shape, and Chin controls were opened with readable selected values; second verification and production QA remain required." },
    { issueFamily: "environment_metadata", disposition: "NOT_ADDRESSED", notes: "No game version, patch, console model, edition, region, entitlement, HDR, or display model evidence was visible." },
    { issueFamily: "duplicate_review_required_records", disposition: "NOT_RESOLVED", notes: "New Head Template/Nose/Ear segments may help later human review but do not conclusively resolve the five existing duplicate-review records." }
  ];
}

function duplicateFindings() {
  return {
    status: "INCONCLUSIVE_REQUIRES_HUMAN_REVIEW",
    affectedExistingDuplicateCount: 5,
    finding: "New recordings contain supplemental Head Template, Nose, and Ear Shape context, but this ingest did not establish side-by-side native-order proof sufficient to resolve duplicate-review-required candidates."
  };
}

function environmentEvidence() {
  return {
    gameTitle: { status: "DIRECTLY_OBSERVED", value: "EA SPORTS College Football 27 visible in frame footer/logo." },
    platform: { status: "OWNER_REPORTED", value: "Xbox context remains owner-reported unless visible console evidence is supplied." },
    gameVersion: { status: "NOT_VISIBLE", value: null },
    patch: { status: "NOT_VISIBLE", value: null },
    consoleModel: { status: "NOT_VISIBLE", value: null },
    mode: { status: "DIRECTLY_OBSERVED", value: "Create Player / Road to Glory-style player creation context visible, but exact canonical path is not fully re-recorded in this batch." },
    creationPath: { status: "PARTIALLY_OBSERVED", value: "Create Player > Player > Appearance/Hair/Styles screens visible." }
  };
}

function markdown({ report }) {
  return `# August 2026 CF27 Source Recordings Ingest

Status: **NOT PRODUCTION DATA**
Generated: ${generatedAt}

## Summary

- New source recordings inventoried: ${report.summary.newSourceVideos}
- Timeline records added: ${report.summary.timelineRecords}
- Derivative frames linked: ${report.summary.derivativeEvidenceFrames}
- Supplemental research candidates: ${report.summary.supplementalResearchCandidates}
- Second-verified records added: 0
- Production-approved records added: 0
- Production catalog records added: 0

## Source Folder Mismatch

Physical folder: \`${sourceFolder}\`
Observed game: EA SPORTS College Football 27

The source files were not renamed, moved, trimmed, or recompressed.

## Recordings

${report.videos.map((video) => `### ${video.inventoryId}

- Original filename: \`${video.originalFilename}\`
- Relative path: \`${video.sourceLocation.portableRelativeEvidencePath}\`
- SHA-256: \`${video.sha256}\`
- Size: ${video.fileSizeBytes} bytes
- Duration: ${video.durationSeconds}s
- Resolution/frame rate: ${video.dimensions.width}x${video.dimensions.height} at about ${video.frameRate} fps
- Codec/container: ${video.videoCodec}; ${video.mediaContainerRaw}
- Opens successfully: ${video.fileOpenStatus}
- Observed content: ${video.observedContent}
`).join("\n")}

## Direct Candidate Observations

${supplementalCandidates.map((item) => `- ${item.candidateID}: ${item.category} = ${item.nativeVisibleLabelOrIndex}; source ${item.sourceVideoID} ${item.sourceTimestampRange}; production status NOT_PRODUCTION_DATA.`).join("\n")}

## Remaining Gaps

${openIssueDisposition().map((item) => `- ${item.issueFamily}: ${item.disposition}. ${item.notes}`).join("\n")}

## Production Gate

Production recommendations remain fail-closed. These recordings create or support research-only observations; they do not create second verification, catalog-manager approval, or production catalog records.
`;
}

function upsertBy(existing, additions, key) {
  const byKey = new Map(existing.map((item) => [item[key], item]));
  for (const item of additions) byKey.set(item[key], item);
  return [...byKey.values()].sort((a, b) => String(a[key]).localeCompare(String(b[key])));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readIfExists(relativePath) {
  const absolutePath = path.join(root, relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : "";
}

function write(relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content);
}

function sha256(relativePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex");
}

function csv(rows, columns) {
  return `${columns.join(",")}\n${rows.map((row) => columns.map((column) => cell(get(row, column))).join(",")).join("\n")}${rows.length ? "\n" : ""}`;
}

function get(row, dotted) {
  return dotted.split(".").reduce((value, part) => value?.[part], row);
}

function cell(value) {
  if (value == null) return "";
  const text = Array.isArray(value) || typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

main();
