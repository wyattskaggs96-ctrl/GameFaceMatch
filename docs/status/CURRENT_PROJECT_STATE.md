# Current Project State

**Status:** AUTHORITATIVE CURRENT OPERATIONAL STATUS
**Last reconciled:** 2026-08-13
**Repository:** `/Users/skaggssystems/Developer/GameFaceMatch`
**Branch:** `main`
**Repository checkpoint reviewed:** Q07 Prompt 136 ten-user beta scope lock
**Active client:** responsive web MVP under `web/`
**Preserved future client:** SwiftUI iOS foundation under `ios/`
**Current active phase:** ten-user private beta scope lock, beta research tier definition, Buddy Trial preparation, and production-catalog gatekeeping
**Exact next action:** `docs/status/NEXT_ACTION.md`

This is the single current operational status source. Older audits, readiness reports, prompt reports, and closeouts are historical unless this document or the machine-readable files linked below explicitly cite them as current evidence.

<!-- status-assertions:start -->
```json
{
  "schemaVersion": "current-project-state-v3",
  "repositoryCheckpoint": "PROMPT_136_TEN_USER_PRIVATE_BETA_SCOPE",
  "productionCatalogRecords": 0,
  "secondVerificationDecisions": 0,
  "manualMatchingStudyValidParticipants": 0,
  "matchingAccuracyValidation": "NOT_MEASURED",
  "productionReadiness": "BLOCKED_NO_PRODUCTION_ELIGIBLE_RECORDS",
  "productionRecommendationsEnabled": false
}
```
<!-- status-assertions:end -->

## Q07 Owner Decision

The immediate milestone is now a controlled unpaid research beta for a maximum of 10 invited testers. The beta target is an iPhone Safari flow hosted on Vercel for College Football 27. It does not require payment or account creation for the basic flow.

The beta may use the explicit `betaResearch` / `BETA_RESEARCH` non-production tier for clearly labeled experimental private-beta recommendations. This does not remove the production catalog gate: beta records must not become `VERIFIED`, production-approved, production catalog records, second-verifier decisions, paid/public recommendations, or matching-study proof by implication.

The paid/public product still requires real second-human verification, catalog-manager approval, immutable production catalog release, server-authoritative payment and entitlement handling, legal review, deployment, and validation.

## Product Mission

GameFace Match is intended to let a customer capture their face and receive personalized Create-a-Player instructions for supported sports games. The product must not claim direct game import, official publisher integration, identity recognition, biometric identification, or guaranteed resemblance.

The current approved business direction is:

- `$4.99` one-time Launch Pack for the five original launch games, with each game still gated by verified production-catalog support.
- `$9.99/year` All Access for every supported game and future supported games while subscribed, again only after each catalog is production-supported.
- Creator Program economics as defined in `docs/Product/Creator Program/CREATOR_PROGRAM_SOURCE_OF_TRUTH.md`.

The current implementation does not yet support paid purchases, subscriptions, creator attribution, creator commissions, or payouts.

The older Prompt 080 `$0.99` One Scan and `$1.99/month` Monthly scan-entry model is superseded for active product configuration. It may remain only as historical audit context.

## Current Working State

Creator Program source/planning material has been committed as project documentation. No creator-program runtime behavior, checkout, payout, or commission processing exists.

Prompt 097 independently confirms that Prompts 090-096 left the repository in a fail-closed state: approved Launch Pack and All Access pricing are configured but checkout remains disabled, five launch targets are registered without false support claims, CF27 has a 92-record non-production verification queue, second verification remains at 0 decisions, the production catalog remains empty, and the matching-study workflow exists but has 0 real participants.

Prompt 083 public-launch completion audit sets current **PUBLIC PAID-LAUNCH READINESS** at **34%** and a **NO-GO** decision for paid public launch. The score is weighted against customer onboarding/capture, face processing, verified production data, matching, build/refinement, privacy/security, backend, payments, reliability, and launch operations. The score is low primarily because no game has a nonempty verified production catalog, payments are disabled, Supabase is not deployed, no real matching study has run, and legal/support/deployment operations are incomplete.

Prompt 101 classifies all 92 current CF27 research candidates into explicit evidence-support states from the locked owner media baseline. The proposed supported-subset verifier queue contains 76 non-production records: 39 `SUPPORTED_WITH_NOTES` records and 37 `USER_CONFIRMATION_REQUIRED` records. Sixteen records remain `LIMITED_EVIDENCE`; these include body/context rows, ear-shape rows, duplicate-review records, order-unresolved rows, and categories excluded from the initial supported subset. Production-approved records, production catalog records, recommendation-eligible records, second-verifier decisions, and second-verified records all remain 0.

Prompt 102 operationalizes the 76-record supported-subset package for a real independent human verifier. It creates a resumable session template, verifier environment and attestation templates, record-decision templates, menu-count templates, a deterministic 24-record secondary-angle review file, excluded duplicate/order limitation review rows, a strict non-production import validator, a runbook, and an owner checkpoint. Human execution status is `READY_FOR_HUMAN_VERIFIER`. Codex created 0 human decisions, 0 second-verified records, 0 production approvals, 0 production catalog records, and 0 recommendation-eligible records.

Prompt 104 rebuilds the customer setup and guided scan experience to closely follow the owner-provided mobile setup recording while preserving GameFace Match branding, browser-RGB capability limits, consent/payment/catalog gates, accessibility, privacy, and fail-closed recommendation behavior. Visual evidence is recorded in `docs/status/visual-evidence/prompt104/`, and the implementation audit is `docs/status/GAMEFACE_SETUP_REFERENCE_IMPLEMENTATION.md`. This work changes customer presentation and capture UI only; it does not import verifier decisions, promote catalog records, enable recommendations, activate payments, deploy Supabase, or change the Prompt 103 hold.

Prompt 105 makes the CF27 supported-subset human-verifier workflow owner-usable. Wyatt can now run `npm run verifier:start`, open `http://localhost:3000/verifier`, and hand the browser workflow to a real friend/verifier. The route loads the 76-record supported-subset package, records verifier identity/environment/attestation, shows one record at a time, saves browser-local progress, enforces completion before export, and downloads a Prompt 103-compatible JSON package. It creates 0 human decisions, 0 production approvals, 0 production catalog records, and 0 recommendation-eligible records.

Prompt 106 defines the canonical Buddy Trial V1 private-beta contract in `docs/Product/BUDDY_TRIAL_V1.md`. The contract records the North Star journey from texted iPhone link through guided scan, verified CF27 settings, first result upload, refinement, second result upload, before/after comparison, and user resemblance rating. It separates build implementation readiness, real catalog readiness, and real buddy acceptance. It does not enable recommendations, create production catalog records, deploy hosting, or claim buddy acceptance.

Prompt 108 implements the first invite-only Buddy Trial session shell at `/trial/[inviteId]`. The route uses opaque fixture invite IDs, records required local consent, creates one browser-local active session per invite, supports resume from the same private URL, shows invalid/expired/used/deleted states, links into the existing guided scan route, and keeps recommendations fail-closed because the production catalog still has 0 records. It does not require signup, expose verifier/admin routes, retain raw face media, fabricate scan results, or show unverified CF27 settings.

Prompt 109 hardens the existing Prompt 104 guided scan for remote iPhone private-beta use without redesigning the visual experience. It adds secure-context gating before camera start, iPhone Safari camera-blocked recovery steps, portrait/reduced-motion/offline readiness notices, normalized browser interruption lifecycle messages, dynamic viewport containment, and a Buddy Trial scan-complete local checkpoint when the existing capture continue action succeeds. It still uses browser RGB guidance, does not claim Face ID or TrueDepth, and still requires real-device Safari QA before production iPhone claims.

Prompt 110 adds the private-beta Buddy Trial persistence and deletion contract. It defines a typed non-image trial record for pseudonymous trial IDs, consent versions, state, derived-profile summaries, capture-quality metadata, recommendation/catalog versions, selected game-setting references, refinement summaries, user ratings, expiration, deletion, and privacy-safe audit events. It adds a browser-local test adapter, a fail-closed Supabase schema/RLS design for future server persistence, and user-facing `Delete My Trial Data` behavior. Production Supabase remains inactive until credentials, concrete RLS policies, server-mediated invite/deletion endpoints, and deployment checks are completed.

Prompt 123 adds `OWNER_REVIEW_DEMO`, an isolated non-production Buddy Trial lane enabled only by `NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO=true` and disabled when `NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV=production`. It uses `data/demo/owner-review-demo-catalog.json` with `sourceType: demoData`, `isProduction: false`, explicit `OWNER_REVIEW_DEMO_TEST_DATA` provenance, and rejected catalog-manager disposition. The Buddy Trial can now exercise synthetic top-three recommendations, build instructions, fixture video milestones, synthetic refinement, before/after scoring, and excluded demo learning records with the customer-facing banner `Owner Review Demo — appearance settings are test data.` Production catalog records, production recommendations, second-verifier decisions, production approvals, real beta metrics, and global learning remain unchanged and fail closed.

Prompt 124 completes the owner-review scan-to-build customer journey through the build-guide handoff. In `OWNER_REVIEW_DEMO`, the invite route now supports private-beta landing, consent, existing guided-scan handoff, scan-complete processing copy, best-match result, match score/confidence, all demo settings including skin details and slider-style values, an 11-step "Build This in College Football 27" walkthrough, "View All Settings", persisted build-guide progress, and the end state `Your player is built. Now show us how it turned out.` The journey is covered by mobile Playwright validation at 390 x 844 and 430 x 932. This remains demo-only test data and does not create production catalog records or real recommendations.

Prompt 125 adds the first character-video review step after the owner-review build guide. In `OWNER_REVIEW_DEMO`, the tester now sees `LET'S SEE HOW WE DID`, can record where browser support permits or upload an existing iPhone/TV/monitor/console video, receives format/duration/size/decode validation and retake guidance, and gets deterministic local extraction of front, left-three-quarter, right-three-quarter, and optional profile frame candidates. Uncertain automation falls back to tester-selected frames; persisted trial state stores only non-image review summaries and standardized-view metadata. Raw videos, object URLs, thumbnails, and base64 media are not retained by default. This remains demo/local processing and does not create production catalog records, real refinement results, or matching-study evidence.

Prompt 126 adds the measurable first-result refinement experience in `OWNER_REVIEW_DEMO`. Video #1 now leads to `GAMEFACE REVIEW` with an internal Build Match Score, strengths, closer areas, exact demo-calibrated adjustments, reasons for each change, and an `Update My Player` step-by-step refinement guide. The demo fixture result is score `82 / 100` with jaw width `67 -> 61`, nose height `46 -> 51`, and chin projection `58 -> 52`. The implementation also models no-change, uncertain, unsupported-slider-suppression, and alternate-head cases in tests. Production refinement remains unavailable unless a nonempty production catalog and verified control-effect calibration exist.

Prompt 127 completes the owner-review before/after validation loop in `OWNER_REVIEW_DEMO`. After the refinement guide, Buddy Trial asks for Video #2 using the same local validation and standardized-view methodology as Video #1. The final result screen shows Initial Build, Refined Build, improvement/no-change/regression, improved areas, remaining differences, version preference, final resemblance rating, optional written feedback, and a `GameFace complete.` end screen. The default fixture result is Initial Build `82 / 100`, Refined Build `91 / 100`, Improvement `+9`. Production recommendations, production refinement, production learning, and catalog promotion remain blocked.

Prompt 128 adds the privacy-safe Buddy Trial learning and offline optimization loop. Completed trials can now produce a structured learning record containing pseudonymous trial ID, capture quality, coarse derived-measurement bins, recommendation/model/catalog versions, initial settings, Video #1 and Video #2 comparison summaries, before/after scores, refinement changes, numeric delta, tester preference, resemblance rating, optional scrubbed feedback, and retry/error events. Raw human scan media, raw character video, object URLs, thumbnails, base64 media, raw landmarks, and exact facial-measurement values remain excluded by default. Product-improvement/model-training consent is separate from normal trial consent. `OWNER_REVIEW_DEMO` learning records are tagged as demo-only and excluded from real beta metrics and production optimization. Offline reports may propose matching-weight, calibration, or ranking changes, but every proposal requires owner approval, retained-case validation, versioning, and rollback before any production use.

Prompt 129 adds the internal owner Buddy Trial command center at `/owner/trials`. Wyatt can run `npm run owner:trials:start`, open `http://localhost:3000/owner/trials`, create numbered opaque Buddy Trial invites, copy invite links or text-message copy, inspect browser-local progress, record whether a trial was unassisted or owner-helped, expire/revoke/delete local trial records, and export structured results. The dashboard reads the existing Buddy Trial local session contract, shows demo versus real-catalog mode, calculates progress and score/rating metrics, and does not expose raw face images or raw character videos by default. It is development-only and does not enforce remote server revocation, deploy persistence, create production records, or enable real recommendations.

Owner decision `OWNER_MEDIA_BASELINE_LOCKED` now locks the current source-media inventory as the final owner-provided media baseline for the initial product launch. Additional Wyatt recordings are no longer an initial-launch prerequisite. Historical recapture audits remain useful evidence-quality references, but remaining recapture tasks are reclassified as known evidence limitations, verifier-confirmation tasks, user-feedback learning opportunities, post-launch improvements, or unsupported option/category gaps where evidence is insufficient.

## Actually Working

- Next.js/React/TypeScript web app builds and has extensive tested local flows.
- Web onboarding, disclaimer, privacy/consent, mobile scan entry, preparation, guided RGB capture/upload fallback, quality review, profile review, catalog-unavailable results, privacy center, and local deletion flows exist.
- The customer setup and guided scan routes now use a full-screen black, mobile-first, Face ID-style interaction pattern with original GameFace Match scan artwork, rounded-square positioning, circular segmented progress, completion, camera-denied, multiple-face, Reduced Motion, and assisted-capture states.
- The guided scan now includes remote iPhone hardening for HTTPS/secure-context camera requirements, portrait/readiness notices, lifecycle recovery after Safari backgrounding or screen lock, reduced-motion handling, camera-blocked recovery, and Buddy Trial scan-complete resume checkpointing.
- Local MediaPipe-based face-landmark provider and local FC 26 MVP analysis modules exist.
- FC 26 research observations are structured in `data/research/fc26/player_creator_research.json`, but remain research-only.
- College Football 27 Phase 0 tooling exists for source-video inventory, evidence manifests, timelines, research candidates, primary review, verifier packages, production gates, and fail-closed publication checks.
- College Football 27 production-verification queue exists as a machine-readable and human-readable non-production worklist; it contains 92 research candidates and assigns no second-verifier or production approval.
- College Football 27 supported-subset classification exists in `data/phase-zero/cf27_supported_subset_classification.json`. It classifies all 92 candidates exactly once, proposes 76 records for supported-subset second-verifier review, generates a deterministic 24-record secondary-angle sample, and keeps every record non-production.
- College Football 27 supported-subset verifier session exists in `data/phase-zero/supported-subset-verifier-session/`. It is ready for a real second human to complete without editing source files, and it keeps all returned decisions non-production until later import, discrepancy handling, catalog-manager approval, and release gates.
- College Football 27 friend-ready verifier workflow exists at local development route `http://localhost:3000/verifier` after running `npm run verifier:start`. It wraps the supported-subset package in a nontechnical, browser-local workflow with automatic draft persistence and JSON export.
- Buddy Trial V1 private-beta product contract exists in `docs/Product/BUDDY_TRIAL_V1.md`. It defines customer-visible states, session data model, dependency gates, acceptance criteria, deterministic E2E fixture boundaries, and the recommended next implementation prompt.
- Buddy Trial V1 invite-only session shell exists at `/trial/[inviteId]`. Fixture invite coverage includes active, expired, used/completed, invalid, resume, deletion, consent, and empty-catalog fail-closed states.
- Buddy Trial private-beta persistence contract exists in `web/lib/buddy-trial/buddy-trial-persistence.ts`. It supports local/test resume and deletion records while forbidding raw face media, object URLs, base64 media, raw landmark payloads, and unconsented game-character video retention.
- Owner Review Demo mode exists for Wyatt-only product evaluation before real CF27 production catalog availability. It is powered by `web/lib/owner-review-demo/owner-review-demo.ts` and `data/demo/owner-review-demo-catalog.json`, displays an explicit demo banner, and keeps demo analytics/learning out of real beta metrics and production matching weights.
- Owner Review Demo scan-to-build journey now reaches a complete one-link customer path from invite to scan-complete checkpoint, synthetic recommendation result, exact settings, step-by-step build walkthrough, persisted progress, build-guide-complete handoff, first character video upload/recording entry, local validation, retry, standardized character-view review, measurable first-result score, exact refinement changes, step-by-step refinement instructions, second character video entry, before/after score comparison, user preference, resemblance rating, and final completion summary.
- Buddy Trial learning records and an offline optimization report generator exist. The loop can retain consented structured outcomes and propose versioned matching-weight, calibration, or ranking changes for later owner-approved evaluation, while preserving demo exclusion and preventing automatic production mutation.
- Internal owner trial command center exists at `/owner/trials` for local owner operations over Buddy Trial invites, progress, intervention tracking, metrics, and structured exports.
- College Football 27 second-verifier decision workspace exists in the internal Phase 0 panel. It loads the canonical 92-record queue, supports filters/search/native-order navigation, shows evidence and blocker details, records local verifier drafts with the approved non-production statuses, exports/imports draft decisions, and keeps every draft fail-closed.
- College Football 27 evidence recapture package exists as a deterministic historical owner/verifier worklist. A follow-on existing-media verification gap audit exhausts the current videos, source-media records, derivative frames, timelines, and queue records. It maps 138 audit rows: 14 video-file rows, 92 candidate rows, and 32 evidence-requirement rows. All 92 candidates remain ready for second-verifier confirmation from existing evidence, 7 requirements required frame re-extraction instead of new capture, and historical minimum recapture tasks are now evidence limitations or post-launch improvement opportunities rather than owner launch prerequisites.
- College Football 27 frame re-extraction packet exists for the 7 recoverable requirements from the existing-media audit. These derivative frames are marked `NOT_PRODUCTION_DATA` and `OBSERVED_PENDING_VERIFICATION`; they reduce unnecessary recapture but do not replace human verification.
- Owner media baseline lock exists in `docs/status/OWNER_MEDIA_BASELINE_LOCKED.md` and `data/status/owner_media_baseline_lock.json`. It records 15 total source-media videos, 12 unique masters, 3 exact duplicates, three represented game contexts, evidence limitations, and the day-1 supported-subset policy.
- College Football 27 production promotion now has an explicit fail-closed release-manager contract. A record cannot be promoted unless it has stable/native identity, complete platform/version/patch/mode/path/environment metadata, required evidence, primary-review attribution, second-verifier identity/date, an allowed final verifier status, catalog-manager disposition, duplicate/dependency resolution, production catalog version, and last-checked date. `VERIFIED_WITH_NOTES` also requires explicit catalog-manager acceptance. Current research records still fail closed.
- Self-improving feedback-loop domain contract exists. It records a versioned `buildPassThreshold = 90`, final confirmed settings, same-profile personal preferences, consent-gated global-learning review candidates, and no automatic retraining.
- Manual matching-study protocol, data dictionary, templates, privacy/deletion controls, and metric calculations exist for a future 10-20 person study. The study is `NOT_STARTED` because there is no verified production catalog or real top-three recommendation set.
- The production College Football 27 catalog is intentionally empty and recommendations fail closed.
- Supabase runtime/config/schema contracts exist locally and fail closed. The draft schema now includes private-beta trial session and audit-event tables with RLS enabled and raw-media constraints; no remote persistence is active.
- Payment/entitlement interfaces expose the approved Launch Pack and All Access products, but checkout remains unavailable and no client state can grant paid access.
- iOS project compiles in prior verification records as a preserved foundation, not the active production client.

## Partially Working

- Guided capture and FC 26 face matching are implemented with local/synthetic validation but not production-validated on real users.
- Screenshot refinement has local scaffold/logic but no proven production catalog or real-user validation.
- Matching engine is implemented and tested with fixture/synthetic data, but it has never run against a verified nonempty production catalog.
- Source-media ingestion and CF27 August evidence processing exist, but they do not prove complete production-ready catalog coverage.
- Creator Program source and Phase 01 plans exist, but no creator-program runtime behavior exists.

## Not Working Or Not Started

- Production recommendations: blocked by 0 production catalog records.
- Second-verifier completion: blocked until a real second human completes and returns the Prompt 102 supported-subset verifier package.
- CF27 production eligibility: blocked until a real second human verifies the supported subset, unresolved limitations are either accepted with notes or excluded, duplicate/order/environment gaps are resolved for the supported subset, and catalog-manager approval creates an immutable release candidate.
- Five-game launch catalog: CF27 and NBA 2K26 have source-media evidence; FC 26 has research material but is non-launch. Madden NFL 26, EA SPORTS PGA TOUR, and PBA Pro Bowling 2026 have no verified catalog data.
- Stripe Checkout, Stripe Billing, customer subscriptions, creator Stripe Connect onboarding, commission ledger, payout batches, and transfers are not implemented.
- Launch game registry entries exist for College Football 27, NBA 2K26, Madden NFL 26, EA SPORTS PGA TOUR, and PBA Pro Bowling 2026, but every launch game remains recommendation-unavailable until a verified production catalog exists.
- Supabase remote database/storage/auth/RLS/Edge Functions/Cron are not deployed from this repo.
- Real manual matching study: 0 valid participants, 0 completed trials, no measured accuracy.
- Real Buddy Trial V1 execution: invite-only fixture shell, guided-scan handoff/resume checkpoint, local/test persistence/deletion contract, owner-review first/second video loop, before/after scoring, final rating UI, and privacy-safe structured learning contract exist, but 0 completed real buddy trials, no production CF27 recommendations, no real production before/after measurements, and no real buddy acceptance yet.
- Ten-user private beta execution: scope is now locked, but the final `betaResearch` recommendation/result-photo/feedback flow, durable Vercel deployment, and physical iPhone Safari validation still need implementation/verification.
- Owner Review Demo can exercise the Buddy Trial UI with synthetic test data, but it is not a real buddy trial, production catalog, human verification, or matching-study result.
- Owner Review Demo now reaches final measurable outcome with second-video review, before/after comparison, final resemblance rating, and completion summary. It remains fixture-backed and excluded from production catalog state, real beta metrics, and matching-study evidence.
- Legal approval, tax/accounting review, production deployment, monitoring, support operations, and public launch approval are not complete.

## Current Production Blockers

These are paid/public production blockers. They are not all blockers for the Q07 ten-user research beta.

1. No nonempty verified production catalog for any launch game.
2. No second-person verification or catalog-manager production approval.
3. CF27 production promotion is blocked until the proposed supported subset receives real second-human verification, satisfies the fail-closed production contract, and becomes an approved nonempty release candidate.
4. No production payment/subscription/entitlement implementation for the approved `$4.99` / `$9.99/year` model.
5. No remote Supabase persistence, Auth, Storage, RLS, or scheduled-job deployment.
6. No real user matching-validation study.
7. No legal/tax/accounting approval for paid launch and creator payouts.
8. No production deployment, monitoring, support, or incident-response operation.

## Current Ten-User Beta Blockers

1. No durable Vercel HTTPS beta deployment yet.
2. `betaResearch` is defined but the final beta recommendation/result-photo/feedback flow is not implemented in this prompt.
3. Real iPhone Safari scan completion and natural phone-position behavior still need physical-device validation.
4. Remote beta persistence/deletion must use only allowed beta data and must not upload raw face scan media by default.

## Current Evidence Counts

| Metric | Count | Source |
| --- | ---: | --- |
| CF27 research candidates | 92 | `data/phase-zero/primary_review_status.json` |
| CF27 primary approved with notes | 84 | `data/phase-zero/primary_review_status.json` |
| CF27 duplicate review required | 5 | `data/phase-zero/primary_review_status.json` |
| CF27 order unresolved | 3 | `data/phase-zero/primary_review_status.json` |
| CF27 production-verification queue records | 92 | `data/phase-zero/production_verification_queue.json` |
| CF27 production-verification queue evidence-linked records | 92 | `data/phase-zero/production_verification_queue.json` |
| CF27 production-verification queue missing required production views | 87 | `data/phase-zero/production_verification_queue.json` |
| CF27 production-verification queue duplicate or near-duplicate records | 5 | `data/phase-zero/production_verification_queue.json` |
| CF27 production-verification queue production-eligible records | 0 | `data/phase-zero/production_verification_queue.json` |
| CF27 supported-subset classified candidates | 92 | `data/phase-zero/cf27_supported_subset_summary.json` |
| CF27 supported-subset verifier queue records | 76 | `data/phase-zero/cf27_supported_subset_summary.json` |
| CF27 supported-subset supported with notes | 39 | `data/phase-zero/cf27_supported_subset_summary.json` |
| CF27 supported-subset user confirmation required | 37 | `data/phase-zero/cf27_supported_subset_summary.json` |
| CF27 supported-subset limited evidence | 16 | `data/phase-zero/cf27_supported_subset_summary.json` |
| CF27 supported-subset deterministic secondary-angle sample | 24 | `data/phase-zero/cf27_supported_subset_summary.json` |
| CF27 supported-subset verifier session records | 76 | `data/phase-zero/supported-subset-verifier-session/session_manifest.json` |
| CF27 supported-subset verifier session sampled-angle rows | 24 | `data/phase-zero/supported-subset-verifier-session/session_manifest.json` |
| CF27 supported-subset verifier human decisions | 0 | `data/phase-zero/supported-subset-verifier-session/session_manifest.json` |
| CF27 evidence recapture package review-ready records | 92 | `data/phase-zero/evidence-recapture-package/evidence_quality_report.json` |
| CF27 evidence recapture package recapture-required records | 92 | `data/phase-zero/evidence-recapture-package/evidence_quality_report.json` |
| CF27 evidence recapture package tasks | 104 | `data/phase-zero/evidence-recapture-package/recapture_queue.json` |
| CF27 evidence recapture package verifier discrepancy rows | 166 | `data/phase-zero/evidence-recapture-package/verifier_discrepancy_report.json` |
| CF27 existing-media audit rows | 138 | `data/phase-zero/cf27_existing_media_verification_gap_audit.json` |
| CF27 existing-media audit video rows | 14 | `data/phase-zero/cf27_existing_media_verification_gap_audit.json` |
| CF27 existing-media audit frame-reextraction requirements | 7 | `data/phase-zero/cf27_existing_media_verification_gap_audit.json` |
| CF27 completed frame re-extractions | 7 | `data/phase-zero/cf27_frame_reextractions.json` |
| CF27 historical minimum recapture tasks, now reclassified | 21 | `data/phase-zero/cf27_minimum_recapture_queue.json`, `data/status/owner_media_baseline_lock.json` |
| Locked source-media videos | 15 | `data/status/owner_media_baseline_lock.json` |
| Locked unique source masters | 12 | `data/status/owner_media_baseline_lock.json` |
| Locked duplicate uploads | 3 | `data/status/owner_media_baseline_lock.json` |
| CF27 second verified | 0 | `data/phase-zero/primary_review_status.json` |
| CF27 production approved | 0 | `data/phase-zero/primary_review_status.json` |
| Production catalog records | 0 | `data/catalog/production/catalog_manifest.json` |
| CF27 source-video inventory rows | 14 | `data/phase-zero/video_inventory.json` |
| CF27 unique source videos | 12 | `data/phase-zero/video_inventory.json` |
| CF27 evidence manifest entries | 118 | `data/phase-zero/evidence_manifest.json` |
| Direct all-video source-media files inventoried | 15 | `data/media-audit/all_video_inventory.json` |
| Direct all-video unique source masters | 12 | `data/media-audit/all_video_inventory.json` |
| FC 26 research controls | 28 | `data/research/fc26/player_creator_research.json` |
| Real matching-study participants | 0 | `data/phase-zero/manual_matching_accuracy_analysis.json` |
| Manual matching-study status | 0 participants / not started | `data/phase-zero/cf27_matching_study_protocol.json` |

## Links To Current Control Records

- Full health check: `docs/status/GAMEFACE_MATCH_HEALTH_CHECK.md`
- Coded system inventory: `docs/status/CODED_SYSTEM_INVENTORY.md`
- Scorecard: `docs/status/PRODUCTION_READINESS_SCORECARD.md`
- Blocker register: `docs/status/PRODUCTION_BLOCKER_REGISTER.md`
- Master completion plan: `docs/status/MASTER_COMPLETION_PLAN.md`
- Evidence index: `docs/status/CODE_AND_FEATURE_EVIDENCE_INDEX.md`
- Public launch completion audit: `docs/status/PUBLIC_LAUNCH_COMPLETION_AUDIT.md`
- GameFace setup reference implementation: `docs/status/GAMEFACE_SETUP_REFERENCE_IMPLEMENTATION.md`
- CF27 supported subset classification: `docs/status/CF27_SUPPORTED_SUBSET_CLASSIFICATION.md`
- CF27 supported subset verifier handoff: `docs/status/CF27_SUPPORTED_SUBSET_VERIFIER_HANDOFF.md`
- CF27 supported subset verifier runbook: `docs/status/CF27_SUPPORTED_SUBSET_VERIFIER_RUNBOOK.md`
- CF27 supported subset human verification status: `docs/status/CF27_SUPPORTED_SUBSET_HUMAN_VERIFICATION_STATUS.md`
- Human verifier quick start: `docs/verification/HUMAN_VERIFIER_QUICK_START.md`
- Owner verifier launch checklist: `docs/verification/OWNER_VERIFIER_LAUNCH_CHECKLIST.md`
- Owner Review Demo mode: `docs/status/OWNER_REVIEW_DEMO_MODE.md`
- Buddy Trial learning loop: `docs/status/BUDDY_TRIAL_LEARNING_OPTIMIZATION_LOOP.md`
- Owner trial command center: `docs/status/OWNER_TRIAL_COMMAND_CENTER.md`
- Ten-user private beta contract: `docs/Product/TEN_USER_PRIVATE_BETA.md`
- Buddy Trial V1 contract: `docs/Product/BUDDY_TRIAL_V1.md`
- Buddy Trial persistence contract: `web/lib/buddy-trial/buddy-trial-persistence.ts`
- Buddy Trial route pattern: `/trial/[inviteId]`
- Owner media baseline lock: `docs/status/OWNER_MEDIA_BASELINE_LOCKED.md`
- Machine-readable health status: `data/status/project_health_status.json`
- Next action: `docs/status/NEXT_ACTION.md`
