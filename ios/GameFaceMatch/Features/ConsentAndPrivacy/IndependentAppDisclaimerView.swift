import SwiftUI

struct IndependentAppDisclaimerView: View {
    @ObservedObject var viewModel: RootViewModel

    var body: some View {
        ScreenScaffold(
            title: "Before You Start",
            subtitle: "A clear line keeps the app honest."
        ) {
            NoticePanel(
                title: "No official affiliation",
                message: "GameFace Match is an independent companion application and is not affiliated with, endorsed by, or sponsored by Electronic Arts, EA SPORTS, CLC, the NCAA, any college or university, Sony, Microsoft, or Nintendo. All referenced trademarks belong to their respective owners.",
                systemImage: "checkmark.seal"
            )
            NoticePanel(
                title: "Manual guide only",
                message: viewModel.productExplanation,
                systemImage: "hand.raised"
            )
            NavigationLink(value: AppRoute.privacySummary) {
                Label("I Understand", systemImage: "checkmark.circle.fill")
                    .frame(maxWidth: .infinity)
            }
            .simultaneousGesture(TapGesture().onEnded { viewModel.acceptDisclaimer() })
            .buttonStyle(.borderedProminent)
            .tint(.green)
            .controlSize(.large)
            .accessibilityLabel("Accept independent app disclaimer")
        }
    }
}
