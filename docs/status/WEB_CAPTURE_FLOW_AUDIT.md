# Web Capture Flow Audit

Last reviewed: 2026-07-13

## Scope

This audit covers the active responsive web MVP capture flow under `web/`. The web flow uses guided RGB camera stills or local image upload fallback only. It must not claim native iPhone TrueDepth, ARKit depth geometry, 3D reconstruction, identity recognition, or advanced facial analysis.

## Implemented

- Preparation checklist covers posture, glasses/headwear, hair away from face, even front lighting, neutral expression, one-person framing, distance, portrait orientation, no filters, motion avoidance, and lens cleaning.
- The required capture plan is five RGB images: straight-on, left 45-degree, right 45-degree, left profile, and right profile.
- The web capture state machine tracks five required views plus optional slightly elevated front, slightly lowered front, hairline detail, and facial-hair detail views.
- Completion, quality failure, retake requests, per-view abandonment, recovery, and optional-view skips are tracked per view so one failed view does not force a full restart.
- Per-angle instructions distinguish front, three-quarter, and profile views.
- Browser capability panel distinguishes secure context, camera API support, permission state, camera availability, matching camera availability, and upload fallback.
- Permission recovery copy covers iPhone Safari and Android Chrome reset paths.
- Camera preview prefers front camera when available, supports camera switching, mirrors the preview for selfie view, and stores captured stills unmirrored.
- Live local guidance can report one face, zero faces, multiple faces, distance, centering, head direction, blink, mouth open, strong expression, motion, lighting, blur, pose reached, and steady hold when local landmarks are available.
- Live local quality scoring reports a configurable 0-100 browser guidance score with separate blocking and advisory signals for face found, multiple faces, face size, centering, pose, blur, exposure, lighting imbalance, occlusion likelihood, expression neutrality, and required-region visibility.
- Upload fallback exists for every required angle.
- HEIC/HEIF is rejected with an honest unsupported-state message.
- Quality review supports blocking failures, advisory messages, manual confirmations, selective retake, replace upload, remove, and continue only after blocking checks resolve.
- Camera tracks and temporary object URLs are cleaned up on stop, retake, removal, cancellation, and interruption paths covered by automated tests.

## Honest Limitations

- Browser RGB capture is lower precision than a future native TrueDepth capture path.
- Face centering, expression, head pose, and one-face guidance depend on local landmark availability and browser support.
- When local landmarks are unavailable, the flow relies on manual confirmations and quality checks rather than fabricating results.
- Real iPhone Safari and Android Chrome camera permission recovery, camera switching, lock-screen interruption, and camera-roll HEIC behavior still require manual device QA from an HTTPS origin.

## Current Improvement Notes

- The capture UI now makes the one-face requirement, neutral-expression expectation, lighting guidance, distance guidance, front/three-quarter/profile plan, selective retake behavior, permission recovery, unsupported-browser fallback, and RGB-only limitations visible before capture completion.
- No production College Football 27 catalog data, matching behavior, or external upload behavior changed during this audit.
