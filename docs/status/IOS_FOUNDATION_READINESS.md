# iOS Foundation Readiness Report

Last reviewed: 2026-07-13

## Summary

The native iOS project is present at `ios/GameFaceMatch.xcodeproj` and remains a preserved future premium TrueDepth capture client. It is not the active MVP; the responsive web app under `web/` is still the active customer-facing implementation.

The iOS foundation builds and its current unit/UI tests pass on the available iPhone 17 Pro simulator with iOS 26.5. The native code does not start a real capture session, does not perform matching, and does not expose invented College Football 27 records.

## Build Health

- Xcode: 26.6, build 17F113
- Available iOS SDK: iOS 26.5 and iOS Simulator 26.5
- Project: `ios/GameFaceMatch.xcodeproj`
- Scheme: `GameFaceMatch`
- App target: `GameFaceMatch`
- Unit-test target: `GameFaceMatchTests`
- UI-test target: `GameFaceMatchUITests`
- Deployment target: iOS 18.0
- Build status: passed on `platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5`

Observed Xcode warnings:

- `IDERunDestination: Supported platforms for the buildables in the current scheme is empty.`
- `Metadata extraction skipped. No AppIntents.framework dependency found.`
- `IDELaunchParametersSnapshot: no debugger version` during UI tests.

These warnings did not fail the build or tests.

## SwiftUI Structure

The native app uses a small SwiftUI navigation shell:

- `App/RootNavigationView.swift`
- `App/RootViewModel.swift`
- `Features/Welcome`
- `Features/ConsentAndPrivacy`
- `Features/Capture`
- `Features/CaptureCapability`
- `Features/CapturePreparation`
- `Features/BuildGuide`
- `Features/Results`
- `Features/SavedBuilds`
- `Features/PrivacyCenter`
- `Features/Settings`

The flow is intentionally foundational: welcome, independent-app disclaimer, privacy summary, home, begin scan, preparation, capability status, catalog status, unavailable results, saved-build empty state, privacy center, delete confirmation, and settings.

## Camera Permission Flow

The project defines a camera usage description through generated Info.plist settings:

`GameFace Match needs camera access only when you choose to start a future capture flow.`

`AppleCaptureCapabilityService` checks camera authorization without starting a capture session. The review separated the native permission states so the app can distinguish:

- Permission not determined: `cameraPermissionRequired`
- Permission denied: `cameraPermissionDenied`
- Permission restricted: `cameraPermissionRestricted`
- Permission authorized but no front camera: `cameraUnavailable`

No camera permission request UI or real capture session is implemented yet.

## TrueDepth and ARKit Capability Detection

The native service uses Apple frameworks only:

- `AVFoundation` for camera authorization and front-camera availability
- `ARKit` through `ARFaceTrackingConfiguration.isSupported`

The simulator correctly reports `unavailableInSimulator`, and the capability status screen clearly says no capture session starts from that screen.

## Shared StandardFaceProfile Contract

The native project has a `StandardFaceProfile` model in `Core/Domain/FaceProfileModels.swift` with Codable, Equatable, and Sendable conformance.

Current limitation:

- The iOS profile model is a compact initial foundation and is not fully aligned with the richer web `StandardFaceProfile` contract, which includes profile contract version, confidence summaries, supporting-frame details, model versions, deletion state, source angle availability, measurement availability, supporting poses, measurement source, and depth flags fixed by capture mode.

Recommended future action:

- Align native and web profile contracts through a shared schema/migration pass before implementing native capture or native-to-web profile exchange.

## Local Deletion Behavior

`LocalFilePrivacyStore` supports:

- Temporary session record storage
- Temporary session media deletion
- Derived profile save/load/delete
- Delete all local user data
- Deletion completion marker recording

This review wired the SwiftUI delete confirmation through the existing local deletion boundary instead of only toggling in-memory UI state. `RootViewModel` now accepts a `LocalUserDataDeleting` dependency, uses `LocalFilePrivacyStore.applicationSupportStore()` by default, records success, and exposes a local deletion error message on failure.

Raw face media persistence is still not implemented and remains off by default.

## Catalog Gate Behavior

The native bundled `Resources/catalog_manifest.json` is a production-class empty catalog:

- `identifier`: `empty-production`
- `isProduction`: `true`
- `items`: `[]`

`CollegeFootball27Adapter` validates the manifest and fails closed with:

`Verified College Football 27 catalog not loaded.`

No native production recommendations can be produced with the current empty catalog.

## Unit and UI Test Health

Current unit coverage includes:

- FacialMeasurement Codable round trip
- Empty production catalog validity
- Duplicate stable-ID rejection
- Unverified production-record rejection
- Fixture-record rejection
- Missing metadata rejection
- Placeholder-label rejection
- Malformed measurement rejection
- CollegeFootball27Adapter catalog-unavailable behavior
- Temporary-session deletion
- Saved-profile deletion
- Delete-all local data behavior
- RootViewModel consent and deletion success/failure behavior

Current UI coverage includes:

- Welcome screen launch
- Navigation into the independent-app disclaimer
- Required manual-guide disclaimer text

## What Was Safely Improved

- Distinct native camera permission statuses for required, denied, and restricted states.
- RootViewModel deletion now calls the local deletion service through dependency injection.
- Delete confirmation now performs actual local deletion through the existing storage abstraction.
- Privacy center can show deletion failure state.
- Unit tests now cover successful and failed RootViewModel deletion behavior.

## Deferred Native Work

Do not start these until the web MVP and verified catalog path require them:

- Full native capture rewrite
- ARKit session startup
- TrueDepth frame processing
- Native landmark extraction
- Native StandardFaceProfile schema migration
- Native production matching
- Native screenshot refinement
- Native paid feature gating
- App Store/TestFlight packaging

## Commands Run

- `git status --short`
- `xcodebuild -version`
- `xcodebuild -showsdks`
- `xcodebuild -list -project ios/GameFaceMatch.xcodeproj`
- `plutil -p ios/GameFaceMatch/Resources/catalog_manifest.json`
- `xcodebuild build -project ios/GameFaceMatch.xcodeproj -scheme GameFaceMatch -destination "platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5" -derivedDataPath build-artifacts/DerivedData`
- `xcodebuild test -project ios/GameFaceMatch.xcodeproj -scheme GameFaceMatch -destination "platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5" -derivedDataPath build-artifacts/DerivedData -only-testing:GameFaceMatchTests`
- `xcodebuild test -project ios/GameFaceMatch.xcodeproj -scheme GameFaceMatch -destination "platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5" -derivedDataPath build-artifacts/DerivedData -only-testing:GameFaceMatchUITests`

## Readiness Verdict

Native iOS foundation: ready to preserve and continue later with limitations.

The project is healthy as a future native premium-capture foundation, but it is not ready for native beta capture. The active MVP remains the responsive web application.
