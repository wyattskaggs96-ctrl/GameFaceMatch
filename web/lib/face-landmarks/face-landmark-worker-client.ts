import type { FaceLandmarkReport } from "@/types/domain";
import {
  MEDIAPIPE_FACE_LANDMARKER_METADATA,
  unavailableFaceLandmarkReport,
  type FaceLandmarkInput,
  type FaceLandmarkProvider,
  type FaceLandmarkProviderOptions
} from "./face-landmark-provider";
import { createMediaPipeFaceLandmarkerProvider } from "./mediapipe-face-landmarker-provider";

type WorkerResponse =
  | {
      id: string;
      type: "result";
      report: FaceLandmarkReport;
    }
  | {
      id: string;
      type: "disposed";
    }
  | {
      id: string;
      type: "error";
      message: string;
    };

export class WorkerBackedFaceLandmarkProvider implements FaceLandmarkProvider {
  readonly metadata = MEDIAPIPE_FACE_LANDMARKER_METADATA;
  private worker: Worker | null = null;
  private fallback = createMediaPipeFaceLandmarkerProvider();
  private sequence = 0;
  private modelAvailability: Promise<boolean> | null = null;

  async initialize(options?: FaceLandmarkProviderOptions) {
    if (canUseWorker()) {
      this.ensureWorker();
      return;
    }
    await this.fallback.initialize(options);
  }

  async detect(input: FaceLandmarkInput, options?: FaceLandmarkProviderOptions): Promise<FaceLandmarkReport> {
    const modelAvailable = await this.hasReviewedLocalModel(options);
    if (!modelAvailable) {
      return unavailableFaceLandmarkReport({
        provider: this.metadata,
        state: "unavailable",
        message:
          "Local MediaPipe Face Landmarker model is not installed. Face count and landmarks are unavailable; continue with manual confirmations."
      });
    }
    if (!canUseWorker()) {
      return this.fallback.detect(input, options);
    }
    try {
      const image = await createImageBitmap(input.image);
      const worker = this.ensureWorker();
      const id = `face-landmark-${Date.now()}-${this.sequence}`;
      this.sequence += 1;
      return await new Promise<FaceLandmarkReport>((resolve) => {
        const timeout = setTimeout(() => {
          void this.fallback.detect(input, options).then((fallbackReport) => {
            resolve(
              fallbackReport.availabilityState === "available"
                ? fallbackReport
                : unavailableFaceLandmarkReport({
                    provider: this.metadata,
                    state: "timeout",
                    message: "Local face landmark worker timed out and direct browser face tracking was unavailable. Retry camera or start over."
                  })
            );
          });
        }, options?.detectionTimeoutMs ?? 6_000);

        const listener = (event: MessageEvent<WorkerResponse>) => {
          if (event.data.id !== id) return;
          clearTimeout(timeout);
          worker.removeEventListener("message", listener);
          if (event.data.type === "result") {
            resolve(event.data.report);
          } else if (event.data.type === "error") {
            void this.resolveWithDirectFallback(input, options, event.data.message).then(resolve);
          } else {
            void this.resolveWithDirectFallback(input, options, "Local face landmark worker was disposed before detection completed.").then(resolve);
          }
        };
        worker.addEventListener("message", listener);
        worker.postMessage(
          {
            id,
            type: "detect",
            image,
            width: input.width,
            height: input.height,
            options
          },
          [image]
        );
      });
    } catch (error) {
      const fallbackReport = await this.fallback.detect(input, options);
      if (fallbackReport.availabilityState !== "error") return fallbackReport;
      return unavailableFaceLandmarkReport({
        provider: this.metadata,
        state: "error",
        message: error instanceof Error ? error.message : "Local face landmark worker could not process the image."
      });
    }
  }

  async dispose() {
    await this.fallback.dispose();
    this.worker?.terminate();
    this.worker = null;
  }

  private ensureWorker() {
    if (!this.worker) {
      this.worker = new Worker(new URL("./face-landmark-worker.ts", import.meta.url), {
        type: "module",
        name: "gameface-face-landmarks"
      });
    }
    return this.worker;
  }

  private async hasReviewedLocalModel(options?: FaceLandmarkProviderOptions) {
    if (typeof fetch !== "function") return true;
    if (!this.modelAvailability) {
      const controller = typeof AbortController === "undefined" ? null : new AbortController();
      const timeout = controller ? setTimeout(() => controller.abort(), 800) : null;
      this.modelAvailability = fetch(options?.modelPath ?? this.metadata.modelPath, {
        method: "HEAD",
        cache: "no-store",
        signal: controller?.signal
      })
        .then((response) => response.ok)
        .catch(() => false)
        .finally(() => {
          if (timeout) clearTimeout(timeout);
        });
    }
    return this.modelAvailability;
  }

  private async resolveWithDirectFallback(input: FaceLandmarkInput, options: FaceLandmarkProviderOptions | undefined, workerMessage: string) {
    const fallbackReport = await this.fallback.detect(input, options);
    if (fallbackReport.availabilityState === "available") return fallbackReport;
    return unavailableFaceLandmarkReport({
      provider: this.metadata,
      state: "error",
      message: `${workerMessage} Direct browser face tracking was also unavailable.`
    });
  }
}

export function canUseWorker() {
  return typeof Worker !== "undefined" && typeof createImageBitmap === "function";
}

export function createLocalFaceLandmarkProvider() {
  return new WorkerBackedFaceLandmarkProvider();
}
