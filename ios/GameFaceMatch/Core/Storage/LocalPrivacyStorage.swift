import Foundation

protocol TemporaryCaptureSessionStorage {
    func saveTemporarySession(_ session: TemporaryCaptureSessionRecord) throws
    func deleteTemporarySessionMedia() throws
}

protocol DerivedProfileStorage {
    func saveDerivedProfile(_ profile: StandardFaceProfile) throws
    func loadDerivedProfiles() throws -> [StandardFaceProfile]
    func deleteSavedProfiles() throws
}

protocol LocalUserDataDeleting {
    func deleteAllLocalUserData() throws
    func recordSuccessfulDeletionCompletion() throws
}

struct TemporaryCaptureSessionRecord: Codable, Equatable, Sendable {
    var id: UUID
    var createdAt: Date
    var metadata: CaptureMetadata
    var rawMediaPersisted: Bool
}

final class LocalFilePrivacyStore: TemporaryCaptureSessionStorage, DerivedProfileStorage, LocalUserDataDeleting {
    private let baseURL: URL
    private let fileManager: FileManager

    static func applicationSupportStore(fileManager: FileManager = .default) -> LocalFilePrivacyStore {
        let root = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first ?? fileManager.temporaryDirectory
        return LocalFilePrivacyStore(baseURL: root.appendingPathComponent("GameFaceMatch", isDirectory: true), fileManager: fileManager)
    }

    init(baseURL: URL, fileManager: FileManager = .default) {
        self.baseURL = baseURL
        self.fileManager = fileManager
    }

    func saveTemporarySession(_ session: TemporaryCaptureSessionRecord) throws {
        try ensureDirectories()
        let data = try JSONEncoder.catalogEncoder.encode(session)
        try data.write(to: temporarySessionsURL.appendingPathComponent("\(session.id.uuidString).json"), options: .atomic)
    }

    func deleteTemporarySessionMedia() throws {
        try removeDirectoryContents(at: temporarySessionsURL)
    }

    func saveDerivedProfile(_ profile: StandardFaceProfile) throws {
        try ensureDirectories()
        let filename = "\(profile.capture.capturedAt.timeIntervalSince1970).json"
        let data = try JSONEncoder.catalogEncoder.encode(profile)
        try data.write(to: profilesURL.appendingPathComponent(filename), options: .atomic)
    }

    func loadDerivedProfiles() throws -> [StandardFaceProfile] {
        guard fileManager.fileExists(atPath: profilesURL.path) else {
            return []
        }
        let urls = try fileManager.contentsOfDirectory(at: profilesURL, includingPropertiesForKeys: nil)
        return try urls.filter { $0.pathExtension == "json" }.map { url in
            let data = try Data(contentsOf: url)
            return try JSONDecoder.catalogDecoder.decode(StandardFaceProfile.self, from: data)
        }
    }

    func deleteSavedProfiles() throws {
        try removeDirectoryContents(at: profilesURL)
    }

    func deleteAllLocalUserData() throws {
        try removeDirectoryContents(at: temporarySessionsURL)
        try removeDirectoryContents(at: profilesURL)
        try removeDirectoryContents(at: savedBuildsURL)
        try removeDirectoryContents(at: screenshotsURL)
        try recordSuccessfulDeletionCompletion()
    }

    func recordSuccessfulDeletionCompletion() throws {
        try ensureDirectories()
        let marker = DeletionCompletionRecord(completedAt: Date())
        let data = try JSONEncoder.catalogEncoder.encode(marker)
        try data.write(to: baseURL.appendingPathComponent("deletion-completed.json"), options: .atomic)
    }

    private var temporarySessionsURL: URL { baseURL.appendingPathComponent("temporary-sessions", isDirectory: true) }
    private var profilesURL: URL { baseURL.appendingPathComponent("derived-profiles", isDirectory: true) }
    private var savedBuildsURL: URL { baseURL.appendingPathComponent("saved-builds", isDirectory: true) }
    private var screenshotsURL: URL { baseURL.appendingPathComponent("screenshots", isDirectory: true) }

    private func ensureDirectories() throws {
        for url in [baseURL, temporarySessionsURL, profilesURL, savedBuildsURL, screenshotsURL] {
            try fileManager.createDirectory(at: url, withIntermediateDirectories: true)
        }
    }

    private func removeDirectoryContents(at url: URL) throws {
        guard fileManager.fileExists(atPath: url.path) else {
            return
        }
        let children = try fileManager.contentsOfDirectory(at: url, includingPropertiesForKeys: nil)
        for child in children {
            try fileManager.removeItem(at: child)
        }
    }
}

private struct DeletionCompletionRecord: Codable, Sendable {
    var completedAt: Date
}
