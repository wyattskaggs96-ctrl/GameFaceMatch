import SwiftUI

struct PrivacyCenterView: View {
    @ObservedObject var viewModel: RootViewModel

    var body: some View {
        ScreenScaffold(
            title: "Privacy Center",
            subtitle: "Local controls for temporary sessions, derived profiles, and saved builds."
        ) {
            NoticePanel(
                title: "Default retention",
                message: "Raw face media is not persisted by default. Derived profile storage is local and optional.",
                systemImage: "lock"
            )
            NavigationLink(value: AppRoute.deleteLocalData) {
                Label("Delete Local Data", systemImage: "trash")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .tint(.red)
            .controlSize(.large)
            .accessibilityLabel("Delete local data")
            if viewModel.deletionCompleted {
                Label("Deletion completion recorded.", systemImage: "checkmark.circle")
                    .foregroundStyle(.green)
                    .accessibilityLabel("Deletion completion recorded")
            }
        }
    }
}
