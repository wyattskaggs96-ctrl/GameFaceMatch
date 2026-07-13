#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

export const CF27_HEAD_VISUAL_MEASUREMENT_SCHEMA_VERSION = "cf27-head-visual-measurements-v1";
export const headVisualMeasurementLabel = "HEAD VISUAL MEASUREMENT RESEARCH — NOT PRODUCTION VERIFIED";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultFrameManifestPath = "data/research/cf27/manifests/head-template-evidence-frames/head_template_evidence_frame_manifest.json";
const defaultFrameSelectionPath = "data/research/cf27/reports/view-angle-frame-selection/view_angle_frame_selection_report.json";
const defaultStandardizationQAPath = "data/research/cf27/reports/head-template-standardization-qa/head_template_standardization_qa_report.json";
const defaultOutputDirectory = "data/research/cf27/reports/head-template-visual-measurements";
const supportedViews = ["FRONT", "LEFT_3Q", "LEFT_PROFILE", "RIGHT_3Q", "RIGHT_PROFILE", "REAR"];

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] ?? "generate";
  if (["--help", "-h", "help"].includes(command)) {
    printHelp();
  } else if (command === "generate") {
    const report = buildHeadVisualMeasurementReport({
      root: repositoryRoot,
      generatedAt: new Date().toISOString()
    });
    const output = writeHeadVisualMeasurementOutputs(report, {
      root: repositoryRoot,
      outputDirectory: cliValue("--output-directory") ?? defaultOutputDirectory
    });
    console.log(JSON.stringify({ ok: true, summary: report.summary, files: output.files }, null, 2));
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exitCode = 1;
  }
}

export function buildHeadVisualMeasurementReport({
  root = repositoryRoot,
  frameManifestPath = defaultFrameManifestPath,
  frameSelectionPath = defaultFrameSelectionPath,
  standardizationQAPath = defaultStandardizationQAPath,
  generatedAt = new Date().toISOString()
} = {}) {
  const frameManifest = readJson(path.resolve(root, frameManifestPath));
  const selectionReport = readJson(path.resolve(root, frameSelectionPath));
  const qaReport = readJson(path.resolve(root, standardizationQAPath));
  const frameByID = new Map((frameManifest.frames ?? []).map((frame) => [frame.frameID, frame]));
  const qaByID = new Map((qaReport.records ?? []).map((record) => [record.stableInternalID, record]));
  const selectionRecords = (selectionReport.records ?? [])
    .filter((record) => /^CF27_XBOXUNKNOWN_RTG_HEAD_\d{3}$/.test(record.stableInternalID))
    .sort((left, right) => Number(left.nativeOrder) - Number(right.nativeOrder));

  const records = selectionRecords.map((selectionRecord) => analyzeHeadRecord({
    root,
    selectionRecord,
    frameByID,
    qaRecord: qaByID.get(selectionRecord.stableInternalID) ?? null
  }));
  const frameMeasurements = records.flatMap((record) => record.frameMeasurements);
  const unavailableMeasurementCount = records.reduce((sum, record) => {
    return sum + Object.values(record.imageDerivedMeasurements).filter((measurement) => measurement.availabilityState !== "available").length;
  }, 0);

  return {
    schemaVersion: CF27_HEAD_VISUAL_MEASUREMENT_SCHEMA_VERSION,
    reportLabel: headVisualMeasurementLabel,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PRIMARY_RESEARCH_MEASUREMENT",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "IMAGE_DERIVED_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    sourceFrameManifest: frameManifestPath,
    sourceFrameSelectionReport: frameSelectionPath,
    sourceStandardizationQAReport: standardizationQAPath,
    policy: {
      nativeGameDataSeparation: "Measurements in this report are image-derived research metadata and are not native College Football 27 option data.",
      productionUseAllowed: false,
      productionMatcherEnabled: false,
      sensitiveTraitPolicy: "The pipeline does not infer race, ethnicity, identity, attractiveness, personality, health, or any sensitive trait.",
      unavailablePolicy: "Measurements requiring landmarks, reviewed annotations, or unobstructed evidence are marked unavailable instead of being guessed.",
      framePolicy: "Only selected extracted frame derivatives are analyzed. Source videos and native catalog candidate records are not modified."
    },
    measurementModel: {
      version: CF27_HEAD_VISUAL_MEASUREMENT_SCHEMA_VERSION,
      implementedMeasurements: [
        "face-region bounding box from coarse skin-color segmentation in the character viewport",
        "approximate face width-to-height ratio from the front-view face region",
        "approximate jaw-width ratio from lower face skin-mask width",
        "approximate chin-width ratio from lower chin skin-mask width",
        "head-pose estimate from selected view label",
        "brightness from decoded RGB pixels",
        "sharpness from local luminance contrast",
        "crop consistency from face-region center and size",
        "occlusion flags from existing standardization QA and simple pixel evidence"
      ],
      intentionallyUnavailableWithoutLandmarks: [
        "eye-spacing ratio",
        "nose-width ratio",
        "mouth-width ratio"
      ],
      precisionNotice: "These are coarse research measurements from RGB game-menu screenshots. They are not biometric identity measurements and are not production matching inputs."
    },
    summary: {
      headRecordCount: records.length,
      decodedFrameCount: frameMeasurements.filter((frame) => frame.decodeStatus === "decoded").length,
      unusableFrameCount: frameMeasurements.filter((frame) => frame.usability !== "usable_for_research_measurement").length,
      faceRegionDetectedCount: frameMeasurements.filter((frame) => frame.faceRegion?.availabilityState === "available").length,
      recordsWithApproximateFaceRatio: records.filter((record) => record.imageDerivedMeasurements.faceWidthToHeightRatio.availabilityState === "available").length,
      recordsWithJawRatio: records.filter((record) => record.imageDerivedMeasurements.jawWidthRatio.availabilityState === "available").length,
      recordsWithChinRatio: records.filter((record) => record.imageDerivedMeasurements.chinWidthRatio.availabilityState === "available").length,
      unavailableMeasurementCount,
      productionMatcherEnabled: false
    },
    records
  };
}

export function analyzeHeadRecord({ root, selectionRecord, frameByID, qaRecord }) {
  const selectedFrames = supportedViews
    .map((view) => {
      const selected = selectionRecord.selections?.[view]?.selectedFrame;
      if (!selected) return null;
      return {
        view,
        selectionConfidence: selectionRecord.selections[view].confidence,
        selectionStatus: selectionRecord.selections[view].selectionStatus,
        manifestFrame: frameByID.get(selected.frameID) ?? selected
      };
    })
    .filter(Boolean);
  const frameMeasurements = selectedFrames.map((entry) => analyzeFrame({
    root,
    view: entry.view,
    selectionConfidence: entry.selectionConfidence,
    selectionStatus: entry.selectionStatus,
    frame: entry.manifestFrame,
    qaRecord
  }));
  const frontFrame = frameMeasurements.find((frame) => frame.view === "FRONT" && frame.usability === "usable_for_research_measurement");
  const measurements = buildRecordMeasurements({ frontFrame, qaRecord });

  return {
    stableInternalID: selectionRecord.stableInternalID,
    nativeOrder: selectionRecord.nativeOrder,
    visibleGameLabelOrIndex: selectionRecord.visibleGameLabelOrIndex,
    dataClass: "PRIMARY_RESEARCH_MEASUREMENT",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "IMAGE_DERIVED_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    supportingFrameCount: frameMeasurements.length,
    decodedSupportingFrameCount: frameMeasurements.filter((frame) => frame.decodeStatus === "decoded").length,
    sourceViews: frameMeasurements.map((frame) => frame.view),
    frameMeasurements: frameMeasurements.map(sanitizeFrameMeasurementForReport),
    imageDerivedMeasurements: measurements,
    productionReadiness: {
      readyForProductionMatching: false,
      blocker: "Head Template frames remain limited, non-standardized, eye-black-obstructed, and not second-person verified.",
      sourceQAStatus: qaRecord?.evidenceClassification ?? null
    }
  };
}

function sanitizeFrameMeasurementForReport(frameMeasurement) {
  if (frameMeasurement.faceRegion?.availabilityState !== "available") return frameMeasurement;
  return {
    ...frameMeasurement,
    faceRegion: {
      ...frameMeasurement.faceRegion,
      rowProfileCount: frameMeasurement.faceRegion.rowProfiles?.length ?? 0,
      rowProfiles: undefined
    }
  };
}

export function analyzeFrame({ root, view, selectionConfidence, selectionStatus, frame, qaRecord = null }) {
  const base = {
    frameID: frame.frameID,
    stableInternalID: frame.stableInternalID,
    view,
    selectionStatus,
    selectionConfidence,
    sourceVideoID: frame.sourceVideoID,
    sourceWorkingFilename: frame.sourceWorkingFilename,
    sourceTimestampSeconds: frame.sourceTimestampSeconds,
    outputRelativePath: frame.outputRelativePath,
    outputSha256: frame.outputSha256,
    width: frame.width ?? null,
    height: frame.height ?? null,
    decodeStatus: "not_attempted",
    usability: "unusable",
    unusableReasons: [],
    headPoseEstimate: headPoseEstimateForView(view, frame),
    sharpness: unavailableMetric("sharpness", "frame_not_decoded"),
    brightness: unavailableMetric("brightness", "frame_not_decoded"),
    cropConsistency: unavailableMetric("cropConsistency", "face_region_not_detected"),
    faceRegion: unavailableFaceRegion("frame_not_decoded"),
    occlusionFlags: occlusionFlagsForFrame(frame, qaRecord)
  };

  const absolutePath = path.resolve(root, frame.outputRelativePath ?? "");
  if (!frame.outputRelativePath || !fs.existsSync(absolutePath)) {
    return {
      ...base,
      decodeStatus: "missing_file",
      unusableReasons: ["generated_frame_derivative_missing_locally"]
    };
  }
  let image;
  try {
    image = decodePng(fs.readFileSync(absolutePath));
  } catch (error) {
    return {
      ...base,
      decodeStatus: "decode_failed",
      unusableReasons: [`png_decode_failed:${error.message}`]
    };
  }

  const faceRegion = detectApproximateFaceRegion(image);
  const qualityRegion = faceRegion.availabilityState === "available" ? faceRegion.pixelBoundingBox : expectedCharacterRegion(image.width, image.height);
  const brightness = brightnessMetric(image, qualityRegion);
  const sharpness = sharpnessMetric(image, qualityRegion);
  const cropConsistency = faceRegion.availabilityState === "available"
    ? cropConsistencyMetric(faceRegion.normalizedBoundingBox, view)
    : unavailableMetric("cropConsistency", "face_region_not_detected");
  const unusableReasons = [
    frame.transitionFrameRejected === true ? null : "transition_stability_not_confirmed",
    frame.severeMotionBlurRejected === true ? null : "severe_motion_blur_not_rejected_by_source_manifest",
    frame.mostlyOutsideUsefulCropRejected === true ? null : "useful_crop_not_confirmed_by_source_manifest",
    frame.prompt87NotificationOverlayObserved === true ? "notification_overlay_observed" : null,
    faceRegion.availabilityState === "available" ? null : "face_region_not_detected"
  ].filter(Boolean);

  return {
    ...base,
    width: image.width,
    height: image.height,
    decodeStatus: "decoded",
    usability: unusableReasons.length === 0 ? "usable_for_research_measurement" : "limited_or_unusable",
    unusableReasons,
    sharpness,
    brightness,
    cropConsistency,
    faceRegion,
    occlusionFlags: occlusionFlagsForFrame(frame, qaRecord, faceRegion)
  };
}

export function buildRecordMeasurements({ frontFrame, qaRecord = null }) {
  const unavailable = (measurementID, reason, supportingViews = []) => measurement({
    measurementID,
    value: null,
    confidence: confidence(0, "unavailable", [reason]),
    supportingViews,
    availabilityState: "unavailable",
    calculationMethod: "not_calculated",
    reasonUnavailable: reason
  });
  if (!frontFrame || frontFrame.faceRegion?.availabilityState !== "available") {
    return {
      faceRegionBoundingBox: unavailable("faceRegionBoundingBox", "usable_front_face_region_required", []),
      faceWidthToHeightRatio: unavailable("faceWidthToHeightRatio", "usable_front_face_region_required", []),
      eyeSpacingRatio: unavailable("eyeSpacingRatio", "landmarks_or_reviewed_annotation_required", []),
      noseWidthRatio: unavailable("noseWidthRatio", "landmarks_or_reviewed_annotation_required", []),
      mouthWidthRatio: unavailable("mouthWidthRatio", "landmarks_or_reviewed_annotation_required", []),
      jawWidthRatio: unavailable("jawWidthRatio", "usable_front_face_region_required", []),
      chinWidthRatio: unavailable("chinWidthRatio", "usable_front_face_region_required", [])
    };
  }
  const bbox = frontFrame.faceRegion.normalizedBoundingBox;
  const faceRatio = round(bbox.width / bbox.height, 4);
  const jawRatio = lowerFaceWidthRatio(frontFrame.faceRegion.rowProfiles, 0.72);
  const chinRatio = lowerFaceWidthRatio(frontFrame.faceRegion.rowProfiles, 0.88);
  const plausibleFaceRatio = faceRatio >= 0.45 && faceRatio <= 1.15;
  const blockerEvidence = qaRecord?.standardizedCaptureChecks ?? {};
  const confidenceEvidence = [
    "front view decoded",
    "coarse skin-mask face region detected",
    "eye black and hair/facial-hair standardization blockers reduce confidence",
    blockerEvidence.eyeBlack?.status === "PRESENT" ? "eye black present" : null,
    blockerEvidence.hairstyleObstruction?.status ? `hairstyle obstruction ${blockerEvidence.hairstyleObstruction.status}` : null
  ].filter(Boolean);
  const baseConfidence = clamp(0.52 * Number(frontFrame.selectionConfidence ?? 0.7), 0.18, 0.46);

  return {
    faceRegionBoundingBox: measurement({
      measurementID: "faceRegionBoundingBox",
      value: bbox,
      confidence: confidence(baseConfidence, "low", confidenceEvidence),
      supportingViews: ["FRONT"],
      availabilityState: "available",
      calculationMethod: "coarse_skin_mask_character_region",
      reasonUnavailable: null
    }),
    faceWidthToHeightRatio: plausibleFaceRatio ? measurement({
      measurementID: "faceWidthToHeightRatio",
      value: faceRatio,
      confidence: confidence(baseConfidence, "low", confidenceEvidence),
      supportingViews: ["FRONT"],
      availabilityState: "available",
      calculationMethod: "face_region_width_divided_by_height",
      reasonUnavailable: null
    }) : unavailable("faceWidthToHeightRatio", "coarse_face_region_ratio_outside_plausible_review_range", ["FRONT"]),
    eyeSpacingRatio: unavailable("eyeSpacingRatio", "landmarks_or_reviewed_eye_annotation_required", ["FRONT"]),
    noseWidthRatio: unavailable("noseWidthRatio", "landmarks_or_reviewed_nose_annotation_required", ["FRONT"]),
    mouthWidthRatio: unavailable("mouthWidthRatio", "landmarks_or_reviewed_mouth_annotation_required", ["FRONT"]),
    jawWidthRatio: plausibleFaceRatio && Number.isFinite(jawRatio) && jawRatio >= 0.08 && jawRatio <= 0.9 ? measurement({
      measurementID: "jawWidthRatio",
      value: jawRatio,
      confidence: confidence(baseConfidence * 0.7, "very_low", [...confidenceEvidence, "lower-face skin-mask row heuristic"]),
      supportingViews: ["FRONT"],
      availabilityState: "available",
      calculationMethod: "lower_face_skin_mask_width_at_72_percent_face_height",
      reasonUnavailable: null
    }) : unavailable("jawWidthRatio", plausibleFaceRatio ? "lower_face_skin_mask_row_unavailable_or_implausible" : "coarse_face_region_ratio_outside_plausible_review_range", ["FRONT"]),
    chinWidthRatio: plausibleFaceRatio && Number.isFinite(chinRatio) && chinRatio >= 0.08 && chinRatio <= 0.85 ? measurement({
      measurementID: "chinWidthRatio",
      value: chinRatio,
      confidence: confidence(baseConfidence * 0.62, "very_low", [...confidenceEvidence, "chin skin-mask row heuristic"]),
      supportingViews: ["FRONT"],
      availabilityState: "available",
      calculationMethod: "lower_face_skin_mask_width_at_88_percent_face_height",
      reasonUnavailable: null
    }) : unavailable("chinWidthRatio", plausibleFaceRatio ? "chin_skin_mask_row_unavailable_or_implausible" : "coarse_face_region_ratio_outside_plausible_review_range", ["FRONT"])
  };
}

export function detectApproximateFaceRegion(image) {
  const region = expectedCharacterRegion(image.width, image.height);
  const step = 2;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let count = 0;
  const rowCounts = new Map();
  for (let y = region.y; y < region.y + region.height; y += step) {
    let rowMin = Infinity;
    let rowMax = -Infinity;
    let rowCount = 0;
    for (let x = region.x; x < region.x + region.width; x += step) {
      const pixel = getPixel(image, x, y);
      if (!isLikelySkinPixel(pixel)) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      rowMin = Math.min(rowMin, x);
      rowMax = Math.max(rowMax, x);
      rowCount += 1;
      count += 1;
    }
    if (rowCount > 8) rowCounts.set(y, { minX: rowMin, maxX: rowMax, count: rowCount });
  }
  const minimumPixels = Math.max(300, Math.floor((region.width * region.height) / 2000));
  if (count < minimumPixels || !Number.isFinite(minX) || !Number.isFinite(maxX)) {
    return unavailableFaceRegion("skin_mask_threshold_not_met", { skinPixelCount: count, minimumPixels });
  }
  const pixelBoundingBox = {
    x: minX,
    y: minY,
    width: maxX - minX + step,
    height: maxY - minY + step
  };
  return {
    availabilityState: "available",
    source: "coarse_skin_mask_character_region",
    confidence: confidence(0.42, "low", [
      "RGB game screenshot only",
      "skin-mask heuristic excludes hair and eye black but can include neck or highlights",
      "requires human review before any catalog annotation use"
    ]),
    pixelBoundingBox,
    normalizedBoundingBox: normalizeBoundingBox(pixelBoundingBox, image.width, image.height),
    skinPixelCount: count,
    rowProfiles: [...rowCounts.entries()].map(([y, profile]) => ({
      y,
      relativeY: round((y - pixelBoundingBox.y) / Math.max(pixelBoundingBox.height, 1), 4),
      minX: profile.minX,
      maxX: profile.maxX,
      width: profile.maxX - profile.minX + step,
      count: profile.count
    })),
    warnings: [
      "not_a_landmark_detector",
      "not_identity_or_sensitive_trait_detection",
      "not_production_matching_input"
    ]
  };
}

export function decodePng(buffer) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let index = 0; index < signature.length; index += 1) {
    if (buffer[index] !== signature[index]) throw new Error("Invalid PNG signature");
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }
  if (bitDepth !== 8) throw new Error(`Unsupported PNG bit depth ${bitDepth}`);
  if (![2, 6].includes(colorType)) throw new Error(`Unsupported PNG color type ${colorType}`);
  if (interlace !== 0) throw new Error("Interlaced PNG is not supported");
  const channels = colorType === 6 ? 4 : 3;
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(width * height * 4);
  let inputOffset = 0;
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    const scanline = Buffer.from(inflated.subarray(inputOffset, inputOffset + stride));
    inputOffset += stride;
    unfilterScanline(scanline, previous, channels, filter);
    for (let x = 0; x < width; x += 1) {
      const src = x * channels;
      const dst = (y * width + x) * 4;
      pixels[dst] = scanline[src];
      pixels[dst + 1] = scanline[src + 1];
      pixels[dst + 2] = scanline[src + 2];
      pixels[dst + 3] = channels === 4 ? scanline[src + 3] : 255;
    }
    previous = scanline;
  }
  return { width, height, data: pixels };
}

function unfilterScanline(scanline, previous, bytesPerPixel, filter) {
  for (let index = 0; index < scanline.length; index += 1) {
    const left = index >= bytesPerPixel ? scanline[index - bytesPerPixel] : 0;
    const up = previous[index] ?? 0;
    const upLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] ?? 0 : 0;
    let value = scanline[index];
    if (filter === 1) value += left;
    else if (filter === 2) value += up;
    else if (filter === 3) value += Math.floor((left + up) / 2);
    else if (filter === 4) value += paeth(left, up, upLeft);
    else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}`);
    scanline[index] = value & 0xff;
  }
}

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  if (upDistance <= upLeftDistance) return up;
  return upLeft;
}

function isLikelySkinPixel({ r, g, b }) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 48 || min < 16) return false;
  if (r < b * 1.04) return false;
  if (g < b * 0.78) return false;
  if (r < g * 0.78) return false;
  if (r - g > 88) return false;
  if (max - min < 9) return false;
  return true;
}

function brightnessMetric(image, region) {
  let total = 0;
  let samples = 0;
  for (let y = region.y; y < region.y + region.height; y += 4) {
    for (let x = region.x; x < region.x + region.width; x += 4) {
      total += luma(getPixel(image, x, y));
      samples += 1;
    }
  }
  const value = samples ? round(total / samples / 255, 4) : null;
  return measurement({
    measurementID: "brightness",
    value,
    confidence: confidence(samples ? 0.8 : 0, samples ? "high" : "unavailable", ["decoded RGB pixels", "sampled every 4 pixels"]),
    supportingViews: [],
    availabilityState: samples ? "available" : "unavailable",
    calculationMethod: "mean_luminance",
    reasonUnavailable: samples ? null : "no_pixels_sampled"
  });
}

function sharpnessMetric(image, region) {
  let total = 0;
  let samples = 0;
  for (let y = region.y; y < region.y + region.height - 2; y += 4) {
    for (let x = region.x; x < region.x + region.width - 2; x += 4) {
      const current = luma(getPixel(image, x, y));
      const right = luma(getPixel(image, x + 2, y));
      const down = luma(getPixel(image, x, y + 2));
      total += Math.abs(current - right) + Math.abs(current - down);
      samples += 2;
    }
  }
  const value = samples ? round(total / samples / 255, 4) : null;
  return measurement({
    measurementID: "sharpness",
    value,
    confidence: confidence(samples ? 0.68 : 0, samples ? "medium" : "unavailable", ["local luminance contrast", "not a face-landmark quality score"]),
    supportingViews: [],
    availabilityState: samples ? "available" : "unavailable",
    calculationMethod: "mean_absolute_neighbor_luminance_difference",
    reasonUnavailable: samples ? null : "no_pixels_sampled"
  });
}

function cropConsistencyMetric(normalizedBoundingBox, view) {
  const expectedCenterX = {
    FRONT: 0.72,
    LEFT_3Q: 0.72,
    LEFT_PROFILE: 0.72,
    RIGHT_3Q: 0.72,
    RIGHT_PROFILE: 0.72,
    REAR: 0.72
  }[view] ?? 0.72;
  const expectedCenterY = 0.5;
  const centerX = normalizedBoundingBox.x + normalizedBoundingBox.width / 2;
  const centerY = normalizedBoundingBox.y + normalizedBoundingBox.height / 2;
  const centerDistance = Math.hypot(centerX - expectedCenterX, centerY - expectedCenterY);
  const headSize = normalizedBoundingBox.width * normalizedBoundingBox.height;
  const value = clamp(1 - centerDistance * 2.4 - Math.abs(headSize - 0.1), 0, 1);
  return measurement({
    measurementID: "cropConsistency",
    value: round(value, 4),
    confidence: confidence(0.45, "low", ["coarse face-region center", "menu layout expected character viewport"]),
    supportingViews: [view],
    availabilityState: "available",
    calculationMethod: "face_region_center_and_size_against_expected_menu_viewport",
    reasonUnavailable: null
  });
}

function lowerFaceWidthRatio(rowProfiles, targetRelativeY) {
  if (!Array.isArray(rowProfiles) || rowProfiles.length === 0) return null;
  const candidate = rowProfiles.reduce((best, row) => {
    if (!best) return row;
    return Math.abs(row.relativeY - targetRelativeY) < Math.abs(best.relativeY - targetRelativeY) ? row : best;
  }, null);
  const maxWidth = Math.max(...rowProfiles.map((row) => row.width));
  if (!candidate || !Number.isFinite(maxWidth) || maxWidth <= 0) return null;
  return round(candidate.width / maxWidth, 4);
}

function occlusionFlagsForFrame(frame, qaRecord, faceRegion = null) {
  const checks = qaRecord?.standardizedCaptureChecks ?? {};
  return {
    eyeBlack: {
      status: checks.eyeBlack?.status === "PRESENT" ? "present" : "not_confirmed",
      impact: "blocks under-eye and cheek-area measurement confidence",
      source: "head-template-standardization-qa"
    },
    hairInterference: {
      status: checks.hairstyleObstruction?.status === "PRESENT_OR_VARIABLE" ? "present_or_variable" : "not_confirmed",
      impact: "can change apparent forehead, temple, ear, and head outline",
      source: "head-template-standardization-qa"
    },
    facialHairInterference: {
      status: checks.facialHair?.status === "NOT_STANDARDIZED" ? "not_standardized" : "not_confirmed",
      impact: "jaw, mouth, and chin ratios remain conservative until facial-hair state is locked",
      source: "head-template-standardization-qa"
    },
    notificationOverlay: {
      status: frame.prompt87NotificationOverlayObserved === true ? "present" : "not_observed_in_manifest",
      impact: frame.prompt87NotificationOverlayObserved === true ? "frame not suitable for measurement" : "none_observed",
      source: "frame_manifest"
    },
    cropOrVisibility: {
      status: faceRegion?.availabilityState === "available" ? "face_region_detected" : "not_confirmed",
      impact: "coarse detector requires human review",
      source: "pixel_heuristic"
    }
  };
}

function headPoseEstimateForView(view, frame) {
  const estimates = {
    FRONT: { yawDegrees: 0, label: "front" },
    LEFT_3Q: { yawDegrees: -45, label: "left_three_quarter" },
    LEFT_PROFILE: { yawDegrees: -80, label: "left_profile" },
    RIGHT_3Q: { yawDegrees: 45, label: "right_three_quarter" },
    RIGHT_PROFILE: { yawDegrees: 80, label: "right_profile" },
    REAR: { yawDegrees: 180, label: "rear" }
  };
  const estimate = estimates[view] ?? { yawDegrees: null, label: "unknown" };
  return {
    ...estimate,
    source: "selected_view_label_from_prompt88_rotation_sequence",
    confidence: confidence(frame.angleLabelStatus === "approximate_from_rotation_sequence" ? 0.48 : 0.35, "low", [
      "angle labels are approximate",
      "requires verifier confirmation before production use"
    ])
  };
}

function expectedCharacterRegion(width, height) {
  return {
    x: Math.floor(width * 0.43),
    y: Math.floor(height * 0.08),
    width: Math.floor(width * 0.56),
    height: Math.floor(height * 0.82)
  };
}

function getPixel(image, x, y) {
  const safeX = clamp(Math.floor(x), 0, image.width - 1);
  const safeY = clamp(Math.floor(y), 0, image.height - 1);
  const offset = (safeY * image.width + safeX) * 4;
  return {
    r: image.data[offset],
    g: image.data[offset + 1],
    b: image.data[offset + 2],
    a: image.data[offset + 3]
  };
}

function luma({ r, g, b }) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function normalizeBoundingBox(box, width, height) {
  return {
    x: round(box.x / width, 4),
    y: round(box.y / height, 4),
    width: round(box.width / width, 4),
    height: round(box.height / height, 4)
  };
}

function measurement({ measurementID, value, confidence, supportingViews, availabilityState, calculationMethod, reasonUnavailable }) {
  return {
    measurementID,
    value,
    confidence,
    supportingFrameCount: supportingViews.length,
    supportingViews,
    variance: 0,
    depthSupported: false,
    profileEvidenceExists: supportingViews.some((view) => /PROFILE/.test(view)),
    occlusionImpact: "reduced_confidence_due_to_eye_black_hair_and_unstandardized_facial_hair",
    measurementSource: "imageDerivedResearch",
    availabilityState,
    calculationMethod,
    reasonUnavailable,
    algorithmVersion: CF27_HEAD_VISUAL_MEASUREMENT_SCHEMA_VERSION,
    productionStatus: "NOT_PRODUCTION_DATA"
  };
}

function confidence(score, label, evidence) {
  return {
    score: round(score, 4),
    label,
    evidence
  };
}

function unavailableMetric(measurementID, reason) {
  return measurement({
    measurementID,
    value: null,
    confidence: confidence(0, "unavailable", [reason]),
    supportingViews: [],
    availabilityState: "unavailable",
    calculationMethod: "not_calculated",
    reasonUnavailable: reason
  });
}

function unavailableFaceRegion(reason, extra = {}) {
  return {
    availabilityState: "unavailable",
    source: "coarse_skin_mask_character_region",
    confidence: confidence(0, "unavailable", [reason]),
    pixelBoundingBox: null,
    normalizedBoundingBox: null,
    warnings: ["no_measurement_fabricated"],
    reasonUnavailable: reason,
    ...extra
  };
}

export function writeHeadVisualMeasurementOutputs(report, {
  root = repositoryRoot,
  outputDirectory = defaultOutputDirectory
} = {}) {
  const absoluteOutputDirectory = path.resolve(root, outputDirectory);
  assertResearchReportOutput(root, absoluteOutputDirectory);
  fs.mkdirSync(absoluteOutputDirectory, { recursive: true });
  const reportPath = path.join(absoluteOutputDirectory, "head_visual_measurement_report.json");
  const csvPath = path.join(absoluteOutputDirectory, "head_visual_measurement_summary.csv");
  const markdownPath = path.join(absoluteOutputDirectory, "head_visual_measurement_review.md");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(csvPath, formatSummaryCSV(report), "utf8");
  fs.writeFileSync(markdownPath, formatMarkdown(report), "utf8");
  return {
    ok: true,
    outputDirectory: normalizePath(path.relative(root, absoluteOutputDirectory)),
    files: [reportPath, csvPath, markdownPath].map((filePath) => normalizePath(path.relative(root, filePath)))
  };
}

function formatSummaryCSV(report) {
  const header = [
    "stableInternalID",
    "nativeOrder",
    "visibleGameLabelOrIndex",
    "decodedSupportingFrameCount",
    "faceBBoxAvailable",
    "faceWidthToHeightRatio",
    "jawWidthRatio",
    "chinWidthRatio",
    "eyeSpacingRatioStatus",
    "noseWidthRatioStatus",
    "mouthWidthRatioStatus",
    "readyForProductionMatching"
  ];
  const rows = report.records.map((record) => [
    record.stableInternalID,
    record.nativeOrder,
    record.visibleGameLabelOrIndex,
    record.decodedSupportingFrameCount,
    record.imageDerivedMeasurements.faceRegionBoundingBox.availabilityState,
    record.imageDerivedMeasurements.faceWidthToHeightRatio.value ?? "",
    record.imageDerivedMeasurements.jawWidthRatio.value ?? "",
    record.imageDerivedMeasurements.chinWidthRatio.value ?? "",
    record.imageDerivedMeasurements.eyeSpacingRatio.availabilityState,
    record.imageDerivedMeasurements.noseWidthRatio.availabilityState,
    record.imageDerivedMeasurements.mouthWidthRatio.availabilityState,
    record.productionReadiness.readyForProductionMatching
  ]);
  return `${[header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
}

function formatMarkdown(report) {
  const lines = [
    "# Head Visual Measurement Research",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `**${report.reportLabel}**`,
    "",
    "These measurements are image-derived research metadata only. They are not native game option data, biometric identity measurements, or production matching inputs.",
    "",
    "## Summary",
    "",
    `- Head records: ${report.summary.headRecordCount}`,
    `- Decoded frames: ${report.summary.decodedFrameCount}`,
    `- Unusable or limited frames: ${report.summary.unusableFrameCount}`,
    `- Face regions detected: ${report.summary.faceRegionDetectedCount}`,
    `- Approximate face ratios available: ${report.summary.recordsWithApproximateFaceRatio}`,
    `- Production matcher enabled: ${report.summary.productionMatcherEnabled ? "yes" : "no"}`,
    "",
    "## Unavailable By Design",
    "",
    "- Eye-spacing ratio requires landmarks or reviewed eye annotations.",
    "- Nose-width ratio requires landmarks or reviewed nose annotations.",
    "- Mouth-width ratio requires landmarks or reviewed mouth annotations.",
    "- All production use remains blocked by recapture and second-verifier requirements.",
    "",
    "## Record Summary",
    "",
    "| Record | Face W/H | Jaw | Chin | Decoded frames | Production-ready |",
    "| --- | ---: | ---: | ---: | ---: | --- |"
  ];
  for (const record of report.records) {
    lines.push(`| ${record.stableInternalID} | ${record.imageDerivedMeasurements.faceWidthToHeightRatio.value ?? "unavailable"} | ${record.imageDerivedMeasurements.jawWidthRatio.value ?? "unavailable"} | ${record.imageDerivedMeasurements.chinWidthRatio.value ?? "unavailable"} | ${record.decodedSupportingFrameCount} | ${record.productionReadiness.readyForProductionMatching ? "yes" : "no"} |`);
  }
  return `${lines.join("\n")}\n`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assertResearchReportOutput(root, absoluteOutputDirectory) {
  const allowed = path.resolve(root, "data/research/cf27/reports");
  if (!path.resolve(absoluteOutputDirectory).startsWith(allowed)) {
    throw new Error(`Refusing to write head visual measurements outside data/research/cf27/reports: ${path.relative(root, absoluteOutputDirectory)}`);
  }
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function cliValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function printHelp() {
  console.log(`Usage:
  node scripts/cf27-head-visual-measurements.mjs generate [--output-directory <dir>]

Runs conservative image-derived research measurements against CF27 Head Template Faces 1-29 extracted frames.
Outputs remain research-only and do not enable production matching.`);
}
