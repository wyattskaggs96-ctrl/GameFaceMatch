import Foundation

struct CollegeFootball27Adapter: GameAppearanceAdapter {
    let catalogRepository: CatalogRepository
    let validator: CatalogValidator

    var gameID: String { "college-football-27" }
    var supportedVersions: [String] { [] }
    var supportedPlatforms: [String] { [] }

    init(catalogRepository: CatalogRepository, validator: CatalogValidator = CatalogValidator()) {
        self.catalogRepository = catalogRepository
        self.validator = validator
    }

    func validateCatalog(_ manifest: GameCatalogManifest) throws {
        try validator.validateProductionManifest(manifest, availableAssetIDs: [])
    }

    func match(profile: StandardFaceProfile) async throws -> [GameAppearanceMatch] {
        let manifest = try await catalogRepository.loadProductionManifest()
        try validateCatalog(manifest)
        guard manifest.items.isEmpty == false else {
            throw GameAdapterError.catalogUnavailable("Verified College Football 27 catalog not loaded.")
        }
        throw GameAdapterError.catalogUnavailable("College Football 27 matching is unavailable until production catalog matching is implemented.")
    }

    func buildInstructions(for match: GameAppearanceMatch) throws -> [BuildInstruction] {
        throw GameAdapterError.catalogUnavailable("Verified College Football 27 catalog not loaded.")
    }

    func refine(originalProfile: StandardFaceProfile, createdPlayerImages: [CapturedImage]) async throws -> RefinementResult {
        throw GameAdapterError.refinementUnavailable("Screenshot refinement is unavailable until verified catalog data exists.")
    }
}
