import { describe, expect, it } from "vitest";
import { createInitialCaptureSession, setAngleCapture } from "@/lib/capture/capture-session";
import type { ActiveCaptureSession } from "@/lib/capture/capture-session";
import { createImageQualityReport } from "@/lib/capture/image-quality-service";
import { createTemporaryImageReference } from "@/lib/capture/image-validation";
import { MEDIAPIPE_FACE_LANDMARKER_METADATA } from "@/lib/face-landmarks/face-landmark-provider";
import { createInitialAttributeConfirmation } from "@/lib/profile/attribute-confirmation";
import { createStandardFaceProfile } from "@/lib/profile/standard-face-profile";
import type {
  CapturedAngleID,
  CaptureGuidanceIssue,
  CaptureGuidanceReport,
  DetectedFaceLandmarks,
  FaceLandmarkPoint,
  FaceLandmarkReport,
  TemporaryImageReference
} from "@/types/domain";

describe("RGB landmark StandardFaceProfile geometry", () => {
  it("calculates defensible normalized measurements from deterministic synthetic landmarks", () => {
    const profile = createStandardFaceProfile({
      session: landmarkSession(defaultFixture()),
      attributes: createInitialAttributeConfirmation(),
      now: new Date("2026-07-11T00:00:00.000Z")
    });

    expect(profile.geometry.measurements.faceWidthRatio?.value).toBe(0.75);
    expect(profile.geometry.measurements.eyeSpacingRatio?.value).toBe(0.2);
    expect(profile.geometry.measurements.meanEyeWidthRatio?.value).toBe(0.142);
    expect(profile.geometry.measurements.noseWidthRatio?.value).toBe(0.16);
    expect(profile.geometry.measurements.mouthWidthRatio?.value).toBe(0.34);
    expect(profile.geometry.measurements.noseProjection?.profileEvidenceExists).toBe(true);
    expect(profile.geometry.measurements.noseProjection?.supportingPoses).toEqual(["leftProfile", "rightProfile"]);
    expect(profile.geometry.measurements.faceLengthRatio?.availabilityState).toBe("unavailable");
  });

  it("includes required measurement provenance without depth support", () => {
    const profile = createStandardFaceProfile({
      session: landmarkSession(defaultFixture()),
      attributes: createInitialAttributeConfirmation(),
      now: new Date("2026-07-11T00:00:00.000Z")
    });
    const measurement = profile.geometry.measurements.faceWidthRatio;
    expect(measurement).toMatchObject({
      depthSupported: false,
      algorithmVersion: "web-rgb-landmark-geometry-v1",
      supportingFrameCount: 1,
      supportingPoses: ["straightOn"],
      occlusionImpact: "none",
      profileEvidenceExists: false,
      measurementSource: "browserRgbImage",
      availabilityState: "available"
    });
  });

  it("builds the supported five-angle RGB profile pipeline without serializing raw media", () => {
    const profile = createStandardFaceProfile({
      session: landmarkSession(defaultFixture()),
      attributes: {
        ...createInitialAttributeConfirmation(),
        hairColorFamily: "brown",
        hairTextureFamily: "wavy",
        hairstyleFamily: "short",
        facialHairPresence: "none",
        eyebrowThickness: "medium",
        skinPresentation: "medium",
        desiredInGameHeight: "72",
        desiredInGameWeight: "205",
        preferredBodyType: "balanced",
        resemblancePhysiquePreference: "balanced"
      },
      now: new Date("2026-07-11T00:00:00.000Z"),
      userAgent: "rgb-profile-pipeline-test"
    });

    expect(profile.capture.mode).toBe("webRgbGuided");
    expect(profile.capture.browserRgbOnly).toBe(true);
    expect(profile.supportingFrames.availableAngleIDs).toEqual(["straightOn", "left45", "right45", "leftProfile", "rightProfile"]);
    expect(profile.geometry.measurements.faceWidthRatio?.availabilityState).toBe("available");
    expect(profile.appearance.attributes.find((attribute) => attribute.category === "hairColorFamily")?.source).toBe("userConfirmed");
    expect(profile.userConfirmedAttributes.find((attribute) => attribute.category === "skinPresentation")?.value).toBe("medium");

    const serialized = JSON.stringify(profile);
    expect(serialized).not.toContain("blob:");
    expect(serialized).not.toContain(".jpg");
    expect(serialized).not.toContain("coreLandmarks");
    expect(serialized).not.toContain("nose tip");
  });

  it("does not use wrong-pose profile views for profile projection measurements", () => {
    const session = landmarkSession(defaultFixture(), {
      yawByAngle: {
        leftProfile: 0,
        rightProfile: 0
      }
    });
    const profile = createStandardFaceProfile({
      session,
      attributes: createInitialAttributeConfirmation(),
      now: new Date("2026-07-11T00:00:00.000Z")
    });

    expect(profile.geometry.measurements.noseProjection).toMatchObject({
      value: null,
      availabilityState: "unavailable",
      supportingFrameCount: 0,
      depthSupported: false
    });
    expect(profile.geometry.measurements.chinProjection?.availabilityState).toBe("unavailable");
  });

  it("rejects blocked blur or dimension evidence instead of measuring from it", () => {
    const profile = createStandardFaceProfile({
      session: landmarkSession(defaultFixture(), { blockedAngles: new Set(["straightOn"]) }),
      attributes: createInitialAttributeConfirmation(),
      now: new Date("2026-07-11T00:00:00.000Z")
    });

    expect(profile.qualityReport.blockingIssueCount).toBeGreaterThan(0);
    expect(profile.geometry.measurements.faceWidthRatio).toMatchObject({
      value: null,
      availabilityState: "unavailable",
      supportingFrameCount: 0
    });
    expect(profile.geometry.measurements.noseProjection?.availabilityState).toBe("available");
  });

  it("reduces measurement confidence when expression guidance is advisory", () => {
    const calm = createStandardFaceProfile({
      session: landmarkSession(defaultFixture()),
      attributes: createInitialAttributeConfirmation(),
      now: new Date("2026-07-11T00:00:00.000Z")
    });
    const expressive = createStandardFaceProfile({
      session: landmarkSession(defaultFixture(), { advisoryByAngle: { straightOn: ["strongExpression"] } }),
      attributes: createInitialAttributeConfirmation(),
      now: new Date("2026-07-11T00:00:00.000Z")
    });

    expect(Number(expressive.geometry.measurements.faceWidthRatio?.confidence.score)).toBeLessThan(
      Number(calm.geometry.measurements.faceWidthRatio?.confidence.score)
    );
    expect(expressive.geometry.measurements.faceWidthRatio?.availabilityState).toBe("available");
  });

  it("marks unavailable measurements instead of guessing when landmarks are absent", () => {
    const profile = createStandardFaceProfile({
      session: createInitialCaptureSession(new Date("2026-07-11T00:00:00.000Z")),
      attributes: createInitialAttributeConfirmation(),
      now: new Date("2026-07-11T00:00:00.000Z")
    });
    expect(profile.geometry.measurements.faceWidthRatio?.value).toBeNull();
    expect(profile.geometry.measurements.faceWidthRatio?.availabilityState).toBe("unavailable");
    expect(profile.geometry.measurements.faceWidthRatio?.supportingFrameCount).toBe(0);
  });

  it("keeps repeated synthetic captures within stability tolerance", () => {
    const first = createStandardFaceProfile({
      session: landmarkSession(defaultFixture()),
      attributes: createInitialAttributeConfirmation(),
      now: new Date("2026-07-11T00:00:00.000Z")
    });
    const second = createStandardFaceProfile({
      session: landmarkSession(defaultFixture({ jitter: 0.002 })),
      attributes: createInitialAttributeConfirmation(),
      now: new Date("2026-07-11T00:01:00.000Z")
    });
    for (const id of ["faceWidthRatio", "eyeSpacingRatio", "noseWidthRatio", "mouthWidthRatio"] as const) {
      expect(Math.abs(Number(first.geometry.measurements[id]?.value) - Number(second.geometry.measurements[id]?.value))).toBeLessThanOrEqual(0.01);
    }
  });

  it("distinguishes synthetic regression fixtures with different proportions", () => {
    const narrow = createStandardFaceProfile({
      session: landmarkSession(defaultFixture({ faceWidth: 0.42, eyeSpacing: 0.07, mouthWidth: 0.13 })),
      attributes: createInitialAttributeConfirmation(),
      now: new Date("2026-07-11T00:00:00.000Z")
    });
    const wide = createStandardFaceProfile({
      session: landmarkSession(defaultFixture({ faceWidth: 0.58, eyeSpacing: 0.11, mouthWidth: 0.2 })),
      attributes: createInitialAttributeConfirmation(),
      now: new Date("2026-07-11T00:00:00.000Z")
    });
    expect(Number(wide.geometry.measurements.faceWidthRatio?.value)).toBeGreaterThan(Number(narrow.geometry.measurements.faceWidthRatio?.value));
    expect(Number(wide.geometry.measurements.mouthWidthRatio?.value)).toBeGreaterThan(Number(narrow.geometry.measurements.mouthWidthRatio?.value));
  });

  it("does not serialize raw frames or landmark coordinates in the profile", () => {
    const profile = createStandardFaceProfile({
      session: landmarkSession(defaultFixture()),
      attributes: createInitialAttributeConfirmation(),
      now: new Date("2026-07-11T00:00:00.000Z")
    });
    const serialized = JSON.stringify(profile);
    expect(serialized).not.toContain("blob:");
    expect(serialized).not.toContain("coreLandmarks");
    expect(serialized).not.toContain("nose tip");
  });
});

interface LandmarkSessionOptions {
  yawByAngle?: Partial<Record<CapturedAngleID, number>>;
  blockedAngles?: Set<CapturedAngleID>;
  advisoryByAngle?: Partial<Record<CapturedAngleID, CaptureGuidanceIssue["code"][]>>;
}

function landmarkSession(fixture: SyntheticGeometryFixture, options: LandmarkSessionOptions = {}): ActiveCaptureSession {
  let session = createInitialCaptureSession(new Date("2026-07-11T00:00:00.000Z"));
  for (const angle of session.angles) {
    const blocked = options.blockedAngles?.has(angle.id) ?? false;
    const imageRef = image(angle.id, blocked ? { width: 320, height: 320 } : undefined);
    const qualityReport = createImageQualityReport({
      decodedSuccessfully: true,
      image: imageRef,
      pixelSample: pixelSample(2, 2, [128, 128, 128, 255]),
      existingAngles: session.angles.filter((candidate) => candidate.id !== angle.id),
      associatedAngleID: angle.id,
      manualConfirmation: {
        requestedAngle: true,
        neutralExpression: true,
        onePerson: true
      }
    });
    session = setAngleCapture(
      session,
      angle.id,
      imageRef,
      "upload",
      qualityReport,
      landmarkReport(angle.id, fixture, options.yawByAngle?.[angle.id]),
      guidanceReport(angle.id, options.advisoryByAngle?.[angle.id] ?? [])
    ).session;
  }
  return session;
}

interface SyntheticGeometryFixture {
  faceWidth: number;
  faceHeight: number;
  eyeSpacing: number;
  eyeWidth: number;
  noseWidth: number;
  mouthWidth: number;
  jawWidth: number;
  chinWidth: number;
  jitter: number;
}

function defaultFixture(input: Partial<SyntheticGeometryFixture> = {}): SyntheticGeometryFixture {
  return {
    faceWidth: input.faceWidth ?? 0.48,
    faceHeight: input.faceHeight ?? 0.64,
    eyeSpacing: input.eyeSpacing ?? 0.096,
    eyeWidth: input.eyeWidth ?? 0.068,
    noseWidth: input.noseWidth ?? 0.077,
    mouthWidth: input.mouthWidth ?? 0.163,
    jawWidth: input.jawWidth ?? 0.31,
    chinWidth: input.chinWidth ?? 0.16,
    jitter: input.jitter ?? 0
  };
}

function landmarkReport(angleID: CapturedAngleID, fixture: SyntheticGeometryFixture, yawOverride?: number): FaceLandmarkReport {
  return {
    availabilityState: "available",
    faceCount: "one",
    detectedFaceCount: 1,
    faces: [face(angleID, fixture, yawOverride)],
    provider: MEDIAPIPE_FACE_LANDMARKER_METADATA,
    confidence: { score: 0.8, label: "high", evidence: "estimated" },
    advisoryMessages: [],
    blockingMessages: [],
    createdAt: "2026-07-11T00:00:00.000Z"
  };
}

function face(angleID: CapturedAngleID, fixture: SyntheticGeometryFixture, yawOverride?: number): DetectedFaceLandmarks {
  const centerX = angleID === "leftProfile" ? 0.47 : angleID === "rightProfile" ? 0.53 : 0.5;
  const centerY = 0.5;
  const left = centerX - fixture.faceWidth / 2;
  const right = centerX + fixture.faceWidth / 2;
  const top = centerY - fixture.faceHeight / 2;
  const bottom = centerY + fixture.faceHeight / 2;
  const j = fixture.jitter;
  const points: Array<[string, number, number]> = [
    ["forehead top", centerX, top],
    ["left face edge", left, centerY],
    ["right face edge", right, centerY],
    ["left brow", centerX - 0.14 + j, centerY - 0.15],
    ["right brow", centerX + 0.14 + j, centerY - 0.15],
    ["left eye outer corner", centerX - fixture.eyeSpacing / 2 - fixture.eyeWidth + j, centerY - 0.08],
    ["left eye inner corner", centerX - fixture.eyeSpacing / 2 + j, centerY - 0.075],
    ["right eye inner corner", centerX + fixture.eyeSpacing / 2 + j, centerY - 0.075],
    ["right eye outer corner", centerX + fixture.eyeSpacing / 2 + fixture.eyeWidth + j, centerY - 0.08],
    ["left nose wing", centerX - fixture.noseWidth / 2 + j, centerY + 0.02],
    ["right nose wing", centerX + fixture.noseWidth / 2 + j, centerY + 0.02],
    ["nose bridge", centerX + (angleID === "leftProfile" ? 0.02 : angleID === "rightProfile" ? -0.02 : 0), centerY - 0.09],
    ["nose base", centerX, centerY + 0.11],
    ["nose tip", centerX + (angleID === "leftProfile" ? -0.1 : angleID === "rightProfile" ? 0.1 : 0), centerY + 0.02],
    ["left mouth corner", centerX - fixture.mouthWidth / 2 + j, centerY + 0.18],
    ["right mouth corner", centerX + fixture.mouthWidth / 2 + j, centerY + 0.18],
    ["upper lip", centerX, centerY + 0.16],
    ["lower lip", centerX, centerY + 0.2],
    ["left jaw", centerX - fixture.jawWidth / 2 + j, centerY + 0.23],
    ["right jaw", centerX + fixture.jawWidth / 2 + j, centerY + 0.23],
    ["left chin edge", centerX - fixture.chinWidth / 2 + j, bottom - 0.03],
    ["right chin edge", centerX + fixture.chinWidth / 2 + j, bottom - 0.03],
    ["chin", centerX + (angleID === "leftProfile" ? -0.04 : angleID === "rightProfile" ? 0.04 : 0), bottom]
  ];
  return {
    boundingBox: {
      x: left,
      y: top,
      width: fixture.faceWidth,
      height: fixture.faceHeight,
      confidence: { score: 0.8, label: "high", evidence: "estimated" }
    },
    coreLandmarks: points.map(([label, x, y], index) => landmark(label, index, x, y)),
    approximateHeadPose: {
      yawDegrees: yawOverride ?? (angleID === "leftProfile" ? -78 : angleID === "rightProfile" ? 78 : angleID === "left45" ? -42 : angleID === "right45" ? 42 : 0),
      pitchDegrees: 0,
      rollDegrees: 0,
      confidence: { score: 0.7, label: "medium", evidence: "estimated" },
      availabilityState: "available"
    },
    expression: {
      leftEyeOpenness: 0.25,
      rightEyeOpenness: 0.25,
      mouthOpenness: 0.08,
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

function guidanceReport(angleID: CapturedAngleID, advisoryCodes: CaptureGuidanceIssue["code"][] = []): CaptureGuidanceReport {
  const advisoryWarnings = advisoryCodes.map((code) => ({
    code,
    severity: "advisory" as const,
    message: `${code} advisory for deterministic profile test.`,
    canContinueWithLimitations: true
  }));
  return {
    protocolVersion: "test-guidance-protocol",
    thresholdVersion: "test-guidance-thresholds",
    angleID,
    realtimeQuality: {
      score: advisoryWarnings.length ? 82 : 94,
      state: advisoryWarnings.length ? "needsReview" : "ready",
      thresholdVersion: "test-guidance-thresholds",
      signals: [],
      blockingSignalCount: 0,
      advisorySignalCount: advisoryWarnings.length
    },
    requiredPoseReached: true,
    poseHeldLongEnough: true,
    holdDurationMs: 1000,
    holdTargetMs: 900,
    canCapture: true,
    canContinueWithLimitations: true,
    blockingIssues: [],
    advisoryWarnings,
    readyMessages: advisoryWarnings.length
      ? []
      : [
          {
            code: "poseHeld",
            severity: "ready",
            message: "Pose held in deterministic profile test.",
            canContinueWithLimitations: true
          }
        ],
    createdAt: "2026-07-11T00:00:00.000Z"
  };
}

function image(angleID: CapturedAngleID, options: { width?: number; height?: number } = {}): TemporaryImageReference {
  return createTemporaryImageReference(
    {
      objectUrl: `blob:${angleID}`,
      fileName: `${angleID}.jpg`,
      fileType: "image/jpeg",
      fileSizeBytes: 1_000_000,
      width: options.width ?? 900,
      height: options.height ?? 1200,
      source: "upload",
      associatedAngleID: angleID,
      signature: angleID
    },
    angleID
  );
}

function pixelSample(width: number, height: number, rgba: [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = rgba[0];
    data[index + 1] = rgba[1];
    data[index + 2] = rgba[2];
    data[index + 3] = rgba[3];
  }
  return { width, height, rgba: data };
}
