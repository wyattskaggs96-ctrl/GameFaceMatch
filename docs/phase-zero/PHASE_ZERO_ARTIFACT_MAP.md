# Phase 0 Artifact Map

**Status:** canonical artifact registry  
**Last reviewed:** 2026-07-14  
**Scope:** College Football 27 Phase 0 research, evidence, catalog, QA, verification, and readiness artifacts  
**Production status:** NOT PRODUCTION DATA

This map reconciles the current Phase 0 artifact families after the post-`b40f0072a20365a80f697c1ea2407ac846b0a5da` checkpoint. Use it before changing video evidence, research catalog records, evidence manifests, issue tracking, recapture planning, verification, or readiness status.

The canonical machine-readable Phase 0 dataset is under `data/phase-zero/`. Older `data/research/cf27/` exports and `docs/catalog/` reports remain preserved as historical/provenance snapshots unless explicitly listed as canonical below.

## Canonical Status

| Purpose | Canonical path | Data owner | Update process | Source dependencies | Validation command | Current status |
| --- | --- | --- | --- | --- | --- | --- |
| Current project readiness checkpoint | `docs/status/CURRENT_PROJECT_STATE_RECONSTRUCTION.md` | Phase 0 program manager | Update after a completed checkpoint review and full verification run. | All current Phase 0 artifacts, Git history since `b40f007`, verification logs. | `npm run verify` | Canonical current status; production readiness blocked. |
| Current artifact map | `docs/phase-zero/PHASE_ZERO_ARTIFACT_MAP.md` | Phase 0 program manager | Update when canonical artifact paths, ownership, or validation commands change. | Current status file, Phase 0 data files, validators. | `npm test -- phase-zero-artifact-map` from `web/` | Canonical. |
| Phase 0 data dictionary | `docs/phase-zero/PHASE_ZERO_DATA_DICTIONARY.md` | Catalog systems architect | Update when schema fields, lifecycle states, or ownership terms change. | Catalog schemas, validators, source registry, data artifacts. | `npm test -- phase-zero-artifact-map` from `web/` | Canonical. |

## Canonical Machine-Readable Data

| Purpose | Canonical path | Data owner | Update process | Source dependencies | Validation command | Current status |
| --- | --- | --- | --- | --- | --- | --- |
| Video source inventory | `data/phase-zero/video_inventory.json` and `data/phase-zero/video_inventory.csv` | Evidence custodian | Regenerate only from preserved source-video references and accepted manifest mappings. | Original masters outside repo, relabel manifest, ffprobe/ffmpeg metadata. | `npm run verify` and `npm test -- cf27-video-source-inventory` from `web/` | Canonical normalized inventory; 9 unique source masters in current evidence manifest. |
| Video timeline | `data/phase-zero/video_timeline.json` and `data/phase-zero/video_timeline.csv` | Video timeline analyst | Update from direct frame inspection only; distinguish selected options from incidental thumbnails. | Video inventory, source videos, derivative frames. | `npm run verify` and `npm test -- cf27-video-timeline-map` from `web/` | Canonical normalized timeline. |
| Research environment manifest | `data/phase-zero/environment_manifest.research.json` | Environment auditor | Update only from directly visible environment footage; unresolved fields remain null/UNKNOWN. | Environment and creation-path video timeline, evidence manifest, issues register. | `npm run verify` and `npm test -- cf27-environment-creation-path-research` from `web/` | Canonical research environment; not production verified. |
| Research creation paths | `data/phase-zero/creation_paths.research.json` and `data/phase-zero/creation_paths.research.csv` | Creation-path researcher | Update from direct path footage; preserve evidence references for every populated field. | Environment manifest, video timeline, evidence manifest. | `npm run verify` and `npm test -- cf27-environment-creation-path-research` from `web/` | Canonical research creation path; Road to Glory remains research-supported, not production verified. |
| Research menu map | `data/phase-zero/menu_map.research.json` and `data/phase-zero/menu_map.research.csv` | Appearance-menu catalog manager | Update only from directly observed menu hierarchy, labels, controls, and boundaries. | Video timeline, environment manifest, evidence manifest. | `npm run verify` and `npm test -- cf27-appearance-menu-map-research` from `web/` | Canonical normalized menu map; partial categories remain marked incomplete. |
| Head-template research catalog | `data/phase-zero/heads.research.json` and `data/phase-zero/heads.research.csv` | Head-template catalog lead | Update from selected-menu evidence and QA review only; preserve skipped/duplicate/ambiguous observations. | Head-template videos, video timeline, evidence manifest, capture log, issue register. | `npm run verify` and `npm test -- cf27-head-template-research-catalog` from `web/` | Canonical normalized heads; 26 unique directly observed candidates, 0 production eligible. |
| Additional-attribute research catalog | `data/phase-zero/additional_attributes.research.json` and `data/phase-zero/additional_attributes.research.csv` | Appearance-control catalog researcher | Update from direct evidence for Skin Tone, Skin Details, Eye Shape, Eye Color, Nose, Ear Shape, and future categories. | Category videos, video timeline, evidence manifest, menu map. | `npm run verify` and `npm test -- cf27-appearance-controls-research-catalog` from `web/` | Canonical normalized additional attributes; 54 unique values, 0 production eligible. |
| Evidence manifest | `data/phase-zero/evidence_manifest.json` and `data/phase-zero/evidence_manifest.csv` | Evidence custodian | Update whenever source references or derivative evidence changes; preserve relative paths and source timestamps. | Video inventory, timeline events, derivative frame records, catalog records. | `npm run verify` and `npm test -- cf27-current-evidence-manifest` from `web/` | Canonical normalized evidence manifest; 96 entries. |
| Capture log | `data/phase-zero/capture_log.json` and `data/phase-zero/capture_log.csv` | Evidence custodian | Update after timeline, evidence, or catalog candidate changes; keep chronology and uncertainty explicit. | Video timeline, research candidates, evidence manifest, issues. | `npm run verify` and `npm test -- cf27-current-capture-log` from `web/` | Canonical normalized capture log. |
| Issues register | `data/phase-zero/issues_register.research.json` | Phase 0 QA owner | Update when blockers, gaps, QA failures, or recapture needs change. | Environment, menu map, research catalogs, QA reports, validation reports. | `npm run verify` and `npm test -- phase-zero-issue-management` from `web/` | Canonical issues register; 41 current issues. |
| Recapture request plan | `data/phase-zero/capture_requests.json` and `data/phase-zero/capture_requests.csv` | Human-capture director | Update from current gaps only; do not add generic or assumed captures. | Issues register, recapture reports, capture quality reports, current status. | `npm run verify` and `npm test -- phase-zero-capture-requests` from `web/` | Canonical human capture queue; 21 requests. |
| Head-template recapture list | `data/phase-zero/head_template_recapture_list.research.json` and `.csv` | Head-template catalog lead | Update after head evidence QA and standardization review. | Head research catalog, head QA reports, evidence manifest. | `npm run verify` and `npm test -- phase-zero-head-template-standardization-qa` from `web/` | Canonical head recapture detail. |
| Additional-attribute recapture requirements | `data/phase-zero/additional_attributes_recapture_requirements.research.json` and `.csv` | Appearance-control catalog researcher | Update after category-specific QA or new evidence. | Additional-attribute catalog, menu map, issues. | `npm run verify` and `npm test -- cf27-appearance-controls-research-catalog` from `web/` | Canonical attribute recapture detail. |
| Record classification report | `data/phase-zero/catalog_record_classification.csv` | Data-integrity auditor | Regenerate with catalog classification script after catalog or fixture changes. | Production catalog, research artifacts, fixtures, templates. | `npm run catalog:classify-records -- --check` or `npm run verify` | Canonical classification report; production access is blocked for fixtures, research, placeholders, and unknown-origin records. |
| Second-verifier assignment package | `data/phase-zero/verification_assignment.json` | Independent-verification package manager | Regenerate before handoff to a real verifier; does not prove verification occurred. | Current research package, evidence manifest, capture plan, instructions. | `npm run verify` and `npm test -- phase-zero-verifier-package` from `web/` | Canonical verifier package template; verification has not occurred. |
| Verifier results template | `data/phase-zero/verification_results.template.csv` | Independent-verification package manager | Update only when verifier schema changes; never prefill with fake results. | Verification workflow schemas and instructions. | `npm run verify` and `npm test -- phase-zero-verifier-package` from `web/` | Header/template only. |
| Manual matching study templates | `data/phase-zero/manual_matching_subjects.template.csv`, `data/phase-zero/manual_matching_reviews.template.csv`, `data/phase-zero/manual_matching_results.template.csv` | Matching-research lead | Update only when protocol/schema changes; do not populate fake participant data. | Manual matching feasibility protocol. | `npm run phase-zero:manual-matching -- validate` | Header/template only; no study has run. |

## Canonical Human-Readable Phase 0 Docs

| Purpose | Canonical path | Data owner | Update process | Source dependencies | Validation command | Current status |
| --- | --- | --- | --- | --- | --- | --- |
| Video source inventory summary | `docs/phase-zero/VIDEO_SOURCE_INVENTORY.md` | Evidence custodian | Update with `data/phase-zero/video_inventory.*`. | Video inventory. | `npm test -- phase-zero-artifact-map` from `web/` | Canonical summary. |
| Video timeline summary | `docs/phase-zero/VIDEO_TIMELINE_MAP.md` | Video timeline analyst | Update with `data/phase-zero/video_timeline.*`. | Video timeline. | `npm test -- phase-zero-artifact-map` from `web/` | Canonical summary. |
| Environment and creation-path findings | `docs/phase-zero/ENVIRONMENT_AND_CREATION_PATH_FINDINGS.md` | Environment auditor | Update with environment and creation-path research artifacts. | Environment manifest, creation paths, issues. | `npm test -- phase-zero-artifact-map` from `web/` | Canonical summary. |
| Appearance menu map | `docs/phase-zero/APPEARANCE_MENU_MAP.md` | Appearance-menu catalog manager | Update with `menu_map.research.*`. | Menu map. | `npm test -- phase-zero-artifact-map` from `web/` | Canonical summary. |
| Menu capture gaps | `docs/phase-zero/MENU_CAPTURE_GAPS.md` | Appearance-menu catalog manager | Update when menu recapture needs change. | Menu map, issues, capture requests. | `npm test -- phase-zero-artifact-map` from `web/` | Canonical gap summary. |
| Head-template research summary | `docs/phase-zero/HEAD_TEMPLATE_RESEARCH_CATALOG.md` | Head-template catalog lead | Update with `heads.research.*`. | Head research catalog, evidence manifest. | `npm test -- phase-zero-artifact-map` from `web/` | Canonical summary. |
| Head-template continuity report | `docs/phase-zero/HEAD_TEMPLATE_CONTINUITY_REPORT.md` | Head-template catalog lead | Update with `heads.research.*` whenever observed head-template sequences, overlaps, gaps, selector boundaries, or automatic-attribute-change findings change. | Head research catalog, video timeline, evidence manifest. | `npm test -- cf27-head-template-research-catalog phase-zero-artifact-map` from `web/` | Canonical continuity and boundary report; research-only. |
| Head capture quality report | `docs/phase-zero/HEAD_CAPTURE_QUALITY_REPORT.md` | Head-template QA owner | Update after head QA changes. | Head recapture list, QA reports. | `npm test -- phase-zero-artifact-map` from `web/` | Canonical summary. |
| Category research summaries | `docs/phase-zero/appearance-controls/*.md` | Appearance-control catalog researcher | Update with additional-attribute research artifacts. | Additional-attribute catalog, recapture requirements. | `npm test -- phase-zero-artifact-map` from `web/` | Canonical category summaries. |
| Consolidated appearance-control research export | `docs/phase-zero/appearance-controls/APPEARANCE_CONTROLS_RESEARCH_EXPORT.md` | Appearance-control catalog researcher | Update with `additional_attributes.research.*` when directly observed appearance-control categories, values, completeness, or menu-only categories change. | Additional-attribute catalog, menu map, video timeline, evidence manifest. | `npm test -- cf27-appearance-controls-research-catalog phase-zero-artifact-map` from `web/` | Canonical consolidated appearance-control export; research-only. |
| Catalog data-integrity status | `docs/phase-zero/CATALOG_DATA_INTEGRITY_STATUS.md` | Data-integrity auditor | Update after classification or production gate changes. | Classification report, validators, production catalog. | `npm run verify` | Canonical integrity summary. |
| Wyatt capture plan | `docs/phase-zero/WYATT_NEXT_CAPTURE_PLAN.md` | Human-capture director | Update from `capture_requests.*` and current status. | Issues, recapture lists, current status. | `npm test -- phase-zero-capture-requests` from `web/` | Canonical human recording plan. |
| Second-verifier instructions | `docs/phase-zero/SECOND_VERIFIER_INSTRUCTIONS.md` | Independent-verification package manager | Update when verifier package or allowed statuses change. | Verification assignment, verifier template, source registry. | `npm test -- phase-zero-verifier-package` from `web/` | Canonical verifier instructions. |
| Printable second-verifier checklist | `docs/phase-zero/SECOND_VERIFIER_PRINTABLE_CHECKLIST.md` | Independent-verification package manager | Update with verifier instructions. | Verification assignment. | `npm test -- phase-zero-verifier-package` from `web/` | Canonical printable checklist. |
| Manual matching feasibility protocol | `docs/phase-zero/MANUAL_MATCHING_FEASIBILITY_PROTOCOL.md` | Matching-research lead | Update before any study protocol change; never populate fake results. | Manual matching templates, privacy requirements. | `npm run phase-zero:manual-matching -- validate` | Canonical future-study protocol; study not started. |

## Preserved Historical Or Derived Artifacts

| Artifact family | Status | Canonical replacement | Notes |
| --- | --- | --- | --- |
| `docs/status/PRE_DATA_READINESS_REVIEW.md` | Historical baseline, superseded for current Phase 0 status. | `docs/status/CURRENT_PROJECT_STATE_RECONSTRUCTION.md` | Preserves pre-evidence software readiness context. |
| `docs/status/CURRENT_VIDEO_EVIDENCE_OPERATING_LOCK.md` | Historical operating lock, superseded for current artifact map/status. | `docs/phase-zero/PHASE_ZERO_ARTIFACT_MAP.md` and `docs/status/CURRENT_PROJECT_STATE_RECONSTRUCTION.md` | Still useful for evidence-handling rules. |
| `docs/status/OVERNIGHT_VIDEO_EVIDENCE_CLOSEOUT.md` | Historical overnight closeout, superseded for latest counts. | `docs/status/CURRENT_PROJECT_STATE_RECONSTRUCTION.md` | Retains Prompt 80-113 closeout details. |
| `docs/catalog/CURRENT_*.md` and other `docs/catalog/*_CANDIDATES.md` reports | Historical or category-specific report mirrors. | `docs/phase-zero/*` and `data/phase-zero/*` | Preserve for provenance; do not use as current count authority when contradicted by `data/phase-zero`. |
| `data/research/cf27/exports/partial-research-catalog-current/*` | Historical export/provenance package. | `data/phase-zero/*` for current normalized status; production export remains `data/catalog/production`. | The export still validates as research-only but has older overnight counts. |
| `data/research/cf27/reports/*` | Historical analysis and QA reports. | `data/phase-zero/*` plus `docs/phase-zero/*` for current canonical state. | Preserve all reports; use them as source dependencies, not current status authority. |
| `data/research/cf27/generated/*` | Generated derivative evidence or local processing outputs. | `data/phase-zero/evidence_manifest.*` for indexed committed references. | Masters are not committed; generated evidence must remain provenance-linked. |

## Reconciliation Findings

- Duplicate document families exist intentionally: `docs/catalog/*` preserves earlier category/report outputs; `docs/phase-zero/*` is the current canonical human-readable Phase 0 layer.
- Contradictory counts exist between the overnight `data/research/cf27/exports/partial-research-catalog-current/*` package and the current normalized `data/phase-zero/*` artifacts. Current planning should use `data/phase-zero/*`.
- `data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json` still reports 86 research records and 335 evidence entries from the older export snapshot.
- `data/phase-zero/heads.research.json` currently reports 26 unique directly observed head candidates, observed native-number range 1-31, skipped numbers 15/19/20/25/26, and 0 production-eligible records.
- `data/phase-zero/additional_attributes.research.json` currently reports 54 unique values across 6 categories and 0 production-eligible records.
- `data/phase-zero/evidence_manifest.json` currently reports 96 entries: 9 source masters and 87 derivatives.
- Top-level research records in `data/phase-zero/heads.research.json` and `data/phase-zero/additional_attributes.research.json` have evidence linkage and timestamp references.
- Current research record IDs retain `XBOXUNKNOWN` because exact Xbox environment metadata is unresolved. This is correct until `GFM-CAP-001` closes the environment gap.
- The broad classification report contains nested `UNKNOWN_ORIGIN` evidence/reference subrecords. These are not production-loadable catalog candidates; production access remains false.

## Required Update Order

1. Update source video inventory.
2. Update video timeline.
3. Update evidence manifest.
4. Update environment and creation-path records.
5. Update menu map.
6. Update research catalog records.
7. Update capture log.
8. Update issues and recapture requests.
9. Update classification and validation reports.
10. Update human-readable summaries and current status.
11. Run `npm run verify`.

## Production Rule

Nothing in this map enables production recommendations. Production recommendations remain blocked until an approved, independently verified production catalog release exists under `data/catalog/production/`.
