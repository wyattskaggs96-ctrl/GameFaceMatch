# FC 26 Face Matching MVP

Last updated: 2026-08-01

## Scope

The EA SPORTS FC 26 workflow is a separate human-in-the-loop recipe MVP. It does not use the College Football 27 catalog, production gates, or recommendation routes. It reads the research-only controls in `data/research/fc26/player_creator_research.json` and keeps FC 26 profile records under the FC 26 game identifier.

The MVP supports:

- selecting EA SPORTS FC 26 from the web app navigation;
- uploading front, three-quarter, and side-profile reference photos;
- local browser landmark analysis through the existing MediaPipe Face Landmarker provider when the reviewed local model asset is available;
- normalized proportional measurements;
- directional recipe suggestions for controls where a measurement can defensibly guide manual testing;
- manual editing, notes, reset, and tested states for every observed FC 26 control;
- local session-only FC 26 recipe profile saving without raw images;
- upload of FC 26 created-player screenshots for a proportional comparison pass;
- directional iteration suggestions.

## Non-goals

The MVP does not:

- identify a person;
- claim an exact likeness;
- claim scientific biometric precision;
- train a machine-learning model;
- call a paid or cloud face-recognition API;
- infer race, ethnicity, attractiveness, personality, health, or identity;
- invent FC 26 controls or preset meanings not present in the research data;
- promote FC 26 research observations into production catalog records.

## Architecture

Core logic lives in `web/lib/fc26/fc26-face-matching.ts`.

The user-facing workflow lives in `web/features/fc26/Fc26FaceMatchingMvp.tsx`.

The app exposes the workflow through the existing single-page navigation screen `fc26`. College Football 27 remains on the existing guided RGB capture and fail-closed production catalog flow.

## Data Flow

1. The user uploads front, three-quarter, and side-profile images.
2. The browser creates temporary object URLs for previews.
3. The local landmark provider attempts one-face landmark detection.
4. The image is validated for type, size, resolution, face count, face size, and approximate pose.
5. Measurements are calculated only from available local landmarks.
6. The recipe engine loads observed FC 26 controls from research data.
7. Controls receive either a directional suggestion or `manual_selection_required`.
8. The user edits and marks controls as accepted, tested, edited, or unresolved.
9. Saved FC 26 profiles are serialized to browser session storage as derived non-image data.
10. Uploaded FC 26 screenshots are measured the same way and compared to the reference measurements.

## Current Limitations

- FC 26 preset visual meanings are not fully cataloged, so the MVP does not select exact preset numbers from face measurements.
- The local MediaPipe model must be available in the built web assets for automatic landmarks; otherwise the UI remains honest and manual.
- Ear measurements are unavailable with the current reduced landmark set.
- RGB profile estimates are not depth, TrueDepth, or identity evidence.
- Screenshot comparison is cross-domain: human reference photos and game-rendered screenshots are not identical image domains.

## Manual Test Path

1. Open the web app.
2. Choose `FC 26 recipe`.
3. Upload one front photo, one three-quarter photo, and one side-profile photo.
4. Review blockers and advisory warnings.
5. Run `Analyze face and generate recipe`.
6. Edit at least one FC 26 recipe control and mark it tested.
7. Save the FC 26 profile.
8. Upload at least one FC 26 screenshot.
9. Run screenshot comparison.
10. Remove all photos and verify previews disappear while the saved non-image profile remains.
