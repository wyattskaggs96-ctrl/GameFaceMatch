# Current Project State

**Status:** AUTHORITATIVE CURRENT OPERATIONAL STATUS  
**Last reconciled:** 2026-08-02
**Repository checkpoint reviewed:** `829806e50bfc714e5332259c223d205959a00bd4` (`docs(status): verify guided capture readiness queue`)
**Status checkpoint:** this August 2026 CF27 source-recording intake revision.
**Active product direction:** responsive web MVP under `web/`  
**Native iOS status:** preserved future premium TrueDepth client under `ios/`  
**Readiness gate registry:** `data/status/current_gate_registry.json`

This document is the single current operating status source for GameFace Match. Older audits, closeouts, readiness reviews, reconstruction reports, and prompt reports remain historical evidence. When they conflict with this document or the linked machine-readable artifacts, use this document plus the current JSON/CSV artifacts as the operational authority.

<!-- status-assertions:start -->
```json
{
  "schemaVersion": "current-project-state-v2",
  "repositoryCheckpoint": "829806e50bfc714e5332259c223d205959a00bd4",
  "productionCatalogRecords": 0,
  "secondVerificationDecisions": 0,
  "manualMatchingStudyValidParticipants": 0,
  "matchingAccuracyValidation": "NOT_MEASURED",
  "productionReadiness": "BLOCKED_NO_PRODUCTION_ELIGIBLE_RECORDS",
  "productionRecommendationsEnabled": false
}
```
<!-- status-assertions:end -->

## Current Architecture

- The active MVP is the TypeScript/React/Next.js web application in `web/`.
- Browser capture uses local RGB camera/upload flows. It must not be described as TrueDepth, ARKit, identity recognition, authentication, depth capture, or scientific 3D reconstruction.
- FC 26 and College Football 27 use isolated game adapters and data paths.
- The SwiftUI iOS project under `ios/` is preserved future native premium-capture work, not the active client.
- Shared catalog, research, fixture, and production data live under `data/`.
- Production recommendations fail closed through catalog validation, fixture separation, adapter behavior, production publish gates, and bundle guards.
- Supabase runtime boundary code exists, but the remote Supabase database/storage/auth implementation is not connected or migrated.
- Billing plan selection UI exists, but no production payment provider or server-verified entitlement flow is connected.

## Verified Working Capabilities

Verified on 2026-08-02 by the repository verification suite plus local-server and native checks. The normal `npm run verify` path passed through production build and was supplemented with escalated local Playwright/iOS runs where sandbox permissions would otherwise block local server and CoreSimulator access.

- Web onboarding, product explanation, independent-app disclaimer, layered consent, privacy summary, mobile scan entry, preparation flow, guided RGB capture/upload fallback, quality review, selective retake, attribute confirmation, profile review, catalog-unavailable result state, saved-build empty state, screenshot-refinement intake scaffold, privacy center, and delete-local-data flows.
- Circular guided capture interface with positioning, first pass, second pass, coverage review, selective retake affordance, assisted five-angle fallback, reduced-motion support, and no camera start from the purchase/consent entry screen.
- Live capture coverage contract using local face count, bounding box, centering, face size, pose/yaw/pitch/roll, sharpness, exposure, lighting uniformity, landmark confidence, advisory expression, occlusion availability, duplicate-angle rejection, stability dwell, and quality-gated segment acceptance.
- FC 26 face-matching MVP and guided face-sweep workflow remain isolated from College Football catalog state.
- Local-only privacy and deletion foundations for active capture state, derived profile state, saved builds, screenshot sessions, consent records, and deletion records.
- Internal Phase 0 tooling for source-video inventory, timeline mapping, evidence manifests, capture logs, research catalog exports, primary-review status, owner capture closure, verifier packages, import checks, production gates, fixture/placeholder separation, and status consistency.
- Native iOS foundation build, unit tests, and UI tests pass in the full verification runner.

These capabilities are not real College Football 27 recommendation capability. A user still cannot receive verified College Football 27 recommendations because the production catalog is empty.

## Current Research Evidence

Current machine-readable authorities:

- Primary-review status: `data/phase-zero/primary_review_status.json`
- Evidence manifest: `data/phase-zero/evidence_manifest.json`
- Source-video inventory: `data/phase-zero/video_inventory.json`
- Capture log: `data/phase-zero/capture_log.json`
- Issue register: `data/phase-zero/issues_register.research.json`
- Owner capture closure package: `data/phase-zero/capture-closure/owner-capture-plan.json`
- August 2026 source-recording ingest: `data/phase-zero/august_2026_source_recordings_ingest.json`
- August 2026 supplemental candidates: `data/phase-zero/august_2026_intake_candidates.json`
- Generic source-media inventory: `data/source-media-index/source_media_manifest.json`
- Generic source-media segments and artifacts: `data/source-media-index/media_segments.json`, `data/source-media-index/ingestion_artifacts.json`
- Generic catalog-research queues: `data/catalog-research/research_candidates.json`, `data/catalog-research/primary_review_queue.json`, `data/catalog-research/second_verifier_queue.json`, `data/catalog-research/recapture_queue.json`
- Second-verifier execution package: `data/phase-zero/second-verifier-execution-package/second_verifier_execution_package.json`
- Gate registry: `data/status/current_gate_registry.json`

The current research artifacts are primary research only. They are not second verified, not production approved, and not eligible for customer-facing recommendations.

The generic source-media ingestion layer recursively inventories every local file under `source-media/` and separates FC 26, College Football 27, and unknown/unsupported material. It produces research-only review queues and ignored local review artifacts under `build-artifacts/source-media-ingestion/`; it does not replace the Phase 0 human-review or production-publishing gates.

## Source-Video Inventory

| Metric | Current value | Source |
| --- | ---: | --- |
| Video inventory rows | 14 | `data/phase-zero/video_inventory.json` |
| Unique source videos | 12 | `data/phase-zero/video_inventory.json` |
| Documented exact duplicate source references | 2 | `data/phase-zero/video_inventory.json` |
| Files open successfully | 14 | `data/phase-zero/video_inventory.json` |
| Total unique duration | 1157.24 seconds | `data/phase-zero/video_inventory.json` |
| Evidence entries | 118 | `data/phase-zero/evidence_manifest.json` |
| Evidence entries with SHA-256 | 118 | `data/phase-zero/evidence_manifest.json` |
| Candidates without valid source timestamp | 0 | `data/phase-zero/primary_review_status.json` |
| Issue register entries | 44 | `data/phase-zero/issues_register.research.json` |

The current videos support research observations, menu/order evidence, primary review, and recapture planning. The August 2026 recordings directly add partial Hair Style, Hair Color, Facial Hair Style, Facial Hair Color, Mouth Shape, Jaw Shape, and Chin observations. They do not establish a production-ready catalog because environment/version metadata, complete selector boundaries, standardized visual conditions, duplicate review, and second verification remain unresolved.

## Research Candidate Counts

| Funnel stage | Count |
| --- | ---: |
| Total current research candidates | 92 |
| Primary approved | 0 |
| Primary approved with notes | 84 |
| Duplicate review required | 5 |
| Recapture required as candidate-level primary status | 0 |
| Missing evidence as candidate-level primary status | 0 |
| Label unresolved as candidate-level primary status | 0 |
| Order unresolved as candidate-level primary status | 3 |
| Category incomplete as candidate-level primary status | 0 |
| Environment unresolved as candidate-level primary status | 0 |
| Not reviewed | 0 |
| Second verified | 0 |
| Production approved | 0 |
| Records allowed in production recommendations | 0 |

Older partial exports may mention different counts. The current normalized primary-review authority is 92 candidates in `data/phase-zero/primary_review_status.json`.

## Category Status

| Category | Observed candidates | Primary-review state | Verifier handoff | Production status |
| --- | ---: | --- | --- | --- |
| Creation paths | 1 | Primary approved with notes | Evidence review material exists | Blocked |
| Appearance menu hierarchy | 93 menu observations | Research map exists | Evidence review material exists | Blocked |
| Heads | 26 | 24 approved with notes; 2 duplicate review | Evidence review material exists | Blocked |
| Skin Tone | 21 | 20 approved with notes; 1 duplicate review | Evidence review material exists | Blocked |
| Skin Details | 10 | 10 approved with notes | Evidence review material exists | Blocked |
| Eye Shape | 5 | 5 approved with notes | Evidence review material exists | Blocked |
| Eye Color | 7 | 7 approved with notes | Evidence review material exists | Blocked |
| Nose | 7 | 6 approved with notes; 1 duplicate review | Evidence review material exists | Blocked |
| Ear Shape | 4 | 3 approved with notes; 1 duplicate review | Evidence review material exists | Blocked |
| Body/context controls | 5 | 5 approved with notes | Evidence review material exists | Blocked |
| Hairstyles | 1 | 1 approved with notes; complete selector still missing | Partial evidence review material exists | Blocked |
| Hair colors | 1 | 1 order unresolved | Not ready | Blocked |
| Facial hair | 1 | 1 order unresolved | Not ready | Blocked |
| Facial-hair colors | 1 | 1 order unresolved | Not ready | Blocked |
| Eyebrows | 0 | Not captured | Not ready | Blocked |
| Additional sliders/toggles/colors/presets | 0 | Not captured | Not ready | Blocked |

Menu observations and catalog candidates are intentionally separated. Menu hierarchy rows do not become user-facing appearance recommendations.

## Production Catalog Counts

| Production metric | Count |
| --- | ---: |
| Production catalog records | 0 |
| Verified head records | 0 |
| Verified hairstyle records | 0 |
| Verified facial-hair records | 0 |
| Verified additional-attribute records | 0 |
| Production-approved records | 0 |
| User-facing College Football 27 recommendations available | 0 |

The production catalog is intentionally empty. The correct customer-facing state is: verified College Football 27 catalog unavailable.

## Second-Verification Status

- Blind-verifier package exists.
- Second-verifier execution package exists and is validated.
- Verifier dashboard shows 85 assigned, 0 completed, 0 disagreements, 85 blocked, 0 production eligible.
- Required import targets exist for the post-independent-count review phase.
- No real second human verifier results are present.
- No record may be marked `VERIFIED` or `VERIFIED_WITH_NOTES` from primary review alone.
- Second-verifier decisions: 0.

## Manual Matching-Study Status

- Study protocol, templates, and metric scripts exist.
- No real consenting participant data exists.
- Valid participant count: 0.
- Completed human matching trials: 0.
- Top-one acceptance rate: not measured.
- Top-three usefulness rate: not measured.
- Inter-reviewer agreement: not measured.
- Matching accuracy validation: not measured.

The manual matching study must not begin until a verified production catalog and verified build instructions exist.

## Matching-Engine Status

- The explainable rule-based top-three matcher exists and is covered by synthetic/fixture tests.
- Feature normalization, missing-data behavior, confidence handling, tie behavior, and explanation scaffolds are implemented.
- The matcher has not produced real verified College Football 27 production recommendations because production catalog records are 0.
- Matching scores must remain language about closeness among available game options, not identity probability.
- Skin tone must not affect geometric similarity.

## Supabase, Billing, and Deployment Status

- Supabase project credentials are stored outside the repository, per user confirmation, but no remote tables, migrations, storage buckets, auth policies, or app connections are active.
- Code-level Supabase runtime configuration, redaction, local-only mode, schema contract, storage/deletion contracts, and status endpoint scaffolding exist and pass tests.
- Remote writes are disabled by default.
- Browser clients must not receive server secrets.
- Billing has plan-selection and commerce boundary tests, but no provider-backed checkout, no verified payment entitlement, and no production purchase flow.
- Deployment and public hosting have not been performed.
- Monitoring and analytics vendors are not connected.

## Privacy and Security Status

- Raw user face media is local and temporary by default in the current web flow.
- Raw face images are not stored in normal profile JSON or localStorage by default.
- No user face media is uploaded by the current app.
- Local deletion flows and privacy inventory are implemented and tested.
- Fixture/test data is separated from production.
- Production bundle guards and legal-copy guards pass.
- Known verification warning: isolated `npm ci` reports 3 high severity dependency vulnerabilities; this is not fixed by Prompt 088.
- No formal legal approval, production penetration test, hosted incident-response run, or real-device privacy QA has been completed.

## Launch Status

- Private beta for real recommendations: blocked.
- Public launch: blocked.
- Payments: not connected.
- Deployment: not performed.
- Analytics vendor: not connected.
- Legal review: not approved.
- Production catalog release: blocked because there are no production-eligible records.

## Blockers by Owner

### Codex Can Continue Independently

- Keep the current-state document, status checker, and gate registry aligned with machine-readable artifacts.
- Tighten validators, import exception reporting, and package checks without inventing evidence.
- Prepare ingestion for new owner captures once files are supplied.
- Continue hardening local-only privacy, Supabase boundaries, and test coverage.

### Wyatt Must Provide

- First immediate recording: `GFM-CF27-S01-environment-game-version-YYYYMMDD-partNN.mp4`, following `docs/phase-zero/CF27_CAPTURE_CLOSURE_PACKAGE.md`.
- Additional Xbox captures in `data/phase-zero/capture-closure/owner-capture-plan.json`, starting with:
  1. `GFM-CF27-S01` environment and game-version evidence.
  2. `GFM-CF27-S02` complete menu hierarchy and canonical creation path.
  3. `GFM-CF27-S03` Hair menu, hairstyles, and hair colors.
  4. `GFM-CF27-S04` facial hair and facial-hair colors if present.
  5. `GFM-CF27-S05` remaining face controls and boundaries.
- Missing environment/version evidence, including visible game executable version, patch/update state, console model where visible, and reproducible Road to Glory creation context.
- Standardized head-template visual pass if the first production catalog will include head geometry matching.

### Second Human Verifier Must Complete

- Independent environment worksheet.
- Blind independent menu/category counts.
- Native-order review.
- Record-level evidence review after blind counts.
- Duplicate/exception review.
- Discrepancy form and final sign-off using only allowed verification statuses.

### External Specialists or Services Are Needed Later

- Legal/trademark/privacy counsel before public launch or paid public claims.
- Hosting and payment-provider decisions before deployment or monetization.
- Real-device browser QA before broad beta claims.
- Human matching-study participants after the verified catalog exists.

## Dependency Graph

```text
Current source videos
  -> Primary research catalog candidates
  -> Primary review checkpoint
  -> Wyatt captures for missing environment, boundaries, Hair, face controls, and standard views
  -> Updated research package
  -> Blind second-verifier execution package
  -> Second-person verification and discrepancy resolution
  -> Catalog-manager approval
  -> Immutable production catalog release
  -> Production recommendations and build instructions
  -> Manual 10-20 person matching feasibility study
  -> Private beta readiness review
  -> Deployment, payment, legal, support, and public launch gates
```

Hard dependencies:

- Production recommendations require an approved production catalog release.
- Production catalog release requires direct evidence, complete required metadata, second verification, catalog-manager approval, and passing production gates.
- Matching accuracy validation requires real participant outcomes, not fixtures.
- Public launch requires product, catalog, matching, privacy, legal, security, accessibility, support, and deployment approval.

## Next Milestone

The next milestone is owner capture completion for Phase 0 closure.

1. Wyatt records `GFM-CF27-S01` environment/version evidence.
2. Codex ingests and validates the new files through the approved intake and evidence pipeline.
3. Wyatt continues the P0 capture closure sessions for menu hierarchy, Hair, facial hair, and remaining controls.
4. Codex regenerates the research package and primary-review status.
5. A second human verifier independently reviews counts, order, evidence, and discrepancies.

Recommended next prompt number: `089`.

## Current Web Entry and Guided Capture Status

Prompt 080 added the mobile scan entry route at `#start`.

- Branding: `GameFace Match` with `From reality to game face.`
- Purchase plan IDs: `single_scan` (`$0.99`) and `monthly` (`$1.99/month`).
- Consent version: `scan-entry-consent-v1`, layered on top of the existing `web-mvp-consent-v1` capture consent records.
- Billing status: provider unavailable; checkout and restoration remain disabled.
- Entitlement status: visual plan selection is not treated as payment.
- Camera behavior: no live camera starts on the entry screen.

Prompts 082 and 083 added the circular guided capture interaction.

- Preparation screen: `Get ready for your face scan`.
- Positioning instruction: `Position your face inside the circle`.
- First pass: `Move your head slowly to complete the circle`.
- Second pass: `One more scan for better detail`.
- Coverage ring: driven by accepted local pose/quality coverage, not elapsed time.
- Coverage segments: center, upper-left, left, lower-left, lower-center, lower-right, right, upper-right.
- Rejected frames do not advance coverage.
- Duplicate angles do not advance coverage.
- Production simulation is explicitly blocked.
- Assisted five-angle fallback remains available.

## Verification Results

Latest verification commands:

```bash
GAMEFACE_VERIFY_SKIP_E2E=1 GAMEFACE_VERIFY_SKIP_IOS=1 npm run verify
npm --prefix web run test:e2e
npm --prefix web run test:e2e:phase0
xcodebuild test -project ios/GameFaceMatch.xcodeproj -scheme GameFaceMatch -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' CODE_SIGNING_ALLOWED=NO
```

Result on 2026-08-02: PASS. The first full `npm run verify` attempt reached the Playwright stage and failed only because the sandbox blocked local server binding to `127.0.0.1:3100`; the Playwright stages passed when rerun with local server permission. The first sandboxed iOS command failed on CoreSimulator/DerivedData access and unavailable generic destinations; the same concrete simulator test passed with local Xcode/CoreSimulator permission.

Included checks:

- Strict repository status and documentation safety.
- Requirement traceability.
- Current project status consistency.
- Supabase schema contract.
- FC26 research validation.
- Phase 0 exports, evidence package, research release, verification candidate gate, primary review, coverage, owner capture closure, blind verifier package, and second-verifier execution package.
- Catalog import, production candidate import, production catalog release manager, verified head geometry annotation artifact, catalog record classification, and legal copy guard.
- Web type-check, lint, unit/integration tests, production catalog validation, placeholder/fixture/duplicate checks, integrity checks, production build, production bundle guard, web E2E, and Phase 0 E2E.
- Native iOS build, unit tests, and UI tests.

Notable warnings:

- `npm ci` reports 3 high severity dependency vulnerabilities.
- npm reports install scripts awaiting allow-scripts review for `esbuild`, `fsevents`, and `sharp`.
- Playwright and Xcode emit non-failing environment/debugger warnings.
- `web/next-env.d.ts` generated-file drift occurs only in the isolated checkout and is allowed by the non-mutating runner.

Source worktree after verification: clean.

## Completion Percentages

These estimates are conservative and do not give production credit for fixtures, shells, templates, or unverified research records.

| Workstream | Current estimate | Basis |
| --- | ---: | --- |
| Repository architecture and verification health | 90%-95% | Non-mutating full verification passes, including web, Phase 0, and iOS checks. |
| Web product shell and core local workflows | 65%-75% | Core local journey, scan entry, guided capture UI, local privacy, and fail-closed states work. |
| Web private-beta readiness | 35%-45% | Product shell is stronger, but real recommendations, billing, remote backend, and study data are blocked. |
| Native iOS capture foundation | 25%-35% | Project builds/tests, but native capture is future path and not feature-complete. |
| Phase 0 preparation/tooling | 75%-85% | Intake, evidence, primary review, owner capture package, verifier package, and gates exist. |
| Source-video ingestion and traceability | 70%-80% | 9 unique videos traced; 2 duplicates documented; no candidate source timestamp gaps. |
| Actual CF27 research catalog | 25%-35% | 85 current candidates, but major categories remain uncaptured. |
| Catalog evidence quality | 20%-30% | Useful research evidence exists; production-standard visual evidence incomplete. |
| Primary review | 75%-85% | All 85 current candidates classified; 5 duplicate-review items remain. |
| Second-person verification | 0% | No real second human verifier decisions. |
| Production catalog | 0% | No production-approved records. |
| Matching-engine implementation | 65%-75% | Rule-based engine implemented and tested with fixtures; no verified production catalog run. |
| Matching-accuracy validation | 0% | No real participant study data. |
| Screenshot refinement | 20%-30% | Intake/scaffold exists; verified refinement recommendations are unavailable. |
| Privacy and deletion | 60%-70% | Local privacy/deletion implemented and tested; legal/real-device validation remains. |
| Security | 45%-55% | Local guards pass; dependency audit has unresolved high-severity findings; no hosted security review. |
| Accessibility | 50%-60% | Automated/basic coverage and guided fallback exist; real assistive tech/device QA remains. |
| Legal/trademark readiness | 20%-30% | Counsel package/checklists exist; no legal approval. |
| Analytics and monitoring | 15%-25% | Local/no-op analytics architecture exists; no production monitoring. |
| Supabase runtime readiness | 25%-35% | Code boundary exists; remote project is not migrated or connected. |
| Billing readiness | 10%-20% | Plan UI and boundaries exist; no provider-backed payment verification. |
| Deployment/private beta operations | 20%-30% | Docs/runbooks exist; no deployment or real beta operation. |
| Public launch readiness | 5%-10% | Mandatory catalog, verification, matching, legal, deployment, and support gates are blocked. |
| Full original product vision | 15%-25% | Strong foundations exist, but verified catalog and validated recommendations are missing. |

## Links to Supporting Documents

- Source governance: `docs/governance/SOURCE_REGISTRY.md`
- Source of truth: `docs/GAMEFACE_MATCH_SOURCE_OF_TRUTH.md`
- Decision log: `docs/DECISIONS.md`
- Architecture: `docs/ARCHITECTURE.md`
- Documentation index: `docs/DOCUMENTATION_INDEX.md`
- Prompt 088 gate registry: `data/status/current_gate_registry.json`
- Primary review: `docs/status/PHASE_ZERO_PRIMARY_REVIEW_STATUS.md`
- Current completion audit: `docs/status/CURRENT_PROJECT_COMPLETION_AUDIT.md`
- Owner capture closure package: `docs/phase-zero/CF27_CAPTURE_CLOSURE_PACKAGE.md`
- Wyatt recapture instructions: `docs/phase-zero/WYATT_RECAPTURE_INSTRUCTIONS.md`
- Second-verifier handoff: `docs/phase-zero/SECOND_VERIFIER_HANDOFF.md`
- Second-verifier execution guide: `docs/phase-zero/SECOND_VERIFIER_EXECUTION_GUIDE.md`
- Artifact map: `docs/phase-zero/PHASE_ZERO_ARTIFACT_MAP.md`
- Video inventory: `docs/phase-zero/VIDEO_SOURCE_INVENTORY.md`
- Evidence package: `docs/phase-zero/RESEARCH_EVIDENCE_PACKAGE_MANIFEST.md`
- Data integrity: `docs/phase-zero/CATALOG_DATA_INTEGRITY_STATUS.md`
- Release no-go decision: `docs/status/RELEASE_CANDIDATE_DECISION.md`
- Final program checkpoint: `docs/status/FINAL_PROGRAM_CHECKPOINT.md`

## Historical Report Handling

Older documents should be read as repository snapshots from the time they were created. They may contain stale percentages, stale candidate counts, pre-video blocker descriptions, or pre-guided-capture capability descriptions. Use them for audit history and rationale, but use this file, `data/status/current_gate_registry.json`, and the machine-readable Phase 0 artifacts for current operating status.
