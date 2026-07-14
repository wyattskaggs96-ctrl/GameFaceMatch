import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MEDIAPIPE_FACE_LANDMARKER_METADATA, unavailableFaceLandmarkReport } from "@/lib/face-landmarks/face-landmark-provider";
import {
  alignCatalogMeasurementView,
  createCatalogImageMeasurementReport,
  createProductionCatalogImageMeasurementPipelineReport,
  detectFaceRegion,
  PHASE0_CATALOG_FACE_ALIGNMENT_VERSION,
  PHASE0_CATALOG_IMAGE_MEASUREMENT_VERSION,
  PHASE0_CATALOG_IMAGE_MEASUREMENT_PIPELINE_VERSION,
  summarizeLandmarkExtraction,
  validateProductionCatalogMeasurementItem,
  validateCatalogMeasurementView,
  type Phase0CatalogMeasurementEvidenceAsset,
  type Phase0CatalogMeasurementViewInput
} from "@/lib/phase-zero/phase-zero-catalog-image-measurement";
import type {
  GameCatalogItem,
  DetectedFaceLandmarks,
  FaceLandmarkPoint,
  FaceLandmarkReport
} from "@/types/domain";

const now = "2026-07-13T00:00:00.000Z";
const testOnlyCatalogID = "TEST_ONLY_CATALOG_RECORD_NOT_PRODUCTION";

describe("Phase 0 catalog image measurement pipeline", () => {
  it("ships a schema for local catalog image measurements, failures, corrections, and precision limits", () => {
    const schema = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/schemas/catalog-image-measurement.schema.json"), "utf8"));
    expect(schema.title).toBe("Phase0CatalogImageMeasurementReport");
    expect(schema.properties.schemaVersion.const).toBe(PHASE0_CATALOG_IMAGE_MEASUREMENT_VERSION);
    expect(schema.required).toEqual(expect.arrayContaining(["processingModels", "deterministicOutputID", "sourceReferences", "alignmentResults", "inputGate", "viewValidations", "faceRegions", "landmarkExtractions", "measurements", "readyForProductionCatalog"]));
    expect(schema.properties.readyForProductionCatalog.const).toBe(false);
    expect(schema.$defs.processingModels.properties.pipelineVersion.const).toBe(PHASE0_CATALOG_IMAGE_MEASUREMENT_PIPELINE_VERSION);
    expect(schema.$defs.processingModels.properties.faceAlignmentVersion.const).toBe(PHASE0_CATALOG_FACE_ALIGNMENT_VERSION);
    expect(schema.$defs.measurement.required).toEqual(expect.arrayContaining(["confidence", "supportingViewCount", "variance", "humanCorrection"]));
    expect(schema.$defs.measurement.properties.depthSupported.const).toBe(false);
  });

  it("validates view pose and face count before using catalog imagery", () => {
    const good = validateCatalogMeasurementView(view("straightOn", { yaw: 0 }));
    expect(good.status).toBe("usable");

    const mismatch = validateCatalogMeasurementView(view("leftProfile", { yaw: -40 }));
    expect(mismatch.status).toBe("needsHumanReview");
    expect(mismatch.issues.map((issue) => issue.code)).toContain("viewPoseMismatch");

    const blocked = validateCatalogMeasurementView({
      ...view("straightOn"),
      faceLandmarkReport: unavailableFaceLandmarkReport({ message: "No local model asset." })
    });
    expect(blocked.status).toBe("blocked");
    expect(blocked.issues.map((issue) => issue.code)).toContain("landmarksUnavailable");
  });

  it("detects face regions and summarizes landmark extraction reliability", () => {
    const input = view("straightOn");
    const region = detectFaceRegion(input);
    const extraction = summarizeLandmarkExtraction(input);

    expect(region.state).toBe("detected");
    expect(region.region).toMatchObject({ unit: "normalized", source: "landmarkBoundingBox", width: 0.48, height: 0.64 });
    expect(extraction).toMatchObject({
      state: "available",
      provider: MEDIAPIPE_FACE_LANDMARKER_METADATA,
      coreLandmarkCount: 23
    });
    expect(alignCatalogMeasurementView(input)).toMatchObject({
      state: "aligned",
      normalizedScale: 1.563,
      translateX: 0,
      translateY: 0,
      rotationDegrees: 0,
      source: "landmarkBoundingBox"
    });
  });

  it("calculates normalized, explainable game-character image ratios with confidence and no depth support", () => {
    const report = createCatalogImageMeasurementReport({
      catalogStableID: testOnlyCatalogID,
      catalogVersionID: "catalog-version-test-only",
      createdAt: now,
      imageViews: requiredViews()
    });

    expect(report.readyForProductionCatalog).toBe(false);
    expect(report.precisionNotice).toContain("not scientific biometric");
    expect(report.processingModels).toMatchObject({
      pipelineVersion: PHASE0_CATALOG_IMAGE_MEASUREMENT_PIPELINE_VERSION,
      measurementAlgorithmVersion: PHASE0_CATALOG_IMAGE_MEASUREMENT_VERSION,
      faceAlignmentVersion: PHASE0_CATALOG_FACE_ALIGNMENT_VERSION
    });
    expect(report.sourceReferences).toHaveLength(5);
    expect(report.alignmentResults.filter((alignment) => alignment.state === "aligned")).toHaveLength(5);
    expect(report.deterministicOutputID).toMatch(/^fnv1a32-/);
    expect(report.measurements.faceWidthRatio).toMatchObject({
      value: 0.75,
      source: "landmarkDerived",
      availabilityState: "available",
      supportingViewCount: 1,
      supportingViews: ["straightOn"],
      variance: 0,
      depthSupported: false,
      algorithmVersion: PHASE0_CATALOG_IMAGE_MEASUREMENT_VERSION
    });
    expect(report.measurements.eyeSpacingRatio?.value).toBe(0.2);
    expect(report.measurements.noseWidthRatio?.value).toBe(0.16);
    expect(report.measurements.mouthWidthRatio?.value).toBe(0.34);
    expect(report.measurements.noseProjection).toMatchObject({
      availabilityState: "available",
      supportingViewCount: 2,
      supportingViews: ["leftProfile", "rightProfile"],
      variance: 0
    });
  });

  it("records failure states instead of fabricating measurements", () => {
    const report = createCatalogImageMeasurementReport({
      catalogStableID: testOnlyCatalogID,
      catalogVersionID: "catalog-version-test-only",
      createdAt: now,
      imageViews: [view("straightOn", { report: multipleFaceReport() })]
    });

    expect(report.viewValidations[0].status).toBe("blocked");
    expect(report.viewValidations[0].issues.map((issue) => issue.code)).toContain("multipleFaces");
    expect(report.measurements.faceWidthRatio).toMatchObject({
      value: null,
      source: "unavailable",
      availabilityState: "unavailable",
      supportingViewCount: 0
    });
    expect(report.failureMessages.join(" ")).toContain("Multiple face regions");
  });

  it("supports human measurement correction with provenance without making production-ready claims", () => {
    const report = createCatalogImageMeasurementReport({
      catalogStableID: testOnlyCatalogID,
      catalogVersionID: "catalog-version-test-only",
      createdAt: now,
      imageViews: [view("straightOn")],
      humanCorrections: [
        {
          measurementID: "noseProjection",
          value: 0.22,
          confidence: 0.62,
          correctedBy: "reviewer-test-only",
          reason: "Profile landmark unavailable in this synthetic test case.",
          supportingViewIDs: ["straightOn"],
          createdAt: now
        }
      ]
    });

    expect(report.humanCorrectionCount).toBe(1);
    expect(report.readyForProductionCatalog).toBe(false);
    expect(report.measurements.noseProjection).toMatchObject({
      value: 0.22,
      source: "humanCorrected",
      availabilityState: "available",
      supportingViewCount: 1,
      humanCorrection: {
        correctedBy: "reviewer-test-only",
        reason: "Profile landmark unavailable in this synthetic test case."
      }
    });
  });

  it("reports variance across repeated profile views", () => {
    const report = createCatalogImageMeasurementReport({
      catalogStableID: testOnlyCatalogID,
      catalogVersionID: "catalog-version-test-only",
      createdAt: now,
      imageViews: [
        view("leftProfile", { profileOffset: -0.09 }),
        view("rightProfile", { profileOffset: 0.11 })
      ]
    });

    expect(report.measurements.noseProjection?.supportingViewCount).toBe(2);
    expect(Number(report.measurements.noseProjection?.variance)).toBeGreaterThan(0);
    expect(Number(report.measurements.noseProjection?.confidence.score)).toBeLessThanOrEqual(0.82);
  });

  it("processes only production-approved catalog imagery through the gated pipeline", () => {
    const pipelineInput = productionPipelineInput();
    const first = createProductionCatalogImageMeasurementPipelineReport(pipelineInput);
    const second = createProductionCatalogImageMeasurementPipelineReport(pipelineInput);

    expect(first.schemaVersion).toBe(PHASE0_CATALOG_IMAGE_MEASUREMENT_PIPELINE_VERSION);
    expect(first.acceptedItemCount).toBe(1);
    expect(first.rejectedItemCount).toBe(0);
    expect(first.productionRecommendationsEnabled).toBe(false);
    expect(first.deterministicOutputID).toBe(second.deterministicOutputID);
    expect(first.itemReports[0].inputGate.status).toBe("accepted");
    expect(first.itemReports[0].sourceReferences.every((reference) => reference.approvedForProduction)).toBe(true);
    expect(first.itemReports[0].sourceReferences.every((reference) => reference.assetSha256?.match(/^[a-f0-9]{64}$/))).toBe(true);
    expect(first.itemReports[0].measurements.faceWidthRatio?.value).toBe(0.75);
  });

  it("rejects fixture, research, and unapproved evidence before production measurement", () => {
    const fixture = readFixture();
    const pipelineInput = productionPipelineInput({
      item: {
        ...productionItem(),
        sourceType: "testFixture",
        isTestFixture: true,
        sourceImageReferences: fixture.items[0].sourceImageReferences as string[],
        requiredAngles: { straightOn: "fixture-front", left45: "fixture-front", right45: "fixture-front", leftProfile: "fixture-front", rightProfile: "fixture-front" }
      },
      evidenceAssets: fixture.evidenceAssets as unknown as Phase0CatalogMeasurementEvidenceAsset[],
      imageViews: [view("straightOn", { evidenceFileID: "fixture-front" })]
    });

    const report = createProductionCatalogImageMeasurementPipelineReport(pipelineInput);
    expect(report.acceptedItemCount).toBe(0);
    expect(report.rejectedItemCount).toBe(1);
    expect(report.rejectedItems[0].errors.join(" ")).toMatch(/not production-approved|Fixture|not production source evidence|fixture evidence/i);
  });

  it("rejects low-quality evidence and records manual correction provenance when production inputs are valid", () => {
    const lowQualityGate = validateProductionCatalogMeasurementItem(
      {
        item: productionItem(),
        imageViews: requiredViews().map((entry) =>
          entry.viewID === "straightOn"
            ? { ...entry, faceLandmarkReport: unavailableFaceLandmarkReport({ message: "Synthetic unavailable landmarks." }) }
            : entry
        )
      },
      productionPipelineInput()
    );
    expect(lowQualityGate.status).toBe("rejected");
    expect(lowQualityGate.errors.join(" ")).toContain("straightOn evidence is not production quality");

    const report = createProductionCatalogImageMeasurementPipelineReport(productionPipelineInput({
      humanCorrections: [
        {
          measurementID: "chinProjection",
          value: 0.19,
          confidence: 0.66,
          correctedBy: "reviewer-test-only",
          reason: "Synthetic correction for fixture-side profile validation.",
          supportingViewIDs: ["leftProfile", "rightProfile"],
          createdAt: now
        }
      ]
    }));
    expect(report.itemReports[0].humanCorrectionCount).toBe(1);
    expect(report.itemReports[0].measurements.chinProjection).toMatchObject({
      source: "humanCorrected",
      value: 0.19,
      humanCorrection: {
        correctedBy: "reviewer-test-only"
      }
    });
  });
});

function requiredViews() {
  return [
    view("straightOn", { yaw: 0 }),
    view("left45", { yaw: -42 }),
    view("right45", { yaw: 42 }),
    view("leftProfile", { yaw: -78 }),
    view("rightProfile", { yaw: 78 })
  ];
}

function view(
  viewID: Phase0CatalogMeasurementViewInput["viewID"],
  input: { yaw?: number; report?: FaceLandmarkReport; profileOffset?: number; evidenceFileID?: string } = {}
): Phase0CatalogMeasurementViewInput {
  return {
    viewID,
    evidenceFileID: input.evidenceFileID ?? `evidence-${viewID}`,
    imageRelativePath: `data/fixtures/test-only/catalog-measurement/${viewID}.png`,
    width: 1200,
    height: 1600,
    capturedAt: now,
    faceLandmarkReport: input.report ?? landmarkReport(viewID, input.yaw ?? yawForView(viewID), input.profileOffset)
  };
}

function productionPipelineInput(input: {
  item?: GameCatalogItem;
  evidenceAssets?: Phase0CatalogMeasurementEvidenceAsset[];
  imageViews?: Phase0CatalogMeasurementViewInput[];
  humanCorrections?: Parameters<typeof createProductionCatalogImageMeasurementPipelineReport>[0]["items"][number]["humanCorrections"];
} = {}) {
  return {
    catalogVersionID: "cf27-production-synthetic-test-only-v1",
    catalogReleaseStatus: "approvedRelease" as const,
    createdAt: now,
    evidenceAssets: input.evidenceAssets ?? productionEvidenceAssets(),
    items: [
      {
        item: input.item ?? productionItem(),
        imageViews: input.imageViews ?? requiredViews(),
        humanCorrections: input.humanCorrections
      }
    ]
  };
}

function productionItem(): GameCatalogItem {
  return {
    sourceType: "production",
    stableInternalID: "CF27_SYNTHETIC_TEST_HEAD_001",
    game: "EA SPORTS College Football 27",
    gameVersion: "test-only-version",
    patchVersion: "test-only-patch",
    platform: "test-only-platform",
    gameMode: "Road to Glory",
    creationPath: "Synthetic test-only path",
    category: "head",
    visibleGameLabelOrIndex: "Synthetic Test Head 001",
    verificationState: "verified",
    capturedDate: now,
    verifiedDate: now,
    sourceImageReferences: ["evidence-straightOn", "evidence-left45", "evidence-right45", "evidence-leftProfile", "evidence-rightProfile"],
    requiredAngles: {
      straightOn: "evidence-straightOn",
      left45: "evidence-left45",
      right45: "evidence-right45",
      leftProfile: "evidence-leftProfile",
      rightProfile: "evidence-rightProfile"
    },
    geometryMeasurements: {},
    humanAnnotations: {},
    catalogManagerDisposition: "approved",
    catalogVersion: {
      identifier: "cf27-production-synthetic-test-only-v1",
      gameVersion: "test-only-version",
      platform: "test-only-platform",
      verifiedAt: now
    },
    isTestFixture: false,
    navigationInstructions: [
      {
        sequenceNumber: 1,
        instruction: "Synthetic test-only verified instruction.",
        evidenceAssetID: "evidence-straightOn"
      }
    ]
  };
}

function productionEvidenceAssets(): Phase0CatalogMeasurementEvidenceAsset[] {
  return ["straightOn", "left45", "right45", "leftProfile", "rightProfile"].map((angle, index) => ({
    assetID: `evidence-${angle}`,
    angle: angle as Phase0CatalogMeasurementEvidenceAsset["angle"],
    relativePath: `production-evidence/synthetic-test-only/${angle}.png`,
    sha256: String(index + 1).repeat(64).slice(0, 64),
    sourceType: "production",
    approvedForProduction: true,
    verificationState: "verified"
  }));
}

function readFixture(): { items: Array<Record<string, unknown>>; evidenceAssets: Array<Record<string, unknown>> } {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/fixtures/test-only/catalog-image-measurement/fixture-package.json"), "utf8"));
}

function landmarkReport(viewID: Phase0CatalogMeasurementViewInput["viewID"], yaw: number, profileOffset?: number): FaceLandmarkReport {
  return {
    availabilityState: "available",
    faceCount: "one",
    detectedFaceCount: 1,
    faces: [face(viewID, yaw, profileOffset)],
    provider: MEDIAPIPE_FACE_LANDMARKER_METADATA,
    confidence: { score: 0.8, label: "high", evidence: "estimated" },
    advisoryMessages: [],
    blockingMessages: [],
    createdAt: now
  };
}

function multipleFaceReport(): FaceLandmarkReport {
  return {
    ...landmarkReport("straightOn", 0),
    faceCount: "multiple",
    detectedFaceCount: 2,
    faces: [face("straightOn", 0), face("straightOn", 0)]
  };
}

function face(viewID: Phase0CatalogMeasurementViewInput["viewID"], yaw: number, profileOffset?: number): DetectedFaceLandmarks {
  const centerX = viewID === "leftProfile" ? 0.47 : viewID === "rightProfile" ? 0.53 : 0.5;
  const centerY = 0.5;
  const faceWidth = 0.48;
  const faceHeight = 0.64;
  const left = centerX - faceWidth / 2;
  const right = centerX + faceWidth / 2;
  const top = centerY - faceHeight / 2;
  const bottom = centerY + faceHeight / 2;
  const noseOffset = profileOffset ?? (viewID === "leftProfile" ? -0.1 : viewID === "rightProfile" ? 0.1 : 0);
  const chinOffset = viewID === "leftProfile" ? -0.04 : viewID === "rightProfile" ? 0.04 : 0;
  const points: Array<[string, number, number]> = [
    ["forehead top", centerX, top],
    ["left brow", centerX - 0.14, centerY - 0.15],
    ["right brow", centerX + 0.14, centerY - 0.15],
    ["left eye outer corner", centerX - 0.116, centerY - 0.08],
    ["left eye inner corner", centerX - 0.048, centerY - 0.075],
    ["right eye inner corner", centerX + 0.048, centerY - 0.075],
    ["right eye outer corner", centerX + 0.116, centerY - 0.08],
    ["left nose wing", centerX - 0.0385, centerY + 0.02],
    ["right nose wing", centerX + 0.0385, centerY + 0.02],
    ["nose bridge", centerX, centerY - 0.09],
    ["nose base", centerX, centerY + 0.11],
    ["nose tip", centerX + noseOffset, centerY + 0.02],
    ["left mouth corner", centerX - 0.0815, centerY + 0.18],
    ["right mouth corner", centerX + 0.0815, centerY + 0.18],
    ["left jaw", centerX - 0.155, centerY + 0.23],
    ["right jaw", centerX + 0.155, centerY + 0.23],
    ["left chin edge", centerX - 0.08, bottom - 0.03],
    ["right chin edge", centerX + 0.08, bottom - 0.03],
    ["chin", centerX + chinOffset, bottom],
    ["nose base", centerX, centerY + 0.11],
    ["left face edge", left, centerY],
    ["right face edge", right, centerY],
    ["upper lip", centerX, centerY + 0.16]
  ];
  return {
    boundingBox: {
      x: left,
      y: top,
      width: faceWidth,
      height: faceHeight,
      confidence: { score: 0.8, label: "high", evidence: "estimated" }
    },
    coreLandmarks: points.map(([label, x, y], index) => landmark(label, index, x, y)),
    approximateHeadPose: {
      yawDegrees: yaw,
      pitchDegrees: 0,
      rollDegrees: 0,
      confidence: { score: 0.7, label: "medium", evidence: "estimated" },
      availabilityState: "available"
    },
    expression: {
      leftEyeOpenness: 0.24,
      rightEyeOpenness: 0.24,
      mouthOpenness: 0.05,
      smileLikelihood: 0.1,
      strongExpressionLikelihood: 0.2,
      confidence: { score: 0.7, label: "medium", evidence: "estimated" },
      availabilityState: "available"
    },
    confidence: { score: 0.8, label: "high", evidence: "estimated" }
  };
}

function landmark(label: string, sourceIndex: number, x: number, y: number): FaceLandmarkPoint {
  return {
    label,
    sourceIndex,
    x,
    y,
    z: null,
    confidence: { score: 0.8, label: "high", evidence: "estimated" }
  };
}

function yawForView(viewID: Phase0CatalogMeasurementViewInput["viewID"]) {
  if (viewID === "left45") return -42;
  if (viewID === "right45") return 42;
  if (viewID === "leftProfile") return -78;
  if (viewID === "rightProfile") return 78;
  return 0;
}
