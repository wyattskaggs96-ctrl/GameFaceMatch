# Coded System Inventory

**Date:** 2026-08-02  
**Repository:** `/Users/skaggssystems/Developer/GameFaceMatch`

## Product Shell And UX

| Subsystem | State | Evidence |
| --- | --- | --- |
| Main web shell | Implemented but not production-validated | `web/app/page.tsx`, `web/components/AppShell.tsx`, `web/lib/navigation.ts` |
| Landing/marketing | Partially implemented | `web/app/launch/page.tsx`, `web/features/marketing/LaunchMarketingPage.tsx`, `web/lib/marketing/launch-messaging.ts` |
| Scan entry | Implemented but payment-gated scaffold | `web/features/onboarding/ScanEntryScreen.tsx`, `web/lib/onboarding/scan-entry.ts`, `web/tests/scan-entry.test.ts` |
| Capture preparation | Implemented | `web/features/capture/CapturePreparation.tsx`, `web/tests/capture.test.ts` |
| Guided capture | Implemented but not production-validated | `web/features/capture/GuidedCaptureFlow.tsx`, `web/lib/capture/guided-live-coverage.ts`, `web/tests/guided-live-coverage.test.ts` |
| Privacy center/deletion | Implemented local behavior | `web/features/privacy/PrivacyCenter.tsx`, `web/lib/privacy/*`, `web/tests/privacy.test.ts` |
| Results | Implemented with fail-closed unavailable state | `web/features/results/*`, `web/lib/results/results-experience.ts`, `web/tests/results.test.ts` |
| Saved builds | Scaffolded/empty state | `web/features/saved-builds/SavedBuildsEmpty.tsx` |
| Support | Partially implemented | `web/app/support/page.tsx`, `web/features/marketing/SupportPage.tsx` |

## Face Capture And Analysis

| Subsystem | State | Evidence |
| --- | --- | --- |
| Browser camera service | Implemented | `web/lib/capture/browser-camera-service.ts` |
| Capture state machine | Implemented | `web/lib/capture/capture-state-machine.ts` |
| Image validation | Implemented | `web/lib/capture/image-validation.ts`, `web/lib/capture/image-quality-service.ts` |
| Lighting readiness | Implemented | `web/lib/capture/lighting-readiness.ts` |
| MediaPipe provider | Implemented local provider boundary | `web/lib/face-landmarks/mediapipe-face-landmarker-provider.ts`, `web/lib/face-landmarks/face-landmark-provider.ts` |
| Standard face profile | Implemented | `web/lib/profile/standard-face-profile.ts` |
| FC 26 guided sweep | Implemented but research-only | `web/lib/fc26/fc26-guided-sweep.ts` |
| Screenshot refinement | Implemented scaffold/logic; not production-validated | `web/lib/refinement/*`, `web/features/refinement/ScreenshotRefinementEntry.tsx` |

## Game Adapters

| Game | State | Evidence |
| --- | --- | --- |
| College Football 27 | Adapter exists and fails closed | `web/lib/adapters/college-football-27-adapter.ts` |
| EA SPORTS FC 26 | Research-only adapter exists and fails closed | `web/lib/adapters/ea-sports-fc-26-adapter.ts` |
| NBA 2K26 | Not started | No adapter found |
| Madden NFL 26 | Not started | No adapter found |
| EA SPORTS PGA TOUR | Not started | No adapter found |
| PBA Pro Bowling 2026 | Not started | No adapter found |

## Catalog And Evidence Operations

| Subsystem | State | Evidence |
| --- | --- | --- |
| Production catalog validation | Implemented; empty production catalog | `web/lib/catalog/*`, `data/catalog/production/catalog_manifest.json` |
| CF27 evidence inventory | Implemented research pipeline | `data/phase-zero/video_inventory.json`, `scripts/cf27-video-source-inventory.mjs` |
| CF27 timeline/evidence manifest | Implemented research pipeline | `data/phase-zero/evidence_manifest.json`, `data/phase-zero/capture_log.json` |
| CF27 primary review | Implemented research status | `data/phase-zero/primary_review_status.json`, `scripts/cf27-primary-review-status.mjs` |
| Second verifier package | Implemented package; no human results | `data/phase-zero/second-verifier-execution-package/` |
| Source-media ingestion | Implemented generic research ingestion | `scripts/source-media-ingest.mjs`, `data/source-media-index/source_media_manifest.json` |

## Supabase, Payments, And Creator Program

| Subsystem | State | Evidence |
| --- | --- | --- |
| Supabase schema draft | Designed, not applied | `supabase/migrations/0001_gameface_core_schema.sql` |
| Supabase runtime boundary | Implemented fail-closed | `web/lib/supabase/runtime-config.ts`, `web/lib/supabase/repository-contracts.ts` |
| Payment provider boundary | Implemented unavailable provider | `web/lib/payments/payment-provider.ts` |
| Entitlement model | Scaffolded local model | `web/lib/payments/entitlements.ts` |
| Current pricing code | Launch Pack / All Access scaffold; checkout disabled | `web/lib/payments/pricing.ts` |
| Creator Program runtime | Not started | No code beyond docs/plans |

## Native iOS

State: preserved foundation, not active production client.

Evidence:

- `ios/GameFaceMatch.xcodeproj`
- `ios/GameFaceMatch/App/*`
- `ios/GameFaceMatch/Core/*`
- `ios/GameFaceMatchTests/*`
- `ios/GameFaceMatchUITests/*`

## Operations And Deployment

| Subsystem | State | Evidence |
| --- | --- | --- |
| Health/uptime routes | Implemented local routes | `web/app/api/health/route.ts`, `web/app/api/uptime/route.ts` |
| Environment validation | Implemented | `web/lib/config/environment.ts`, `web/tests/environment.test.ts` |
| Release monitoring/rollback contracts | Implemented docs/contracts | `web/lib/operations/release-monitoring.ts`, `web/lib/operations/rollback.ts` |
| Deployment | Documented only | `docs/DEPLOYMENT_READINESS.md`, `docs/DEPLOYMENT_RUNBOOK.md` |
| Monitoring provider | Not connected | No provider dependency found |
