# Current Project State

**Status:** AUTHORITATIVE CURRENT OPERATIONAL STATUS
**Last reconciled:** 2026-08-07
**Repository:** `/Users/skaggssystems/Developer/GameFaceMatch`
**Branch:** `main`
**Repository checkpoint reviewed:** Prompt 105 human-verifier usability checkpoint
**Active client:** responsive web MVP under `web/`
**Preserved future client:** SwiftUI iOS foundation under `ios/`
**Current active phase:** supported-subset human verifier execution and production-catalog gatekeeping
**Exact next action:** `docs/status/NEXT_ACTION.md`

This is the single current operational status source. Older audits, readiness reports, prompt reports, and closeouts are historical unless this document or the machine-readable files linked below explicitly cite them as current evidence.

<!-- status-assertions:start -->
```json
{
  "schemaVersion": "current-project-state-v3",
  "repositoryCheckpoint": "PROMPT_105_HUMAN_VERIFIER_USABILITY",
  "productionCatalogRecords": 0,
  "secondVerificationDecisions": 0,
  "manualMatchingStudyValidParticipants": 0,
  "matchingAccuracyValidation": "NOT_MEASURED",
  "productionReadiness": "BLOCKED_NO_PRODUCTION_ELIGIBLE_RECORDS",
  "productionRecommendationsEnabled": false
}
```
<!-- status-assertions:end -->

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

Owner decision `OWNER_MEDIA_BASELINE_LOCKED` now locks the current source-media inventory as the final owner-provided media baseline for the initial product launch. Additional Wyatt recordings are no longer an initial-launch prerequisite. Historical recapture audits remain useful evidence-quality references, but remaining recapture tasks are reclassified as known evidence limitations, verifier-confirmation tasks, user-feedback learning opportunities, post-launch improvements, or unsupported option/category gaps where evidence is insufficient.

## Actually Working

- Next.js/React/TypeScript web app builds and has extensive tested local flows.
- Web onboarding, disclaimer, privacy/consent, mobile scan entry, preparation, guided RGB capture/upload fallback, quality review, profile review, catalog-unavailable results, privacy center, and local deletion flows exist.
- The customer setup and guided scan routes now use a full-screen black, mobile-first, Face ID-style interaction pattern with original GameFace Match scan artwork, rounded-square positioning, circular segmented progress, completion, camera-denied, multiple-face, Reduced Motion, and assisted-capture states.
- Local MediaPipe-based face-landmark provider and local FC 26 MVP analysis modules exist.
- FC 26 research observations are structured in `data/research/fc26/player_creator_research.json`, but remain research-only.
- College Football 27 Phase 0 tooling exists for source-video inventory, evidence manifests, timelines, research candidates, primary review, verifier packages, production gates, and fail-closed publication checks.
- College Football 27 production-verification queue exists as a machine-readable and human-readable non-production worklist; it contains 92 research candidates and assigns no second-verifier or production approval.
- College Football 27 supported-subset classification exists in `data/phase-zero/cf27_supported_subset_classification.json`. It classifies all 92 candidates exactly once, proposes 76 records for supported-subset second-verifier review, generates a deterministic 24-record secondary-angle sample, and keeps every record non-production.
- College Football 27 supported-subset verifier session exists in `data/phase-zero/supported-subset-verifier-session/`. It is ready for a real second human to complete without editing source files, and it keeps all returned decisions non-production until later import, discrepancy handling, catalog-manager approval, and release gates.
- College Football 27 friend-ready verifier workflow exists at local development route `http://localhost:3000/verifier` after running `npm run verifier:start`. It wraps the supported-subset package in a nontechnical, browser-local workflow with automatic draft persistence and JSON export.
- Buddy Trial V1 private-beta product contract exists in `docs/Product/BUDDY_TRIAL_V1.md`. It defines customer-visible states, session data model, dependency gates, acceptance criteria, deterministic E2E fixture boundaries, and the recommended next implementation prompt.
- College Football 27 second-verifier decision workspace exists in the internal Phase 0 panel. It loads the canonical 92-record queue, supports filters/search/native-order navigation, shows evidence and blocker details, records local verifier drafts with the approved non-production statuses, exports/imports draft decisions, and keeps every draft fail-closed.
- College Football 27 evidence recapture package exists as a deterministic historical owner/verifier worklist. A follow-on existing-media verification gap audit exhausts the current videos, source-media records, derivative frames, timelines, and queue records. It maps 138 audit rows: 14 video-file rows, 92 candidate rows, and 32 evidence-requirement rows. All 92 candidates remain ready for second-verifier confirmation from existing evidence, 7 requirements required frame re-extraction instead of new capture, and historical minimum recapture tasks are now evidence limitations or post-launch improvement opportunities rather than owner launch prerequisites.
- College Football 27 frame re-extraction packet exists for the 7 recoverable requirements from the existing-media audit. These derivative frames are marked `NOT_PRODUCTION_DATA` and `OBSERVED_PENDING_VERIFICATION`; they reduce unnecessary recapture but do not replace human verification.
- Owner media baseline lock exists in `docs/status/OWNER_MEDIA_BASELINE_LOCKED.md` and `data/status/owner_media_baseline_lock.json`. It records 15 total source-media videos, 12 unique masters, 3 exact duplicates, three represented game contexts, evidence limitations, and the day-1 supported-subset policy.
- College Football 27 production promotion now has an explicit fail-closed release-manager contract. A record cannot be promoted unless it has stable/native identity, complete platform/version/patch/mode/path/environment metadata, required evidence, primary-review attribution, second-verifier identity/date, an allowed final verifier status, catalog-manager disposition, duplicate/dependency resolution, production catalog version, and last-checked date. `VERIFIED_WITH_NOTES` also requires explicit catalog-manager acceptance. Current research records still fail closed.
- Self-improving feedback-loop domain contract exists. It records a versioned `buildPassThreshold = 90`, final confirmed settings, same-profile personal preferences, consent-gated global-learning review candidates, and no automatic retraining.
- Manual matching-study protocol, data dictionary, templates, privacy/deletion controls, and metric calculations exist for a future 10-20 person study. The study is `NOT_STARTED` because there is no verified production catalog or real top-three recommendation set.
- The production College Football 27 catalog is intentionally empty and recommendations fail closed.
- Supabase runtime/config/schema contracts exist locally and fail closed; no remote persistence is active.
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
- Real Buddy Trial V1 execution: 0 completed buddy trials, no measured before/after improvement, and no real buddy acceptance yet.
- Legal approval, tax/accounting review, production deployment, monitoring, support operations, and public launch approval are not complete.

## Current Production Blockers

1. No nonempty verified production catalog for any launch game.
2. No second-person verification or catalog-manager production approval.
3. CF27 production promotion is blocked until the proposed supported subset receives real second-human verification, satisfies the fail-closed production contract, and becomes an approved nonempty release candidate.
4. No production payment/subscription/entitlement implementation for the approved `$4.99` / `$9.99/year` model.
5. No remote Supabase persistence, Auth, Storage, RLS, or scheduled-job deployment.
6. No real user matching-validation study.
7. No legal/tax/accounting approval for paid launch and creator payouts.
8. No production deployment, monitoring, support, or incident-response operation.

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
- Buddy Trial V1 contract: `docs/Product/BUDDY_TRIAL_V1.md`
- Owner media baseline lock: `docs/status/OWNER_MEDIA_BASELINE_LOCKED.md`
- Machine-readable health status: `data/status/project_health_status.json`
- Next action: `docs/status/NEXT_ACTION.md`
