import XCTest
@testable import GameFaceMatch

final class FacialMeasurementTests: XCTestCase {
    func testCodableRoundTrip() throws {
        let measurement = FacialMeasurement(
            value: 0.713,
            confidence: MeasurementConfidence(score: 0.91, label: .high),
            supportingFrameCount: 18,
            variance: 0.008,
            depthSupported: true,
            occlusionStatus: .none
        )

        let data = try JSONEncoder.catalogEncoder.encode(measurement)
        let decoded = try JSONDecoder.catalogDecoder.decode(FacialMeasurement.self, from: data)

        XCTAssertEqual(decoded, measurement)
    }
}
