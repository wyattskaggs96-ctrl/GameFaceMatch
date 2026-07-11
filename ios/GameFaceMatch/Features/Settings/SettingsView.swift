import SwiftUI

struct SettingsView: View {
    var body: some View {
        ScreenScaffold(
            title: "Settings",
            subtitle: "Prototype settings are intentionally small."
        ) {
            NoticePanel(
                title: "Mode",
                message: "iPhone-only SwiftUI foundation. No backend, authentication, analytics, cloud storage, or paid services are connected.",
                systemImage: "gearshape"
            )
        }
    }
}
