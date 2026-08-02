# Deployment Runbook

Status: deployment preparation only. Do not deploy publicly without explicit Wyatt approval.

## Selected Architecture

Use a dedicated HTTPS app origin for the responsive web MVP while the Skaggs Systems/Squarespace site remains the marketing surface. The app should be linked from Squarespace or served on a dedicated subdomain. Embedding inside Squarespace remains discouraged until camera permissions, CSP, iframe permissions, privacy copy, and mobile browser behavior are tested on the final host.

## Preflight

1. Confirm the production catalog release gate state.
2. Confirm `data/catalog/production/catalog_manifest.json` contains only production-approved records, or remains empty and fail-closed.
3. Confirm no fixture, research, placeholder, or demo records are bundled.
4. Confirm required public URLs are final and HTTPS.
5. Confirm no live secrets are present in source, `.env.example`, docs, or browser bundles.
6. Run `npm run verify:clean` from the repository root for release/audit validation. This runs the full suite in an isolated temporary worktree and fails if the source checkout is dirty or mutated.

## Required Configuration

Public values, entered in the hosting provider dashboard:

- `NEXT_PUBLIC_GAMEFACE_APP_BASE_URL`
- `NEXT_PUBLIC_GAMEFACE_PRIVACY_URL`
- `NEXT_PUBLIC_GAMEFACE_TERMS_URL`
- `NEXT_PUBLIC_GAMEFACE_SUPPORT_URL`
- `NEXT_PUBLIC_GAMEFACE_SUPPORT_CONTACT`
- `NEXT_PUBLIC_GAMEFACE_RELEASE_ID`
- `NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV`
- `NEXT_PUBLIC_GAMEFACE_RECOMMENDATIONS_DISABLED`
- `NEXT_PUBLIC_GAMEFACE_SCREENSHOT_REFINEMENT_DISABLED`

Server-only values, entered only if the corresponding provider is later approved:

- `GAMEFACE_ERROR_REPORTING_PROVIDER`
- `GAMEFACE_ERROR_MONITORING_SERVER_TOKEN`
- `GAMEFACE_PAYMENT_PROVIDER`
- `GAMEFACE_PAYMENT_SERVER_TOKEN`
- `GAMEFACE_PAYMENT_WEBHOOK_SIGNING_TOKEN`
- `GAMEFACE_PAYMENT_PRODUCT_CONFIG_REF`

Never put live values in chat, Git, screenshots, issue trackers, or public docs.

## Build

From the repository root:

```sh
npm run verify:clean
```

For a web-only production build from `web/`:

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

## Post-Deploy Smoke Checks

Run these against the deployment URL before inviting testers:

1. Open `/api/health`; confirm `status` is `ok` or expected `degraded` for an intentionally empty catalog.
2. Open `/api/uptime`; confirm the release ID and deployment environment.
3. Open `/`; complete onboarding, consent, upload fallback, quality review, attributes, profile review, results, privacy center, and delete-all.
4. Confirm production recommendations remain unavailable when the catalog is empty or kill switch is active.
5. Confirm no raw face media, screenshots, landmarks, or exact measurements appear in logs or analytics.
6. Confirm support, privacy, and terms links resolve.

## Kill Switch

Set either value to `true` and redeploy or restart according to the host:

- `NEXT_PUBLIC_GAMEFACE_RECOMMENDATIONS_DISABLED`
- `NEXT_PUBLIC_GAMEFACE_SCREENSHOT_REFINEMENT_DISABLED`

These switches only disable behavior. They cannot enable recommendations, fixtures, unverified records, payments, or screenshot refinement.

## Backup Procedure

There is no cloud database in the current MVP. Back up:

- Git commit SHA and release tag.
- Immutable production catalog manifest and checksums.
- Deployment provider build artifact or release snapshot.
- Support/incident notes kept outside the repository.

Do not back up raw user face media by default.

## Rollback Summary

Rollback requires:

- A previous release ID.
- The previous build artifact.
- The previous production catalog manifest and checksum.
- Owner or release-manager approval.
- Post-rollback `/api/health`, `/api/uptime`, and production smoke checks.
