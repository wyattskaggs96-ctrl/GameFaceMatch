# Test Plan

Initial automated coverage should include:

- Facial-measurement serialization
- Catalog schema validation
- Duplicate stable-ID rejection
- Unverified production-record rejection
- Test-fixture rejection in production
- Missing platform/version/mode rejection
- College Football 27 adapter behavior when the catalog is unavailable
- Session-data deletion
- Saved-profile deletion
- Delete-all-local-data behavior
- View-model behavior that does not require physical camera hardware

## Web MVP automated coverage

Web tests should also include:

- Catalog unavailable behavior
- Empty production catalog acceptance
- Malformed catalog rejection
- Fixture-record rejection in production
- Duplicate stable-ID rejection
- Required five-angle completion
- Browser-safe image metadata validation
- Local face-landmark provider provenance, failure, timeout, zero-face, one-face, and multiple-face states
- Duplicate upload detection where practical
- Browser capability state mapping
- Session deletion, saved-build deletion, and delete-all-local-data
- CollegeFootball27Adapter fail-closed behavior
- Production bundle excluding test fixtures
- Key navigation flow coverage

## Catalog property and integrity coverage

Catalog integrity tests should include deterministic property-style mutation coverage for:

- Unique stable IDs across catalog records, assets, and reviews
- Native-order continuity by platform, game version, mode, creation path, and category
- Supersession-chain references, deprecated-record context, and cycle rejection
- Portable relative evidence paths, fixture-path rejection, and repair guidance
- Verification-state enums and unverified production-record rejection
- Immutable release checksum verification and duplicate release-version rejection
- Fixture segregation across manifests, records, and evidence assets
- Required-angle, source-image, navigation-evidence, manifest-count, and asset-association failures
- Catalog version, platform, mode, and creation-path compatibility
- Structured dependency-record validity with evidence references
- Production-publish gate invariants proving no single boolean can approve a release

## Mobile-browser hardening coverage

Hardening checks should include:

- End-to-end screen order from welcome through catalog-unavailable results, privacy center, delete-all, and screenshot-refinement entry
- Mobile navigation excludes development-only routes
- Focus movement after navigation and keyboard navigation across nav items
- Required disclaimer, privacy, consent, and catalog-unavailable copy remains present
- Secure-context camera explanation remains documented
- Upload fallback remains available when camera is unsupported, denied, blocked, insecure, or unavailable
- CSP, permissions policy, no production source maps, fixture exclusion, and no obvious upload APIs in client code
- PWA manifest exists without a service-worker offline claim
- Raw face images remain absent from localStorage/sessionStorage paths

## Accessibility hardening coverage

Accessibility checks should include the automated `web/tests/accessibility-hardening.test.ts` coverage plus the manual protocol in `docs/ACCESSIBILITY_QA.md`.

Automated coverage should verify:

- Keyboard journey coverage and navigation key behavior
- Reduced-motion behavior
- Core color contrast tokens
- Non-color-only status evidence
- User-relative left/right capture instructions
- Selective retake without restart
- Plain-language recovery paths for common errors

Manual checks should verify screen-reader announcement quality, Dynamic Type or browser zoom behavior, real-device one-handed use, grayscale/color-filter readability, and that no haptic feedback is required as the only cue.

## Manual-study evaluation harness coverage

The Phase 0 manual top-three feasibility operational module and evaluation harness should be exercised with fixture-only records until real approved study results exist. Tests should cover:

- Consent checkpoint recording
- Pseudonymous participant ID generation
- Required reference-image checklist completion
- Reviewer assignment
- Independent top-three ranking preservation
- Hair and facial-hair choice recording
- Participant preference recording
- Mismatch reason recording
- Raw-media deletion confirmation
- Exportable non-public study reports
- Top-one useful-match rate
- Top-three useful-match rate
- Rank selected distribution
- Inter-reviewer agreement
- Preset confusion matrix
- Common mismatch reasons
- Performance by capture mode
- Performance by capture device
- Confidence calibration
- Clear fixture-derived metric labels
- Exclusion of invalid, incomplete, or incorrectly classified records

## Commerce readiness coverage

Commerce tests should include:

- Provider unavailable behavior
- Entitlement defaults
- No live checkout result
- Pricing configuration validation
- Disabled payment controls
- No credential-like payment secrets in client source
- No fake purchase state
- Catalog unavailable prevents paid recommendation claims

## Privacy-safe analytics coverage

Analytics tests should include:

- Allowed product event names only
- Local or no-op default implementation
- No approved external provider by default
- Rejection of raw images, object URLs, data URLs, identifying frames, facial geometry, exact measurements, landmarks, embeddings, and unencrypted profile content
- Rejection of unknown payload keys and long free-form strings
- No analytics SDK or network provider required for the MVP

## Security hardening coverage

Security tests should include:

- Production browser source maps remain disabled
- CSV exports neutralize spreadsheet formulas
- Upload filenames reject path traversal, folders, control characters, and unsafe extensions
- Evidence paths reject absolute paths, URLs, Windows paths, encoded traversal, and parent traversal
- Malformed or oversized localStorage JSON falls back safely
- Untrusted metadata rejects unknown keys, control characters, long strings, and non-primitive values
- Production recommendation and publication gates cannot be enabled by spoofed partial reports, fixture records, placeholders, or environment variables alone

## Large-evidence and performance coverage

Large local evidence workflows should avoid loading all raw evidence into memory or rendering every row at once. Automated coverage should verify:

- Evidence manifests can use streaming SHA-256 reads and asynchronous recursive traversal
- Source-video inspection can use streaming SHA-256 reads without serializing video bytes
- Evidence intake plans immediate previews, lazy previews, and metadata-only rows based on MIME type, size, and page budget
- Catalog-manager review tables paginate records and evidence assets
- Long validation/export-style work can be planned in deterministic chunks with a worker/background recommendation

Manual checks should verify browser responsiveness with large screenshot folders, source-video metadata entry, and catalog packages that are larger than the fixture set. Do not add real user face media or unverified game evidence to the repository while testing these paths.

## Offline and recovery coverage

Offline and interruption tests should verify:

- Capture recovery snapshots store metadata only, without object URLs or raw image bytes
- Evidence-intake draft audit sessions survive local storage round trips and remain marked non-production
- Catalog-manager review drafts preserve local review work without approving releases
- Validation rerun summaries remain blocked when repair actions or mandatory failures exist
- Unsaved-change warnings are generated for local draft work
- Failed checksum recovery plans tell the operator to retry validation and not publish
- Offline and external-resource status messages do not imply recommendations are available

## Browser end-to-end coverage

The active web MVP uses Playwright for production-representative browser coverage under `web/tests/e2e/`.

Run locally from `web/`:

```bash
npm run build
npm run test:e2e
```

Run the CI-oriented command from `web/`:

```bash
npm run test:e2e:ci
```

Development-only Phase 0 audit workflow coverage runs separately from `web/`:

```bash
npm run test:e2e:phase0
```

This suite starts `next dev` and targets only internal audit tools that are intentionally absent from `next start` production builds. It covers:

- Environment manifest drafts and complete non-production environment save
- Menu-map creation from TESTONLY labels
- Evidence intake with synthetic files, invalid filename diagnostics, and metadata-only storage
- Required-view missing-state reporting
- Local checksum generation using generated synthetic bytes
- Catalog-manager import validation failure
- Fixture promotion rejection through a mandatory validation-report failure
- Approved-release simulation using TESTONLY package data only
- Production gate blocked state with the empty production catalog
- Second-verifier mismatch, recapture evidence linkage, resolution, and acknowledgments

The default production Playwright suite explicitly excludes the Phase 0 audit spec and verifies that development-only audit, verifier, and approval controls are not reachable in the production app.

The Playwright suite runs against `next start`, not `next dev`, and covers:

- Welcome, product explanation, disclaimer, privacy summary, and consent progression
- Rejection when required consent is missing
- Camera permission denial with upload fallback still available
- Guided five-angle RGB upload using generated geometric PNG images only
- Unsupported-image and small-image quality rejection
- Duplicate-image rejection and selective retake
- Attribute confirmation and honest profile review with unavailable geometry
- Empty production catalog and results-unavailable state
- Saved-build empty state
- Screenshot-refinement intake and deletion
- Privacy-center inventory, active-session deletion, and delete-all local data
- Keyboard navigation through the main journey
- Reduced-motion usability

No real face photographs are used. Test images are generated in memory by `web/tests/e2e/synthetic-images.ts`, are not committed as media assets, and are never loaded by production code.

Configured Playwright projects:

- `desktop-chromium`: 1440 x 900 desktop smoke coverage
- `iphone-safari-size`: 393 x 852 mobile viewport with an iPhone Safari user agent
- `android-mobile-size`: 412 x 915 common Android viewport

Reduced-motion behavior is covered by emulating `prefers-reduced-motion: reduce` inside the dedicated Playwright scenario.

Failure artifacts are retained only on failure through Playwright traces, screenshots, and videos. Local artifact directories are ignored by Git.
