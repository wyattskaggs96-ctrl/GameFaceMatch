import type { BuildInstruction, GameAppearanceMatch, GameCatalogManifest, RefinementResult, StandardFaceProfile } from "@/types/domain";
import type { MatchingPreferences } from "@/lib/matching/matching-engine";

export interface GameAppearanceAdapter {
  gameID: string;
  supportedVersions: string[];
  supportedPlatforms: string[];
  validateCatalog(manifest: GameCatalogManifest): void;
  match(profile: StandardFaceProfile, preferences?: MatchingPreferences): Promise<GameAppearanceMatch[]>;
  buildInstructions(match: GameAppearanceMatch): BuildInstruction[];
  refine(originalProfile: StandardFaceProfile, createdPlayerImages: File[]): Promise<RefinementResult>;
}

export class GameAdapterError extends Error {
  constructor(
    public readonly code: "catalogUnavailable" | "unsupportedCatalog" | "refinementUnavailable",
    message: string
  ) {
    super(message);
    this.name = "GameAdapterError";
  }
}
