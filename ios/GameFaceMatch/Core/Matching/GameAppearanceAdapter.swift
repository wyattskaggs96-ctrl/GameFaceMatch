import Foundation

protocol GameAppearanceAdapter: Sendable {
    var gameID: String { get }
    var supportedVersions: [String] { get }
    var supportedPlatforms: [String] { get }

    func validateCatalog(_ manifest: GameCatalogManifest) throws
    func match(profile: StandardFaceProfile) async throws -> [GameAppearanceMatch]
    func buildInstructions(for match: GameAppearanceMatch) throws -> [BuildInstruction]
    func refine(originalProfile: StandardFaceProfile, createdPlayerImages: [CapturedImage]) async throws -> RefinementResult
}

struct CapturedImage: Codable, Equatable, Sendable, Identifiable {
    var id: UUID
    var localReference: String
    var capturedAt: Date
}

enum GameAdapterError: Error, Equatable, LocalizedError, Sendable {
    case catalogUnavailable(String)
    case unsupportedCatalog(String)
    case refinementUnavailable(String)

    var errorDescription: String? {
        switch self {
        case .catalogUnavailable(let message), .unsupportedCatalog(let message), .refinementUnavailable(let message):
            message
        }
    }
}
