import type { AppearanceAttribute, UserConfirmedAttributeCategory, UserConfirmedAttributeValue } from "@/types/domain";

export interface AttributeConfirmationState {
  hairColorFamily: string;
  hairTextureFamily: string;
  hairstyleFamily: string;
  facialHairPresence: "unspecified" | "none" | "yes";
  facialHairStyleFamily: string;
  facialHairColorFamily: string;
  eyebrowThickness: string;
  visibleMarks: string;
  desiredInGameHeight: string;
  desiredInGameWeight: string;
  preferredBodyType: string;
  resemblancePhysiquePreference: "unspecified" | "facialResemblance" | "balanced" | "athletePhysique";
}

export interface AttributeValidationResult {
  isValid: boolean;
  errors: Partial<Record<keyof AttributeConfirmationState, string>>;
}

export const attributeLabels: Record<keyof AttributeConfirmationState, string> = {
  hairColorFamily: "Hair color family",
  hairTextureFamily: "Hair texture family",
  hairstyleFamily: "Hairstyle family",
  facialHairPresence: "Facial-hair presence",
  facialHairStyleFamily: "Facial-hair style family",
  facialHairColorFamily: "Facial-hair color family",
  eyebrowThickness: "Eyebrow thickness",
  visibleMarks: "Freckles or visible marks",
  desiredInGameHeight: "Desired in-game height",
  desiredInGameWeight: "Desired in-game weight",
  preferredBodyType: "Preferred body type",
  resemblancePhysiquePreference: "Facial resemblance versus athlete physique"
};

export const requiredAttributeKeys = [
  "hairColorFamily",
  "hairTextureFamily",
  "hairstyleFamily",
  "facialHairPresence",
  "eyebrowThickness",
  "desiredInGameHeight",
  "desiredInGameWeight",
  "preferredBodyType",
  "resemblancePhysiquePreference"
] as const satisfies ReadonlyArray<keyof AttributeConfirmationState>;

export const sensitiveTraitCategories = [
  "ethnicity",
  "health",
  "personality",
  "intelligence",
  "attractiveness",
  "age"
] as const;

export function createInitialAttributeConfirmation(): AttributeConfirmationState {
  return {
    hairColorFamily: "unspecified",
    hairTextureFamily: "unspecified",
    hairstyleFamily: "unspecified",
    facialHairPresence: "unspecified",
    facialHairStyleFamily: "unspecified",
    facialHairColorFamily: "unspecified",
    eyebrowThickness: "unspecified",
    visibleMarks: "",
    desiredInGameHeight: "",
    desiredInGameWeight: "",
    preferredBodyType: "unspecified",
    resemblancePhysiquePreference: "unspecified"
  };
}

export function validateAttributeConfirmation(state: AttributeConfirmationState): AttributeValidationResult {
  const errors: AttributeValidationResult["errors"] = {};
  for (const key of requiredAttributeKeys) {
    if (isBlankOrUnspecified(state[key])) {
      errors[key] = "Required for the standardized profile.";
    }
  }

  if (state.facialHairPresence === "yes" && isBlankOrUnspecified(state.facialHairStyleFamily)) {
    errors.facialHairStyleFamily = "Choose a general style family or choose no facial hair.";
  }
  if (state.facialHairPresence === "yes" && isBlankOrUnspecified(state.facialHairColorFamily)) {
    errors.facialHairColorFamily = "Choose a general color family or choose no facial hair.";
  }
  if (parseMeasurementNumber(state.desiredInGameHeight) === null) {
    errors.desiredInGameHeight = "Enter a height number for the future game-profile adapter.";
  }
  if (parseMeasurementNumber(state.desiredInGameWeight) === null) {
    errors.desiredInGameWeight = "Enter a weight number for the future game-profile adapter.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function createAppearanceAttributes(state: AttributeConfirmationState): AppearanceAttribute[] {
  return [
    attribute("hairColorFamily", "Hair color family", state.hairColorFamily, true),
    attribute("hairTextureFamily", "Hair texture family", state.hairTextureFamily, true),
    attribute("hairstyleFamily", "Hairstyle family", state.hairstyleFamily, true),
    attribute("facialHairPresence", "Facial-hair presence", state.facialHairPresence, true),
    attribute("facialHairStyleFamily", "Facial-hair style family", state.facialHairPresence === "yes" ? state.facialHairStyleFamily : "none", false),
    attribute("facialHairColorFamily", "Facial-hair color family", state.facialHairPresence === "yes" ? state.facialHairColorFamily : "none", false),
    attribute("eyebrowThickness", "Eyebrow thickness", state.eyebrowThickness, true),
    attribute("visibleMarks", "Freckles or visible marks", state.visibleMarks.trim() === "" ? null : state.visibleMarks.trim(), false),
    attribute("desiredInGameHeight", "Desired in-game height", parseMeasurementNumber(state.desiredInGameHeight), true),
    attribute("desiredInGameWeight", "Desired in-game weight", parseMeasurementNumber(state.desiredInGameWeight), true),
    attribute("preferredBodyType", "Preferred body type", state.preferredBodyType, true),
    attribute("resemblancePhysiquePreference", "Facial resemblance versus athlete physique", state.resemblancePhysiquePreference, true)
  ];
}

export function containsSensitiveTraitField(fields: string[]) {
  const normalizedFields = fields.map((field) => field.toLowerCase());
  return sensitiveTraitCategories.some((category) => normalizedFields.includes(category));
}

function attribute(
  category: UserConfirmedAttributeCategory,
  label: string,
  value: UserConfirmedAttributeValue,
  required: boolean
): AppearanceAttribute {
  return {
    id: category,
    category,
    label,
    value,
    required,
    userConfirmed: true,
    source: "userConfirmed",
    confidence: {
      score: 1,
      label: "high"
    }
  };
}

function isBlankOrUnspecified(value: string) {
  return value.trim() === "" || value === "unspecified";
}

function parseMeasurementNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
