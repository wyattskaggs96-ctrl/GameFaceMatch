import { describe, expect, it, vi } from "vitest";
import { createBrowserCameraService } from "@/lib/capture/browser-camera-service";

describe("browser capability states", () => {
  it("reports insecure browser contexts", async () => {
    const service = createBrowserCameraService({
      isSecureContext: false,
      navigator: {} as Navigator
    });
    await expect(service.getCapabilityStatus()).resolves.toBe("insecureContext");
    await expect(service.getCapabilityReport()).resolves.toMatchObject({
      fallback: "fileUploadFallbackAvailable",
      messages: expect.arrayContaining(["Camera preview requires HTTPS or localhost.", "File-upload fallback available."])
    });
  });

  it("reports unsupported camera APIs", async () => {
    const service = createBrowserCameraService({
      isSecureContext: true,
      navigator: {} as Navigator
    });
    await expect(service.getCapabilityStatus()).resolves.toBe("cameraApiUnsupported");
    await expect(service.getCapabilityReport()).resolves.toMatchObject({
      fallback: "fileUploadFallbackAvailable",
      messages: expect.arrayContaining(["This browser does not expose camera APIs.", "File-upload fallback available."])
    });
  });

  it("reports no camera available", async () => {
    const service = createBrowserCameraService({
      isSecureContext: true,
      navigator: {
        mediaDevices: {
          getUserMedia: vi.fn(),
          enumerateDevices: vi.fn().mockResolvedValue([{ kind: "audioinput" }])
        }
      } as unknown as Navigator
    });
    await expect(service.getCapabilityStatus()).resolves.toBe("cameraUnavailable");
    await expect(service.getCapabilityReport()).resolves.toMatchObject({
      fallback: "fileUploadFallbackAvailable",
      messages: expect.arrayContaining(["No camera device was found.", "File-upload fallback available."])
    });
  });

  it("reports permission required when a camera exists", async () => {
    const service = createBrowserCameraService({
      isSecureContext: true,
      navigator: {
        mediaDevices: {
          getUserMedia: vi.fn(),
          enumerateDevices: vi.fn().mockResolvedValue([{ kind: "videoinput" }])
        }
      } as unknown as Navigator
    });
    await expect(service.getCapabilityStatus()).resolves.toBe("permissionNotRequested");
  });

  it("reports permission denied", async () => {
    const service = createBrowserCameraService({
      isSecureContext: true,
      navigator: {
        permissions: {
          query: vi.fn().mockResolvedValue({ state: "denied" })
        },
        mediaDevices: {
          getUserMedia: vi.fn(),
          enumerateDevices: vi.fn().mockResolvedValue([{ kind: "videoinput", label: "Front Camera" }])
        }
      } as unknown as Navigator
    });
    await expect(service.getCapabilityStatus()).resolves.toBe("permissionDenied");
  });

  it("lists front and rear cameras without requiring a real device", async () => {
    const service = createBrowserCameraService({
      isSecureContext: true,
      navigator: {
        mediaDevices: {
          getUserMedia: vi.fn(),
          enumerateDevices: vi.fn().mockResolvedValue([
            { kind: "videoinput", label: "Front Camera", deviceId: "front" },
            { kind: "videoinput", label: "Back Camera", deviceId: "back" }
          ])
        }
      } as unknown as Navigator
    });
    await expect(service.getCameraDevices()).resolves.toEqual([
      { deviceId: "front", label: "Front Camera", facingMode: "user", isFrontFacing: true, isRearFacing: false },
      { deviceId: "back", label: "Back Camera", facingMode: "environment", isFrontFacing: false, isRearFacing: true }
    ]);
  });

  it("requests an exact camera device when a device ID is selected", async () => {
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [] });
    const service = createBrowserCameraService({
      isSecureContext: true,
      navigator: {
        mediaDevices: {
          getUserMedia,
          enumerateDevices: vi.fn().mockResolvedValue([])
        }
      } as unknown as Navigator
    });
    await service.requestCameraPreview({ deviceId: "front-camera" });
    expect(getUserMedia).toHaveBeenCalledWith({
      video: {
        deviceId: { exact: "front-camera" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
  });
});
