import type { CaptureCapabilityStatus } from "@/types/domain";

export interface BrowserCapabilityReport {
  secureContext: CaptureCapabilityStatus;
  cameraApi: CaptureCapabilityStatus;
  permission: CaptureCapabilityStatus;
  device: CaptureCapabilityStatus;
  fallback: "fileUploadFallbackAvailable";
  summary: CaptureCapabilityStatus;
  messages: string[];
}

export interface BrowserCameraService {
  getCapabilityReport(): Promise<BrowserCapabilityReport>;
  getCapabilityStatus(): Promise<CaptureCapabilityStatus>;
  requestCameraPreview(): Promise<MediaStream>;
  stopCameraPreview(stream: MediaStream): void;
}

export class CameraAccessError extends Error {
  constructor(
    public readonly code:
      | "permissionDenied"
      | "permissionBlocked"
      | "cameraUnavailable"
      | "noMatchingCameraDevice"
      | "cameraApiUnsupported"
      | "unknownError",
    message: string
  ) {
    super(message);
    this.name = "CameraAccessError";
  }
}

type BrowserGlobal = Pick<typeof globalThis, "navigator" | "isSecureContext">;

export function createBrowserCameraService(globalObject: BrowserGlobal = globalThis): BrowserCameraService {
  return {
    async getCapabilityReport() {
      const secureContext: CaptureCapabilityStatus = globalObject.isSecureContext ? "secureContextAvailable" : "insecureContext";
      const mediaDevices = globalObject.navigator?.mediaDevices;
      const cameraApi: CaptureCapabilityStatus = mediaDevices ? "cameraApiSupported" : "cameraApiUnsupported";
      const permission = await getCameraPermissionStatus(globalObject.navigator);
      const device = await getCameraDeviceStatus(mediaDevices);
      const summary = summarizeCapability({ secureContext, cameraApi, permission, device });
      return {
        secureContext,
        cameraApi,
        permission,
        device,
        fallback: "fileUploadFallbackAvailable",
        summary,
        messages: createCapabilityMessages({ secureContext, cameraApi, permission, device, summary })
      };
    },
    async getCapabilityStatus() {
      const report = await this.getCapabilityReport();
      return report.summary;
    },
    async requestCameraPreview() {
      const mediaDevices = globalObject.navigator?.mediaDevices;
      if (!globalObject.isSecureContext) {
        throw new CameraAccessError("permissionBlocked", "Camera APIs require HTTPS or localhost.");
      }
      if (!mediaDevices?.getUserMedia) {
        throw new CameraAccessError("cameraApiUnsupported", "Camera APIs are not supported in this browser.");
      }
      try {
        return await mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "user" },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (error) {
        throw mapCameraError(error);
      }
    },
    stopCameraPreview(stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };
}

async function getCameraPermissionStatus(navigatorObject: Navigator | undefined): Promise<CaptureCapabilityStatus> {
  const permissions = navigatorObject?.permissions;
  if (!permissions?.query) {
    return "permissionNotRequested";
  }
  try {
    const status = await permissions.query({ name: "camera" as PermissionName });
    if (status.state === "granted") return "permissionGranted";
    if (status.state === "denied") return "permissionDenied";
    return "permissionNotRequested";
  } catch {
    return "permissionNotRequested";
  }
}

async function getCameraDeviceStatus(mediaDevices: MediaDevices | undefined): Promise<CaptureCapabilityStatus> {
  if (!mediaDevices) return "cameraApiUnsupported";
  if (!mediaDevices.enumerateDevices) return "cameraUnavailable";
  try {
    const devices = await mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((device) => device.kind === "videoinput");
    if (videoInputs.length === 0) return "cameraUnavailable";
    const hasFrontFacingHint = videoInputs.some((device) => /front|user|face/i.test(device.label));
    return hasFrontFacingHint || videoInputs.some((device) => !device.label) ? "permissionNotRequested" : "noMatchingCameraDevice";
  } catch {
    return "unknownError";
  }
}

function summarizeCapability({
  secureContext,
  cameraApi,
  permission,
  device
}: {
  secureContext: CaptureCapabilityStatus;
  cameraApi: CaptureCapabilityStatus;
  permission: CaptureCapabilityStatus;
  device: CaptureCapabilityStatus;
}) {
  if (secureContext === "insecureContext") return "insecureContext";
  if (cameraApi === "cameraApiUnsupported") return "cameraApiUnsupported";
  if (permission === "permissionDenied") return "permissionDenied";
  if (permission === "permissionBlocked") return "permissionBlocked";
  if (device === "cameraUnavailable") return "cameraUnavailable";
  if (device === "noMatchingCameraDevice") return "noMatchingCameraDevice";
  if (permission === "permissionGranted") return "permissionGranted";
  return "permissionNotRequested";
}

function createCapabilityMessages(report: {
  secureContext: CaptureCapabilityStatus;
  cameraApi: CaptureCapabilityStatus;
  permission: CaptureCapabilityStatus;
  device: CaptureCapabilityStatus;
  summary: CaptureCapabilityStatus;
}) {
  const messages = ["File-upload fallback available."];
  if (report.secureContext === "insecureContext") messages.unshift("Camera preview requires HTTPS or localhost.");
  if (report.cameraApi === "cameraApiUnsupported") messages.unshift("This browser does not expose camera APIs.");
  if (report.permission === "permissionDenied") messages.unshift("Camera permission is denied.");
  if (report.permission === "permissionGranted") messages.unshift("Camera permission is granted.");
  if (report.device === "cameraUnavailable") messages.unshift("No camera device was found.");
  if (report.device === "noMatchingCameraDevice") messages.unshift("A front-facing camera could not be confirmed.");
  if (messages.length === 1 && report.summary === "permissionNotRequested") messages.unshift("Camera permission has not been requested yet.");
  return messages;
}

function mapCameraError(error: unknown) {
  const name = error instanceof DOMException || error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return new CameraAccessError("permissionDenied", "Camera permission denied. You can use file upload instead.");
  }
  if (name === "SecurityError") {
    return new CameraAccessError("permissionBlocked", "Camera access is blocked by browser or context settings.");
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return new CameraAccessError("cameraUnavailable", "No camera device is available.");
  }
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return new CameraAccessError("noMatchingCameraDevice", "No matching front-facing camera device is available.");
  }
  return new CameraAccessError("unknownError", "Camera could not be started.");
}
