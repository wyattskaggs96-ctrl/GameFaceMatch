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

function landmarkSession(fixture: SyntheticGeometryFixture): ActiveCaptureSession {
  let session = createInitialCaptureSession(new Date("2026-07-11T00:00:00.000Z"));
  for (const angle of session.angles) {
    const imageRef = image(angle.id);
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
    session = setAngleCapture(session, angle.id, imageRef, "upload", qualityReport, landmarkReport(angle.id, fixture)).session;
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

function landmarkReport(angleID: CapturedAngleID, fixture: SyntheticGeometryFixture): FaceLandmarkReport {
  return {
    availabilityState: "available",
    faceCount: "one",
    detectedFaceCount: 1,
    faces: [face(angleID, fixture)],
    provider: MEDIAPIPE_FACE_LANDMARKER_METADATA,
    confidence: { score: 0.8, label: "high", evidence: "estimated" },
    advisoryMessages: [],
    blockingMessages: [],
    createdAt: "2026-07-11T00:00:00.000Z"
  };
}

function face(angleID: CapturedAngleID, fixture: SyntheticGeometryFixture): DetectedFaceLandmarks {
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
      yawDegrees: angleID === "leftProfile" ? -78 : angleID === "rightProfile" ? 78 : angleID === "left45" ? -42 : angleID === "right45" ? 42 : 0,
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

function image(angleID: CapturedAngleID): TemporaryImageReference {
  return createTemporaryImageReference(
    {
      objectUrl: `blob:${angleID}`,
      fileName: `${angleID}.jpg`,
      fileType: "image/jpeg",
      fileSizeBytes: 1_000_000,
      width: 900,
      height: 1200,
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
