import { describe, expect, it } from "vitest";
import { createInitialCaptureSession, setAngleCapture } from "@/lib/capture/capture-session";
import { createTemporaryImageReference } from "@/lib/capture/image-validation";
import {
  createCaptureRecoverySnapshot,
  createCaptureRecoveryStore,
  createChecksumRecoveryPlan,
  createOfflineRecoveryStatus,
  createUnsavedChangeMessage,
  hasRecoverableCaptureProgress
} from "@/lib/recovery/offline-recovery";

const now = "2026-07-13T00:00:00.000Z";

describe("offline and recovery behavior", () => {
  it("creates metadata-only capture snapshots without object URLs or raw image bytes", () => {
    const session = createInitialCaptureSession(new Date(now));
    const mutation = setAngleCapture(
      session,
      "straightOn",
      createTemporaryImageReference({
        associatedAngleID: "straightOn",
        fileName: "synthetic-front.png",
        fileType: "image/png",
        fileSizeBytes: 2048,
        width: 800,
        height: 800,
        objectUrl: "blob:should-not-be-persisted",
        source: "upload"
      }, "synthetic-signature"),
      "upload"
    );

    const snapshot = createCaptureRecoverySnapshot(mutation.session, now);
    const serialized = JSON.stringify(snapshot);

    expect(snapshot.productionReady).toBe(false);
    expect(snapshot.rawImageBytesStored).toBe(false);
    expect(snapshot.objectUrlsStored).toBe(false);
    expect(snapshot.completedAngleCount).toBe(1);
    expect(serialized).toContain("synthetic-front.png");
    expect(serialized).not.toContain("blob:should-not-be-persisted");
    expect(hasRecoverableCaptureProgress(snapshot)).toBe(true);
  });

  it("stores and clears capture recovery metadata in session-like storage", () => {
    const storage = fakeStorage();
    const store = createCaptureRecoveryStore(storage);
    const snapshot = createCaptureRecoverySnapshot(createInitialCaptureSession(new Date(now)), now);

    store.save(snapshot);
    expect(store.load()?.schemaVersion).toBe(snapshot.schemaVersion);
    store.clear();
    expect(store.load()).toBeNull();
  });

  it("reports no-network capture and unavailable external resources honestly", () => {
    const status = createOfflineRecoveryStatus({
      browserOnline: false,
      externalResources: {
        "Production catalog runtime": "unavailable"
      },
      checkedAt: now
    });

    expect(status.noNetworkCaptureSupported).toBe(true);
    expect(status.messages.map((message) => message.message).join(" ")).toContain("Browser is offline");
    expect(status.messages.map((message) => message.message).join(" ")).toContain("Production catalog runtime is unavailable");
  });

  it("creates unsaved-change and checksum recovery guidance without allowing publication", () => {
    const message = createUnsavedChangeMessage({ hasUnsavedChanges: true, workLabel: "Catalog-manager review" });
    const checksum = createChecksumRecoveryPlan({
      path: "data/audit/college-football-27/evidence/masters/missing.png",
      errorMessage: "EACCES",
      failedAt: now
    });

    expect(message).toMatch(/local draft changes/);
    expect(checksum.retryAllowed).toBe(true);
    expect(checksum.recommendedActions.join(" ")).toMatch(/Do not publish/);
  });
});

function fakeStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    }
  };
}
