# Architecture

## Active web-first approach

- Responsive web application in TypeScript, React, and Next.js under `web/`
- Browser RGB image capture behind a camera-service abstraction
- Manual upload fallback for every required capture angle
- Local browser face-landmark extraction behind `FaceLandmarkProvider`; MediaPipe is dynamically loaded only when capture needs it
- `StandardFaceProfile` geometry uses `web-rgb-landmark-geometry-v1` to store normalized ratios only; raw frames and landmark coordinates are not serialized into profiles
- Local-only browser state for the initial prototype
- No backend, authentication provider, database, analytics SDK, subscription service, cloud media storage, or external AI service in the initial web MVP
- Production catalog records remain platform-independent and shared through `data/catalog/production/`
- The app must clearly communicate that browser RGB capture is not equivalent to native iPhone TrueDepth capture

## Preserved native approach

- Native iPhone app in Swift and SwiftUI
- Apple frameworks first: AVFoundation, ARKit, Vision, Core Image, Core ML where justified
- On-device-first capture quality, measurement, profile generation, and initial matching
- No backend required for the first prototype
- Generic face-capture and profile modules separated from the College Football 27 adapter
- Production catalog records are versioned, verified, and immutable after publication

## Dependency direction

`Features -> Core protocols/domain -> concrete local services`

Game-specific code may depend on generic domain models. Generic capture and face-profile code must not depend on College Football 27.

The same adapter rule applies on web: generic browser capture, image validation, profile, privacy storage, and catalog repository code must not depend directly on College Football 27.

## Web project

- Project: `web/`
- Framework: Next.js with TypeScript and React
- App shell: `web/app/`
- Components: `web/components/`
- Feature panels: `web/features/`
- Platform-independent logic: `web/lib/`
- Domain types: `web/types/` with public re-exports from `web/domain/`
- Browser services: `web/services/` re-exporting typed camera, capture-session, and image-validation abstractions
- Local storage boundaries: `web/storage/` re-exporting privacy-safe local storage interfaces and implementations
- Game adapters: `web/game-adapters/` re-exporting the adapter interface and College Football 27 fail-closed scaffold
- Catalog access: `web/catalog/` re-exporting repository, validation, and production-manifest entry points
- Styling: `web/app/globals.css`, with `web/styles/` reserved for reusable style modules as the design system grows
- Public assets: `web/public/`; test fixtures must not be copied here
- Tests: `web/tests/`
- Scripts: `web/scripts/`

The web app includes an empty bundled production manifest for browser runtime use and validates the shared top-level manifest at `data/catalog/production/catalog_manifest.json`. Catalog-like data must declare a `sourceType` of `production`, `researchDraft`, `testFixture`, `demoData`, or `localDeveloperSample`; production import, runtime loading, and integrity checks reject every non-production source type. The reserved namespaces are `data/catalog/production/`, `data/audit/college-football-27/`, `data/fixtures/test-only/`, `data/demo/`, and `data/local-samples/`.

## Web hardening posture

- Security headers are configured in `web/next.config.ts`, including CSP, frame blocking, `nosniff`, no referrer, and a restrictive permissions policy that allows camera only for the app origin.
- Production browser source maps are disabled for the local MVP hardening pass.
- Development-only audit and matching-lab screens are excluded from production navigation and must not load production user-facing fixture records.
- Feature and capability gates are centralized in `web/lib/gates/feature-gates.ts`. Production recommendations require an approved catalog release: production manifest, non-empty verified records, deterministic checksum verification, compatible platform/game version, catalog verification date, and no fixture records. Environment flags alone cannot enable recommendations.
- Phase 0 readiness is calculated by `web/lib/phase-zero/phase-zero-status.ts` from repository scaffolding and production catalog state. The internal `phase-0` page is development-only and must not imply catalog or beta readiness while verified records are absent. Its audit dashboard uses `web/lib/phase-zero/phase-zero-audit-dashboard.ts` to show environment, category progress, evidence gaps, verifier progress, manual-study readiness, and production-gate blockers from production-class catalog records only; fixture records do not create production-mode progress. The environment-manifest wizard in `web/lib/phase-zero/phase-zero-environment-wizard.ts` and `web/features/phase-zero/EnvironmentManifestWizard.tsx` guides operators through required shipping-game environment fields and title/version/console/mode/workflow evidence slots, saves only non-production audit metadata, and blocks completion when critical platform, version, patch, mode, or path data is missing. The creation-path audit workspace in `web/lib/phase-zero/phase-zero-creation-path-workspace.ts` and `web/features/phase-zero/CreationPathAuditWorkspace.tsx` supports candidate and supplemental path investigation, reproducible steps, button/input sequences, requirements, restrictions, appearance category coverage, dependency notes, identifier consistency, later editability, per-step evidence, and canonical scoring while keeping proposed Road to Glory paths provisional until direct evidence confirms them. The canonical capture-configuration editor in `web/lib/phase-zero/phase-zero-capture-configuration.ts` and `web/features/phase-zero/CaptureConfigurationEditor.tsx` lets an operator define and lock the approved audit setup, generates a stable settings hash, and warns when observed capture-session settings deviate from that locked configuration. Appearance-control settings such as skin tone, complexion, and hair color are capture consistency controls only and do not affect geometry similarity.
- Phase 0 audit data uses a JSON-serializable domain model in `web/lib/phase-zero/phase-zero-domain.ts` with shared schemas under `data/schemas/`. Audit environments and creation paths have dedicated schemas and local metadata persistence in `web/lib/phase-zero/phase-zero-audit-store.ts`; the store saves evidence references and audit fields only, not screenshot or face media bytes. Evidence intake uses `web/lib/phase-zero/phase-zero-evidence-intake.ts`, `data/schemas/evidence-intake.schema.json`, and `web/features/phase-zero/EvidenceIntakeManager.tsx` for drag-and-drop upload, file or folder selection, evidence classification, environment/catalog association, master-versus-derivative designation, view selection, duplicate/type/size/metadata warnings, removal before finalization, and metadata-only local storage that preserves original files without modification or external upload. Evidence naming uses `web/lib/phase-zero/phase-zero-evidence-naming.ts` and `data/schemas/evidence-naming.schema.json` to generate preview-only target names in catalog/view/version/patch/date/extension order, validate catalog IDs, approved views, versions, patches, dates, extensions, unsafe characters, duplicate paths, and missing fields, and keep destructive master-file renaming disabled unless a future explicit operator-confirmed workflow is added. Evidence manifests use `scripts/evidence-manifest.mjs` and `data/schemas/evidence-manifest.schema.json` to scan approved local evidence directories, calculate SHA-256 checksums, file sizes, MIME types, file roles, master/derivative state, environment/catalog associations, view labels, capture metadata, and changed/missing/unexpected file comparisons without uploading, transforming, or modifying evidence. Menu mapping uses `web/lib/phase-zero/phase-zero-menu-map.ts`, `data/schemas/menu-map.schema.json`, and the dev-only `web/features/phase-zero/MenuMapEditor.tsx` for nested hierarchy, parent/child entry, native-order sorting, control metadata, hidden/advanced controls, evidence, scrolling-continuation evidence, dependencies, locks, defects, verification state, missing-order and duplicate-label diagnostics, and readable tree export. The menu editor starts blank and does not assume College Football 27 categories. Head catalog capture uses `web/lib/phase-zero/phase-zero-head-capture-workspace.ts`, `data/schemas/head-capture-workspace.schema.json`, and `web/features/phase-zero/HeadCaptureWorkspace.tsx` to record double-count runs, native order, stable ID assignment, selector wrap behavior, lock/entitlement status, forced attributes, canonical-settings confirmation, full-screen menu evidence, seven required head views, source-video timestamps, duplicate observations, completion, verification, and catalog-manager disposition; production completion remains blocked until required evidence is present. Hairstyle catalog capture uses `web/lib/phase-zero/phase-zero-hairstyle-capture-workspace.ts`, `data/schemas/hairstyle-capture-workspace.schema.json`, and `web/features/phase-zero/HairstyleCaptureWorkspace.tsx` to record double counts, native order, stable hairstyle IDs, canonical head confirmation, canonical hair color, six required hairstyle views including rear, full-screen menu evidence, head/mode/body/position/archetype/account/platform/skin-tone/unlock dependencies, separate researcher visual metadata, missing-view detection, recapture requests, verification, and catalog-manager disposition; production completion remains blocked while evidence, dependencies, or recapture gates are incomplete. Facial-hair catalog capture uses `web/lib/phase-zero/phase-zero-facial-hair-capture-workspace.ts`, `data/schemas/facial-hair-capture-workspace.schema.json`, and `web/features/phase-zero/FacialHairCaptureWorkspace.tsx` to record the None option, double counts, native ordering, stable facial-hair IDs, canonical head and hairstyle confirmation, facial-hair color, five required views, full-screen menu evidence, coverage metadata, mustache/beard/sideburn/stubble/density/length/color-control observations, dependency tests, missing-view detection, recapture requests, verification, and catalog-manager disposition; missing evidence blocks production completion. Additional resemblance controls use `web/lib/phase-zero/phase-zero-additional-attributes-workspace.ts`, `data/schemas/additional-attributes-workspace.schema.json`, and `web/features/phase-zero/AdditionalAttributesWorkspace.tsx` for generic discovery of presets, carousels, numbered options, named options, sliders, colors, and toggles; the workspace tracks count/range/defaults, effects, reset behavior, later visibility, recommendation suitability, stable ID availability, evidence, dependencies, and verification without pre-populating categories as confirmed. Dependency testing uses `web/lib/phase-zero/phase-zero-dependency-test-runner.ts`, `data/schemas/dependency-test-runner.schema.json`, and `web/features/phase-zero/DependencyTestRunner.tsx` to record one-variable runs for platform, mode, custom versus Legends base, position, archetype, height, weight, body type, skin presentation, head, hairstyle, online/offline state, EA account state, edition, entitlements, and patch; each run captures baseline, expected behavior, observed behavior, count/order/geometry/label changes, evidence, result, verification, and remaining uncertainty before production completion can pass. Issue management uses `web/lib/phase-zero/phase-zero-issue-management.ts`, `data/schemas/issue-register.schema.json`, and `web/features/phase-zero/IssueManagementWorkspace.tsx` to track audit defects, owners, severity, status, affected records, evidence, resolution notes, and recapture requests; unresolved blocking issues and queued recaptures feed the Phase 0 dashboard blocker list. Typed Phase 0 catalog item schemas for head presets, hairstyles, facial-hair options, and additional face-matching attributes live in `web/lib/phase-zero/phase-zero-catalog-item-schemas.ts` with JSON schemas under `data/schemas/`; these enforce audit metadata and stable ID conventions without creating real College Football 27 records. Evidence files and chronological capture logs use `web/lib/phase-zero/phase-zero-evidence.ts`, `data/schemas/evidence-file.schema.json`, and `data/schemas/capture-log.schema.json`; production evidence metadata must use relative paths and must not expose local machine paths or URLs. Second-person verification and disagreement resolution use `web/lib/phase-zero/phase-zero-verification.ts`, `data/schemas/second-person-verification.schema.json`, and `data/schemas/discrepancy-resolution.schema.json`; only approved verification dispositions are accepted and unverified records cannot publish. Future manual top-three feasibility studies use `web/lib/phase-zero/phase-zero-manual-matching-study.ts` and `data/schemas/manual-matching-study.schema.json` to track consent, pseudonymous subject IDs, reference-view completeness, reviewers, ranked choices, subject preference, mismatch reasons, reviewer agreement, deletion state, catalog version, and result timestamps using test-only fixtures until real study approval exists.
- The app ships a web manifest and icon for installability experiments, but no service worker. Offline behavior is not a supported feature.
- Browser camera capture requires HTTPS or localhost. Manual upload fallback remains the supported path for insecure contexts, unsupported camera APIs, denied permission, or missing camera devices.
- Object URLs for capture and screenshot sessions are revoked on retake, removal, cancellation, deletion, and session reset paths.
- No network upload path exists in the web MVP; image bytes remain in memory/object URLs only for the active session.
- Face landmark extraction uses the local browser provider documented in `docs/FACE_LANDMARK_PROVIDER.md`. It does not identify people, produce identity embeddings, infer sensitive traits, upload media, or claim TrueDepth/ARKit equivalence.

## Commerce readiness boundaries

- Payment and entitlement types live behind provider-independent interfaces.
- No live payment provider, checkout session, webhook endpoint, backend, or account system is connected.
- Basic free match access is the default entitlement and does not require an account.
- Paid capabilities such as top-three results, detailed build guides, screenshot refinement, saved profiles, and multi-game access remain future entitlements.
- The pricing scaffold is disabled and must not claim paid recommendation value while the production catalog is empty.
- Payment providers must never receive raw face images.

## Initial iOS project

- Project: `ios/GameFaceMatch.xcodeproj`
- App target: `GameFaceMatch`
- Unit-test target: `GameFaceMatchTests`
- UI-test target: `GameFaceMatchUITests`
- Language and UI: Swift and SwiftUI
- Frameworks: Apple frameworks only. The initial foundation links ARKit and AVFoundation for capability detection scaffolding.
- Deployment target: iOS 18.0, chosen as a provisional modern baseline while capture-device requirements are validated against current iPhone hardware and iOS 26.5 simulator tooling.

The Xcode project is hand-authored in the repository rather than generated by a third-party tool. This avoids adding package-manager or global-tool dependencies before the native project shape is stable.

## Current module boundaries

- `App`: SwiftUI entry point, routing, and root navigation state.
- `Features`: user-facing screens for welcome, disclaimer, privacy, capture preparation, device status, catalog status, unavailable results, saved-build empty state, privacy center, delete confirmation, and settings.
- `Shared`: reusable SwiftUI components.
- `Core/Domain`: strongly typed Codable and Sendable models for profiles, capture metadata, measurements, catalog records, matches, refinement, instructions, and saved builds.
- `Core/GameCatalog`: catalog repository, validation, manifest verification scaffold, and production catalog decoding.
- `Core/GameAdapters`: game-specific adapter implementations. The College Football 27 adapter fails closed with a catalog-unavailable error until verified production records exist.
- `Core/Storage`: privacy-safe local storage protocols and file-backed deletion implementation.
- `Core/Services`: Apple device capability checks for simulator, camera permission, camera availability, and AR face-tracking support.

Generic capture, profile, storage, and matching foundations do not contain hard-coded College Football 27 menu behavior. Game-specific behavior belongs behind the `GameAppearanceAdapter` protocol.
