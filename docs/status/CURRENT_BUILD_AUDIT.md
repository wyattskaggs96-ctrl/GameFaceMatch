# Current Build Audit

Date: 2026-07-12  
Repository: `/Users/skaggssystems/Developer/GameFaceMatch`  
Audited HEAD: `dd28763 Add private beta readiness review`

## Active Implementation And Repository Paths

The active customer-facing implementation is the responsive web MVP:

- Web app: `web/`
- Active app entry: `web/app/page.tsx`
- Web domain types: `web/types/domain.ts`
- Web feature modules: `web/features/`
- Web platform-independent logic: `web/lib/`
- Web tests: `web/tests/`
- Web E2E tests: `web/tests/e2e/`

The preserved native implementation remains available for future premium TrueDepth capture:

- Xcode project: `ios/GameFaceMatch.xcodeproj`
- iOS app source: `ios/GameFaceMatch/`
- iOS unit tests: `ios/GameFaceMatchTests/`
- iOS UI tests: `ios/GameFaceMatchUITests/`

Shared catalog and schema assets live outside client implementations:

- Production catalog: `data/catalog/production/`
- Test-only fixtures: `data/fixtures/test-only/`
- Schemas: `data/schemas/`
- Manual audit templates: `data/audit/college-football-27/`
- Catalog CLI: `scripts/catalog-tools.mjs`

Supporting documentation and future planning live in:

- Product and engineering docs: `docs/`
- Current status reports: `docs/status/`
- Draft legal material: `legal/`
- Future catalog-manager placeholder: `admin/catalog-manager/`
- Design research and wireframes: `design/`

## Git And Working Tree

- Current branch: `main`
- Recent commits:
  - `dd28763 Add private beta readiness review`
  - `13aa052 Connect profile geometry to verified catalog matching`
  - `6b890d0 Add production catalog runtime integration guards`
  - `4b5d261 Complete College Football 27 catalog audit workflow`
  - `c0e5704 Add RGB landmark geometry profile pipeline`
  - `0e8d408 Add real-time browser capture guidance`
  - `50171bb Add local browser face landmark provider`
  - `93959b9 Harden mobile browser capture QA`
  - `74e59ef Add production browser E2E coverage`
  - `c9e9cbd Document web-first architecture and deployment handoff`
- Starting working tree: clean.
- Dirty-worktree risk before this report: none found.
- Ignored/generated directories currently present:
  - `build-artifacts/DerivedData/`
  - `ios/GameFaceMatch.xcodeproj/project.xcworkspace/`
  - `ios/GameFaceMatch.xcodeproj/xcuserdata/`
  - `web/.next/`
  - `web/node_modules/`
  - `web/public/mediapipe/`
  - `web/test-results/`
  - `web/tsconfig.tsbuildinfo`

These ignored paths are local build/test artifacts or dependency folders and should not be committed.

## What A User Can Actually Do Today

In the web MVP, a user can:

- Open the GameFace Match web app locally.
- Read the product explanation.
- Read the independent-app disclaimer.
- Review the privacy summary.
- Acknowledge separate consent controls.
- Enter the home/dashboard flow.
- Check browser camera/capability status.
- Prepare for capture with RGB-only instructions.
- Complete or simulate the guided five-angle capture flow:
  - Straight-on.
  - Left 45 degrees.
  - Right 45 degrees.
  - Left profile.
  - Right profile.
- Use upload fallback for every required angle.
- See image-quality and local guidance states.
- Retake or remove individual images.
- Confirm standardized user-provided attributes.
- Generate a local `StandardFaceProfile` foundation.
- Review measured, approximate, and unavailable profile fields.
- Reach an honest catalog-unavailable results state.
- Open saved-build empty state.
- Open screenshot-refinement intake and see refinement unavailable behavior.
- Open privacy center.
- Delete active session data, temporary images, saved builds, screenshot session data, or all local data.
- Open settings.

A user cannot currently:

- Receive real College Football 27 appearance recommendations.
- See verified College Football 27 top-three results.
- Receive real build-guide instructions.
- Use real screenshot refinement.
- Use payments, accounts, cloud sync, analytics, or external upload.
- Rely on native TrueDepth capture in the web app.

## Current Architecture

### Web

- Framework: TypeScript, React, Next.js.
- Main route structure: one app route with hash-based screen navigation from `web/app/page.tsx`.
- No Next.js API routes were found under `web/app/`.
- Styling and design system:
  - Global styles: `web/app/globals.css`
  - Components: `web/components/design-system.tsx`
  - Shell/navigation: `web/components/AppShell.tsx`
- Capture:
  - Browser camera abstraction: `web/lib/capture/browser-camera-service.ts`
  - Session state: `web/lib/capture/capture-session.ts`
  - Guidance: `web/lib/capture/capture-guidance-service.ts`
  - Image validation: `web/lib/capture/image-validation.ts`
  - Quality checks: `web/lib/capture/image-quality-service.ts`
  - UI: `web/features/capture/GuidedCaptureFlow.tsx`
- Face landmarks:
  - Provider interface: `web/lib/face-landmarks/face-landmark-provider.ts`
  - MediaPipe provider: `web/lib/face-landmarks/mediapipe-face-landmarker-provider.ts`
  - Worker/client boundary: `web/lib/face-landmarks/face-landmark-worker-client.ts`
  - The MediaPipe WASM runtime is copied to `web/public/mediapipe/` during build.
  - The reviewed model asset `web/public/models/mediapipe/face_landmarker.task` is not present.
- Profile generation:
  - Standard profile service: `web/lib/profile/standard-face-profile.ts`
  - RGB landmark geometry: `web/lib/profile/rgb-landmark-geometry.ts`
- Catalog:
  - Runtime repository: `web/lib/catalog/catalog-repository.ts`
  - Validation: `web/lib/catalog/catalog-validator.ts`
  - Integrity and compatibility: `web/lib/catalog/catalog-integrity.ts`
  - Generated manifest: `web/lib/catalog/generated-production-manifest.ts`
- Matching:
  - Generic matching engine: `web/lib/matching/matching-engine.ts`
  - Game adapter interface: `web/lib/adapters/game-appearance-adapter.ts`
  - College Football 27 adapter: `web/lib/adapters/college-football-27-adapter.ts`
- Results:
  - Results state and build-instruction formatting: `web/lib/results/results-experience.ts`
  - UI: `web/features/results/ResultsExperience.tsx`
- Privacy/storage:
  - Consent: `web/lib/privacy/consent.ts`
  - Data lifecycle: `web/lib/privacy/data-lifecycle.ts`
  - Memory/local storage boundary: `web/lib/privacy/local-privacy-store.ts`
- Payments/commerce:
  - Provider-independent scaffolds only under `web/lib/payments/`.
  - No live provider, checkout, webhook, account, or backend is connected.

### iOS

The native app is a preserved SwiftUI foundation, not the active MVP. It includes:

- App/routing: `ios/GameFaceMatch/App/`
- User-facing foundational screens: `ios/GameFaceMatch/Features/`
- Shared SwiftUI components: `ios/GameFaceMatch/Shared/`
- Domain models: `ios/GameFaceMatch/Core/Domain/`
- Catalog repository and validator: `ios/GameFaceMatch/Core/GameCatalog/`
- Game adapter scaffold: `ios/GameFaceMatch/Core/GameAdapters/`
- Capability service using Apple frameworks: `ios/GameFaceMatch/Core/Services/`
- Local privacy storage: `ios/GameFaceMatch/Core/Storage/`

The iOS project links Apple frameworks only and builds on Xcode 26.6 with iOS 26.5 simulator SDK. It should remain preserved for a future native premium TrueDepth client.

### Backend/API

No active backend or API implementation was found:

- No Next.js `route.ts` or API route files were found under `web/app/`.
- No database, authentication provider, analytics SDK, cloud media storage, email service, payment provider, or external AI service is connected.
- Payment and entitlement concepts are interface-only scaffolds.

## Current Test And Build Status

### Web Verification

Commands run from `web/`:

| Command | Result |
| --- | --- |
| `npm ls --depth=0` | Passed; dependencies resolved locally. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed; `Lint OK`. |
| `npm run test` | Passed; 18 test files, 160 tests. |
| `npm run catalog:validate` | Passed with expected empty-catalog warning. |
| `npm run integrity` | Passed; `Integrity OK`. |
| `npm run build` | Passed; Next.js production build and bundle guard passed. |
| `npm run catalog:placeholders` | Passed; `OK placeholders`. |
| `npm run catalog:fixtures` | Passed; `OK fixtures`. |
| `node ../scripts/catalog-tools.mjs detect-duplicates ../data/catalog/production/catalog_manifest.json` | Passed; `OK duplicates`. |
| `npm run test:e2e` | Passed with local-server approval; 21 Playwright tests. |
| `npm audit --audit-level=moderate` | Failed due to 2 moderate `postcss` advisories through `next`; suggested fix is `npm audit fix --force` with a breaking Next.js change. |

Playwright projects covered:

- `desktop-chromium`
- `iphone-safari-size`
- `android-mobile-size`

### iOS Verification

Commands run from repository root:

| Command | Result |
| --- | --- |
| `xcodebuild -version` | Passed; Xcode 26.6, build 17F113. |
| `xcodebuild -list -project ios/GameFaceMatch.xcodeproj` | Passed; targets and scheme listed, with sandbox/CoreSimulator warnings on the first non-escalated inspection. |
| `xcrun simctl list devices available` | Passed with approval; iPhone 17 Pro iOS 26.5 available. |
| `xcodebuild build -project ios/GameFaceMatch.xcodeproj -scheme GameFaceMatch -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' -derivedDataPath build-artifacts/DerivedData` | Passed. |
| `xcodebuild test -project ios/GameFaceMatch.xcodeproj -scheme GameFaceMatch -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' -derivedDataPath build-artifacts/DerivedData -only-testing:GameFaceMatchTests` | Passed. |
| `xcodebuild test -project ios/GameFaceMatch.xcodeproj -scheme GameFaceMatch -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' -derivedDataPath build-artifacts/DerivedData -only-testing:GameFaceMatchUITests` | Passed. |

The iOS unit test run exercised catalog-unavailable behavior, production catalog validation, local storage deletion, facial measurement codable round-trip, and root view-model state transitions. The iOS UI test run passed `testWelcomeAndDisclaimerFlow`.

## Current Catalog State

Production catalog file:

- `data/catalog/production/catalog_manifest.json`

Current production catalog summary:

- `isProduction`: `true`
- Item count: `0`
- Catalog version identifier: `empty-production`
- Game version: empty string
- Platform: empty string
- `verifiedAt`: `null`
- `checksum`: `null`

This is a valid empty production catalog. It intentionally cannot produce recommendations.

Production validation currently enforces:

- Required stable IDs for records.
- Duplicate ID rejection.
- Fixture record rejection.
- Placeholder token rejection.
- Unverified production-record rejection.
- Required metadata such as platform, game version, game mode, creation path, patch version, and category.
- Date validation.
- Required source images and required angle references.
- Measurement value/confidence/variance validation.
- Verified navigation instruction requirements.

Test fixtures are isolated under:

- `data/fixtures/test-only/matching/synthetic-catalog.json`

The production-facing fixture/fake-data scan found no matches in:

- `web/app`
- `web/components`
- `web/features`
- `web/lib`
- `web/public`
- `data/catalog/production`

## Existing Catalog-Unavailable Behavior

The required user-facing message remains:

> Verified College Football 27 catalog not loaded.

Key fail-closed behavior:

- `CollegeFootball27Adapter.match()` validates the production manifest and throws `catalogUnavailable` if the manifest has zero items.
- `CollegeFootball27Adapter.buildInstructions()` refuses unverified or fixture catalog items.
- `ResultsExperience` presents catalog-unavailable results when the production catalog is empty.
- The production build guard passed.
- Catalog placeholder, fixture, and duplicate scans passed.

## Current Privacy Behavior

Implemented privacy behavior:

- No backend upload path exists.
- No authentication is required for the local basic flow.
- No analytics SDK is installed.
- No cloud storage is connected.
- Raw face images are not stored in localStorage.
- Capture images are held as active-session `File`/`Blob`/object URL references.
- Object URLs are revoked on retake, remove, cancellation, screenshot session deletion, current session deletion, temporary image deletion, and delete-all flows.
- Saved builds are non-image by default.
- Derived profiles store standardized profile data, not raw frames.
- Browser capture is documented and presented as RGB-only, not TrueDepth or ARKit.
- Face processing must not identify people, produce identity embeddings, or infer sensitive traits.

Deletion flows exist for:

- Active capture session.
- Temporary images.
- Derived profile.
- One saved build.
- All saved builds.
- Screenshot session.
- Application preferences.
- All local data.

Privacy limitations:

- Deletion applies to local browser data controlled by the app; it cannot delete files a tester saved outside the app.
- Real mobile interruption behavior for object URLs and camera tracks still requires physical-device QA.
- Tester consent wording is a draft and needs owner/legal review before external beta use.

## Environment-Variable Requirements

Current state:

- The web MVP requires no environment variables to run locally, build, or test.
- `NODE_ENV` is supplied by Next.js and controls production/development behavior.
- `.env.example` contains names only and no secret values.

Public variables reserved for future use:

- `NEXT_PUBLIC_GAMEFACE_APP_BASE_URL`
- `NEXT_PUBLIC_GAMEFACE_PRIVACY_URL`
- `NEXT_PUBLIC_GAMEFACE_TERMS_URL`
- `NEXT_PUBLIC_GAMEFACE_SUPPORT_URL`
- `NEXT_PUBLIC_GAMEFACE_PAYMENT_PROVIDER_LABEL`

Server-only variables reserved for future use:

- `GAMEFACE_PAYMENT_PROVIDER`
- `GAMEFACE_PAYMENT_SERVER_TOKEN`
- `GAMEFACE_PAYMENT_WEBHOOK_SIGNING_TOKEN`
- `GAMEFACE_PAYMENT_PRODUCT_CONFIG_REF`
- `GAMEFACE_ERROR_MONITORING_SERVER_TOKEN`

No live secrets were found by the secret-pattern scan over tracked source paths, excluding dependency/build artifacts.

## Generated Files And Build Artifacts

Generated but tracked:

- `web/lib/catalog/generated-production-manifest.ts` is generated from `data/catalog/production/catalog_manifest.json` and is intentionally tracked for runtime bundling.

Generated/ignored local artifacts:

- `build-artifacts/DerivedData/`
- `web/.next/`
- `web/public/mediapipe/`
- `web/test-results/`
- `web/tsconfig.tsbuildinfo`
- `ios/GameFaceMatch.xcodeproj/project.xcworkspace/`
- `ios/GameFaceMatch.xcodeproj/xcuserdata/`

Dependency folders:

- `web/node_modules/` is present locally and ignored.

## Fixture Data

Fixture data exists only under:

- `data/fixtures/test-only/`

Synthetic E2E images are generated in test code:

- `web/tests/e2e/synthetic-images.ts`

Development-only matching and catalog tools exist, but are not production navigation:

- `web/features/matching/MatchingLab.tsx`
- `web/features/catalog/CatalogAuditInspector.tsx`
- `web/features/qa/MobileQAStatus.tsx`

Production navigation excludes these development screens through `NODE_ENV === "production"` dynamic gating.

## Current Known Blockers

Hard blockers for a real private beta or production recommendations:

1. The production College Football 27 catalog has zero verified records.
2. No real user-facing recommendations can be shown until verified production catalog records exist.
3. No real build guide can be shown until verified navigation instructions exist.
4. The reviewed local MediaPipe model asset `web/public/models/mediapipe/face_landmarker.task` is absent.
5. Real-device mobile QA remains incomplete for iPhone Safari and Android Chrome.
6. Real measurement repeatability has not been measured on physical devices.
7. Screenshot refinement remains an unavailable scaffold.
8. Payment, hosting, support, legal, and public policy decisions remain unimplemented.
9. `npm audit --audit-level=moderate` reports 2 moderate PostCSS advisories through Next.js; the offered automated fix is breaking.

## Dirty-Worktree Risks

At audit start, the repository working tree was clean.

Ignored generated folders are present and can become noisy during future work if commands are run outside ignored paths. Current `.gitignore` covers the observed generated folders.

No untracked source files were present before this audit document was created.

## High-Risk Technical Debt

- Empty production catalog blocks the core product promise.
- The MediaPipe model asset is not installed, so real browser landmark extraction cannot be relied on.
- Real-device browser behavior is not yet fully validated on physical iPhone Safari and Android Chrome.
- Current web app is a single route with hash-based in-memory state; this keeps the prototype simple but limits deep-link resilience and persistence semantics.
- Most active session state is in memory; refresh/back/low-memory behavior needs continued real-device testing.
- Payment/entitlement scaffolds exist but are intentionally not wired to any provider or backend.
- Admin/catalog-manager is currently documentation-oriented; it is not a complete cloud admin system.
- Native iOS project is preserved and builds, but it is not the active implementation and should not receive feature expansion unless explicitly scoped.
- `npm audit` has a known moderate dependency advisory with no safe automatic non-breaking fix identified in this audit.

## Duplicate Or Abandoned Implementations

No abandoned implementation should be deleted.

Current parallel implementations:

- `web/` is the active MVP.
- `ios/` is a preserved future native premium TrueDepth implementation path.

Duplicated concepts exist intentionally across clients:

- Domain models.
- Catalog validation.
- College Football 27 fail-closed adapter behavior.
- Privacy/deletion foundations.

These duplicate concepts are acceptable because the web and native clients have different runtimes. Future work should avoid expanding iOS while web remains the active MVP unless a task explicitly targets native.

Potentially inactive/planning areas:

- `admin/catalog-manager/` is currently a local documentation placeholder.
- `design/` contains research/wireframe material, not active app code.
- `legal/` contains drafts and is not final launch legal copy.

## Recommended Execution Order For Remaining Queue

1. Keep the production catalog empty until evidence-backed College Football 27 data exists.
2. Close the MediaPipe model-asset gap: add the reviewed local `face_landmarker.task`, checksum, provenance, license notes, and model-version documentation.
3. Run local landmark extraction against synthetic and manual test images without uploading media.
4. Complete physical-device mobile QA on current iPhone Safari and Android Chrome over HTTPS.
5. Begin Phase 0 catalog audit using `data/audit/college-football-27/` templates and `scripts/catalog-tools.mjs`.
6. Import only two-reviewer verified, evidence-backed production catalog packages.
7. Re-run catalog validation, placeholder, fixture, duplicate, and production bundle guards after catalog import.
8. Enable real production matching only after verified records, compatible platform/version metadata, and verified navigation instructions exist.
9. Run repeatability testing using `docs/REPEATABILITY_TEST_PROTOCOL.md`.
10. Reassess private beta readiness using `docs/PRIVATE_BETA_READINESS.md`.
11. Only after a useful verified beta, revisit deployment, support, legal, and payment-provider decisions.
12. Preserve iOS as future premium capture work unless a separate native task is explicitly queued.

## Audit Conclusion

The repository is healthy for continued web MVP work. The implementation is well guarded against invented production game data, and the automated web/iOS checks pass except for the known dependency audit advisory.

The project is not ready for real College Football 27 recommendation testing because the verified production catalog is empty and the reviewed local landmark model asset is missing. The safest next implementation work is to close the local MediaPipe model-asset gap or continue the manual catalog audit workflow without allowing any unverified data into production.
