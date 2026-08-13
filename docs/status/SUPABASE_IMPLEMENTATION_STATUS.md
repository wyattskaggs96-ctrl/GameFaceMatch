# Supabase Implementation Status

**Status:** Q07 BETA PERSISTENCE CONTRACT READY LOCALLY; LIVE SUPABASE CONNECTION HOLD_OWNER
**Date:** 2026-08-13
**Repository:** `/Users/skaggssystems/Developer/GameFaceMatch`  
**Branch audited:** `main`  
**HEAD audited:** `93601635a408aa9897cd21a8f48185ff3b6fc83d` before Prompt 085 changes
**Supabase project name reserved for setup:** `gameface-match`  
**Supabase project status:** CONNECTED SUPABASE ACCOUNT INSPECTED; GAMEFACE MATCH PROJECT NOT LISTED
**Supabase connection status:** SERVER-MEDIATED BETA PERSISTENCE ADAPTER EXISTS; LIVE CONNECTION NOT ENABLED
**Database migration status:** LOCAL SCHEMA DRAFT UPDATED FOR Q07 BETA; NOT APPLIED
**Storage migration status:** PRIVATE BETA GAME-RESULT BUCKET CONTRACT AND SQL CREATED; NO LIVE BUCKET VERIFIED
**Prompt 140 addendum:** Private-beta Buddy Trial session, feedback, upload metadata, RLS, and Storage contracts are modeled locally. Live Supabase/Vercel activation remains `HOLD_OWNER` until Wyatt supplies the approved GameFace Match Supabase project and server-only Vercel environment values.

This document tracks the phased move from local JSON/CSV/browser persistence to Supabase PostgreSQL and private Supabase Storage. It does not add credentials, connect a database, upload media, promote catalog records, or change production recommendation behavior.

## Phase Progress

| Phase | Status | Evidence |
| --- | --- | --- |
| Phase 0 - repository and data audit | Complete | This document inventories current architecture, counts, entities, media, risks, and destinations. |
| Phase 1 - create Supabase project | Complete by user action | Wyatt confirmed `gameface-match` exists in the Skaggs Systems organization and secrets are stored outside the repository. |
| Phase 2 - data model design | Complete locally, not applied remotely | `supabase/migrations/0001_gameface_core_schema.sql`, `scripts/supabase-schema-check.mjs`, and `npm run supabase:schema:check`. |
| Phase 3 - Auth and RLS policies | Q07 beta policies drafted locally; not applied remotely | `supabase/migrations/0001_gameface_core_schema.sql` now revokes anon/authenticated access to private-beta trial tables and creates trusted-server-only policies. |
| Phase 4 - Storage architecture | Private beta game-result bucket contract drafted locally; no live bucket verified | `web/lib/supabase/storage-contracts.ts` defines `private-beta-game-results`; migration SQL creates the private bucket when Storage is available. |
| Phase 5 - Application connection | Server adapter implemented for beta; live credentials missing | `web/lib/buddy-trial/buddy-trial-supabase-persistence.ts` maps the private-beta trial record to Supabase REST through a server-only adapter. It is validated with mocked Supabase calls only. |
| Phase 6 - Migration | Not started | No migration script has imported local records into Supabase. |

## Binding Rules For This Migration

- Do not upgrade any catalog, evidence, review, or verification status during migration.
- Candidate records are not automatically production records.
- Primary approval is not second verification.
- Second verification is not production approval.
- `DUPLICATE_REVIEW_REQUIRED` must remain a blocker.
- Fixture, synthetic, demo, sample, and placeholder records must remain non-production.
- Production recommendations must continue to fail closed when verified production records are unavailable.
- Private source videos and review evidence must not receive permanent public URLs.
- Service-role, database, payment, and webhook secrets must never appear in browser code, Git, docs, screenshots, or chat.

## Existing Architecture

| Area | Current state | Supabase implication |
| --- | --- | --- |
| Active app | Responsive Next.js/React/TypeScript web MVP in `web/`. | Use Supabase through browser-safe clients only for user-safe reads and server-only clients for privileged operations. |
| Native app | SwiftUI iOS foundation under `ios/`; preserved future premium TrueDepth client. | Do not couple initial Supabase work to iOS unless shared contracts require it later. |
| Current database | No committed application database, ORM, Prisma, or Drizzle config found. A local Supabase SQL draft exists, but it has not been applied remotely. | Supabase migration starts from JSON/CSV/filesystem artifacts, not an existing relational schema. |
| Current persistence | Local JSON/CSV catalog and Phase 0 artifacts under `data/`; browser `sessionStorage`/local state for non-raw user data. | Migration needs explicit import sessions and reconciliation reports. |
| Catalog runtime | Production catalog generated from `data/catalog/production/catalog_manifest.json`; current manifest is `empty-production` with 0 records. | Production reads must filter to approved release records only. Empty Supabase production views must fail closed. |
| Evidence | Source-video master references plus derivative PNG metadata in Phase 0 manifests; original videos are not committed under `data/`. | Store metadata in PostgreSQL. Upload private masters only after explicit user action and never as public assets. |
| Verification | Primary-review and second-verifier tooling exists, but no second-verifier decisions are present. | Status transitions need append-only audit events and role-bound permissions. |
| Payments | Provider-independent payment and entitlement scaffolds exist; checkout disabled. | Paid access must be server-authoritative before any real payment provider is connected. |
| Auth | No public account system or auth provider connected. | Private beta needs minimal Supabase Auth/role design before reviewer/customer access. |
| Deployment | Deployment runbooks, env validation, health/uptime routes, kill switches, and a sanitized Supabase status route exist; no public deployment. | Supabase setup must be staged behind environment validation and RLS/storage tests. |

## Current Repository State

- Git status at audit start included one pre-existing generated-file drift: `web/next-env.d.ts`.
- No Git remote is configured.
- Current root package manager is npm.
- Root verification command is `npm run verify`.
- Web framework is Next.js 16 with React 19, TypeScript, Vitest, and Playwright.
- Local MediaPipe browser landmark provider is present; processing remains local and non-identifying.
- No Supabase package client is currently installed or enabled in runtime code.
- No Supabase environment variables are committed. Local-only mode remains the default when env vars are absent.
- A local SQL schema draft now exists under `supabase/migrations/`; it has not been applied to the Supabase project.
- The schema draft now includes private-beta trial sessions and audit events for resumable Buddy Trial data. These tables are constrained to non-image derived metadata and remain inaccessible to the app until server-mediated RLS policies and credentials are activated.
- A sanitized server status route exists at `/api/internal/supabase-status`; it reports configuration/readiness booleans and redacted values only.
- Remote repository methods fail closed unless the runtime is explicitly classified as `supabase_ready`; even then, concrete Supabase writes remain disabled until a real client adapter is implemented.

## Runtime Boundary Added In Prompt 085

The application now has a typed Supabase runtime boundary without enabling remote persistence.

| Area | Implemented artifact | Current behavior |
| --- | --- | --- |
| Runtime modes | `web/lib/supabase/runtime-config.ts` | Supports `local_only`, `supabase_unavailable`, `supabase_configured_unverified`, and `supabase_ready`. Missing env vars keep the app in `local_only`; partial or unsafe config is `supabase_unavailable`; complete but unproven config is `supabase_configured_unverified`; `supabase_ready` requires explicit remote writes plus passing health and schema checks. |
| Browser-safe config | `getSupabaseBrowserRuntimeConfig` | Reads only `NEXT_PUBLIC_SUPABASE_URL` and publishable/legacy anon key names. Detects unsafe `NEXT_PUBLIC_` secret/service/database variables. |
| Server config | `getSupabaseServerRuntimeConfig` | Reads server-only secret/database flags but returns only booleans and redacted values for status reporting. |
| Status probe | `web/lib/supabase/health.ts`, `web/app/api/internal/supabase-status/route.ts` | Produces privacy-safe status reports. Health probing uses the publishable key only and does not expose server credentials. |
| Repository contracts | `web/lib/supabase/repository-contracts.ts` | Defines interfaces for anonymous scan sessions, consent records, derived profile metadata, saved builds, catalog reads, evidence metadata, recommendations, screenshot refinement sessions, deletion requests, and audit events. |
| Local adapter | `createLocalOnlyRepositories` | Keeps accountless local scan/session behavior possible and never stores raw media in metadata records. |
| Remote adapter boundary | `createFailClosedSupabaseRepositories` | Blocks remote reads/writes when not ready and does not silently fall back to local after partial Supabase configuration. |
| Storage contracts | `web/lib/supabase/storage-contracts.ts` | Defines private buckets and signed-access validation for catalog/source/review/generated assets. Public URLs are prohibited. |
| RLS specs | `web/lib/supabase/rls-policy-spec.ts` | Documents and tests local policy expectations. These are specifications only; remote RLS policies are not applied. |
| Deletion contracts | `web/lib/supabase/deletion-contracts.ts` | Defines deletion plans for local session, saved profile metadata, saved builds, screenshot media, future storage objects, and audit confirmation. |

No remote tables, policies, buckets, Auth settings, or production data changed during Prompt 085.

## Current Data Counts

| Metric | Count | Source |
| --- | ---: | --- |
| Production catalog records | 0 | `data/catalog/production/catalog_manifest.json` |
| Production catalog version | `empty-production` | `data/catalog/production/catalog_manifest.json` |
| Research candidates | 85 | `data/phase-zero/primary_review_status.json` |
| Primary approved | 0 | `data/phase-zero/primary_review_status.json` |
| Primary approved with notes | 80 | `data/phase-zero/primary_review_status.json` |
| Duplicate review required | 5 | `data/phase-zero/primary_review_status.json` |
| Second verified | 0 | `data/phase-zero/primary_review_status.json` |
| Production approved | 0 | `data/phase-zero/primary_review_status.json` |
| Records allowed in production recommendations | 0 | `data/phase-zero/primary_review_status.json` |
| Head candidates | 26 | `data/phase-zero/primary_review_status.json` |
| Additional attribute candidates | 54 | `data/phase-zero/primary_review_status.json` |
| Body/context candidates | 5 | `data/phase-zero/primary_review_status.json` |
| Evidence manifest entries | 96 | `data/phase-zero/evidence_manifest.json` |
| Source-video master references | 9 | `data/phase-zero/evidence_manifest.json` |
| Evidence derivatives in manifest | 87 | `data/phase-zero/evidence_manifest.json` |
| Video inventory rows | 11 | `data/phase-zero/video_inventory.json` |
| Unique source videos | 9 | `data/phase-zero/video_inventory.json` |
| Exact duplicate video references | 2 | `data/phase-zero/video_inventory.json` |
| Timeline records | 106 | `data/phase-zero/video_timeline.json` |
| Open issues | 44 | `data/phase-zero/issues_register.research.json` |
| Verifier queue records | 85 | `data/phase-zero/verifier_candidate_queue.json` |
| Manual matching study participants | 0 | `data/phase-zero/manual_matching_subjects.template.csv` |

## Verification-Status Inventory

| Status / class | Current count | Production eligibility | Notes |
| --- | ---: | --- | --- |
| `PRIMARY_APPROVED_WITH_NOTES` | 80 | Not production eligible | Primary review only; requires second verification and production approval. |
| `DUPLICATE_REVIEW_REQUIRED` | 5 | Not production eligible | Must remain blocked until duplicate review is resolved with evidence. |
| `SECOND_VERIFIED` | 0 | Not production eligible alone | No second human verification has occurred. |
| `PRODUCTION_APPROVED` | 0 | Eligible only inside approved immutable release | No approved records exist. |
| `TEST_FIXTURE` / synthetic | Present under `data/fixtures/test-only/` | Never production eligible | Must remain isolated in test-only namespace. |
| Empty production manifest | 0 records | Safe fail-closed state | Current correct user-facing behavior is catalog unavailable. |

## Media Inventory

| Media class | Location / reference | Count | Sensitivity | Supabase destination |
| --- | --- | ---: | --- | --- |
| Source-video master references | `data/phase-zero/video_inventory.json`; portable paths use `OWNER_DOWNLOADS/...` | 9 unique, 2 duplicate refs | Private game evidence; may contain account/menu context | Private Storage bucket `catalog-source-videos`; metadata in `evidence_files` and `source_media` after explicit upload. |
| Timeline derivative frames | `data/phase-zero/derivative-frames/` | 11 PNG files | Private review evidence | Private Storage bucket `review-evidence`; metadata in `evidence_files`. |
| Generated research frames | `data/research/cf27/generated/full-resolution-frames/` | 324 PNG files on disk | Private research evidence, not production imagery | Private Storage bucket `review-evidence` or `catalog-source-images`, depending on final evidence role. |
| Test fixtures | `data/fixtures/test-only/` | Test-only files | Non-production synthetic/test data | Keep local or upload only to a separate test project/bucket; never same production namespace. |
| User capture images | Browser memory/object URLs in current MVP | Runtime only | Sensitive face media | Do not upload by default. Future upload requires separate consent, retention policy, and private bucket. |
| Saved profiles/builds | Browser session/local state | User-local only | Derived biometric-adjacent data | Future private beta could store only consented derived profiles in protected user tables; raw media excluded. |

## Persistent Entity Inventory

| Entity | Purpose | Current fields / IDs | Relationships | Current count | Verification class | Sensitivity | Proposed Supabase destination |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| Catalog record | Represents a game appearance/control candidate or production item. | Stable IDs such as `CF27_XBOXUNKNOWN_RTG_HEAD_...`, native order, native label/index, category, evidence refs. | Game, platform, environment, menu item, evidence, reviews, releases. | 85 research candidates; 0 production | Research only | Low to medium; game data plus evidence links | `catalog_records`, `catalog_record_attributes`, `catalog_record_status_current` view |
| Appearance attribute/control | Stores non-head controls such as skin tone, eye color, nose, ear, body context. | Category-specific JSON/CSV records with native order and evidence. | Parent catalog record/category/menu/evidence. | 54 additional + 5 body/context | Research only | Low/medium | `appearance_controls`, `appearance_control_values` |
| Menu map | Captures menu hierarchy and control metadata. | Internal menu IDs, parent IDs, labels, order, control type, completeness. | Creation path, environment, catalog records, evidence. | 93 menu observations | Research map | Low/medium | `menu_nodes`, `menu_node_evidence` |
| Environment manifest | Records game/platform/capture environment. | `env-cf27-phase0-video-001-rtg-custom-qb`; unresolved version/patch fields. | Creation paths, evidence, catalog records, releases. | 1 | Research candidate | Medium because account/version context may be present | `audit_environments` |
| Creation path | Records Road to Glory path observations. | Path ID, steps, mode, player base, evidence refs. | Environment, menu nodes, evidence. | 1 | Research candidate | Low/medium | `creation_paths`, `creation_path_steps` |
| Evidence file | Stores metadata for source masters and derivatives. | Evidence ID, relative path, SHA-256, size, MIME, source video/timestamp, role, verification state. | Source media, catalog records, reviews, issues. | 96 manifest entries | Observed pending verification | Medium/private | `evidence_files`; object metadata in Storage. |
| Source media | Represents original videos/screenshots. | Inventory ID, original/canonical filename, checksum, duration, codecs, duplicate status. | Evidence files, timeline events, capture log. | 11 inventory rows, 9 unique | Source evidence, not production data | Private | `source_media` and private Storage. |
| Timeline event | Records observed menu/video events. | Video ID, timestamps, category, visible label/index, usability flags, extracted frame path. | Source media, evidence files, catalog records. | 106 | Research observation | Medium/private | `source_timeline_events` |
| Primary review | Records first-pass catalog QA outcome. | Candidate ID, status, notes, evidence adequacy, duplicate flags. | Catalog records, reviewers, evidence, issues. | 85 statuses | Primary only | Internal | `review_records` with `review_stage='primary'` |
| Secondary review | Independent verifier outcome. | Verifier package/templates exist; no decisions. | Catalog records, verifier identity, discrepancies. | 0 | Not completed | Internal | `review_records` with `review_stage='secondary'` |
| Duplicate review | Preserves duplicate/overlap decisions. | Duplicate review flags in primary status and inventory duplicate refs. | Catalog records/source media/evidence. | 5 candidate blockers; 2 exact source duplicate refs | Blocking review | Internal | `duplicate_relationships`, `review_records` |
| Production approval | Final catalog-manager decision. | Production gates/scripts exist; no approved rows. | Catalog records, releases, status transitions. | 0 | Not completed | Internal | `production_approvals`, `catalog_status_transitions` |
| Rejection / issue | Tracks missing evidence, count/order gaps, unresolved metadata. | Issue IDs, status, affected records/evidence, recapture requests. | Evidence, catalog records, capture requests. | 44 open issues | Internal blocker | Internal | `issues`, `recapture_requests` |
| Catalog release | Immutable package/release state. | Research release `0.1.0-research.1`; empty production release. | Catalog records, manifests, checksums. | Research artifacts exist; production nonempty release 0 | Research or empty production | Internal/public depending release | `catalog_releases`, `catalog_release_items`, `catalog_release_checksums` |
| Import session | Tracks generated/imported packages. | Existing scripts produce reports, but no DB sessions. | Source artifacts, imported records, exceptions. | File-based only | Internal | Internal | `import_sessions`, `import_session_errors` |
| Matching output | Stores recommendation result traceability. | Matching engine exists; no production outputs. | User profile, catalog release, candidate records. | 0 real verified outputs | Not measured | User-sensitive derived data | `match_runs`, `match_results`, only after consent/entitlement policy. |
| User search/session | Tracks user activity and capture flow. | Browser-local/session state only. | Consent, profiles, saved builds. | Local only | User data | Sensitive | `user_sessions` only if beta account/session model is approved. |
| Saved match/build | Stores user-saved non-image recommendation/build data. | Local non-image build/profile info. | User, match result, catalog version. | Local only | User data | Sensitive | `saved_builds`; raw media excluded by default. |
| User account | Authentication identity. | Not implemented. | Roles, reviews, entitlements, saved data. | 0 | Not started | Personal data | Supabase Auth plus `profiles`/`app_roles`. |
| Paid entitlement | Server-authoritative access. | TypeScript scaffold only; no provider. | User, product, receipt, refunds. | 0 | Not connected | Payment metadata | `products`, `prices`, `entitlements`, `receipts`, `refund_events`. |
| Audit event | Append-only action history. | Several file-based logs exist; DB audit not implemented. | Actor, entity, status transition, import/review session. | File-based only | Internal | Internal | `audit_events` append-only table. |

## Proposed PostgreSQL Schema

The initial Supabase schema uses explicit enums and append-only history instead of vague booleans. The local migration draft is `supabase/migrations/0001_gameface_core_schema.sql`.

### Core enums

- `data_source_type`: `production`, `research`, `research_candidate`, `shipping_game_video_research`, `public_source_only`, `test_fixture`, `demo_data`, `local_developer_sample`.
- `catalog_review_status`: `RESEARCH_CANDIDATE`, `PRIMARY_REVIEW_PENDING`, `PRIMARY_APPROVED_WITH_NOTES`, `DUPLICATE_REVIEW_REQUIRED`, `PRIMARY_REJECTED`, `SECONDARY_REVIEW_PENDING`, `SECOND_VERIFIED`, `PRODUCTION_APPROVAL_PENDING`, `PRODUCTION_APPROVED`, `PRODUCTION_REJECTED`, `RETIRED`.
- `review_stage`: `primary`, `secondary`, `catalog_manager`, `system_validation`.
- `evidence_access_classification`: `private_source`, `private_review`, `derived_review`, `public_release_metadata`, `test_only`.
- `release_status`: `draft`, `review_candidate`, `verification_candidate`, `approved_release`, `superseded_release`, `rejected_release`.
- `actor_type`: `owner_admin`, `catalog_reviewer`, `second_verifier`, `read_only_reviewer`, `private_beta_customer`, `trusted_server_process`, `automated_validator`.

### Tables

| Table | Purpose | Key fields | Critical constraints / indexes |
| --- | --- | --- | --- |
| `profiles` | Supabase Auth extension profile. | `id uuid references auth.users`, `display_name`, `created_at`, `disabled_at`. | RLS by self/admin; no raw media fields. |
| `app_roles` | Role grants. | `user_id`, `role`, `granted_by`, `granted_at`, `revoked_at`. | Unique active role per user/role; only admin/server may grant. |
| `games` | Game identity. | `id`, `title`, `publisher`, `source_policy`. | Unique game key. |
| `platforms` | Supported platform descriptors. | `id`, `platform_family`, `platform_label`. | Unique platform key. |
| `audit_environments` | Captured game/platform environment. | `environment_id`, `game_id`, `platform_id`, `game_version`, `patch`, `mode`, unresolved metadata JSON. | Required fields for production release; research may store null unresolved fields. |
| `creation_paths` | Reproducible creation/editing paths. | `creation_path_id`, `environment_id`, `mode`, `path_status`. | FK environment; indexes on environment/mode/status. |
| `creation_path_steps` | Ordered navigation steps. | `step_id`, `creation_path_id`, `step_number`, `visible_label`, `evidence_id`. | Unique path + step number. |
| `menu_nodes` | Menu hierarchy. | `menu_id`, `parent_menu_id`, `native_label`, `native_order`, `control_type`, `completeness_status`. | Parent FK; unique sibling order where known. |
| `catalog_records` | Stable catalog identities. | `catalog_record_id`, `game_id`, `platform_id`, `mode`, `creation_path_id`, `category`, `native_label`, `native_order`, `source_type`, `current_status`. | Unique stable ID; production status blocked unless source is production-eligible and gates pass. |
| `catalog_record_attributes` | Category-specific observed attributes. | `catalog_record_id`, `attribute_key`, `attribute_value_json`, `source_type`, `evidence_id`. | Indexed by category/key; no sensitive-trait labels. |
| `evidence_files` | Metadata for every media/evidence object. | `evidence_id`, `storage_bucket`, `object_path`, `original_filename`, `sha256`, `size_bytes`, `mime_type`, `access_classification`, `verification_status`. | Unique checksum/object path; relative/object path required; no public source-video URLs. |
| `source_media` | Original source video/screenshot masters. | `source_media_id`, `original_filename`, `canonical_filename`, `sha256`, `duration`, `dimensions`, `codec`, `duplicate_of`. | Unique checksum except documented duplicates. |
| `source_timeline_events` | Timestamped observations. | `timeline_event_id`, `source_media_id`, `start_timestamp`, `end_timestamp`, `visible_label`, `visible_index`, `confidence`. | Index on source/timestamp/category. |
| `record_evidence_links` | Many-to-many link between records and evidence. | `catalog_record_id`, `evidence_id`, `view`, `role`, `support_level`. | Required evidence checks for production gates. |
| `review_records` | Primary, secondary, manager, and validation reviews. | `review_id`, `catalog_record_id`, `review_stage`, `status`, `reviewer_id`, `reviewed_at`, `notes`, `evidence_id`. | Secondary review requires second-verifier role; no automatic production approval. |
| `catalog_status_transitions` | Append-only status changes. | `transition_id`, `catalog_record_id`, `previous_status`, `new_status`, `actor_id`, `actor_type`, `reason`, `evidence_id`, `import_session_id`, `is_automated`. | Insert-only by policy; automated rows cannot set `PRODUCTION_APPROVED`. |
| `duplicate_relationships` | Duplicate/overlap records. | `relationship_id`, `record_id`, `related_record_id`, `relationship_type`, `status`, `evidence_id`. | Symmetry/uniqueness checks; unresolved duplicate blocks production. |
| `issues` | Exceptions and blockers. | `issue_id`, `issue_type`, `severity`, `status`, `affected_record_id`, `affected_evidence_id`, `resolution_notes`. | Blocking open issue prevents release. |
| `recapture_requests` | Requested owner/console captures. | `capture_request_id`, `category`, `priority`, `acceptance_criteria`, `status`, `owner`. | Linked issues; production blocked until required requests close. |
| `catalog_releases` | Immutable release manifests. | `release_id`, `version`, `release_status`, `game_id`, `platform_id`, `approved_by`, `approved_at`, `manifest_checksum`. | Approved releases immutable; corrections create a new release. |
| `catalog_release_items` | Records included in a release. | `release_id`, `catalog_record_id`, `record_checksum`, `included_status`. | Only production-approved records in approved releases. |
| `import_sessions` | Migration/import attempts. | `import_session_id`, `source_artifact`, `dry_run`, `started_by`, `started_at`, `completed_at`, `status`, `summary_json`. | Idempotency key; rerunnable. |
| `import_session_errors` | Import exceptions. | `error_id`, `import_session_id`, `entity_id`, `error_code`, `message`. | Indexed by session/code. |
| `match_runs` | User matching execution trace. | `match_run_id`, `user_id`, `profile_id`, `catalog_release_id`, `algorithm_version`, `status`, `created_at`. | Requires approved catalog release unless unavailable state. |
| `match_results` | Ranked recommendations. | `match_run_id`, `rank`, `catalog_record_id`, `score`, `confidence`, `explanation_json`. | FK release item; no fixture/research records. |
| `private_beta_trial_sessions` | Resumable Buddy Trial state. | `trial_id`, `invite_id`, `session_id`, `state`, `consent_version`, derived-profile summary JSON, capture-quality metadata JSON, catalog/recommendation versions, selected settings, refinement summaries, user ratings, `expires_at`, `deleted_at`. | RLS enabled; raw face media flag must be false; raw-media-like payloads rejected; retained game-character video requires separate opt-in. |
| `private_beta_trial_audit_events` | Privacy-safe trial persistence/deletion audit events. | `trial_id`, `actor_type`, `action`, `outcome`, `metadata_json`, `created_at`. | RLS enabled; metadata rejects raw-media-like payloads. |
| `saved_builds` | User-saved non-image build instructions. | `saved_build_id`, `user_id`, `match_run_id`, `catalog_release_id`, `build_json`, `created_at`, `deleted_at`. | RLS by owner; catalog version retained. |
| `products` / `prices` | Provider-independent paid products. | Product/price IDs, purchase type, active flags. | Checkout disabled until provider selected and gates pass. |
| `entitlements` | Server-authoritative access. | `entitlement_id`, `user_id`, `access`, `status`, `source`, `expires_at`, `revoked_at`. | Users cannot self-grant. |
| `receipt_references` | Payment receipt metadata. | `receipt_id`, `provider`, `provider_reference`, `payment_status`, `refund_status`. | Server-only writes; no card data. |
| `audit_events` | Append-only security/audit log. | `event_id`, `actor_id`, `actor_type`, `action`, `target_table`, `target_id`, `metadata_json`, `created_at`. | No update/delete in app roles. |

## Proposed Storage Structure

All initial evidence buckets should be private.

| Bucket | Access | Purpose | Example object path |
| --- | --- | --- | --- |
| `catalog-source-videos` | Private, signed URL only | Original Xbox source videos after explicit upload. | `cf27/xbox/rtg/source-videos/{source_media_id}/{original_filename}` |
| `catalog-source-images` | Private, signed URL only | Original screenshots or still source evidence. | `cf27/xbox/rtg/source-images/{evidence_id}/{original_filename}` |
| `review-evidence` | Private, signed URL only | Extracted frames, contact sheets, derivative review images. | `cf27/xbox/rtg/review-evidence/{catalog_record_id}/{evidence_id}.png` |
| `generated-match-assets` | Private, signed URL only | Future user-consented generated match assets. Raw face media remains excluded by default. | `users/{user_id}/match-assets/{match_run_id}/...` |

Source-video masters must not be public. Public release metadata can expose record IDs, labels, menu paths, catalog version, and checksums only after production approval; it should not expose private source evidence without a separate legal/product decision.

## Security Model

Initial roles should be minimal:

- `owner_admin`: manages roles, releases, production approval, and emergency disablement.
- `catalog_reviewer`: can create/import research records and primary reviews.
- `second_verifier`: can submit independent verification records but cannot approve production alone.
- `read_only_reviewer`: can inspect assigned private evidence through signed URLs.
- `private_beta_customer`: can access their own saved profiles/builds and approved production catalog metadata.
- `trusted_server_process`: performs imports, signed URL creation, payment verification, and catalog-release checks.

Required RLS policies for implementation phases:

- Anonymous users cannot read private evidence, review notes, source videos, audit logs, or research candidates.
- Customers can read only approved production catalog metadata needed for recommendations and their own saved data.
- Customers cannot mutate catalog, evidence, review, release, entitlement, or audit tables.
- Primary reviewers cannot grant `SECOND_VERIFIED` or `PRODUCTION_APPROVED`.
- Second verifiers cannot silently overwrite primary observations.
- No user can grant themselves paid access.
- Service-role credentials must be server-only and never bundled.
- `audit_events` and `catalog_status_transitions` must be append-only for application roles.
- Private media access must use short-lived signed URLs generated by a trusted server path.

## Migration Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Status inflation during import | Could make unverified records look production-ready. | Import exact status values; block automatic promotion; reconcile counts before and after. |
| Fixture or synthetic leakage | Could create fake production recommendations. | Preserve `source_type`; enforce production views that exclude fixtures/research/demo/local samples. |
| Duplicate-review loss | Could recommend ambiguous records. | Model duplicate relationships separately and block unresolved duplicates. |
| Absolute owner-local paths | Breaks portability and may expose local machine paths. | Store source root tokens and storage object paths; keep absolute paths out of production-facing data. |
| Private media exposure | Source videos or screenshots could become public. | Private buckets only; signed URLs; no permanent public evidence URLs. |
| Partial media upload | Metadata could point at missing objects. | Transactional import sessions; checksum verification; orphan detection and cleanup. |
| Browser secret exposure | Service-role/database/payment secrets could leak. | Separate browser-safe env from server-only env; scan bundles and env docs. |
| Production gate bypass by payment | Paid access could unlock unavailable recommendations. | Entitlements grant feature access only; catalog quality gates remain independent and stricter. |

## Rollback Plan

Phase 0 has no Supabase state to roll back.

For later phases:

1. Keep all local JSON/CSV artifacts and original source files unchanged.
2. Use dry-run imports before writes.
3. Store every import as an `import_sessions` row with an idempotency key.
4. For failed imports, mark the session failed and do not alter local artifacts.
5. For mistaken database imports, disable the affected release/status through new corrective status transitions; do not rewrite history.
6. For media mistakes, revoke signed URL access, mark metadata rejected/retired, and preserve audit events.
7. Do not delete source masters automatically.

## Private-Beta Blockers

- No Supabase project is connected.
- No remote RLS policies, Auth roles, or Storage buckets exist yet.
- No concrete Supabase client adapter is enabled.
- No remote health check has passed against the real project from the application.
- Production catalog records remain 0.
- Second-verifier decisions remain 0.
- Production-approved records remain 0.
- Matching accuracy validation has 0 real participants.
- Private source evidence is not yet in a managed private object store.
- Payment provider is not selected or connected.
- Legal/privacy/security/mobile QA gates remain incomplete for launch.

## Supabase Readiness

| Area | Current readiness | Reason |
| --- | ---: | --- |
| Repository/data audit | 100% for Phase 0 | Current artifacts and counts are inventoried in this document. |
| Supabase project setup | 100% for dashboard creation | Wyatt confirmed the project exists and secrets are stored outside Git/chat. |
| PostgreSQL schema implementation | 30% | Local schema migration exists, is statically checked, and now marks production views as `security_invoker`; it has not been applied to Supabase. |
| RLS/security implementation | 20% | Tables enable RLS fail-closed in the draft and local RLS policy specs/tests exist. Remote policies and role tests are not applied. |
| Storage architecture implementation | 20% | Private bucket and signed-access contracts exist locally. No buckets or uploads exist. |
| Migration tooling | 0% | Existing local validators exist, but no Supabase migration scripts. |
| App connection | 15% | Typed config/status/repository boundaries exist. No concrete Supabase client/server adapter, Auth, or remote writes are enabled. |
| Overall Supabase completion | 20% | Project exists, local schema design exists, and the app now has a fail-closed runtime boundary; remote application connection and migration are still absent. |
| Private-beta readiness after Phase 0 | 25%-35% | Web shell and tooling exist; verified catalog and backend are still absent. |
| Public-launch readiness after Phase 0 | 5%-10% | Production catalog, legal, payment, deployment, and validation gates remain blocked. |

## Phase 3 Stop Point

Before Phase 3 applies migrations, configures Auth, adds policies in the Supabase dashboard, or sets environment variables, the assistant must stop and provide `STOP - USER ACTION REQUIRED` instructions. Secret values must stay in a password manager or local/hosting environment configuration, not pasted into chat.
