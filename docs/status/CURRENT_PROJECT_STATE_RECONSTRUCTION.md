# Current Project State Reconstruction

Date: 2026-07-13
Repository: `/Users/skaggssystems/Developer/GameFaceMatch`
Reviewed branch: `main`
Reviewed starting HEAD: `db53424 docs(catalog): add overnight evidence closeout`

This report reconstructs the current GameFace Match state from repository files, Git history, available source evidence, generated research artifacts, and verification commands. It treats prior conversation as non-authoritative.

## Governing Sources Located

| Source | Location | Read/access status | Notes |
| --- | --- | --- | --- |
| Repository contributor rules | `AGENTS.md` | Read | Binding permanent rules. |
| Product source of truth | `docs/GAMEFACE_MATCH_SOURCE_OF_TRUTH.md` | Read | Binding product/technical source. |
| Source registry | `docs/governance/SOURCE_REGISTRY.md` | Read | Binding precedence registry. |
| Repository README | `README.md` | Read | Confirms web-first MVP and preserved iOS path. |
| Architecture | `docs/ARCHITECTURE.md` | Read | Confirms current web architecture, Phase 0 tooling, gates, and iOS preservation. |
| Decision log | `docs/DECISIONS.md` | Read | Confirms D-008 web-first MVP and D-007 empty catalog fail-closed. |
| Catalog workflow | `docs/GAME_CATALOG_WORKFLOW.md` | Read | Binding catalog production and evidence workflow. |
| Current video evidence closeout | `docs/status/OVERNIGHT_VIDEO_EVIDENCE_CLOSEOUT.md` | Read | Current Prompt 80-114 evidence summary. |
| Current research validation | `docs/catalog/CURRENT_RESEARCH_PACKAGE_VALIDATION.md` and `data/research/cf27/reports/current-research-package-validation/current_research_package_validation.json` | Read | Current partial research package validation. |
| Relabeled video manifest | `/Users/skaggssystems/Downloads/RELABELED_VIDEO_MANIFEST.csv` | Read | Maps original source names to working names. |
| Catalog research PDF | `/Users/skaggssystems/Downloads/EA Sports College Football 27 Catalog Research.pdf` | File presence verified | `pdftotext`, Python PDF libs, and Quartz bindings are unavailable in this shell; `textutil` emitted raw PDF bytes, not readable text. Repository catalog workflow docs serve as the readable in-repo equivalent. |
| Phase Zero readiness PDF | `/Users/skaggssystems/Downloads/GameFace Match Phase Zero Readiness Review.pdf` | File presence verified | Text extraction unavailable in this shell. The old blocked-by-game-access conclusion is historical because shipping-game videos now exist. |

## Repository and Git Audit

- Repository root: `/Users/skaggssystems/Developer/GameFaceMatch`
- Active branch: `main`
- Starting HEAD: `db53424 docs(catalog): add overnight evidence closeout`
- Starting working tree: clean.
- Current architecture: responsive web MVP under `web/`; preserved SwiftUI iOS foundation under `ios/`; platform-independent catalog data under `data/`.
- Current backend/API state: no public backend, user accounts, databases, cloud storage, analytics provider, payment provider, email service, or external AI service is connected.
- Internal development-only API routes exist for current research catalog/evidence inspection.
- Current production catalog: `data/catalog/production/catalog_manifest.json`, source type `production`, item count 0.
- Current research namespace: `data/research/cf27/`, source type `PRIMARY_RESEARCH_CANDIDATE`, not production data.
- Test fixtures: `data/fixtures/test-only/`.
- Generated/ignored artifacts present include `web/.next/`, `web/node_modules/`, `web/public/mediapipe/`, `web/test-results/`, local generated research image directories, and iOS derived/user data.

Recent relevant commits from the evidence queue:

- `576a87d docs(catalog): lock current video evidence operations`
- `21ba9f2 docs(catalog): inventory current video masters`
- `32cac56 feat(catalog): add cf27 media inspection pipeline`
- `9dc80ba feat(catalog): add cf27 source video timeline index`
- `fd8f021 feat(catalog): ingest observed rtg creation path`
- `74ff059 feat(catalog): ingest head template research candidates`
- `508da74 feat(catalog): generate current CF27 evidence manifest`
- `5f5ea10 feat(catalog): export partial CF27 research package`
- `794a74f feat(catalog): import partial CF27 research catalog`
- `539974a feat(catalog): add authoritative recapture queue`
- `78761e9 feat(catalog): add Xbox recording runbook`
- `0a17795 feat(catalog): validate current research package`
- `8849124 test(catalog): cover current evidence E2E flows`
- `4f5cddb feat(catalog): harden CF27 media processing`
- `db53424 docs(catalog): add overnight evidence closeout`

## Product Implementation Audit

### Fully implemented and working

- Web onboarding, product explanation, independent-app disclaimer, privacy summary, consent, dashboard navigation, settings, saved-build empty state, privacy center, and local deletion flows.
- Guided RGB capture/upload workflow with five required angles and manual upload fallback.
- Browser capability and permission state abstractions.
- Image validation and quality checks using local browser-safe methods.
- Local user-confirmed appearance attribute flow.
- Versioned `StandardFaceProfile` scaffolding with unavailable geometry states where data is not defensible.
- Local face-landmark provider architecture and MediaPipe runtime copy step.
- Results experience that fails closed when the verified catalog is unavailable.
- Screenshot-refinement intake/scaffold that returns unavailable rather than fake recommendations.
- Privacy-safe local storage/deletion services; raw face images are not stored in localStorage and are not uploaded.
- Phase 0 schemas, workspaces, runbooks, validation scripts, export/import scripts, and research-only evidence tooling.
- Production gates that require an approved verified catalog release; environment variables alone cannot enable recommendations.

### Implemented but incomplete

- Local landmark extraction is implemented behind interfaces, but real landmark claims remain gated by the reviewed local model asset and real-device QA.
- RGB geometry/profile pipeline exists, but production matching remains disabled because no verified production catalog exists.
- Research-only partial matching sandbox can consume current research candidates, but it is not public production behavior.
- Current research evidence gallery and source-video inspector exist, but they operate on research-only data.
- Phase 0 status service currently computes production readiness from production catalog state; the new video-evidence closeout separately tracks research execution progress.

### Scaffolded or placeholder-only

- Payments, entitlements, pricing, checkout, refund/support, deployment, and Squarespace handoff are provider-independent scaffolds only.
- Screenshot refinement engine is architectural scaffolding only.
- iOS native app is a preserved foundation for future premium TrueDepth capture, not the active MVP.
- Admin/catalog-manager folder has local/internal tooling boundaries; it is not a cloud admin system.

### Blocked

- Real user-facing College Football 27 recommendations are blocked by the empty verified production catalog.
- Production top-three matching is blocked until a verified, approved catalog release exists.
- Phase 0 completion is blocked by missing category coverage, missing standardized production-comparison imagery, unknown environment fields, second-person verification, catalog-manager approval, and production publish gates.
- Private beta evaluation of match usefulness is blocked until verified catalog coverage and manual study readiness exist.

## Shipping-Game Evidence Audit

Source videos are present in `/Users/skaggssystems/Downloads/` and preserved outside the repository. The repository stores portable references and derivative manifests, not committed master media.

Fresh checksum verification of the nine unique masters matched `data/research/cf27/video_inventory.json`.

| Working file | Original / resolved file | Container | Codec summary | Duration | Size | Evidence strength |
| --- | --- | --- | --- | ---: | ---: | --- |
| `01_Environment_and_Creation_Path.mp4` | `01_Environment_and_Creation_Path.MP4` | MP4 | h264 Main, AAC LC stereo | 73.57s | 156,142,794 | Strong for environment/creation-path navigation; incomplete for exact console/version metadata. |
| `02_Head_Templates_Faces_01-12.mov` | `02_Appearance_Menu_Part_1.mp4.MOV` | QuickTime/MOV | h264 Main, AAC LC stereo | 108.80s | 254,684,699 | Useful for selected labels/order and limited visual evidence; not standardized production imagery. |
| `03_Head_Templates_Faces_12-29.mov` | `02_Appearance_Menu_Part_2.mp4.MOV` | QuickTime/MOV | h264 Main, AAC LC stereo | 133.02s | 302,595,103 | Useful for selected labels/order; Face 12 overlap preserved; not a complete category boundary. |
| `04_Skin_Tone.mp4` | `03_Appearance_Skin_Tone.MP4` | MP4 | h264 Main, AAC LC stereo | 53.82s | 128,477,357 | Useful for selected Skin Tone order/labels and visual research metadata; not production verified. |
| `05_Skin_Details.mp4` | `04_Appearance_Skin_Details.MP4` | MP4 | h264 Main, AAC LC stereo | 31.72s | 78,206,366 | Useful for selected Skin Details order/labels; text confirmation still needed for uncertain labels. |
| `06_Eye_Shape.mp4` | `45926e39-7553-43b1-803a-6ddc787c63dd.MP4` | MP4 | h264 Main, AAC LC stereo | 24.93s | 61,265,737 | Useful for selected Eye Shape records; partial acceptance due capture/navigation limitations. |
| `07_Eye_Color.mp4` | resolved UUID MP4 for manifest original `352535` | MP4 | h264 Main, AAC LC stereo | 29.33s | 73,201,886 | Useful for selected Eye Color records; visual color confidence varies by resolution/lighting. |
| `08_Nose.mp4` | resolved UUID MP4 for manifest original `352537` | MP4 | h264 Main, AAC LC stereo | 32.45s | 80,062,286 | Useful for selected Nose records; profile evidence incomplete. |
| `09_Ear_Shape.mp4` | resolved UUID MP4 for manifest original `352531` | MP4 | h264 Main, AAC LC stereo | 30.21s | 69,914,730 | Useful for selected Ear Shape records; side visibility and hair obstruction limitations remain. |

Inventory totals:

- Video files discovered: 11
- Unique masters: 9
- Exact duplicate files: 2
- Unique duration processed: 517.85 seconds / 8.63 minutes
- Unique source-video size: 1.20 GB
- Duplicate files were not deleted.

Evidence strength by purpose:

- Menu/count/native-order evidence: useful for currently selected values and directly observed sequences.
- Visual catalog evidence: useful for research review and annotation, but limited by eye black, hair/facial-hair obstruction, camera/rotation inconsistency, and nonstandard capture conditions.
- Standardized production comparison evidence: not sufficient yet; all 29 current head candidates require standardized recapture for production comparison.

## Current Catalog Audit

Production catalog:

- Production item count: 0
- Verified production record count: 0
- Empty production catalog validation passes with the expected warning that no recommendations can be produced.
- Production recommendation access is disabled.

Research catalog:

- Data class: `PRIMARY_RESEARCH_CANDIDATE`
- Production status: `NOT_PRODUCTION_DATA`
- Verification status: `PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED`
- Current research records: 86
- Evidence entries: 335
- Capture-log events: 106
- Creation paths: 1
- Menu items: 13
- Issues/exceptions: 16
- Recapture queue rows in export: 56

Research candidates:

| Category | Count |
| --- | ---: |
| Head Templates | 29 |
| Skin Tone | 24 |
| Skin Details | 10 |
| Eye Shape | 5 |
| Eye Color | 7 |
| Nose | 7 |
| Ear Shape | 4 |
| Total | 86 |

Research validation:

- Current research package validation status: passed.
- Checks: 14/14 passed.
- Errors: 0.
- Warnings: 0.
- Local derivative evidence checked: 324.
- Source master hashes checked: 11.
- Production recommendations enabled: false.
- Import report correctly marks 86 imported records as incomplete and promotion ineligible.

No current research record is eligible for production recommendation until it receives complete environment metadata, complete category/boundary evidence, required standardized views, first and second review, catalog-manager approval, valid production package status, and an approved immutable release.

## Phase 0 Status

Historical correction:

- The older Phase Zero Readiness Review PDF was created before shipping-game access and should remain preserved as a historical pre-game-access baseline.
- The project is no longer completely blocked by game access because Wyatt supplied direct Xbox recordings.
- The project remains blocked from Phase 0 completion and production recommendations because current footage is primary research only and not independently verified.

Evidence-based status after current videos:

- Overall Phase 0: in progress, approximately 30% by evidence-execution progress in the overnight closeout.
- Public research and audit preparation are strong.
- Shipping-game inspection has started but is incomplete.
- Environment documentation, full menu mapping, head catalog completion, hairstyle catalog, facial-hair catalog, dependencies, and verification remain major gaps.
- Second-person verification remains 0% complete.

## Remaining Work

Highest-priority owner/evidence tasks:

1. Upload the 17 additional clips in `data/research/cf27/reports/tomorrows-xbox-recording-runbook/tomorrows_xbox_recording_runbook.json`.
2. Confirm exact Xbox console model, console OS, game executable/version, patch/update state, edition, entitlement state, and relevant display/capture setup.
3. Prove Head Template boundary after Face 29.
4. Produce an independent second full Head Template count.
5. Lock canonical appearance settings, including removing eye black and setting non-obstructing hair/facial hair where the game allows it.
6. Recapture standardized head views with menu, front, both three-quarter, both profile, and rear views.
7. Capture missing face-shape categories: Mouth Shape, Jaw Shape, and Chin.
8. Capture Hair, Hairstyles, Hair Colors, Facial Hair, and Facial Hair Colors.
9. Run selector wrap and dependency checks.
10. Assign a genuine second verifier and catalog-manager review path.

Highest-priority safe engineering work completed during this reconstruction:

- Removed duplicate React keys in development-only Phase 0 validation lists:
  - `web/features/phase-zero/CatalogAnnotationWorkspace.tsx`
  - `web/features/phase-zero/SecondVerifierWorkspace.tsx`
- This eliminates the known duplicate-key warnings in Phase 0 E2E output without changing catalog rules, validation semantics, or user-facing production behavior.

## Verification Commands Run During Reconstruction

| Command | Result |
| --- | --- |
| `git status --short --branch` | Passed; starting tree clean on `main`. |
| `git log --oneline --decorate -40` | Passed; evidence queue commits present through `db53424`. |
| `find ...` for source docs/manifests/videos | Passed; PDFs, manifest, and current videos found in Downloads where expected. |
| `sed`/`rg` over README, architecture, decisions, catalog workflow, status docs, package scripts | Passed. |
| `pdftotext ...` | Failed; tool is not installed. |
| Python checks for `pypdf`, `PyPDF2`, `pdfplumber`, `Quartz` | Failed; modules unavailable. |
| `textutil -convert txt -stdout <pdf>` | Not useful; emitted raw PDF bytes rather than readable text. |
| `stat` for PDFs and relabeled manifest | Passed; files exist. |
| `file <video masters>` | Passed; videos are ISO media / MP4 or QuickTime containers. |
| `shasum -a 256 <nine unique masters>` | Passed; matched committed inventory hashes. |
| `/Applications/Plaud.app/Contents/Resources/ffmpeg -version` | Passed; bundled ffmpeg exists. |
| `/Applications/Plaud.app/Contents/Resources/ffmpeg -hide_banner -i <video> -f null -` | Passed for spot-check; confirmed h264/AAC metadata on the environment video. |
| `npm --prefix web ls --depth=0` | Passed; local dependencies resolve. |
| `npm --prefix web run test:e2e:phase0` | First run failed due sandbox `EPERM` binding `127.0.0.1:3101`; escalated rerun passed, 8 tests. Duplicate-key warnings were not observed after the patch. |

## Current Verdict

- The repository is safe to continue from.
- The responsive web MVP remains the active implementation.
- The preserved native iOS project remains valuable future TrueDepth work and should not be deleted.
- The shipping-game evidence has moved Phase 0 from pre-access blocked to active research in progress.
- The current catalog is not verified, not production-ready, and not eligible for user-facing recommendations.
- The next evidence-ingestion prompt after the additional video uploads should be Prompt 102: `AUTOMATIC NEW-VIDEO CLASSIFICATION AND RELABELING`.
