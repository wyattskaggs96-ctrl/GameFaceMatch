import XCTest
@testable import GameFaceMatch

@MainActor
final class RootViewModelTests: XCTestCase {
    func testConsentAndDeletionStateTransitions() {
        let viewModel = RootViewModel()

        XCTAssertFalse(viewModel.acceptedDisclaimer)
        XCTAssertFalse(viewModel.acceptedPrivacySummary)
        XCTAssertFalse(viewModel.deletionCompleted)

        viewModel.acceptDisclaimer()
        viewModel.acceptPrivacySummary()
        viewModel.markDeletionCompleted()

        XCTAssertTrue(viewModel.acceptedDisclaimer)
        XCTAssertTrue(viewModel.acceptedPrivacySummary)
        XCTAssertTrue(viewModel.deletionCompleted)
    }
}
