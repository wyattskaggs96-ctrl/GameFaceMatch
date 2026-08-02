# Guided Circular Capture Real-Device QA

Status: NOT EXECUTED

This checklist covers the live guided circular scan after browser-camera, landmark, quality, and coverage signals are connected. Automated tests use synthetic signals only; this document must be completed on real devices before claiming real-device capture readiness.

## Devices

- iPhone Safari, current iOS
- Android Chrome, current stable
- Desktop Chrome with webcam
- Desktop Safari with webcam, where available

## Core Scenarios

1. Camera permission allowed from the existing permission flow.
2. Camera permission denied, then recovered through browser settings.
3. Exactly one face centered in the circular frame.
4. No face in frame.
5. More than one face in frame.
6. Face too small or too far away.
7. Face too large or too close.
8. Face off center.
9. Severe blur from movement.
10. Low light, harsh light, and uneven light.
11. First pass coverage of all eight regions.
12. First-pass completion feedback and haptic feedback where supported.
13. Second pass targets only weak or missing regions.
14. Selective retake of one weak area without restarting the scan.
15. Assisted five-angle fallback remains usable.
16. Cancel clears temporary capture data and stops camera tracks.
17. Reduced Motion shows calm UI without unnecessary animation.
18. Screen reader announces status changes and completion.

## Expected Evidence

- Device, browser, OS version, and date.
- Whether each scenario passed, failed, or needs follow-up.
- Notes about camera permission behavior.
- Notes about performance, heat, and memory during repeated retries.
- Confirmation that no raw video or temporary frame collection is saved in profile JSON.

## Pass Criteria

- Circular progress advances only after usable live frames are accepted.
- Rejected frames do not advance progress.
- Duplicate angles do not advance progress.
- The app gives one short actionable instruction at a time.
- The user can use assisted capture when the circular scan is not practical.
- The flow does not claim identity recognition, Face ID, TrueDepth, ARKit, or medical/scientific precision.
