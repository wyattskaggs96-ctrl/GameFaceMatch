import XCTest
@testable import GameFaceMatch

@MainActor
final class RootViewModelTests: XCTestCase {
    func testConsentAndDeletionStateTransitions() {
        let store = MockLocalDataStore()
        let viewModel = RootViewModel(localDataStore: store)

        XCTAssertFalse(viewModel.acceptedDisclaimer)
        XCTAssertFalse(viewModel.acceptedPrivacySummary)
        XCTAssertFalse(viewModel.deletionCompleted)

        viewModel.acceptDisclaimer()
        viewModel.acceptPrivacySummary()
        viewModel.deleteAllLocalData()

        XCTAssertTrue(viewModel.acceptedDisclaimer)
        XCTAssertTrue(viewModel.acceptedPrivacySummary)
        XCTAssertTrue(viewModel.deletionCompleted)
        XCTAssertNil(viewModel.deletionErrorMessage)
        XCTAssertEqual(store.deleteAllCallCount, 1)
    }

    func testDeleteAllLocalDataFailureSurfacesError() {
        let store = MockLocalDataStore(shouldFailDeleteAll: true)
        let viewModel = RootViewModel(localDataStore: store)

        viewModel.deleteAllLocalData()

        XCTAssertFalse(viewModel.deletionCompleted)
        XCTAssertEqual(viewModel.deletionErrorMessage, "Local data could not be deleted. Try again from Settings.")
        XCTAssertEqual(store.deleteAllCallCount, 1)
    }

    private final class MockLocalDataStore: LocalUserDataDeleting {
        var deleteAllCallCount = 0
        var recordDeletionCallCount = 0
        private let shouldFailDeleteAll: Bool

        init(shouldFailDeleteAll: Bool = false) {
            self.shouldFailDeleteAll = shouldFailDeleteAll
        }

        func deleteAllLocalUserData() throws {
            deleteAllCallCount += 1
            if shouldFailDeleteAll {
                throw MockError.deleteFailed
            }
        }

        func recordSuccessfulDeletionCompletion() throws {
            recordDeletionCallCount += 1
        }
    }

    private enum MockError: Error {
        case deleteFailed
    }
}
