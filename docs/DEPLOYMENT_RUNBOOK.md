# Deployment Runbook

Status: deployment preparation only. Do not deploy publicly without explicit Wyatt approval.

Owner-review deployment is allowed only as a private, non-public review environment after Wyatt approves a hosting target and supplies server-side environment values. It must not enable payments or advertise the product as launched.

## Selected Architecture

Use a dedicated HTTPS app origin for the responsive web MVP while the Skaggs Systems/Squarespace site remains the marketing surface. The app should be linked from Squarespace or served on a dedicated subdomain. Embedding inside Squarespace remains discouraged until camera permissions, CSP, iframe permissions, privacy copy, and mobile browser behavior are tested on the final host.

Q07 selects Vercel as the first durable HTTPS host for the ten-user unpaid private beta.

## Vercel Project Configuration

Create or link a Vercel project named `gameface-match-private-beta` with:

- Framework Preset: Next.js
- Root Directory: `web`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output behavior: Vercel-managed Next.js output from `web/.next`
- Node/runtime: Vercel default Node runtime compatible with Next.js 16

The repository root contains `vercel.json` so this configuration is reproducible.

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
- `NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO`

Recommended Q07 private-beta values:

- `NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV=private_beta`
- `NEXT_PUBLIC_GAMEFACE_RECOMMENDATIONS_DISABLED=true`
- `NEXT_PUBLIC_GAMEFACE_SCREENSHOT_REFINEMENT_DISABLED=true`
- `NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO=false`

Server-only values, entered only if the corresponding provider is later approved:

- `GAMEFACE_OWNER_REVIEW_ACCESS_CODE`
- `GAMEFACE_ERROR_REPORTING_PROVIDER`
- `GAMEFACE_ERROR_MONITORING_SERVER_TOKEN`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DIRECT_DATABASE_URL` or `SUPABASE_POOLED_DATABASE_URL`
- `SUPABASE_STORAGE_CONFIGURED`
- `GAMEFACE_SUPABASE_REMOTE_WRITES_ENABLED`
- `GAMEFACE_PAYMENT_PROVIDER`
- `GAMEFACE_PAYMENT_SERVER_TOKEN`
- `GAMEFACE_PAYMENT_WEBHOOK_SIGNING_TOKEN`
- `GAMEFACE_PAYMENT_PRODUCT_CONFIG_REF`

Never put live values in chat, Git, screenshots, issue trackers, or public docs.

## Q07 Supabase beta persistence

Private-beta durable persistence uses Supabase only after the intended GameFace Match project is available and the local schema has been applied. The current contract persists pseudonymous trial/session data, consent timestamps, derived-profile summaries, capture quality summaries, recommendation/catalog version references, selected settings, user ratings/feedback, and deletion state. It explicitly rejects raw face scan media, raw landmarks, embeddings, exact measurement payloads, object URLs, data URLs, and base64 media.

Apply the local schema only to the approved GameFace Match beta Supabase project, then configure Vercel Preview/Private Beta environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DIRECT_DATABASE_URL` or `SUPABASE_POOLED_DATABASE_URL`
- `SUPABASE_STORAGE_CONFIGURED=true`
- `GAMEFACE_SUPABASE_REMOTE_WRITES_ENABLED=true`

The Storage bucket `private-beta-game-results` must remain private. Browser clients should upload through server-mediated signed operations only; raw human face scan media remains prohibited for beta persistence.

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

For a private owner-review build from the repository root:

```sh
npm run owner:review:build
```

For local smoke testing of the production-built owner-review mode:

```sh
npm run owner:review:start
```

Open:

```text
http://localhost:3000/owner/trials?ownerCode=local-owner-review-access-code
```

Do not reuse `local-owner-review-access-code` on a real host. The deployed value must be generated by Wyatt or the hosting provider and stored as a server-only secret.

## Post-Deploy Smoke Checks

Run these against the deployment URL before inviting testers:

1. Open `/api/health`; confirm `status` is `ok` or expected `degraded` for an intentionally empty catalog.
2. Open `/api/uptime`; confirm the release ID and deployment environment.
3. Open `/`; complete onboarding, consent, upload fallback, quality review, attributes, profile review, results, privacy center, and delete-all.
4. Confirm production recommendations remain unavailable when the catalog is empty or kill switch is active.
5. Confirm no raw face media, screenshots, landmarks, or exact measurements appear in logs or analytics.
6. Confirm support, privacy, and terms links resolve.

Owner-review smoke checks:

1. Open `/owner/trials` without an access code; confirm it returns `401` or host equivalent.
2. Open `/owner/trials?ownerCode=<real owner-review code>`; confirm the query parameter is removed and the owner dashboard loads.
3. Create a Buddy Trial invite and open `/trial/<invite-id>` from the same HTTPS origin.
4. Confirm the banner says `Owner Review Demo — appearance settings are test data.`
5. Confirm `/verifier` and `/api/internal/*` require the same owner-review access cookie.
6. Confirm `/api/health` and `/api/uptime` do not expose secrets or media.

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
