import { describe, expect, it } from "vitest";
import {
  compareCaptureSessionToLockedConfiguration,
  createCaptureConfigurationHash,
  createEmptyCaptureConfigurationDraft,
  lockCaptureConfiguration,
  PHASE0_CAPTURE_CONFIGURATION_FIELDS,
  PHASE0_REQUIRED_CAPTURE_CONFIGURATION_FIELD_IDS,
  type Phase0CaptureConfigurationSettings
} from "@/lib/phase-zero/phase-zero-capture-configuration";

const completeSettings: Phase0CaptureConfigurationSettings = {
  mode: "verified-mode-label",
  position: "verified-position-context",
  archetype: "verified-archetype-context",
  height: "verified-height-context",
  weight: "verified-weight-context",
  bodyType: "verified-body-type-context",
  skinTone: "audit-neutral-skin-tone-control",
  complexion: "audit-neutral-complexion-control",
  eyeColor: "audit-neutral-eye-color-control",
  hairColor: "audit-neutral-hair-color-control",
  facialHairColor: "audit-neutral-facial-hair-color-control",
  clothing: "audit-standard-clothing",
  equipment: "audit-standard-equipment",
  lighting: "even-front-lighting",
  background: "plain-audit-background",
  cameraDistance: "fixed-console-distance",
  cameraAngle: "straight-display-angle",
  zoom: "default-console-zoom",
  resolution: "1920x1080",
  hdr: "disabled",
  brightness: "standard-display-brightness",
  captureHardware: "approved-capture-device",
  fileFormat: "png"
};

describe("Phase 0 canonical capture configuration", () => {
  it("requires every canonical audit setting before locking", () => {
    const draft = createEmptyCaptureConfigurationDraft({
      id: "capture-config-test",
      label: "Synthetic capture config",
      nowISO: "2026-07-12T00:00:00.000Z"
    });

    const result = lockCaptureConfiguration({
      draft,
      lockedAt: "2026-07-12T00:01:00.000Z",
      lockedBy: "synthetic-operator"
    });

    expect(result.ok).toBe(false);
    expect(result.missingFields.map((field) => field.id)).toEqual(PHASE0_REQUIRED_CAPTURE_CONFIGURATION_FIELD_IDS);
  });

  it("locks a complete configuration with a deterministic stable hash", () => {
    const draft = {
      ...createEmptyCaptureConfigurationDraft({
        id: "capture-config-test",
        label: "Synthetic capture config",
        nowISO: "2026-07-12T00:00:00.000Z"
      }),
      settings: {
        ...completeSettings,
        lighting: "  even   front lighting "
      }
    };

    const result = lockCaptureConfiguration({
      draft,
      lockedAt: "2026-07-12T00:01:00.000Z",
      lockedBy: "synthetic-operator"
    });

    expect(result.ok).toBe(true);
    expect(result.lockedConfiguration?.settings.lighting).toBe("even front lighting");
    expect(result.lockedConfiguration?.settingsHash).toMatch(/^gfm-capture-v1-[0-9a-f]{8}$/);
    expect(result.lockedConfiguration?.settingsHash).toBe(createCaptureConfigurationHash(result.lockedConfiguration!.settings));
  });

  it("changes the hash when a locked setting changes", () => {
    const firstHash = createCaptureConfigurationHash(completeSettings);
    const secondHash = createCaptureConfigurationHash({
      ...completeSettings,
      fileFormat: "jpg"
    });

    expect(secondHash).not.toBe(firstHash);
  });

  it("warns when a capture session deviates from the approved configuration", () => {
    const result = lockCaptureConfiguration({
      draft: {
        ...createEmptyCaptureConfigurationDraft({
          id: "capture-config-test",
          label: "Synthetic capture config",
          nowISO: "2026-07-12T00:00:00.000Z"
        }),
        settings: completeSettings
      },
      lockedAt: "2026-07-12T00:01:00.000Z",
      lockedBy: "synthetic-operator"
    });

    const comparison = compareCaptureSessionToLockedConfiguration({
      approvedConfiguration: result.lockedConfiguration!,
      actualSettings: {
        lighting: "backlit-room",
        cameraDistance: "closer-than-approved",
        fileFormat: "heic"
      }
    });

    expect(comparison.matchesApprovedConfiguration).toBe(false);
    expect(comparison.deviations.map((deviation) => deviation.fieldID)).toEqual(["lighting", "cameraDistance", "fileFormat"]);
    expect(comparison.deviations.every((deviation) => deviation.severity === "warning")).toBe(true);
  });

  it("keeps appearance controls out of geometry similarity semantics", () => {
    const appearanceControlIDs = ["skinTone", "complexion", "eyeColor", "hairColor", "facialHairColor"];
    const appearanceControls = PHASE0_CAPTURE_CONFIGURATION_FIELDS.filter((field) => appearanceControlIDs.includes(field.id));

    expect(appearanceControls).toHaveLength(appearanceControlIDs.length);
    expect(appearanceControls.every((field) => field.affectsGeometrySimilarity === false)).toBe(true);
  });
});
