# GameFace Match Private Beta Readiness

**Status date:** 2026-08-13
**Prompt:** `GFM | Q07 | PROMPT 144 | PHASE 07 | Verify ten-user private beta product`
**Repository checkpoint reviewed:** `526e8fb5063c89d8642ac9546c0d16dd162d6660`
**Decision:** `HOLD_BETA`
**Current beta readiness:** `46%`
**Paid-public production readiness:** `24%`

This is the canonical private-beta readiness checkpoint for the Q07 ten-user unpaid research beta. It supersedes the July 2026 private-beta readiness checkpoint for operational beta-launch decisions. It does not weaken the permanent production catalog gate, paid/public production verification requirements, privacy rules, or the no-invented-College-Football-27-data rule.

## Executive Decision

`HOLD_BETA`.

The local GameFace Match web application has a strong owner-review/buddy-trial software path: invite route, consolidated consent, guided scan shell, owner-review demo recommendations, build walkthrough, CF27 result-photo feedback contract, owner dashboard, local deletion behavior, strict fixture isolation, and broad automated validation are green.

The actual ten-user private beta is not ready to launch because the acceptance gates that require live external proof are still open:

- no durable Vercel HTTPS deployment is linked or verified from this checkout;
- no Vercel deployment URL, deployment ID, or deployment hash is recorded;
- physical iPhone Safari scan completion on the deployed URL is not proven;
- the approved GameFace Match Supabase project/storage connection is still `HOLD_OWNER`;
- ten durable invite records/URLs do not exist;
- owner dashboard review remains browser-local until server persistence is activated;
- game-result photo storage is contracted locally but not live/private in Supabase;
- no deployed invite isolation, deletion, storage/RLS, or owner-dashboard smoke test has run.

## Scope Audited

Immediate Q07 beta scope:

- maximum 10 invited testers;
- unpaid, invite-only research beta;
- no account required for the basic tester flow;
- iPhone Safari primary client;
- Vercel HTTPS selected as hosting target;
- College Football 27 only;
- recommendations may use only the explicit non-production beta/owner-review tier and must be labeled experimental;
- production catalog remains separate and fail-closed;
- raw face scan media is not uploaded or retained by default.

## Acceptance Matrix

| # | Private-beta acceptance item | Status | Evidence | Blocking gap |
| ---: | --- | --- | --- | --- |
| 1 | Durable Vercel HTTPS deployment exists | FAIL | No `.vercel/` link, no Vercel CLI in shell, no deployment URL in repository status. | Create/link Vercel project and deploy beta environment. |
| 2 | iPhone Safari can open it | BLOCKED_EXTERNAL | No durable HTTPS beta URL exists to open. | Requires deployment, then physical iPhone check. |
| 3 | Invite gating works | PARTIAL | `/trial/[inviteId]` and owner dashboard invite creation exist locally; fixture active/expired/used/invalid routes are tested. | No deployed/server-backed invite set for exactly 10 testers. |
| 4 | Consent works | PASS | Consolidated consent is implemented and E2E-tested; legal-copy guard passes. | None for local beta flow. |
| 5 | Real camera scan works in normal posture | HOLD_REAL_HUMAN | Browser guided scan implementation and mobile-size tests pass. | Physical iPhone Safari scan completion still must be proven on deployed HTTPS. |
| 6 | Scan completes reliably enough for controlled testing | HOLD_REAL_HUMAN | Automated scan-state tests pass; previous owner physical testing found scan posture/reliability issues. | Requires owner physical-device smoke on Vercel. |
| 7 | A derived profile is produced | PARTIAL | Local capture/profile pipeline and tests pass. | Needs deployed iPhone proof for beta acceptance. |
| 8 | Experimental CF27 recommendations are generated from approved beta tier | PARTIAL | `OWNER_REVIEW_DEMO` isolated deterministic recommendations work; `BETA_RESEARCH` tier is documented. | Real Q07 beta evidence-tier path is not deployed and should not be confused with production. |
| 9 | No invented CF27 settings are shown | PASS | Production catalog is empty/fail-closed; owner-review data is tagged as demo/test data and excluded from production. | Continue gate checks during beta recommendation work. |
| 10 | Production catalog remains separate/fail-closed | PASS | Production catalog has 0 items; fixture/demo isolation tests pass. | None. |
| 11 | Tester receives usable build instructions | PARTIAL | Owner-review demo build guide and E2E path work locally. | Needs deployed beta path and final beta tier data binding. |
| 12 | Tester can select the build they used | PASS | Result-photo feedback contract requires selected recommendation rank. | Needs deployed persistence for real testers. |
| 13 | Tester can upload a front CF27 output photo | PARTIAL | Local UI/contracts validate one required front-view image. | Live private storage route/bucket not active. |
| 14 | Optional additional game views work | PARTIAL | Local contracts support left/right three-quarter optional images. | Live private storage route/bucket not active. |
| 15 | Tester can rate resemblance and provide feedback | PASS | Feedback contract requires 1-5 rating, mismatch answer, optional notes, and manual-change answer. | Needs live persistence. |
| 16 | Data reaches owner dashboard | PARTIAL | `/owner/trials` reads browser-local trial state and exports privacy-safe packages. | No central server-backed cross-device data aggregation. |
| 17 | Owner can review all 10 tester sessions | FAIL | Dashboard can display local records; no ten deployed/server-backed sessions exist. | Generate exactly 10 invites after Vercel/Supabase activation. |
| 18 | Raw face media is not retained by default | PASS | Privacy tests and persistence validators reject raw face media, data URLs, object URLs, raw landmarks, and embeddings. | Physical/browser lifecycle should still be checked on iPhone. |
| 19 | Game-result photos are private | PARTIAL | `private-beta-game-results` private bucket contract and object metadata exist locally. | Bucket/RLS/storage not created or verified remotely. |
| 20 | Complete deletion works | PARTIAL | Local deletion and server-side deletion contract/tests exist. | Deployed Supabase deletion and object deletion not smoke-tested. |
| 21 | 10 valid invite links exist | FAIL | No owner-only ten-invite artifact or durable invite table exists. | Create exactly 10 after live deployment/backend gates clear. |
| 22 | Vercel deployment has no material runtime blocker | FAIL | No Vercel deployment or runtime logs available. | Deploy and inspect logs. |
| 23 | Supabase has no material data/security blocker | FAIL | Local schema check passes; live project/storage/RLS not activated. | Owner must confirm GameFace Match Supabase project/access. |
| 24 | Core automated validation is green | PASS | `npm run verify` passed; focused Buddy Trial E2E passed. | Does not replace physical/deployed checks. |
| 25 | Beta is clearly labeled experimental and independent | PASS | Owner-review banner, independent-app copy, and legal-copy guard pass. | Ensure same copy is present in deployed beta mode. |

## Current Counts

| Item | Count / status |
| --- | --- |
| Production catalog records | `0` |
| Production-approved CF27 records | `0` |
| Second-verified CF27 records | `0` |
| CF27 research candidates | `92` |
| Supported-subset verifier queue | `76` |
| Deterministic secondary-angle sample | `24` |
| Durable ten-user beta invites | `0` |
| Built-in active local fixture invite | `1` |
| Vercel deployment URL | `none recorded` |
| Supabase live project/storage | `HOLD_OWNER` |

## Product Journey Status

| Stage | Status | Notes |
| --- | --- | --- |
| Invite open | PARTIAL | Works locally for fixture/owner-generated invite IDs. Not deployed. |
| Consent | PASS | One compact checkbox gates scan entry while preserving consent state. |
| iPhone guided scan | HOLD_REAL_HUMAN | Software tests pass; physical Safari scan completion still unproven. |
| Derived profile | PARTIAL | Local profile generation exists; beta acceptance needs deployed-device proof. |
| Experimental recommendation | PARTIAL | Owner-review demo can generate settings; production remains unavailable. |
| Build guide | PARTIAL | Local demo guide works; true beta needs deployed invite/session backing. |
| CF27 result photo | PARTIAL | Local validation/feedback contract exists; no live private storage. |
| Feedback/rating | PASS locally | Structured 1-5 beta feedback contract exists. |
| Owner dashboard | PARTIAL | Local/browser dashboard exists; no server-backed ten-session overview. |
| Deletion | PARTIAL | Local and contract-level deletion pass; live storage deletion not proven. |

## Automated Validation Snapshot

Commands run for this checkpoint:

| Command | Result | Notes |
| --- | --- | --- |
| `npm run status:check` | PASS | Current project state consistency OK, 21 checks. |
| `npm run legal:copy-check` | PASS | 471 files scanned; no affirmative blocked legal/marketing claims. |
| `npm run supabase:schema:check` | PASS | Local Supabase schema contract OK, 36 tables, 11 catalog statuses. |
| `npm --prefix web run typecheck` | PASS | TypeScript passed after production catalog generation. |
| `npm --prefix web run lint` | PASS | Lint OK. |
| `npm run cf27:production-catalog-release:check` | PASS | Production catalog release manager check OK. |
| `npm run cf27:supported-subset:check` | PASS | 92 candidates, 76 verifier-queue records. |
| `npm --prefix web run test -- buddy-trial-session.test.ts buddy-trial-persistence.test.ts buddy-trial-result-photo-feedback.test.ts buddy-trial-owner-dashboard.test.ts owner-review-access.test.ts supabase-runtime-boundary.test.ts owner-review-demo.test.ts` | PASS | 7 files, 65 tests. |
| `npm --prefix web run test` | PASS | 169 files, 1214 tests. |
| `npm --prefix web run build` | PASS_WITH_WARNINGS | Build and production bundle guard pass; Turbopack warns that `app/api/internal/current-research-catalog/route.ts` dynamic filesystem access traces the whole project. |
| `npm run owner:review:e2e` | PASS | 6/6 iPhone-size Buddy Trial E2E tests. |
| `npm run verify` | PASS_WITH_SKIP | Repository verification passed; native iOS build/tests skipped because `xcodebuild` is unavailable. Web E2E: 60 passed, 3 skipped; Phase 0 E2E: 10 passed. |

Checks not run because required external evidence is unavailable:

- deployed Vercel route checks;
- physical iPhone Safari scan on Vercel;
- Vercel runtime-error review;
- live Supabase RLS/storage/deletion smoke tests;
- invite isolation across live deployed tester sessions.

## Vercel Status

`HOLD_BETA`.

Observed from the checkout:

- `.vercel/` and `web/.vercel/` are absent;
- `vercel` CLI is not available in the current shell;
- no Vercel project ID, deployment ID, deployment hash, or durable beta URL is recorded in the repository;
- no deployment logs were available to inspect.

## Supabase Status

`HOLD_OWNER`.

Observed from the checkout and current status docs:

- local schema/migration contracts are present and pass validation;
- the intended `private-beta-game-results` storage bucket is defined as a contract;
- server-mediated persistence adapter exists and is tested with mocked calls;
- no approved GameFace Match Supabase project is connected in this checkout;
- no remote migration, Storage bucket, RLS policy, or deletion smoke test has been performed.

## Current Release Decision

`HOLD_BETA`.

The local software baseline is good enough to continue beta-launch implementation, but not enough to send links to 10 outside testers. The first blocking gate is durable Vercel HTTPS deployment plus owner physical iPhone scan proof. The second blocking gate is live Supabase/private-storage activation or an explicitly accepted beta limitation that keeps all sessions local, which would not satisfy central owner review of 10 testers.

## Readiness Percentages

- **Current ten-user private beta readiness:** `46%`
  - Weighting gives strong credit for local product flow, consent, demo isolation, photo-feedback contracts, owner dashboard, privacy tests, and broad automation.
  - It does not give launch credit for Vercel, physical iPhone proof, live Supabase/private storage, exactly 10 invites, or deployed owner-dashboard review because those are not done.
- **Paid-public production readiness:** `24%`
  - Paid/public remains much lower because production catalog records are `0`, second-verifier decisions are `0`, payment/entitlement stack is not live, matching usefulness is unmeasured, and legal/public operations are incomplete.

## Immediate Launch Instructions

Do not send tester links yet.

The exact next launch work is:

1. Create/link and deploy the Vercel private-beta environment.
2. Configure and verify the approved GameFace Match Supabase project/storage/RLS/deletion path.
3. Run a physical iPhone Safari owner rehearsal on the Vercel URL.
4. Generate exactly 10 invite records/URLs only after the deployed rehearsal passes.

## After First Tester Completes

Once the beta is actually launched and the first tester completes a session, the next action is to inspect the owner dashboard record, confirm scan quality, recommendation rank selected, uploaded CF27 photo metadata, resemblance rating, feedback text, deletion state, and any runtime/storage errors before inviting the remaining testers.
