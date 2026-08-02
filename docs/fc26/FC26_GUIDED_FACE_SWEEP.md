# FC 26 Guided Face Sweep

Last updated: 2026-08-01

## Purpose

The guided face sweep is the recommended FC 26 MVP reference-capture path. The user records or uploads one short video while the subject keeps their head still and the camera moves slowly from one face profile, through the front, to the opposite profile.

This is not photogrammetry, a textured 3D mesh, identity recognition, medical measurement, or TrueDepth capture. It is a local RGB frame-selection workflow that produces directional recipe guidance.

## Capture Instructions

The UI instructs the user to:

- keep a neutral expression;
- look straight ahead;
- keep the head still;
- remove hats and sunglasses;
- use even lighting;
- keep hair away from the jaw and ears when practical;
- move the phone instead of turning the subject's head;
- start at one profile;
- move slowly through the front;
- finish at the opposite profile;
- keep the whole face visible throughout.

Recommended duration is 15-25 seconds. Shorter recordings warn the user but may remain usable when the five required views are covered.

## Local Processing

Processing happens in the browser using the existing local MediaPipe Face Landmarker provider. The app:

1. reads video metadata;
2. validates file type, size, duration, and resolution;
3. samples a bounded set of frames instead of analyzing every frame;
4. downscales analysis canvases where practical;
5. runs local landmark detection on sampled frames;
6. estimates yaw, pitch, roll, face-box size, landmark confidence, blur, and duplicate similarity;
7. classifies candidate frames into required view buckets;
8. keeps temporary thumbnail object URLs only for user review.

No remote face-processing API is used.

## Required Views

The sweep attempts to select:

- left profile;
- left three-quarter;
- front;
- right three-quarter;
- right profile.

Each selected frame records timestamp, estimated pose, confidence, quality warnings, and view label. Missing views are shown explicitly. The app does not silently substitute an unrelated angle.

## Frame Selection Rules

Candidate frames are rejected or downgraded for:

- no detected face;
- multiple detected faces;
- unavailable landmark detection;
- very small face size;
- severe blur;
- unusable yaw classification;
- large pitch or roll warnings;
- near-duplicate neighboring samples.

The selector prefers sharp, centered, high-confidence frames with pose close to each target view.

## Measurement Fusion

The sweep reuses the FC 26 measurement system.

Front-dominant measurements use the front frame and record three-quarter support when present. Profile-supported measurements use profile evidence for nose and chin projection estimates. Measurements include contributing views, confidence, warnings, fusion method, and whether the value is reliable enough for recommendation use.

When left and right profile evidence disagree significantly, the workflow records a capture-quality or asymmetry warning instead of hiding the disagreement.

## User Review

After processing, the user can:

- approve all selected frames;
- remove a selected frame;
- replace a selected frame with another candidate from a compact timeline;
- retry the recording;
- upload a different video;
- switch to the three-photo fallback.

The UI does not expose hundreds of raw frames.

## Privacy

Raw video bytes and extracted image frames are not stored in FC 26 profile JSON. Saved profiles contain derived measurements, selected-frame metadata, recipe state, notes, and timestamps only.

The user can remove the active video and extracted frame previews. Object URLs are revoked when media is removed, retried, or the page unmounts.

## Manual QA

Manual QA should verify:

1. Record a 15-25 second sweep in a modern browser.
2. Upload an existing MP4, MOV, or WebM sweep.
3. Confirm selected frames cover all five view buckets.
4. Replace one selected frame from the compact timeline.
5. Remove the video and extracted frames.
6. Switch to the three-photo fallback and generate a recipe.
7. Save both guided-sweep and three-photo FC 26 profiles.
8. Confirm saved JSON contains no `blob:`, `data:image`, `base64`, or raw video payloads.
