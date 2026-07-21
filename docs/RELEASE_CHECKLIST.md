# Release Checklist

Status: deployment-preparation checklist. This does not authorize launch.

## Code and Build

- [ ] `npm run verify` passes.
- [ ] Production build passes.
- [ ] Production bundle guard passes.
- [ ] Playwright production E2E passes.
- [ ] Phase 0 E2E passes if catalog tooling changed.
- [ ] iOS build/tests pass when repository-wide verification includes them.

## Data Gates

- [ ] Production catalog contains only production-approved records, or is intentionally empty.
- [ ] Empty catalog state shows honest unavailable results.
- [ ] No fixture, research, placeholder, sample, seed, or demo records are production-visible.
- [ ] Catalog version, game version, platform, mode, creation path, verification date, and checksums are retained.
- [ ] Unsupported catalog versions fail safely.

## Privacy and Security

- [ ] Raw face media is not logged.
- [ ] Screenshots are deleted by default after processing unless separately saved by explicit consent.
- [ ] Analytics contain no precise facial measurements, landmarks, raw images, object URLs, or identity data.
- [ ] CSP and security headers are present.
- [ ] Secrets are stored only in provider dashboards or local ignored environment files.
- [ ] `/api/health` and `/api/uptime` do not expose secrets.

## Operations

- [ ] Support URL and support contact are configured.
- [ ] Privacy URL and terms URL are configured.
- [ ] Release ID is configured.
- [ ] Kill switches are documented and tested.
- [ ] Rollback target artifact and catalog manifest are available.
- [ ] Backup snapshot exists for code, catalog, and release metadata.

## Owner Approval

- [ ] Wyatt approves the exact deployment host.
- [ ] Wyatt approves DNS/subdomain changes.
- [ ] Wyatt approves the private-beta tester scope.
- [ ] Wyatt approves legal/privacy copy for beta.
- [ ] Wyatt approves public launch separately.
