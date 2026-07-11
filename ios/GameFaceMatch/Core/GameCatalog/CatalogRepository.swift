import Foundation

protocol CatalogRepository: Sendable {
    func loadProductionManifest() async throws -> GameCatalogManifest
}

struct LocalBundledCatalogRepository: CatalogRepository {
    let bundle: Bundle
    let resourceName: String

    init(bundle: Bundle = .main, resourceName: String = "catalog_manifest") {
        self.bundle = bundle
        self.resourceName = resourceName
    }

    func loadProductionManifest() async throws -> GameCatalogManifest {
        guard let url = bundle.url(forResource: resourceName, withExtension: "json") else {
            return GameCatalogManifest(
                catalogVersion: GameCatalogVersion(identifier: "empty-production", gameVersion: "", platform: "", verifiedAt: nil),
                generatedAt: Date(timeIntervalSince1970: 0),
                isProduction: true,
                items: []
            )
        }
        let data = try Data(contentsOf: url)
        return try JSONDecoder.catalogDecoder.decode(GameCatalogManifest.self, from: data)
    }
}

extension JSONDecoder {
    static var catalogDecoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}

extension JSONEncoder {
    static var catalogEncoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return encoder
    }
}
