#!/usr/bin/env node
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_EYE_SHAPE_RESEARCH_SCHEMA_VERSION = "cf27-eye-shape-research-candidates-v1";
export const CF27_EYE_SHAPE_FRAME_MANIFEST_SCHEMA_VERSION = "cf27-eye-shape-evidence-frame-manifest-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inventoryPath = "data/research/cf27/video_inventory.json";
const candidateDirectory = "data/research/cf27/catalog-candidates/research/eye-shape-options-001-005";
const candidatePackagePath = `${candidateDirectory}/eye_shape_research_candidates.json`;
const frameOutputRoot = "data/research/cf27/generated/full-resolution-frames/eye-shape-options-001-005";
const frameManifestPath = "data/research/cf27/manifests/eye-shape-evidence-frames/eye_shape_evidence_frame_manifest.json";
const markdownReportPath = "docs/catalog/EYE_SHAPE_RESEARCH_CANDIDATES.md";

const eyeShapeRecords = [
  option(1, "Almond", "14.0-14.9", 14.0, 1, 1),
  option(2, "None", "15.0-16.9", 16.0, 1, 2),
  option(3, "Prominent", "17.0-18.9", 18.0, 1, 3),
  option(4, "Monolid", "19.0-20.0", 19.0, 1, 4),
  option(5, "Hooded", "21.0-24.9", 22.0, 2, 1)
];

const selectionSequenceNativeOrders = [1, 2, 3, 4, 5];
const frameRoles = ["MENU", "CHARACTER_FRONT"];

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = ingestEyeShapeEvidence({
    root: repositoryRoot,
    ffmpegPath: cliValue("--ffmpeg") ?? process.env.CF27_FFMPEG_PATH
  });
  if (!result.ok) process.exitCode = 1;
}

export function ingestEyeShapeEvidence({ root = repositoryRoot, ffmpegPath, generatedAt = new Date().toISOString() } = {}) {
  const ffmpeg = resolveFfmpeg(ffmpegPath);
  if (!ffmpeg) {
    console.error("ffmpeg is required. Set CF27_FFMPEG_PATH or pass --ffmpeg.");
    return { ok: false };
  }

  const inventory = readJson(path.join(root, inventoryPath));
  const sourceVideo = inventory.inventory.find((video) => video.inventoryId === "video-006");
  if (!sourceVideo) throw new Error("Missing video-006 Eye Shape inventory record.");
  if (!fs.existsSync(sourceVideo.absoluteDiscoveryPathInternal)) {
    throw new Error(`Source video is not available locally: ${sourceVideo.portableRelativeEvidencePath}`);
  }

  const records = [];
  const frames = [];

  for (const candidate of eyeShapeRecords) {
    const stableInternalID = `CF27_XBOXUNKNOWN_RTG_EYESHAPE_${String(candidate.nativeOrder).padStart(3, "0")}`;
    const recordFrames = [];

    for (const role of frameRoles) {
      const timestampSeconds = candidate.stableTimestampSeconds;
      const relativeOutputPath = normalizePath(path.join(
        frameOutputRoot,
        stableInternalID,
        `${stableInternalID}_${role}_video-006_${timestampSeconds.toFixed(2).replace(".", "p")}s.png`
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
        sourceVideoID: "video-006",
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
        selectionNotes: "Full-screen frame extracted from a directly selected Eye Shape label. Frame is a local derivative and is not production data."
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
      category: "Eye Shape",
      kind: "additionalFaceMatchingAttribute",
      attributeFamily: "eyeShape",
      originalTextPreserved: true,
      valueType: "nativeLabel",
      appearsGeometryChanging: true,
      affectsTextureRatherThanGeometry: false,
      affectsGeometrySimilarity: "research_candidate_pending_measurement",
      selectedMenuEvidence: [
        {
          videoID: "video-006",
          timestampRangeSeconds: candidate.timestampRangeSeconds,
          stableTimestampSeconds: candidate.stableTimestampSeconds,
          basis: "direct selected Eye Shape label visible in the Eye Shape grid"
        }
      ],
      sourceImageReferences: recordFrames,
      gridPositionFromNativeIndex: {
        columns: 4,
        nativeRow: candidate.nativeRow,
        nativeColumn: candidate.nativeColumn,
        basis: "selected tile position visible in the Eye Shape grid; native text is stored separately and unchanged"
      },
      eyeBlackAssessment: {
        eyeBlackPresent: true,
        eyeBlackAffectsAssessment: true,
        impact: "limited",
        notes: "Eye black sits below the eyes and limits lower-eye and cheek-adjacent assessment on representative character frames."
      },
      visualDistinguishability: {
        selectedMenuThumbnail: "visible",
        representativeCharacterFrame: "limited",
        summary: "Eye Shape differences are visible in selected menu thumbnails; representative character-frame differences are limited by UI framing, compression, and eye black."
      },
      geometryObservation: {
        appearsGeometryChanging: true,
        geometryChangeEvidence: "The native category changes selected eye-region thumbnail geometry. No numerical eye measurement is computed in this research ingestion.",
        measurementComputed: false,
        measurementStatus: "NOT_MEASURED"
      },
      dependencies: {
        status: "UNKNOWN",
        notes: [
          "Platform, patch, mode, body, position, head, skin, and account-state dependencies are not proven by this recording.",
          "Selected head appears visually constant during this recording, but dependency testing remains required."
        ]
      },
      representativeFrameQA: {
        characterFaceFrameAvailable: true,
        characterPose: "front-facing or slight three-quarter view",
        eyeBlackObstructsEvaluation: true,
        characterFrameLimitations: [
          "The live character frame includes game UI, uniform, and eye black.",
          "Eye-area details are partially affected by screen-recording compression.",
          "Selected menu thumbnails are clearer for option identity than the representative character frame."
        ]
      },
      captureCompleteness: {
        menuEvidence: "present",
        frontCharacterFrame: "present_limited",
        standardizedViews: "not_present",
        requiredProductionRecapture: true,
        notes: "Recording is valid for selected label/order evidence. It is not a standardized production comparison capture."
      },
      researchMetadata: {
        nativeLabelOriginalText: candidate.nativeLabelOriginalText,
        nativeLabelPolicy: "Native game label only. No race, ethnicity, identity, attractiveness, health, or other sensitive labels are recorded.",
        measurementLimitations: [
          "No landmark, metric, or facial-classification measurement is computed from this ingestion.",
          "Representative frames are not standardized production comparison evidence.",
          "Eye Shape records remain research candidates pending second-person verification and production recapture."
        ]
      },
      verificationState: "NOT_VERIFIED",
      productionStatus: "NOT_PRODUCTION_DATA"
    });
  }

  const recordsByNativeOrder = new Map(records.map((record) => [record.nativeOrder, record]));
  const candidatePackage = {
    schemaVersion: CF27_EYE_SHAPE_RESEARCH_SCHEMA_VERSION,
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
      category: "Eye Shape",
      directlySelectedRecordCount: records.length,
      directlySelectedNativeLabels: records.map((record) => record.nativeLabelOriginalText),
      nativeOrderRangeObserved: "5 visible Eye Shape tiles directly selected",
      completeCategoryCountClaimed: false,
      excludedLabels: ["unselected or unseen Eye Shape values, if any"],
      reasonCompletenessIsNotClaimed: "The recording shows five visible selected tiles, but does not prove wrap behavior or a hard final selector boundary."
    },
    context: {
      platformCode: "XBOXUNKNOWN",
      modeCode: "RTG",
      gameVersion: "UNKNOWN",
      patchVersion: "UNKNOWN",
      creationPath: "Road to Glory / Create Player / Player / Appearance / Head & Skin / Eye Shape",
      sourceVideoID: "video-006"
    },
    selectorObservations: {
      gridStructure: "4-column grid with 5 visible tiles",
      nativeOrderBasis: "visible tile position in the Eye Shape grid",
      selectionSequenceBasis: "direct selected labels in the recording",
      firstObservedSelectedValue: "Almond",
      finalObservedSelectedValue: "Hooded",
      selectorAppearsComplete: false,
      selectorCompletenessExplanation: "All five visible tiles are selected during the recording, but final boundary and wrap behavior are not shown.",
      wrapObserved: false,
      eyeShapeAppearsToChangeEyeGeometry: true,
      geometryMeasurementComputed: false,
      otherVisibleSettingsChangedWhenChoosingEyeShape: false,
      characterRotationAvailable: true,
      selectedHeadRemainsConstant: true,
      eyeBlackPresent: true,
      eyeBlackEvaluationImpact: "Eye black limits evaluation around lower-eye and cheek-adjacent regions in representative character frames."
    },
    observationPolicy: {
      nativeLabelsPreserved: true,
      noRaceOrEthnicityLabels: true,
      noIdentityRelatedClassification: true,
      noSensitiveTraitInference: true,
      noComputedFacialMeasurements: true,
      productionUseAllowed: false,
      sourceMasterPreserved: true,
      derivativesAreLocalAndGitIgnored: true
    },
    sourceVideos: [
      {
        videoID: "video-006",
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
    labelsRequiringManualTextConfirmation: [],
    manualTextConfirmationNotes: "All five selected native Eye Shape labels were readable in direct frame inspection. Reconfirm during second-person verification before production.",
    records,
    productionBlocks: [
      "Records are primary research only and not second-person verified.",
      "Game version, patch, and exact platform are still unknown.",
      "Selector wrap and final category boundary are not proven.",
      "Eye black and screen-recording compression limit representative character-frame assessment.",
      "Production catalog remains empty until verified evidence is reviewed and published."
    ]
  };

  const frameManifest = {
    schemaVersion: CF27_EYE_SHAPE_FRAME_MANIFEST_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "RESEARCH_DERIVATIVE",
    sourceType: "researchDerivative",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    sourcePackage: candidatePackagePath,
    outputRoot: frameOutputRoot,
    frameStoragePolicy: "Generated full-resolution Eye Shape frame derivatives are git-ignored. Commit this manifest and research package, not binary frames.",
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

function option(nativeOrder, nativeLabelOriginalText, timestampRangeSeconds, stableTimestampSeconds, nativeRow, nativeColumn) {
  return { nativeOrder, nativeLabelOriginalText, timestampRangeSeconds, stableTimestampSeconds, nativeRow, nativeColumn };
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
    .map((record) => `| ${record.nativeOrder} | ${record.nativeLabelOriginalText} | ${record.nativeRow} | ${record.nativeColumn} |`)
    .join("\n");
  const lines = [
    "# Eye Shape Research Candidates",
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
    "The recording selects five visible Eye Shape tiles, but it does not prove wrap behavior or a hard final selector boundary. No total category count is claimed.",
    "",
    "## Native Order",
    "",
    "| Native order | Native label text | Row | Column |",
    "| --- | --- | --- | --- |",
    nativeRows,
    "",
    "## Visibility and Capture QA",
    "",
    "- Eye Shape is recorded as an additional face-matching attribute whose geometry use is still pending measurement and verification.",
    "- No landmark, metric, or facial classification measurement is computed by this ingestion.",
    "- Eye black is present and limits lower-eye and cheek-adjacent assessment on representative character frames.",
    "- Selected menu thumbnails are clearer for option identity than the live character frame.",
    "- Standardized production recapture is still required before verified catalog publication.",
    "",
    "## Sensitive-Trait Policy",
    "",
    "- The native game labels are preserved exactly as observed.",
    "- No race, ethnicity, identity, attractiveness, health, or other sensitive classification is recorded.",
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
