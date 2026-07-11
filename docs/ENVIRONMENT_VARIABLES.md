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
- `NEXT_PUBLIC_GAMEFACE_PAYMENT_PROVIDER_LABEL`

Public URLs should be HTTPS in production. Localhost is acceptable only for local testing.

## Server-only variables

These must never be exposed with `NEXT_PUBLIC_` and must never be committed with real values:

- `GAMEFACE_PAYMENT_PROVIDER`
- `GAMEFACE_PAYMENT_SERVER_TOKEN`
- `GAMEFACE_PAYMENT_WEBHOOK_SIGNING_TOKEN`
- `GAMEFACE_PAYMENT_PRODUCT_CONFIG_REF`
- `GAMEFACE_ERROR_MONITORING_SERVER_TOKEN`

Server-only variables are not required until payment, webhooks, or server-side monitoring are actually implemented.

## Secure entry location

Future secrets should be entered only in:

- Hosting provider environment-variable dashboard
- Payment provider dashboard where applicable
- Local `.env.local` during development, excluded from git
- CI/CD secret store if a CI pipeline is added

Do not paste live secret values into chat, docs, source files, screenshots, issue trackers, or pull requests.

## Validation

`web/lib/config/environment.ts` defines the current variable contract and validates URL shape, legal URL readiness, and future payment-required variables without reading any live secret values.
