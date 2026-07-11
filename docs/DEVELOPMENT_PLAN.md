# Development Plan

## Phase 0 — Catalog feasibility
Audit the shipping game, verify every appearance category, and create a versioned catalog.

## Phase 1 — Web capture foundation
Build browser permissions, capability detection, preparation guidance, guided RGB multi-angle capture, manual upload fallback, and local-only profile generation.

Native TrueDepth/ARKit capture remains a future premium client path under `ios/`.

## Phase 2 — Matching
Normalize measurements, validate the catalog, implement weighted distance, return top three, and explain tradeoffs.

## Phase 3 — Refinement
Accept clean created-player screenshots, validate them, compare normalized facial geometry, and recommend actionable changes.

## Phase 4 — Private beta
TestFlight, diverse testers, privacy controls, accessibility, repeatability, and weight tuning.

## Current foundation status

Completed for the initial app foundation:

- Responsive web application foundation under `web/`
- Guided RGB capture flow for five required angles with upload fallback
- Browser capability service abstraction
- Web-side domain models, catalog repository, catalog validator, privacy store, and College Football 27 adapter scaffold
- Web unit tests and local validation scripts
- Native SwiftUI iPhone Xcode project under `ios/`
- App, unit-test, and UI-test targets
- Navigation shell and required placeholder/empty-state screens
- Domain model foundation for capture, profiles, measurements, catalog records, matching results, refinement, and saved builds
- College Football 27 adapter scaffold that returns catalog-unavailable until verified production records exist
- Production catalog repository and validator with an empty valid production manifest
- Privacy-safe local storage and deletion protocols with local file-backed implementation
- Device capability status scaffold using Apple frameworks
- Initial unit and UI tests that do not require physical camera hardware

Recommended next task:

1. Expand catalog schema documentation and clearly marked test-only validation fixtures under `data/fixtures/test-only/`.
2. Generate shared TypeScript and Swift catalog-schema fixtures from one canonical schema.
3. Keep the production catalog empty until records are captured and verified from the shipping game.
