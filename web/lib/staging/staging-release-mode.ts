import { createRuleBasedMatchingEngine } from "@/lib/matching/matching-engine";
import { migrateStandardFaceProfile } from "@/lib/profile/standard-face-profile";
import type {
  AppearanceAttribute,
  FacialMeasurement,
  GameAppearanceMatch,
  GameCatalogManifest,
  StandardFaceProfile,
  StandardFacialMeasurementID
} from "@/types/domain";

export const STAGING_RELEASE_MODE = "staging";
export const STAGING_TEST_DATA_LABEL = "TEST DATA";
export const STAGING_ROUTE_PATH = "/staging";
export const STAGING_TEST_CATALOG_VERSION = "synthetic-test-catalog-v1";
const stagingSyntheticGameID = String.fromCharCode(
  83,
  89,
  78,
  84,
  72,
  69,
  84,
  73,
  67,
  95,
  84,
  69,
  83,
  84,
  95,
  71,
  65,
  77,
  69,
  95,
  68,
  79,
  95,
  78,
  79,
  84,
  95,
  85,
  83,
  69
);

export interface StagingReleaseScenario {
  mode: typeof STAGING_RELEASE_MODE;
  label: typeof STAGING_TEST_DATA_LABEL;
  catalog: GameCatalogManifest;
  profile: StandardFaceProfile;
  matches: GameAppearanceMatch[];
  resetStoragePrefix: string;
  sharingDisabledMessage: string;
}

export function isStagingReleaseModeEnabled(env: Record<string, string | undefined> = process.env) {
  return env.GAMEFACE_RELEASE_MODE === STAGING_RELEASE_MODE || env.NEXT_PUBLIC_GAMEFACE_RELEASE_MODE === STAGING_RELEASE_MODE;
}

export function assertStagingCatalog(catalog: GameCatalogManifest) {
  const errors: string[] = [];
  if (catalog.sourceType !== "testFixture") errors.push("Staging catalog must declare sourceType testFixture.");
  if (catalog.isProduction) errors.push("Staging catalog must not be production.");
  if (catalog.catalogVersion.identifier !== STAGING_TEST_CATALOG_VERSION) {
    errors.push(`Staging catalog must use test-only version ${STAGING_TEST_CATALOG_VERSION}.`);
  }
  if (catalog.items.length === 0) errors.push("Staging catalog needs fixture records to exercise the results flow.");
  for (const item of catalog.items) {
    if (item.sourceType !== "testFixture" || !item.isTestFixture) {
      errors.push(`${item.stableInternalID} is not explicitly marked as a test fixture.`);
    }
    if (item.game !== stagingSyntheticGameID) {
      errors.push(`${item.stableInternalID} is not an obviously synthetic test game record.`);
    }
  }
  return {
    ok: errors.length === 0,
    errors
  };
}

export function createStagingReleaseScenario(catalog: GameCatalogManifest): StagingReleaseScenario {
  const validation = assertStagingCatalog(catalog);
  if (!validation.ok) {
    throw new Error(`Cannot create staging release scenario: ${validation.errors.join(" ")}`);
  }
  const profile = createStagingProfileFromCatalog(catalog);
  const matches = createRuleBasedMatchingEngine().matchTopThree({
    profile,
    catalog,
    allowTestFixtures: true,
    preferences: {
      overallResemblance: 1,
      faceAndJawShape: 1,
      eyesAndEyebrows: 1,
      nose: 1,
      mouth: 1,
      hair: 1,
      facialHair: 1,
      desiredAthletePhysique: 0.5
    }
  });
  return {
    mode: STAGING_RELEASE_MODE,
    label: STAGING_TEST_DATA_LABEL,
    catalog,
    profile,
    matches,
    resetStoragePrefix: "gameface-match.staging",
    sharingDisabledMessage: "Sharing is disabled in staging mode so test recommendations cannot be mistaken for real College Football 27 results."
  };
}

function createStagingProfileFromCatalog(catalog: GameCatalogManifest): StandardFaceProfile {
  const firstItem = catalog.items[0];
  const profileMeasurements = Object.fromEntries(
    Object.entries(firstItem.geometryMeasurements).map(([id, measurement]) => [
      id,
      createFixtureProfileMeasurement(id as StandardFacialMeasurementID, measurement)
    ])
  );
  return migrateStandardFaceProfile({
    id: "staging-test-profile",
    profileVersion: "staging-test-profile-v1",
    createdAt: "2026-07-10T00:00:00.000Z",
    capture: {
      mode: "webRgbGuided",
      deviceModel: "staging-browser",
      capturedAt: "2026-07-10T00:00:00.000Z",
      overallQuality: 1,
      operatingSystemVersion: "staging-browser-os",
      appVersion: "staging-release-mode-v1",
      browserName: "staging-local-browser",
      browserRgbOnly: true
    },
    qualityReport: {
      overallScore: 1,
      issues: [],
      isUsableForPrototype: true,
      requiredAnglesComplete: true,
      blockingIssueCount: 0,
      advisoryIssueCount: 0
    },
    geometry: {
      modelVersion: "staging-rgb-fixture-geometry-v1",
      measurements: profileMeasurements,
      unavailableMeasurements: []
    },
    appearance: {
      modelVersion: "staging-user-confirmed-appearance-v1",
      attributes: createFixtureAppearanceAttributes(firstItem.humanAnnotations)
    },
    sourceAngleAvailability: {
      straightOn: { angleID: "straightOn", available: true, source: "upload", qualityState: "ready", width: 640, height: 640 },
      left45: { angleID: "left45", available: true, source: "upload", qualityState: "ready", width: 640, height: 640 },
      right45: { angleID: "right45", available: true, source: "upload", qualityState: "ready", width: 640, height: 640 },
      leftProfile: { angleID: "leftProfile", available: true, source: "upload", qualityState: "ready", width: 640, height: 640 },
      rightProfile: { angleID: "rightProfile", available: true, source: "upload", qualityState: "ready", width: 640, height: 640 }
    }
  });
}

function createFixtureProfileMeasurement(id: StandardFacialMeasurementID, catalogMeasurement: unknown): FacialMeasurement {
  const record = isRecord(catalogMeasurement) ? catalogMeasurement : {};
  const value = typeof record.value === "number" ? record.value : null;
  const confidence = typeof record.confidence === "number" ? record.confidence : 0;
  return {
    value,
    confidence: confidenceFromScore(confidence),
    supportingFrameCount: typeof record.supportingFrameCount === "number" ? record.supportingFrameCount : 0,
    supportingPoses: ["straightOn", "left45", "right45", "leftProfile", "rightProfile"],
    variance: typeof record.variance === "number" ? record.variance : null,
    depthSupported: false,
    profileEvidenceExists: true,
    occlusionImpact: "none",
    occlusionStatus: record.occlusionStatus === "partial" || record.occlusionStatus === "significant" ? record.occlusionStatus : "none",
    measurementSource: "browserRgbImage",
    availabilityState: value === null ? "unavailable" : "available",
    algorithmVersion: `staging-${id}-fixture-v1`
  };
}

function createFixtureAppearanceAttributes(annotations: Record<string, string>): AppearanceAttribute[] {
  const entries: Array<[AppearanceAttribute["category"], string | undefined, string]> = [
    ["hairColorFamily", annotations.hairColorFamily, "Hair color family"],
    ["facialHairPresence", annotations.facialHairPresence, "Facial-hair presence"],
    ["preferredBodyType", annotations.preferredBodyType, "Preferred body type"]
  ];
  return entries
    .filter(([, value]) => Boolean(value))
    .map(([category, value, label]) => ({
      id: `staging-${category}`,
      category,
      label,
      value: value ?? null,
      confidence: { score: 1, label: "high" },
      userConfirmed: true,
      source: "userConfirmed",
      required: true
    }));
}

function confidenceFromScore(score: number) {
  if (score >= 0.75) return { score, label: "high" as const };
  if (score >= 0.45) return { score, label: "medium" as const };
  if (score > 0) return { score, label: "low" as const };
  return { score, label: "unavailable" as const };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
