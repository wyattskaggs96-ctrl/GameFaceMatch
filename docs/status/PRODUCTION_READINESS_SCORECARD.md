# Production Readiness Scorecard

Scores use: 0 not started, 1 documented/conceptual, 2 scaffolded/mocked, 3 implemented but incomplete, 4 functionally complete but not production-validated, 5 production-ready and validated.

| Area | Score | Evidence | Current state | Production blocker | Required next action |
| --- | ---: | --- | --- | --- | --- |
| Product shell | 4 | `web/app/page.tsx`, `web/tests/ui-flow.test.ts` | Works locally with unavailable catalog state. | No real production catalog/payment/deployment validation. | Keep stable while backend/catalog work proceeds. |
| Mobile experience | 3 | `web/features/onboarding/ScanEntryScreen.tsx`, `web/features/capture/GuidedCaptureFlow.tsx` | Mobile-first flows exist. | Real-device QA incomplete. | Run manual mobile QA after production flow exists. |
| Authentication | 1 | Supabase docs/schema draft | Planned only. | No Auth provider connected. | Define account model for paid launch. |
| Face capture | 4 | `web/lib/capture/*`, tests | Local capture/upload and guided coverage exist. | Not validated on production devices/users. | Run device QA and privacy review. |
| Face analysis | 3 | `web/lib/face-landmarks/*`, `web/lib/fc26/*` | Local measurements exist. | No accuracy validation. | Validate with real study after catalog exists. |
| College Football 27 support | 3 | `data/phase-zero/*`, adapter | Strong research pipeline, no production records. | 0 verified production records. | Complete verified production catalog. |
| NBA 2K26 support | 0 | No adapter/data | Not started. | No source evidence or catalog. | Create intake/capture plan. |
| Madden NFL 26 support | 0 | No adapter/data | Not started. | No source evidence or catalog. | Create intake/capture plan. |
| EA SPORTS PGA TOUR support | 0 | No adapter/data | Not started. | No source evidence or catalog. | Create intake/capture plan. |
| PBA Pro Bowling 2026 support | 0 | No adapter/data | Not started. | No source evidence or catalog. | Create intake/capture plan. |
| Recipe engine | 3 | `web/lib/matching/matching-engine.ts`, `web/lib/fc26/fc26-face-matching.ts` | Rule-based engines exist. | No verified production catalogs or measured accuracy. | Connect only after verified catalog. |
| Supabase persistence | 2 | `supabase/migrations/0001_gameface_core_schema.sql` | Draft schema/fail-closed boundary. | Remote DB/Auth/Storage/RLS not deployed. | Apply schema in approved setup phase. |
| Payments | 2 | `web/lib/payments/*` | Provider-unavailable scaffold with `launch_pack` `$4.99` and `all_access_annual` `$9.99/year`. | No Stripe Checkout/Billing/webhooks or server-authoritative entitlement verification. | Implement test-mode Stripe boundary only after verified catalog and owner credential workflow. |
| Subscriptions | 1 | `web/lib/payments/pricing.ts` | Annual All Access typed as a disabled subscription product. | No Stripe Billing lifecycle. | Add provider-backed annual subscription only after payment/server gates. |
| Creator program | 1 | Creator source + Phase 01 docs | Documented and planned. | No runtime implementation. | Add governance/schema/contracts after owner approval. |
| Creator payouts | 0 | Creator source only | Not started. | No Connect, ledger, holds, payouts, legal/tax review. | Do not implement until payment/ledger phases pass. |
| Athlete-comparison features | 0 | Business direction only | Idea only. | No datasets/legal/engine. | Defer until core launch works. |
| Privacy and consent | 3 | `web/lib/privacy/*`, legal docs | Local consent/deletion implemented. | No legal approval or hosted retention proof. | Legal/privacy review before launch. |
| Security | 3 | `web/next.config.ts`, `web/lib/security/*` | Headers/guards/contracts exist. | No hosted security review; dependency warnings remain. | Security audit before beta/public. |
| Testing | 4 | Large `web/tests/` suite, `npm run verify` | Extensive automated coverage, including pricing/support gates, CF27 promotion gates, verifier workflow, frame re-extraction metadata, and manual-study metric guards. | Some coverage is fixture/synthetic; real device/human validation missing. | Continue full verification and manual QA. |
| Deployment | 2 | `docs/DEPLOYMENT_READINESS.md`, health routes | Prepared docs/contracts. | No host/CI/remote env live. | Select host and deploy staging. |
| Monitoring and operations | 2 | health routes, runbooks | Documented/scaffolded. | No provider connected. | Add monitoring/log redaction after deployment target. |
| Legal-launch readiness | 1 | legal docs/checklists | Drafts/checklists only. | No counsel approval. | External legal review. |
| Customer-support readiness | 2 | support docs/page | Playbooks exist. | No staffed support/contact operations. | Owner selects support channel/process. |

Overall production readiness: blocked. The most important score is production catalog availability: 0 production records. Prompt 097 confirms that study tooling and production gates are in place, but the product remains blocked by owner recapture, second-human verification, catalog-manager approval, payment/server integration, legal review, and real matching validation.
