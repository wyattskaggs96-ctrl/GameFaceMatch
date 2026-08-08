# Next Production Prompts

## Immediate Next Prompt

`HUMAN ACTION | Complete CF27 supported-subset second verification`

Purpose: have a real independent second verifier complete the Prompt 102 supported-subset verifier package. Codex must wait for the returned package before importing or reconciling decisions.

## Codex-Ready Parallel Prompt

`GFM | Q06 | PROMPT 127 | PHASE 04 | Build second character video and before-after comparison`

Use `docs/Product/BUDDY_TRIAL_V1.md` and `docs/status/OWNER_REVIEW_DEMO_MODE.md` as the authoritative owner-review contract. Build on Prompt 126’s measurable first-result refinement experience to add second character-video intake, before/after score comparison, and final resemblance rating while production recommendations remain disabled and the real human-verifier gate remains unchanged.

## Prompt 124 Result

- `OWNER_REVIEW_DEMO` is enabled only by `NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO=true` and is disabled when `NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV=production`.
- Buddy Trial shows `Owner Review Demo — appearance settings are test data.` when the mode is enabled.
- Demo data lives under `data/demo/owner-review-demo-catalog.json` with `sourceType: demoData`, `isProduction: false`, explicit `OWNER_REVIEW_DEMO_TEST_DATA` provenance, and rejected catalog-manager disposition.
- Demo recommendations exercise head/preset, skin, skin details, hair, hair color, facial hair, facial-hair color, slider-style controls, and menu instructions.
- The owner-review Buddy Trial now reaches: invite opening, consent, existing guided-scan handoff, scan-complete processing, best-match result, match score/confidence, exact settings, 11-step build guide, "View All Settings", persisted build-guide progress, and build-guide-complete handoff.
- Demo analytics and learning records are excluded from real beta metrics, global learning, and production matching-weight mutation.
- Production facts remain unchanged: second-verifier decisions 0, production-approved records 0, production catalog records 0, production recommendations disabled.

## Prompt 125 Result

- After the owner-review build guide completes, Buddy Trial now shows `LET'S SEE HOW WE DID` with the required character-rotation recording instructions.
- The UI offers `Record Video` where browser `MediaRecorder` support is available and `Upload Existing Video` for iPhone Photos/files, TV/monitor captures, and clean console-recorded files.
- The Video #1 pipeline validates accepted formats, duration, file size, playable metadata, dimensions, and decode failures.
- Local processing extracts deterministic candidate frames for front, left three-quarter, right three-quarter, and optional profile views, then lets the tester confirm frames when automation is uncertain.
- Retry is self-service and does not require Wyatt to receive files manually.
- Persisted trial state stores non-image review summaries only; raw videos, object URLs, thumbnails, and base64 media are not retained by default.
- Production facts remain unchanged: second-verifier decisions 0, production-approved records 0, production catalog records 0, production recommendations disabled.

## Prompt 126 Result

- Video #1 now produces a customer-facing `GAMEFACE REVIEW`.
- Demo Build Match Score: `82 / 100`; the copy states this is based on available game controls and is not identity probability.
- Strengths shown: eye spacing, overall face width, hair.
- Closer areas shown: jaw appears too wide, nose appears too short, chin projection is too strong.
- Demo-calibrated changes shown: Jaw Width `67 -> 61`, Nose Height `46 -> 51`, Chin Projection `58 -> 52`, each with an explanation.
- `Update My Player` opens a step-by-step refinement guide using the same couch-friendly controls as the initial build guide.
- Tests cover clear improvement, no-change, uncertain, unsupported-slider suppression, alternate-head recommendation, and production/demo separation.
- Production refinement remains unavailable without a nonempty production catalog and verified control-effect calibration.
- Production facts remain unchanged: second-verifier decisions 0, production-approved records 0, production catalog records 0, production recommendations disabled.

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

## Prompt 105 Acceptance

Prompt 105 is complete as an owner-usability milestone.

- Local verifier start command: `npm run verifier:start`
- Local verifier URL: `http://localhost:3000/verifier`
- Friend quick start: `docs/verification/HUMAN_VERIFIER_QUICK_START.md`
- Owner checklist: `docs/verification/OWNER_VERIFIER_LAUNCH_CHECKLIST.md`
- Supported-subset records loaded: 76
- Deterministic secondary-angle sample rows: 24
- Progress persistence: browser local storage on the verifier computer
- Export filename: `cf27-supported-subset-verifier-export-<verifier-id>-<verification-date>.json`
- Export validation command: `npm run cf27:supported-subset-verifier-session:validate-export -- <path-to-export.json>`
- Human verifier decisions currently imported: 0
- Second-verified records: 0
- Production-approved records: 0
- Production catalog records: 0
- Recommendation-eligible records: 0

Prompt 105 did not execute Prompt 103 and did not manufacture verifier decisions. Prompt 103 remains conditional on Wyatt providing a completed real human-verifier export.

## Prompt 106 Acceptance

Prompt 106 is complete as a product-contract milestone.

- Buddy Trial V1 contract: `docs/Product/BUDDY_TRIAL_V1.md`
- North Star: a nontechnical buddy can open a texted iPhone link, complete the guided scan, receive exact verified CF27 settings, build the character, submit first and second result media, see before/after comparison, and rate resemblance without owner assistance.
- The contract separates build implementation readiness, real catalog readiness, and real buddy acceptance.
- Deterministic E2E fixtures are allowed only as test-only data and cannot be treated as production catalog data.
- Production catalog records remain 0.
- Second-verifier decisions remain 0.
- Real buddy trials completed remain 0.

## Prompt 108 Acceptance

Prompt 108 is complete as an invite-session-shell milestone.

- Trial URL pattern: `/trial/[inviteId]`
- Active fixture invite ID: `btv1_8f4c2a7d9e6b41c0a3f5d8e2b9c7a1f0`
- Session storage key: `gfm:buddy-trial:v1:<inviteId>`
- Session states: `INVITED`, `CONSENTED`, `SCAN_IN_PROGRESS`, `SCAN_COMPLETE`, `RECOMMENDATION_READY`, `BUILD_IN_PROGRESS`, `VIDEO_1_REQUIRED`, `VIDEO_1_PROCESSING`, `REFINEMENT_READY`, `VIDEO_2_REQUIRED`, `FINAL_RESULT_READY`, `COMPLETE`, `DELETED`
- Invite states covered: active, expired, used/completed, invalid
- Resume behavior: same private URL and same browser restore the local session without account signup
- Production recommendation behavior: blocked while the production catalog has 0 approved records

## Prompt 109 Acceptance

Prompt 109 is complete as a remote-iPhone scan-hardening milestone.

- Prompt 104 visual flow preserved: full-screen black setup, rounded-square positioning frame, circular segmented scan, completion state, and assisted capture remain intact.
- Secure-context camera gate: non-HTTPS, non-localhost camera attempts fail before `getUserMedia` and show recovery guidance.
- iPhone Safari recovery: camera-denied/blocked states show Safari settings steps and keep assisted five-angle capture available.
- Lifecycle recovery: page backgrounding, screen lock/pagehide, pageshow, offline, and online notices are normalized; camera tracks are stopped on interruption.
- Mobile layout hardening: dynamic viewport height, safe-area padding, contained overscroll, and touch-action handling are applied without redesigning Prompt 104.
- Buddy Trial resume: scan handoff preserves `buddyTrialInvite`, and successful capture continue records a local non-raw `SCAN_COMPLETE` checkpoint.
- Progress gate: circular progress remains coverage/quality driven; no timer-only completion path exists.
- Real-device limitation: actual iPhone Safari camera prompt, screen lock, low-power behavior, and camera switching still require manual HTTPS device QA.

## Prompt 110 Acceptance

Prompt 110 is complete as a private-beta persistence/deletion contract milestone.

- Trial persistence contract: `web/lib/buddy-trial/buddy-trial-persistence.ts`
- Persistence mode now implemented for local/test flows: `browser_local_test_adapter`
- Production Supabase mode: schema/RLS contract only; concrete remote client remains unavailable/fail-closed
- Supabase schema additions: `private_beta_trial_sessions` and `private_beta_trial_audit_events`, both RLS-enabled and constrained against raw-media payloads
- Stored data scope: pseudonymous trial ID, consent versions, trial state, derived-profile summaries, capture-quality metadata, recommendation/catalog versions, selected game-setting references, refinement summaries, user ratings, expiration/deletion fields, and privacy-safe audit events
- Raw-media behavior: raw human face photos/video, raw landmark payloads, object URLs, base64 media, and image/video bytes are not persisted by default
- Game-character video retention: temporary processing only unless the tester separately opts into retention
- User deletion: `/trial/[inviteId]` exposes `Delete My Trial Data`
- Owner/admin deletion: represented in the typed persistence contract and audit events; server endpoint remains a future activation task
- Production recommendation behavior: still blocked while production catalog records remain 0
- Remote activation blockers: credentials, concrete RLS policies, server-mediated invite validation, deletion endpoints, deployment checks, and real secure hosting

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
