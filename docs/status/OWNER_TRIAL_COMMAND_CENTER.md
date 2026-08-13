# Owner Trial Command Center

**Status:** IMPLEMENTED AS INTERNAL OWNER WORKFLOW; DEPLOYABLE ONLY IN PROTECTED `owner_review` MODE
**Prompt:** GFM | Q06 | PROMPT 129 | PHASE 05 | Build owner trial command center
**Prompt 142 addendum:** GFM | Q07 | PROMPT 142 | PHASE 05 | Build owner beta review command center
**Date:** 2026-08-07
**Last updated:** 2026-08-13

## Purpose

Wyatt can operate and review the Buddy Trial owner-review program from one protected internal screen without opening database tools or editing repository files.

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
- record owner review notes and disposition;
- export a privacy-safe beta research package;
- distinguish `OWNER_REVIEW_DEMO` from future real-catalog trials.

Allowed owner review dispositions:

- `good_match`
- `needs_matcher_adjustment`
- `catalog_issue`
- `scan_issue`
- `unclear`
- `exclude_from_learning`
- `unreviewed`

## Progress Table

The table displays:

- invites issued;
- invited;
- opened;
- consent;
- scan started;
- scan;
- scan failures;
- recommendation;
- selected rank;
- build guide;
- CF27 result-photo count;
- resemblance rating;
- deletion status;
- complete;
- errors;
- owner review disposition;
- owner intervention.

The dashboard reads existing Buddy Trial session state from browser-local storage using the same local session keys as `/trial/[inviteId]`.

## Summary Metrics

The command center calculates:

- invites issued;
- trials started;
- scans started;
- scan failures;
- scans completed;
- recommendations generated;
- builds completed;
- CF27 game-photo uploads;
- game-photo completion rate;
- top-one selection rate;
- selected-rank distribution;
- top-three usefulness proxy based on completed beta feedback;
- trials completed;
- average initial score;
- average final score;
- average improvement;
- average resemblance rating;
- unassisted completion rate;
- deleted trial count;
- runtime error count;
- major failure categories.

## Per-Session Review Evidence

For each beta tester/session the detail panel shows:

- pseudonymous tester identifier;
- scan started/completed status and available capture-quality summary;
- top-three recommendation labels, ranks, scores, catalog IDs, and demo/production provenance;
- selected recommendation rank and label;
- catalog/evidence/recommendation version binding when available;
- uploaded College Football 27 output-image metadata, including private bucket/object path, dimensions, size, validation status, and upload status;
- resemblance rating;
- tester-described mismatch and notes;
- manual setting-change answer and summary;
- experimental refinement/difference signals when available;
- owner review notes;
- owner review disposition;
- deletion status;
- processing/runtime errors.

The dashboard does not render raw face media. Uploaded CF27 player images are represented by private storage metadata in this local owner-review surface; live private object viewing still depends on the Prompt 140 Supabase/Vercel activation hold being cleared.

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
- review evidence listed above;
- explicit privacy flags showing no raw face media, no raw image bytes, and no browser object URLs;
- technical errors;
- `rawMediaIncluded: false`.

Exports do not include object URLs, base64 media, thumbnails, raw videos, or raw face media.

The export filename is:

```text
gameface-owner-beta-research-package-YYYY-MM-DD.json
```

## Current Limitations

- The dashboard is browser-local and internal-only.
- Invite expiration and revocation are local owner-dashboard records, not server-enforced remote access controls.
- Real remote trial operations still require deployed persistence if Wyatt needs cross-device progress monitoring; the current owner-review dashboard reads browser-local trial state until the Prompt 140 live Supabase hold clears.
- Owner/admin authorization is enforced by an owner-review access-code cookie in deployable `owner_review` mode, not by account login.
- Real CF27 recommendations remain blocked until Prompt 103 imports and reconciles real human verifier decisions and a production catalog subset is approved.
- The Q07 ten-user beta may use the explicitly labeled `BETA_RESEARCH` tier, but this dashboard does not relabel beta results as verified or production-approved.

## Validation

Focused tests:

```text
npm --prefix web run test -- buddy-trial-owner-dashboard.test.ts owner-review-access.test.ts
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
