import type { StandardFaceProfile } from "@/types/domain";

export type SupportedGameID = "college-football-27" | "ea-sports-fc-26";

export interface SupportedGameDefinition {
  gameID: SupportedGameID;
  title: string;
  activeProductStatus: "activeMvp" | "researchOnly";
  researchNamespace: string;
  productionCatalogNamespace: string;
  recommendationsEnabled: boolean;
}

export interface GameProfileContext {
  schemaVersion: "gameface-game-profile-context-v1";
  gameID: SupportedGameID;
  profileID: string;
  profileVersion: string;
  profileContractVersion: string;
}

export const SUPPORTED_GAME_DEFINITIONS: readonly SupportedGameDefinition[] = [
  {
    gameID: "college-football-27",
    title: "EA SPORTS College Football 27",
    activeProductStatus: "activeMvp",
    researchNamespace: "data/phase-zero",
    productionCatalogNamespace: "data/catalog/production",
    recommendationsEnabled: false
  },
  {
    gameID: "ea-sports-fc-26",
    title: "EA SPORTS FC 26",
    activeProductStatus: "researchOnly",
    researchNamespace: "data/research/fc26",
    productionCatalogNamespace: "data/catalog/production/fc26",
    recommendationsEnabled: false
  }
] as const;

export function getSupportedGameDefinition(gameID: SupportedGameID): SupportedGameDefinition {
  const definition = SUPPORTED_GAME_DEFINITIONS.find((candidate) => candidate.gameID === gameID);
  if (!definition) throw new Error(`Unsupported game ID: ${gameID}`);
  return definition;
}

export function createGameProfileContext(profile: StandardFaceProfile, gameID: SupportedGameID): GameProfileContext {
  return {
    schemaVersion: "gameface-game-profile-context-v1",
    gameID,
    profileID: profile.id,
    profileVersion: profile.profileVersion,
    profileContractVersion: profile.profileContractVersion
  };
}
