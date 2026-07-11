import SwiftUI

struct CapturePreparationChecklistView: View {
    private let checklist = [
        "Use soft light facing you.",
        "Remove glasses, hats, helmets, masks, and large earrings.",
        "Pull hair away from your cheeks, forehead, and ears when practical.",
        "Keep a neutral expression with relaxed shoulders.",
        "Use a simple background and clean the camera lens.",
        "Scan only yourself or someone who has given permission."
    ]

    var body: some View {
        ScreenScaffold(
            title: "Capture Prep",
            subtitle: "These steps improve the future scan without excluding users who need accommodations."
        ) {
            ForEach(checklist, id: \.self) { item in
                Label(item, systemImage: "checkmark.circle")
                    .font(.body)
            }
            NavigationLink(value: AppRoute.deviceCapability) {
                Label("Check Device", systemImage: "iphone.gen3")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.green)
            .controlSize(.large)
            .accessibilityLabel("Check device capability")
        }
    }
}
