import type { FaceLandmarkReport } from "@/types/domain";
import { MediaPipeFaceLandmarkerProvider } from "./mediapipe-face-landmarker-provider";
import type { FaceLandmarkProviderOptions } from "./face-landmark-provider";

type WorkerRequest =
  | {
      id: string;
      type: "detect";
      image: ImageBitmap;
      width: number;
      height: number;
      options?: FaceLandmarkProviderOptions;
    }
  | {
      id: string;
      type: "dispose";
    };

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

const provider = new MediaPipeFaceLandmarkerProvider();

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type === "dispose") {
    void provider.dispose().then(() => {
      post({ id: request.id, type: "disposed" });
    });
    return;
  }
  void provider
    .detect({
      image: request.image,
      width: request.width,
      height: request.height
    }, request.options)
    .then((report) => {
      request.image.close();
      post({ id: request.id, type: "result", report });
    })
    .catch((error: unknown) => {
      request.image.close();
      post({
        id: request.id,
        type: "error",
        message: error instanceof Error ? error.message : "Face landmark worker failed."
      });
    });
};

function post(message: WorkerResponse) {
  self.postMessage(message);
}
