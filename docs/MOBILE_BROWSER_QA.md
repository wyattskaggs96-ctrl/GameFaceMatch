# Mobile Browser QA

GameFace Match is a responsive web MVP. Mobile browser QA must validate guided RGB capture honestly and must not describe browser capture as equivalent to native TrueDepth, ARKit, depth geometry, or 3D reconstruction.

## Current Automated Checks Completed

- Secure-context camera messaging exists for HTTPS or localhost.
- Camera capability states are unit-tested without physical hardware.
- Front and rear camera device selection requests are unit-tested with synthetic `MediaDevices` objects.
- Permission-denied behavior is covered in Playwright without a real camera.
- Upload fallback is covered for all five required angles using generated geometric PNG images.
- Unsupported image format, undersized image, duplicate image, and selective retake are covered.
- HEIC/HEIF receives an explicit unsupported-state validation message.
- Large-image downscale dimensions are unit-tested before analysis.
- Object URL cleanup paths are covered by capture and deletion tests.
- Production build runs a bundle guard against test fixtures and invented game-data tokens.
- E2E viewports include desktop, current iPhone-sized, and Android-sized layouts.
- Reduced-motion behavior is covered with Playwright media emulation.
- CSS includes safe-area inset handling, 48px touch targets, mobile wrapping, and landscape guidance.

## Manual Real-Device Checks Wyatt Must Perform

Use a real iPhone first, then Android Chrome.

1. Open the app from a secure HTTPS origin.
2. Confirm Safari/Chrome camera prompt appears only after tapping Start camera.
3. Deny camera permission and confirm upload fallback remains usable.
4. Reset permission and confirm the camera can start again.
5. Confirm the default camera is the front camera where the browser allows it.
6. Tap Switch camera and confirm the browser switches cameras or provides a recoverable state.
7. Confirm front-camera preview is mirrored like a selfie view.
8. Capture a still and confirm the captured preview is not mirrored.
9. Rotate between portrait and landscape and confirm portrait guidance remains visible.
10. Lock the phone, unlock it, and confirm the session shows recovery guidance and camera can restart.
11. Background the browser, return to it, and confirm camera tracks stop and restart cleanly.
12. Use browser back during capture and confirm no camera stream remains active.
13. Refresh during active capture and confirm the browser warns about the active session.
14. Upload JPEG, PNG, WebP, HEIC, and HEIF from camera roll.
15. Confirm HEIC/HEIF is rejected honestly unless the browser converts it before upload.
16. Upload a large camera-roll image and confirm the UI remains responsive.
17. Open the keyboard on attribute fields and confirm the visual viewport does not hide active controls.
18. Toggle reduced motion at the OS level and confirm the UI remains usable.
19. Toggle airplane mode or lose network and confirm the offline notice appears without upload claims.
20. Delete active session and delete all local data from Privacy Center.

## HTTPS Preview Required

These cannot be completed from an insecure LAN URL:

- iPhone Safari camera prompt behavior.
- Android Chrome camera prompt behavior on a non-localhost mobile URL.
- Persistent site permission reset behavior.
- Secure-context camera API availability.
- Add-to-home-screen display-mode checks.

Use a temporary HTTPS preview deployment or a trusted local HTTPS tunnel only after owner approval. Do not connect analytics, payments, auth, databases, or media upload services for this QA pass.

## Cannot Be Validated Reliably In Simulators

- Real iPhone camera switching.
- Safari lock-screen interruption behavior.
- Camera permission reset from iOS Settings.
- Camera-roll HEIC behavior from actual device photos.
- Low-memory tab discard and restoration.
- Hardware safe-area behavior across notches and Dynamic Island shapes.
- Thermal throttling or long camera-session stability.

## Development-Only QA Status Page

In development builds, open the `Mobile QA` navigation item. It displays only non-sensitive browser readiness signals:

- Secure context.
- Online/offline state.
- Camera API availability.
- Reduced-motion preference.
- Standalone display mode.
- Layout and visual viewport size.
- Orientation.
- Max touch points.

The page does not display uploaded images, face measurements, profile attributes, catalog fixtures, or saved builds.

