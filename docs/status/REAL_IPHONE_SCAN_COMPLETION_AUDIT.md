# Real iPhone Scan Completion Audit

Audit date: 2026-08-13

Prompt: GFM | Q06 | PROMPT 134 | PHASE 01 | Prove and repair real-iPhone scan completion

Outcome: PARTIAL - OWNER DEVICE TEST REQUIRED

## Executive Finding

The guided scan implementation remains a browser RGB capture flow, not Face ID, TrueDepth, ARKit, depth capture, or biometric authentication. The current code can be inspected and regression-tested for camera startup, portrait runtime checks, object-fit preview projection, front-camera mirroring, pose-axis sign handling, readiness gates, sector assignment, stability dwell, lost-face recovery, and no timer-only completion. It cannot be truthfully marked complete for production until a real iPhone Safari run proves that a normal face-on portrait selfie posture completes the scan.

No code change in this audit weakens production catalog gates, privacy gates, fixture isolation, or raw-media deletion defaults.

## Capture Pipeline Map

1. Buddy Trial consent gates the scan entry before the customer route opens the guided capture screen.
2. `BrowserCameraService` requests a local RGB preview with `facingMode: user` and no audio.
3. Camera startup requires HTTPS or localhost.
4. The active video stream is attached to the visible preview.
5. The local MediaPipe face landmark provider runs from local model assets.
6. Positioning guidance evaluates exactly one face, visible preview projection, distance, center, lighting, blur, expression, and required landmark availability.
7. Positioning auto-advances only when the stream is active, all readiness gates pass, no camera error exists, and runtime orientation is not landscape.
8. Circular scan progress evaluates yaw/pitch sectors from local face pose and projected preview face size/center.
9. Progress requires accepted, stable, distinct coverage samples; rejected, duplicate, lost-face, or unstable samples do not complete the scan.
10. Accepted live frames are converted into the existing five-angle capture slots.
11. Completion routes into the existing Buddy Trial continuation state without creating production recommendations unless the catalog gate permits it.

## Coordinate And Pose Findings

- Front-camera preview is mirrored for display.
- Captured stills are stored unmirrored.
- Face size and centering are evaluated against the visible object-fit cover preview, not the raw camera buffer.
- Portrait cover cropping is explicitly projected before center/distance gates are applied.
- Current pose signs are deterministic in tests:
  - positive yaw maps right;
  - positive pitch maps down;
  - positive roll maps right tilt;
  - roll alone does not advance a circular sector.
- Circular scan sectors use yaw plus pitch. They do not intentionally require phone roll or phone steering.

## Root Causes Proven

- Automated checks can prove no timer-only completion in the tested guided scan state machine.
- Automated checks can prove face-lost samples reset sector stability before reacquisition can count.
- Automated checks can prove the normal readiness/progress path uses projected preview geometry and mirror handling.
- Automated checks can prove the development diagnostics are opt-in and unavailable in production.

## Root Causes Still Suspected But Unproven

- Real iPhone Safari may report camera dimensions, visual viewport, MediaPipe pose, or camera labels differently from Chromium simulation.
- The owner-reported unnatural phone angle may come from real-device pose estimates, face-size thresholds, center thresholds, Safari video orientation, lighting, or live model performance.
- The current circular sector set has no separate upper-center sector; forehead/hairline support comes from upper-left, center, and upper-right. This is documented behavior but still needs real-device confirmation that it feels natural.
- Automated tests cannot prove real camera permission, Safari browser chrome layout, live MediaPipe performance, low-light behavior, or natural hand posture.

## Diagnostic Tooling

A development-only diagnostic panel is available inside `Scan details` when the scan URL includes:

```text
?scanDiagnostics=1
```

The diagnostic summary includes:

- secure-context state;
- likely iPhone Safari detection;
- portrait/runtime state;
- viewport size;
- stream and camera status;
- video intrinsic/rendered dimensions;
- track width/height/frame-rate/facing mode;
- front-camera mirror state;
- object-fit cover crop;
- readiness gate pass/fail state;
- blocking and advisory codes;
- live coverage status;
- accepted sector;
- rejection reasons;
- accepted frame count;
- first/second pass percentage;
- coarse face count/provider state;
- coarse center, distance, yaw, pitch, and roll buckets.

It does not include images, video, raw landmarks, landmark coordinates, embeddings, identity data, exact facial geometry, or raw biometric media.

## Owner Real-iPhone Test Protocol

Use a real physical iPhone in Safari. Do not use Chrome device emulation as proof.

1. Start the local development server and secure tunnel exactly as used for owner-review testing.
2. Open the Buddy Trial URL on the iPhone with `?scanDiagnostics=1` appended.
3. Confirm the pre-scan consent checkbox is present and the Continue button is disabled until checked.
4. Check the consent box.
5. Tap Continue guided scan.
6. Tap Get Started.
7. Tap Start Camera once.
8. Allow Safari camera permission when prompted.
9. Hold the phone upright in a normal portrait selfie position at comfortable Face ID-like distance.
10. Keep the phone itself steady and move your head, not the phone.
11. Confirm whether positioning reaches Ready without strange tilt or angle.
12. Continue through the circular scan using natural head movement.
13. Record whether the scan reaches completion.
14. If the scan fails or feels unnatural, open Scan details and copy the sanitized iPhone scan diagnostics.
15. Return the diagnostic JSON plus a short note describing what the user was doing.

## Exact Sanitized Evidence To Return After Failure

Return:

- the full copied sanitized diagnostic JSON;
- iPhone model;
- iOS version;
- Safari version if known;
- whether the test was on local Wi-Fi, cellular, or tunnel;
- whether camera permission was newly granted or already granted;
- lighting condition;
- whether the phone was held portrait and face-on;
- the exact visible instruction or rejection reason at the moment of failure;
- whether progress stopped at positioning, early circular scan, a specific sector, or completion transition.

Do not return screenshots of a real face unless separately and explicitly approved. Do not send raw video or photos for this diagnostic step.

## Production Status

Production remains blocked on real-device proof for iPhone Safari scan completion. The current result is suitable for the next owner-device test but not enough to claim production-ready capture.
