import SwiftUI

struct PrivacySummaryView: View {
    @ObservedObject var viewModel: RootViewModel

    var body: some View {
        ScreenScaffold(
            title: "Privacy Summary",
            subtitle: "The foundation is local, temporary, and optional."
        ) {
            VStack(alignment: .leading, spacing: 14) {
                Label("No account required for the basic match flow.", systemImage: "person.crop.circle.badge.checkmark")
                Label("Raw face media is not saved by default.", systemImage: "trash")
                Label("Derived profiles are saved only when you choose to save them.", systemImage: "lock")
                Label("Face processing must not identify people or infer sensitive traits.", systemImage: "eye.slash")
            }
            .font(.body)
            .accessibilityElement(children: .contain)

            NavigationLink(value: AppRoute.home) {
                Label("Continue", systemImage: "arrow.right.circle.fill")
                    .frame(maxWidth: .infinity)
            }
            .simultaneousGesture(TapGesture().onEnded { viewModel.acceptPrivacySummary() })
            .buttonStyle(.borderedProminent)
            .tint(.green)
            .controlSize(.large)
            .accessibilityLabel("Continue after privacy summary")
        }
    }
}
