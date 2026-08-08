# Environment Variables

## Current state

The current web MVP requires no environment variables to run locally, build, or test.

The only runtime branch currently used by the app is `NODE_ENV`, which Next.js provides.

## Example file

Root `.env.example` lists variable names only and intentionally contains no values.

## Public variables

These may be exposed to browser bundles and must not contain secrets:

- `NEXT_PUBLIC_GAMEFACE_APP_BASE_URL`
- `NEXT_PUBLIC_GAMEFACE_PRIVACY_URL`
- `NEXT_PUBLIC_GAMEFACE_TERMS_URL`
- `NEXT_PUBLIC_GAMEFACE_SUPPORT_URL`
- `NEXT_PUBLIC_GAMEFACE_SUPPORT_CONTACT`
- `NEXT_PUBLIC_GAMEFACE_PAYMENT_PROVIDER_LABEL`
- `NEXT_PUBLIC_GAMEFACE_RELEASE_ID`
- `NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV`
- `NEXT_PUBLIC_GAMEFACE_RECOMMENDATIONS_DISABLED`
- `NEXT_PUBLIC_GAMEFACE_SCREENSHOT_REFINEMENT_DISABLED`
- `NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO`

Public URLs should be HTTPS in production. Localhost is acceptable only for local testing.

`NEXT_PUBLIC_GAMEFACE_RECOMMENDATIONS_DISABLED` and `NEXT_PUBLIC_GAMEFACE_SCREENSHOT_REFINEMENT_DISABLED` are disable-only kill switches. They can block recommendations or screenshot refinement, but they cannot enable unverified catalog records, fixtures, payments, or production recommendations.

`NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV` accepts `local`, `development`, `preview`, `staging`, `owner_review`, or `production`. `development` is treated as a local runtime label. `owner_review` is the only deployable non-production mode that may expose internal owner-review tooling, and it must be paired with the server-only `GAMEFACE_OWNER_REVIEW_ACCESS_CODE`.

`NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO=true` enables the isolated Owner Review Demo lane only outside `production`. It does not enable production catalog records, real recommendations, payments, real beta metrics, or production matching-weight changes.

## Server-only variables

These must never be exposed with `NEXT_PUBLIC_` and must never be committed with real values:

- `GAMEFACE_PAYMENT_PROVIDER`
- `GAMEFACE_PAYMENT_SERVER_TOKEN`
- `GAMEFACE_PAYMENT_WEBHOOK_SIGNING_TOKEN`
- `GAMEFACE_PAYMENT_PRODUCT_CONFIG_REF`
- `GAMEFACE_EXPECTED_CATALOG_VERSION_ID`
- `GAMEFACE_ERROR_REPORTING_PROVIDER`
- `GAMEFACE_ERROR_MONITORING_SERVER_TOKEN`
- `GAMEFACE_OWNER_REVIEW_ACCESS_CODE`

Server-only variables are not required until owner-review deployment, payment, webhooks, or server-side monitoring are actually implemented.

`GAMEFACE_OWNER_REVIEW_ACCESS_CODE` is required only for an `owner_review` HTTPS deployment. It protects `/owner/*`, `/verifier/*`, and `/api/internal/*` through an HTTP-only same-site cookie after Wyatt opens the owner dashboard with the access code query parameter. Do not commit the real value.

## Secure entry location

Future secrets should be entered only in:

- Hosting provider environment-variable dashboard
- Payment provider dashboard where applicable
- Local `.env.local` during development, excluded from git
- CI/CD secret store if a CI pipeline is added

Do not paste live secret values into chat, docs, source files, screenshots, issue trackers, or pull requests.

## Validation

`web/lib/config/environment.ts` defines the current variable contract and validates URL shape, legal URL readiness, boolean kill-switch values, and future payment-required variables without reading any live secret values.

`web/lib/config/deployment.ts` converts public environment values into a runtime deployment configuration used by health checks and capability gates.
