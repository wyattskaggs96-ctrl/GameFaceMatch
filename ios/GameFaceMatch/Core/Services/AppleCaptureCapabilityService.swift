import ARKit
import AVFoundation
import Foundation

protocol CaptureCapabilityProviding {
    func currentStatus() -> CaptureCapabilityStatus
}

struct AppleCaptureCapabilityService: CaptureCapabilityProviding {
    func currentStatus() -> CaptureCapabilityStatus {
        #if targetEnvironment(simulator)
        return .unavailableInSimulator
        #else
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .notDetermined:
            return .cameraPermissionRequired
        case .denied:
            return .cameraPermissionDenied
        case .restricted:
            return .cameraPermissionRestricted
        case .authorized:
            break
        @unknown default:
            return .unknown
        }

        guard AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front) != nil else {
            return .cameraUnavailable
        }

        if ARFaceTrackingConfiguration.isSupported {
            return .trueDepthAndARFaceTrackingSupported
        }
        return .unsupported
        #endif
    }
}
