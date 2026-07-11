import SwiftUI

struct RootNavigationView: View {
    @StateObject var viewModel: RootViewModel

    var body: some View {
        NavigationStack {
            WelcomeView(viewModel: viewModel)
                .navigationDestination(for: AppRoute.self) { route in
                    switch route {
                    case .disclaimer:
                        IndependentAppDisclaimerView(viewModel: viewModel)
                    case .privacySummary:
                        PrivacySummaryView(viewModel: viewModel)
                    case .home:
                        HomeView(viewModel: viewModel)
                    case .beginScan:
                        BeginScanView(viewModel: viewModel)
                    case .preparationChecklist:
                        CapturePreparationChecklistView()
                    case .deviceCapability:
                        DeviceCapabilityStatusView(service: AppleCaptureCapabilityService())
                    case .gameCatalogStatus:
                        GameCatalogStatusView(catalogNotice: viewModel.catalogNotice)
                    case .resultsUnavailable:
                        ResultsUnavailableView(catalogNotice: viewModel.catalogNotice)
                    case .savedBuilds:
                        SavedBuildsEmptyView()
                    case .privacyCenter:
                        PrivacyCenterView(viewModel: viewModel)
                    case .deleteLocalData:
                        DeleteLocalDataConfirmationView(viewModel: viewModel)
                    case .settings:
                        SettingsView()
                    }
                }
        }
    }
}
