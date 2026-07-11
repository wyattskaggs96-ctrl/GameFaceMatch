import Foundation

struct StandardFaceProfile: Codable, Equatable, Sendable {
    var profileVersion: String
    var capture: CaptureMetadata
    var qualityReport: CaptureQualityReport
    var geometry: GeometryProfile
    var appearance: AppearanceProfile
}

struct CaptureMetadata: Codable, Equatable, Sendable {
    var mode: CaptureMode
    var deviceModel: String
    var capturedAt: Date
    var overallQuality: Double
    var operatingSystemVersion: String
    var appVersion: String
}

enum CaptureMode: String, Codable, CaseIterable, Sendable {
    case iPhoneTrueDepthAssisted
    case iPhoneTrueDepthSelfScan
    case standardCamera
    case screenshotRefinement
    case unknown
}

enum CaptureCapabilityStatus: Equatable, Sendable {
    case trueDepthAndARFaceTrackingSupported
    case unsupported
    case cameraPermissionRequired
    case unavailableInSimulator
    case cameraUnavailable
    case unknown
    case error(String)
}

struct CaptureQualityReport: Codable, Equatable, Sendable {
    var overallScore: Double
    var issues: [CaptureQualityIssue]
    var isUsableForPrototype: Bool
}

struct CaptureQualityIssue: Codable, Equatable, Sendable, Identifiable {
    var id: String
    var severity: Severity
    var message: String

    enum Severity: String, Codable, Sendable {
        case advisory
        case blocking
    }
}

struct FacialMeasurement: Codable, Equatable, Sendable {
    var value: Double
    var confidence: MeasurementConfidence
    var supportingFrameCount: Int
    var variance: Double
    var depthSupported: Bool
    var occlusionStatus: OcclusionStatus

    enum Kind: String, Codable, CaseIterable, Sendable {
        case faceWidthRatio
        case faceLengthRatio
        case foreheadWidthRatio
        case templeWidthRatio
        case cheekboneWidthRatio
        case jawWidthRatio
        case jawAngleRatio
        case chinWidthRatio
        case chinHeightRatio
        case chinProjectionRatio
        case eyeSizeRatio
        case eyeSpacingRatio
        case eyeTiltRatio
        case browPositionRatio
        case noseLengthRatio
        case noseWidthRatio
        case noseProjectionRatio
        case mouthWidthRatio
        case lipProportionRatio
        case earHeightRatio
        case earProjectionRatio
        case facialSymmetryRatio
    }
}

struct MeasurementConfidence: Codable, Equatable, Sendable {
    var score: Double
    var label: Label

    enum Label: String, Codable, Sendable {
        case low
        case medium
        case high
        case unavailable
    }
}

enum OcclusionStatus: String, Codable, CaseIterable, Sendable {
    case none
    case partial
    case significant
    case unknown
}

struct GeometryProfile: Codable, Equatable, Sendable {
    var measurements: [FacialMeasurement.Kind: FacialMeasurement]
    var modelVersion: String
}

struct AppearanceProfile: Codable, Equatable, Sendable {
    var attributes: [AppearanceAttribute]
    var modelVersion: String
}

struct AppearanceAttribute: Codable, Equatable, Sendable, Identifiable {
    var id: String
    var category: Category
    var value: String
    var confidence: MeasurementConfidence
    var userConfirmed: Bool

    enum Category: String, Codable, Sendable {
        case hairColorFamily
        case hairTextureFamily
        case hairDensityEstimate
        case hairlineShape
        case facialHairPresence
        case facialHairRegionCoverage
        case facialHairColor
        case eyebrowColor
        case eyebrowThickness
        case skinPresentation
        case visibleMarks
    }
}
