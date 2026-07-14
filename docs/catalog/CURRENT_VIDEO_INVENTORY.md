# Current Video Inventory

**Historical report:** Preserved for provenance. Use `docs/phase-zero/PHASE_ZERO_ARTIFACT_MAP.md` to identify the current canonical video inventory paths.

Last updated: 2026-07-13

This report inventories the current GameFace Match College Football 27 video evidence found during Prompt 81. It is **research-candidate evidence only**.

It is not production catalog data, it is not independently second-verified, and it does not enable user-facing recommendations.

## Scope

- Source manifest reviewed: `OWNER_DOWNLOADS/RELABELED_VIDEO_MANIFEST.csv`
- Video files discovered: 11
- Manifest-mapped unique videos: 9
- Exact duplicate files found by SHA-256: 2
- Verified production records created: 0
- Production recommendations enabled: no

Absolute discovery paths are stored in `data/research/cf27/video_inventory.json` and `data/research/cf27/video_inventory.csv` for internal local processing only. Portable evidence references use the `OWNER_DOWNLOADS/` prefix until the owner moves the masters into an approved evidence root.

## Inventory Summary

| ID | Working filename | Discovered filename | SHA-256 | Duration | Content | Decision |
| --- | --- | --- | --- | ---: | --- | --- |
| video-001 | `01_Environment_and_Creation_Path.mp4` | `01_Environment_and_Creation_Path.MP4` | `6f42d3ef2572810fc09ac5138970dee5f325c539925f084a130d3fdcf7c2a0b2` | 73.57s | Environment and Road to Glory creation path | Accepted research candidate |
| video-002 | `02_Head_Templates_Faces_01-12.mov` | `02_Appearance_Menu_Part_1.mp4.MOV` | `b016660e24dd24e63b9f1b2412ef08e3e21a905ccc71e8b59adb406d10228a53` | 108.80s | Head Template captures; manifest states Face 1 through Face 12 | Partially accepted research candidate |
| video-003 | `03_Head_Templates_Faces_12-29.mov` | `02_Appearance_Menu_Part_2.mp4.MOV` | `c348b96b1414927fca5ab12f8a65cc7668a6fdb22a2622c99e11a984d819a302` | 133.02s | Head Template captures; manifest states Face 12 through Face 29 | Partially accepted research candidate |
| video-004 | `04_Skin_Tone.mp4` | `03_Appearance_Skin_Tone.MP4` | `a65e57da173c1221c9e6472d3cc17ff645871d22ffd2b37fca4f57f83bd75146` | 53.82s | Skin Tone menu and options | Accepted research candidate |
| video-005 | `05_Skin_Details.mp4` | `04_Appearance_Skin_Details.MP4` | `a86993245c6762c40ba1e66d4cf3961ba69462eeb6636b20ca0be63e3246b32b` | 31.72s | Skin Details menu and options | Accepted research candidate |
| video-006 | `06_Eye_Shape.mp4` | `45926e39-7553-43b1-803a-6ddc787c63dd.MP4` | `84bdb04ca232a662a8add3ceef92f021ad6c96d241e536b12c0af968f3d92ca2` | 24.93s | Eye Shape menu and options | Partially accepted research candidate |
| video-007 | `07_Eye_Color.mp4` | `a1e6193d-625e-4880-8977-3a8c7670c336.MP4` | `c07fdab8d65b19859ae5985dc4fb06bb9919aecf597996ab74463bc6020acfd3` | 29.33s | Eye Color menu and options | Accepted research candidate |
| video-008 | `08_Nose.mp4` | `5bcd4869-531b-41bf-b643-5331f34cb3f3.MP4` | `301b6c7ba55233503e54296e55366cdd0468f0c23b5117be6ca5ff0363d5e5b7` | 32.45s | Nose menu and options | Accepted research candidate |
| video-009 | `09_Ear_Shape.mp4` | `55b7d607-eefa-41a4-8635-1eedb5296ab0.MP4` | `e615e0919ebc50da7cdb1ec27ea302e28ac632b01728a88ca28ab0bb1f5902a1` | 30.21s | Ear Shape menu and options | Partially accepted research candidate |
| video-010 | `duplicate-reference-of-04_Skin_Tone.mp4` | `7cafeb6e-0488-42e6-8d6d-5836f8e30daf.MP4` | `a65e57da173c1221c9e6472d3cc17ff645871d22ffd2b37fca4f57f83bd75146` | 53.82s | Exact duplicate of Skin Tone recording | Rejected duplicate reference only |
| video-011 | `duplicate-reference-of-05_Skin_Details.mp4` | `4df34d2b-7dea-4afe-8dcc-05583430012f.MP4` | `a86993245c6762c40ba1e66d4cf3961ba69462eeb6636b20ca0be63e3246b32b` | 31.72s | Exact duplicate of Skin Details recording | Rejected duplicate reference only |

## Duplicate Audit

Exact duplicates were identified by SHA-256 hash, not by filename:

- `video-010` is an exact duplicate of `video-004` (`03_Appearance_Skin_Tone.MP4`).
- `video-011` is an exact duplicate of `video-005` (`04_Appearance_Skin_Details.MP4`).

No duplicate was deleted. The duplicate files are preserved as provenance-only references and must not be counted as independent evidence.

## Head Template Overlap

The intentional Face 12 overlap between the two Head Template recordings is confirmed by direct frame inspection:

- `video-002` shows Head Template / Face 12 around the 96-second mark.
- `video-003` begins on Head Template / Face 12.

This is a continuity overlap, not an exact duplicate.

The manifest label for `video-002` says Faces 1-12, but sampled later frames show the recording continues past Face 12 to at least Face 15. Because of that, `video-002` and `video-003` are marked partially accepted until a full frame-level segmentation pass defines exact option boundaries.

## Acceptance Decisions

Accepted research candidates:

- `video-001`
- `video-004`
- `video-005`
- `video-007`
- `video-008`

Partially accepted research candidates:

- `video-002`
- `video-003`
- `video-006`
- `video-009`

Rejected duplicate references only:

- `video-010`
- `video-011`

## Important Limits

- These recordings are primary-research candidates only.
- No record in this inventory has second-person verification.
- No catalog option, count, range, menu path, or label should be promoted from this inventory without direct frame-level evidence and the required review workflow.
- No production recommendations may use this data until an approved production catalog release exists.
