import type { EvidenceSupportState, GameCatalogItem } from "@/types/domain";

export const evidenceSupportStates: readonly EvidenceSupportState[] = [
  "SUPPORTED",
  "SUPPORTED_WITH_NOTES",
  "USER_CONFIRMATION_REQUIRED",
  "LIMITED_EVIDENCE",
  "UNSUPPORTED",
  "DEPRECATED",
  "VERSION_MISMATCH"
];

export const recommendationEligibleEvidenceSupportStates = new Set<EvidenceSupportState>([
  "SUPPORTED",
  "SUPPORTED_WITH_NOTES",
  "USER_CONFIRMATION_REQUIRED"
]);

export function getEvidenceSupportState(item: GameCatalogItem): EvidenceSupportState {
  if (item.evidenceSupportState) return item.evidenceSupportState;
  if (item.deprecated) return "DEPRECATED";
  return "SUPPORTED";
}

export function isRecommendationEligibleEvidenceSupportState(state: EvidenceSupportState) {
  return recommendationEligibleEvidenceSupportStates.has(state);
}

export function evidenceSupportConfidenceMultiplier(state: EvidenceSupportState) {
  if (state === "SUPPORTED") return 1;
  if (state === "SUPPORTED_WITH_NOTES") return 0.9;
  if (state === "USER_CONFIRMATION_REQUIRED") return 0.75;
  return 0;
}

export function evidenceSupportLimitations(item: GameCatalogItem): string[] {
  const state = getEvidenceSupportState(item);
  const notes = item.evidenceSupportNotes ?? [];
  if (state === "SUPPORTED") return notes;
  const stateNote =
    state === "SUPPORTED_WITH_NOTES"
      ? "This option is supported by existing media with documented evidence limitations."
      : state === "USER_CONFIRMATION_REQUIRED"
        ? "This option requires user confirmation and confirmation screenshots before it is treated as a successful personal outcome."
        : state === "LIMITED_EVIDENCE"
          ? "This option has limited evidence and is not eligible for high-confidence customer recommendations."
          : state === "UNSUPPORTED"
            ? "This option is not supported by the locked media baseline."
            : state === "VERSION_MISMATCH"
              ? "This option does not match the current game/platform/version target."
              : "This option belongs to an older or superseded catalog version.";
  return [stateNote, ...notes];
}
