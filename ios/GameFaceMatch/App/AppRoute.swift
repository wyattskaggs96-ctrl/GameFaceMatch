import Foundation

enum AppRoute: String, CaseIterable, Hashable, Identifiable, Sendable {
    case disclaimer
    case privacySummary
    case home
    case beginScan
    case preparationChecklist
    case deviceCapability
    case gameCatalogStatus
    case resultsUnavailable
    case savedBuilds
    case privacyCenter
    case deleteLocalData
    case settings

    var id: String { rawValue }
}
