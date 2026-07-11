import type { FaceLandmarkProviderMetadata, FaceLandmarkReport } from "@/types/domain";

export interface FaceLandmarkInput {
  image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap;
  width: number;
  height: number;
  angleID?: string;
}

export interface FaceLandmarkProviderOptions {
  modelPath?: string;
  wasmRoot?: string;
  initializeTimeoutMs?: number;
  detectionTimeoutMs?: number;
}

export interface FaceLandmarkProvider {
  readonly metadata: FaceLandmarkProviderMetadata;
  initialize(options?: FaceLandmarkProviderOptions): Promise<void>;
  detect(input: FaceLandmarkInput, options?: FaceLandmarkProviderOptions): Promise<FaceLandmarkReport>;
  dispose(): Promise<void> | void;
}

export const MEDIAPIPE_FACE_LANDMARKER_METADATA: FaceLandmarkProviderMetadata = {
  providerName: "Google MediaPipe Face Landmarker",
  packageName: "@mediapipe/tasks-vision",
  packageVersion: "0.10.35",
  modelName: "MediaPipe Face Landmarker task model",
  modelVersion: "not bundled; local asset required",
  modelSource: "https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js",
  modelPath: "/models/mediapipe/face_landmarker.task",
  license: "MediaPipe runtime is Apache-2.0; Google documentation samples are Apache-2.0 and CC-BY-4.0.",
  integrityStrategy: "Keep the model as a local reviewed asset with a recorded checksum before enabling production landmark extraction.",
  updateStrategy: "Update only by a documented dependency/model review; do not hot-link a remote model at runtime.",
  localOnly: true
};

export function unavailableFaceLandmarkReport(input: {
  provider?: FaceLandmarkProviderMetadata;
  state?: FaceLandmarkReport["availabilityState"];
  message: string;
  blocking?: boolean;
  createdAt?: string;
}): FaceLandmarkReport {
  return {
    availabilityState: input.state ?? "unavailable",
    faceCount: input.state === "error" ? "error" : "unavailable",
    detectedFaceCount: null,
    faces: [],
    provider: input.provider ?? MEDIAPIPE_FACE_LANDMARKER_METADATA,
    confidence: {
      score: null,
      label: "unavailable",
      evidence: "notYetImplemented"
    },
    advisoryMessages: input.blocking ? [] : [input.message],
    blockingMessages: input.blocking ? [input.message] : [],
    createdAt: input.createdAt ?? new Date().toISOString()
  };
}

export function timeoutFaceLandmarkReport(provider = MEDIAPIPE_FACE_LANDMARKER_METADATA): FaceLandmarkReport {
  return unavailableFaceLandmarkReport({
    provider,
    state: "timeout",
    message: "Local face landmark detection timed out. Retake or continue with manual confirmation.",
    blocking: false
  });
}
