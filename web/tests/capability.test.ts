import { describe, expect, it, vi } from "vitest";
import { createBrowserCameraService } from "@/lib/capture/browser-camera-service";

describe("browser capability states", () => {
  it("reports insecure browser contexts", async () => {
    const service = createBrowserCameraService({
      isSecureContext: false,
      navigator: {} as Navigator
    });
    await expect(service.getCapabilityStatus()).resolves.toBe("insecureContext");
  });

  it("reports unsupported camera APIs", async () => {
    const service = createBrowserCameraService({
      isSecureContext: true,
      navigator: {} as Navigator
    });
    await expect(service.getCapabilityStatus()).resolves.toBe("cameraApiUnsupported");
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
});
