import SwiftUI

struct DeviceCapabilityStatusView: View {
    let service: CaptureCapabilityProviding
    @State private var status: CaptureCapabilityStatus = .unknown
    @State private var isLoading = true

    var body: some View {
        ScreenScaffold(
            title: "Device Status",
            subtitle: "No capture session starts from this screen."
        ) {
            if isLoading {
                ProgressView("Checking device capability...")
                    .accessibilityLabel("Checking device capability")
            } else {
                NoticePanel(title: status.title, message: status.userMessage, systemImage: status.systemImage)
            }
            NavigationLink(value: AppRoute.gameCatalogStatus) {
                Label("View Catalog Status", systemImage: "list.bullet.rectangle")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .controlSize(.large)
        }
        .task {
            status = service.currentStatus()
            isLoading = false
        }
    }
}

private extension CaptureCapabilityStatus {
    var title: String {
        switch self {
        case .trueDepthAndARFaceTrackingSupported: "Premium scan capable"
        case .unsupported: "Depth scan unsupported"
        case .cameraPermissionRequired: "Camera permission required"
        case .unavailableInSimulator: "Simulator unavailable"
        case .cameraUnavailable: "Camera unavailable"
        case .unknown: "Capability unknown"
        case .error: "Capability check failed"
        }
    }

    var userMessage: String {
        switch self {
        case .trueDepthAndARFaceTrackingSupported:
            "This device reports TrueDepth and AR face-tracking support."
        case .unsupported:
            "This device may support only a standard camera scan. Results may be less precise around the jaw, nose profile, and side of the face."
        case .cameraPermissionRequired:
            "Camera permission is needed before a future capture session can begin."
        case .unavailableInSimulator:
            "The simulator cannot provide real camera, TrueDepth, or AR face-tracking capability."
        case .cameraUnavailable:
            "No usable camera is currently available."
        case .unknown:
            "The app could not determine capability yet."
        case .error(let message):
            message
        }
    }

    var systemImage: String {
        switch self {
        case .trueDepthAndARFaceTrackingSupported: "checkmark.circle"
        case .unsupported: "exclamationmark.triangle"
        case .cameraPermissionRequired: "camera.badge.ellipsis"
        case .unavailableInSimulator: "iphone.slash"
        case .cameraUnavailable: "camera.fill"
        case .unknown: "questionmark.circle"
        case .error: "xmark.octagon"
        }
    }
}
