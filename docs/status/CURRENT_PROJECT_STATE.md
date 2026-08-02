# Current Project State

**Status:** AUTHORITATIVE CURRENT OPERATIONAL STATUS  
**Last reconciled:** 2026-07-21  
**Repository checkpoint reviewed:** `8ed7cab956edd797005625d63ea039ebe94c073b` (`docs(phase-zero): add primary review checkpoint`)  
**Active product direction:** responsive web MVP under `web/`  
**Native iOS status:** preserved future premium TrueDepth client under `ios/`  

This document is the single current operational status source for GameFace Match. Older audits, closeouts, readiness reviews, and reconstruction reports remain useful historical evidence, but they are not the current count authority when they conflict with this file or the machine-readable artifacts linked below.

<!-- status-assertions:start -->
```json
{
  "schemaVersion": "current-project-state-v1",
  "repositoryCheckpoint": "8ed7cab956edd797005625d63ea039ebe94c073b",
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

- The active MVP is the responsive TypeScript/React/Next.js web application in `web/`.
- Browser capture is guided RGB image capture only. It must not be described as TrueDepth, ARKit, depth geometry, or 3D reconstruction.
- The iOS SwiftUI project remains in `ios/` as a future native premium-capture path and is not the active product.
- Shared catalog, research, fixture, and production data live under `data/`.
- Production recommendation behavior is fail-closed through catalog validation, fixture separation, feature gates, adapter behavior, and production bundle guards.
- No backend, hosted deployment, authentication provider, payment provider, analytics vendor, cloud storage, or production external service is connected.

## Verified Working Capabilities

These capabilities are implemented and verified by `npm run verify`:

- Web onboarding, product explanation, independent-app disclaimer, consent, privacy summary, guided RGB capture/upload fallback, image-quality review, selective retake, attribute confirmation, profile review, catalog-unavailable result state, saved-build empty state, screenshot-refinement intake scaffold, privacy center, and delete-local-data flows.
- Local-only privacy and deletion foundations for active capture state, derived profile state, saved builds, screenshot sessions, consent records, and deletion records.
- Development/internal Phase 0 tooling for evidence inventory, timeline mapping, research catalog exports, primary-review status, verifier queue generation, blind-verifier package generation, research evidence package validation, catalog release validation, production gate checks, and fixture/placeholder separation.
- Native iOS foundation build, unit tests, and UI tests continue to pass as future work preservation.

These capabilities are not production recommendation capability. They do not mean a user can receive verified College Football 27 options today.

## Current Research Evidence

- Current machine-readable authority: `data/phase-zero/primary_review_status.json`.
- Current status report: `docs/status/PHASE_ZERO_PRIMARY_REVIEW_STATUS.md`.
- Research evidence package: `data/phase-zero/research_evidence_package_manifest.json`.
- Current evidence manifest: `data/phase-zero/evidence_manifest.json`.
- Current capture log: `data/phase-zero/capture_log.json`.
- Current issue register: `data/phase-zero/issues_register.research.json`.
- Current recapture instructions: `docs/phase-zero/WYATT_RECAPTURE_INSTRUCTIONS.md`.

The current research artifacts are primary research only. They are not second verified, not production approved, and not eligible for customer-facing recommendations.

## Source-Video Inventory

| Metric | Current value | Source |
| --- | ---: | --- |
| Video inventory rows | 11 | `data/phase-zero/video_inventory.json` |
| Fully traced unique source videos | 9 | `data/phase-zero/primary_review_status.json` |
| Documented duplicate source references | 2 | `data/phase-zero/primary_review_status.json` |
| Candidates without valid source timestamp | 0 | `data/phase-zero/primary_review_status.json` |
| Evidence entries | 96 | `data/phase-zero/evidence_manifest.json` |
| Issue register entries | 44 | `data/phase-zero/issues_register.research.json` |

The source videos are useful for research evidence, menu/order evidence, and recapture planning. Current footage does not prove a production-ready catalog because category boundaries, environment metadata, standardized visual conditions, and second verification are incomplete.

## Research Candidate Counts

| Funnel stage | Count |
| --- | ---: |
| Total current research candidates | 85 |
| Primary approved | 0 |
| Primary approved with notes | 80 |
| Duplicate review required | 5 |
| Recapture required as candidate-level primary status | 0 |
| Missing evidence as candidate-level primary status | 0 |
| Label unresolved as candidate-level primary status | 0 |
| Order unresolved as candidate-level primary status | 0 |
| Category incomplete as candidate-level primary status | 0 |
| Environment unresolved as candidate-level primary status | 0 |
| Not reviewed | 0 |
| Second verified | 0 |
| Production approved | 0 |
| Records allowed in production recommendations | 0 |

Older partial research exports may mention 86 records. That number is historical/provenance context, not the current operational count. The current normalized primary-review candidate count is 85.

## Category Status

| Category | Observed candidates | Primary-review state | Verifier handoff | Production status |
| --- | ---: | --- | --- | --- |
| Creation paths | 1 | Primary approved with notes | Ready for evidence review | Blocked |
| Appearance menu hierarchy | 93 menu observations | Research map exists | Ready for evidence review | Blocked |
| Heads | 26 | 24 approved with notes; 2 duplicate review | Ready for evidence review | Blocked |
| Skin Tone | 21 | 20 approved with notes; 1 duplicate review | Ready for evidence review | Blocked |
| Skin Details | 10 | 10 approved with notes | Ready for evidence review | Blocked |
| Eye Shape | 5 | 5 approved with notes | Ready for evidence review | Blocked |
| Eye Color | 7 | 7 approved with notes | Ready for evidence review | Blocked |
| Nose | 7 | 6 approved with notes; 1 duplicate review | Ready for evidence review | Blocked |
| Ear Shape | 4 | 3 approved with notes; 1 duplicate review | Ready for evidence review | Blocked |
| Body/context controls | 5 | 5 approved with notes | Ready for evidence review | Blocked |
| Hairstyles | 0 | Not captured | Not ready | Blocked |
| Hair colors | 0 | Not captured | Not ready | Blocked |
| Facial hair | 0 | Not captured | Not ready | Blocked |
| Facial-hair colors | 0 | Not captured | Not ready | Blocked |
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
| User-facing recommendations available | 0 |

The production catalog is intentionally empty. The correct customer-facing state is: “Verified College Football 27 catalog not loaded.”

## Second-Verification Status

- Second-verifier package and handoff documents exist.
- Verifier-ready candidate queue exists for planning and evidence review.
- No second human verification has occurred.
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

## Privacy and Security Status

- Raw user face media is local and temporary by default.
- Raw face images are not stored in localStorage by default.
- No user face media is uploaded by the current app.
- Local deletion flows and privacy inventory are implemented and tested.
- Fixture/test data is separated from production.
- Production bundle guards and legal-copy guards pass.
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

- Keep documentation and machine-readable artifact consistency checks current.
- Improve non-product-changing validators around status drift, path resolution, duplicate reports, and fixture separation.
- Refine internal handoff documents and generated reports without inventing data.

### Wyatt Must Provide

- First immediate recording: `GFM-CF27-S01-environment-game-version-YYYYMMDD-partNN.mp4`, following `docs/phase-zero/CF27_CAPTURE_CLOSURE_PACKAGE.md`.
- Owner capture closure package: `data/phase-zero/capture-closure/owner-capture-plan.json`, `data/phase-zero/capture-closure/owner-capture-plan.csv`, and `data/phase-zero/capture-closure/issue-to-capture-traceability.json`.
- Additional Xbox captures listed in `docs/phase-zero/WYATT_RECAPTURE_INSTRUCTIONS.md`.
- Missing environment/version evidence, including visible game executable version, patch/update state, console model where visible, and reproducible Road to Glory creation context.
- Complete Hair submenu evidence if visible, including hairstyle, hair color, facial-hair, and facial-hair-color controls.
- Standardized head-template visual pass if the first production catalog will include head geometry matching.

### Second Human Verifier Must Complete

- Independent environment entry.
- Independent menu/category counts.
- Native-order review.
- Evidence review and discrepancy submission.
- Final sign-off using the allowed verification statuses.

### External Specialists or Services Are Needed Later

- Legal/trademark/privacy counsel before public launch or paid claims.
- Hosting and payment-provider decisions before deployment or monetization.
- Real-device browser QA before broad beta claims.
- Human matching-study participants after the verified catalog exists.

## Dependency Graph

```text
Current source videos
  -> Primary research catalog candidates
  -> Primary review checkpoint
  -> Wyatt recaptures for missing boundaries, environment, and standard views
  -> Updated research package
  -> Blind second-verifier package
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

The next milestone remains completing the Phase 0 evidence path from primary review to verifier-ready package:

1. Wyatt records the required recapture set.
   - Start with the environment/version recording from `GFM-CF27-S01`; it is the first session in the capture closure package and blocks reproducible production metadata.
2. Codex ingests the new evidence and updates research candidates.
3. Codex regenerates the research package and primary-review status.
4. A second human verifier independently reviews counts, order, evidence, and discrepancies.

## Current Web Entry Screen

Prompt 080 adds a mobile-first scan-entry route at `#start`.

- Branding: `GameFace Match` with `From reality to game face.`
- Purchase plan IDs: `single_scan` (`$0.99`) and `monthly` (`$1.99/month`)
- Consent version: `scan-entry-consent-v1`, layered on top of the existing `web-mvp-consent-v1` capture consent records
- Billing status: provider unavailable; checkout and restoration remain disabled
- Entitlement status: visual plan selection is not treated as payment
- Capture start status: production scans remain blocked until verified entitlement exists; the existing preparation, lighting, capability, and upload/capture routes are preserved for local validation
- Guided scan strategy: the UI follows a quiet entry plus preparation pattern; circular coverage progress is represented by a typed state contract that accepts only real quality-passing, non-duplicate coverage frames and blocks simulated progress in production
- Privacy behavior: no live camera starts on the entry screen, and raw-media deletion behavior is unchanged
- Analytics events added using the existing camelCase event convention: `scanEntryViewed`, `scanPlanSelected`, `scanConsentChanged`, `scanStartTapped`, `scanPurchaseStarted`, `scanPurchaseCompleted`, `scanPurchaseCanceled`, `scanPurchaseFailed`, `scanEntryBlocked`, and `scanPreparationOpened`

## Completion Percentages

These percentages are conservative operating estimates. They do not give production credit for fixtures, shells, templates, or unverified research records.

| Workstream | Current estimate | Basis |
| --- | ---: | --- |
| Repository architecture and verification health | 80%-90% | Full verification passes; many validators exist; status drift still needed this document/check. |
| Web product shell and core local workflows | 55%-65% | Core journey works locally with fail-closed results; real recommendation path blocked. |
| Web private-beta readiness | 30%-40% | Local UX works, but no verified catalog, no real matching study, no full device QA. |
| Native iOS capture foundation | 25%-35% | Project builds/tests, but native capture is future path and not feature-complete. |
| Phase 0 preparation/tooling | 60%-70% | Evidence, review, validator, release, and verifier tooling exists. |
| Source-video ingestion and traceability | 70%-80% | 9 unique videos traced; 2 duplicate references documented; recaptures still needed. |
| Actual CF27 research catalog | 25%-35% | 85 current candidates, but major categories remain uncaptured. |
| Catalog evidence quality | 20%-30% | Useful research evidence exists; production-standard visual evidence incomplete. |
| Primary review | 75%-85% | All 85 current candidates classified; 5 duplicate-review items remain. |
| Second-person verification | 0% | No second human verifier decisions. |
| Production catalog | 0% | No production-approved records. |
| Matching-engine implementation | 65%-75% | Rule-based engine implemented and tested with fixtures; no verified production run. |
| Matching-accuracy validation | 0% | No real participant study data. |
| Screenshot refinement | 20%-30% | Intake/scaffold exists; no verified refinement recommendations. |
| Privacy and deletion | 60%-70% | Local privacy/deletion implemented and tested; legal/real-device validation remains. |
| Security | 45%-55% | Local guards pass; no hosted security review or formal penetration test. |
| Accessibility | 45%-55% | Automated/basic coverage exists; real assistive tech/device QA remains. |
| Legal/trademark readiness | 20%-30% | Counsel package/checklists exist; no legal approval. |
| Analytics and monitoring | 15%-25% | Local/no-op analytics architecture exists; no production monitoring. |
| Deployment/private beta operations | 20%-30% | Docs/runbooks exist; no deployment or real beta operation. |
| Public launch readiness | 5%-10% | Mandatory catalog, verification, matching, legal, deployment, and support gates are blocked. |
| Full original product vision | 15%-25% | Strong foundations exist, but verified catalog and validated recommendations are missing. |

## Links to Supporting Documents

- Source governance: `docs/governance/SOURCE_REGISTRY.md`
- Source of truth: `docs/GAMEFACE_MATCH_SOURCE_OF_TRUTH.md`
- Decision log: `docs/DECISIONS.md`
- Architecture: `docs/ARCHITECTURE.md`
- Documentation index: `docs/DOCUMENTATION_INDEX.md`
- Primary review: `docs/status/PHASE_ZERO_PRIMARY_REVIEW_STATUS.md`
- Wyatt recapture instructions: `docs/phase-zero/WYATT_RECAPTURE_INSTRUCTIONS.md`
- Second-verifier handoff: `docs/phase-zero/SECOND_VERIFIER_HANDOFF.md`
- Artifact map: `docs/phase-zero/PHASE_ZERO_ARTIFACT_MAP.md`
- Video inventory: `docs/phase-zero/VIDEO_SOURCE_INVENTORY.md`
- Evidence package: `docs/phase-zero/RESEARCH_EVIDENCE_PACKAGE_MANIFEST.md`
- Data integrity: `docs/phase-zero/CATALOG_DATA_INTEGRITY_STATUS.md`
- Release no-go decision: `docs/status/RELEASE_CANDIDATE_DECISION.md`
- Final program checkpoint: `docs/status/FINAL_PROGRAM_CHECKPOINT.md`

## Historical Report Handling

Older documents should be read as snapshots of the repository at the time they were created. They may contain stale percentages, stale candidate counts, or pre-video blocker descriptions. Use them for audit history and rationale, but use this file plus the machine-readable `data/phase-zero/primary_review_status.json` artifact for current operating status.
