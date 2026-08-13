# Private Beta Persistence And Storage

**Prompt:** `GFM | Q07 | PROMPT 140 | PHASE 04 | Connect beta persistence and private storage`
**Prompt 141 addendum:** `GFM | Q07 | PROMPT 141 | PHASE 05 | Add CF27 result photo and feedback loop`
**Date:** 2026-08-13
**Status:** CODE AND SCHEMA READY LOCALLY; LIVE CONNECTION `HOLD_OWNER`

## Outcome

GameFace Match now has a Q07 private-beta persistence and private-storage contract for the ten-user research beta. The repository can validate pseudonymous beta sessions, privacy-safe derived-profile summaries, capture-quality summaries, recommendation/catalog version references, selected settings, feedback, deletion state, and later CF27 output screenshot/photo metadata.

Prompt 141 adds the customer-facing post-build result-photo and feedback loop at the end of the Owner Review Demo build guide. A tester can indicate that they built the player in College Football 27, upload one required front-view image and up to two optional three-quarter images, choose which top-three recommendation they built, rate resemblance from 1-5, answer whether another option looked better, record manual setting changes, add notes, and submit the result as private-beta research feedback.

Live Supabase activation was not performed. The connected Supabase account currently lists `skaggs-systems-autopilot` and `ball-knower-growth-os`; it does not list an approved GameFace Match project. No schema was applied remotely, no Storage bucket was created remotely, no Vercel environment variable was written, and no beta data was uploaded.

## Existing Schema Reused

The existing local migration `supabase/migrations/0001_gameface_core_schema.sql` already contained:

- catalog, evidence, verification, release, match, payment, entitlement, and audit entities;
- `private_beta_trial_sessions`;
- `private_beta_trial_audit_events`;
- RLS enablement on all public tables;
- fail-closed production catalog views.

Prompt 140 extends that local draft instead of creating a second backend.

## Schema Changes

The local schema draft now includes:

- `data_source_type = 'beta_research'` for the controlled Q07 beta tier;
- `private_beta_trial_sessions.schema_version`;
- `private_beta_trial_audit_events.audit_event_client_id`;
- `private_beta_trial_feedback`;
- `private_beta_trial_uploads`;
- direct anon/authenticated role revocation for private-beta trial tables;
- trusted-server-only policy specs for beta session, audit, feedback, and upload metadata writes;
- private Storage bucket setup for `private-beta-game-results` when Supabase Storage is present.

## RLS And Access Controls

Private beta persistence is server-mediated:

- anonymous browser roles cannot read or mutate private-beta trial tables directly;
- authenticated browser roles cannot read or mutate private-beta trial tables directly;
- the server adapter requires a server-only Supabase secret key;
- owner retrieval and deletion must be implemented through server routes that enforce invite/owner authorization;
- production catalog gates are unchanged and do not read from beta tables.

## Stored Beta Fields

Allowed beta data:

- pseudonymous beta trial ID;
- invite ID;
- browser trial session ID;
- consent version and timestamp;
- flow state;
- derived face profile summary needed for matching;
- capture quality summary;
- recommendation version;
- catalog/evidence version reference;
- selected game setting references;
- refinement/result summaries;
- resemblance rating and scrubbed feedback;
- deletion state and audit events;
- later CF27 output screenshot/photo metadata and private object paths.
- Prompt 141 result-photo feedback payloads, including selected recommendation rank, catalog/evidence version binding, photo metadata, resemblance rating, manual-change summary, and scrubbed notes.

## Prohibited Fields

The beta persistence contract rejects or excludes:

- raw face scan images;
- raw face scan video;
- data URLs;
- object URLs;
- base64 media;
- raw landmarks;
- landmark arrays/vectors;
- embeddings or identity templates;
- exact facial-measurement payloads for analytics/global learning;
- unredacted secrets;
- payment data;
- production-verification claims.
- raw human face photos collected after the scan; Prompt 141 requests only College Football 27 created-player screenshots/photos.

## Private Storage

The planned bucket is:

```text
private-beta-game-results
```

Purpose:

- temporary private storage for CF27 output screenshots/photos supplied by beta testers;
- not for raw human face scan media;
- signed/server-mediated access only;
- 25 MB per object;
- `image/png`, `image/jpeg`, and `image/webp` only;
- default retention: 14 days for game-result uploads.

Prompt 141 binds each upload to the beta trial ID, invite ID, original recommendation version, selected recommendation rank, catalog version, and private bucket/object path. Live upload remains disabled until the approved Supabase project and server-mediated upload route are active.

## Deletion Contract

Server-side deletion must:

- mark the trial `DELETED`;
- clear derived profile and capture quality payloads;
- clear selected settings and refinement payloads;
- clear structured user ratings where required;
- mark linked game-result upload metadata deleted;
- delete associated Storage objects through the server process;
- append a privacy-safe audit event without media payloads.

## Vercel Environment Integration

Required Vercel private-beta variables after the approved Supabase project exists:

- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`;
- `SUPABASE_DIRECT_DATABASE_URL` or `SUPABASE_POOLED_DATABASE_URL`;
- `SUPABASE_STORAGE_CONFIGURED=true`;
- `GAMEFACE_SUPABASE_REMOTE_WRITES_ENABLED=true`.

Only the first two are browser-safe. All secret/database/storage/write-enable values must stay in Vercel server-side environment configuration or gitignored local files.

## Remaining Hold

`HOLD_OWNER`: Wyatt must provide or confirm the intended GameFace Match Supabase project and Vercel project environment access before live migration, live Storage creation, and deployed smoke tests can run.
