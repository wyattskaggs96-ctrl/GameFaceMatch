# Overnight Video Evidence Closeout

Date: 2026-07-13
Repository path: `/Users/skaggssystems/Developer/GameFaceMatch`
Reviewed HEAD before this closeout: `4f5cddb feat(catalog): harden CF27 media processing`
Data class: `PRIMARY_RESEARCH_CANDIDATE`
Production status: `NOT_PRODUCTION_DATA`
Verification status: `PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED`

This closeout summarizes the evidence-ingestion work completed from Prompt 80 through Prompt 113. It does not mark the College Football 27 catalog verified, production-ready, complete, or recommendation-enabled.

## Current Checkpoint Note

This file is preserved as the overnight video-evidence closeout. For the latest post-`b40f0072a20365a80f697c1ea2407ac846b0a5da` readiness review, completion estimates, blockers, human capture plan, second-verifier work, and Prompt 93+ queue, use `docs/status/CURRENT_PROJECT_STATE_RECONSTRUCTION.md`.

## Executive Result

- The current Xbox recordings were inventoried, staged, technically inspected, timeline-indexed, and converted into a partial research catalog.
- The package contains 86 primary-research catalog records and 335 evidence-manifest entries.
- The current research package validation passes for research-use constraints.
- Production recommendations remain disabled.
- No verified production College Football 27 records exist.
- The next operational step is to upload the 17 additional clips listed at the end of this document, then run Prompt 102 to classify the new videos before any ingestion or catalog updates.

## Videos Located

Source: `data/research/cf27/video_inventory.json`

| Metric | Count |
| --- | ---: |
| Video files discovered | 11 |
| Unique master videos mapped by manifest | 9 |
| Exact duplicate files | 2 |
| Accepted research candidates | 5 |
| Partially accepted research candidates | 4 |
| Rejected duplicate/reference-only files | 2 |
| Unique duration processed | 517.85 seconds / 8.63 minutes |
| All discovered-file duration including duplicates | 603.39 seconds / 10.06 minutes |
| Unique source-video size | 1,204,550,958 bytes / 1.20 GB |

Current unique video set:

1. Environment and Road to Glory creation path
2. Head Templates - Faces 1-12
3. Head Templates - Faces 12-29
4. Skin Tone
5. Skin Details
6. Eye Shape
7. Eye Color
8. Nose
9. Ear Shape

## Duplicates

Source: `data/research/cf27/video_duplicate_report.json`

- Duplicate groups found: 2
- Duplicate files found: 2
- Files deleted: 0
- Exact duplicates are identified by SHA-256, not by filename.
- The intentional Face 12 overlap between the two Head Template recordings is confirmed and preserved as overlapping evidence, not treated as a duplicate catalog identity.

## Timeline and Categories Identified

Source: `data/research/cf27/video_timeline_index.json`

| Metric | Count |
| --- | ---: |
| Unique videos indexed | 9 |
| Timeline events | 106 |
| Selected native-label events | 86 |
| Recording gaps observed | 0 |
| Notification-overlay events | 2 |

Observed categories with research candidates:

- Head Templates
- Skin Tone
- Skin Details
- Eye Shape
- Eye Color
- Nose
- Ear Shape

Observed or strongly supported menu areas that still need completion or confirmation:

- Appearance
- Head & Skin
- Hair
- Mouth Shape
- Jaw Shape
- Chin

## Creation-Path Records

Source: `data/research/cf27/catalog-candidates/research/road-to-glory-creation-path/`

| Artifact | Count / Status |
| --- | --- |
| Environment manifest records | 1 research candidate |
| Creation-path records | 1 research candidate |
| Creation-path evidence references | Present |
| Creation-path capture log | Present |
| Issues for unknown environment fields | Present |

Directly observed path coverage includes Road to Glory navigation through Create Player, Player, Appearance, Head & Skin, and Hair-adjacent navigation. Unknown fields remain explicitly unknown rather than guessed, including exact Xbox model, executable version, patch, edition, region, HDR state, and display model.

## Menu Records

Source: `data/research/cf27/catalog-candidates/research/appearance-menu-hierarchy/appearance_menu_hierarchy.json`

- Menu records created: 13
- These records describe the directly observed portion of the Appearance hierarchy.
- Records are research-only and are not a complete production menu map.
- A schema comparison/export exists under `data/research/cf27/catalog-candidates/research/appearance-menu-hierarchy/`.

## Research Catalog Candidates

Source: `data/research/cf27/catalog-candidates/research/` and `data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json`

| Category | Research candidates |
| --- | ---: |
| Head Templates | 29 |
| Skin Tone | 24 |
| Skin Details | 10 |
| Eye Shape | 5 |
| Eye Color | 7 |
| Nose | 7 |
| Ear Shape | 4 |
| Total additional-attribute candidates | 57 |
| Total research catalog records | 86 |

Important limits:

- Face 30 or later was not created from thumbnail visibility.
- The project does not claim that Head Templates stop at Face 29.
- All candidates remain `NOT_VERIFIED` or equivalent primary-research state.
- No record is production verified or recommendation eligible.

## Derivative Frames Generated

Source: `data/research/cf27/manifests/current-evidence/current_evidence_manifest.json`

| Evidence type | Count |
| --- | ---: |
| Total evidence-manifest entries | 335 |
| Source master references | 11 |
| Derivative evidence entries | 324 |
| Source-video entries | 11 |
| Menu evidence frames | 86 |
| Head-template frame entries | 203 |

View counts in the current evidence manifest:

| View | Count |
| --- | ---: |
| MENU | 86 |
| SOURCE_VIDEO | 11 |
| CHARACTER_STABLE | 41 |
| CHARACTER_FRONT | 5 |
| FRONT | 36 |
| LEFT_3Q | 29 |
| LEFT_PROFILE | 29 |
| REAR | 29 |
| RIGHT_3Q | 29 |
| RIGHT_PROFILE | 29 |
| BEST_AVAILABLE_THREE_QUARTER | 7 |
| BEST_AVAILABLE_SIDE_OR_THREE_QUARTER | 4 |

All derivative records preserve provenance to source video and timestamp. Master videos remain unchanged.

## Missing Views and Capture Quality

Sources:

- `data/research/cf27/reports/head-template-evidence-frames/head_template_missing_view_summary.json`
- `data/research/cf27/reports/head-template-standardization-qa/head_template_standardization_qa_report.json`

Head Templates Faces 1-29 have all Prompt 88 requested extracted views: MENU, FRONT, LEFT_3Q, LEFT_PROFILE, RIGHT_3Q, RIGHT_PROFILE, and REAR.

However, the current head imagery is still limited:

- Elevated and lowered head views are missing.
- Angle labels remain approximate until second-person verification.
- Eye black, hairstyle, facial hair, loading state, crop consistency, and rotation consistency issues limit matching-image quality.
- Usable production-comparison image count: 0.
- Limited matching-image count: 29.
- Recapture required for production comparison: 29.
- A single standardized recapture run can likely repair the image-comparison limitations for Faces 1-29, but it cannot prove the full Head Template count, replace second verification, or fill unknown environment fields.

## Validation Failures

Source: `data/research/cf27/reports/current-research-package-validation/current_research_package_validation.json`

| Validation metric | Result |
| --- | ---: |
| Validation status | Passed |
| Checks run | 14 |
| Passed checks | 14 |
| Failed checks | 0 |
| Error count | 0 |
| Warning count | 0 |
| Research record count | 86 |
| Evidence count | 335 |
| Local derivative evidence checked | 324 |
| Source master hashes checked | 11 |
| Production recommendations enabled | false |

The import report also passed, but correctly reports 86 incomplete records, 86 warnings, promotion eligibility `false`, and production recommendation access `false`.

## Recapture Requests

Sources:

- `data/research/cf27/reports/authoritative-recapture-queue/authoritative_recapture_queue.json`
- `data/research/cf27/reports/tomorrows-xbox-recording-runbook/tomorrows_xbox_recording_runbook.json`

| Recapture metric | Count |
| --- | ---: |
| Consolidated authoritative queue items | 24 |
| P0 queue items | 8 |
| P1 queue items | 12 |
| P2 queue items | 4 |
| Production-blocking queue items | 22 |
| Existing-evidence-useful queue items | 24 |
| Source recapture rows consolidated | 56 |
| Source issue rows consolidated | 16 |
| Head standardization rows consolidated | 29 |
| Sequence-review suggestions referenced | 119 |
| OCR manual-review items referenced | 33 |

Highest-priority remaining needs include exact Xbox environment details, executable/patch/version evidence, Head Template boundary and second count, standardized head recapture without avoidable obstructions, missing face-shape categories, complete Hair and Facial Hair evidence, and selector/dependency checks.

## Research Package Status

Source: `data/research/cf27/exports/partial-research-catalog-current/`

The deterministic partial research package exists and is labeled primary research only. Exported counts:

| Export category | Count |
| --- | ---: |
| Capture-log events | 106 |
| Creation paths | 1 |
| Environments | 1 |
| Menu items | 13 |
| Heads | 29 |
| Skin tones | 24 |
| Skin details | 10 |
| Eye shapes | 5 |
| Eye colors | 7 |
| Noses | 7 |
| Ear shapes | 4 |
| Evidence-manifest entries | 335 |
| Issues and exceptions | 16 |
| Recapture queue rows | 56 |
| Total research catalog records | 86 |

Package label:

`PRIMARY RESEARCH CANDIDATE - NOT PRODUCTION VERIFIED`

## Production-Gate Status

- Production catalog records created: 0.
- Verified production records created: 0.
- Production recommendations enabled: false.
- Research records are isolated from production data.
- Fixture records remain separate from research and production data.
- The current package cannot be promoted because it lacks second-person verification, complete environment proof, complete category counts, standardized production-comparison imagery, catalog-manager approval, and resolved production-blocking recapture items.

## Test and Build Status

Most recent full repository verification from Prompt 113:

```bash
GAMEFACE_VERIFY_SKIP_IOS=1 npm run verify
```

Result: passed.

Included stages:

- Repository status and documentation safety
- Requirement traceability check
- Phase 0 export pipeline check
- Catalog import validation engine check
- Web type-check
- Web lint
- Web unit and integration tests
- Production catalog validation
- Placeholder, fixture, duplicate, and integrity checks
- Web production build
- Production E2E tests
- Phase 0 E2E tests

Focused media-processing verification after final cleanup:

```bash
npm --prefix web run test -- tests/cf27-media-inspection.test.ts
```

Result: passed, 8 tests.

Known non-blocking warnings:

- The production catalog validator still reports the expected empty-catalog warning.
- Phase 0 development E2E logs existing duplicate-key React warnings in dev-only audit screens.
- iOS checks were skipped in the Prompt 113 verification because that work changed catalog tooling, docs, and web tests only.

## Git Status and Commits Created

Branch: `main`

Prompt 80 through Prompt 113 created 34 commits:

```text
576a87d docs(catalog): lock current video evidence operations
21ba9f2 docs(catalog): inventory current video masters
7b89f1b chore(catalog): add research evidence staging area
32cac56 feat(catalog): add cf27 media inspection pipeline
9dc80ba feat(catalog): add cf27 source video timeline index
fd8f021 feat(catalog): ingest observed rtg creation path
e22f259 feat(catalog): reconstruct observed appearance hierarchy
74ff059 feat(catalog): ingest head template research candidates
ea4c64e feat(catalog): extract head template evidence frames
9cfc61f feat(catalog): add head template recapture qa
c48d62c feat(catalog): ingest skin tone research candidates
4399c31 feat(catalog): ingest skin details research candidates
7f25b57 feat(catalog): ingest eye shape research candidates
e5afb8f feat(catalog): ingest eye color research candidates
401c54c feat(catalog): ingest nose research candidates
d546967 feat(catalog): ingest ear shape research candidates
508da74 feat(catalog): generate current CF27 evidence manifest
52c1d7c feat(catalog): generate current CF27 capture log
5f5ea10 feat(catalog): export partial CF27 research package
794a74f feat(catalog): import partial CF27 research catalog
853e6b8 feat(catalog): add current research evidence gallery
d4ba1ef feat(catalog): add source video evidence inspector
79a7c0a feat(catalog): add safe new-video classifier
9b11581 feat(catalog): add native sequence integrity review
78b154d feat(catalog): add view-angle frame selection service
f5b3063 feat(catalog): add OCR native label review workflow
514f717 feat(catalog): add head visual measurement research pipeline
ce9eaad feat(catalog): populate head annotation workspace
54df610 feat(catalog): add partial matching research sandbox
539974a feat(catalog): add authoritative recapture queue
78761e9 feat(catalog): add Xbox recording runbook
0a17795 feat(catalog): validate current research package
8849124 test(catalog): cover current evidence E2E flows
4f5cddb feat(catalog): harden CF27 media processing
```

## Remaining Repository Risks

- No second human verification has occurred.
- Exact Xbox environment, executable version, patch/update state, edition, entitlements, and display/capture setup remain incomplete.
- Head Template count is not complete beyond Face 29.
- Hair, hairstyles, facial hair, facial-hair colors, Mouth Shape, Jaw Shape, Chin, physique, height, weight, body type, and dependency checks remain incomplete.
- The current head imagery is not production-comparison quality.
- OCR output remains review assistance only and must not become catalog truth without visual confirmation.
- Current partial matching is research-only and must stay disabled in production.
- Large-media processing has been hardened but still needs real batch timing as more videos arrive.
- Dev-only Phase 0 UI still has known duplicate-key warnings in E2E logs.

## Phase 0 Evidence-Based Status Update

These percentages are evidence-execution progress estimates after the current video ingestion. They are not software-readiness percentages and not production-readiness percentages. They intentionally stay conservative because no record is second-verified or production-approved.

| Area | Evidence-based percent | Evidence | Blocker |
| --- | ---: | --- | --- |
| Public research | 100% | Binding documents, source registry, operating lock, and public/source constraints are present. | Keep future sources classified. |
| Audit preparation | 95% | Research staging, schemas, scripts, runbooks, media pipeline, validation, gallery, and inspector exist. | Continue tuning from real operator use. |
| Shipping-game inspection | 35% | 9 unique direct Xbox recordings indexed and 86 selected-label events captured. | Many required categories and boundary proofs remain missing. |
| Environment documentation | 35% | One environment research candidate exists. | Exact console, executable, patch, edition, region, HDR, and display fields remain unknown. |
| Creation-path mapping | 45% | One Road to Glory path candidate is recorded from direct evidence. | Body/player controls and alternate/dependency paths are incomplete. |
| Menu mapping | 30% | 13 observed Appearance hierarchy menu records exist. | Full menu map, Hair map, missing face-shape categories, scrolling, locks, and dependencies remain incomplete. |
| Head catalog | 30% | Faces 1-29 are primary-research candidates with menu/order evidence and extracted requested views. | Count boundary, second count, standardized recapture, and second verification are missing. |
| Hairstyle catalog | 0% | No hairstyle records from direct evidence yet. | Hair menu and hairstyle videos still required. |
| Facial-hair catalog | 0% | No facial-hair records from direct evidence yet. | Facial-hair menu and option videos still required. |
| Additional attributes | 20% | 57 primary-research candidates across Skin Tone, Skin Details, Eye Shape, Eye Color, Nose, and Ear Shape. | Many categories, boundary proofs, manual label confirmations, and second verification remain missing. |
| Dependency testing | 5% | Dependency-test tooling and selector-review suggestions exist. | Real dependency runs for platform/mode/body/head/hair/account/patch are not complete. |
| Evidence integrity | 55% | 335 evidence entries, 11 source master references, checksums, relative paths, and provenance are present. | More evidence is missing; production-quality views and environment evidence remain incomplete. |
| Catalog exports | 50% | Partial research export exists and validates with 86 records. | Export is research-only and not promotion eligible. |
| Catalog-manager validation | 20% | Local validation and review tooling exist. | No catalog-manager approval of a production candidate. |
| Second-person verification | 0% | Second-verifier workflow exists. | No genuine second-person verification has occurred. |
| Manual matching feasibility | 10% | Research-only sandbox can consume current candidates. | Verified catalog, complete heads, build instructions, and manual study data are absent. |
| Overall Phase 0 | 30% | Current videos materially advanced research intake from pre-data state. | Production remains blocked by missing categories, environment proof, second review, and publish gates. |

Phase 0 status: in progress, not complete.

Private beta status: not ready for real recommendation evaluation.

Production catalog status: empty and fail-closed.

## Upload Order for Tomorrow's Additional Videos

Upload the next videos in this exact order from `data/research/cf27/reports/tomorrows-xbox-recording-runbook/tomorrows_xbox_recording_runbook.json`:

1. `CF27_XBOX_ENV_CONSOLE_MODEL_OS_UPDATE_YYYYMMDD.mp4`
2. `CF27_XBOX_ENV_GAME_VERSION_ENTITLEMENTS_YYYYMMDD.mp4`
3. `CF27_XBOX_RTG_PATH_PLAYER_BODY_CONTROLS_YYYYMMDD.mp4`
4. `CF27_XBOX_APPEARANCE_HEADSKIN_MENU_MAP_YYYYMMDD.mp4`
5. `CF27_XBOX_HEAD_TEMPLATE_FACE29_TO_BOUNDARY_YYYYMMDD.mp4`
6. `CF27_XBOX_HEAD_TEMPLATE_SECOND_FULL_COUNT_YYYYMMDD.mp4`
7. `CF27_XBOX_CANONICAL_APPEARANCE_LOCK_YYYYMMDD.mp4`
8. `CF27_XBOX_HEAD_STANDARDIZED_FACE001_FACE012_YYYYMMDD.mp4`
9. `CF27_XBOX_HEAD_STANDARDIZED_FACE012_FACE024_YYYYMMDD.mp4`
10. `CF27_XBOX_HEAD_STANDARDIZED_FACE024_TO_FINAL_YYYYMMDD.mp4`
11. `CF27_XBOX_FACE_MENUS_MOUTH_JAW_CHIN_YYYYMMDD.mp4`
12. `CF27_XBOX_HAIR_MENU_MAP_YYYYMMDD.mp4`
13. `CF27_XBOX_HAIRSTYLES_COMPLETE_YYYYMMDD.mp4`
14. `CF27_XBOX_HAIR_COLORS_COMPLETE_YYYYMMDD.mp4`
15. `CF27_XBOX_FACIAL_HAIR_COMPLETE_YYYYMMDD.mp4`
16. `CF27_XBOX_FACIAL_HAIR_COLORS_COMPLETE_YYYYMMDD.mp4`
17. `CF27_XBOX_SELECTOR_WRAP_AND_DEPENDENCY_CHECKS_YYYYMMDD.mp4`

After these videos arrive, run Prompt 102 first: `PROMPT 102 - AUTOMATIC NEW-VIDEO CLASSIFICATION AND RELABELING`.
