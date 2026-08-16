import type { StandardFaceProfile } from "@/types/domain";

export type SupportedGameID =
  | "college-football-27"
  | "nba-2k26"
  | "madden-nfl-26"
  | "ea-sports-pga-tour"
  | "pba-pro-bowling-2026"
  | "ea-sports-fc-26";

export type ActiveProductStatus = "activeMvp" | "launchTargetNotStarted" | "researchOnly";
export type GameResearchStatus = "researchEvidenceExists" | "notStarted" | "researchOnly";
export type GameCatalogAvailability = "empty" | "researchOnly" | "productionAvailable";
export type GameRecommendationAvailability = "unavailableNoProductionCatalog" | "unavailableNotStarted" | "available";
export type GameEntitlementEligibility = "eligibleWhenProductionSupported" | "notEligibleResearchOnly";
export type GameCustomerFacingSupportState = "researchEvidenceCatalogUnavailable" | "notStartedUnavailable" | "researchOnlyUnavailable" | "supported";

export interface SupportedGameDefinition {
  gameID: SupportedGameID;
  title: string;
  activeProductStatus: ActiveProductStatus;
  launchTarget: boolean;
  researchStatus: GameResearchStatus;
  productionCatalogAvailability: GameCatalogAvailability;
  recommendationAvailability: GameRecommendationAvailability;
  entitlementEligibility: GameEntitlementEligibility;
  customerFacingSupportState: GameCustomerFacingSupportState;
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

export type GameSelectionTileID =
  | "cf27"
  | "madden26"
  | "nba2k26"
  | "pga"
  | "pba"
  | "soccer26";

export type GameSelectionScreenID =
  | "game-college-football-27"
  | "game-madden-nfl-26"
  | "game-nba-2k26"
  | "game-ea-sports-pga-tour"
  | "game-pba-pro-bowling-2026"
  | "game-ea-sports-fc-26";

export interface GameSelectionTileDefinition {
  tileID: GameSelectionTileID;
  displayName: string;
  ariaLabel: string;
  screenID: GameSelectionScreenID;
  gameID: SupportedGameID;
  adapterID: SupportedGameID;
  catalogNamespace: string;
}

export const SUPPORTED_GAME_DEFINITIONS: readonly SupportedGameDefinition[] = [
  {
    gameID: "college-football-27",
    title: "EA SPORTS College Football 27",
    activeProductStatus: "activeMvp",
    launchTarget: true,
    researchStatus: "researchEvidenceExists",
    productionCatalogAvailability: "empty",
    recommendationAvailability: "unavailableNoProductionCatalog",
    entitlementEligibility: "eligibleWhenProductionSupported",
    customerFacingSupportState: "researchEvidenceCatalogUnavailable",
    researchNamespace: "data/phase-zero",
    productionCatalogNamespace: "data/catalog/production",
    recommendationsEnabled: false
  },
  {
    gameID: "nba-2k26",
    title: "NBA 2K26",
    activeProductStatus: "launchTargetNotStarted",
    launchTarget: true,
    researchStatus: "researchEvidenceExists",
    productionCatalogAvailability: "empty",
    recommendationAvailability: "unavailableNoProductionCatalog",
    entitlementEligibility: "eligibleWhenProductionSupported",
    customerFacingSupportState: "researchEvidenceCatalogUnavailable",
    researchNamespace: "data/media-audit",
    productionCatalogNamespace: "data/catalog/production/nba-2k26",
    recommendationsEnabled: false
  },
  {
    gameID: "madden-nfl-26",
    title: "Madden NFL 26",
    activeProductStatus: "launchTargetNotStarted",
    launchTarget: true,
    researchStatus: "notStarted",
    productionCatalogAvailability: "empty",
    recommendationAvailability: "unavailableNotStarted",
    entitlementEligibility: "eligibleWhenProductionSupported",
    customerFacingSupportState: "notStartedUnavailable",
    researchNamespace: "data/research/madden-nfl-26",
    productionCatalogNamespace: "data/catalog/production/madden-nfl-26",
    recommendationsEnabled: false
  },
  {
    gameID: "ea-sports-pga-tour",
    title: "EA SPORTS PGA TOUR",
    activeProductStatus: "launchTargetNotStarted",
    launchTarget: true,
    researchStatus: "notStarted",
    productionCatalogAvailability: "empty",
    recommendationAvailability: "unavailableNotStarted",
    entitlementEligibility: "eligibleWhenProductionSupported",
    customerFacingSupportState: "notStartedUnavailable",
    researchNamespace: "data/research/ea-sports-pga-tour",
    productionCatalogNamespace: "data/catalog/production/ea-sports-pga-tour",
    recommendationsEnabled: false
  },
  {
    gameID: "pba-pro-bowling-2026",
    title: "PBA Pro Bowling 2026",
    activeProductStatus: "launchTargetNotStarted",
    launchTarget: true,
    researchStatus: "notStarted",
    productionCatalogAvailability: "empty",
    recommendationAvailability: "unavailableNotStarted",
    entitlementEligibility: "eligibleWhenProductionSupported",
    customerFacingSupportState: "notStartedUnavailable",
    researchNamespace: "data/research/pba-pro-bowling-2026",
    productionCatalogNamespace: "data/catalog/production/pba-pro-bowling-2026",
    recommendationsEnabled: false
  },
  {
    gameID: "ea-sports-fc-26",
    title: "EA SPORTS FC 26",
    activeProductStatus: "researchOnly",
    launchTarget: false,
    researchStatus: "researchOnly",
    productionCatalogAvailability: "researchOnly",
    recommendationAvailability: "unavailableNoProductionCatalog",
    entitlementEligibility: "notEligibleResearchOnly",
    customerFacingSupportState: "researchOnlyUnavailable",
    researchNamespace: "data/research/fc26",
    productionCatalogNamespace: "data/catalog/production/fc26",
    recommendationsEnabled: false
  }
] as const;

export const GAME_SELECTION_TILES: readonly GameSelectionTileDefinition[] = [
  {
    tileID: "cf27",
    displayName: "CFB game 2027",
    ariaLabel: "Select CFB game 2027",
    screenID: "game-college-football-27",
    gameID: "college-football-27",
    adapterID: "college-football-27",
    catalogNamespace: "data/catalog/production"
  },
  {
    tileID: "madden26",
    displayName: "Pro Football game 2026",
    ariaLabel: "Select Pro Football game 2026",
    screenID: "game-madden-nfl-26",
    gameID: "madden-nfl-26",
    adapterID: "madden-nfl-26",
    catalogNamespace: "data/catalog/production/madden-nfl-26"
  },
  {
    tileID: "nba2k26",
    displayName: "Pro Basketball game 2026",
    ariaLabel: "Select Pro Basketball game 2026",
    screenID: "game-nba-2k26",
    gameID: "nba-2k26",
    adapterID: "nba-2k26",
    catalogNamespace: "data/catalog/production/nba-2k26"
  },
  {
    tileID: "pga",
    displayName: "Pro Golf game 2026",
    ariaLabel: "Select Pro Golf game 2026",
    screenID: "game-ea-sports-pga-tour",
    gameID: "ea-sports-pga-tour",
    adapterID: "ea-sports-pga-tour",
    catalogNamespace: "data/catalog/production/ea-sports-pga-tour"
  },
  {
    tileID: "pba",
    displayName: "Pro Bowling game 2026",
    ariaLabel: "Select Pro Bowling game 2026",
    screenID: "game-pba-pro-bowling-2026",
    gameID: "pba-pro-bowling-2026",
    adapterID: "pba-pro-bowling-2026",
    catalogNamespace: "data/catalog/production/pba-pro-bowling-2026"
  },
  {
    tileID: "soccer26",
    displayName: "Pro Soccer game 2026",
    ariaLabel: "Select Pro Soccer game 2026",
    screenID: "game-ea-sports-fc-26",
    gameID: "ea-sports-fc-26",
    adapterID: "ea-sports-fc-26",
    catalogNamespace: "data/catalog/production/fc26"
  }
] as const;

export function getSupportedGameDefinition(gameID: SupportedGameID): SupportedGameDefinition {
  const definition = SUPPORTED_GAME_DEFINITIONS.find((candidate) => candidate.gameID === gameID);
  if (!definition) throw new Error(`Unsupported game ID: ${gameID}`);
  return definition;
}

export function getGameSelectionTileByScreen(screenID: GameSelectionScreenID): GameSelectionTileDefinition {
  const definition = GAME_SELECTION_TILES.find((candidate) => candidate.screenID === screenID);
  if (!definition) throw new Error(`Unsupported game selection screen: ${screenID}`);
  return definition;
}

export function getGameSelectionTileByGame(gameID: SupportedGameID): GameSelectionTileDefinition {
  const definition = GAME_SELECTION_TILES.find((candidate) => candidate.gameID === gameID);
  if (!definition) throw new Error(`Unsupported game selection game: ${gameID}`);
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
