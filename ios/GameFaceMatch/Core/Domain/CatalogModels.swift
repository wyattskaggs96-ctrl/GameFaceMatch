import Foundation

struct GameCatalogManifest: Codable, Equatable, Sendable {
    var catalogVersion: GameCatalogVersion
    var generatedAt: Date
    var isProduction: Bool
    var items: [GameCatalogItem]
}

struct GameCatalogItem: Codable, Equatable, Sendable, Identifiable {
    var id: String { stableInternalID }
    var stableInternalID: String
    var game: String
    var gameVersion: String
    var platform: String
    var gameMode: String
    var creationPath: String
    var category: String
    var visibleGameLabelOrIndex: String
    var verificationState: CatalogVerificationStatus
    var capturedDate: Date
    var verifiedDate: Date?
    var sourceImageReferences: [String]
    var geometryMeasurements: [String: Double]
    var humanAnnotations: [String: String]
    var catalogVersion: GameCatalogVersion
    var isTestFixture: Bool
}

struct GameCatalogVersion: Codable, Equatable, Sendable {
    var identifier: String
    var gameVersion: String
    var platform: String
    var verifiedAt: Date?
}

enum CatalogVerificationStatus: String, Codable, CaseIterable, Sendable {
    case verified
    case unverified
    case rejected
    case archived
}

struct GameAppearanceMatch: Codable, Equatable, Sendable, Identifiable {
    var id: String
    var catalogItem: GameCatalogItem
    var score: Double
    var confidence: MeasurementConfidence
    var explanation: MatchExplanation
    var catalogVersion: GameCatalogVersion
}

struct MatchExplanation: Codable, Equatable, Sendable {
    var summary: String
    var strongestSimilarities: [String]
    var largestDifferences: [String]
    var uncertaintyNotes: [String]
}

struct BuildInstruction: Codable, Equatable, Sendable, Identifiable {
    var id: String
    var sequenceNumber: Int
    var title: String
    var detail: String
    var relatedCatalogItemID: String?
}

struct RefinementResult: Codable, Equatable, Sendable {
    var status: Status
    var message: String
    var suggestedMatches: [GameAppearanceMatch]

    enum Status: String, Codable, Sendable {
        case unavailable
        case keepCurrent
        case tryAlternative
        case invalidScreenshot
    }
}

struct SavedBuild: Codable, Equatable, Sendable, Identifiable {
    var id: UUID
    var createdAt: Date
    var profileVersion: String
    var match: GameAppearanceMatch?
    var buildInstructions: [BuildInstruction]
    var catalogVersion: GameCatalogVersion?
}
