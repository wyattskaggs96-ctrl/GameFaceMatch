# Owner Review Deployment Prep

**Status:** DEPLOY-READY CONFIGURATION, NOT DEPLOYED  
**Prompt:** `GFM | Q06 | PROMPT 130 | PHASE 06 | Deploy owner review experience`  
**Date:** 2026-08-07  
**Repository baseline:** `main` at `bf53265f82df4c38f9521a71c759fad92c6cbf72`

## Executive Result

The complete `OWNER_REVIEW_DEMO` Buddy Trial experience is prepared for a private HTTPS owner-review deployment, but no real HTTPS URL was created during Prompt 130 because the repository does not contain a configured hosting project, deployment connector, domain target, or provider credentials.

Smallest external blocker:

Wyatt must approve or provide one HTTPS hosting target for the Next.js web app and configure a server-side `GAMEFACE_OWNER_REVIEW_ACCESS_CODE` secret in that host.

## Existing Deployment Infrastructure Audited

- No `.openai/hosting.json` was present.
- No `vercel.json`, `netlify.toml`, `wrangler.toml`, `amplify.yml`, `firebase.json`, or Docker deployment descriptor was present.
- CI exists at `.github/workflows/web-ci.yml` and runs non-mutating verification.
- The web app is a Next.js app under `web/`.
- Runtime health routes exist at `/api/health` and `/api/uptime`.
- Security headers are configured in `web/next.config.ts`.
- Deployment planning docs exist in `docs/DEPLOYMENT_READINESS.md`, `docs/DEPLOYMENT_RUNBOOK.md`, and `docs/DOMAIN_AND_DNS_REQUIREMENTS.md`.

## Owner Review Environment

Deploy with:

```text
NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV=owner_review
NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO=true
NEXT_PUBLIC_GAMEFACE_RECOMMENDATIONS_DISABLED=true
NEXT_PUBLIC_GAMEFACE_SCREENSHOT_REFINEMENT_DISABLED=false
GAMEFACE_OWNER_REVIEW_ACCESS_CODE=<server-side secret>
```

Recommended root build command:

```sh
npm run owner:review:build
```

Local production-built smoke command:

```sh
npm run owner:review:start
```

Local smoke URL:

```text
http://localhost:3000/owner/trials?ownerCode=local-owner-review-access-code
```

Do not use the local smoke code on a deployed host.

## Routes

Owner dashboard:

```text
/owner/trials
```

Customer invite route:

```text
/trial/<opaque-invite-id>
```

Verifier route, still internal:

```text
/verifier
```

Internal API routes:

```text
/api/internal/*
```

## Security Behavior

- `production` deployment keeps `/owner/*`, `/verifier/*`, and `/api/internal/*` unavailable.
- `owner_review` deployment requires `GAMEFACE_OWNER_REVIEW_ACCESS_CODE` for `/owner/*`, `/verifier/*`, and `/api/internal/*`.
- A correct `ownerCode` or `accessCode` query parameter sets an HTTP-only, same-site, secure cookie and redirects to the same URL without the query value.
- Customer invite routes do not require owner credentials, but they remain opaque-link, invite-only trial routes and display the Owner Review Demo banner.
- Payments remain disabled.
- Production catalog records remain unchanged.
- Demo recommendations remain `demoData` and cannot enter production matching without the explicit owner-review demo switch.
- Owner dashboard exports set `rawMediaIncluded: false`.
- Raw human face media and raw character videos are not retained by default.

## Included Owner Review Experience

The owner-review demo route can exercise:

- private Buddy Trial invite landing;
- consent;
- Prompt 104 guided scan handoff;
- scan-complete processing;
- demo recommendation;
- step-by-step build guide;
- Video #1 upload/recording and local review;
- measurable refinement plan;
- Video #2 upload/recording and final comparison;
- feedback and resemblance rating;
- structured demo-only learning record;
- owner command center.

## Known Limitations

- No deployed URL exists yet.
- No domain or DNS record is configured.
- No hosting provider project is registered in the repository.
- Browser-local trial state means owner-dashboard progress is same-browser only until server persistence is activated.
- Invite expiration and revocation are local owner-dashboard records, not server-enforced remote controls.
- Real CF27 production recommendations remain blocked because production catalog records remain zero.

## Next Owner Action

Choose or authorize an HTTPS host for the Next.js app and set:

```text
NEXT_PUBLIC_GAMEFACE_APP_BASE_URL=<owner-review HTTPS URL>
NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV=owner_review
NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO=true
GAMEFACE_OWNER_REVIEW_ACCESS_CODE=<server-side secret>
```

Then deploy using the repository's `npm run owner:review:build` command and smoke-test `/owner/trials?ownerCode=<secret>`.
