import XCTest
@testable import GameFaceMatch

final class CollegeFootball27AdapterTests: XCTestCase {
    func testCatalogUnavailableWhenProductionCatalogIsEmpty() async throws {
        let adapter = CollegeFootball27Adapter(catalogRepository: EmptyCatalogRepository())

        do {
            _ = try await adapter.match(profile: Self.profile)
            XCTFail("Expected catalog unavailable error.")
        } catch let error as GameAdapterError {
            XCTAssertEqual(error, .catalogUnavailable("Verified College Football 27 catalog not loaded."))
        }
    }

    private struct EmptyCatalogRepository: CatalogRepository {
        func loadProductionManifest() async throws -> GameCatalogManifest {
            GameCatalogManifest(
                catalogVersion: GameCatalogVersion(identifier: "empty-production", gameVersion: "", platform: "", verifiedAt: nil),
                generatedAt: Date(timeIntervalSince1970: 0),
                isProduction: true,
                items: []
            )
        }
    }

    private static let profile = StandardFaceProfile(
        profileVersion: "unit-test",
        capture: CaptureMetadata(
            mode: .standardCamera,
            deviceModel: "unit-test-device",
            capturedAt: Date(timeIntervalSince1970: 0),
            overallQuality: 0.8,
            operatingSystemVersion: "unit-test-os",
            appVersion: "unit-test-app"
        ),
        qualityReport: CaptureQualityReport(overallScore: 0.8, issues: [], isUsableForPrototype: true),
        geometry: GeometryProfile(measurements: [:], modelVersion: "unit-test"),
        appearance: AppearanceProfile(attributes: [], modelVersion: "unit-test")
    )
}
