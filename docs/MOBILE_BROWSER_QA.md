# Mobile Browser QA

GameFace Match is a responsive web MVP. Mobile browser QA must validate guided RGB capture honestly and must not describe browser capture as equivalent to native TrueDepth, ARKit, depth geometry, or 3D reconstruction.

## Current Automated Checks Completed

- Secure-context camera messaging exists for HTTPS or localhost.
- Camera capability states are unit-tested without physical hardware.
- Front and rear camera device selection requests are unit-tested with synthetic `MediaDevices` objects.
- Permission-denied behavior is covered in Playwright without a real camera.
- Upload fallback is covered for all five required angles using generated geometric PNG images.
- Unsupported image format, undersized image, duplicate image, and selective retake are covered.
- Local landmark guidance thresholds are unit-tested with synthetic landmark sequences for face not found, multiple faces, distance, centering, required pose, head direction, blink, mouth open, strong expression, motion, lighting, blur, regular hold timing, and extended hold timing.
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
9. With the reviewed local MediaPipe model installed, confirm live guidance appears after camera start and stays local.
10. Confirm guidance detects face not found, multiple faces, too close, too far, off-center, wrong head direction, blink, mouth open, strong expression, excessive motion, poor lighting, severe blur, pose reached, and pose held long enough.
11. Confirm the extended steady-hold option increases the hold time without blocking upload fallback.
12. Confirm guidance warnings do not prevent a user from using manual capture or upload fallback when safe.
13. Rotate between portrait and landscape and confirm portrait guidance remains visible.
14. Lock the phone, unlock it, and confirm the session shows recovery guidance and camera can restart.
15. Background the browser, return to it, and confirm camera tracks stop and restart cleanly.
16. Use browser back during capture and confirm no camera stream remains active.
17. Refresh during active capture and confirm the browser warns about the active session.
18. Upload JPEG, PNG, WebP, HEIC, and HEIF from camera roll.
19. Confirm HEIC/HEIF is rejected honestly unless the browser converts it before upload.
20. Upload a large camera-roll image and confirm the UI remains responsive.
21. Open the keyboard on attribute fields and confirm the visual viewport does not hide active controls.
22. Toggle reduced motion at the OS level and confirm the UI remains usable.
23. Toggle airplane mode or lose network and confirm the offline notice appears without upload claims.
24. Delete active session and delete all local data from Privacy Center.

## HTTPS Preview Required

These cannot be completed from an insecure LAN URL:

- iPhone Safari camera prompt behavior.
- Android Chrome camera prompt behavior on a non-localhost mobile URL.
- Persistent site permission reset behavior.
- Secure-context camera API availability.
- Add-to-home-screen display-mode checks.
- Remote Buddy Trial guided scan links. A texted trial URL must be HTTPS; otherwise Safari will block camera APIs before the user can complete the scan.

Use a temporary HTTPS preview deployment or a trusted local HTTPS tunnel only after owner approval. Do not connect analytics, payments, auth, databases, or media upload services for this QA pass.

## Prompt 109 iPhone Safari Hardening Checks

The web scan remains a browser RGB guided face scan, not Apple Face ID, TrueDepth, authentication, or depth capture.

Before handing a remote trial link to a buddy, verify:

1. The link opens on an HTTPS origin and the scan screen does not show the secure-context warning.
2. The phone is in portrait orientation; landscape should show clear guidance to rotate rather than shrinking controls below accessible size.
3. Reduced Motion keeps the screen usable and does not change the coverage-driven completion requirement.
4. Denied or blocked camera access shows iPhone Safari recovery steps and the assisted five-angle option.
5. Locking the phone or backgrounding Safari stops camera tracks, shows a session-restored message on return, and lets the user restart camera without losing completed stills.
6. Refresh during active capture warns the user when browser support allows it.
7. Airplane mode or weak network after capture does not imply upload; local capture remains available, but later catalog/resume checks are presented as needing network when applicable.
8. Returning to the Buddy Trial URL after a successful scan should resume from the stored scan-complete checkpoint instead of forcing a fresh scan.

## Cannot Be Validated Reliably In Simulators

- Real iPhone camera switching.
- Safari lock-screen interruption behavior.
- Camera permission reset from iOS Settings.
- Camera-roll HEIC behavior from actual device photos.
- MediaPipe live landmark performance, real-world pose accuracy, and steady-hold behavior across actual cameras.
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
