# Security Hardening

Last updated: 2026-07-14

This document records the current application-security review for the GameFace Match local-first web MVP. This was a source review plus automated verification pass, not a formal penetration test.

GameFace Match currently has no backend user account system, no production database, no connected analytics provider, no payment provider, no cloud storage, and no external face-image upload service. The active product remains the responsive web MVP under `web/`; the native iOS project is preserved for future premium TrueDepth work.

## Findings Fixed In This Pass

### High: production CSP allowed `unsafe-eval`

Previous state: the Content Security Policy in `web/next.config.ts` allowed `script-src 'self' 'unsafe-inline' 'unsafe-eval'` for every runtime.

Risk: in production, `unsafe-eval` can increase the blast radius of script-injection bugs by allowing string-to-code execution.

Fix: production headers now omit `unsafe-eval`. Local development keeps the looser script source only because Next.js development tooling can require it.

Verification: `web/tests/security-hardening.test.ts` checks that production CSP has a separate no-`unsafe-eval` branch, and `npm run build` passed with the production bundle guard.

### High: dev-only source-video API used broad local-file fallbacks

Previous state: the internal research source-video route could fall back to `absoluteDiscoveryPathInternal` from the inventory and to `~/Downloads`.

Risk: although the route is blocked in production builds, a local development server exposed more filesystem surface than necessary for research-video preview.

Fix: the source-video resolver now serves only files inside an explicit `GAMEFACE_RESEARCH_VIDEO_ROOT` or safe repository-relative paths. It no longer trusts inventory absolute paths and no longer has an implicit Downloads fallback.

Verification: `web/tests/security-hardening.test.ts` covers configured-root access, rejects external absolute discovery paths when no configured root is supplied, and rejects candidates outside the configured or repository roots.

## Reviewed Areas

| Area | Current status | Notes |
| --- | --- | --- |
| Sensitive face data | Local and temporary by default | Capture images and screenshots are held as in-memory files/object URLs during active sessions. Saved profiles exclude raw media. |
| Local storage | Limited to non-raw data | Saved derived profiles use browser `sessionStorage` and WebCrypto AES-GCM when available. localStorage must not contain raw media, exact facial measurements, landmarks, embeddings, or secrets. |
| Server storage | No production server storage | Internal dev APIs read local research artifacts only. No user face uploads or saved profiles are stored server-side. |
| Authentication | Not implemented | Basic local matching must not require an account. There is no public admin account system. |
| Authorization | Dev-only internal tools are build-gated | Internal research/API routes return 404 in production builds. Local dev access still relies on the developer not exposing the dev server publicly. |
| Encryption | Session profile vault uses WebCrypto when available | This protects explicit saved derived profiles in sessionStorage where supported. It is not a substitute for OS-level device security. |
| Network transmission | No face upload surface | Browser capture, landmark processing, quality checks, profile creation, and screenshot refinement scaffolds are local. |
| Signed catalog manifests | Not fully signed | Catalogs have checksum/integrity gates and immutable release scaffolding, but no public-key signature verification is enforced yet. |
| File uploads | Metadata, decoder, and dimension checks exist | JPEG, PNG, and WebP are accepted. HEIC/HEIF is honestly unsupported. Unsafe filenames, oversized files, unreadable files, undersized images, and duplicates are rejected. |
| Image processing | Local browser/canvas and local model scaffolds | No external computer-vision API is connected. Measurement/profile code must mark unavailable rather than fabricate. |
| Dependency vulnerabilities | Requires ongoing audit | Run `npm audit --omit=dev` before deployment; do not apply breaking remediations blindly. |
| Secrets | No secrets committed by design | `.env.example` uses names only. Integrity checks scan common secret patterns. Secrets must be entered only through local env or provider dashboards once providers exist. |
| Logs | No raw media logging intended | Tests and docs prohibit raw images, landmarks, exact measurements, and embeddings in analytics/log payloads. |
| Analytics | No provider connected | The analytics abstraction is local/no-op only; runtime validation rejects media-like or sensitive payloads. |
| Deletion | Implemented for local categories | Active capture images/object URLs, screenshot sessions, saved profiles, saved builds, and all local data have deletion paths. Deletion records must not contain face images. |
| Administrative access | Local/internal only | Phase 0 tooling is development-only and not a cloud admin system. It should not be exposed on a public host without authentication and role design. |
| Rate limiting | Not applicable to current static/local MVP | If a backend, upload endpoint, or payment webhook is added, rate limits and abuse controls become required before launch. |
| Abuse prevention | Mostly policy and product gating today | The app prohibits identity recognition, sensitive-trait inference, fake game data, and production recommendations from fixtures or research records. |
| Incident response | Draft runbook exists | `docs/support/CUSTOMER_SUPPORT_AND_INCIDENT_PLAYBOOK.md` and `data/support/customer_support_workflows.json` define support workflows, response templates, escalation rules, and human-review requirements. Owner contacts and provider-specific paths still must be approved before launch. |

## Medium Issues

1. **Catalog manifests are integrity-checked but not cryptographically signed.** Checksums and production gates help detect accidental changes, but they do not prove publisher identity. Before public deployment, add a signing strategy or document why hosting trust plus checksums is sufficient for the launch stage.
2. **Dev-only Phase 0 tools have no authentication.** They are hidden or unavailable in production builds, but a development server should not be exposed outside a trusted local network. If internal tools are ever hosted, add authentication, authorization, audit trails tied to named users, and rate limits.
3. **Dependency audit currently reports two moderate advisories.** `npm audit --omit=dev` on 2026-07-14 reported two moderate PostCSS advisories through the current Next dependency. `npm audit --omit=dev --audit-level=high` exited successfully, so no high or critical production dependency advisories were reported. The suggested `npm audit fix --force` would install `next@9.3.3`, a breaking downgrade, so it was not applied.
4. **CSP still permits inline scripts/styles in production.** This is common for framework compatibility, but a stricter nonce or hash-based CSP would be stronger. Tighten only after validating Next.js runtime behavior.
5. **Incident-response contacts and provider paths are still incomplete.** The support and incident playbook now exists, but public launch still needs approved owner contacts, legal counsel path, hosting/provider escalation paths, support channel, and final notification criteria.

## Low Issues

1. **File type checks rely on browser metadata plus decode behavior.** Add byte-signature sniffing where practical for a stronger upload boundary.
2. **Saved profile encryption depends on browser WebCrypto support.** Unsupported browsers fall back to labeled session-only storage. Keep this visible in the Privacy Center.
3. **Object URL cleanup is covered by code and tests but still needs real-device QA.** Continue testing iPhone Safari and Android Chrome interruption paths.
4. **No service worker is registered.** This avoids accidental media caching now, but future PWA/offline work must explicitly exclude raw media from caches.

## Verification Commands

Use these commands for security-relevant verification:

```bash
cd web
npm run typecheck
npm run lint
npm run test
npm run build
npm run catalog:validate
npm run catalog:placeholders
npm run catalog:fixtures
npm run integrity
```

Run dependency advisory review before deployment:

```bash
cd web
npm audit --omit=dev
npm audit --omit=dev --audit-level=high
```

Do not claim penetration testing, mobile-device validation, or dependency-remediation completion unless those commands or manual tests were actually performed and recorded.
