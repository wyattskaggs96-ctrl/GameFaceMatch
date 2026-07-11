# Real Device Test Matrix

The matrix separates automated coverage from manual real-device checks. Browser versions should be recorded on the day Wyatt tests them.

| Target | Priority | Automated coverage | Manual checks | HTTPS required | Simulator sufficient |
| --- | --- | --- | --- | --- | --- |
| Current iPhone Safari | Primary | iPhone-sized Playwright viewport, permission-denied fallback, upload flow, reduced motion | Camera prompt, front camera, switch camera, mirrored preview, lock-screen recovery, camera roll, HEIC/HEIF, safe area | Yes | No |
| Older supported iPhone size | Primary | Narrow mobile viewport behavior and wrapping | Small-screen touch targets, bottom nav, visual viewport with keyboard, portrait guidance | Yes | Partial layout only |
| iPad Safari | Advisory | Desktop/tablet responsive layout via desktop smoke | Camera prompt, split-screen behavior, orientation changes, file picker | Yes | Partial layout only |
| Current Android Chrome | Primary | Android-sized Playwright viewport, permission-denied fallback, upload flow | Camera prompt, camera switch, permission reset from site settings, camera roll, offline transition | Yes for remote URL | No |
| Desktop Safari | Advisory | Desktop responsive requirements in unit/CSS checks | Secure-context camera behavior, file upload, reduced motion, keyboard navigation | HTTPS or localhost | No |
| Desktop Chrome | Baseline | Desktop Chromium Playwright project and unit checks | Optional webcam smoke, browser back, refresh warning | localhost is sufficient | No webcam in CI |

## Required Evidence To Record

For each manual run, record:

- Date and tester.
- Device model.
- OS version.
- Browser and browser version.
- URL origin used.
- Whether HTTPS was used.
- Camera permission result.
- Front-camera result.
- Switch-camera result.
- Upload fallback result.
- HEIC/HEIF result.
- Background, lock, refresh, and back-navigation result.
- Deletion-flow result.
- Any screenshots of UI issues only; do not capture or store face photos in the repository.

## Pass Criteria

- The app never claims TrueDepth, ARKit, depth geometry, 3D reconstruction, or identity recognition for web capture.
- The user can complete the MVP through upload fallback even when camera permission is denied.
- Camera tracks stop when leaving, hiding, or interrupting the capture screen.
- Temporary object URLs are removed when images are retaken, removed, session-deleted, or all local data is deleted.
- HEIC/HEIF is either converted by the browser before the app receives it or rejected with the documented unsupported message.
- Production catalog remains empty and matching fails closed.

