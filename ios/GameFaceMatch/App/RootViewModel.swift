import Foundation

@MainActor
final class RootViewModel: ObservableObject {
    @Published private(set) var acceptedDisclaimer = false
    @Published private(set) var acceptedPrivacySummary = false
    @Published private(set) var deletionCompleted = false
    @Published private(set) var deletionErrorMessage: String?

    let catalogNotice = "Verified College Football 27 catalog not loaded."
    let productExplanation = "GameFace Match recommends the closest available in-game appearance settings. It does not directly import your face into College Football 27."

    private let localDataStore: any LocalUserDataDeleting

    init(localDataStore: any LocalUserDataDeleting = LocalFilePrivacyStore.applicationSupportStore()) {
        self.localDataStore = localDataStore
    }

    func acceptDisclaimer() {
        acceptedDisclaimer = true
    }

    func acceptPrivacySummary() {
        acceptedPrivacySummary = true
    }

    func deleteAllLocalData() {
        do {
            try localDataStore.deleteAllLocalUserData()
            deletionCompleted = true
            deletionErrorMessage = nil
        } catch {
            deletionCompleted = false
            deletionErrorMessage = "Local data could not be deleted. Try again from Settings."
        }
    }
}
