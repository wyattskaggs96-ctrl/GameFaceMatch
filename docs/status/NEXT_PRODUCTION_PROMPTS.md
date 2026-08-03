# Next Production Prompts

## Immediate Next Prompt

`GFM | Q04 | PROMPT 096 | PHASE 03 | Re-extract recoverable CF27 frames, then ingest minimum recapture recordings`

Purpose: exhaust frame re-extraction tasks identified by the existing-media audit, then after Wyatt supplies only the minimum genuine recapture recordings, ingest the new media, update evidence/candidate records, refresh gap/recapture/discrepancy reports, and regenerate the production-verification queue without promoting records.

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
- Exact existing-media gap audit: `docs/status/CF27_EXISTING_MEDIA_VERIFICATION_GAP_AUDIT.md`
- Machine-readable audit: `data/phase-zero/cf27_existing_media_verification_gap_audit.json`
- Minimum genuine recapture queue: `data/phase-zero/cf27_minimum_recapture_queue.json`
- Review-ready records from current evidence: 92
- Existing-media audit rows: 138
- Candidate rows requiring second-verifier confirmation: 92
- Frame-reextraction requirements: 7
- Genuine recapture requirements: 19
- Missing-evidence records: 0
- Missing required production-view records: 87
- Duplicate-dispute records: 5
- Ordering-dispute records: 58
- Environment/version-gap records: 92
- Verifier discrepancy rows: 166
- Second-verified records: 0
- Production-approved records: 0
- Production catalog records: 0

## Prompt 095 Result

- CF27 production promotion gate is explicit, versioned, attributable, and fail-closed.
- Required promotion fields include stable/native identity, platform/version/patch/mode/path/environment metadata, primary-review attribution, second-verifier identity/date, final verifier status, catalog-manager disposition, duplicate/dependency resolution, production catalog version, last-checked date, and evidence references.
- Allowed final verifier statuses are only `VERIFIED` and `VERIFIED_WITH_NOTES`; `VERIFIED_WITH_NOTES` requires explicit catalog-manager acceptance.
- `RECAPTURE_REQUIRED`, `VERSION_MISMATCH`, `MISSING_EVIDENCE`, `COUNT_MISMATCH`, `ORDER_MISMATCH`, `DEPENDENCY_UNRESOLVED`, and `NOT_VERIFIED` are blocked.
- Current production records: 0.
- Current release-candidate result: empty rejected release snapshot; recommendations remain disabled.

## Prompt 096 Acceptance

- Existing source videos are re-extracted where the audit says frame extraction can solve the gap.
- Newly supplied recapture media is inventoried, hashed, and preserved.
- Evidence and timeline records are updated only for directly observed facts.
- Recapture tasks are closed only when acceptance criteria are met.
- The existing-media audit, evidence recapture package, and production-verification queue are regenerated.
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
