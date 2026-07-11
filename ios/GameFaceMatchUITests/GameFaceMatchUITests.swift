import XCTest

final class GameFaceMatchUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testWelcomeAndDisclaimerFlow() throws {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.staticTexts["GameFace Match"].waitForExistence(timeout: 5))
        app.buttons["Build Me in College Football 27"].tap()
        XCTAssertTrue(app.staticTexts["Before You Start"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Manual guide only"].exists)
    }
}
