import XCTest
@testable import GameFaceMatch

final class LocalStorageTests: XCTestCase {
    func testTemporarySessionDeletion() throws {
        let store = try makeStore()
        try store.saveTemporarySession(TemporaryCaptureSessionRecord(
            id: UUID(),
            createdAt: Date(timeIntervalSince1970: 0),
            metadata: Self.profile.capture,
            rawMediaPersisted: false
        ))

        try store.deleteTemporarySessionMedia()

        let contents = try FileManager.default.contentsOfDirectory(
            at: tempRoot.appendingPathComponent("temporary-sessions"),
            includingPropertiesForKeys: nil
        )
        XCTAssertTrue(contents.isEmpty)
    }

    func testSavedProfileDeletion() throws {
        let store = try makeStore()
        try store.saveDerivedProfile(Self.profile)
        XCTAssertEqual(try store.loadDerivedProfiles().count, 1)

        try store.deleteSavedProfiles()

        XCTAssertEqual(try store.loadDerivedProfiles().count, 0)
    }

    func testDeleteAllLocalDataRecordsCompletion() throws {
        let store = try makeStore()
        try store.saveDerivedProfile(Self.profile)

        try store.deleteAllLocalUserData()

        XCTAssertEqual(try store.loadDerivedProfiles().count, 0)
        XCTAssertTrue(FileManager.default.fileExists(atPath: tempRoot.appendingPathComponent("deletion-completed.json").path))
    }

    private var tempRoot: URL {
        FileManager.default.temporaryDirectory.appendingPathComponent("GameFaceMatchTests-\(name)", isDirectory: true)
    }

    private func makeStore() throws -> LocalFilePrivacyStore {
        if FileManager.default.fileExists(atPath: tempRoot.path) {
            try FileManager.default.removeItem(at: tempRoot)
        }
        return LocalFilePrivacyStore(baseURL: tempRoot)
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
