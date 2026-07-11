import XCTest
@testable import GameFaceMatch

final class CatalogValidatorTests: XCTestCase {
    private let validator = CatalogValidator()

    func testEmptyProductionCatalogIsValid() throws {
        try validator.validateProductionManifest(Self.manifest(items: []), availableAssetIDs: [])
    }

    func testDuplicateStableIDRejected() throws {
        let item = Self.verifiedItem(id: "duplicate")
        let manifest = Self.manifest(items: [item, item])

        XCTAssertThrowsError(try validator.validateProductionManifest(manifest, availableAssetIDs: [])) { error in
            XCTAssertEqual(error as? CatalogValidationError, .duplicateStableID("duplicate"))
        }
    }

    func testUnverifiedProductionRecordRejected() throws {
        var item = Self.verifiedItem(id: "unverified")
        item.verificationState = .unverified

        XCTAssertThrowsError(try validator.validateProductionManifest(Self.manifest(items: [item]), availableAssetIDs: [])) { error in
            XCTAssertEqual(error as? CatalogValidationError, .unverifiedProductionRecord("unverified"))
        }
    }

    func testFixtureRecordRejectedInProduction() throws {
        var item = Self.verifiedItem(id: "fixture")
        item.isTestFixture = true

        XCTAssertThrowsError(try validator.validateProductionManifest(Self.manifest(items: [item]), availableAssetIDs: [])) { error in
            XCTAssertEqual(error as? CatalogValidationError, .fixtureRecordInProduction("fixture"))
        }
    }

    func testMissingRequiredMetadataRejected() throws {
        var item = Self.verifiedItem(id: "missing-platform")
        item.platform = ""

        XCTAssertThrowsError(try validator.validateProductionManifest(Self.manifest(items: [item]), availableAssetIDs: [])) { error in
            XCTAssertEqual(error as? CatalogValidationError, .missingPlatform("missing-platform"))
        }
    }

    func testPlaceholderLabelRejected() throws {
        var item = Self.verifiedItem(id: "placeholder")
        item.visibleGameLabelOrIndex = "TBD"

        XCTAssertThrowsError(try validator.validateProductionManifest(Self.manifest(items: [item]), availableAssetIDs: [])) { error in
            XCTAssertEqual(error as? CatalogValidationError, .placeholderLabel("placeholder"))
        }
    }

    func testMalformedMeasurementRejected() throws {
        var item = Self.verifiedItem(id: "bad-measurement")
        item.geometryMeasurements = ["faceWidthRatio": .nan]

        XCTAssertThrowsError(try validator.validateProductionManifest(Self.manifest(items: [item]), availableAssetIDs: [])) { error in
            XCTAssertEqual(error as? CatalogValidationError, .malformedMeasurement("bad-measurement", "faceWidthRatio"))
        }
    }

    private static func manifest(items: [GameCatalogItem]) -> GameCatalogManifest {
        GameCatalogManifest(
            catalogVersion: version,
            generatedAt: Date(timeIntervalSince1970: 0),
            isProduction: true,
            items: items
        )
    }

    private static func verifiedItem(id: String) -> GameCatalogItem {
        GameCatalogItem(
            stableInternalID: id,
            game: "EA SPORTS College Football 27",
            gameVersion: "verified-test-version",
            platform: "verified-test-platform",
            gameMode: "verified-test-mode",
            creationPath: "verified-test-path",
            category: "verified-test-category",
            visibleGameLabelOrIndex: "verified-test-label",
            verificationState: .verified,
            capturedDate: Date(timeIntervalSince1970: 0),
            verifiedDate: Date(timeIntervalSince1970: 0),
            sourceImageReferences: [],
            geometryMeasurements: ["faceWidthRatio": 0.7],
            humanAnnotations: ["note": "unit-test-only"],
            catalogVersion: version,
            isTestFixture: false
        )
    }

    private static let version = GameCatalogVersion(
        identifier: "unit-test-only",
        gameVersion: "verified-test-version",
        platform: "verified-test-platform",
        verifiedAt: Date(timeIntervalSince1970: 0)
    )
}
