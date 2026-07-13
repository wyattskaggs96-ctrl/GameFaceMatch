#!/usr/bin/env node
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_SKIN_TONE_RESEARCH_SCHEMA_VERSION = "cf27-skin-tone-research-candidates-v1";
export const CF27_SKIN_TONE_FRAME_MANIFEST_SCHEMA_VERSION = "cf27-skin-tone-evidence-frame-manifest-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inventoryPath = "data/research/cf27/video_inventory.json";
const candidateDirectory = "data/research/cf27/catalog-candidates/research/skin-tone-values-001-024";
const candidatePackagePath = `${candidateDirectory}/skin_tone_research_candidates.json`;
const frameOutputRoot = "data/research/cf27/generated/full-resolution-frames/skin-tone-values-001-024";
const frameManifestPath = "data/research/cf27/manifests/skin-tone-evidence-frames/skin_tone_evidence_frame_manifest.json";
const markdownReportPath = "docs/catalog/SKIN_TONE_RESEARCH_CANDIDATES.md";

const observedSelectionSequence = [
  event(9, "8.0-9.0", 8.5),
  event(8, "10.0-11.0", 10.5),
  event(4, "12.0-13.0", 12.5),
  event(16, "14.0-14.0", 14.0),
  event(20, "15.0-16.0", 15.5),
  event(19, "17.0-18.0", 17.5),
  event(18, "19.0-20.0", 19.5),
  event(15, "21.0-22.0", 21.5),
  event(21, "23.0-24.0", 23.5),
  event(6, "25.0-26.0", 25.5),
  event(7, "27.0-28.0", 27.5),
  event(5, "29.0-30.0", 29.5),
  event(23, "31.0-32.0", 31.5),
  event(24, "33.0-33.0", 33.0),
  event(22, "34.0-35.0", 34.5),
  event(17, "36.0-37.0", 36.5),
  event(14, "38.0-38.0", 38.0),
  event(13, "39.0-40.0", 39.5),
  event(10, "41.0-42.0", 41.5),
  event(12, "43.0-44.0", 43.5),
  event(1, "45.0-46.0", 45.5),
  event(2, "47.0-47.0", 47.0),
  event(3, "48.0-49.0", 48.5),
  event(11, "50.0-53.82", 51.5)
];

const stableFrameRoles = ["MENU", "CHARACTER_STABLE"];
const colorSampleCrop = {
  x: 1230,
  y: 520,
  width: 90,
  height: 90,
  description: "Fixed approximate character face-region crop from the full video frame. Uncalibrated research metadata only; not a demographic label, biometric identifier, geometry feature, or production skin-tone truth."
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = ingestSkinToneEvidence({
    root: repositoryRoot,
    ffmpegPath: cliValue("--ffmpeg") ?? process.env.CF27_FFMPEG_PATH
  });
  if (!result.ok) process.exitCode = 1;
}

export function ingestSkinToneEvidence({ root = repositoryRoot, ffmpegPath, generatedAt = new Date().toISOString() } = {}) {
  const ffmpeg = resolveFfmpeg(ffmpegPath);
  if (!ffmpeg) {
    console.error("ffmpeg is required. Set CF27_FFMPEG_PATH or pass --ffmpeg.");
    return { ok: false };
  }

  const inventory = readJson(path.join(root, inventoryPath));
  const sourceVideo = inventory.inventory.find((video) => video.inventoryId === "video-004");
  const duplicateVideo = inventory.inventory.find((video) => video.inventoryId === "video-010");
  if (!sourceVideo) throw new Error("Missing video-004 Skin Tone inventory record.");
  if (!fs.existsSync(sourceVideo.absoluteDiscoveryPathInternal)) {
    throw new Error(`Source video is not available locally: ${sourceVideo.portableRelativeEvidencePath}`);
  }

  const sequenceByNativeOrder = new Map(observedSelectionSequence.map((selection) => [selection.nativeOrder, selection]));
  const records = [];
  const frames = [];

  for (let nativeOrder = 1; nativeOrder <= 24; nativeOrder += 1) {
    const selection = sequenceByNativeOrder.get(nativeOrder);
    if (!selection) throw new Error(`Missing directly selected Skin Tone ${String(nativeOrder).padStart(2, "0")} observation.`);

    const stableInternalID = `CF27_XBOXUNKNOWN_RTG_SKINTONE_${String(nativeOrder).padStart(3, "0")}`;
    const visibleGameLabelOrIndex = labelForNativeOrder(nativeOrder);
    const characterTimestamp = selection.stableTimestampSeconds;
    const menuTimestamp = selection.stableTimestampSeconds;
    const visualColorMeasurement = measureFixedColorSample(ffmpeg, sourceVideo.absoluteDiscoveryPathInternal, characterTimestamp, colorSampleCrop);

    const recordFrames = [];
    for (const role of stableFrameRoles) {
      const timestampSeconds = role === "MENU" ? menuTimestamp : characterTimestamp;
      const relativeOutputPath = normalizePath(path.join(
        frameOutputRoot,
        stableInternalID,
        `${stableInternalID}_${role}_video-004_${timestampSeconds.toFixed(2).replace(".", "p")}s.png`
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
        nativeOrder,
        visibleGameLabelOrIndex,
        role,
        sourceVideoID: "video-004",
        sourceWorkingFilename: sourceVideo.workingFilename,
        portableRelativeEvidencePath: sourceVideo.portableRelativeEvidencePath,
        sourceVideoSha256: sourceVideo.sha256,
        sourceTimestampSeconds: timestampSeconds,
        selectedMenuEvidenceRangeSeconds: selection.timestampRangeSeconds,
        outputRelativePath: relativeOutputPath,
        outputSha256: sha256File(absoluteOutputPath),
        outputSizeBytes: stat.size,
        outputFormat: "png",
        width: sourceVideo.resolution.width,
        height: sourceVideo.resolution.height,
        aspectRatio: `${sourceVideo.resolution.width}:${sourceVideo.resolution.height}`,
        preservesOriginalAspectRatio: true,
        appearanceAltered: false,
        selectionNotes: "Full-screen frame extracted from a directly selected Skin Tone label. Frame is a local derivative and is not production data."
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
      nativeOrder,
      stableInternalID,
      visibleGameLabelOrIndex,
      category: "Skin Tone",
      kind: "additionalFaceMatchingAttribute",
      attributeFamily: "skinPresentation",
      valueType: "index",
      affectsGeometrySimilarity: false,
      selectedMenuEvidence: [
        {
          videoID: "video-004",
          timestampRangeSeconds: selection.timestampRangeSeconds,
          stableTimestampSeconds: selection.stableTimestampSeconds,
          basis: "direct selected Skin Tone label visible in the Skin Tone grid"
        }
      ],
      sourceImageReferences: recordFrames,
      gridPositionFromNativeIndex: {
        columns: 4,
        nativeRow: Math.floor((nativeOrder - 1) / 4) + 1,
        nativeColumn: ((nativeOrder - 1) % 4) + 1,
        basis: "native index parsed from visible label; final selector boundary is not proven"
      },
      researchMetadata: {
        visualColorMeasurement,
        sensitiveTraitPolicy: "Native game value and objective color samples only. No race, ethnicity, identity, health, attractiveness, or other sensitive labels are recorded.",
        geometryUse: "excluded_from_geometry_similarity",
        measurementLimitations: [
          "Color sample is uncalibrated screen-recording RGB and may be affected by game lighting, compression, eye black, and the fixed crop location.",
          "This measurement is research metadata only and must not be used as a demographic or identity label.",
          "Skin presentation must remain separate from geometric similarity."
        ]
      },
      characterContext: {
        selectedHeadAppearsConstant: true,
        selectedHeadContext: "Face 1 is visible before entering Skin Tone; no Head Template change is observed during Skin Tone selections.",
        characterRotationAvailable: true,
        rotationEvidence: "Bottom control hint shows RS Zoom/Rotate; character rotation is visibly used near the end of the video while Skin Tone remains selected.",
        otherVisibleSettingsChanged: false,
        visibleSettingChangeObserved: "The selected skin presentation changes the visible character skin presentation; no other menu setting change is directly observed."
      },
      verificationState: "NOT_VERIFIED",
      productionStatus: "NOT_PRODUCTION_DATA"
    });
  }

  const candidatePackage = {
    schemaVersion: CF27_SKIN_TONE_RESEARCH_SCHEMA_VERSION,
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
      category: "Skin Tone",
      directlySelectedRecordCount: records.length,
      directlySelectedNativeLabels: records.map((record) => record.visibleGameLabelOrIndex),
      recordRange: "Skin Tone 01 through Skin Tone 24 directly selected in video-004",
      nativeOrderRangeObserved: "Skin Tone 01 through Skin Tone 24",
      completeCategoryCountClaimed: false,
      excludedLabels: ["labels beyond Skin Tone 24", "unselected neighboring swatches"],
      reasonCompletenessIsNotClaimed: "The recording directly selects contiguous native labels 01-24, but it does not show a wrap or hard selector boundary."
    },
    context: {
      platformCode: "XBOXUNKNOWN",
      modeCode: "RTG",
      gameVersion: "UNKNOWN",
      patchVersion: "UNKNOWN",
      creationPath: "Road to Glory / Create Player / Player / Appearance / Head & Skin / Skin Tone",
      sourceVideoID: "video-004",
      duplicateProvenanceVideoID: duplicateVideo?.inventoryId ?? null,
      duplicateProvenancePolicy: duplicateVideo
        ? "video-010 is an exact duplicate of video-004 and is retained as duplicate provenance only, not an independent evidence source."
        : "No duplicate provenance video found in inventory."
    },
    selectorObservations: {
      gridStructure: "4-column scrollable grid",
      firstObservedValue: "Skin Tone 09",
      firstObservedSelectedValue: "Skin Tone 09",
      finalObservedValue: "Skin Tone 11",
      finalObservedSelectedValue: "Skin Tone 11",
      selectorAppearsComplete: false,
      selectorCompletenessExplanation: "Contiguous native labels 01-24 are directly selected, but final boundary and wrap behavior are not shown.",
      wrapObserved: false,
      skinToneChangesVisibleCharacterPresentation: true,
      otherVisibleSettingsChangedWhenChoosingSkinTone: false,
      characterRotationAvailable: true,
      selectedHeadRemainsConstant: true
    },
    observationPolicy: {
      noRaceOrEthnicityLabels: true,
      sensitiveTraitLabelsAllowed: false,
      noSensitiveTraitInference: true,
      objectiveColorMeasurementAllowed: true,
      skinPresentationExcludedFromGeometrySimilarity: true,
      geometrySimilarityUse: "excluded",
      productionUseAllowed: false,
      sourceMasterPreserved: true,
      derivativesAreLocalAndGitIgnored: true
    },
    sourceVideos: [
      {
        videoID: "video-004",
        workingFilename: sourceVideo.workingFilename,
        portableRelativeEvidencePath: sourceVideo.portableRelativeEvidencePath,
        sha256: sourceVideo.sha256,
        durationSeconds: sourceVideo.durationSeconds,
        resolution: sourceVideo.resolution,
        identifiedContent: sourceVideo.identifiedContent
      }
    ],
    selectionSequence: observedSelectionSequence.map((selection, index) => ({
      sequenceOrder: index + 1,
      visibleGameLabelOrIndex: labelForNativeOrder(selection.nativeOrder),
      nativeOrder: selection.nativeOrder,
      timestampRangeSeconds: selection.timestampRangeSeconds,
      stableTimestampSeconds: selection.stableTimestampSeconds,
      selectionType: "deliberately_selected"
    })),
    records,
    productionBlocks: [
      "Records are primary research only and not second-person verified.",
      "Game version, patch, and exact platform are still unknown.",
      "Selector wrap and final category boundary are not proven.",
      "Production catalog remains empty until verified evidence is reviewed and published."
    ]
  };

  const frameManifest = {
    schemaVersion: CF27_SKIN_TONE_FRAME_MANIFEST_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "RESEARCH_DERIVATIVE",
    sourceType: "researchDerivative",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    sourcePackage: candidatePackagePath,
    outputRoot: frameOutputRoot,
    frameStoragePolicy: "Generated full-resolution Skin Tone frame derivatives are git-ignored. Commit this manifest and research package, not binary frames.",
    extractionPolicy: {
      preserveMasters: true,
      preserveOriginalAspectRatio: true,
      appearanceAltered: false,
      roles: stableFrameRoles,
      productionUseAllowed: false
    },
    frames: frames.sort((first, second) => first.nativeOrder - second.nativeOrder || stableFrameRoles.indexOf(first.role) - stableFrameRoles.indexOf(second.role))
  };

  writeJson(path.join(root, candidatePackagePath), candidatePackage);
  writeJson(path.join(root, frameManifestPath), frameManifest);
  writeText(path.join(root, markdownReportPath), toMarkdown(candidatePackage, frameManifest));

  return { ok: true, candidatePackage, frameManifest };
}

function event(nativeOrder, timestampRangeSeconds, stableTimestampSeconds) {
  return { nativeOrder, timestampRangeSeconds, stableTimestampSeconds };
}

function labelForNativeOrder(nativeOrder) {
  return `Skin Tone ${String(nativeOrder).padStart(2, "0")}`;
}

function measureFixedColorSample(ffmpeg, sourcePath, timestampSeconds, crop) {
  const filter = `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},scale=1:1:flags=area,format=rgb24`;
  const result = spawnSync(ffmpeg, [
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    String(timestampSeconds),
    "-i",
    sourcePath,
    "-vf",
    filter,
    "-frames:v",
    "1",
    "-f",
    "rawvideo",
    "pipe:1"
  ], { encoding: "buffer", maxBuffer: 1024 * 1024 });
  if (result.status !== 0 || result.stdout.length < 3) {
    return {
      status: "unavailable",
      reason: result.stderr?.toString("utf8") || "ffmpeg did not return an RGB sample",
      sampleRegion: crop
    };
  }
  const [r, g, b] = result.stdout;
  return {
    status: "measured_from_screen_recording",
    method: "ffmpeg_area_scaled_fixed_character_patch_rgb_average_v1",
    sourceTimestampSeconds: timestampSeconds,
    sampleRegion: crop,
    rgbMean: { r, g, b },
    averageRGB: { r, g, b },
    averageHex: `#${hex(r)}${hex(g)}${hex(b)}`,
    calibrated: false,
    productionUseAllowed: false
  };
}

function runFfmpegExtract(ffmpeg, sourcePath, timestampSeconds, outputPath) {
  const result = spawnSync(ffmpeg, [
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    String(timestampSeconds),
    "-i",
    sourcePath,
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
  const labels = candidatePackage.records.map((record) => record.visibleGameLabelOrIndex).join(", ");
  const lines = [
    "# Skin Tone Research Candidates",
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
    `- First observed selected value: ${candidatePackage.selectorObservations.firstObservedValue}`,
    `- Final observed selected value: ${candidatePackage.selectorObservations.finalObservedValue}`,
    `- Grid structure: ${candidatePackage.selectorObservations.gridStructure}`,
    `- Selector complete: ${candidatePackage.selectorObservations.selectorAppearsComplete ? "yes" : "not proven"}`,
    `- Wrap observed: ${candidatePackage.selectorObservations.wrapObserved ? "yes" : "no"}`,
    "",
    "The recording directly selects contiguous native labels `Skin Tone 01` through `Skin Tone 24`, but it does not show a wrap or hard selector boundary. No records beyond `Skin Tone 24` were created.",
    "",
    "## Interaction Findings",
    "",
    "- Choosing a Skin Tone changes the visible character skin presentation.",
    "- No other visible menu setting change is directly observed while choosing Skin Tone values.",
    "- Character rotation is available and visibly used near the end of the recording.",
    "- The selected head appears constant; `Face 1` is visible before entering Skin Tone and no Head Template change is observed during the Skin Tone selections.",
    "",
    "## Research Metadata Policy",
    "",
    "- Records store native game labels/indices and objective RGB samples only.",
    "- No race, ethnicity, identity, health, attractiveness, or other sensitive labels are recorded.",
    "- Skin presentation is excluded from geometry similarity.",
    "- RGB samples are uncalibrated screen-recording measurements and are not production color truth.",
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

function hex(value) {
  return value.toString(16).padStart(2, "0");
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
