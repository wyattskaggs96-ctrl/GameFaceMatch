# Next Production Prompts

## Immediate Next Prompt

`HUMAN ACTION | Complete CF27 supported-subset second verification`

Purpose: have a real independent second verifier complete the Prompt 102 supported-subset verifier package. Codex must wait for the returned package before importing or reconciling decisions.

## Owner Media Baseline Decision

- Decision: `OWNER_MEDIA_BASELINE_LOCKED`
- Owner: Wyatt Skaggs
- Date: 2026-08-03
- Locked videos: 15 total, 12 unique, 3 exact duplicates
- Games represented: EA Sports FC player creator footage, NBA 2K26 Create A Player footage, College Football 27 create-player footage
- Additional owner media required for initial launch: no
- Historical recapture queues remain preserved as evidence-quality references, not owner launch blockers.
- Production facts remain unchanged: second-verified records 0, production-approved records 0, production catalog records 0.

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

## Prompt 101 Acceptance

Prompt 101 is complete.

- Every current CF27 candidate receives one allowed evidence-support state.
- Classification totals: 39 `SUPPORTED_WITH_NOTES`, 37 `USER_CONFIRMATION_REQUIRED`, 16 `LIMITED_EVIDENCE`, 0 `SUPPORTED`, 0 `UNSUPPORTED`, 0 `DEPRECATED`, 0 `VERSION_MISMATCH`.
- Supported-subset verifier queue records: 76.
- Deterministic secondary-angle sample records: 24.
- Duplicate-review records preserved and excluded from the supported subset: 5.
- Order-unresolved records preserved and excluded from the supported subset: 3.
- Production-approved records: 0.
- Production catalog records: 0.
- Recommendation-eligible records: 0.
- Additional Wyatt recordings remain optional post-launch improvement, not an initial-launch blocker.

## Prompt 102 Acceptance

Prompt 102 is complete as a tooling milestone.

- Supported-subset verifier session package: `data/phase-zero/supported-subset-verifier-session/`
- Verifier runbook: `docs/status/CF27_SUPPORTED_SUBSET_VERIFIER_RUNBOOK.md`
- Human execution status: `READY_FOR_HUMAN_VERIFIER`
- Required human decisions: 76
- Required deterministic secondary-angle checks: 24
- Human verifier decisions currently imported: 0
- Second-verified records: 0
- Production-approved records: 0
- Production catalog records: 0
- Recommendation-eligible records: 0
- Additional Wyatt recordings remain optional post-launch improvement, not an initial-launch blocker.

## Prompt 103 - Conditional Next Codex Prompt

`GFM | Q04 | PROMPT 103 | PHASE 03 | Import and reconcile CF27 supported-subset verifier decisions`

Run only after Wyatt provides a completed human verifier package. Prompt 103 should validate verifier identity, environment, attestation, all 76 decisions, all 24 sample rows, notes requirements, duplicate/order limitation review, and discrepancies. Valid imports must remain `IMPORTED_NON_PRODUCTION` until catalog-manager release gates pass.

## Later Production Path

1. Complete real second-human verification for the supported subset.
2. Import and reconcile the returned verifier package without production promotion.
3. Publish a nonempty verified production catalog only if all release gates pass.
4. Connect server-authoritative paid access in test mode.
5. Deploy Supabase/Auth/Storage/RLS through the approved credential workflow.
6. Run real manual matching validation.
7. Complete legal, security, privacy, accessibility, deployment, and support gates.

## Explicitly Not Next

- Stripe live checkout
- Supabase remote deployment
- Creator attribution or payouts
- Athlete comparisons
- Public launch approval
