import type { BuildInstruction, GameAppearanceMatch, GameCatalogManifest, RefinementResult, StandardFaceProfile } from "@/types/domain";
import type { MatchingPreferences } from "@/lib/matching/matching-engine";
import { GameAdapterError, type GameAppearanceAdapter } from "./game-appearance-adapter";

const FC26_CATALOG_UNAVAILABLE_MESSAGE =
  "Verified EA SPORTS FC 26 player-creator catalog not loaded. FC 26 observations are research-only until review, verification, and production approval are complete.";

export class EaSportsFc26Adapter implements GameAppearanceAdapter {
  readonly gameID = "ea-sports-fc-26";
  readonly supportedVersions: string[] = [];
  readonly supportedPlatforms: string[] = [];

  validateCatalog(manifest: GameCatalogManifest) {
    for (const item of manifest.items) {
      if (item.game !== "EA SPORTS FC 26") {
        throw new GameAdapterError("unsupportedCatalog", "FC 26 adapter cannot validate another game catalog.");
      }
      if (item.sourceType !== "production" || item.verificationState !== "verified" || item.isTestFixture) {
        throw new GameAdapterError("unsupportedCatalog", FC26_CATALOG_UNAVAILABLE_MESSAGE);
      }
    }
  }

  async match(_profile: StandardFaceProfile, _preferences?: MatchingPreferences): Promise<GameAppearanceMatch[]> {
    throw new GameAdapterError("catalogUnavailable", FC26_CATALOG_UNAVAILABLE_MESSAGE);
  }

  buildInstructions(_match: GameAppearanceMatch): BuildInstruction[] {
    throw new GameAdapterError("catalogUnavailable", FC26_CATALOG_UNAVAILABLE_MESSAGE);
  }

  async refine(_originalProfile: StandardFaceProfile, _createdPlayerImages: File[]): Promise<RefinementResult> {
    throw new GameAdapterError("refinementUnavailable", "FC 26 screenshot refinement is unavailable until a verified production catalog exists.");
  }
}

export { FC26_CATALOG_UNAVAILABLE_MESSAGE };
