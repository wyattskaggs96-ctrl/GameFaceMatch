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
