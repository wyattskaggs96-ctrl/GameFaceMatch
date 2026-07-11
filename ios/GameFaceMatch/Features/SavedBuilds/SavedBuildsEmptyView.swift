import SwiftUI

struct SavedBuildsEmptyView: View {
    var body: some View {
        ScreenScaffold(
            title: "Saved Builds",
            subtitle: "Saved builds will appear here after the user explicitly chooses to save derived results."
        ) {
            NoticePanel(
                title: "Nothing saved",
                message: "No saved builds are on this device.",
                systemImage: "tray"
            )
        }
    }
}
