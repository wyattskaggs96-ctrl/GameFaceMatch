# Code And Feature Evidence Index

**Date:** 2026-08-02

| Claim | State | Relevant files | Relevant tests | Validation result |
| --- | --- | --- | --- | --- |
| Web MVP app shell exists | Implemented but not production-validated | `web/app/page.tsx`, `web/components/AppShell.tsx` | `web/tests/ui-flow.test.ts` | Focused tests not rerun individually in this audit. |
| Mobile scan entry exists | Implemented but commerce conflicts remain | `web/features/onboarding/ScanEntryScreen.tsx`, `web/lib/onboarding/scan-entry.ts` | `web/tests/scan-entry.test.ts` | Covered by prior verify; next prompt must update pricing. |
| Guided RGB capture exists | Implemented but not real-device validated | `web/features/capture/GuidedCaptureFlow.tsx`, `web/lib/capture/*` | `web/tests/capture.test.ts`, `web/tests/guided-live-coverage.test.ts` | Covered by repository tests; real-device QA still missing. |
| Local face landmarks exist | Implemented | `web/lib/face-landmarks/*` | `web/tests/face-landmarks.test.ts` | Test suite exists; no identity recognition allowed. |
| College Football 27 recommendations fail closed | Production-ready fail-closed behavior | `web/lib/adapters/college-football-27-adapter.ts`, `data/catalog/production/catalog_manifest.json` | `web/tests/matching-engine.test.ts`, `web/tests/production-publish-gate.test.ts` | Production catalog has 0 records. |
| CF27 evidence pipeline exists | Implemented research tooling | `scripts/cf27-*.mjs`, `data/phase-zero/*` | many `web/tests/cf27-*.test.ts` | Current artifacts show 92 research candidates and 0 production records. |
| Prompt 089 August recording ingest exists | Implemented research artifact | `data/phase-zero/august_2026_source_recordings_ingest.json`, derivatives | `web/tests/source-media-ingestion.test.ts` | Appears committed and not interrupted. |
| FC 26 research data exists | Research-only | `data/research/fc26/player_creator_research.json` | `web/tests/fc26-player-creator-research.test.ts` | 2 videos, 28 controls, productionEligible false. |
| FC 26 MVP recipe logic exists | Implemented but research-only | `web/lib/fc26/fc26-face-matching.ts`, `web/features/fc26/Fc26FaceMatchingMvp.tsx` | `web/tests/fc26-face-matching-mvp.test.ts` | No production catalog. |
| NBA 2K26 support exists | Not started | None | None | No adapter/data found. |
| Madden NFL 26 support exists | Not started | None | None | No adapter/data found. |
| EA SPORTS PGA TOUR support exists | Not started | None | None | No adapter/data found. |
| PBA Pro Bowling 2026 support exists | Not started | None | None | No adapter/data found. |
| Matching engine exists | Implemented but unvalidated on real catalog | `web/lib/matching/matching-engine.ts` | `web/tests/matching-engine.test.ts` | No real recommendations possible with empty production catalog. |
| Screenshot refinement exists | Partially implemented | `web/lib/refinement/*`, `web/features/refinement/ScreenshotRefinementEntry.tsx` | `web/tests/refinement.test.ts` | No real production-catalog validation. |
| Supabase is connected | False | `web/lib/supabase/*`, `supabase/migrations/0001_gameface_core_schema.sql` | `web/tests/supabase-runtime-boundary.test.ts` | Boundary exists; remote not connected. |
| Payments are implemented | Scaffold only | `web/lib/payments/*` | `web/tests/commerce.test.ts` | No provider, checkout, subscription, webhook, or entitlement enforcement. |
| Creator Program is implemented | Documented only | `docs/Product/Creator Program/CREATOR_PROGRAM_SOURCE_OF_TRUTH.md`, `docs/plans/CREATOR_PROGRAM_*` | None yet | No runtime implementation. |
| Creator payouts are implemented | Not started | None | None | No Connect, ledger, holds, or payouts. |
| Privacy/deletion foundations exist | Implemented locally | `web/lib/privacy/*`, `web/features/privacy/PrivacyCenter.tsx` | `web/tests/privacy.test.ts` | Not legally approved or hosted-validated. |
| Legal approval exists | False | `legal/`, `docs/LEGAL_REVIEW_CHECKLIST.md` | `npm run legal:copy-check` | Copy guard can pass without legal approval. |
| Deployment is ready | Scaffolded/documented | `docs/DEPLOYMENT_READINESS.md`, `web/app/api/health/route.ts` | `web/tests/production-infrastructure.test.ts` | No public deployment. |

