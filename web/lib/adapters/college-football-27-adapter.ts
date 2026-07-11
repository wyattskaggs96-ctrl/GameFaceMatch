import type { CatalogRepository } from "@/lib/catalog/catalog-repository";
import { validateProductionCatalog } from "@/lib/catalog/catalog-validator";
import { createRuleBasedMatchingEngine, type MatchingEngine, type MatchingPreferences } from "@/lib/matching/matching-engine";
import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";
import type { BuildInstruction, GameAppearanceMatch, GameCatalogManifest, RefinementResult, StandardFaceProfile } from "@/types/domain";
import { GameAdapterError, type GameAppearanceAdapter } from "./game-appearance-adapter";

export class CollegeFootball27Adapter implements GameAppearanceAdapter {
  readonly gameID = "college-football-27";
  readonly supportedVersions: string[] = [];
  readonly supportedPlatforms: string[] = [];

  constructor(
    private readonly catalogRepository: CatalogRepository,
    private readonly matchingEngine: MatchingEngine = createRuleBasedMatchingEngine()
  ) {}

  validateCatalog(manifest: GameCatalogManifest) {
    validateProductionCatalog(manifest);
  }

  async match(profile: StandardFaceProfile, preferences?: MatchingPreferences): Promise<GameAppearanceMatch[]> {
    const manifest = await this.catalogRepository.loadProductionManifest();
    this.validateCatalog(manifest);
    if (manifest.items.length === 0) {
      throw new GameAdapterError("catalogUnavailable", CATALOG_UNAVAILABLE_MESSAGE);
    }
    const matches = this.matchingEngine.matchTopThree({ profile, catalog: manifest, preferences, limit: 3 });
    if (matches.length === 0) {
      throw new GameAdapterError("catalogUnavailable", CATALOG_UNAVAILABLE_MESSAGE);
    }
    return matches;
  }

  buildInstructions(_match: GameAppearanceMatch): BuildInstruction[] {
    throw new GameAdapterError("catalogUnavailable", CATALOG_UNAVAILABLE_MESSAGE);
  }

  async refine(_originalProfile: StandardFaceProfile, _createdPlayerImages: File[]): Promise<RefinementResult> {
    throw new GameAdapterError("refinementUnavailable", "Screenshot refinement is unavailable until verified catalog data exists.");
  }
}
