# Phase Zero Primary Review Status

**Generated:** 2026-07-14T18:45:00-04:00  
**Status:** PRIMARY REVIEW ONLY - NOT SECOND VERIFIED  
**Production status:** NOT PRODUCTION DATA  
**Production recommendations enabled:** false

## Summary

This checkpoint moves the current 85 evidence-backed research candidates into an explicit primary-review state. Primary review means a catalog reviewer has classified the current research observation for handoff planning. It does not mean independent verification, catalog-manager approval, or production publication.

| Funnel stage | Count |
| --- | ---: |
| Total research candidates | 92 |
| Primary approved | 0 |
| Primary approved with notes | 84 |
| Duplicate review required | 5 |
| Recapture required as primary status | 0 |
| Missing evidence | 0 |
| Label unresolved | 0 |
| Order unresolved | 3 |
| Category incomplete as primary status | 0 |
| Environment unresolved as primary status | 0 |
| Not reviewed | 0 |
| Second verified | 0 |
| Production approved | 0 |

## Artifact Reconciliation

- Canonical Phase 0 machine-readable artifacts are under `data/phase-zero/`.
- Older `data/research/cf27/exports/partial-research-catalog-current/` and `docs/catalog/` files are preserved for provenance but are not the current count authority.
- Current normalized candidate count is 85: 26 heads, 54 additional appearance controls, and 5 body/context records.
- Current evidence manifest has 125 entries and current video inventory has 14 rows.
- Conflicting older count noted: older partial exports reported 86 research records; this primary review uses the canonical 85 candidates from `data/phase-zero`.
- Broken evidence paths found by this primary-review layer: 0.
- Fixture or placeholder asset references in candidate evidence: 0.

## Candidate Review Rule

- `PRIMARY_APPROVED_WITH_NOTES` means the candidate has visible research evidence and can be placed in a verifier evidence-review queue after independent counting, but still has publication blockers.
- `DUPLICATE_REVIEW_REQUIRED` means duplicate or continuity observations are preserved and require human review before verification.
- No candidate is `PRIMARY_APPROVED` without notes because every current candidate is blocked by unresolved environment metadata, incomplete category boundaries, missing second verification, or production-standard evidence gaps.

## Category Completeness

| Category | Observed | Unique | Approved notes | Duplicate review | Recapture | Missing evidence | Order unresolved | Label unresolved | Verifier handoff | Production after verification alone |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Additional sliders/toggles/colors/presets | 0 | 0 | 0 |  | 1 | 0 | 1 | 0 | false | false |
| Appearance menu hierarchy | 93 | 93 | 0 |  | 13 | 0 | 13 | 0 | true | false |
| Body-related appearance controls | 5 | 5 | 5 | 0 | 5 | 0 | 0 | 0 | true | false |
| Chin | 1 | 1 | 1 | 0 | 1 | 0 | 1 | 0 | true | false |
| Creation paths | 1 | 1 | 1 |  | 1 | 0 | 0 | 0 | true | false |
| Ear Shape | 4 | 4 | 3 | 1 | 4 | 0 | 4 | 0 | true | false |
| Eye Color | 7 | 7 | 7 | 0 | 7 | 0 | 7 | 0 | true | false |
| Eye Shape | 5 | 5 | 5 | 0 | 5 | 0 | 5 | 0 | true | false |
| Eyebrows | 0 | 0 | 0 |  | 1 | 0 | 1 | 0 | false | false |
| Facial hair | 1 | 1 | 0 | 0 | 1 | 0 | 1 | 0 | false | false |
| Facial-hair colors | 1 | 1 | 0 | 0 | 1 | 0 | 1 | 0 | false | false |
| Hair colors | 1 | 1 | 0 | 0 | 1 | 0 | 1 | 0 | false | false |
| Hairstyles | 1 | 1 | 1 | 0 | 1 | 0 | 1 | 0 | true | false |
| Heads | 26 | 26 | 24 | 2 | 26 | 0 | 26 | 0 | true | false |
| Jaw Shape | 1 | 1 | 1 | 0 | 1 | 0 | 1 | 0 | true | false |
| Mouth Shape | 1 | 1 | 1 | 0 | 1 | 0 | 1 | 0 | true | false |
| Nose | 7 | 7 | 6 | 1 | 7 | 0 | 7 | 0 | true | false |
| Skin Details | 10 | 10 | 10 | 0 | 10 | 0 | 10 | 0 | true | false |
| Skin Tone | 21 | 21 | 20 | 1 | 21 | 0 | 21 | 0 | true | false |

## Video Traceability

- Source video inventory rows: 14.
- Fully traced unique source videos: 12.
- Documented duplicate source files: 2.
- Partially traced videos: 0.
- Candidates without valid source timestamp: 0.

| Video ID | Canonical filename | Ingest | Extraction | Categories | Candidates | Traceability | Full traversal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CF27_XBOX_SOURCE_2026_08_02_001 | EA SPORTS™ College Football 27-2026_08_02-21_13_02.mp4 | opens | EVIDENCE_INDEXED | Chin; Jaw Shape; Mouth Shape | 3 | TRACEABLE | false |
| CF27_XBOX_SOURCE_2026_08_02_002 | EA SPORTS™ College Football 27-2026_08_02-21_18_14.mp4 | opens | EVIDENCE_INDEXED | Facial-hair colors; Facial hair; Hair colors; Hairstyles | 4 | TRACEABLE | false |
| CF27_XBOX_SOURCE_2026_08_02_003 | EA SPORTS™ College Football 27-2026_08_02-21_21_15.mp4 | opens | EVIDENCE_INDEXED |  | 0 | TRACEABLE | false |
| phase0-video-001 | 01_Environment_and_Creation_Path.mp4 | opens | EVIDENCE_INDEXED | Body-related appearance controls | 5 | TRACEABLE | false |
| phase0-video-002 | 02_Head_Templates_Faces_01-12.mov | opens | EVIDENCE_INDEXED | Heads | 11 | TRACEABLE | false |
| phase0-video-003 | 03_Head_Templates_Faces_12-29.mov | opens | EVIDENCE_INDEXED | Heads | 15 | TRACEABLE | false |
| phase0-video-004 | 04_Skin_Tone.mp4 | opens | EVIDENCE_INDEXED | Skin Tone | 21 | TRACEABLE | false |
| phase0-video-005 | 05_Skin_Details.mp4 | opens | EVIDENCE_INDEXED | Skin Details | 10 | TRACEABLE | false |
| phase0-video-006 | 06_Eye_Shape.mp4 | opens | EVIDENCE_INDEXED | Eye Shape | 5 | TRACEABLE | false |
| phase0-video-007 | 07_Eye_Color.mp4 | opens | EVIDENCE_INDEXED | Eye Color | 7 | TRACEABLE | false |
| phase0-video-008 | 08_Nose.mp4 | opens | EVIDENCE_INDEXED | Nose | 7 | TRACEABLE | false |
| phase0-video-009 | 09_Ear_Shape.mp4 | opens | EVIDENCE_INDEXED | Ear Shape | 4 | TRACEABLE | false |
| phase0-video-010 | duplicate-reference-of-05_Skin_Details.mp4 | opens | DUPLICATE_REFERENCE_ONLY |  | 0 | TRACEABLE | false |
| phase0-video-011 | duplicate-reference-of-04_Skin_Tone.mp4 | opens | DUPLICATE_REFERENCE_ONLY |  | 0 | TRACEABLE | false |

## Production Gate Conclusion

- Production records: 0.
- Primary approval alone can publish: false.
- Second verification required: true.
- Missing environment metadata blocks publication: true.
- Empty production data must continue to show the honest unavailable state: true.
- Earliest possible catalog label remains provisional: `CF27_XBOX_RTG_Catalog_v0.1.0`, only after recapture gaps, environment metadata, second verification, catalog-manager approval, and production gate checks pass.
