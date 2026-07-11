import type { FaceLandmarker, FaceLandmarkerResult, FilesetResolver } from "@mediapipe/tasks-vision";
import type { FaceLandmarkReport } from "@/types/domain";
import {
  MEDIAPIPE_FACE_LANDMARKER_METADATA,
  timeoutFaceLandmarkReport,
  unavailableFaceLandmarkReport,
  type FaceLandmarkInput,
  type FaceLandmarkProvider,
  type FaceLandmarkProviderOptions
} from "./face-landmark-provider";
import { mapMediaPipeFaceLandmarkerResult } from "./face-landmark-geometry";

const defaultInitializeTimeoutMs = 8_000;
const defaultDetectionTimeoutMs = 6_000;

export class MediaPipeFaceLandmarkerProvider implements FaceLandmarkProvider {
  readonly metadata = MEDIAPIPE_FACE_LANDMARKER_METADATA;
  private landmarker: FaceLandmarker | null = null;
  private initialization: Promise<void> | null = null;

  async initialize(options: FaceLandmarkProviderOptions = {}) {
    if (this.landmarker) return;
    if (!this.initialization) {
      this.initialization = this.initializeInternal(options);
    }
    await withTimeout(this.initialization, options.initializeTimeoutMs ?? defaultInitializeTimeoutMs, () => {
      throw new Error("Local MediaPipe Face Landmarker initialization timed out.");
    });
  }

  async detect(input: FaceLandmarkInput, options: FaceLandmarkProviderOptions = {}): Promise<FaceLandmarkReport> {
    try {
      await this.initialize(options);
      if (!this.landmarker) {
        return unavailableFaceLandmarkReport({
          provider: this.metadata,
          state: "error",
          message: "Local face landmark provider was not initialized.",
          blocking: false
        });
      }
      const result = await withTimeout(
        Promise.resolve().then(() => this.landmarker?.detect(input.image) as FaceLandmarkerResult),
        options.detectionTimeoutMs ?? defaultDetectionTimeoutMs,
        () => null
      );
      if (!result) return timeoutFaceLandmarkReport(this.metadata);
      return mapMediaPipeFaceLandmarkerResult(result, this.metadata);
    } catch (error) {
      return unavailableFaceLandmarkReport({
        provider: this.metadata,
        state: error instanceof Error && /timed out/i.test(error.message) ? "timeout" : "error",
        message: error instanceof Error ? error.message : "Local face landmark detection failed.",
        blocking: false
      });
    }
  }

  async dispose() {
    this.landmarker?.close();
    this.landmarker = null;
    this.initialization = null;
  }

  private async initializeInternal(options: FaceLandmarkProviderOptions) {
    const modelPath = options.modelPath ?? this.metadata.modelPath;
    const wasmRoot = options.wasmRoot ?? "/mediapipe/tasks-vision/wasm";
    await verifyLocalModelAsset(modelPath);
    const tasksVision = await import("@mediapipe/tasks-vision");
    const resolver = tasksVision.FilesetResolver as typeof FilesetResolver;
    const landmarkerClass = tasksVision.FaceLandmarker as typeof FaceLandmarker;
    const vision = await resolver.forVisionTasks(wasmRoot);
    this.landmarker = await landmarkerClass.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: modelPath,
        delegate: "CPU"
      },
      runningMode: "IMAGE",
      numFaces: 2,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true
    });
  }
}

export async function verifyLocalModelAsset(modelPath: string) {
  if (typeof fetch !== "function") return;
  const response = await fetch(modelPath, { method: "HEAD", cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `Local MediaPipe Face Landmarker model is unavailable at ${modelPath}. Landmark extraction stays disabled until a reviewed local model asset is installed.`
    );
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, onTimeout: () => T): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => resolve(onTimeout()), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function createMediaPipeFaceLandmarkerProvider() {
  return new MediaPipeFaceLandmarkerProvider();
}
