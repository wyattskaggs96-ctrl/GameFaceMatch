# Security Hardening

Last updated: 2026-07-13

This document records the current local MVP security posture. GameFace Match remains a local-first web MVP with no backend, accounts, analytics provider, payments, cloud storage, or external upload service connected.

## Implemented Controls

- Secrets: repository integrity checks scan source files for common secret-token patterns. `.env.example` contains names only.
- Dependency exposure: dependencies are repository-local npm packages; no new external service SDK was added for this pass.
- Local storage: browser localStorage is limited to consent, non-image saved builds, preferences, and deletion records. Malformed or oversized local JSON falls back to safe defaults.
- Raw media: face images and screenshot files remain in memory/object URLs for active sessions only and are not written to localStorage by the production web code.
- File upload validation: capture upload metadata rejects unsupported MIME types, HEIC/HEIF, unsafe filename paths, unsafe extensions, empty files, oversized files, undersized dimensions, and exact duplicates.
- Path traversal: production evidence metadata must use repository-relative paths and rejects absolute paths, URLs, Windows paths, parent traversal, encoded traversal, empty path segments, and control characters.
- CSV injection: Phase 0 CSV exports prefix spreadsheet-formula-leading values before normal CSV escaping.
- Untrusted metadata: security helpers reject unexpected keys, control characters, non-primitive metadata values, non-finite numbers, and long strings where applied.
- Audit-log integrity: Phase 0 admin audit entries use chained SHA-256 hashes and validation rejects altered entries, duplicate IDs, invalid previous hashes, and unauthorized role/action combinations.
- Production gates: recommendation enablement and production catalog publication require approved catalog release paths; spoofed partial gate reports and fixture records remain blocked.
- Source maps/debug exposure: Next production browser source maps are disabled with `productionBrowserSourceMaps: false`; production bundle guard scans built output for fixture or invented game-data leakage.

## Remaining Risks

- This pass does not replace a professional penetration test or legal privacy/security review.
- Browser localStorage is not a secure secret store. The MVP must not place secrets, raw media, exact facial measurements, or unencrypted profile content there.
- `npm audit --omit=dev` on 2026-07-13 reported a moderate PostCSS advisory through the current Next dependency. The suggested automatic remediation would force a breaking Next downgrade, so it was not applied in this pass. Track the upstream Next/PostCSS fix before deployment.
- Content Security Policy currently permits Next.js-required inline/eval behavior for the local app architecture. Tightening it further requires framework-specific validation.
- File MIME type validation is metadata-based unless a browser decoder or later byte-signature check is used at the specific intake point.
- Real mobile browser interruption, permission reset, and object URL cleanup still require manual device QA in addition to automated tests.
- Production catalog evidence and audit files must remain local unless Wyatt approves a storage and publication process.

## Verification

Security hardening is covered by `web/tests/security-hardening.test.ts`, existing privacy tests, catalog gate tests, integrity checks, production bundle guard, and the repository-level `npm run verify` command.
