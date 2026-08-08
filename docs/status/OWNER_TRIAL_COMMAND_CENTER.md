# Owner Trial Command Center

**Status:** IMPLEMENTED AS INTERNAL OWNER WORKFLOW; DEPLOYABLE ONLY IN PROTECTED `owner_review` MODE
**Prompt:** GFM | Q06 | PROMPT 129 | PHASE 05 | Build owner trial command center
**Date:** 2026-08-07

## Purpose

Wyatt can now operate the Buddy Trial owner-review program from one internal screen without opening database tools or editing repository files.

## Start Command

```bash
npm run owner:trials:start
```

Open:

```text
http://localhost:3000/owner/trials
```

The local route is available in development. A production-built owner-review deployment may expose the route only when:

- `NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV=owner_review`
- `NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO=true`
- `GAMEFACE_OWNER_REVIEW_ACCESS_CODE` is configured as a server-only secret

The route remains unavailable in true `production`.

## Owner Route

```text
/owner/trials
```

Visual evidence:

```text
docs/status/visual-evidence/prompt129/owner-trial-command-center.png
```

The command center supports:

- create a new opaque Buddy Trial invite;
- show labels such as `Buddy Trial #007`;
- copy invite link;
- copy text message;
- inspect progress;
- expire invite;
- revoke invite;
- delete local trial data;
- record owner intervention as `Unknown`, `Unassisted`, or `Owner helped`;
- export structured results;
- distinguish `OWNER_REVIEW_DEMO` from future real-catalog trials.

## Progress Table

The table displays:

- invited;
- opened;
- consent;
- scan;
- recommendation;
- build guide;
- Video #1;
- refinement;
- Video #2;
- final score;
- resemblance rating;
- complete;
- errors;
- owner intervention.

The dashboard reads existing Buddy Trial session state from browser-local storage using the same local session keys as `/trial/[inviteId]`.

## Summary Metrics

The command center calculates:

- trials started;
- scans completed;
- builds completed;
- Video #1 completion;
- refinement completion;
- trials completed;
- average initial score;
- average final score;
- average improvement;
- average resemblance rating;
- unassisted completion rate.

## Privacy and Raw-Media Boundary

The owner dashboard does not display raw face images or raw character videos by default.

Structured exports include:

- trial label and invite ID;
- mode;
- status;
- owner-intervention status and notes;
- session state;
- consent accepted timestamp;
- final outcome when present;
- learning-record ID when present;
- technical errors;
- `rawMediaIncluded: false`.

Exports do not include object URLs, base64 media, thumbnails, raw videos, or raw face media.

## Current Limitations

- The dashboard is browser-local and internal-only.
- Invite expiration and revocation are local owner-dashboard records, not server-enforced remote access controls.
- Real remote trial operations still require deployed persistence if Wyatt needs cross-device progress monitoring; the current owner-review deployment uses browser-local trial state.
- Owner/admin authorization is enforced by an owner-review access-code cookie in deployable `owner_review` mode, not by account login.
- Real CF27 recommendations remain blocked until Prompt 103 imports and reconciles real human verifier decisions and a production catalog subset is approved.

## Validation

Focused tests:

```text
npm --prefix web run test -- buddy-trial-owner-dashboard.test.ts buddy-trial-session.test.ts
```

Core validation should include:

```text
npm --prefix web run typecheck
npm --prefix web run lint
npm --prefix web run test
npm --prefix web run build
npm run status:check
npm run verify
```
