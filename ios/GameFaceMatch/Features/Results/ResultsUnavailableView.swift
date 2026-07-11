import SwiftUI

struct ResultsUnavailableView: View {
    let catalogNotice: String

    var body: some View {
        ScreenScaffold(
            title: "Results",
            subtitle: "No match can be shown until the catalog has verified production records."
        ) {
            NoticePanel(title: "Results unavailable", message: catalogNotice, systemImage: "trophy")
            Text("No presets, labels, option numbers, sliders, hairstyles, facial-hair options, or menu paths are shown here because none have been verified.")
                .font(.body)
                .foregroundStyle(.secondary)
        }
    }
}
