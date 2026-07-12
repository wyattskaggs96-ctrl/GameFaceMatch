export const PHASE0_CAPTURE_CONFIGURATION_SCHEMA_VERSION = "phase0-capture-configuration-v1";

export type Phase0CaptureConfigurationFieldID =
  | "mode"
  | "position"
  | "archetype"
  | "height"
  | "weight"
  | "bodyType"
  | "skinTone"
  | "complexion"
  | "eyeColor"
  | "hairColor"
  | "facialHairColor"
  | "clothing"
  | "equipment"
  | "lighting"
  | "background"
  | "cameraDistance"
  | "cameraAngle"
  | "zoom"
  | "resolution"
  | "hdr"
  | "brightness"
  | "captureHardware"
  | "fileFormat";

export type Phase0CaptureConfigurationLockState = "draft" | "locked";

export interface Phase0CaptureConfigurationFieldDefinition {
  id: Phase0CaptureConfigurationFieldID;
  label: string;
  group: "playerContext" | "appearanceControls" | "sceneControls" | "cameraControls" | "fileControls";
  required: true;
  affectsGeometrySimilarity: boolean;
}

export type Phase0CaptureConfigurationSettings = Record<Phase0CaptureConfigurationFieldID, string>;

export interface Phase0CaptureConfigurationDraft {
  schemaVersion: typeof PHASE0_CAPTURE_CONFIGURATION_SCHEMA_VERSION;
  id: string;
  label: string;
  settings: Phase0CaptureConfigurationSettings;
  notes: string;
  updatedAt: string;
}

export interface Phase0LockedCaptureConfiguration extends Phase0CaptureConfigurationDraft {
  lockState: "locked";
  lockedAt: string;
  lockedBy: string;
  settingsHash: string;
}

export interface Phase0CaptureConfigurationLockResult {
  ok: boolean;
  lockedConfiguration?: Phase0LockedCaptureConfiguration;
  missingFields: Phase0CaptureConfigurationFieldDefinition[];
}

export interface Phase0CaptureConfigurationDeviation {
  fieldID: Phase0CaptureConfigurationFieldID;
  label: string;
  expectedValue: string;
  actualValue: string;
  severity: "warning" | "blocking";
  message: string;
}

export interface Phase0CaptureConfigurationComparison {
  approvedSettingsHash: string;
  actualSettingsHash: string;
  matchesApprovedConfiguration: boolean;
  deviations: Phase0CaptureConfigurationDeviation[];
}

export const PHASE0_CAPTURE_CONFIGURATION_FIELDS: Phase0CaptureConfigurationFieldDefinition[] = [
  field("mode", "Mode", "playerContext", true),
  field("position", "Position", "playerContext", true),
  field("archetype", "Archetype", "playerContext", true),
  field("height", "Height", "playerContext", true),
  field("weight", "Weight", "playerContext", true),
  field("bodyType", "Body type", "playerContext", true),
  field("skinTone", "Skin tone", "appearanceControls", false),
  field("complexion", "Complexion", "appearanceControls", false),
  field("eyeColor", "Eye color", "appearanceControls", false),
  field("hairColor", "Hair color", "appearanceControls", false),
  field("facialHairColor", "Facial-hair color", "appearanceControls", false),
  field("clothing", "Clothing", "sceneControls", false),
  field("equipment", "Equipment", "sceneControls", false),
  field("lighting", "Lighting", "sceneControls", false),
  field("background", "Background", "sceneControls", false),
  field("cameraDistance", "Camera distance", "cameraControls", true),
  field("cameraAngle", "Camera angle", "cameraControls", true),
  field("zoom", "Zoom", "cameraControls", true),
  field("resolution", "Resolution", "cameraControls", true),
  field("hdr", "HDR", "cameraControls", true),
  field("brightness", "Brightness", "cameraControls", true),
  field("captureHardware", "Capture hardware", "cameraControls", true),
  field("fileFormat", "File format", "fileControls", true)
];

export const PHASE0_REQUIRED_CAPTURE_CONFIGURATION_FIELD_IDS = PHASE0_CAPTURE_CONFIGURATION_FIELDS.map((fieldDefinition) => fieldDefinition.id);

export function createEmptyCaptureConfigurationDraft({
  id,
  label,
  nowISO
}: {
  id: string;
  label: string;
  nowISO: string;
}): Phase0CaptureConfigurationDraft {
  return {
    schemaVersion: PHASE0_CAPTURE_CONFIGURATION_SCHEMA_VERSION,
    id,
    label,
    settings: emptySettings(),
    notes: "",
    updatedAt: nowISO
  };
}

export function findMissingCaptureConfigurationFields(settings: Partial<Phase0CaptureConfigurationSettings>): Phase0CaptureConfigurationFieldDefinition[] {
  return PHASE0_CAPTURE_CONFIGURATION_FIELDS.filter((fieldDefinition) => !normalizeSetting(settings[fieldDefinition.id]));
}

export function lockCaptureConfiguration({
  draft,
  lockedAt,
  lockedBy
}: {
  draft: Phase0CaptureConfigurationDraft;
  lockedAt: string;
  lockedBy: string;
}): Phase0CaptureConfigurationLockResult {
  const normalizedSettings = normalizeSettings(draft.settings);
  const missingFields = findMissingCaptureConfigurationFields(normalizedSettings);
  if (missingFields.length > 0) {
    return { ok: false, missingFields };
  }

  return {
    ok: true,
    missingFields: [],
    lockedConfiguration: {
      ...draft,
      settings: normalizedSettings,
      notes: draft.notes.trim(),
      updatedAt: lockedAt,
      lockState: "locked",
      lockedAt,
      lockedBy: lockedBy.trim() || "unassigned-operator",
      settingsHash: createCaptureConfigurationHash(normalizedSettings)
    }
  };
}

export function compareCaptureSessionToLockedConfiguration({
  approvedConfiguration,
  actualSettings
}: {
  approvedConfiguration: Phase0LockedCaptureConfiguration;
  actualSettings: Partial<Phase0CaptureConfigurationSettings>;
}): Phase0CaptureConfigurationComparison {
  const normalizedActual = normalizeSettings({ ...approvedConfiguration.settings, ...actualSettings });
  const deviations = PHASE0_CAPTURE_CONFIGURATION_FIELDS.flatMap((fieldDefinition) => {
    const expectedValue = approvedConfiguration.settings[fieldDefinition.id];
    const actualValue = normalizedActual[fieldDefinition.id];
    if (expectedValue === actualValue) return [];

    return [{
      fieldID: fieldDefinition.id,
      label: fieldDefinition.label,
      expectedValue,
      actualValue,
      severity: "warning" as const,
      message: `${fieldDefinition.label} differs from the locked canonical configuration. Recapture or document the exception before publishing.`
    }];
  });

  return {
    approvedSettingsHash: approvedConfiguration.settingsHash,
    actualSettingsHash: createCaptureConfigurationHash(normalizedActual),
    matchesApprovedConfiguration: deviations.length === 0,
    deviations
  };
}

export function createCaptureConfigurationHash(settings: Phase0CaptureConfigurationSettings): string {
  const canonical = canonicalizeCaptureConfigurationSettings(settings);
  return `gfm-capture-v1-${fnv1a32(canonical)}`;
}

export function canonicalizeCaptureConfigurationSettings(settings: Phase0CaptureConfigurationSettings): string {
  const normalized = normalizeSettings(settings);
  return JSON.stringify(
    PHASE0_CAPTURE_CONFIGURATION_FIELDS.map((fieldDefinition) => [fieldDefinition.id, normalized[fieldDefinition.id]])
  );
}

export function normalizeSettings(settings: Partial<Phase0CaptureConfigurationSettings>): Phase0CaptureConfigurationSettings {
  return PHASE0_CAPTURE_CONFIGURATION_FIELDS.reduce((normalized, fieldDefinition) => {
    normalized[fieldDefinition.id] = normalizeSetting(settings[fieldDefinition.id]);
    return normalized;
  }, {} as Phase0CaptureConfigurationSettings);
}

function emptySettings(): Phase0CaptureConfigurationSettings {
  return normalizeSettings({});
}

function normalizeSetting(value: string | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function field(
  id: Phase0CaptureConfigurationFieldID,
  label: string,
  group: Phase0CaptureConfigurationFieldDefinition["group"],
  affectsGeometrySimilarity: boolean
): Phase0CaptureConfigurationFieldDefinition {
  return { id, label, group, required: true, affectsGeometrySimilarity };
}

function fnv1a32(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
