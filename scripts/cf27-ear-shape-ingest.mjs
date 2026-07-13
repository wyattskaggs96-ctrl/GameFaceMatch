#!/usr/bin/env node
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_EAR_SHAPE_RESEARCH_SCHEMA_VERSION = "cf27-ear-shape-research-candidates-v1";
export const CF27_EAR_SHAPE_FRAME_MANIFEST_SCHEMA_VERSION = "cf27-ear-shape-evidence-frame-manifest-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inventoryPath = "data/research/cf27/video_inventory.json";
const candidateDirectory = "data/research/cf27/catalog-candidates/research/ear-shape-options-001-004";
const candidatePackagePath = `${candidateDirectory}/ear_shape_research_candidates.json`;
const frameOutputRoot = "data/research/cf27/generated/full-resolution-frames/ear-shape-options-001-004";
const frameManifestPath = "data/research/cf27/manifests/ear-shape-evidence-frames/ear_shape_evidence_frame_manifest.json";
const markdownReportPath = "docs/catalog/EAR_SHAPE_RESEARCH_CANDIDATES.md";

const frameRoles = ["MENU_EVIDENCE", "BEST_AVAILABLE_SIDE_OR_THREE_QUARTER"];

const earShapeRecords = [
  option(1, "Attached Lobe", [
    { range: "18.0-21.9", stableTimestampSeconds: 18.0, evidenceType: "selected_grid_tile" }
  ], 18.0, 21.0, 1, 1, "medium"),
  option(2, "None", [
    { range: "17.0-17.9", stableTimestampSeconds: 17.0, evidenceType: "label_visible_before_grid" },
    { range: "23.0-23.9", stableTimestampSeconds: 23.0, evidenceType: "selected_grid_tile" }
  ], 23.0, 23.0, 1, 2, "medium"),
  option(3, "Round Free Lobe", [
    { range: "24.0-25.9", stableTimestampSeconds: 24.0, evidenceType: "selected_grid_tile" }
  ], 24.0, 24.0, 1, 3, "medium"),
  option(4, "Pointed", [
    { range: "26.0-30.21", stableTimestampSeconds: 26.0, evidenceType: "selected_grid_tile" }
  ], 26.0, 26.0, 1, 4, "medium")
];

const selectionSequenceNativeOrders = [2, 1, 2, 3, 4];

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = ingestEarShapeEvidence({
    root: repositoryRoot,
    ffmpegPath: cliValue("--ffmpeg") ?? process.env.CF27_FFMPEG_PATH
  });
  if (!result.ok) process.exitCode = 1;
}

export function ingestEarShapeEvidence({ root = repositoryRoot, ffmpegPath, generatedAt = new Date().toISOString() } = {}) {
  const ffmpeg = resolveFfmpeg(ffmpegPath);
  if (!ffmpeg) {
    console.error("ffmpeg is required. Set CF27_FFMPEG_PATH or pass --ffmpeg.");
    return { ok: false };
  }

  const inventory = readJson(path.join(root, inventoryPath));
  const sourceVideo = inventory.inventory.find((video) => video.inventoryId === "video-009");
  if (!sourceVideo) throw new Error("Missing video-009 Ear Shape inventory record.");
  if (!fs.existsSync(sourceVideo.absoluteDiscoveryPathInternal)) {
    throw new Error(`Source video is not available locally: ${sourceVideo.portableRelativeEvidencePath}`);
  }

  const records = [];
  const frames = [];

  for (const candidate of earShapeRecords) {
    const stableInternalID = `CF27_XBOXUNKNOWN_RTG_EARSHAPE_${String(candidate.nativeOrder).padStart(3, "0")}`;
    const recordFrames = [];
    const roleTimestamps = {
      MENU_EVIDENCE: candidate.menuEvidenceTimestampSeconds,
      BEST_AVAILABLE_SIDE_OR_THREE_QUARTER: candidate.sideOrThreeQuarterTimestampSeconds
    };

    for (const role of frameRoles) {
      const timestampSeconds = roleTimestamps[role];
      const relativeOutputPath = normalizePath(path.join(
        frameOutputRoot,
        stableInternalID,
        `${stableInternalID}_${role}_video-009_${timestampSeconds.toFixed(2).replace(".", "p")}s.png`
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
        sourceVideoID: "video-009",
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
        selectionNotes: "Full-screen frame extracted from a directly selected Ear Shape label. Frame is a local derivative and is not production data."
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
      category: "Ear Shape",
      kind: "faceGeometryAttribute",
      attributeFamily: "earShape",
      originalTextPreserved: true,
      valueType: "nativeLabel",
      selectedMenuEvidence: candidate.selectedMenuEvidenceRanges.map((entry) => ({
        videoID: "video-009",
        timestampRangeSeconds: entry.range,
        stableTimestampSeconds: entry.stableTimestampSeconds,
        evidenceType: entry.evidenceType,
        basis: entry.evidenceType === "selected_grid_tile"
          ? "direct selected Ear Shape grid tile visible in the Ear Shape menu"
          : "native Ear Shape label visible after navigation before the grid is shown"
      })),
      sourceImageReferences: recordFrames,
      gridPositionFromNativeIndex: {
        columns: 4,
        nativeRow: candidate.nativeRow,
        nativeColumn: candidate.nativeColumn,
        basis: "visible tile position in the Ear Shape grid. The green check is stored as equipped-state context, not selected native order."
      },
      geometryObservation: {
        appearsGeometryChanging: true,
        geometryChangeEvidence: "The native Ear Shape category uses side-ear thumbnails and the visible lateral ear changes across selected grid tiles. No numerical measurement is computed from this ingest.",
        geometryMeasurementComputed: false,
        measurementStatus: "NOT_MEASURED",
        depthAvailable: false,
        depthAvailabilityReason: "Research source is a 2D RGB Xbox screen recording, not TrueDepth, depth, or ARKit capture."
      },
      earVisibility: {
        singleLateralEarVisible: true,
        bothEarsEvaluated: false,
        leftEarVisibility: "NOT_CONFIRMED_FROM_RECORDING",
        rightEarVisibility: "NOT_CONFIRMED_FROM_RECORDING",
        visibleEarSideDescription: "One lateral ear is visible in the live character frame. The recording is not used to assert whether it is the character's left or right ear.",
        menuThumbnailEarSide: "single_side_thumbnail"
      },
      hairstyleObstruction: {
        status: "PARTIAL",
        notes: "Hair is close to the upper and rear ear area. The ear outline and lobe region remain visible, but standardized recapture with controlled hair/framing is required."
      },
      visualDistinguishability: {
        selectedMenuThumbnailVisible: true,
        liveCharacterEarVisible: true,
        selectedOptionDistinguishable: candidate.visualConfidence,
        summary: "Native label and selected menu tile are readable. Live-character ear comparison is limited by hairstyle, single-side visibility, screen-recording compression, and non-standard rotation.",
        subjectiveDescriptorsAvoided: true
      },
      completenessStatus: {
        menuEvidence: "present",
        sideOrThreeQuarterFrame: "present_limited_nonstandard",
        leftEarEvaluated: false,
        rightEarEvaluated: false,
        bothEarsEvaluated: false,
        selectorCompletenessProven: false,
        requiredProductionRecapture: true,
        notes: "Recording is valid for directly selected label/order evidence. It is not a standardized production comparison capture and does not prove complete category count."
      },
      missingViews: [
        "OPPOSITE_EAR_SIDE",
        "STANDARDIZED_LEFT_PROFILE",
        "STANDARDIZED_RIGHT_PROFILE",
        "STANDARDIZED_LEFT_45",
        "STANDARDIZED_RIGHT_45",
        "HAIR_PULLED_CLEAR_OF_EARS"
      ],
      recaptureNeed: {
        required: true,
        reasons: [
          "Only one lateral ear side is visible in the live character frames.",
          "Hair partially obstructs or borders the upper/rear ear area.",
          "Selector wrap and final category boundary are not proven.",
          "Game version, patch, and exact Xbox model remain unknown."
        ],
        couldOneStandardizedRunRepairAllObservedEarShapeRecords: true
      },
      dependencies: {
        status: "UNKNOWN",
        notes: [
          "Platform, patch, mode, body, position, head, hairstyle, account-state, and unlock dependencies are not proven by this recording.",
          "No setting interaction or dependency test is completed for Ear Shape options."
        ]
      },
      verificationState: "NOT_VERIFIED",
      productionStatus: "NOT_PRODUCTION_DATA"
    });
  }

  const recordsByNativeOrder = new Map(records.map((record) => [record.nativeOrder, record]));
  const repeatedSelections = selectionSequenceNativeOrders
    .filter((nativeOrder, index, sequence) => sequence.indexOf(nativeOrder) !== sequence.lastIndexOf(nativeOrder));

  const candidatePackage = {
    schemaVersion: CF27_EAR_SHAPE_RESEARCH_SCHEMA_VERSION,
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
      category: "Ear Shape",
      directlySelectedRecordCount: records.length,
      directlySelectedNativeLabels: records.map((record) => record.nativeLabelOriginalText),
      nativeOrderRangeObserved: "4 visible Ear Shape tiles directly selected",
      completeCategoryCountClaimed: false,
      excludedLabels: ["unselected or unseen Ear Shape values, if any"],
      reasonCompletenessIsNotClaimed: "The recording ends while Pointed is selected and does not prove wrap behavior, hard final selector boundary, or total category count."
    },
    context: {
      platformCode: "XBOXUNKNOWN",
      modeCode: "RTG",
      gameVersion: "UNKNOWN",
      patchVersion: "UNKNOWN",
      creationPath: "Road to Glory / Create Player / Player / Appearance / Head & Skin / Ear Shape",
      sourceVideoID: "video-009"
    },
    selectorObservations: {
      gridStructure: "4-column single-row grid with 4 visible Ear Shape tiles",
      nativeOrderBasis: "visible tile position in the Ear Shape grid after the category finishes loading",
      selectionSequenceBasis: "direct selected labels in the recording",
      selectedOptionIndicator: "white border around the selected tile",
      equippedOptionIndicator: "green check mark appears on the currently equipped option and is not used as the selected-option indicator",
      firstObservedSelectedValue: "None",
      firstGridSelectedValue: "Attached Lobe",
      finalObservedSelectedValue: "Pointed",
      repeatedSelectionNativeOrders: [...new Set(repeatedSelections)],
      repeatedSelectionExplanation: "None is visible before the grid appears and later selected as the second grid tile. It is one native catalog identity with multiple observations, not two records.",
      timelineCorrectionNotes: [
        "The 1fps timeline listed 21.0-22.0 as None, but full-frame inspection shows Attached Lobe remains selected at 21s.",
        "The 16s frame still shows the prior Nose heading while Ear Shape is selected in the tab bar, so native order is based on the loaded Ear Shape grid beginning at 18s."
      ],
      selectorAppearsComplete: false,
      selectorCompletenessExplanation: "Four visible tiles are selected during the recording, but final boundary and wrap behavior are not shown.",
      wrapObserved: false,
      earShapeChangesVisibleEarPresentation: true,
      geometryMeasurementComputed: false,
      otherVisibleSettingsChangedWhenChoosingEarShape: false,
      characterRotationAvailable: true,
      selectedHeadRemainsConstant: true
    },
    observationPolicy: {
      nativeLabelsPreserved: true,
      noSubjectiveAppearanceDescriptions: true,
      noEthnicityAttractivenessIdentityOrRealPersonResemblance: true,
      singleVisibleEarOnly: true,
      noBothEarsClaim: true,
      geometryObservationIsQualitativeOnly: true,
      noDepthOrTrueDepthClaim: true,
      productionUseAllowed: false,
      sourceMasterPreserved: true,
      derivativesAreLocalAndGitIgnored: true
    },
    sourceVideos: [
      {
        videoID: "video-009",
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
      const evidenceIndex = nativeOrder === 2 && index === 2 ? 1 : 0;
      const evidence = record.selectedMenuEvidence[evidenceIndex] ?? record.selectedMenuEvidence[0];
      return {
        sequenceOrder: index + 1,
        nativeOrder,
        stableInternalID: record.stableInternalID,
        nativeLabelOriginalText: record.nativeLabelOriginalText,
        timestampRangeSeconds: evidence.timestampRangeSeconds,
        stableTimestampSeconds: evidence.stableTimestampSeconds,
        selectionType: nativeOrder === 2 && index === 2
          ? "deliberately_reselected_same_native_identity"
          : evidence.evidenceType === "label_visible_before_grid"
            ? "initial_loaded_label_before_grid"
            : "deliberately_selected"
      };
    }),
    labelsRequiringManualTextConfirmation: [],
    manualTextConfirmationNotes: "All four selected native Ear Shape labels were readable in direct frame inspection. Reconfirm all labels during second-person verification before production.",
    categoryCompletenessWarnings: [
      "The footage ends with Pointed selected and does not prove whether additional Ear Shape options exist.",
      "No total count is claimed.",
      "Only one lateral live-character ear side is visible."
    ],
    records,
    productionBlocks: [
      "Records are primary research only and not second-person verified.",
      "Game version, patch, and exact platform are still unknown.",
      "Selector wrap and final category boundary are not proven.",
      "Only one lateral ear side is visible in live-character evidence.",
      "Production catalog remains empty until verified evidence is reviewed and published."
    ]
  };

  const frameManifest = {
    schemaVersion: CF27_EAR_SHAPE_FRAME_MANIFEST_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "RESEARCH_DERIVATIVE",
    sourceType: "researchDerivative",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    sourcePackage: candidatePackagePath,
    outputRoot: frameOutputRoot,
    frameStoragePolicy: "Generated full-resolution Ear Shape frame derivatives are git-ignored. Commit this manifest and research package, not binary frames.",
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

function option(nativeOrder, nativeLabelOriginalText, selectedMenuEvidenceRanges, menuEvidenceTimestampSeconds, sideOrThreeQuarterTimestampSeconds, nativeRow, nativeColumn, visualConfidence) {
  return {
    nativeOrder,
    nativeLabelOriginalText,
    selectedMenuEvidenceRanges,
    menuEvidenceTimestampSeconds,
    sideOrThreeQuarterTimestampSeconds,
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
      return `| ${record.nativeOrder} | ${record.nativeLabelOriginalText} | ${record.nativeRow} | ${record.nativeColumn} | ${candidate.selectedMenuEvidence.map((entry) => entry.timestampRangeSeconds).join(", ")} | ${candidate.earVisibility.bothEarsEvaluated ? "yes" : "no"} | ${candidate.hairstyleObstruction.status} |`;
    })
    .join("\n");
  const sequence = candidatePackage.selectionSequence.map((entry) => entry.nativeLabelOriginalText).join(" -> ");
  const lines = [
    "# Ear Shape Research Candidates",
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
    `- First grid-selected value: ${candidatePackage.selectorObservations.firstGridSelectedValue}`,
    `- Final observed selected value: ${candidatePackage.selectorObservations.finalObservedSelectedValue}`,
    `- Grid structure: ${candidatePackage.selectorObservations.gridStructure}`,
    `- Selector complete: ${candidatePackage.selectorObservations.selectorAppearsComplete ? "yes" : "not proven"}`,
    `- Wrap observed: ${candidatePackage.selectorObservations.wrapObserved ? "yes" : "no"}`,
    "",
    "The recording directly shows four selected Ear Shape tiles. It does **not** prove the complete category count, selector wrap behavior, or final boundary.",
    "",
    "## Native Order",
    "",
    "| Native order | Native label text | Row | Column | Selected evidence ranges | Both ears evaluated | Hairstyle obstruction |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    nativeRows,
    "",
    "## Selection Sequence",
    "",
    `The direct selection sequence is: ${sequence}.`,
    "",
    "None is visible before the grid appears and later selected as the second grid tile. It is preserved as one catalog identity with multiple observations, not duplicated as two records.",
    "",
    "## Timeline Corrections",
    "",
    ...candidatePackage.selectorObservations.timelineCorrectionNotes.map((note) => `- ${note}`),
    "",
    "## Ear Visibility and Capture QA",
    "",
    "- Ear Shape is recorded as a geometry-related appearance setting, but this ingest computes no numerical measurement.",
    "- Source evidence is a 2D RGB Xbox screen recording. No depth, TrueDepth, ARKit, or 3D reconstruction is claimed.",
    "- One lateral live-character ear side is visible. This report does not claim both ears were evaluated.",
    "- Hair partially borders or obstructs the upper/rear ear area.",
    "- Standardized recapture is required before production matching or verified catalog publication.",
    "",
    "## Missing Views",
    "",
    "- Opposite ear side",
    "- Standardized left profile",
    "- Standardized right profile",
    "- Standardized left 45",
    "- Standardized right 45",
    "- Hair pulled clear of ears",
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
