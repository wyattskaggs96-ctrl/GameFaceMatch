# Next Production Prompts

## Immediate Next Prompt

`GFM | Q04 | PROMPT 098 | PHASE 04 | Ingest CF27 minimum recaptures and import second-verifier results`

Purpose: after Wyatt supplies the minimum genuine recapture recordings and a real second human returns completed verifier files, ingest and reconcile that evidence, import verifier decisions, create discrepancy records, refresh the evidence/queue artifacts, and run the production promotion gate without promoting incomplete or disputed records.

## Prompt 090 Result

- Active products are `launch_pack` at `$4.99` one-time and `all_access_annual` at `$9.99/year`.
- Checkout remains disabled.
- No client state, query parameter, local storage value, fixture, or mock grants paid access.
- Five launch targets are registered without false production-support claims.
- FC 26 remains research-only and outside the five-game launch entitlement.

## Prompt 092 Result

- Canonical queue: `data/phase-zero/production_verification_queue.json`
- Queue summary: `docs/phase-zero/CF27_PRODUCTION_VERIFICATION_QUEUE.md`
- Queue records: 92
- Evidence-linked records: 92
- Duplicate or near-duplicate records: 5
- Order-unresolved records: 3
- Records with missing required production views: 87
- Version/environment-gap records: 92
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
- Genuine recapture requirements: 21
- Missing-evidence records: 0
- Missing required production-view records: 87
- Duplicate-dispute records: 5
- Ordering-dispute records: 58
- Environment/version-gap records: 92
- Verifier discrepancy rows: 166
- Second-verified records: 0
- Production-approved records: 0
- Production catalog records: 0

## Frame Re-Extraction Packet Result

- Completed packet: `data/phase-zero/cf27_frame_reextractions.json`
- Completed frame re-extractions: 7
- Categories: Eye color, Eye shape, Facial-hair colors, Hair colors, Mouth shape, Skin details, Skin tone
- Production status: `NOT_PRODUCTION_DATA`
- Verification status: `OBSERVED_PENDING_VERIFICATION`
- These derivatives reduce unnecessary recapture but still require second-human confirmation before any production use.

## Prompt 095 Result

- CF27 production promotion gate is explicit, versioned, attributable, and fail-closed.
- Required promotion fields include stable/native identity, platform/version/patch/mode/path/environment metadata, primary-review attribution, second-verifier identity/date, final verifier status, catalog-manager disposition, duplicate/dependency resolution, production catalog version, last-checked date, and evidence references.
- Allowed final verifier statuses are only `VERIFIED` and `VERIFIED_WITH_NOTES`; `VERIFIED_WITH_NOTES` requires explicit catalog-manager acceptance.
- `RECAPTURE_REQUIRED`, `VERSION_MISMATCH`, `MISSING_EVIDENCE`, `COUNT_MISMATCH`, `ORDER_MISMATCH`, `DEPENDENCY_UNRESOLVED`, and `NOT_VERIFIED` are blocked.
- Current production records: 0.
- Current release-candidate result: empty rejected release snapshot; recommendations remain disabled.

## Prompt 096 Result

- Privacy-safe manual matching-study workflow exists.
- Protocol, participant/reviewer checklists, data dictionary, result templates, go/no-go decision template, and metric calculations are in place.
- Raw capture media, derived profile, recommendation record, study response, and screenshot-refinement media are separated by policy.
- Fixture/test participants are excluded from real study reporting.
- Study status remains `NOT_STARTED`: 0 valid participants, 0 completed trials, no measured top-one acceptance, no measured top-three usefulness, and no measured matching accuracy.

## Prompt 098 Acceptance

- New owner recapture files are preserved as immutable source masters.
- Every new master is hashed, inventoried, and linked to a recapture task.
- Only directly observed facts update evidence, timeline, candidate, and issue records.
- Completed verifier files are imported only after a real second human supplies them.
- Disagreements preserve primary and verifier observations and create discrepancy records.
- The production-verification queue and promotion gate are regenerated.
- No record is promoted unless every Prompt 095 production gate passes.

## Later Production Path

1. Resolve all verifier disagreements and recapture blockers.
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
