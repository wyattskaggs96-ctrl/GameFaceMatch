import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createInitialCaptureSession, setAngleCapture } from "@/lib/capture/capture-session";
import { createImageQualityReport } from "@/lib/capture/image-quality-service";
import { createTemporaryImageReference } from "@/lib/capture/image-validation";
import { createMemoryPrivacyStore } from "@/lib/privacy/local-privacy-store";
import {
  containsSensitiveTraitField,
  createAppearanceAttributes,
  createInitialAttributeConfirmation,
  validateAttributeConfirmation,
  type AttributeConfirmationState
} from "@/lib/profile/attribute-confirmation";
import {
  createStandardFaceProfile,
  deserializeProfile,
  markStandardFaceProfileDeleted,
  serializeProfile,
  standardFaceProfileContractVersion,
  standardFaceProfileVersion,
  unavailableWebMeasurementIDs,
  validateStandardFaceProfile
} from "@/lib/profile/standard-face-profile";
import type { ActiveCaptureSession } from "@/lib/capture/capture-session";
import type { CapturedAngleID, TemporaryImageReference } from "@/types/domain";

describe("attribute confirmation", () => {
  it("validates required and optional fields separately", () => {
    const initial = createInitialAttributeConfirmation();
    const invalid = validateAttributeConfirmation(initial);
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.skinPresentation).toBe("Required for the standardized profile.");
    expect(invalid.errors.visibleMarks).toBeUndefined();

    const valid = validateAttributeConfirmation(validAttributes());
    expect(valid.isValid).toBe(true);
    expect(valid.errors).toEqual({});
  });

  it("requires facial-hair style and color only when facial hair is present", () => {
    const withoutFacialHair = {
      ...validAttributes(),
      facialHairPresence: "none" as const,
      facialHairStyleFamily: "unspecified",
      facialHairColorFamily: "unspecified"
    };
    expect(validateAttributeConfirmation(withoutFacialHair).isValid).toBe(true);

    const withMissingDetails = {
      ...validAttributes(),
      facialHairPresence: "yes" as const,
      facialHairStyleFamily: "unspecified",
      facialHairColorFamily: "unspecified"
    };
    expect(validateAttributeConfirmation(withMissingDetails).errors.facialHairStyleFamily).toBeDefined();
    expect(validateAttributeConfirmation(withMissingDetails).errors.facialHairColorFamily).toBeDefined();
  });

  it("creates only user-confirmed appearance fields", () => {
    const attributes = createAppearanceAttributes(validAttributes());
    expect(attributes.every((attribute) => attribute.userConfirmed)).toBe(true);
    expect(attributes.every((attribute) => attribute.source === "userConfirmed")).toBe(true);
    expect(attributes.find((attribute) => attribute.category === "skinPresentation")?.value).toBe("medium");
    expect(attributes.find((attribute) => attribute.category === "desiredInGameHeight")?.value).toBe(72);
  });

  it("keeps skin presentation distinct from geometry inputs", () => {
    const attributes = createAppearanceAttributes(validAttributes());
    const skinPresentation = attributes.find((attribute) => attribute.category === "skinPresentation");
    expect(skinPresentation).toMatchObject({
      label: "Skin presentation used by the game",
      userConfirmed: true,
      source: "userConfirmed",
      required: true
    });
    expect(unavailableWebMeasurementIDs).not.toContain("skinPresentation");
  });

  it("does not define sensitive-trait fields", () => {
    const attributes = createAppearanceAttributes(validAttributes());
    expect(containsSensitiveTraitField(attributes.map((attribute) => attribute.category))).toBe(false);
    expect(containsSensitiveTraitField(Object.keys(createInitialAttributeConfirmation()))).toBe(false);
  });
});

describe("standard face profile foundation", () => {
  it("creates a versioned contract with separated metadata, confidence, support, attributes, models, and deletion state", () => {
    const profile = createStandardFaceProfile({
      session: completeSession(),
      attributes: validAttributes(),
      now: new Date("2026-07-10T00:00:00.000Z"),
      userAgent: "unit-test-browser"
    });

    expect(profile.profileContractVersion).toBe(standardFaceProfileContractVersion);
    expect(profile.profileVersion).toBe(standardFaceProfileVersion);
    expect(profile.capture.browserRgbOnly).toBe(true);
    expect(profile.geometry.modelVersion).toBe(profile.modelVersions.geometry);
    expect(profile.appearance.modelVersion).toBe(profile.modelVersions.appearance);
    expect(profile.confidence).toHaveProperty("overall");
    expect(profile.supportingFrames.requiredAngleCount).toBe(5);
    expect(profile.supportingFrames.depthFrameCount).toBe(0);
    expect(profile.userConfirmedAttributes).toHaveLength(profile.appearance.attributes.length);
    expect(profile.deletionState.status).toBe("active");
  });

  it("serializes a profile without raw image references", () => {
    const profile = createStandardFaceProfile({
      session: completeSession(),
      attributes: validAttributes(),
      now: new Date("2026-07-10T00:00:00.000Z"),
      userAgent: "unit-test-browser"
    });

    const serialized = serializeProfile(profile);
    const deserialized = deserializeProfile(serialized);
    expect(deserialized.profileVersion).toBe(profile.profileVersion);
    expect(validateStandardFaceProfile(deserialized).ok).toBe(true);
    expect(serialized).not.toContain("blob:");
    expect(serialized).not.toContain(".jpg");
  });

  it("marks browser geometry measurements unavailable instead of inventing values", () => {
    const profile = createStandardFaceProfile({
      session: completeSession(),
      attributes: validAttributes(),
      now: new Date("2026-07-10T00:00:00.000Z")
    });

    expect(profile.geometry.unavailableMeasurements).toEqual(unavailableWebMeasurementIDs);
    for (const measurementID of unavailableWebMeasurementIDs) {
      const measurement = profile.geometry.measurements[measurementID];
      expect(measurement?.availabilityState).toBe("unavailable");
      expect(measurement?.value).toBeNull();
      expect(measurement?.supportingFrameCount).toBe(0);
      expect(measurement?.measurementSource).toBe("notMeasured");
    }
  });

  it("keeps depth-supported false for browser RGB capture", () => {
    const profile = createStandardFaceProfile({
      session: completeSession(),
      attributes: validAttributes(),
      now: new Date("2026-07-10T00:00:00.000Z")
    });

    expect(profile.capture.browserRgbOnly).toBe(true);
    for (const measurement of Object.values(profile.geometry.measurements)) {
      expect(measurement?.depthSupported).toBe(false);
    }
  });

  it("records source-angle availability without storing image bytes", () => {
    const profile = createStandardFaceProfile({
      session: completeSession(),
      attributes: validAttributes(),
      now: new Date("2026-07-10T00:00:00.000Z")
    });

    expect(profile.sourceAngleAvailability.straightOn.available).toBe(true);
    expect(profile.sourceAngleAvailability.straightOn.width).toBe(900);
    expect("objectUrl" in profile.sourceAngleAvailability.straightOn).toBe(false);
  });

  it("rejects unnormalized measurements and accidental web depth support", () => {
    const profile = createStandardFaceProfile({
      session: completeSession(),
      attributes: validAttributes(),
      now: new Date("2026-07-10T00:00:00.000Z")
    });
    profile.geometry.measurements.faceWidthRatio = {
      ...profile.geometry.measurements.faceWidthRatio!,
      value: 1.5,
      depthSupported: true,
      availabilityState: "available",
      supportingFrameCount: 1
    };
    const report = validateStandardFaceProfile(profile);
    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining(["measurementNotNormalized", "webMeasurementDepthUnsupported"]));
  });

  it("migrates legacy web MVP profile fixtures into the current contract", () => {
    const legacy = fs.readFileSync(
      path.join(process.cwd(), "..", "data", "fixtures", "test-only", "standard-face-profile", "legacy-web-mvp-profile-v1.json"),
      "utf8"
    );
    const migrated = deserializeProfile(legacy);
    expect(migrated.id).toBe("legacy-web-mvp-profile-test-only");
    expect(migrated.profileContractVersion).toBe(standardFaceProfileContractVersion);
    expect(migrated.profileVersion).toBe(standardFaceProfileVersion);
    expect(migrated.supportingFrames.totalFrameCount).toBe(0);
    expect(migrated.modelVersions.profileContract).toBe(standardFaceProfileContractVersion);
    expect(validateStandardFaceProfile(migrated).ok).toBe(true);
  });

  it("records deletion state without retaining raw media", () => {
    const profile = createStandardFaceProfile({
      session: completeSession(),
      attributes: validAttributes(),
      now: new Date("2026-07-10T00:00:00.000Z")
    });
    const deleted = markStandardFaceProfileDeleted(profile, {
      deletedAt: new Date("2026-07-11T00:00:00.000Z"),
      deletionRecordID: "deletion-record-test-only",
      reason: "unit test deletion"
    });
    expect(deleted.deletionState).toEqual({
      status: "deleted",
      deletedAt: "2026-07-11T00:00:00.000Z",
      deletionRecordID: "deletion-record-test-only",
      reason: "unit test deletion"
    });
    expect(serializeProfile(deleted)).not.toContain("blob:");
  });

  it("deletes derived profile state through local all-data deletion", () => {
    const store = createMemoryPrivacyStore();
    store.saveDerivedProfile(
      createStandardFaceProfile({
        session: completeSession(),
        attributes: validAttributes(),
        now: new Date("2026-07-10T00:00:00.000Z")
      })
    );
    expect(store.getDerivedProfiles()).toHaveLength(1);
    store.deleteAllLocalData();
    expect(store.getDerivedProfiles()).toEqual([]);
  });
});

function validAttributes(): AttributeConfirmationState {
  return {
    hairColorFamily: "brown",
    hairTextureFamily: "wavy",
    hairstyleFamily: "short",
    facialHairPresence: "yes",
    facialHairStyleFamily: "beard",
    facialHairColorFamily: "brown",
    eyebrowThickness: "medium",
    skinPresentation: "medium",
    visibleMarks: "small cheek mark",
    desiredInGameHeight: "72",
    desiredInGameWeight: "205",
    preferredBodyType: "balanced",
    resemblancePhysiquePreference: "balanced"
  };
}

function completeSession(): ActiveCaptureSession {
  let session = createInitialCaptureSession(new Date("2026-07-10T00:00:00.000Z"));
  for (const angle of session.angles) {
    const imageRef = image(angle.id);
    const qualityReport = createImageQualityReport({
      decodedSuccessfully: true,
      image: imageRef,
      pixelSample: pixelSample(2, 2, [128, 128, 128, 255]),
      existingAngles: session.angles.filter((candidate) => candidate.id !== angle.id),
      associatedAngleID: angle.id,
      manualConfirmation: {
        requestedAngle: true,
        neutralExpression: true,
        onePerson: true
      }
    });
    session = setAngleCapture(session, angle.id, imageRef, "upload", qualityReport).session;
  }
  return session;
}

function image(angleID: CapturedAngleID): TemporaryImageReference {
  return createTemporaryImageReference(
    {
      objectUrl: `blob:${angleID}`,
      fileName: `${angleID}.jpg`,
      fileType: "image/jpeg",
      fileSizeBytes: 1_000_000,
      width: 900,
      height: 1200,
      source: "upload",
      associatedAngleID: angleID,
      signature: angleID
    },
    angleID
  );
}

function pixelSample(width: number, height: number, rgba: [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = rgba[0];
    data[index + 1] = rgba[1];
    data[index + 2] = rgba[2];
    data[index + 3] = rgba[3];
  }
  return { width, height, rgba: data };
}
