import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { mapMediaPipeFaceLandmarkerResult } from "@/lib/face-landmarks/face-landmark-geometry";
import {
  MEDIAPIPE_FACE_LANDMARKER_METADATA,
  timeoutFaceLandmarkReport,
  unavailableFaceLandmarkReport,
  type FaceLandmarkInput,
  type FaceLandmarkProvider,
  type FaceLandmarkProviderOptions
} from "@/lib/face-landmarks/face-landmark-provider";
import { verifyLocalModelAsset } from "@/lib/face-landmarks/mediapipe-face-landmarker-provider";

describe("face landmark provider metadata", () => {
  it("records local-only MediaPipe provider provenance", () => {
    expect(MEDIAPIPE_FACE_LANDMARKER_METADATA.providerName).toBe("Google MediaPipe Face Landmarker");
    expect(MEDIAPIPE_FACE_LANDMARKER_METADATA.packageName).toBe("@mediapipe/tasks-vision");
    expect(MEDIAPIPE_FACE_LANDMARKER_METADATA.packageVersion).toBe("0.10.35");
    expect(MEDIAPIPE_FACE_LANDMARKER_METADATA.localOnly).toBe(true);
    expect(MEDIAPIPE_FACE_LANDMARKER_METADATA.modelPath).toBe("/models/mediapipe/face_landmarker.task");
  });

  it("keeps the reviewed local MediaPipe model asset available with the recorded checksum", () => {
    const assetPath = path.join(process.cwd(), "public/models/mediapipe/face_landmarker.task");
    const bytes = fs.readFileSync(assetPath);
    expect(bytes.byteLength).toBeGreaterThan(3_000_000);
    expect(crypto.createHash("sha256").update(bytes).digest("hex")).toBe("64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff");
    expect(MEDIAPIPE_FACE_LANDMARKER_METADATA.modelVersion).toContain("64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff");
  });
});

describe("MediaPipe face landmark result mapping", () => {
  it("reports zero faces as a blocking local-detection state", () => {
    const report = mapMediaPipeFaceLandmarkerResult({ faceLandmarks: [] }, MEDIAPIPE_FACE_LANDMARKER_METADATA, "2026-07-11T00:00:00.000Z");
    expect(report.faceCount).toBe("zero");
    expect(report.detectedFaceCount).toBe(0);
    expect(report.blockingMessages).toContain("No face was detected in this image.");
  });

  it("reports multiple faces as blocking without identifying anyone", () => {
    const report = mapMediaPipeFaceLandmarkerResult({
      faceLandmarks: [syntheticLandmarks(), syntheticLandmarks(0.08)]
    });
    expect(report.faceCount).toBe("multiple");
    expect(report.detectedFaceCount).toBe(2);
    expect(report.blockingMessages).toContain("Multiple faces were detected. Use an image with one person only.");
  });

  it("maps one synthetic face to bounding box, core landmarks, head pose, and expression estimates", () => {
    const report = mapMediaPipeFaceLandmarkerResult({
      faceLandmarks: [syntheticLandmarks()],
      facialTransformationMatrixes: [{ data: identityMatrix() }],
      faceBlendshapes: [
        {
          categories: [
            { categoryName: "mouthSmileLeft", score: 0.2 },
            { categoryName: "mouthSmileRight", score: 0.4 }
          ]
        }
      ]
    });
    expect(report.faceCount).toBe("one");
    expect(report.blockingMessages).toEqual([]);
    expect(report.faces[0].boundingBox.width).toBeGreaterThan(0);
    expect(report.faces[0].coreLandmarks.length).toBeGreaterThan(8);
    expect(report.faces[0].approximateHeadPose.availabilityState).toBe("available");
    expect(report.faces[0].expression.mouthOpenness).not.toBeNull();
    expect(report.faces[0].expression.smileLikelihood).toBe(0.3);
  });

  it("keeps MediaPipe yaw, pitch, and roll signs deterministic for guided scan decisions", () => {
    const yawRight = mapMediaPipeFaceLandmarkerResult({
      faceLandmarks: [syntheticLandmarks()],
      facialTransformationMatrixes: [{ data: yawMatrix(32) }]
    });
    expect(yawRight.faces[0].approximateHeadPose.yawDegrees).toBe(32);
    expect(yawRight.faces[0].approximateHeadPose.pitchDegrees).toBeCloseTo(0);
    expect(yawRight.faces[0].approximateHeadPose.rollDegrees).toBeCloseTo(0);

    const pitchDown = mapMediaPipeFaceLandmarkerResult({
      faceLandmarks: [syntheticLandmarks()],
      facialTransformationMatrixes: [{ data: pitchMatrix(18) }]
    });
    expect(pitchDown.faces[0].approximateHeadPose.yawDegrees).toBeCloseTo(0);
    expect(pitchDown.faces[0].approximateHeadPose.pitchDegrees).toBe(18);
    expect(pitchDown.faces[0].approximateHeadPose.rollDegrees).toBeCloseTo(0);

    const rollRight = mapMediaPipeFaceLandmarkerResult({
      faceLandmarks: [syntheticLandmarks()],
      facialTransformationMatrixes: [{ data: rollMatrix(24) }]
    });
    expect(rollRight.faces[0].approximateHeadPose.yawDegrees).toBeCloseTo(0);
    expect(rollRight.faces[0].approximateHeadPose.pitchDegrees).toBeCloseTo(0);
    expect(rollRight.faces[0].approximateHeadPose.rollDegrees).toBe(24);
  });
});

describe("local model availability and failure states", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("initializes when the reviewed local model asset exists", async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 200 })) as typeof fetch;
    await expect(verifyLocalModelAsset("/models/mediapipe/face_landmarker.task")).resolves.toBeUndefined();
  });

  it("fails closed when the local model asset is absent", async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 404 })) as typeof fetch;
    await expect(verifyLocalModelAsset("/models/mediapipe/face_landmarker.task")).rejects.toThrow(/model is unavailable/i);
  });

  it("represents timeouts as unavailable evidence, not fabricated landmarks", () => {
    const report = timeoutFaceLandmarkReport();
    expect(report.availabilityState).toBe("timeout");
    expect(report.faces).toEqual([]);
    expect(report.confidence.label).toBe("unavailable");
  });

  it("supports test-only synthetic provider success and failure without production fixtures", async () => {
    const provider = new TestOnlyFaceLandmarkProvider("success");
    await provider.initialize();
    const report = await provider.detect({ image: {} as HTMLImageElement, width: 900, height: 1200 });
    expect(report.faceCount).toBe("one");

    const failedProvider = new TestOnlyFaceLandmarkProvider("failure");
    await expect(failedProvider.initialize()).rejects.toThrow("Synthetic provider failed to initialize.");
  });
});

class TestOnlyFaceLandmarkProvider implements FaceLandmarkProvider {
  readonly metadata = {
    ...MEDIAPIPE_FACE_LANDMARKER_METADATA,
    providerName: "TEST-ONLY synthetic face landmark provider",
    modelName: "TEST-ONLY synthetic landmarks"
  };

  constructor(private readonly mode: "success" | "failure") {}

  async initialize(_options?: FaceLandmarkProviderOptions) {
    if (this.mode === "failure") throw new Error("Synthetic provider failed to initialize.");
  }

  async detect(_input: FaceLandmarkInput) {
    if (this.mode === "failure") {
      return unavailableFaceLandmarkReport({
        provider: this.metadata,
        state: "error",
        message: "TEST-ONLY synthetic detection failed."
      });
    }
    return mapMediaPipeFaceLandmarkerResult({ faceLandmarks: [syntheticLandmarks()] }, this.metadata);
  }

  dispose() {}
}

function syntheticLandmarks(offset = 0) {
  return Array.from({ length: 478 }, (_, index) => {
    const angle = (index / 478) * Math.PI * 2;
    return {
      x: 0.5 + offset + Math.cos(angle) * 0.18,
      y: 0.5 + Math.sin(angle) * 0.24,
      z: Math.sin(angle) * 0.02
    };
  });
}

function identityMatrix() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function yawMatrix(degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [cos, 0, -sin, 0, 0, 1, 0, 0, sin, 0, cos, 0, 0, 0, 0, 1];
}

function pitchMatrix(degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [1, 0, 0, 0, 0, cos, sin, 0, 0, -sin, cos, 0, 0, 0, 0, 1];
}

function rollMatrix(degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [cos, sin, 0, 0, -sin, cos, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
