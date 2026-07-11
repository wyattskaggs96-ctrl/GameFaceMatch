import SwiftUI

struct BeginScanView: View {
    @ObservedObject var viewModel: RootViewModel

    var body: some View {
        ScreenScaffold(
            title: "Begin Scan",
            subtitle: "This build prepares the flow only. It does not start a real face-capture session yet."
        ) {
            NoticePanel(title: "What this does", message: viewModel.productExplanation, systemImage: "figure.run")
            NoticePanel(title: "Current limit", message: viewModel.catalogNotice, systemImage: "exclamationmark.triangle")
            VStack(spacing: 12) {
                NavigationLink(value: AppRoute.preparationChecklist) {
                    Label("Capture Preparation Checklist", systemImage: "checkmark.circle")
                        .frame(maxWidth: .infinity)
                }
                NavigationLink(value: AppRoute.deviceCapability) {
                    Label("Device Capability Status", systemImage: "iphone")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.bordered)
            .controlSize(.large)
        }
    }
}
