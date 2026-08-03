# Current Project State

**Status:** AUTHORITATIVE CURRENT OPERATIONAL STATUS
**Last reconciled:** 2026-08-02
**Repository:** `/Users/skaggssystems/Developer/GameFaceMatch`
**Branch:** `main`
**Repository checkpoint reviewed:** Prompt 095 CF27 production promotion gate after Prompt 094 existing-media verification gap audit
**Active client:** responsive web MVP under `web/`
**Preserved future client:** SwiftUI iOS foundation under `ios/`
**Current active phase:** CF27 evidence recapture, owner capture, and real human verification handoff
**Exact next action:** `docs/status/NEXT_ACTION.md`

This is the single current operational status source. Older audits, readiness reports, prompt reports, and closeouts are historical unless this document or the machine-readable files linked below explicitly cite them as current evidence.

<!-- status-assertions:start -->
```json
{
  "schemaVersion": "current-project-state-v3",
  "repositoryCheckpoint": "2ba2289461edaf87afc8bfb711f6699ef8b6f511",
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

## Actually Working

- Next.js/React/TypeScript web app builds and has extensive tested local flows.
- Web onboarding, disclaimer, privacy/consent, mobile scan entry, preparation, guided RGB capture/upload fallback, quality review, profile review, catalog-unavailable results, privacy center, and local deletion flows exist.
- Local MediaPipe-based face-landmark provider and local FC 26 MVP analysis modules exist.
- FC 26 research observations are structured in `data/research/fc26/player_creator_research.json`, but remain research-only.
- College Football 27 Phase 0 tooling exists for source-video inventory, evidence manifests, timelines, research candidates, primary review, verifier packages, production gates, and fail-closed publication checks.
- College Football 27 production-verification queue exists as a machine-readable and human-readable non-production worklist; it contains 92 research candidates and assigns no second-verifier or production approval.
- College Football 27 second-verifier decision workspace exists in the internal Phase 0 panel. It loads the canonical 92-record queue, supports filters/search/native-order navigation, shows evidence and blocker details, records local verifier drafts with the approved non-production statuses, exports/imports draft decisions, and keeps every draft fail-closed.
- College Football 27 evidence recapture package exists as a deterministic owner/verifier worklist. A follow-on existing-media verification gap audit now exhausts the current videos, source-media records, derivative frames, timelines, and queue records before asking for new recordings. It maps 138 audit rows: 14 video-file rows, 92 candidate rows, and 32 evidence-requirement rows. All 92 candidates remain ready for second-verifier confirmation from existing evidence, 7 requirements require frame re-extraction instead of new capture, and only 19 requirements are classified as genuine recapture requirements.
- College Football 27 production promotion now has an explicit fail-closed release-manager contract. A record cannot be promoted unless it has stable/native identity, complete platform/version/patch/mode/path/environment metadata, required evidence, primary-review attribution, second-verifier identity/date, an allowed final verifier status, catalog-manager disposition, duplicate/dependency resolution, production catalog version, and last-checked date. `VERIFIED_WITH_NOTES` also requires explicit catalog-manager acceptance. Current research records still fail closed.
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
- Second-verifier completion: blocked until a real second human uses the verifier workspace and submits attributable decisions.
- CF27 production eligibility: blocked until owner records only the genuine recapture tasks listed in `data/phase-zero/cf27_minimum_recapture_queue.json`, Codex attempts the 7 frame-reextraction tasks, and a second human verifies the existing 92 candidate observations.
- Five-game launch catalog: only CF27 and FC 26 have research material; NBA 2K26, Madden NFL 26, EA SPORTS PGA TOUR, and PBA Pro Bowling 2026 have no verified catalog data.
- Stripe Checkout, Stripe Billing, customer subscriptions, creator Stripe Connect onboarding, commission ledger, payout batches, and transfers are not implemented.
- Launch game registry entries exist for College Football 27, NBA 2K26, Madden NFL 26, EA SPORTS PGA TOUR, and PBA Pro Bowling 2026, but every launch game remains recommendation-unavailable until a verified production catalog exists.
- Supabase remote database/storage/auth/RLS/Edge Functions/Cron are not deployed from this repo.
- Real manual matching study: 0 valid participants, 0 completed trials, no measured accuracy.
- Legal approval, tax/accounting review, production deployment, monitoring, support operations, and public launch approval are not complete.

## Current Production Blockers

1. No nonempty verified production catalog for any launch game.
2. No second-person verification or catalog-manager production approval.
3. CF27 production promotion is blocked until every candidate satisfies the Prompt 095 fail-closed contract and an approved nonempty release candidate exists.
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
| CF27 evidence recapture package review-ready records | 92 | `data/phase-zero/evidence-recapture-package/evidence_quality_report.json` |
| CF27 evidence recapture package recapture-required records | 92 | `data/phase-zero/evidence-recapture-package/evidence_quality_report.json` |
| CF27 evidence recapture package tasks | 104 | `data/phase-zero/evidence-recapture-package/recapture_queue.json` |
| CF27 evidence recapture package verifier discrepancy rows | 166 | `data/phase-zero/evidence-recapture-package/verifier_discrepancy_report.json` |
| CF27 existing-media audit rows | 138 | `data/phase-zero/cf27_existing_media_verification_gap_audit.json` |
| CF27 existing-media audit video rows | 14 | `data/phase-zero/cf27_existing_media_verification_gap_audit.json` |
| CF27 existing-media audit frame-reextraction requirements | 7 | `data/phase-zero/cf27_existing_media_verification_gap_audit.json` |
| CF27 minimum genuine recapture tasks | 19 | `data/phase-zero/cf27_minimum_recapture_queue.json` |
| CF27 second verified | 0 | `data/phase-zero/primary_review_status.json` |
| CF27 production approved | 0 | `data/phase-zero/primary_review_status.json` |
| Production catalog records | 0 | `data/catalog/production/catalog_manifest.json` |
| CF27 source-video inventory rows | 14 | `data/phase-zero/video_inventory.json` |
| CF27 unique source videos | 12 | `data/phase-zero/video_inventory.json` |
| CF27 evidence manifest entries | 118 | `data/phase-zero/evidence_manifest.json` |
| Generic source-media files inventoried | 8 | `data/source-media-index/source_media_manifest.json` |
| Generic source-media processed files | 5 | `data/source-media-index/source_media_manifest.json` |
| FC 26 research controls | 28 | `data/research/fc26/player_creator_research.json` |
| Real matching-study participants | 0 | `data/phase-zero/manual_matching_accuracy_analysis.json` |

## Links To Current Control Records

- Full health check: `docs/status/GAMEFACE_MATCH_HEALTH_CHECK.md`
- Coded system inventory: `docs/status/CODED_SYSTEM_INVENTORY.md`
- Scorecard: `docs/status/PRODUCTION_READINESS_SCORECARD.md`
- Blocker register: `docs/status/PRODUCTION_BLOCKER_REGISTER.md`
- Master completion plan: `docs/status/MASTER_COMPLETION_PLAN.md`
- Evidence index: `docs/status/CODE_AND_FEATURE_EVIDENCE_INDEX.md`
- Machine-readable health status: `data/status/project_health_status.json`
- Next action: `docs/status/NEXT_ACTION.md`
