# Known Limitations

Status: Current as of the web MVP private-beta readiness review.

## Catalog and Matching

- The production College Football 27 catalog currently contains zero verified records.
- No production top-three recommendations can be shown while the catalog is empty.
- No production build guide can be shown while verified menu instructions are absent.
- Synthetic fixtures exist only for tests and development-only checks.
- The app must fail closed with "Verified College Football 27 catalog not loaded." when no verified catalog exists.

## Landmark Processing

- The MediaPipe runtime assets are bundled locally, but the reviewed `face_landmarker.task` model asset is not currently present under `web/public/models/mediapipe/`.
- Real landmark extraction must remain unavailable until the local model asset is reviewed, checksummed, documented, and added.
- Synthetic landmark mocks are for tests only.
- The app must not fabricate landmarks or substitute guessed measurements.

## Browser RGB Capture

- Browser capture uses RGB images only.
- Browser RGB capture is not equivalent to native iPhone TrueDepth, ARKit, depth geometry, or 3D reconstruction.
- Camera access requires a secure context such as `https://` or `localhost`.
- HEIC and HEIF upload support is not guaranteed; the current web MVP provides an honest unsupported state where needed.
- Real mobile behavior for camera permissions, lock-screen interruption, tab backgrounding, and low-memory recovery must be tested on physical devices.

## Geometry and Profile

- Measurements are normalized RGB landmark ratios where defensible.
- Depth-supported is always false for the web RGB flow.
- Missing or weak measurements must be marked unavailable rather than guessed.
- Profile geometry should not be casually exposed in the normal user interface.
- The app must not infer ethnicity, health, personality, intelligence, attractiveness, criminality, age, or identity.

## Screenshot Refinement

- Screenshot-refinement intake and local comparison logic exist for validated screenshots.
- Production refinement recommendations remain unavailable while the production catalog is empty; once an approved catalog is loaded, refinement still carries reduced cross-domain confidence because game renders and human capture images differ.
- Screenshot images should not be saved by default.

## Privacy and Storage

- The MVP has no backend, no accounts, no analytics SDK, no cloud storage, and no image upload path.
- Raw face images must not be stored in localStorage.
- Temporary object URLs and camera tracks are cleaned up by app flows, but real mobile interruption behavior still requires manual testing.
- Deletion applies to local browser data controlled by the app and cannot delete files a tester separately saved outside the browser.

## Deployment and Payments

- The app has not been deployed.
- Payments are not connected.
- No checkout, authentication, subscription, email, database, analytics, or external AI service is active.

## Accessibility

- Automated accessibility-oriented checks and responsive layouts exist.
- Manual assistive-technology review is still required before a broad private beta.

## Performance

- Large-image downscaling exists before analysis.
- Real landmark model load time and processing time have not been measured on physical iPhone Safari or Android Chrome devices.
