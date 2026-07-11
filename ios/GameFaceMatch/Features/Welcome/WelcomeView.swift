import SwiftUI

struct WelcomeView: View {
    @ObservedObject var viewModel: RootViewModel

    var body: some View {
        ScreenScaffold(
            title: "GameFace Match",
            subtitle: "Build a Road to Glory player with the closest available verified appearance settings."
        ) {
            NoticePanel(
                title: "Independent companion",
                message: viewModel.productExplanation,
                systemImage: "football"
            )
            NoticePanel(
                title: "Catalog status",
                message: viewModel.catalogNotice,
                systemImage: "exclamationmark.triangle"
            )
            NavigationLink(value: AppRoute.disclaimer) {
                Label("Build Me in College Football 27", systemImage: "arrow.right.circle.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.green)
            .controlSize(.large)
            .accessibilityLabel("Build Me in College Football 27")
        }
    }
}
