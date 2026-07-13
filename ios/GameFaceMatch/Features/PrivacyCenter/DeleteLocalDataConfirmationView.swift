import SwiftUI

struct DeleteLocalDataConfirmationView: View {
    @ObservedObject var viewModel: RootViewModel
    @State private var showConfirmation = false

    var body: some View {
        ScreenScaffold(
            title: "Delete Data",
            subtitle: "Deletion requires confirmation."
        ) {
            NoticePanel(
                title: "Delete all local user data",
                message: "This clears temporary session files, derived profiles, saved builds, screenshots, and records completion locally.",
                systemImage: "trash"
            )
            Button(role: .destructive) {
                showConfirmation = true
            } label: {
                Label("Delete All Local Data", systemImage: "trash.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .accessibilityLabel("Delete all local user data")
            .confirmationDialog("Delete all local user data?", isPresented: $showConfirmation, titleVisibility: .visible) {
                Button("Delete Local Data", role: .destructive) {
                    viewModel.deleteAllLocalData()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This cannot be undone.")
            }
        }
    }
}
