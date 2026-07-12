# GameFace Match

GameFace Match is an independent web-first companion application that guides a user through multi-angle face capture and recommends the closest verified College Football 27 Road to Glory appearance settings.

The app does not import a face into the game, identify people, control a console, or invent game options.

## Repository layout

- `docs/` — product requirements and engineering documentation
- `web/` — active responsive TypeScript/React/Next.js MVP client
- `ios/` — preserved SwiftUI future native premium-capture client and tests
- `data/` — schemas plus separated `production`, `researchDraft`, `testFixture`, `demoData`, and `localDeveloperSample` namespaces
- `admin/` — future catalog review and annotation tools
- `scripts/` — validation and export utilities
- `legal/` — draft privacy, terms, and trademark-review materials
- `design/` — research and wireframes

Read `00_START_HERE.md` and `docs/GAMEFACE_MATCH_SOURCE_OF_TRUTH.md` before building.

## Active web MVP

The active customer-facing implementation lives at `web/`.

Install dependencies:

```sh
cd web
npm install
```

Run the full repository verification command from the repository root:

```sh
npm run verify
```

This orchestrates repository hygiene checks, web type-checking, linting, tests, catalog validation, fixture/production separation checks, production build gates, Playwright local smoke tests, and native iOS build/tests when Xcode is available.

Start local development:

```sh
cd web
npm run dev
```

Local URL:

```text
http://localhost:3000
```

Build and checks:

```sh
npm run verify
```

Individual web checks can still be run from `web/`:

```sh
cd web
npm run typecheck
npm run lint
npm run test
npm run build
npm run catalog:validate
npm run integrity
```

The web MVP uses guided RGB browser images only: straight-on, left 45 degrees, right 45 degrees, left profile, and right profile. It does not claim browser capture is equivalent to native TrueDepth. Raw face images are not stored in localStorage and are not uploaded.

Local face-landmark extraction is implemented behind `FaceLandmarkProvider` using Google MediaPipe Face Landmarker. The model is lazy-loaded only during capture analysis, runs locally in the browser when the reviewed local model asset is installed, and returns explicit unavailable/error states otherwise. It does not identify people, create identity embeddings, infer sensitive traits, or upload media. See `docs/FACE_LANDMARK_PROVIDER.md`.

The verified game catalog is shared across clients through `data/catalog/production/`. The current production catalog is intentionally empty, so the app displays: “Verified College Football 27 catalog not loaded.” No fake production presets, labels, option numbers, sliders, hairstyles, facial-hair options, or menu paths are included.

Commercial planning lives in:

- `docs/MONETIZATION_DECISION.md`
- `docs/PAYMENT_INTEGRATION_REQUIREMENTS.md`
- `docs/ENTITLEMENT_ARCHITECTURE.md`
- `docs/REFUND_AND_SUPPORT_CHECKLIST.md`
- `docs/DEPLOYMENT_READINESS.md`
- `docs/SQUARESPACE_INTEGRATION_OPTIONS.md`
- `docs/DOMAIN_AND_DNS_REQUIREMENTS.md`
- `docs/PAYMENT_PROVIDER_HANDOFF.md`
- `docs/ENVIRONMENT_VARIABLES.md`
- `docs/LAUNCH_CHECKLIST.md`

The current recommendation is a free beta before payment. No payment provider is selected or connected.

## Mobile browser testing and PWA readiness

The web MVP now includes a basic web app manifest and app icon for installability experiments. It intentionally does not include a service worker and does not claim offline support. Treat the app as online/local-dev only; browser cache behavior is not a supported offline mode.

Camera access requires a secure origin in modern browsers. `localhost` works for local development; device testing should use HTTPS or a trusted local network setup. If camera access is unavailable, insecure, denied, blocked, or unsupported, every required angle can still use the manual image-upload fallback.

Current browser expectations:

- iOS Safari: manual device testing required; camera permission prompts, memory pressure, and file-picker behavior must be verified on actual hardware.
- Chrome for Android: expected to support camera preview on secure origins; upload fallback remains available.
- Desktop Chrome, Edge, Safari, and Firefox: camera behavior depends on secure origin, permission state, and available devices; upload fallback remains available.
- Unsupported or insecure browsers: use upload fallback only.

Production browser source maps are disabled in `web/next.config.ts` for the hardened local MVP. Re-enable only with a documented debugging need.

## Future iPhone application foundation

The native iPhone app lives at `ios/GameFaceMatch.xcodeproj` and is preserved as a future premium TrueDepth capture path.

Open it with Xcode 26.6 or newer stable Xcode:

```sh
open ios/GameFaceMatch.xcodeproj
```

Select the `GameFaceMatch` scheme and an iPhone simulator such as iPhone 17 Pro. The first foundation build uses iOS 18.0 as the provisional deployment target. This is a conservative modern baseline for SwiftUI, ARKit capability checks, and current iPhone simulator support while the capture requirements are still being validated.

Build from the command line:

```sh
xcodebuild build -project ios/GameFaceMatch.xcodeproj -scheme GameFaceMatch -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' -derivedDataPath build-artifacts/DerivedData
```

Run unit tests:

```sh
xcodebuild test -project ios/GameFaceMatch.xcodeproj -scheme GameFaceMatch -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' -derivedDataPath build-artifacts/DerivedData -only-testing:GameFaceMatchTests
```

Run UI tests:

```sh
xcodebuild test -project ios/GameFaceMatch.xcodeproj -scheme GameFaceMatch -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' -derivedDataPath build-artifacts/DerivedData -only-testing:GameFaceMatchUITests
```

The simulator can verify navigation, empty states, catalog-unavailable behavior, and deletion flows. It cannot verify real camera availability, TrueDepth depth data, AR face tracking quality, or scan output.

Current app behavior is intentionally foundational. The production College Football 27 catalog is empty and the app displays: “Verified College Football 27 catalog not loaded.” No production presets, labels, option numbers, sliders, hairstyles, facial-hair options, or menu paths are included.
