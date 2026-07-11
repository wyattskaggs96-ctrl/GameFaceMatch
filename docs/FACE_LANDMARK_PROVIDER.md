# Face Landmark Provider

## Decision

GameFace Match uses Google MediaPipe Face Landmarker as the preferred browser-compatible landmark implementation for the web MVP.

Provider metadata recorded in code:

- Provider: Google MediaPipe Face Landmarker
- Package: `@mediapipe/tasks-vision`
- Installed package version: `0.10.35`
- Model: MediaPipe Face Landmarker task model
- Model source: `https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js`
- Local model path: `web/public/models/mediapipe/face_landmarker.task`
- Runtime license: Apache-2.0 for MediaPipe code/package
- Documentation/sample license: Apache-2.0 and CC-BY-4.0 under Google documentation terms

## Local-only processing

Face landmark extraction runs in the browser. The app does not upload captured images, generate identity embeddings, identify people, or infer sensitive traits.

The implementation is behind `FaceLandmarkProvider` in `web/lib/face-landmarks/`. Capture code depends on the interface, not MediaPipe-specific result shapes.

## Loading behavior

- The MediaPipe package is dynamically imported only when detection is requested.
- The app attempts a Web Worker path when the browser supports `Worker` and `createImageBitmap`.
- If worker processing is unavailable, the provider falls back to direct local browser processing.
- Initialization and detection use timeouts and return explicit unavailable or error reports.
- No fabricated landmarks are substituted when the model, worker, image, or browser capability is unavailable.

## Model asset and integrity strategy

The npm package includes the browser/WASM runtime but not the Face Landmarker model file. The model must be installed as a reviewed local asset before real production landmark extraction is enabled.

Required future publication steps:

1. Download the official Face Landmarker task model from the Google MediaPipe model source.
2. Place it at `web/public/models/mediapipe/face_landmarker.task`.
3. Record the exact download URL, model version, checksum, reviewer, and date.
4. Update provider metadata from `not bundled; local asset required` to the reviewed model version.
5. Verify production build and browser capture on real devices.

The app must not hot-link a remote model at runtime.

`npm run mediapipe:assets` copies MediaPipe WASM runtime files from `node_modules` into `web/public/mediapipe/` for local builds. That generated runtime copy is ignored by Git.

## Implemented local signals

When the reviewed model asset is available and the browser can run the provider, reports may include:

- Zero, one, or multiple detected faces
- Approximate face bounding box
- Core normalized facial landmarks
- Approximate head pose from MediaPipe transformation matrices when returned
- Eye-openness and mouth-openness estimates from landmark ratios
- Smile and strong-expression estimates from MediaPipe blendshapes when returned
- Confidence labels for these local quality signals

These are quality and matching-input signals, not identity recognition.

## Explicit non-goals

The web MVP does not:

- Upload face images
- Identify people
- Generate identity embeddings
- Infer ethnicity, health, personality, attractiveness, criminality, age, or other sensitive traits
- Claim TrueDepth, ARKit, depth geometry, 3D reconstruction, or native iPhone accuracy
- Create College Football 27 production recommendations without a verified production catalog

