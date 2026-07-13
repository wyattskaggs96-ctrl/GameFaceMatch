#!/usr/bin/env node
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_NOSE_RESEARCH_SCHEMA_VERSION = "cf27-nose-research-candidates-v1";
export const CF27_NOSE_FRAME_MANIFEST_SCHEMA_VERSION = "cf27-nose-evidence-frame-manifest-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inventoryPath = "data/research/cf27/video_inventory.json";
const candidateDirectory = "data/research/cf27/catalog-candidates/research/nose-options-001-007";
const candidatePackagePath = `${candidateDirectory}/nose_research_candidates.json`;
const frameOutputRoot = "data/research/cf27/generated/full-resolution-frames/nose-options-001-007";
const frameManifestPath = "data/research/cf27/manifests/nose-evidence-frames/nose_evidence_frame_manifest.json";
const markdownReportPath = "docs/catalog/NOSE_RESEARCH_CANDIDATES.md";

const frameRoles = ["MENU_EVIDENCE", "FRONT", "BEST_AVAILABLE_THREE_QUARTER"];

const noseRecords = [
  option(1, "None", [{ range: "15.0-15.9", stableTimestampSeconds: 15.0 }], 15.0, 15.0, 1, 1, "medium"),
  option(2, "Hooked", [{ range: "16.0-18.9", stableTimestampSeconds: 17.0 }], 17.0, 18.0, 1, 2, "medium_high"),
  option(3, "Button", [{ range: "19.0-20.9", stableTimestampSeconds: 19.0 }], 19.0, 20.0, 1, 3, "medium"),
  option(4, "Nubian", [{ range: "21.0-22.9", stableTimestampSeconds: 21.0 }], 21.0, 22.0, 1, 4, "medium"),
  option(5, "Aquiline", [
    { range: "14.0-14.9", stableTimestampSeconds: 14.0 },
    { range: "28.0-32.45", stableTimestampSeconds: 29.0 }
  ], 29.0, 14.0, 2, 1, "medium_high"),
  option(6, "Roman", [{ range: "25.0-27.9", stableTimestampSeconds: 26.0 }], 26.0, 25.0, 2, 2, "medium"),
  option(7, "Funnel", [{ range: "23.0-24.9", stableTimestampSeconds: 23.0 }], 23.0, 24.0, 2, 3, "medium")
];

const selectionSequenceNativeOrders = [5, 1, 2, 3, 4, 7, 6, 5];

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = ingestNoseEvidence({
    root: repositoryRoot,
    ffmpegPath: cliValue("--ffmpeg") ?? process.env.CF27_FFMPEG_PATH
  });
  if (!result.ok) process.exitCode = 1;
}

export function ingestNoseEvidence({ root = repositoryRoot, ffmpegPath, generatedAt = new Date().toISOString() } = {}) {
  const ffmpeg = resolveFfmpeg(ffmpegPath);
  if (!ffmpeg) {
    console.error("ffmpeg is required. Set CF27_FFMPEG_PATH or pass --ffmpeg.");
    return { ok: false };
  }

  const inventory = readJson(path.join(root, inventoryPath));
  const sourceVideo = inventory.inventory.find((video) => video.inventoryId === "video-008");
  if (!sourceVideo) throw new Error("Missing video-008 Nose inventory record.");
  if (!fs.existsSync(sourceVideo.absoluteDiscoveryPathInternal)) {
    throw new Error(`Source video is not available locally: ${sourceVideo.portableRelativeEvidencePath}`);
  }

  const records = [];
  const frames = [];

  for (const candidate of noseRecords) {
    const stableInternalID = `CF27_XBOXUNKNOWN_RTG_NOSE_${String(candidate.nativeOrder).padStart(3, "0")}`;
    const recordFrames = [];
    const roleTimestamps = {
      MENU_EVIDENCE: candidate.menuEvidenceTimestampSeconds,
      FRONT: candidate.frontTimestampSeconds,
      BEST_AVAILABLE_THREE_QUARTER: candidate.threeQuarterTimestampSeconds
    };

    for (const role of frameRoles) {
      const timestampSeconds = roleTimestamps[role];
      const relativeOutputPath = normalizePath(path.join(
        frameOutputRoot,
        stableInternalID,
        `${stableInternalID}_${role}_video-008_${timestampSeconds.toFixed(2).replace(".", "p")}s.png`
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
        sourceVideoID: "video-008",
        sourceWorkingFilename: sourceVideo.workingFilename,
        portableRelativeEvidencePath: sourceVideo.portableRelativeEvidencePath,
        sourceVideoSha256: sourceVideo.sha256,
        sourceTimestampSeconds: timestampSeconds,
        selectedMenuEvidenceRangesSeconds: candidate.selectedMenuEvidenceRanges.map((entry) => entry.range),
        outputRelativePath: relativeOutputPath,
        outputSha256: sha256File(absoluteOutputPath),
        outputSizeBytes: stat.size,
        outputFormat: "png",
        width: sourceVideo.resolution.width,
        height: sourceVideo.resolution.height,
        aspectRatio: `${sourceVideo.resolution.width}:${sourceVideo.resolution.height}`,
        preservesOriginalAspectRatio: true,
        appearanceAltered: false,
        selectionNotes: "Full-screen frame extracted from a directly selected Nose label. Frame is a local derivative and is not production data."
      };
      frames.push(frame);
      recordFrames.push({
        role,
        frameID: frame.frameID,
        outputRelativePath: frame.outputRelativePath,
        outputSha256: frame.outputSha256,
        sourceTimestampSeconds: frame.sourceTimestampSeconds
      });
    }

    records.push({
      nativeOrder: candidate.nativeOrder,
      stableInternalID,
      nativeLabelOriginalText: candidate.nativeLabelOriginalText,
      visibleGameLabelOrIndex: candidate.nativeLabelOriginalText,
      category: "Nose",
      kind: "faceGeometryAttribute",
      attributeFamily: "nose",
      originalTextPreserved: true,
      valueType: "nativeLabel",
      selectedMenuEvidence: candidate.selectedMenuEvidenceRanges.map((entry) => ({
        videoID: "video-008",
        timestampRangeSeconds: entry.range,
        stableTimestampSeconds: entry.stableTimestampSeconds,
        basis: "direct selected Nose label visible in the Nose grid"
      })),
      sourceImageReferences: recordFrames,
      gridPositionFromNativeIndex: {
        columns: 4,
        nativeRow: candidate.nativeRow,
        nativeColumn: candidate.nativeColumn,
        basis: "visible tile position in the Nose grid; selection sequence is stored separately because Aquiline was selected at the beginning and again near the end"
      },
      geometryObservation: {
        appearsGeometryChanging: true,
        geometryChangeEvidence: "The native Nose category uses side-profile nose thumbnails and the live character nose presentation visibly changes. No numerical measurement is computed from this ingest.",
        geometryMeasurementComputed: false,
        measurementStatus: "NOT_MEASURED",
        depthAvailable: false,
        depthAvailabilityReason: "Research source is a 2D RGB Xbox screen recording, not TrueDepth, depth, or ARKit capture."
      },
      viewAvailability: {
        menuEvidence: "present",
        frontFrame: "present_limited_nonstandard",
        bestAvailableThreeQuarterFrame: "present_limited_nonstandard",
        profileViewAvailable: false,
        profileViewSource: "menu_thumbnail_only_not_live_character_profile",
        profileViewNotes: "Only side-profile menu thumbnails are visible. No standardized live-character left or right profile was captured in this recording.",
        standardizedProductionCaptureAvailable: false
      },
      visualDistinguishability: {
        selectedMenuThumbnailVisible: true,
        liveCharacterDifferenceVisible: candidate.visualConfidence,
        summary: "Native label and selected menu tile are readable. Live-character comparison is limited by rotation, screen-recording compression, and non-standard camera angles.",
        subjectiveDescriptorsAvoided: true
      },
      missingViews: [
        "STANDARDIZED_FRONT",
        "STANDARDIZED_LEFT_45",
        "STANDARDIZED_RIGHT_45",
        "LEFT_PROFILE",
        "RIGHT_PROFILE",
        "ELEVATED",
        "LOWERED"
      ],
      recaptureNeed: {
        required: true,
        reasons: [
          "Recording is valid for selected label/order evidence but is not a standardized production comparison capture.",
          "No standardized live-character profile view is present.",
          "Front and three-quarter frames are best available full-screen derivatives, not controlled catalog capture frames.",
          "Game version, patch, and exact Xbox model remain unknown."
        ],
        couldOneStandardizedRunRepairAllObservedNoseRecords: true
      },
      dependencies: {
        status: "UNKNOWN",
        notes: [
          "Platform, patch, mode, body, position, head, skin, account-state, and unlock dependencies are not proven by this recording.",
          "No setting interaction or dependency test is completed for Nose options."
        ]
      },
      verificationState: "NOT_VERIFIED",
      productionStatus: "NOT_PRODUCTION_DATA"
    });
  }

  const recordsByNativeOrder = new Map(records.map((record) => [record.nativeOrder, record]));
  const repeatedSelections = selectionSequenceNativeOrders
    .map((nativeOrder, index) => ({ nativeOrder, index }))
    .filter((entry, _index, sequence) => sequence.findIndex((candidate) => candidate.nativeOrder === entry.nativeOrder) !== sequence.findLastIndex((candidate) => candidate.nativeOrder === entry.nativeOrder))
    .map((entry) => entry.nativeOrder);

  const candidatePackage = {
    schemaVersion: CF27_NOSE_RESEARCH_SCHEMA_VERSION,
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
      category: "Nose",
      directlySelectedRecordCount: records.length,
      directlySelectedNativeLabels: records.map((record) => record.nativeLabelOriginalText),
      nativeOrderRangeObserved: "7 visible Nose tiles directly selected",
      completeCategoryCountClaimed: false,
      excludedLabels: ["unselected or unseen Nose values, if any"],
      reasonCompletenessIsNotClaimed: "The recording ends while Aquiline is selected again and does not prove wrap behavior, hard final selector boundary, or total category count."
    },
    context: {
      platformCode: "XBOXUNKNOWN",
      modeCode: "RTG",
      gameVersion: "UNKNOWN",
      patchVersion: "UNKNOWN",
      creationPath: "Road to Glory / Create Player / Player / Appearance / Head & Skin / Nose",
      sourceVideoID: "video-008"
    },
    selectorObservations: {
      gridStructure: "4-column grid with 7 visible tiles",
      nativeOrderBasis: "visible tile position in the Nose grid",
      selectionSequenceBasis: "direct selected labels in the recording",
      selectedOptionIndicator: "white border around the selected tile",
      equippedOptionIndicator: "green check mark appears on the currently equipped option and is not used as the selected-option indicator",
      firstObservedSelectedValue: "Aquiline",
      finalObservedSelectedValue: "Aquiline",
      repeatedSelectionNativeOrders: [...new Set(repeatedSelections)],
      repeatedSelectionExplanation: "Aquiline is selected at the beginning and again near the end. It is one native catalog identity with multiple observations, not two records.",
      selectorAppearsComplete: false,
      selectorCompletenessExplanation: "Seven visible tiles are selected during the recording, but final boundary and wrap behavior are not shown.",
      wrapObserved: false,
      noseChangesVisibleGeometryPresentation: true,
      geometryMeasurementComputed: false,
      otherVisibleSettingsChangedWhenChoosingNose: false,
      characterRotationAvailable: true,
      selectedHeadRemainsConstant: true
    },
    observationPolicy: {
      nativeLabelsPreserved: true,
      noSubjectiveAppearanceDescriptions: true,
      noEthnicityAttractivenessIdentityOrRealPersonResemblance: true,
      geometryObservationIsQualitativeOnly: true,
      noDepthOrTrueDepthClaim: true,
      productionUseAllowed: false,
      sourceMasterPreserved: true,
      derivativesAreLocalAndGitIgnored: true
    },
    sourceVideos: [
      {
        videoID: "video-008",
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
      const evidenceIndex = nativeOrder === 5 && index === selectionSequenceNativeOrders.length - 1 ? 1 : 0;
      const evidence = record.selectedMenuEvidence[evidenceIndex] ?? record.selectedMenuEvidence[0];
      return {
        sequenceOrder: index + 1,
        nativeOrder,
        stableInternalID: record.stableInternalID,
        nativeLabelOriginalText: record.nativeLabelOriginalText,
        timestampRangeSeconds: evidence.timestampRangeSeconds,
        stableTimestampSeconds: evidence.stableTimestampSeconds,
        selectionType: nativeOrder === 5 && index === selectionSequenceNativeOrders.length - 1
          ? "deliberately_reselected_same_native_identity"
          : "deliberately_selected"
      };
    }),
    labelsRequiringManualTextConfirmation: [],
    manualTextConfirmationNotes: "All seven selected native Nose labels were readable in direct frame inspection. Reconfirm all labels during second-person verification before production.",
    categoryCompletenessWarnings: [
      "The footage ends with Aquiline selected and does not prove whether additional Nose options exist.",
      "No total count is claimed.",
      "Profile comparison views for the live character are missing."
    ],
    records,
    productionBlocks: [
      "Records are primary research only and not second-person verified.",
      "Game version, patch, and exact platform are still unknown.",
      "Selector wrap and final category boundary are not proven.",
      "No standardized live-character profile views are available.",
      "Production catalog remains empty until verified evidence is reviewed and published."
    ]
  };

  const frameManifest = {
    schemaVersion: CF27_NOSE_FRAME_MANIFEST_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "RESEARCH_DERIVATIVE",
    sourceType: "researchDerivative",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    sourcePackage: candidatePackagePath,
    outputRoot: frameOutputRoot,
    frameStoragePolicy: "Generated full-resolution Nose frame derivatives are git-ignored. Commit this manifest and research package, not binary frames.",
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

function option(nativeOrder, nativeLabelOriginalText, selectedMenuEvidenceRanges, frontTimestampSeconds, threeQuarterTimestampSeconds, nativeRow, nativeColumn, visualConfidence) {
  return {
    nativeOrder,
    nativeLabelOriginalText,
    selectedMenuEvidenceRanges,
    menuEvidenceTimestampSeconds: selectedMenuEvidenceRanges.at(-1).stableTimestampSeconds,
    frontTimestampSeconds,
    threeQuarterTimestampSeconds,
    nativeRow,
    nativeColumn,
    visualConfidence
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
    .map((record) => {
      const candidate = candidatePackage.records.find((item) => item.nativeOrder === record.nativeOrder);
      return `| ${record.nativeOrder} | ${record.nativeLabelOriginalText} | ${record.nativeRow} | ${record.nativeColumn} | ${candidate.selectedMenuEvidence.map((entry) => entry.timestampRangeSeconds).join(", ")} | ${candidate.viewAvailability.profileViewAvailable ? "yes" : "no"} |`;
    })
    .join("\n");
  const sequence = candidatePackage.selectionSequence.map((entry) => entry.nativeLabelOriginalText).join(" -> ");
  const lines = [
    "# Nose Research Candidates",
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
    "The recording directly shows seven selected Nose tiles. It does **not** prove the complete category count, selector wrap behavior, or final boundary.",
    "",
    "## Native Order",
    "",
    "| Native order | Native label text | Row | Column | Selected evidence ranges | Live profile view |",
    "| --- | --- | --- | --- | --- | --- |",
    nativeRows,
    "",
    "## Selection Sequence",
    "",
    `The direct selection sequence is: ${sequence}.`,
    "",
    "Aquiline is selected at the beginning and again near the end. It is preserved as one catalog identity with multiple observations, not duplicated as two records.",
    "",
    "## Geometry and Capture QA",
    "",
    "- Nose is recorded as a geometry-related appearance setting, but this ingest computes no numerical measurement.",
    "- Source evidence is a 2D RGB Xbox screen recording. No depth, TrueDepth, ARKit, or 3D reconstruction is claimed.",
    "- Side-profile menu thumbnails are visible, but no standardized live-character profile view is present.",
    "- Front and best available three-quarter frames are full-screen derivatives from the recording and remain non-standard production evidence.",
    "- Standardized recapture is required before production matching or verified catalog publication.",
    "",
    "## Missing Views",
    "",
    "- Standardized front",
    "- Standardized left 45",
    "- Standardized right 45",
    "- Left profile",
    "- Right profile",
    "- Elevated",
    "- Lowered",
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
