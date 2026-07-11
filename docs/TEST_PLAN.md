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
