import SwiftUI

struct GameCatalogStatusView: View {
    let catalogNotice: String

    var body: some View {
        ScreenScaffold(
            title: "Catalog Status",
            subtitle: "Production recommendations stay locked until records are verified from the shipping game."
        ) {
            NoticePanel(title: "College Football 27", message: catalogNotice, systemImage: "lock")
            NoticePanel(
                title: "Validation rule",
                message: "An empty production catalog is valid. An invented production catalog is not.",
                systemImage: "checkmark.shield"
            )
        }
    }
}
