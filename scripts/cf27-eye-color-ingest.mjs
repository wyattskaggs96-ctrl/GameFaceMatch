#!/usr/bin/env node
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_EYE_COLOR_RESEARCH_SCHEMA_VERSION = "cf27-eye-color-research-candidates-v1";
export const CF27_EYE_COLOR_FRAME_MANIFEST_SCHEMA_VERSION = "cf27-eye-color-evidence-frame-manifest-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inventoryPath = "data/research/cf27/video_inventory.json";
const candidateDirectory = "data/research/cf27/catalog-candidates/research/eye-color-options-001-007";
const candidatePackagePath = `${candidateDirectory}/eye_color_research_candidates.json`;
const frameOutputRoot = "data/research/cf27/generated/full-resolution-frames/eye-color-options-001-007";
const frameManifestPath = "data/research/cf27/manifests/eye-color-evidence-frames/eye_color_evidence_frame_manifest.json";
const markdownReportPath = "docs/catalog/EYE_COLOR_RESEARCH_CANDIDATES.md";

const eyeColorRecords = [
  option(1, "Light Blue", "13.0-13.9", 13.0, 1, 1, { x: 125, y: 263, width: 54, height: 42 }, "medium"),
  option(2, "Light Brown", "14.0-15.9", 15.0, 1, 2, { x: 272, y: 263, width: 54, height: 42 }, "medium"),
  option(3, "Brown", "16.0-17.9", 17.0, 1, 3, { x: 419, y: 263, width: 54, height: 42 }, "medium_high"),
  option(4, "Blue", "18.0-20.9", 19.0, 1, 4, { x: 566, y: 263, width: 54, height: 42 }, "medium"),
  option(5, "Light Green", "25.0-29.3", 28.0, 2, 1, { x: 125, y: 409, width: 54, height: 42 }, "medium"),
  option(6, "Grey", "23.0-24.9", 24.0, 2, 2, { x: 272, y: 409, width: 54, height: 42 }, "medium"),
  option(7, "Hazel", "21.0-22.9", 22.0, 2, 3, { x: 419, y: 409, width: 54, height: 42 }, "medium")
];

const selectionSequenceNativeOrders = [1, 2, 3, 4, 7, 6, 5];
const frameRoles = ["MENU_THUMBNAIL_EVIDENCE", "CHARACTER_STABLE"];

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = ingestEyeColorEvidence({
    root: repositoryRoot,
    ffmpegPath: cliValue("--ffmpeg") ?? process.env.CF27_FFMPEG_PATH
  });
  if (!result.ok) process.exitCode = 1;
}

export function ingestEyeColorEvidence({ root = repositoryRoot, ffmpegPath, generatedAt = new Date().toISOString() } = {}) {
  const ffmpeg = resolveFfmpeg(ffmpegPath);
  if (!ffmpeg) {
    console.error("ffmpeg is required. Set CF27_FFMPEG_PATH or pass --ffmpeg.");
    return { ok: false };
  }

  const inventory = readJson(path.join(root, inventoryPath));
  const sourceVideo = inventory.inventory.find((video) => video.inventoryId === "video-007");
  if (!sourceVideo) throw new Error("Missing video-007 Eye Color inventory record.");
  if (!fs.existsSync(sourceVideo.absoluteDiscoveryPathInternal)) {
    throw new Error(`Source video is not available locally: ${sourceVideo.portableRelativeEvidencePath}`);
  }

  const records = [];
  const frames = [];

  for (const candidate of eyeColorRecords) {
    const stableInternalID = `CF27_XBOXUNKNOWN_RTG_EYECOLOR_${String(candidate.nativeOrder).padStart(3, "0")}`;
    const recordFrames = [];

    for (const role of frameRoles) {
      const timestampSeconds = candidate.stableTimestampSeconds;
      const relativeOutputPath = normalizePath(path.join(
        frameOutputRoot,
        stableInternalID,
        `${stableInternalID}_${role}_video-007_${timestampSeconds.toFixed(2).replace(".", "p")}s.png`
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
        role,
        sourceVideoID: "video-007",
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
        selectionNotes: "Full-screen frame extracted from a directly selected Eye Color label. Frame is a local derivative and is not production data."
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

    const sampledIrisColor = sampleApproximateIrisColor({
      ffmpeg,
      sourcePath: sourceVideo.absoluteDiscoveryPathInternal,
      timestampSeconds: candidate.stableTimestampSeconds,
      crop: candidate.sampleCrop
    });

    records.push({
      nativeOrder: candidate.nativeOrder,
      stableInternalID,
      nativeLabelOriginalText: candidate.nativeLabelOriginalText,
      visibleGameLabelOrIndex: candidate.nativeLabelOriginalText,
      category: "Eye Color",
      kind: "additionalFaceMatchingAttribute",
      attributeFamily: "eyeColor",
      originalTextPreserved: true,
      valueType: "nativeLabel",
      affectsTextureRatherThanGeometry: true,
      affectsGeometrySimilarity: false,
      selectedMenuEvidence: [
        {
          videoID: "video-007",
          timestampRangeSeconds: candidate.timestampRangeSeconds,
          stableTimestampSeconds: candidate.stableTimestampSeconds,
          basis: "direct selected Eye Color label visible in the Eye Color grid"
        }
      ],
      sourceImageReferences: recordFrames,
      gridPositionFromNativeIndex: {
        columns: 4,
        nativeRow: candidate.nativeRow,
        nativeColumn: candidate.nativeColumn,
        basis: "visible tile position in the Eye Color grid; selection sequence is stored separately because bottom-row navigation was reverse order"
      },
      sampledIrisColor,
      visibilityAssessment: {
        selectedMenuThumbnailColorVisible: true,
        stableFaceFrameColorVisible: candidate.visibleConfidence === "medium_high" ? "visible" : "limited_visible",
        colorVisibleConfidence: candidate.visibleConfidence,
        flaggedForUnreliableVisibleResult: false,
        reliabilitySummary: "Native label and selected menu thumbnail are readable. Stable face-frame iris color is limited by screen-recording resolution, gaze direction, compression, and lighting.",
        requiresProductionRecaptureForReliableComparison: true
      },
      lightingAndObstructionLimitations: {
        lightingLimitations: [
          "The menu uses dark background lighting and game-rendered eye highlights.",
          "The eye thumbnail is clearer than the live character face for color evaluation."
        ],
        eyeBlackPresent: true,
        eyeBlackImpact: "Eye black does not cover the iris but darkens the under-eye area and can reduce perceived contrast.",
        compressionLimitations: "Screen-recording compression and 1080p resolution limit precise iris-color evaluation.",
        notificationOverlayPresent: candidate.nativeLabelOriginalText === "Light Green",
        notificationOverlayImpact: candidate.nativeLabelOriginalText === "Light Green"
          ? "A bottom-right system notification is visible during the stable frame, but it does not cover the eye-color menu thumbnail or face."
          : "none_observed"
      },
      completenessStatus: {
        menuThumbnailEvidence: "present",
        stableFaceFrame: "present_limited",
        standardizedViews: "not_present",
        selectorCompletenessProven: false,
        requiredProductionRecapture: true,
        notes: "Recording is valid for directly selected label/order evidence. It is not a standardized production comparison capture."
      },
      researchMetadata: {
        sampledIrisColor,
        colorSamplingPolicy: "Approximate color is sampled from the selected menu thumbnail eye-region crop; it does not replace the native label.",
        nativeLabelPolicy: "Native game label is authoritative. Do not substitute generic color names for unreadable or unverified labels.",
        sensitiveTraitPolicy: "Eye color is recorded only as a game appearance setting. No identity, ethnicity, health, attractiveness, or other sensitive inference is recorded."
      },
      dependencies: {
        status: "UNKNOWN",
        notes: [
          "Platform, patch, mode, body, position, head, skin, and account-state dependencies are not proven by this recording.",
          "Selected head appears visually constant during this recording, but dependency testing remains required."
        ]
      },
      verificationState: "NOT_VERIFIED",
      productionStatus: "NOT_PRODUCTION_DATA"
    });
  }

  const recordsByNativeOrder = new Map(records.map((record) => [record.nativeOrder, record]));
  const candidatePackage = {
    schemaVersion: CF27_EYE_COLOR_RESEARCH_SCHEMA_VERSION,
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
      category: "Eye Color",
      directlySelectedRecordCount: records.length,
      directlySelectedNativeLabels: records.map((record) => record.nativeLabelOriginalText),
      nativeOrderRangeObserved: "7 visible Eye Color tiles directly selected",
      completeCategoryCountClaimed: false,
      excludedLabels: ["unselected or unseen Eye Color values, if any"],
      reasonCompletenessIsNotClaimed: "The recording shows seven visible selected tiles, but does not prove wrap behavior or a hard final selector boundary."
    },
    context: {
      platformCode: "XBOXUNKNOWN",
      modeCode: "RTG",
      gameVersion: "UNKNOWN",
      patchVersion: "UNKNOWN",
      creationPath: "Road to Glory / Create Player / Player / Appearance / Head & Skin / Eye Color",
      sourceVideoID: "video-007"
    },
    selectorObservations: {
      gridStructure: "4-column grid with 7 visible tiles",
      nativeOrderBasis: "visible tile position in the Eye Color grid",
      selectionSequenceBasis: "direct selected labels in the recording",
      firstObservedSelectedValue: "Light Blue",
      finalObservedSelectedValue: "Light Green",
      selectorAppearsComplete: false,
      selectorCompletenessExplanation: "All seven visible tiles are selected during the recording, but final boundary and wrap behavior are not shown.",
      wrapObserved: false,
      eyeColorChangesVisibleIrisPresentation: true,
      approximateColorSamplingComputed: true,
      otherVisibleSettingsChangedWhenChoosingEyeColor: false,
      characterRotationAvailable: true,
      selectedHeadRemainsConstant: true,
      eyeBlackPresent: true,
      eyeBlackEvaluationImpact: "Eye black does not cover the iris but can affect under-eye contrast and perceived color in the stable face frame."
    },
    observationPolicy: {
      nativeLabelsPreserved: true,
      noGenericColorSubstitutionForUnreadableLabels: true,
      sampledColorIsDerivedResearchMetadataOnly: true,
      noSensitiveTraitInference: true,
      eyeColorExcludedFromGeometrySimilarity: true,
      productionUseAllowed: false,
      sourceMasterPreserved: true,
      derivativesAreLocalAndGitIgnored: true
    },
    sourceVideos: [
      {
        videoID: "video-007",
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
    unreliableVisibleResultFlags: records
      .filter((record) => record.visibilityAssessment.flaggedForUnreliableVisibleResult)
      .map((record) => record.stableInternalID),
    labelsRequiringManualTextConfirmation: [],
    manualTextConfirmationNotes: "All seven selected native Eye Color labels were readable in direct frame inspection. Reconfirm all labels during second-person verification before production.",
    records,
    productionBlocks: [
      "Records are primary research only and not second-person verified.",
      "Game version, patch, and exact platform are still unknown.",
      "Selector wrap and final category boundary are not proven.",
      "Stable character-frame iris color is limited by resolution, lighting, gaze direction, and compression.",
      "Production catalog remains empty until verified evidence is reviewed and published."
    ]
  };

  const frameManifest = {
    schemaVersion: CF27_EYE_COLOR_FRAME_MANIFEST_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "RESEARCH_DERIVATIVE",
    sourceType: "researchDerivative",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    sourcePackage: candidatePackagePath,
    outputRoot: frameOutputRoot,
    frameStoragePolicy: "Generated full-resolution Eye Color frame derivatives are git-ignored. Commit this manifest and research package, not binary frames.",
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

function option(nativeOrder, nativeLabelOriginalText, timestampRangeSeconds, stableTimestampSeconds, nativeRow, nativeColumn, sampleCrop, visibleConfidence) {
  return { nativeOrder, nativeLabelOriginalText, timestampRangeSeconds, stableTimestampSeconds, nativeRow, nativeColumn, sampleCrop, visibleConfidence };
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

function sampleApproximateIrisColor({ ffmpeg, sourcePath, timestampSeconds, crop }) {
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
    "-vf",
    `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`,
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgb24",
    "-"
  ], { encoding: "buffer", maxBuffer: crop.width * crop.height * 3 + 1024 * 1024 });
  if (result.status !== 0) {
    return {
      status: "UNAVAILABLE",
      unavailableReason: result.stderr?.toString("utf8") || `ffmpeg exited ${result.status}`,
      source: "selected_menu_thumbnail_crop"
    };
  }

  const bytes = result.stdout;
  const selected = [];
  for (let index = 0; index + 2 < bytes.length; index += 3) {
    const red = bytes[index];
    const green = bytes[index + 1];
    const blue = bytes[index + 2];
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const brightness = max;
    if (brightness > 28 && brightness < 235 && saturation > 0.08) {
      selected.push([red, green, blue]);
    }
  }
  const pixels = selected.length > 0 ? selected : bytesToPixels(bytes);
  const average = pixels.reduce((sum, [red, green, blue]) => {
    sum.red += red;
    sum.green += green;
    sum.blue += blue;
    return sum;
  }, { red: 0, green: 0, blue: 0 });
  const count = Math.max(pixels.length, 1);
  const rgb = {
    red: Math.round(average.red / count),
    green: Math.round(average.green / count),
    blue: Math.round(average.blue / count)
  };
  return {
    status: "ESTIMATED",
    source: "selected_menu_thumbnail_crop",
    timestampSeconds,
    crop,
    averageRgb: rgb,
    approximateHex: rgbToHex(rgb),
    sampledPixelCount: pixels.length,
    method: "Average of saturated non-extreme RGB pixels from a fixed selected-menu-thumbnail crop. This is research metadata, not a replacement for the native game label.",
    limitations: [
      "The crop includes game-rendered eye highlights, shadow, eyelid edges, and compression artifacts.",
      "The sampled value is approximate and should not be treated as a verified colorimetry measurement."
    ]
  };
}

function bytesToPixels(bytes) {
  const pixels = [];
  for (let index = 0; index + 2 < bytes.length; index += 3) {
    pixels.push([bytes[index], bytes[index + 1], bytes[index + 2]]);
  }
  return pixels;
}

function rgbToHex({ red, green, blue }) {
  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function toMarkdown(candidatePackage, frameManifest) {
  const labels = candidatePackage.records.map((record) => record.nativeLabelOriginalText).join(", ");
  const nativeRows = candidatePackage.nativeOrder
    .map((record) => {
      const candidate = candidatePackage.records.find((item) => item.nativeOrder === record.nativeOrder);
      return `| ${record.nativeOrder} | ${record.nativeLabelOriginalText} | ${record.nativeRow} | ${record.nativeColumn} | ${candidate.sampledIrisColor.approximateHex ?? "unavailable"} | ${candidate.visibilityAssessment.colorVisibleConfidence} |`;
    })
    .join("\n");
  const lines = [
    "# Eye Color Research Candidates",
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
    "The recording selects seven visible Eye Color tiles, but it does not prove wrap behavior or a hard final selector boundary. No total category count is claimed.",
    "",
    "## Native Order",
    "",
    "| Native order | Native label text | Row | Column | Approx sampled thumbnail color | Visibility confidence |",
    "| --- | --- | --- | --- | --- | --- |",
    nativeRows,
    "",
    "## Selection Sequence",
    "",
    `The direct selection sequence is: ${candidatePackage.selectionSequence.map((entry) => entry.nativeLabelOriginalText).join(" -> ")}.`,
    "",
    "## Visibility and Capture QA",
    "",
    "- Eye Color is recorded as an appearance/presentation attribute, not geometry.",
    "- Approximate sampled iris color is derived metadata from the selected menu thumbnail crop and does not replace the native label.",
    "- Stable face-frame iris color is limited by resolution, lighting, gaze direction, and compression.",
    "- Eye black is present but does not cover the iris.",
    "- Standardized production recapture is still required before verified catalog publication.",
    "",
    "## Unreliable Result Flags",
    "",
    candidatePackage.unreliableVisibleResultFlags.length === 0
      ? "- No directly selected option is currently flagged as completely unevaluable from the selected menu thumbnail, but all face-frame color evaluation remains limited."
      : candidatePackage.unreliableVisibleResultFlags.map((id) => `- ${id}`).join("\n"),
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
