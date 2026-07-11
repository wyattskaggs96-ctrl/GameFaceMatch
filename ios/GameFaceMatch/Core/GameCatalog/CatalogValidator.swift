import Foundation

struct CatalogValidator: Sendable {
    func validateProductionManifest(_ manifest: GameCatalogManifest, availableAssetIDs: Set<String>) throws {
        guard manifest.isProduction else {
            return
        }

        var seenIDs = Set<String>()
        for item in manifest.items {
            guard item.stableInternalID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false else {
                throw CatalogValidationError.missingStableID
            }
            guard seenIDs.insert(item.stableInternalID).inserted else {
                throw CatalogValidationError.duplicateStableID(item.stableInternalID)
            }
            guard item.gameVersion.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false else {
                throw CatalogValidationError.missingGameVersion(item.stableInternalID)
            }
            guard item.platform.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false else {
                throw CatalogValidationError.missingPlatform(item.stableInternalID)
            }
            guard item.gameMode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false else {
                throw CatalogValidationError.missingGameMode(item.stableInternalID)
            }
            guard item.creationPath.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false else {
                throw CatalogValidationError.missingCreationPath(item.stableInternalID)
            }
            guard item.verificationState == .verified else {
                throw CatalogValidationError.unverifiedProductionRecord(item.stableInternalID)
            }
            guard item.isTestFixture == false else {
                throw CatalogValidationError.fixtureRecordInProduction(item.stableInternalID)
            }
            guard isPlaceholderLabel(item.visibleGameLabelOrIndex) == false else {
                throw CatalogValidationError.placeholderLabel(item.stableInternalID)
            }
            for (key, value) in item.geometryMeasurements where value.isFinite == false || value < 0 {
                throw CatalogValidationError.malformedMeasurement(item.stableInternalID, key)
            }
            for reference in item.sourceImageReferences where availableAssetIDs.contains(reference) == false {
                throw CatalogValidationError.unavailableAssetReference(item.stableInternalID, reference)
            }
        }
    }

    private func isPlaceholderLabel(_ label: String) -> Bool {
        let trimmed = label.trimmingCharacters(in: .whitespacesAndNewlines)
        let lowered = trimmed.lowercased()
        return trimmed.isEmpty
            || lowered == "placeholder"
            || lowered == "tbd"
            || lowered == "todo"
            || lowered == "mock"
            || lowered == "test"
            || lowered.contains("placeholder")
            || lowered.contains("to be verified")
    }
}

enum CatalogValidationError: Error, Equatable, LocalizedError, Sendable {
    case duplicateStableID(String)
    case missingStableID
    case missingGameVersion(String)
    case missingPlatform(String)
    case missingGameMode(String)
    case missingCreationPath(String)
    case placeholderLabel(String)
    case unverifiedProductionRecord(String)
    case fixtureRecordInProduction(String)
    case malformedMeasurement(String, String)
    case unavailableAssetReference(String, String)

    var errorDescription: String? {
        switch self {
        case .duplicateStableID(let id): "Duplicate stable ID: \(id)"
        case .missingStableID: "Missing stable ID"
        case .missingGameVersion(let id): "Missing game version for \(id)"
        case .missingPlatform(let id): "Missing platform for \(id)"
        case .missingGameMode(let id): "Missing game mode for \(id)"
        case .missingCreationPath(let id): "Missing creation path for \(id)"
        case .placeholderLabel(let id): "Placeholder label for \(id)"
        case .unverifiedProductionRecord(let id): "Unverified production record: \(id)"
        case .fixtureRecordInProduction(let id): "Fixture record in production: \(id)"
        case .malformedMeasurement(let id, let key): "Malformed measurement \(key) for \(id)"
        case .unavailableAssetReference(let id, let reference): "Unavailable asset reference \(reference) for \(id)"
        }
    }
}

protocol CatalogManifestVerifier: Sendable {
    func verify(manifest: GameCatalogManifest) async throws
}
