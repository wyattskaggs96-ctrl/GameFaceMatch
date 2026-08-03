# Next Production Prompts

## Immediate Next Prompt

`GFM | Q04 | PROMPT 095 | PHASE 02 | Ingest CF27 recapture recordings and refresh verification queue`

Purpose: after Wyatt supplies the requested recapture recordings, ingest the new media, update evidence/candidate records, refresh recapture/discrepancy reports, and regenerate the production-verification queue without promoting records.

## Prompt 092 Result

- Canonical queue: `data/phase-zero/production_verification_queue.json`
- Queue summary: `docs/phase-zero/CF27_PRODUCTION_VERIFICATION_QUEUE.md`
- Queue records: 92
- Evidence-linked records: 92
- Duplicate or near-duplicate records: 5
- Order-unresolved records: 3
- Records with missing required production views: 87
- Production-eligible records: 0
- Second-verified records: 0
- Production-approved records: 0

## Prompt 093 Result

- Internal second-verifier workspace loads the canonical 92-record queue.
- The verifier can filter by category, status, evidence completeness, missing views, duplicates/ambiguity, environment/version gaps, and search terms.
- Candidate details show native order, environment metadata, primary observations, evidence lists, missing views, duplicate/dependency flags, and blocker reasons.
- Draft decisions use only the approved verifier statuses and require verifier identity, date, environment, independent observation, evidence confirmation, native-order confirmation, front-view confirmation, and notes when needed.
- Deterministic 25% secondary-angle sampling is available.
- Draft decisions remain non-production and cannot grant production approval.

## Prompt 094 Result

- Deterministic evidence-quality report: `data/phase-zero/evidence-recapture-package/evidence_quality_report.json`
- Owner checklist: `docs/phase-zero/CF27_OWNER_RECAPTURE_CHECKLIST.md`
- Review-ready records from current evidence: 92
- Recapture-required records: 92
- Missing-evidence records: 0
- Missing required production-view records: 87
- Duplicate-dispute records: 5
- Ordering-dispute records: 58
- Environment/version-gap records: 92
- Recapture tasks: 104
- Verifier discrepancy rows: 166
- Second-verified records: 0
- Production-approved records: 0
- Production catalog records: 0

## Prompt 095 Acceptance

- Newly supplied recapture media is inventoried, hashed, and preserved.
- Evidence and timeline records are updated only for directly observed facts.
- Recapture tasks are closed only when acceptance criteria are met.
- The evidence recapture package and production-verification queue are regenerated.
- No record is marked second-verified or production-approved.

## Later Production Path

1. Complete second-human verification and discrepancy resolution.
2. Publish a nonempty verified production catalog only if all release gates pass.
3. Connect server-authoritative paid access in test mode.
4. Deploy Supabase/Auth/Storage/RLS through the approved credential workflow.
5. Run real manual matching validation.
6. Complete legal, security, privacy, accessibility, deployment, and support gates.

## Explicitly Not Next

- Stripe live checkout
- Supabase remote deployment
- Creator attribution or payouts
- Athlete comparisons
- Public launch approval
