import { approveCatalogRelease, type FeatureGateInput } from "@/lib/gates/feature-gates";
import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";
import type {
  GameAppearanceMatch,
  GameCatalogManifest,
  MeasurementConfidence,
  RefinementAction,
  RefinementFeedbackRecord,
  RefinementResult,
  StandardFaceProfile
} from "@/types/domain";
import type { ScreenshotRefinementSession } from "./screenshot-refinement";

export interface ScreenshotRefinementEngine {
  readonly engineVersion: typeof SCREENSHOT_REFINEMENT_ENGINE_VERSION;
  refine(input: ScreenshotRefinementEngineInput): RefinementResult;
}

export interface ScreenshotRefinementEngineInput {
  profile: StandardFaceProfile | null;
  session: ScreenshotRefinementSession;
  currentMatch?: GameAppearanceMatch | null;
  rankedMatches?: GameAppearanceMatch[];
  catalogManifest?: GameCatalogManifest | null;
  catalogGate?: FeatureGateInput;
  allowTestFixtures?: boolean;
  runtimeEnvironment?: "development" | "test" | "production";
  userFeedback?: RefinementUserFeedbackInput;
  feedbackConsent?: RefinementFeedbackConsent;
  now?: string;
}

export interface RefinementUserFeedbackInput {
  rating: RefinementFeedbackRecord["rating"];
  notes?: string | null;
}

export interface RefinementFeedbackConsent {
  consented: boolean;
  consentVersion: string;
}

export const SCREENSHOT_REFINEMENT_ENGINE_VERSION = "screenshot-refinement-engine-v1-scaffold";

const unavailableMessage =
  "Screenshot refinement is unavailable until verified catalog data and validated comparison logic exist.";

export function createScreenshotRefinementEngine(): ScreenshotRefinementEngine {
  return {
    engineVersion: SCREENSHOT_REFINEMENT_ENGINE_VERSION,
    refine(input) {
      const catalogReadiness = evaluateRefinementCatalogReadiness(input);
      const feedbackRecord = createConsentedFeedbackRecord(input);
      if (!catalogReadiness.allowed) {
        return unavailableResult({
          reasons: catalogReadiness.reasons,
          feedbackRecord,
          catalogManifest: input.catalogManifest ?? input.catalogGate?.manifest ?? null
        });
      }

      const screenshots = input.session.slots.filter((slot) => slot.screenshot);
      if (screenshots.length === 0) {
        return {
          status: "invalidScreenshot",
          message: "Screenshot refinement needs at least one validated screenshot before it can evaluate future changes.",
          suggestedMatches: [],
          engineVersion: SCREENSHOT_REFINEMENT_ENGINE_VERSION,
          catalogVersion: catalogReadiness.manifest.catalogVersion,
          feedbackRecord,
          unavailableReasons: ["No validated screenshot was provided."]
        };
      }

      const safeMatches = getVerifiedMatches(input.rankedMatches ?? [], catalogReadiness.fixtureMode);
      if (safeMatches.length === 0) {
        return unavailableResult({
          reasons: ["No verified candidate recommendations were supplied to the refinement engine."],
          feedbackRecord,
          catalogManifest: catalogReadiness.manifest
        });
      }

      const actions = buildRefinementActions(safeMatches);
      return {
        status: safeMatches.length > 1 ? "tryAlternative" : "keepCurrent",
        message:
          catalogReadiness.fixtureMode
            ? "Synthetic fixture refinement actions were generated for tests only. They are not production recommendations."
            : "Refinement actions are available from verified catalog recommendations.",
        suggestedMatches: safeMatches.slice(0, 3),
        engineVersion: SCREENSHOT_REFINEMENT_ENGINE_VERSION,
        catalogVersion: catalogReadiness.manifest.catalogVersion,
        actions,
        feedbackRecord
      };
    }
  };
}

export function evaluateRefinementCatalogReadiness(input: ScreenshotRefinementEngineInput):
  | { allowed: true; manifest: GameCatalogManifest; fixtureMode: boolean; reasons: string[] }
  | { allowed: false; manifest: GameCatalogManifest | null; fixtureMode: false; reasons: string[] } {
  const manifest = input.catalogManifest ?? input.catalogGate?.manifest ?? null;
  if (!manifest) {
    return { allowed: false, manifest: null, fixtureMode: false, reasons: ["Catalog manifest is not loaded."] };
  }

  if (input.allowTestFixtures) {
    if (input.runtimeEnvironment === "production") {
      return {
        allowed: false,
        manifest,
        fixtureMode: false,
        reasons: ["Test fixtures cannot enable screenshot refinement in production."]
      };
    }
    if (isFixtureCatalog(manifest)) {
      return { allowed: true, manifest, fixtureMode: true, reasons: ["Test fixture catalog accepted for non-production tests."] };
    }
    return {
      allowed: false,
      manifest,
      fixtureMode: false,
      reasons: ["Fixture mode requires a test-only catalog manifest and test-only catalog items."]
    };
  }

  const approval = approveCatalogRelease(input.catalogGate ?? { manifest });
  if (!approval.approvedRelease) {
    return {
      allowed: false,
      manifest,
      fixtureMode: false,
      reasons: [
        CATALOG_UNAVAILABLE_MESSAGE,
        ...approval.reasons,
        "Screenshot refinement requires the same approved production catalog gate as recommendations."
      ]
    };
  }
  return { allowed: true, manifest, fixtureMode: false, reasons: approval.reasons };
}

function buildRefinementActions(matches: GameAppearanceMatch[]): RefinementAction[] {
  const current = matches.find((match) => match.rank === 1) ?? matches[0];
  const rankTwo = matches.find((match) => match.rank === 2);
  const rankThree = matches.find((match) => match.rank === 3);
  const actions: RefinementAction[] = [
    {
      id: "keep-current-recommendation",
      type: "keepCurrentRecommendation",
      label: "Keep current recommendation",
      description: "Keep the current verified recommendation because the scaffold has not proven a better screenshot-based change.",
      targetMatch: current,
      relatedCatalogItemID: current.catalogItem.stableInternalID,
      requiresVerifiedCatalog: true,
      confidence: actionConfidence(current),
      reasons: ["The current recommendation remains the baseline until refinement comparison is validated."]
    }
  ];
  if (rankTwo) actions.push(alternativeAction("try-rank-two", "tryRankTwo", "Try rank two", rankTwo));
  if (rankThree) actions.push(alternativeAction("try-rank-three", "tryRankThree", "Try rank three", rankThree));
  actions.push(
    verifiedControlAction("change-verified-hairstyle", "changeVerifiedHairstyle", "Change verified hairstyle"),
    verifiedControlAction("change-verified-facial-hair", "changeVerifiedFacialHair", "Change verified facial hair"),
    verifiedControlAction("change-another-verified-control", "changeVerifiedControl", "Change another verified control")
  );
  return actions;
}

function alternativeAction(id: string, type: RefinementAction["type"], label: string, match: GameAppearanceMatch): RefinementAction {
  return {
    id,
    type,
    label,
    description: "Consider this verified ranked candidate only after user review or future validated screenshot comparison supports it.",
    targetMatch: match,
    relatedCatalogItemID: match.catalogItem.stableInternalID,
    requiresVerifiedCatalog: true,
    confidence: actionConfidence(match),
    reasons: [
      "This action references an already ranked verified catalog candidate.",
      "It is not an identity probability and does not invent a new game option."
    ]
  };
}

function verifiedControlAction(id: string, type: RefinementAction["type"], label: string): RefinementAction {
  return {
    id,
    type,
    label,
    description: "Placeholder action for a future verified catalog control. No game label is suggested by this scaffold.",
    requiresVerifiedCatalog: true,
    confidence: unavailableConfidence(),
    reasons: ["No verified control-specific refinement logic is active yet."]
  };
}

function getVerifiedMatches(matches: GameAppearanceMatch[], fixtureMode: boolean) {
  return [...matches]
    .sort((first, second) => first.rank - second.rank)
    .filter((match) => match.catalogItem.verificationState === "verified")
    .filter((match) => (fixtureMode ? isFixtureItem(match.catalogItem) : isProductionItem(match.catalogItem)))
    .slice(0, 3);
}

function unavailableResult(input: {
  reasons: string[];
  feedbackRecord: RefinementFeedbackRecord | undefined;
  catalogManifest: GameCatalogManifest | null;
}): RefinementResult {
  return {
    status: "unavailable",
    message: unavailableMessage,
    suggestedMatches: [],
    engineVersion: SCREENSHOT_REFINEMENT_ENGINE_VERSION,
    catalogVersion: input.catalogManifest?.catalogVersion,
    feedbackRecord: input.feedbackRecord,
    unavailableReasons: [...new Set(input.reasons)]
  };
}

function createConsentedFeedbackRecord(input: ScreenshotRefinementEngineInput): RefinementFeedbackRecord | undefined {
  if (!input.userFeedback || !input.feedbackConsent?.consented) return undefined;
  return {
    id: `refinement-feedback-${input.session.id}-${input.now ?? new Date().toISOString()}`,
    createdAt: input.now ?? new Date().toISOString(),
    consentVersion: input.feedbackConsent.consentVersion,
    rating: input.userFeedback.rating,
    notes: input.userFeedback.notes?.trim() ? input.userFeedback.notes.trim() : null,
    screenshotSessionID: input.session.id,
    profileID: input.profile?.id ?? null,
    catalogVersionID: (input.catalogManifest ?? input.catalogGate?.manifest)?.catalogVersion.identifier ?? null
  };
}

function isFixtureCatalog(manifest: GameCatalogManifest) {
  return manifest.sourceType === "testFixture" && !manifest.isProduction && manifest.items.length > 0 && manifest.items.every(isFixtureItem);
}

function isFixtureItem(item: GameAppearanceMatch["catalogItem"]) {
  return item.sourceType === "testFixture" && item.isTestFixture;
}

function isProductionItem(item: GameAppearanceMatch["catalogItem"]) {
  return item.sourceType === "production" && !item.isTestFixture && item.verificationState === "verified";
}

function actionConfidence(match: GameAppearanceMatch): MeasurementConfidence {
  return match.confidence;
}

function unavailableConfidence(): MeasurementConfidence {
  return { score: 0, label: "unavailable" };
}
