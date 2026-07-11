import SwiftUI

struct HomeView: View {
    @ObservedObject var viewModel: RootViewModel

    var body: some View {
        ScreenScaffold(
            title: "Home",
            subtitle: "Start with readiness checks. Matching stays unavailable until a verified production catalog exists."
        ) {
            NoticePanel(title: "Catalog", message: viewModel.catalogNotice, systemImage: "list.bullet.rectangle")
            VStack(spacing: 12) {
                NavigationLink(value: AppRoute.beginScan) {
                    Label("Begin Scan", systemImage: "camera.viewfinder")
                        .frame(maxWidth: .infinity)
                }
                NavigationLink(value: AppRoute.gameCatalogStatus) {
                    Label("Game Catalog Status", systemImage: "checklist")
                        .frame(maxWidth: .infinity)
                }
                NavigationLink(value: AppRoute.resultsUnavailable) {
                    Label("Results", systemImage: "trophy")
                        .frame(maxWidth: .infinity)
                }
                NavigationLink(value: AppRoute.savedBuilds) {
                    Label("Saved Builds", systemImage: "tray")
                        .frame(maxWidth: .infinity)
                }
                NavigationLink(value: AppRoute.privacyCenter) {
                    Label("Privacy Center", systemImage: "lock.shield")
                        .frame(maxWidth: .infinity)
                }
                NavigationLink(value: AppRoute.settings) {
                    Label("Settings", systemImage: "gearshape")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.bordered)
            .controlSize(.large)
        }
    }
}
