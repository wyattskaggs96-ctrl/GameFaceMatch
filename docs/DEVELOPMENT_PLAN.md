# Development Plan

## Phase 0 — Catalog feasibility
Audit the shipping game, verify every appearance category, and create a versioned catalog.

## Phase 1 — Capture foundation
Build permissions, capability detection, preparation guidance, TrueDepth/ARKit support, Vision landmarks, and local-only profile generation.

## Phase 2 — Matching
Normalize measurements, validate the catalog, implement weighted distance, return top three, and explain tradeoffs.

## Phase 3 — Refinement
Accept clean created-player screenshots, validate them, compare normalized facial geometry, and recommend actionable changes.

## Phase 4 — Private beta
TestFlight, diverse testers, privacy controls, accessibility, repeatability, and weight tuning.

## Current foundation status

Completed for the initial app foundation:

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

1. Expand the catalog schema documentation and validation fixtures under `data/fixtures/test-only/`.
2. Add script-level catalog validation for `data/catalog/production/`.
3. Keep the production catalog empty until records are captured and verified from the shipping game.
