#!/usr/bin/env node
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_SKIN_DETAILS_RESEARCH_SCHEMA_VERSION = "cf27-skin-details-research-candidates-v1";
export const CF27_SKIN_DETAILS_FRAME_MANIFEST_SCHEMA_VERSION = "cf27-skin-details-evidence-frame-manifest-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inventoryPath = "data/research/cf27/video_inventory.json";
const candidateDirectory = "data/research/cf27/catalog-candidates/research/skin-details-options-001-010";
const candidatePackagePath = `${candidateDirectory}/skin_details_research_candidates.json`;
const frameOutputRoot = "data/research/cf27/generated/full-resolution-frames/skin-details-options-001-010";
const frameManifestPath = "data/research/cf27/manifests/skin-details-evidence-frames/skin_details_evidence_frame_manifest.json";
const markdownReportPath = "docs/catalog/SKIN_DETAILS_RESEARCH_CANDIDATES.md";

const skinDetailsRecords = [
  option(1, "None", "None", "7.0-8.0", 8.0, 1, 1, "not_applicable_baseline"),
  option(2, "Freckles 2", "Freckles", "9.0-11.0", 10.0, 1, 2, "limited_on_representative_frame_visible_in_menu_thumbnail"),
  option(3, "Scar 3", "Scar", "12.0-14.0", 13.0, 1, 3, "limited_on_representative_frame_visible_in_menu_thumbnail"),
  option(4, "Scar 2", "Scar", "15.0-16.0", 15.5, 1, 4, "limited_on_representative_frame_visible_in_menu_thumbnail"),
  option(5, "Scar 1", "Scar", "23.0-24.0", 24.0, 2, 1, "limited_on_representative_frame_visible_in_menu_thumbnail"),
  option(6, "Acne Scar 1", "Acne Scar", "21.0-22.0", 22.0, 2, 2, "limited_on_representative_frame_visible_in_menu_thumbnail"),
  option(7, "Redness 3", "Redness", "19.0-20.0", 20.0, 2, 3, "limited_on_representative_frame_visible_in_menu_thumbnail"),
  option(8, "Redness 2", "Redness", "17.0-18.0", 18.0, 2, 4, "limited_on_representative_frame_visible_in_menu_thumbnail"),
  option(9, "Redness 1", "Redness", "25.0-26.0", 26.0, 3, 1, "limited_on_representative_frame_visible_in_menu_thumbnail"),
  option(10, "Freckles 1", "Freckles", "27.0-31.72", 29.0, 3, 2, "limited_on_representative_frame_visible_in_menu_thumbnail")
];

const selectionSequenceNativeOrders = [1, 2, 3, 4, 8, 7, 6, 5, 9, 10];
const frameRoles = ["MENU", "CHARACTER_STABLE"];

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = ingestSkinDetailsEvidence({
    root: repositoryRoot,
    ffmpegPath: cliValue("--ffmpeg") ?? process.env.CF27_FFMPEG_PATH
  });
  if (!result.ok) process.exitCode = 1;
}

export function ingestSkinDetailsEvidence({ root = repositoryRoot, ffmpegPath, generatedAt = new Date().toISOString() } = {}) {
  const ffmpeg = resolveFfmpeg(ffmpegPath);
  if (!ffmpeg) {
    console.error("ffmpeg is required. Set CF27_FFMPEG_PATH or pass --ffmpeg.");
    return { ok: false };
  }

  const inventory = readJson(path.join(root, inventoryPath));
  const sourceVideo = inventory.inventory.find((video) => video.inventoryId === "video-005");
  const duplicateVideo = inventory.inventory.find((video) => video.inventoryId === "video-011");
  if (!sourceVideo) throw new Error("Missing video-005 Skin Details inventory record.");
  if (!fs.existsSync(sourceVideo.absoluteDiscoveryPathInternal)) {
    throw new Error(`Source video is not available locally: ${sourceVideo.portableRelativeEvidencePath}`);
  }

  const records = [];
  const frames = [];

  for (const candidate of skinDetailsRecords) {
    const stableInternalID = `CF27_XBOXUNKNOWN_RTG_SKINDETAILS_${String(candidate.nativeOrder).padStart(3, "0")}`;
    const recordFrames = [];

    for (const role of frameRoles) {
      const timestampSeconds = candidate.stableTimestampSeconds;
      const relativeOutputPath = normalizePath(path.join(
        frameOutputRoot,
        stableInternalID,
        `${stableInternalID}_${role}_video-005_${timestampSeconds.toFixed(2).replace(".", "p")}s.png`
      ));
      const absoluteOutputPath = path.join(root, relativeOutputPath);
      fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
      const extraction = runFfmpegExtract(ffmpeg, sourceVideo.absoluteDiscoveryPathInternal, timestampSeconds, absoluteOutputPath);
      if (!extraction.ok) {
        throw new Error(`Failed to extract ${role} frame for ${stableInternalID}: ${extraction.error}`);
      }
      const stat = fs.statSync(absoluteOutputPath);
      const frame = {
        frameID: `frame-${stableInternalID.toLowerCase()}-${role.toLowerCase()}`,
        stableInternalID,
        nativeOrder: candidate.nativeOrder,
        nativeLabelOriginalText: candidate.nativeLabelOriginalText,
        readableNativeCategory: candidate.readableNativeCategory,
        role,
        sourceVideoID: "video-005",
        sourceWorkingFilename: sourceVideo.workingFilename,
        portableRelativeEvidencePath: sourceVideo.portableRelativeEvidencePath,
        sourceVideoSha256: sourceVideo.sha256,
        sourceTimestampSeconds: timestampSeconds,
        selectedMenuEvidenceRangeSeconds: candidate.timestampRangeSeconds,
        outputRelativePath: relativeOutputPath,
        outputSha256: sha256File(absoluteOutputPath),
        outputSizeBytes: stat.size,
        outputFormat: "png",
        width: sourceVideo.resolution.width,
        height: sourceVideo.resolution.height,
        aspectRatio: `${sourceVideo.resolution.width}:${sourceVideo.resolution.height}`,
        preservesOriginalAspectRatio: true,
        appearanceAltered: false,
        selectionNotes: "Full-screen frame extracted from a directly selected Skin Details label. Frame is a local derivative and is not production data."
      };
      frames.push(frame);
      recordFrames.push({
        role,
        frameID: frame.frameID,
        outputRelativePath: frame.outputRelativePath,
        outputSha256: frame.outputSha256,
        sourceTimestampSeconds: timestampSeconds
      });
    }

    records.push({
      nativeOrder: candidate.nativeOrder,
      stableInternalID,
      nativeLabelOriginalText: candidate.nativeLabelOriginalText,
      visibleGameLabelOrIndex: candidate.nativeLabelOriginalText,
      category: "Skin Details",
      kind: "additionalFaceMatchingAttribute",
      attributeFamily: "skinDetails",
      readableNativeCategory: candidate.readableNativeCategory,
      nativeLabelNormalizedForResearch: candidate.readableNativeCategory,
      originalTextPreserved: true,
      valueType: "nativeLabel",
      affectsTextureRatherThanGeometry: true,
      affectsGeometrySimilarity: false,
      selectedMenuEvidence: [
        {
          videoID: "video-005",
          timestampRangeSeconds: candidate.timestampRangeSeconds,
          stableTimestampSeconds: candidate.stableTimestampSeconds,
          basis: "direct selected Skin Details label visible in the Skin Details grid"
        }
      ],
      sourceImageReferences: recordFrames,
      gridPositionFromNativeIndex: {
        columns: 4,
        nativeRow: candidate.nativeRow,
        nativeColumn: candidate.nativeColumn,
        basis: "selected tile position visible in the Skin Details grid; native text is stored separately and unchanged"
      },
      detailVisibility: detailVisibilityFor(candidate.detailVisibility),
      representativeFrameQA: {
        eyeBlackObstructsEvaluation: candidate.nativeLabelOriginalText === "None" ? false : true,
        eyeBlackObstructionNotes: candidate.nativeLabelOriginalText === "None"
          ? "Baseline option. Eye black is still present on the character, but no skin detail is expected."
          : "Black cheek eye paint covers part of the cheek area and limits evaluation of nearby skin texture details.",
        characterFaceFrameAvailable: true,
        characterPose: candidate.nativeOrder >= 9 ? "rotated three-quarter/profile-leaning view" : "front or slight three-quarter view",
        characterFrameLimitations: [
          "The live character frame includes game UI, uniform, and eye black.",
          "Texture visibility is limited by screen-recording compression and lighting.",
          "Selected menu thumbnails are clearer for option identity than the representative character frame."
        ]
      },
      captureCompleteness: {
        menuEvidence: "present",
        representativeFaceFrame: "present_limited",
        standardizedViews: "not_present",
        requiredProductionRecapture: true,
        notes: "Recording is valid for selected label/order evidence. It is not a standardized production comparison capture."
      },
      researchMetadata: {
        nativeLabelOriginalText: candidate.nativeLabelOriginalText,
        readableNativeCategory: candidate.readableNativeCategory,
        textureUse: "research_candidate_texture_attribute",
        geometryUse: "excluded_from_geometry_similarity",
        sensitiveTraitPolicy: "Native game label only. No race, ethnicity, identity, health, attractiveness, or other sensitive labels are recorded.",
        measurementLimitations: [
          "No texture measurement is computed from this ingestion.",
          "Representative frames are not standardized production comparison evidence.",
          "Skin Details are treated as appearance/texture attributes, not geometry."
        ]
      },
      verificationState: "NOT_VERIFIED",
      productionStatus: "NOT_PRODUCTION_DATA"
    });
  }

  const recordsByNativeOrder = new Map(records.map((record) => [record.nativeOrder, record]));
  const candidatePackage = {
    schemaVersion: CF27_SKIN_DETAILS_RESEARCH_SCHEMA_VERSION,
    createdAt: generatedAt,
    updatedAt: generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "RESEARCH_CANDIDATE",
    sourceType: "researchCandidate",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    verificationStateForAllRecords: "NOT_VERIFIED",
    scope: {
      category: "Skin Details",
      directlySelectedRecordCount: records.length,
      directlySelectedNativeLabels: records.map((record) => record.nativeLabelOriginalText),
      nativeOrderRangeObserved: "10 visible Skin Details tiles directly selected",
      completeCategoryCountClaimed: false,
      excludedLabels: ["unselected or unseen Skin Details values, if any"],
      reasonCompletenessIsNotClaimed: "The recording shows ten visible selected tiles, but does not prove wrap behavior or a hard final selector boundary."
    },
    context: {
      platformCode: "XBOXUNKNOWN",
      modeCode: "RTG",
      gameVersion: "UNKNOWN",
      patchVersion: "UNKNOWN",
      creationPath: "Road to Glory / Create Player / Player / Appearance / Head & Skin / Skin Details",
      sourceVideoID: "video-005",
      duplicateProvenanceVideoID: duplicateVideo?.inventoryId ?? null,
      duplicateProvenancePolicy: duplicateVideo
        ? "video-011 is an exact duplicate of video-005 and is retained as duplicate provenance only, not an independent evidence source."
        : "No duplicate provenance video found in inventory."
    },
    selectorObservations: {
      gridStructure: "4-column grid with 10 visible tiles",
      nativeOrderBasis: "visible tile position in the Skin Details grid",
      selectionSequenceBasis: "direct selected labels in the recording",
      firstObservedSelectedValue: "None",
      finalObservedSelectedValue: "Freckles 1",
      selectorAppearsComplete: false,
      selectorCompletenessExplanation: "All ten visible tiles are selected during the recording, but final boundary and wrap behavior are not shown.",
      wrapObserved: false,
      skinDetailsChangeVisibleCharacterTexture: "limited_observable_change",
      otherVisibleSettingsChangedWhenChoosingSkinDetails: false,
      characterRotationAvailable: true,
      selectedHeadRemainsConstant: true,
      eyeBlackPresent: true,
      eyeBlackEvaluationImpact: "Eye black obstructs cheek-area skin detail evaluation on representative character frames."
    },
    observationPolicy: {
      nativeLabelsPreserved: true,
      normalizedResearchCategoriesAreDerivedFromReadableNativeLabels: true,
      noRaceOrEthnicityLabels: true,
      noSensitiveTraitInference: true,
      skinDetailsExcludedFromGeometrySimilarity: true,
      productionUseAllowed: false,
      sourceMasterPreserved: true,
      derivativesAreLocalAndGitIgnored: true
    },
    sourceVideos: [
      {
        videoID: "video-005",
        workingFilename: sourceVideo.workingFilename,
        portableRelativeEvidencePath: sourceVideo.portableRelativeEvidencePath,
        sha256: sourceVideo.sha256,
        durationSeconds: sourceVideo.durationSeconds,
        resolution: sourceVideo.resolution,
        identifiedContent: sourceVideo.identifiedContent
      }
    ],
    nativeOrder: records.map((record) => ({
      nativeOrder: record.nativeOrder,
      stableInternalID: record.stableInternalID,
      nativeLabelOriginalText: record.nativeLabelOriginalText,
      readableNativeCategory: record.readableNativeCategory,
      nativeRow: record.gridPositionFromNativeIndex.nativeRow,
      nativeColumn: record.gridPositionFromNativeIndex.nativeColumn
    })),
    selectionSequence: selectionSequenceNativeOrders.map((nativeOrder, index) => {
      const record = recordsByNativeOrder.get(nativeOrder);
      return {
        sequenceOrder: index + 1,
        nativeOrder,
        stableInternalID: record.stableInternalID,
        nativeLabelOriginalText: record.nativeLabelOriginalText,
        timestampRangeSeconds: record.selectedMenuEvidence[0].timestampRangeSeconds,
        stableTimestampSeconds: record.selectedMenuEvidence[0].stableTimestampSeconds,
        selectionType: "deliberately_selected"
      };
    }),
    labelsRequiringManualTextConfirmation: [],
    manualTextConfirmationNotes: "All ten selected native Skin Details labels were readable in direct frame inspection. Reconfirm during second-person verification before production.",
    records,
    productionBlocks: [
      "Records are primary research only and not second-person verified.",
      "Game version, patch, and exact platform are still unknown.",
      "Selector wrap and final category boundary are not proven.",
      "Eye black obstructs evaluation of cheek-area details in representative character frames.",
      "Production catalog remains empty until verified evidence is reviewed and published."
    ]
  };

  const frameManifest = {
    schemaVersion: CF27_SKIN_DETAILS_FRAME_MANIFEST_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "RESEARCH_DERIVATIVE",
    sourceType: "researchDerivative",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    sourcePackage: candidatePackagePath,
    outputRoot: frameOutputRoot,
    frameStoragePolicy: "Generated full-resolution Skin Details frame derivatives are git-ignored. Commit this manifest and research package, not binary frames.",
    extractionPolicy: {
      preserveMasters: true,
      preserveOriginalAspectRatio: true,
      appearanceAltered: false,
      roles: frameRoles,
      productionUseAllowed: false
    },
    frames: frames.sort((first, second) => first.nativeOrder - second.nativeOrder || frameRoles.indexOf(first.role) - frameRoles.indexOf(second.role))
  };

  writeJson(path.join(root, candidatePackagePath), candidatePackage);
  writeJson(path.join(root, frameManifestPath), frameManifest);
  writeText(path.join(root, markdownReportPath), toMarkdown(candidatePackage, frameManifest));

  return { ok: true, candidatePackage, frameManifest };
}

function option(nativeOrder, nativeLabelOriginalText, readableNativeCategory, timestampRangeSeconds, stableTimestampSeconds, nativeRow, nativeColumn, detailVisibility) {
  return { nativeOrder, nativeLabelOriginalText, readableNativeCategory, timestampRangeSeconds, stableTimestampSeconds, nativeRow, nativeColumn, detailVisibility };
}

function detailVisibilityFor(state) {
  if (state === "not_applicable_baseline") {
    return {
      detailClearlyVisible: "not_applicable",
      detailVisibilityState: "baseline_none",
      visibleInSelectedMenuThumbnail: true,
      visibleInRepresentativeCharacterFrame: false,
      notes: "The selected native label is None, so no skin detail should be visible."
    };
  }
  return {
    detailClearlyVisible: "limited",
    detailVisibilityState: state,
    visibleInSelectedMenuThumbnail: true,
    visibleInRepresentativeCharacterFrame: "limited",
    notes: "The selected menu thumbnail shows the texture cue more clearly than the representative character frame. Eye black and compression limit character-frame evaluation."
  };
}

function runFfmpegExtract(ffmpeg, sourcePath, timestampSeconds, outputPath) {
  const result = spawnSync(ffmpeg, [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    sourcePath,
    "-ss",
    String(timestampSeconds),
    "-frames:v",
    "1",
    "-y",
    outputPath
  ], { encoding: "utf8", maxBuffer: 1024 * 1024 });
  if (result.status !== 0) {
    return { ok: false, error: result.stderr || result.stdout || `ffmpeg exited ${result.status}` };
  }
  return { ok: true };
}

function toMarkdown(candidatePackage, frameManifest) {
  const labels = candidatePackage.records.map((record) => record.nativeLabelOriginalText).join(", ");
  const nativeRows = candidatePackage.nativeOrder
    .map((record) => `| ${record.nativeOrder} | ${record.nativeLabelOriginalText} | ${record.readableNativeCategory} | ${record.nativeRow} | ${record.nativeColumn} |`)
    .join("\n");
  const lines = [
    "# Skin Details Research Candidates",
    "",
    `Last generated: ${candidatePackage.updatedAt}`,
    "",
    "This report is **research-candidate evidence only**. It is not production catalog data and does not enable recommendations.",
    "",
    "## Direct Evidence",
    "",
    `- Source video: \`${candidatePackage.sourceVideos[0].workingFilename}\``,
    `- Portable evidence path: \`${candidatePackage.sourceVideos[0].portableRelativeEvidencePath}\``,
    `- Directly selected records: ${candidatePackage.records.length}`,
    `- Native labels selected: ${labels}`,
    `- First observed selected value: ${candidatePackage.selectorObservations.firstObservedSelectedValue}`,
    `- Final observed selected value: ${candidatePackage.selectorObservations.finalObservedSelectedValue}`,
    `- Grid structure: ${candidatePackage.selectorObservations.gridStructure}`,
    `- Selector complete: ${candidatePackage.selectorObservations.selectorAppearsComplete ? "yes" : "not proven"}`,
    `- Wrap observed: ${candidatePackage.selectorObservations.wrapObserved ? "yes" : "no"}`,
    "",
    "The recording selects ten visible Skin Details tiles, but it does not prove wrap behavior or a hard final selector boundary.",
    "",
    "## Native Order",
    "",
    "| Native order | Native label text | Readable native category | Row | Column |",
    "| --- | --- | --- | --- | --- |",
    nativeRows,
    "",
    "## Visibility and Capture QA",
    "",
    "- Skin Details are recorded as texture/presentation attributes, not geometry.",
    "- Eye black is present and obstructs cheek-area evaluation on representative character frames.",
    "- Selected menu thumbnails are clearer for option identity than the live character frame.",
    "- Standardized production recapture is still required before verified catalog publication.",
    "",
    "## Manual Text Confirmation",
    "",
    candidatePackage.labelsRequiringManualTextConfirmation.length === 0
      ? "- No labels are currently flagged for manual text confirmation from this direct inspection. Reconfirm all labels during second-person verification."
      : candidatePackage.labelsRequiringManualTextConfirmation.map((label) => `- ${label}`).join("\n"),
    "",
    "## Outputs",
    "",
    `- Candidate package: \`${candidatePackagePath}\``,
    `- Frame manifest: \`${frameManifestPath}\``,
    `- Generated frame derivatives: \`${frameManifest.outputRoot}\``,
    "",
    "Generated PNG derivatives are local and git-ignored."
  ];
  return lines.join("\n") + "\n";
}

function resolveFfmpeg(explicitPath) {
  const candidates = [
    explicitPath,
    "ffmpeg",
    "/Applications/Plaud.app/Contents/Resources/ffmpeg"
  ].filter(Boolean);
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["-version"], { encoding: "utf8", stdio: "pipe" });
    if (result.status === 0) return candidate;
  }
  return null;
}

function cliValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}
