#!/usr/bin/env node
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SOURCE_MEDIA_INGEST_SCHEMA_VERSION = "gfm-source-media-ingest-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultSourceRoot = "source-media";
const defaultIndexRoot = "data/source-media-index";
const defaultResearchRoot = "data/catalog-research";
const defaultArtifactRoot = "build-artifacts/source-media-ingestion";
const defaultRunID = () => {
  const date = new Date();
  const stamp = date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace("T", "_");
  return `GFM_MEDIA_INGEST_${stamp}`;
};

const supportedVideoExtensions = new Set([".mp4", ".mov", ".m4v", ".mkv", ".webm"]);
const supportedImageExtensions = new Set([".png", ".jpg", ".jpeg", ".heic", ".webp", ".gif"]);
const supportedAudioExtensions = new Set([".wav", ".m4a", ".aac"]);
const sidecarExtensions = new Set([".json", ".csv", ".txt", ".md"]);

const allowedViews = ["FULLSCREEN", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "REAR", "RIGHT_PROFILE", "RIGHT_3Q", "ELEVATED", "LOWERED", "MENU", "DEPENDENCY_TEST"];

export async function runSourceMediaIngest(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const sourceRoot = normalizeRelativePath(options.source ?? defaultSourceRoot);
  const runID = options.runID ?? defaultRunID();
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const indexRoot = normalizeRelativePath(options.indexRoot ?? defaultIndexRoot);
  const researchRoot = normalizeRelativePath(options.researchRoot ?? defaultResearchRoot);
  const artifactRoot = normalizeRelativePath(options.artifactRoot ?? defaultArtifactRoot);
  const checkOnly = Boolean(options.checkOnly);
  const writeOutputs = options.writeOutputs ?? !checkOnly;
  const generateProxies = Boolean(options.generateProxies);
  const generateContactSheets = Boolean(options.generateContactSheets);
  const extractFrames = Boolean(options.extractFrames);
  const prepareReviewQueue = options.prepareReviewQueue ?? true;
  const classify = options.classify ?? true;
  const rebuildDerived = Boolean(options.rebuildDerived);
  const mediaIDFilter = options.mediaID ?? null;

  const absoluteSourceRoot = path.resolve(root, sourceRoot);
  const tools = resolveTools(options);
  const priorManifest = readJsonIfExists(path.join(root, indexRoot, "source_media_manifest.json"));
  const sourceFiles = discoverSourceMediaFiles(absoluteSourceRoot, root);
  const previousRecordsByPath = new Map((priorManifest?.sources ?? []).map((record) => [record.original_relative_path, record]));
  const records = [];

  for (const discovered of sourceFiles) {
    const beforeHash = await sha256File(discovered.absolutePath);
    const detectedMimeType = detectMimeType(discovered.absolutePath, discovered.extension);
    const metadata = inspectMedia(discovered.absolutePath, discovered.extension, detectedMimeType, tools);
    const classification = classify ? classifySourceMedia(discovered, metadata, root) : unknownClassification();
    const sourceMediaID = stableSourceMediaID(classification.gameKey, beforeHash);
    if (mediaIDFilter && sourceMediaID !== mediaIDFilter) continue;
    const afterHash = await sha256File(discovered.absolutePath);
    const sourceRecord = buildSourceRecord({
      discovered,
      sourceMediaID,
      beforeHash,
      afterHash,
      detectedMimeType,
      metadata,
      classification,
      generatedAt,
      priorRecord: previousRecordsByPath.get(discovered.relativePath) ?? null
    });
    records.push(sourceRecord);
  }

  applyDuplicateDetection(records);
  applyNearDuplicateDetection(records);

  const selectedRecords = records.filter((record) => !mediaIDFilter || record.source_media_id === mediaIDFilter);
  const segments = buildSegments({ root, records: selectedRecords, generatedAt });
  const candidates = buildResearchCandidates({ root, records: selectedRecords, segments, generatedAt });
  const reviewQueue = prepareReviewQueue ? buildPrimaryReviewQueue(candidates, segments, generatedAt) : [];
  const verifierQueue = prepareReviewQueue ? buildSecondVerifierQueue(candidates, generatedAt) : [];
  const recaptureQueue = buildRecaptureQueue({ records: selectedRecords, candidates, segments, generatedAt });

  const artifactManifest = {
    schemaVersion: "gfm-source-media-artifacts-v1",
    generatedAt,
    runID,
    artifactRoot,
    productionStatus: "NOT_PRODUCTION_DATA",
    artifacts: []
  };

  if (generateProxies || generateContactSheets || extractFrames) {
    for (const record of selectedRecords) {
      if (record.processing_eligibility !== "eligible_video") continue;
      const sourcePath = path.join(root, record.original_relative_path);
      const artifactBase = path.join(root, artifactRoot, runID, record.suspected_game, record.source_media_id);
      if (generateProxies) {
        artifactManifest.artifacts.push(...generateReviewProxies({
          sourcePath,
          root,
          record,
          artifactBase,
          tools,
          rebuildDerived
        }));
      }
      if (extractFrames) {
        artifactManifest.artifacts.push(...extractTimestampedFrames({
          sourcePath,
          root,
          record,
          artifactBase,
          segments: segments.filter((segment) => segment.source_media_id === record.source_media_id),
          tools,
          rebuildDerived
        }));
      }
      if (generateContactSheets) {
        artifactManifest.artifacts.push(...generateContactSheetsForSource({
          sourcePath,
          root,
          record,
          artifactBase,
          tools,
          rebuildDerived
        }));
      }
    }
  }
  const standardizedViews = buildStandardizedViews({ generatedAt, artifactManifest, segments });

  const manifest = buildSourceManifest({ generatedAt, runID, sourceRoot, records, artifactManifest, tools });
  const segmentManifest = {
    schemaVersion: "gfm-source-media-segments-v1",
    generatedAt,
    productionStatus: "NOT_PRODUCTION_DATA",
    reviewStatus: "AUTOMATED_EXTRACTION_REQUIRES_HUMAN_REVIEW",
    segments
  };
  const candidateManifest = {
    schemaVersion: "gfm-catalog-research-candidates-v1",
    generatedAt,
    productionStatus: "NOT_PRODUCTION_DATA",
    productionPromotionAllowed: false,
    candidates
  };

  const outputs = buildOutputs({
    root,
    indexRoot,
    researchRoot,
    manifest,
    segmentManifest,
    artifactManifest,
    standardizedViews,
    candidateManifest,
    reviewQueue,
    verifierQueue,
    recaptureQueue,
    runbook: sourceMediaRunbook(),
    status: sourceMediaStatus({ manifest, segmentManifest, artifactManifest, standardizedViews, candidateManifest, reviewQueue, verifierQueue, recaptureQueue })
  });

  if (checkOnly) {
    const validation = validateSourceMediaOutputs({ root, indexRoot, researchRoot });
    if (!validation.ok) {
      console.error(`Source media ingestion check failed:\n${validation.errors.join("\n")}`);
      process.exitCode = 1;
    } else {
      console.log("Source media ingestion check passed.");
    }
    return { manifest, segmentManifest, artifactManifest, candidateManifest, reviewQueue, verifierQueue, recaptureQueue, validation };
  }

  if (writeOutputs) {
    for (const [relativePath, content] of outputs) {
      writeFile(path.join(root, relativePath), content);
    }
  }

  const validation = validateGeneratedRun({ root, manifest, segmentManifest, artifactManifest, candidateManifest });
  if (!validation.ok) {
    console.error(`Source media ingestion generated validation warnings/errors:\n${validation.errors.join("\n")}`);
    if (validation.unrecoverable) process.exitCode = 1;
  }

  console.log(`Source media ingest complete: ${manifest.summary.totalSourceFiles} files, ${segmentManifest.segments.length} segments, ${candidateManifest.candidates.length} research candidates.`);
  return { manifest, segmentManifest, artifactManifest, standardizedViews, candidateManifest, reviewQueue, verifierQueue, recaptureQueue, validation };
}

export function discoverSourceMediaFiles(sourceRootAbsolute, root = repositoryRoot) {
  if (!fs.existsSync(sourceRootAbsolute)) return [];
  const files = [];
  const stack = [sourceRootAbsolute];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
      } else if (entry.isFile()) {
        const stat = fs.statSync(absolutePath);
        const relativePath = normalizeRelativePath(path.relative(root, absolutePath));
        files.push({
          absolutePath,
          relativePath,
          originalFilename: path.basename(absolutePath),
          topLevelSourceFolder: topLevelSourceFolder(relativePath),
          extension: path.extname(absolutePath).toLowerCase(),
          sizeBytes: stat.size,
          filesystemModifiedAt: stat.mtime.toISOString()
        });
      }
    }
  }
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export function stableSourceMediaID(gameKey, sha256) {
  const key = String(gameKey || "UNKNOWN").toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return `GFM_MEDIA_${key}_${String(sha256).slice(0, 12).toUpperCase()}`;
}

export function classifySourceMedia(discovered, metadata, root = repositoryRoot) {
  const rel = discovered.relativePath.toLowerCase();
  const basename = discovered.originalFilename.toLowerCase();
  if (basename === ".ds_store" || basename.startsWith(".")) {
    return {
      ...unknownClassification(),
      notes: "Hidden/system file recorded for source-media disposition; not usable game evidence."
    };
  }
  const existingCf27 = readJsonIfExists(path.join(root, "data/phase-zero/august_2026_source_recordings_ingest.json"));
  const existingFc26 = readJsonIfExists(path.join(root, "data/research/fc26/player_creator_research.json"));
  const cf27Match = existingCf27?.videos?.find((video) => video.sourceLocation?.portableRelativeEvidencePath === discovered.relativePath || video.originalFilename === discovered.originalFilename);
  const fc26Match = existingFc26?.sourceVideos?.find((video) => video.relativePath === discovered.relativePath || video.originalFilename === discovered.originalFilename);

  if (cf27Match) {
    return {
      gameKey: "cf27",
      suspectedGame: "cf27",
      suspectedGameTitle: "EA SPORTS College Football 27",
      gameIdentificationConfidence: "high",
      gameIdentificationEvidence: ["existing_phase_zero_august_ingest_record", "owner_supplied_filename"],
      suspectedCategory: categoryFromCf27ObservedContent(cf27Match.observedContent),
      categoryIdentificationConfidence: "medium",
      categoryIdentificationEvidence: ["existing_phase_zero_august_ingest_record"],
      notes: discovered.topLevelSourceFolder === "NCAA 26" ? "Physical folder is source-media/NCAA 26; existing records identify this as College Football 27 evidence." : ""
    };
  }
  if (fc26Match) {
    return {
      gameKey: "fc26",
      suspectedGame: "fc26",
      suspectedGameTitle: "EA SPORTS FC 26",
      gameIdentificationConfidence: "high",
      gameIdentificationEvidence: ["existing_fc26_player_creator_research_record", "source_path"],
      suspectedCategory: "player_creator",
      categoryIdentificationConfidence: "medium",
      categoryIdentificationEvidence: ["existing_fc26_player_creator_research_record"],
      notes: "FC26 evidence remains isolated from College Football 27 records."
    };
  }
  if (rel.includes("fc26") || rel.includes("fc 26")) {
    return {
      gameKey: "fc26",
      suspectedGame: "fc26",
      suspectedGameTitle: "EA SPORTS FC 26",
      gameIdentificationConfidence: "low",
      gameIdentificationEvidence: ["path_or_filename_suggestion_only"],
      suspectedCategory: "unknown_category",
      categoryIdentificationConfidence: "low",
      categoryIdentificationEvidence: [],
      notes: "Filename/path suggests FC26, but no direct repository record matched."
    };
  }
  if (basename.includes("college football 27")) {
    return {
      gameKey: "cf27",
      suspectedGame: "cf27",
      suspectedGameTitle: "EA SPORTS College Football 27",
      gameIdentificationConfidence: "medium",
      gameIdentificationEvidence: ["filename_suggestion_only"],
      suspectedCategory: "unknown_category",
      categoryIdentificationConfidence: "low",
      categoryIdentificationEvidence: [],
      notes: "Filename suggests College Football 27; requires visual or manifest confirmation before verification."
    };
  }
  return unknownClassification();
}

export function unknownClassification() {
  return {
    gameKey: "unknown",
    suspectedGame: "unknown",
    suspectedGameTitle: null,
    gameIdentificationConfidence: "unknown",
    gameIdentificationEvidence: [],
    suspectedCategory: "unknown_category",
    categoryIdentificationConfidence: "unknown",
    categoryIdentificationEvidence: [],
    notes: "No safe game/category classification was available."
  };
}

function buildSourceRecord({ discovered, sourceMediaID, beforeHash, afterHash, detectedMimeType, metadata, classification, generatedAt, priorRecord }) {
  const mediaKind = mediaKindFor(discovered.extension, detectedMimeType);
  const eligible = metadata.opensSuccessfully && mediaKind === "video" ? "eligible_video"
    : metadata.opensSuccessfully && mediaKind === "image" ? "eligible_image"
      : mediaKind === "unsupported" ? "unsupported" : "metadata_only_or_unusable";
  return {
    source_media_id: sourceMediaID,
    original_filename: discovered.originalFilename,
    original_relative_path: discovered.relativePath,
    top_level_source_folder: discovered.topLevelSourceFolder,
    detected_mime_type: detectedMimeType,
    detected_container_type: metadata.containerType,
    file_extension: discovered.extension || null,
    file_size: discovered.sizeBytes,
    sha256: beforeHash,
    post_processing_sha256: afterHash,
    preservation_status: beforeHash === afterHash ? "UNCHANGED" : "CHANGED_STOP_REVIEW",
    video_duration: metadata.durationSeconds,
    width: metadata.width,
    height: metadata.height,
    display_aspect_ratio: aspectRatio(metadata.width, metadata.height),
    frame_rate: metadata.frameRate,
    average_frame_rate: metadata.averageFrameRate,
    video_codec: metadata.videoCodec,
    audio_codec: metadata.audioCodec,
    audio_stream_presence: Boolean(metadata.audioCodec),
    rotation_metadata: metadata.rotationMetadata,
    color_space: metadata.colorSpace,
    hdr_indicators: metadata.hdrIndicators,
    creation_metadata: metadata.creationMetadata,
    filesystem_modification_time: discovered.filesystemModifiedAt,
    corruption_or_decode_warnings: metadata.warnings,
    processing_eligibility: eligible,
    suspected_game: classification.suspectedGame,
    suspected_game_title: classification.suspectedGameTitle,
    game_identification_confidence: classification.gameIdentificationConfidence,
    game_identification_evidence: classification.gameIdentificationEvidence,
    suspected_category: classification.suspectedCategory,
    category_identification_confidence: classification.categoryIdentificationConfidence,
    category_identification_evidence: classification.categoryIdentificationEvidence,
    duplicate_status: "unique_pending_duplicate_scan",
    exact_duplicate_source_id: null,
    near_duplicate_group: null,
    ingestion_status: eligible === "unsupported" ? "RECORDED_UNSUPPORTED" : "INVENTORIED",
    review_status: "AUTOMATED_REVIEW_REQUIRED",
    production_status: "NOT_PRODUCTION_DATA",
    generated_at: generatedAt,
    previous_manifest_status: priorRecord?.sha256 === beforeHash ? "UNCHANGED_FROM_PREVIOUS_MANIFEST" : priorRecord ? "PATH_PREVIOUSLY_INVENTORIED_WITH_DIFFERENT_HASH" : "NEW_TO_SOURCE_MEDIA_INDEX",
    notes: classification.notes
  };
}

function buildSourceManifest({ generatedAt, runID, sourceRoot, records, artifactManifest, tools }) {
  const totalDuration = records.reduce((sum, record) => sum + (Number(record.video_duration) || 0), 0);
  const exactDuplicates = records.filter((record) => record.duplicate_status === "exact_duplicate").length;
  return {
    schemaVersion: SOURCE_MEDIA_INGEST_SCHEMA_VERSION,
    generatedAt,
    runID,
    sourceRoot,
    productionStatus: "NOT_PRODUCTION_DATA",
    automaticProductionPromotionAllowed: false,
    sourcePreservationPolicy: {
      originalsRenamed: false,
      originalsMoved: false,
      originalsRecompressed: false,
      originalsDeleted: false
    },
    tools,
    summary: {
      totalSourceFiles: records.length,
      totalBytes: records.reduce((sum, record) => sum + Number(record.file_size || 0), 0),
      totalDurationSeconds: round2(totalDuration),
      filesByGame: countBy(records, "suspected_game"),
      filesByCategory: countBy(records, "suspected_category"),
      processedFiles: records.filter((record) => record.ingestion_status !== "RECORDED_UNSUPPORTED").length,
      unsupportedFiles: records.filter((record) => record.ingestion_status === "RECORDED_UNSUPPORTED").length,
      failedFiles: records.filter((record) => record.processing_eligibility === "metadata_only_or_unusable").length,
      exactDuplicates,
      nearDuplicateGroups: new Set(records.map((record) => record.near_duplicate_group).filter(Boolean)).size,
      artifactsGenerated: artifactManifest.artifacts.length,
      productionRecordsCreated: 0
    },
    sources: records
  };
}

function buildSegments({ root, records, generatedAt }) {
  const segments = [];
  const fc26Research = readJsonIfExists(path.join(root, "data/research/fc26/player_creator_research.json"));
  const cf27August = readJsonIfExists(path.join(root, "data/phase-zero/august_2026_source_recordings_ingest.json"));
  const sourceByPath = new Map(records.map((record) => [record.original_relative_path, record]));
  const sourceByFilename = new Map(records.map((record) => [record.original_filename, record]));

  for (const video of cf27August?.videos ?? []) {
    const source = sourceByPath.get(video.sourceLocation?.portableRelativeEvidencePath) ?? sourceByFilename.get(video.originalFilename);
    if (!source) continue;
    for (const row of cf27August.timeline ?? []) {
      if (row.video_id !== video.inventoryId) continue;
      segments.push({
        segment_id: `SEG_${source.source_media_id}_${String(segments.length + 1).padStart(4, "0")}`,
        source_media_id: source.source_media_id,
        start_timestamp: row.start_timestamp,
        end_timestamp: row.end_timestamp,
        suspected_game: "cf27",
        suspected_mode: "Road to Glory Create Player",
        suspected_creation_path: "Create Player > Player",
        suspected_category: categoryKey(row.visible_menu_label),
        suspected_menu_label: row.visible_menu_label,
        suspected_option_label: row.visible_option_label || null,
        suspected_option_index: null,
        extraction_confidence: row.confidence?.toLowerCase?.() ?? "medium",
        extraction_methods: ["existing_cf27_august_timeline", "human_research_prior_to_generic_ingest"],
        evidence_frame_references: row.extracted_frame_path ? [row.extracted_frame_path] : [],
        review_status: "AUTOMATED_IMPORTED_REQUIRES_PRIMARY_REVIEW",
        notes: row.notes,
        generated_at: generatedAt
      });
    }
  }

  for (const control of fc26Research?.controls ?? []) {
    for (const value of control.observedValues ?? []) {
      const sourceVideo = fc26Research.sourceVideos?.find((video) => video.videoID === value.videoID);
      if (!sourceVideo) continue;
      const source = sourceByPath.get(sourceVideo.relativePath) ?? sourceByFilename.get(sourceVideo.originalFilename);
      if (!source) continue;
      const timestamp = Number(value.timestampSeconds) || 0;
      segments.push({
        segment_id: `SEG_${source.source_media_id}_${control.controlID}_${String(timestamp).replace(/\./g, "p")}`,
        source_media_id: source.source_media_id,
        start_timestamp: secondsToTimestamp(timestamp),
        end_timestamp: secondsToTimestamp(timestamp + 3),
        suspected_game: "fc26",
        suspected_mode: fc26Research.game?.mode ?? "Player Creator",
        suspected_creation_path: "Player Creator",
        suspected_category: categoryKey(control.label),
        suspected_menu_label: control.label,
        suspected_option_label: value.value,
        suspected_option_index: numericSuffix(value.value),
        extraction_confidence: value.confidence ?? "probable",
        extraction_methods: ["existing_fc26_player_creator_research"],
        evidence_frame_references: [],
        review_status: "AUTOMATED_IMPORTED_REQUIRES_PRIMARY_REVIEW",
        notes: "FC26 observation imported from existing research data; not production verified.",
        generated_at: generatedAt
      });
    }
  }

  for (const record of records) {
    if (record.processing_eligibility !== "eligible_video") continue;
    if (segments.some((segment) => segment.source_media_id === record.source_media_id)) continue;
    segments.push({
      segment_id: `SEG_${record.source_media_id}_UNCLASSIFIED_0001`,
      source_media_id: record.source_media_id,
      start_timestamp: "00:00:00.000",
      end_timestamp: secondsToTimestamp(Math.max(0, Number(record.video_duration) || 0)),
      suspected_game: record.suspected_game,
      suspected_mode: null,
      suspected_creation_path: null,
      suspected_category: record.suspected_category || "unknown_category",
      suspected_menu_label: null,
      suspected_option_label: null,
      suspected_option_index: null,
      extraction_confidence: "unclear",
      extraction_methods: ["file_inventory_only"],
      evidence_frame_references: [],
      review_status: "NEEDS_MANUAL_REVIEW",
      notes: "No prior trusted timeline was available for this source.",
      generated_at: generatedAt
    });
  }
  return segments.sort((a, b) => `${a.source_media_id}:${a.start_timestamp}`.localeCompare(`${b.source_media_id}:${b.start_timestamp}`));
}

function buildResearchCandidates({ root, records, segments, generatedAt }) {
  const candidates = [];
  const sourceByPath = new Map(records.map((record) => [record.original_relative_path, record]));
  const sourceByFilename = new Map(records.map((record) => [record.original_filename, record]));
  const fc26Research = readJsonIfExists(path.join(root, "data/research/fc26/player_creator_research.json"));
  const cf27Candidates = readJsonIfExists(path.join(root, "data/phase-zero/august_2026_intake_candidates.json"));
  const cf27August = readJsonIfExists(path.join(root, "data/phase-zero/august_2026_source_recordings_ingest.json"));

  for (const candidate of cf27Candidates?.candidates ?? []) {
    const sourceVideo = cf27August?.videos?.find((video) => candidate.sourceVideoID?.startsWith(video.inventoryId));
    const source = sourceVideo ? sourceByPath.get(sourceVideo.sourceLocation?.portableRelativeEvidencePath) ?? sourceByFilename.get(sourceVideo.originalFilename) : null;
    if (!source) continue;
    candidates.push({
      stable_candidate_id: candidate.candidateID,
      game_id: "college-football-27",
      suspected_game_title: "EA SPORTS College Football 27",
      platform: candidate.platform ?? null,
      game_version: null,
      patch: null,
      mode: "Road to Glory",
      creation_path: "Create Player > Player",
      category: candidate.category,
      suspected_native_label: candidate.nativeVisibleLabelOrIndex,
      suspected_native_index: candidate.nativeOrder,
      suspected_native_order: candidate.nativeOrder,
      supporting_source_media_ids: [source.source_media_id],
      supporting_timestamps: [candidate.sourceTimestampSeconds],
      supporting_evidence_frame_paths: candidate.evidenceFiles ?? [],
      menu_evidence_path: Array.isArray(candidate.evidenceFiles) ? candidate.evidenceFiles[0] ?? null : null,
      normalized_view_paths: [],
      extraction_confidence: candidate.extractionConfidence ?? "high",
      primary_review_status: "NEEDS_PRIMARY_REVIEW",
      second_verification_status: "NOT_VERIFIED",
      production_status: "NOT_PRODUCTION_DATA",
      missing_required_views: candidate.missingViews ?? [],
      recapture_status: candidate.recaptureStatus ?? "RECAPTURE_REQUIREMENTS_UNRESOLVED",
      duplicate_status: candidate.duplicateRisk ?? "not_evaluated",
      issues: candidate.issueLinks ?? [],
      notes: candidate.notes ?? "Imported as non-production research candidate from August CF27 source recording ingest.",
      generated_at: generatedAt
    });
  }

  for (const control of fc26Research?.controls ?? []) {
    for (const value of control.observedValues ?? []) {
      const sourceVideo = fc26Research.sourceVideos?.find((video) => video.videoID === value.videoID);
      const source = sourceVideo ? sourceByPath.get(sourceVideo.relativePath) ?? sourceByFilename.get(sourceVideo.originalFilename) : null;
      if (!source) continue;
      candidates.push({
        stable_candidate_id: `FC26_RESEARCH_${control.controlID}_${slug(value.value)}`,
        game_id: "ea-sports-fc-26",
        suspected_game_title: "EA SPORTS FC 26",
        platform: null,
        game_version: null,
        patch: null,
        mode: fc26Research.game?.mode ?? "Player Creator",
        creation_path: "Player Creator",
        category: control.label,
        suspected_native_label: value.value,
        suspected_native_index: numericSuffix(value.value),
        suspected_native_order: numericSuffix(value.value),
        supporting_source_media_ids: [source.source_media_id],
        supporting_timestamps: [value.timestampSeconds],
        supporting_evidence_frame_paths: [],
        menu_evidence_path: null,
        normalized_view_paths: [],
        extraction_confidence: value.confidence ?? "probable",
        primary_review_status: "NEEDS_PRIMARY_REVIEW",
        second_verification_status: "NOT_VERIFIED",
        production_status: "NOT_PRODUCTION_DATA",
        missing_required_views: ["MENU_FRAME_REVIEW_PROXY"],
        recapture_status: control.rangeComplete ? "NO_RECAPTURE_FOR_OBSERVED_VALUE" : "CATEGORY_BOUNDARY_RECAPTURE_REQUIRED",
        duplicate_status: "not_evaluated",
        issues: control.rangeComplete ? [] : ["COMPLETE_SELECTOR_BOUNDARIES_NOT_PROVEN"],
        notes: "FC26 research observation imported for review. Existing research explicitly states this is not production verified.",
        generated_at: generatedAt
      });
    }
  }

  for (const segment of segments) {
    if (segment.suspected_option_label) continue;
    if (segment.review_status !== "NEEDS_MANUAL_REVIEW") continue;
    candidates.push({
      stable_candidate_id: `AUTO_REVIEW_${segment.segment_id}`,
      game_id: segment.suspected_game,
      suspected_game_title: null,
      platform: null,
      game_version: null,
      patch: null,
      mode: segment.suspected_mode,
      creation_path: segment.suspected_creation_path,
      category: segment.suspected_category,
      suspected_native_label: null,
      suspected_native_index: null,
      suspected_native_order: null,
      supporting_source_media_ids: [segment.source_media_id],
      supporting_timestamps: [segment.start_timestamp],
      supporting_evidence_frame_paths: segment.evidence_frame_references,
      menu_evidence_path: null,
      normalized_view_paths: [],
      extraction_confidence: "unclear",
      primary_review_status: "NEEDS_PRIMARY_REVIEW",
      second_verification_status: "NOT_VERIFIED",
      production_status: "NOT_PRODUCTION_DATA",
      missing_required_views: ["MANUAL_CLASSIFICATION"],
      recapture_status: "NEEDS_MANUAL_REVIEW",
      duplicate_status: "not_evaluated",
      issues: ["UNKNOWN_CATEGORY_OR_OPTION"],
      notes: "Automatically created review placeholder for unclassified source segment.",
      generated_at: generatedAt
    });
  }
  return dedupeBy(candidates, "stable_candidate_id");
}

function buildPrimaryReviewQueue(candidates, segments, generatedAt) {
  return candidates.map((candidate) => ({
    queue_id: `PRIMARY_REVIEW_${candidate.stable_candidate_id}`,
    candidate_id: candidate.stable_candidate_id,
    game_id: candidate.game_id,
    category: candidate.category,
    suspected_native_label: candidate.suspected_native_label,
    source_media_ids: candidate.supporting_source_media_ids,
    timestamps: candidate.supporting_timestamps,
    evidence_frame_paths: candidate.supporting_evidence_frame_paths,
    ocr_suggestions: [],
    reviewer_action_required: ["confirm_game", "confirm_category", "confirm_label_or_mark_unresolved", "confirm_order_or_mark_unresolved", "confirm_evidence_sufficiency"],
    allowed_primary_statuses: ["PRIMARY_APPROVED", "PRIMARY_APPROVED_WITH_NOTES", "RECAPTURE_REQUIRED", "MISSING_EVIDENCE", "LABEL_UNRESOLVED", "ORDER_UNRESOLVED", "CATEGORY_INCOMPLETE", "ENVIRONMENT_UNRESOLVED", "DUPLICATE_REVIEW_REQUIRED", "NOT_REVIEWED"],
    review_status: "READY_FOR_PRIMARY_REVIEW",
    production_status: "NOT_PRODUCTION_DATA",
    generated_at: generatedAt
  }));
}

function buildSecondVerifierQueue(candidates, generatedAt) {
  return candidates.map((candidate) => ({
    queue_id: `SECOND_VERIFIER_${candidate.stable_candidate_id}`,
    candidate_id: candidate.stable_candidate_id,
    primary_decision: candidate.primary_review_status,
    supporting_source_media_ids: candidate.supporting_source_media_ids,
    required_verification_checks: ["independent_count_if_applicable", "native_order_check", "evidence_path_check", "status_check"],
    allowed_verifier_statuses: ["VERIFIED", "VERIFIED_WITH_NOTES", "RECAPTURE_REQUIRED", "VERSION_MISMATCH", "MISSING_EVIDENCE", "COUNT_MISMATCH", "ORDER_MISMATCH", "DEPENDENCY_UNRESOLVED", "NOT_VERIFIED"],
    verifier_identity: null,
    verification_date: null,
    discrepancy_fields: [],
    review_status: "BLOCKED_UNTIL_PRIMARY_REVIEW_AND_REAL_SECOND_HUMAN",
    production_status: "NOT_PRODUCTION_DATA",
    generated_at: generatedAt
  }));
}

function buildRecaptureQueue({ records, candidates, generatedAt }) {
  const items = [];
  for (const record of records) {
    if (record.processing_eligibility === "unsupported") {
      items.push(recaptureItem({
        game: record.suspected_game,
        category: record.suspected_category,
        sourceMediaID: record.source_media_id,
        reason: "unsupported_or_non_media_file",
        missingEvidence: "Usable media evidence",
        sequence: "Replace with MP4, MOV, PNG, JPG/JPEG, or another supported readable media file if this file was intended as evidence.",
        generatedAt
      }));
    }
    if (record.suspected_game === "unknown") {
      items.push(recaptureItem({
        game: "unknown",
        category: "unknown_category",
        sourceMediaID: record.source_media_id,
        reason: "game_identity_unresolved",
        missingEvidence: "Visible title, menu, or operator metadata linking the file to a supported game",
        sequence: "Record from the title/menu context or provide source metadata. Do not rely on folder names alone.",
        generatedAt
      }));
    }
  }
  for (const candidate of candidates) {
    if (candidate.production_status !== "NOT_PRODUCTION_DATA") continue;
    if (candidate.issues.includes("COMPLETE_SELECTOR_BOUNDARIES_NOT_PROVEN") || candidate.recapture_status.includes("BOUNDARY")) {
      items.push(recaptureItem({
        game: candidate.game_id,
        category: candidate.category,
        option: candidate.suspected_native_label,
        sourceMediaID: candidate.supporting_source_media_ids[0],
        reason: "selector_boundaries_not_proven",
        missingEvidence: "First option, final option, wrap behavior, and full native order",
        sequence: "Open the category from the canonical creation path, pause on the first visible option, move one option at a time through the final option, demonstrate wrap behavior only if safe, and keep labels or indices visible.",
        generatedAt
      }));
    }
  }
  return {
    schemaVersion: "gfm-source-media-recapture-queue-v1",
    generatedAt,
    productionStatus: "NOT_PRODUCTION_DATA",
    items
  };
}

function recaptureItem({ game, category, option = null, sourceMediaID, reason, missingEvidence, sequence, generatedAt }) {
  return {
    recapture_id: `RECAPTURE_${slug(`${sourceMediaID}_${category}_${reason}_${option ?? "category"}`)}`,
    game,
    mode: null,
    category,
    suspected_option: option,
    exact_missing_evidence: missingEvidence,
    recommended_capture_sequence: sequence,
    source_evidence_that_caused_request: sourceMediaID,
    reason,
    status: "REQUESTED_NOT_CAPTURED",
    production_status: "NOT_PRODUCTION_DATA",
    generated_at: generatedAt
  };
}

function generateReviewProxies({ sourcePath, root, record, artifactBase, tools, rebuildDerived }) {
  const artifacts = [];
  if (!tools.ffmpegPath) return artifacts;
  const outputDir = path.join(artifactBase, "proxies");
  fs.mkdirSync(outputDir, { recursive: true });
  const duration = Math.max(0, Number(record.video_duration) || 0);
  const spans = duration > 300 ? chunkSpans(duration, 300) : [{ start: 0, end: duration, label: "000000-000000" }];
  for (let index = 0; index < spans.length; index += 1) {
    const span = spans[index];
    const outputPath = path.join(outputDir, `${record.source_media_id}_PROXY_${timestampToken(span.start)}-${timestampToken(span.end)}.mp4`);
    if (!rebuildDerived && fs.existsSync(outputPath)) {
      artifacts.push(artifactRecord({ root, record, outputPath, type: "review_proxy", start: span.start, end: span.end, command: "reused-existing-proxy" }));
      continue;
    }
    const args = [
      "-hide_banner", "-loglevel", "error", "-y",
      "-ss", String(span.start),
      "-i", sourcePath,
      "-t", String(Math.max(0.1, span.end - span.start)),
      "-vf", "scale=-2:720",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "32",
      "-c:a", "aac", "-b:a", "96k",
      outputPath
    ];
    const result = spawnSync(tools.ffmpegPath, args, { encoding: "utf8" });
    artifacts.push(artifactRecord({
      root,
      record,
      outputPath,
      type: "review_proxy",
      start: span.start,
      end: span.end,
      command: `${tools.ffmpegLabel} ${args.join(" ")}`,
      error: result.status === 0 ? null : result.stderr || result.stdout || "ffmpeg proxy generation failed"
    }));
  }
  return artifacts;
}

function extractTimestampedFrames({ sourcePath, root, record, artifactBase, segments, tools, rebuildDerived }) {
  const artifacts = [];
  if (!tools.ffmpegPath) return artifacts;
  const outputDir = path.join(artifactBase, "frames");
  fs.mkdirSync(outputDir, { recursive: true });
  const duration = Math.max(0, Number(record.video_duration) || 0);
  const lastDecodableTimestamp = duration > 0.5 ? round2(duration - 0.5) : 0;
  const timestamps = new Set([0, lastDecodableTimestamp]);
  for (let t = 30; t < duration; t += 30) timestamps.add(round2(t));
  for (const segment of segments) {
    timestamps.add(timestampToSeconds(segment.start_timestamp));
  }
  for (const timestamp of [...timestamps].filter((value) => Number.isFinite(value) && value >= 0 && value <= duration + 0.1).sort((a, b) => a - b)) {
    const outputPath = path.join(outputDir, `${record.source_media_id}_FRAME_${timestampToken(timestamp)}.png`);
    if (!rebuildDerived && fs.existsSync(outputPath)) {
      artifacts.push(artifactRecord({ root, record, outputPath, type: "timestamped_frame", start: timestamp, end: timestamp, command: "reused-existing-frame" }));
      continue;
    }
    const args = ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(timestamp), "-i", sourcePath, "-frames:v", "1", outputPath];
    const result = spawnSync(tools.ffmpegPath, args, { encoding: "utf8" });
    artifacts.push(artifactRecord({
      root,
      record,
      outputPath,
      type: "timestamped_frame",
      start: timestamp,
      end: timestamp,
      command: `${tools.ffmpegLabel} ${args.join(" ")}`,
      error: result.status === 0 ? null : result.stderr || result.stdout || "ffmpeg frame extraction failed"
    }));
  }
  return artifacts;
}

function generateContactSheetsForSource({ sourcePath, root, record, artifactBase, tools, rebuildDerived }) {
  const artifacts = [];
  if (!tools.ffmpegPath) return artifacts;
  const outputDir = path.join(artifactBase, "contact-sheets");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${record.source_media_id}_CONTACT_OVERVIEW.jpg`);
  if (!rebuildDerived && fs.existsSync(outputPath)) {
    artifacts.push(artifactRecord({ root, record, outputPath, type: "contact_sheet", start: 0, end: Number(record.video_duration) || 0, command: "reused-existing-contact-sheet" }));
    return artifacts;
  }
  const args = [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", sourcePath,
    "-vf", "fps=1/30,scale=320:-2,tile=4x4",
    "-frames:v", "1",
    outputPath
  ];
  const result = spawnSync(tools.ffmpegPath, args, { encoding: "utf8" });
  artifacts.push(artifactRecord({
    root,
    record,
    outputPath,
    type: "contact_sheet",
    start: 0,
    end: Number(record.video_duration) || 0,
    command: `${tools.ffmpegLabel} ${args.join(" ")}`,
    error: result.status === 0 ? null : result.stderr || result.stdout || "ffmpeg contact sheet generation failed"
  }));
  return artifacts;
}

function artifactRecord({ root, record, outputPath, type, start, end, command, error = null }) {
  const exists = fs.existsSync(outputPath);
  return {
    artifact_id: `ART_${record.source_media_id}_${type.toUpperCase()}_${timestampToken(start)}_${crypto.createHash("sha1").update(outputPath).digest("hex").slice(0, 8).toUpperCase()}`,
    source_media_id: record.source_media_id,
    artifact_type: type,
    relative_path: normalizeRelativePath(path.relative(root, outputPath)),
    original_start_timestamp: secondsToTimestamp(start),
    original_end_timestamp: secondsToTimestamp(end),
    generation_command: command,
    derived_sha256: exists ? sha256FileSync(outputPath) : null,
    size_bytes: exists ? fs.statSync(outputPath).size : null,
    status: error || !exists ? "FAILED" : "GENERATED",
    error: error ?? (exists ? null : "ffmpeg command completed without producing the expected artifact")
  };
}

function buildStandardizedViews({ generatedAt, artifactManifest, segments }) {
  const segmentsBySource = new Map();
  for (const segment of segments) {
    if (!segmentsBySource.has(segment.source_media_id)) segmentsBySource.set(segment.source_media_id, []);
    segmentsBySource.get(segment.source_media_id).push(segment);
  }
  const views = artifactManifest.artifacts
    .filter((artifact) => artifact.artifact_type === "timestamped_frame" && artifact.status === "GENERATED")
    .map((artifact) => {
      const sourceSegments = segmentsBySource.get(artifact.source_media_id) ?? [];
      const timestampSeconds = timestampToSeconds(artifact.original_start_timestamp);
      const nearest = sourceSegments
        .map((segment) => ({ segment, distance: Math.abs(timestampToSeconds(segment.start_timestamp) - timestampSeconds) }))
        .sort((a, b) => a.distance - b.distance)[0]?.segment ?? null;
      return {
        view_id: `VIEW_${artifact.artifact_id}`,
        source_media_id: artifact.source_media_id,
        source_timestamp: artifact.original_start_timestamp,
        view_label: nearest?.suspected_menu_label ? "MENU" : "FULLSCREEN",
        source_frame_path: artifact.relative_path,
        uncropped_frame_preserved: true,
        crop_path: null,
        crop_coordinates: null,
        pose_estimate: null,
        blur_quality: "NOT_EVALUATED",
        exposure_quality: "NOT_EVALUATED",
        occlusion_quality: "NOT_EVALUATED",
        menu_overlay_present: nearest?.suspected_menu_label ? true : null,
        face_visibility_quality: "NOT_EVALUATED",
        ears_visible: null,
        hairline_visible: null,
        chin_visible: null,
        forehead_visible: null,
        jaw_visible: null,
        character_motion_state: "NOT_EVALUATED",
        lighting_consistency: "NOT_EVALUATED",
        review_status: "NEEDS_HUMAN_VIEW_REVIEW",
        production_status: "NOT_PRODUCTION_DATA",
        generated_at: generatedAt
      };
    });
  return {
    schemaVersion: "gfm-standardized-source-media-views-v1",
    generatedAt,
    productionStatus: "NOT_PRODUCTION_DATA",
    note: "This manifest records uncropped full-screen/menu review frames only. It does not fabricate face crops, pose estimates, or production-quality matching views.",
    views
  };
}

function buildOutputs({ indexRoot, researchRoot, manifest, segmentManifest, artifactManifest, standardizedViews, candidateManifest, reviewQueue, verifierQueue, recaptureQueue, runbook, status }) {
  return [
    [path.join(indexRoot, "source_media_manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`],
    [path.join(indexRoot, "source_media_manifest.csv"), csv(manifest.sources, sourceManifestCsvColumns)],
    [path.join(indexRoot, "media_segments.json"), `${JSON.stringify(segmentManifest, null, 2)}\n`],
    [path.join(indexRoot, "media_segments.csv"), csv(segmentManifest.segments, segmentCsvColumns)],
    [path.join(indexRoot, "ingestion_artifacts.json"), `${JSON.stringify(artifactManifest, null, 2)}\n`],
    [path.join(indexRoot, "ingestion_artifacts.csv"), csv(artifactManifest.artifacts, artifactCsvColumns)],
    [path.join(indexRoot, "standardized_views.json"), `${JSON.stringify(standardizedViews, null, 2)}\n`],
    [path.join(indexRoot, "standardized_views.csv"), csv(standardizedViews.views, standardizedViewCsvColumns)],
    [path.join(researchRoot, "research_candidates.json"), `${JSON.stringify(candidateManifest, null, 2)}\n`],
    [path.join(researchRoot, "research_candidates.csv"), csv(candidateManifest.candidates, candidateCsvColumns)],
    [path.join(researchRoot, "primary_review_queue.json"), `${JSON.stringify({ schemaVersion: "gfm-primary-review-queue-v1", generatedAt: manifest.generatedAt, productionStatus: "NOT_PRODUCTION_DATA", items: reviewQueue }, null, 2)}\n`],
    [path.join(researchRoot, "primary_review_queue.csv"), csv(reviewQueue, primaryQueueCsvColumns)],
    [path.join(researchRoot, "second_verifier_queue.json"), `${JSON.stringify({ schemaVersion: "gfm-second-verifier-queue-v1", generatedAt: manifest.generatedAt, productionStatus: "NOT_PRODUCTION_DATA", items: verifierQueue }, null, 2)}\n`],
    [path.join(researchRoot, "second_verifier_queue.csv"), csv(verifierQueue, verifierQueueCsvColumns)],
    [path.join(researchRoot, "recapture_queue.json"), `${JSON.stringify(recaptureQueue, null, 2)}\n`],
    [path.join(researchRoot, "recapture_queue.csv"), csv(recaptureQueue.items, recaptureQueueCsvColumns)],
    ["docs/runbooks/SOURCE_MEDIA_INGESTION.md", runbook],
    ["docs/status/SOURCE_MEDIA_INGESTION_STATUS.md", status]
  ];
}

function validateSourceMediaOutputs({ root, indexRoot = defaultIndexRoot, researchRoot = defaultResearchRoot }) {
  const required = [
    path.join(indexRoot, "source_media_manifest.json"),
    path.join(indexRoot, "media_segments.json"),
    path.join(indexRoot, "ingestion_artifacts.json"),
    path.join(indexRoot, "standardized_views.json"),
    path.join(researchRoot, "research_candidates.json"),
    path.join(researchRoot, "primary_review_queue.json"),
    path.join(researchRoot, "second_verifier_queue.json"),
    path.join(researchRoot, "recapture_queue.json")
  ];
  const errors = [];
  for (const relativePath of required) {
    if (!fs.existsSync(path.join(root, relativePath))) errors.push(`Missing required output: ${relativePath}`);
  }
  if (errors.length) return { ok: false, errors };
  const manifest = readJsonIfExists(path.join(root, indexRoot, "source_media_manifest.json"));
  const segments = readJsonIfExists(path.join(root, indexRoot, "media_segments.json"));
  const candidates = readJsonIfExists(path.join(root, researchRoot, "research_candidates.json"));
  return validateGeneratedRun({ root, manifest, segmentManifest: segments, candidateManifest: candidates, artifactManifest: readJsonIfExists(path.join(root, indexRoot, "ingestion_artifacts.json")) });
}

function validateGeneratedRun({ root, manifest, segmentManifest, artifactManifest, candidateManifest }) {
  const errors = [];
  const warnings = [];
  const sourceIDs = new Set((manifest?.sources ?? []).map((record) => record.source_media_id));
  for (const source of manifest?.sources ?? []) {
    const sourcePath = path.join(root, source.original_relative_path);
    if (fs.existsSync(sourcePath)) {
      const currentHash = sha256FileSync(sourcePath);
      if (currentHash !== source.sha256) errors.push(`Source hash changed after ingest: ${source.original_relative_path}`);
    }
    if (source.production_status !== "NOT_PRODUCTION_DATA") errors.push(`Source has production status: ${source.source_media_id}`);
  }
  for (const segment of segmentManifest?.segments ?? []) {
    if (!sourceIDs.has(segment.source_media_id)) errors.push(`Segment references unknown source: ${segment.segment_id}`);
    if (timestampToSeconds(segment.end_timestamp) < timestampToSeconds(segment.start_timestamp)) errors.push(`Segment has negative duration: ${segment.segment_id}`);
  }
  for (const candidate of candidateManifest?.candidates ?? []) {
    if (candidate.production_status !== "NOT_PRODUCTION_DATA") errors.push(`Candidate is production visible: ${candidate.stable_candidate_id}`);
    if (candidate.second_verification_status !== "NOT_VERIFIED") errors.push(`Candidate has automated second verification: ${candidate.stable_candidate_id}`);
    for (const sourceID of candidate.supporting_source_media_ids ?? []) {
      if (!sourceIDs.has(sourceID)) errors.push(`Candidate references unknown source: ${candidate.stable_candidate_id}`);
    }
  }
  for (const artifact of artifactManifest?.artifacts ?? []) {
    if (artifact.status === "FAILED") warnings.push(`Artifact generation failed: ${artifact.relative_path}: ${artifact.error}`);
    if (artifact.status === "GENERATED" && !fs.existsSync(path.join(root, artifact.relative_path))) errors.push(`Generated artifact path does not resolve: ${artifact.relative_path}`);
  }
  return { ok: errors.length === 0, unrecoverable: errors.length > 0, errors: [...errors, ...warnings], warnings };
}

function inspectMedia(absolutePath, extension, detectedMimeType, tools) {
  const mediaKind = mediaKindFor(extension, detectedMimeType);
  if (mediaKind === "unsupported") {
    return {
      opensSuccessfully: false,
      containerType: extension ? extension.slice(1).toUpperCase() : "UNKNOWN",
      warnings: ["unsupported_media_type"],
      durationSeconds: null,
      width: null,
      height: null,
      frameRate: null,
      averageFrameRate: null,
      videoCodec: null,
      audioCodec: null,
      rotationMetadata: null,
      colorSpace: null,
      hdrIndicators: [],
      creationMetadata: null
    };
  }
  if (mediaKind === "video" && tools.ffmpegPath) {
    return inspectVideoWithFfmpeg(absolutePath, tools.ffmpegPath);
  }
  if (mediaKind === "image") {
    return inspectImage(absolutePath, extension);
  }
  return {
    opensSuccessfully: true,
    containerType: extension ? extension.slice(1).toUpperCase() : "UNKNOWN",
    warnings: [],
    durationSeconds: null,
    width: null,
    height: null,
    frameRate: null,
    averageFrameRate: null,
    videoCodec: null,
    audioCodec: null,
    rotationMetadata: null,
    colorSpace: null,
    hdrIndicators: [],
    creationMetadata: null
  };
}

function inspectVideoWithFfmpeg(absolutePath, ffmpegPath) {
  const result = spawnSync(ffmpegPath, ["-hide_banner", "-i", absolutePath], { encoding: "utf8" });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const durationMatch = output.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d+)/);
  const videoLine = output.split(/\r?\n/).find((line) => line.includes(" Video: "));
  const audioLine = output.split(/\r?\n/).find((line) => line.includes(" Audio: "));
  const sizeMatch = videoLine?.match(/,\s*(\d{2,5})x(\d{2,5})[\s,]/);
  const fpsMatch = videoLine?.match(/,\s*([\d.]+)\s*fps/);
  const tbrMatch = videoLine?.match(/,\s*([\d.]+)\s*tbr/);
  const creationMatch = output.match(/creation_time\s*:\s*([^\n\r]+)/);
  const rotationMatch = output.match(/displaymatrix:[\s\S]*?rotation of ([^\n\r]+)/);
  const colorSpaceMatch = videoLine?.match(/yuv[^\s,]+/);
  return {
    opensSuccessfully: Boolean(durationMatch && videoLine),
    containerType: containerFromFfmpegOutput(output),
    warnings: durationMatch && videoLine ? [] : ["ffmpeg_metadata_parse_incomplete"],
    durationSeconds: durationMatch ? round2(Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3])) : null,
    width: sizeMatch ? Number(sizeMatch[1]) : null,
    height: sizeMatch ? Number(sizeMatch[2]) : null,
    frameRate: fpsMatch ? Number(fpsMatch[1]) : null,
    averageFrameRate: tbrMatch ? Number(tbrMatch[1]) : null,
    videoCodec: videoLine ? videoLine.replace(/^.*Video:\s*/, "").split(",")[0].trim() : null,
    audioCodec: audioLine ? audioLine.replace(/^.*Audio:\s*/, "").split(",")[0].trim() : null,
    rotationMetadata: rotationMatch ? rotationMatch[1].trim() : null,
    colorSpace: colorSpaceMatch?.[0] ?? null,
    hdrIndicators: /bt2020|smpte2084|arib-std-b67/i.test(videoLine ?? "") ? ["possible_hdr_metadata_in_stream_line"] : [],
    creationMetadata: creationMatch ? creationMatch[1].trim() : null
  };
}

function inspectImage(absolutePath, extension) {
  const sips = spawnSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", absolutePath], { encoding: "utf8" });
  const output = `${sips.stdout ?? ""}\n${sips.stderr ?? ""}`;
  const width = output.match(/pixelWidth:\s*(\d+)/)?.[1];
  const height = output.match(/pixelHeight:\s*(\d+)/)?.[1];
  return {
    opensSuccessfully: sips.status === 0 || Boolean(width && height),
    containerType: extension ? extension.slice(1).toUpperCase() : "IMAGE",
    warnings: sips.status === 0 ? [] : ["image_metadata_parse_incomplete"],
    durationSeconds: null,
    width: width ? Number(width) : null,
    height: height ? Number(height) : null,
    frameRate: null,
    averageFrameRate: null,
    videoCodec: null,
    audioCodec: null,
    rotationMetadata: null,
    colorSpace: null,
    hdrIndicators: [],
    creationMetadata: null
  };
}

function resolveTools(options = {}) {
  const configured = options.ffmpegPath ?? process.env.GFM_FFMPEG_PATH ?? process.env.CF27_FFMPEG_PATH;
  const ffmpegPath = configured && fs.existsSync(configured) ? configured : commandPath("ffmpeg") ?? (fs.existsSync("/Applications/Plaud.app/Contents/Resources/ffmpeg") ? "/Applications/Plaud.app/Contents/Resources/ffmpeg" : null);
  const ffprobePath = options.ffprobePath ?? process.env.GFM_FFPROBE_PATH ?? process.env.CF27_FFPROBE_PATH ?? commandPath("ffprobe");
  return {
    ffmpegPath,
    ffmpegLabel: ffmpegPath ? path.basename(ffmpegPath) : null,
    ffprobePath,
    ffmpeg: ffmpegPath ? "available" : "unavailable",
    ffprobe: ffprobePath ? "available" : "unavailable",
    metadataStrategy: ffprobePath ? "ffprobe_available_but_ffmpeg_parser_used_for_portability" : "ffmpeg_input_parse_no_ffprobe"
  };
}

function detectMimeType(absolutePath, extension) {
  const result = spawnSync("file", ["--mime-type", "-b", absolutePath], { encoding: "utf8" });
  if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  return mimeTypeForExtension(extension);
}

function mediaKindFor(extension, mimeType) {
  if (supportedVideoExtensions.has(extension) || mimeType?.startsWith("video/")) return "video";
  if (supportedImageExtensions.has(extension) || mimeType?.startsWith("image/")) return "image";
  if (supportedAudioExtensions.has(extension) || mimeType?.startsWith("audio/")) return "audio";
  if (sidecarExtensions.has(extension)) return "sidecar";
  return "unsupported";
}

function applyDuplicateDetection(records) {
  const firstByHash = new Map();
  for (const record of records) {
    const first = firstByHash.get(record.sha256);
    if (first) {
      record.duplicate_status = "exact_duplicate";
      record.exact_duplicate_source_id = first.source_media_id;
      record.ingestion_status = record.ingestion_status === "RECORDED_UNSUPPORTED" ? record.ingestion_status : "INVENTORIED_EXACT_DUPLICATE";
    } else {
      firstByHash.set(record.sha256, record);
      record.duplicate_status = "unique";
    }
  }
}

function applyNearDuplicateDetection(records) {
  const groups = new Map();
  for (const record of records) {
    if (record.processing_eligibility !== "eligible_video") continue;
    const durationBucket = Math.round((Number(record.video_duration) || 0) / 2) * 2;
    const key = `${record.suspected_game}:${record.width}x${record.height}:${durationBucket}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  let index = 1;
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const groupID = `NEAR_DUPLICATE_${String(index).padStart(3, "0")}`;
    for (const member of members) member.near_duplicate_group = groupID;
    index += 1;
  }
}

function categoryFromCf27ObservedContent(text = "") {
  const lower = text.toLowerCase();
  if (lower.includes("hair")) return "hair_style";
  if (lower.includes("styles")) return "body";
  if (lower.includes("head & skin")) return "main_appearance_menu";
  return "unknown_category";
}

function topLevelSourceFolder(relativePath) {
  const parts = normalizeRelativePath(relativePath).split("/");
  return parts[1] ?? null;
}

function aspectRatio(width, height) {
  if (!width || !height) return null;
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function containerFromFfmpegOutput(output) {
  const inputLine = output.split(/\r?\n/).find((line) => line.includes("Input #0,"));
  const match = inputLine?.match(/Input #0,\s*([^,]+),/);
  return match?.[1]?.trim() ?? null;
}

function mimeTypeForExtension(extension) {
  const ext = extension.toLowerCase();
  if ([".mp4", ".m4v"].includes(ext)) return "video/mp4";
  if (ext === ".mov") return "video/quicktime";
  if (ext === ".mkv") return "video/x-matroska";
  if (ext === ".png") return "image/png";
  if ([".jpg", ".jpeg"].includes(ext)) return "image/jpeg";
  if (ext === ".heic") return "image/heic";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".m4a") return "audio/mp4";
  if (ext === ".aac") return "audio/aac";
  return "application/octet-stream";
}

async function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function sha256FileSync(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function commandPath(command) {
  const result = spawnSync("which", [command], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function csv(rows, columns) {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(valueAtPath(row, column))).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function csvEscape(value) {
  if (Array.isArray(value)) value = value.join("|");
  if (value && typeof value === "object") value = JSON.stringify(value);
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function valueAtPath(object, key) {
  return key.split(".").reduce((value, part) => value?.[part], object);
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows) {
    const value = row[key] ?? "unknown";
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function dedupeBy(rows, key) {
  const seen = new Set();
  const output = [];
  for (const row of rows) {
    if (seen.has(row[key])) continue;
    seen.add(row[key]);
    output.push(row);
  }
  return output;
}

function normalizeRelativePath(value) {
  return value.split(path.sep).join("/");
}

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function secondsToTimestamp(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${secs.toFixed(3).padStart(6, "0")}`;
}

function timestampToSeconds(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const parts = value.split(":").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return Number(value) || 0;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function timestampToken(seconds) {
  return secondsToTimestamp(seconds).replace(/:/g, "").replace(/\./g, "p");
}

function chunkSpans(duration, maxLength) {
  const spans = [];
  for (let start = 0; start < duration; start += maxLength) {
    spans.push({ start, end: Math.min(duration, start + maxLength) });
  }
  return spans;
}

function numericSuffix(value) {
  const match = String(value ?? "").match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : null;
}

function categoryKey(value) {
  return slug(value || "unknown_category").toLowerCase();
}

function slug(value) {
  return String(value ?? "unknown")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
}

const sourceManifestCsvColumns = [
  "source_media_id",
  "original_filename",
  "original_relative_path",
  "top_level_source_folder",
  "detected_mime_type",
  "detected_container_type",
  "file_extension",
  "file_size",
  "sha256",
  "video_duration",
  "width",
  "height",
  "display_aspect_ratio",
  "frame_rate",
  "average_frame_rate",
  "video_codec",
  "audio_codec",
  "audio_stream_presence",
  "rotation_metadata",
  "color_space",
  "hdr_indicators",
  "creation_metadata",
  "filesystem_modification_time",
  "corruption_or_decode_warnings",
  "processing_eligibility",
  "suspected_game",
  "game_identification_confidence",
  "suspected_category",
  "category_identification_confidence",
  "duplicate_status",
  "exact_duplicate_source_id",
  "near_duplicate_group",
  "ingestion_status",
  "review_status",
  "production_status",
  "notes"
];

const segmentCsvColumns = [
  "segment_id",
  "source_media_id",
  "start_timestamp",
  "end_timestamp",
  "suspected_game",
  "suspected_mode",
  "suspected_creation_path",
  "suspected_category",
  "suspected_menu_label",
  "suspected_option_label",
  "suspected_option_index",
  "extraction_confidence",
  "extraction_methods",
  "evidence_frame_references",
  "review_status",
  "notes"
];

const artifactCsvColumns = [
  "artifact_id",
  "source_media_id",
  "artifact_type",
  "relative_path",
  "original_start_timestamp",
  "original_end_timestamp",
  "derived_sha256",
  "size_bytes",
  "status",
  "error"
];

const standardizedViewCsvColumns = [
  "view_id",
  "source_media_id",
  "source_timestamp",
  "view_label",
  "source_frame_path",
  "crop_path",
  "pose_estimate",
  "blur_quality",
  "exposure_quality",
  "occlusion_quality",
  "face_visibility_quality",
  "review_status",
  "production_status"
];

const candidateCsvColumns = [
  "stable_candidate_id",
  "game_id",
  "category",
  "suspected_native_label",
  "suspected_native_index",
  "suspected_native_order",
  "supporting_source_media_ids",
  "supporting_timestamps",
  "extraction_confidence",
  "primary_review_status",
  "second_verification_status",
  "production_status",
  "recapture_status",
  "issues"
];

const primaryQueueCsvColumns = ["queue_id", "candidate_id", "game_id", "category", "suspected_native_label", "review_status", "production_status"];
const verifierQueueCsvColumns = ["queue_id", "candidate_id", "primary_decision", "review_status", "production_status"];
const recaptureQueueCsvColumns = ["recapture_id", "game", "category", "suspected_option", "exact_missing_evidence", "recommended_capture_sequence", "source_evidence_that_caused_request", "reason", "status"];

function sourceMediaRunbook() {
  return `# Source Media Ingestion Runbook

GameFace Match source media ingestion recursively inventories local game evidence under \`source-media/\` without renaming, moving, deleting, recompressing, or uploading originals.

## Command

\`\`\`sh
npm run media:ingest -- --source source-media --generate-proxies --extract-frames --generate-contact-sheets --classify --prepare-review-queue
\`\`\`

Use \`--dry-run\` to inspect behavior without writing outputs and \`--check\` to validate committed manifests. Generated proxies, frames, and contact sheets are written under \`build-artifacts/source-media-ingestion/\`, which is ignored by Git.

Useful flags:

- \`--run-id GFM_MEDIA_INGEST_YYYYMMDD_HHMMSS\` preserves a stable artifact root for a run.
- \`--generate-proxies\` creates H.264 review MP4s no longer than five minutes per segment.
- \`--extract-frames\` extracts interval and segment-start frames with original timestamps in filenames.
- \`--generate-contact-sheets\` creates compact chronological review sheets.
- \`--media-id <ID>\` limits derivative work to one source.
- \`--rebuild-derived\` replaces derived artifacts in the ignored artifact root.

## Supported Inputs

The inventory records every file recursively, including unsupported files. The current reader handles MP4, MOV, M4V, MKV/WebM, PNG, JPG/JPEG, HEIC, WEBP, GIF, WAV, M4A, AAC, sidecar metadata, extensionless files by MIME where possible, and unknown files as fail-closed dispositions.

## Safety Rules

- Folder names and filenames are only classification hints.
- FC26 and College Football 27 records remain separated by explicit \`game_id\`.
- OCR or automated extraction cannot verify labels, counts, or production readiness.
- All automated candidates are non-production and require primary review plus a real second human verifier before any production release.
- Raw source videos and large generated derivatives are not committed.
- Unknown game and unknown category records must remain review-only.
- Generated frames or crops are derivatives and cannot replace full-screen menu evidence for native order.

## Outputs

- \`data/source-media-index/source_media_manifest.json\`
- \`data/source-media-index/media_segments.json\`
- \`data/source-media-index/ingestion_artifacts.json\`
- \`data/source-media-index/standardized_views.json\`
- \`data/catalog-research/research_candidates.json\`
- \`data/catalog-research/primary_review_queue.json\`
- \`data/catalog-research/second_verifier_queue.json\`
- \`data/catalog-research/recapture_queue.json\`

## Review Workflow

1. Confirm source hashes and preservation status in the source manifest.
2. Open review proxies and contact sheets from \`build-artifacts/source-media-ingestion/\`.
3. Review each segment's source timestamp and evidence frame references.
4. Confirm or correct game identity, category, native label, native index, and order in the primary-review queue.
5. Move only approved primary records into the separate second-verifier workflow.
6. Keep all verifier decisions separate from primary review; Codex automation cannot act as the second human.
7. Convert unresolved records into precise recapture requests rather than guessing missing counts or labels.

## Storage Requirements

The committed manifests are small. The ignored review artifacts can be hundreds of megabytes for a short local batch and should be regenerated or pruned locally as needed. Do not commit source masters, proxies, bulk frames, or contact sheets.

## Troubleshooting

If FFmpeg is unavailable, metadata and derivative generation will be limited. Set \`GFM_FFMPEG_PATH\` to a local binary. Do not install paid or cloud vision services for this workflow without an explicit architecture decision.
`;
}

function sourceMediaStatus({ manifest, segmentManifest, artifactManifest, standardizedViews, candidateManifest, reviewQueue, verifierQueue, recaptureQueue }) {
  return `# Source Media Ingestion Status

**Status:** Research media ingestion artifacts generated.  
**Run ID:** \`${manifest.runID}\`  
**Generated:** ${manifest.generatedAt}  
**Production status:** NOT_PRODUCTION_DATA

## Summary

| Metric | Value |
| --- | ---: |
| Total source files | ${manifest.summary.totalSourceFiles} |
| Total bytes | ${manifest.summary.totalBytes} |
| Total video duration seconds | ${manifest.summary.totalDurationSeconds} |
| Processed files | ${manifest.summary.processedFiles} |
| Unsupported files | ${manifest.summary.unsupportedFiles} |
| Exact duplicates | ${manifest.summary.exactDuplicates} |
| Near duplicate groups | ${manifest.summary.nearDuplicateGroups} |
| Segments | ${segmentManifest.segments.length} |
| Generated artifacts recorded | ${artifactManifest.artifacts.length} |
| Standardized view records | ${standardizedViews.views.length} |
| Research candidates | ${candidateManifest.candidates.length} |
| Primary-review queue items | ${reviewQueue.length} |
| Second-verifier queue items | ${verifierQueue.length} |
| Recapture requests | ${recaptureQueue.items.length} |
| Production-approved records | 0 |

## Game Classification

\`\`\`json
${JSON.stringify(manifest.summary.filesByGame, null, 2)}
\`\`\`

## Current Limits

- Automated extraction remains research-only.
- Contact sheets, proxies, and timestamped frames are generated into ignored build artifacts and can be regenerated.
- Standardized view records currently preserve uncropped full-screen/menu frames; face crops and pose estimates require later human/vision review.
- College Football 27 and FC26 evidence are not merged.
- Second-person verification has not occurred from this command.
- Production recommendations remain fail-closed.
`;
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--source") options.source = argv[++index];
    else if (arg === "--run-id") options.runID = argv[++index];
    else if (arg === "--media-id") options.mediaID = argv[++index];
    else if (arg === "--dry-run") options.writeOutputs = false;
    else if (arg === "--check") options.checkOnly = true;
    else if (arg === "--resume") options.resume = true;
    else if (arg === "--only-unprocessed") options.onlyUnprocessed = true;
    else if (arg === "--rebuild-derived") options.rebuildDerived = true;
    else if (arg === "--generate-proxies") options.generateProxies = true;
    else if (arg === "--generate-contact-sheets") options.generateContactSheets = true;
    else if (arg === "--extract-frames") options.extractFrames = true;
    else if (arg === "--classify") options.classify = true;
    else if (arg === "--prepare-review-queue") options.prepareReviewQueue = true;
    else if (arg === "--game") options.game = argv[++index];
  }
  return options;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSourceMediaIngest(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  });
}
