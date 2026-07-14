# Current Video Evidence Operating Lock

**Historical status:** SUPERSEDED FOR CURRENT ARTIFACT STATUS
**Canonical replacement:** `docs/status/CURRENT_PROJECT_STATE_RECONSTRUCTION.md`
**Artifact registry:** `docs/phase-zero/PHASE_ZERO_ARTIFACT_MAP.md`

Date: 2026-07-13
Status: Active operating lock for current College Football 27 Xbox screen-recording evidence

## Scope

This lock records the first safe evidence-ingestion checkpoint after direct Xbox screen recordings from the released consumer version of EA SPORTS College Football 27 became available.

It does not create production catalog records. It does not mark anything `VERIFIED`. It does not enable production recommendations. All video-derived observations are primary-research candidates until a genuine second human verifier completes independent review.

## Governing Rules

- Preserve all original videos unchanged.
- Never overwrite, trim, rename, recompress, or alter a master file.
- Treat every extracted frame, crop, contact sheet, renamed copy, or clip as a derivative.
- Maintain provenance from every derivative to source filename and exact timestamp.
- Use direct frame inspection as the primary evidence method.
- Use OCR only as a secondary aid and manually validate OCR-derived text.
- Never invent missing labels, values, counts, ranges, versions, or menu options.
- Never use College Football 26 data.
- Preserve native menu order.
- Do not silently merge duplicate-looking options.
- Keep fixture, research-candidate, verification-candidate, and production data strictly separated.
- Current video-derived records are not production data and are not independently verified.

## Located Sources

The relabeling manifest was located as `RELABELED_VIDEO_MANIFEST.csv` in the owner Downloads area. The current media files were also located in the owner Downloads area. To avoid committing machine-specific absolute paths, the committed evidence inventory uses the source-root token `OWNER_DOWNLOADS`.

Committed inventory:

- `data/audit/college-football-27/video-evidence-operating-lock.csv`

Local derivative review frames were generated under:

- `data/audit/college-football-27/local-evidence/prompt80-frame-review/`

That directory is ignored by Git. It contains derivative frames only, not master files or production catalog data.

## Tool Availability

- `ffprobe`: not available on `PATH`.
- `ffmpeg`: not available on `PATH`, but a local bundled binary was found at `/Applications/Plaud.app/Contents/Resources/ffmpeg`.
- The bundled `ffmpeg` was used for read-only metadata inspection and derivative frame extraction.

## Source Mapping Results

| Sequence | Working name | Located master filename | Visual mapping status | Evidence note |
| --- | --- | --- | --- | --- |
| 1 | `01_Environment_and_Creation_Path.mp4` | `01_Environment_and_Creation_Path.MP4` | Confirmed | Sampled frame shows `CREATE PLAYER`, `Appearance`, and College Football 27 branding. |
| 2 | `02_Head_Templates_Faces_01-12.mov` | `02_Appearance_Menu_Part_1.mp4.MOV` | Confirmed | Sampled frame shows `HEAD TEMPLATE` and `Face 7`. |
| 3 | `03_Head_Templates_Faces_12-29.mov` | `02_Appearance_Menu_Part_2.mp4.MOV` | Confirmed | Sampled frame shows `HEAD TEMPLATE` and `Face 20`. |
| 4 | `04_Skin_Tone.mp4` | `03_Appearance_Skin_Tone.MP4` | Confirmed | Sampled frame shows `SKIN TONE`. |
| 5 | `05_Skin_Details.mp4` | `04_Appearance_Skin_Details.MP4` | Confirmed | Sampled frame shows `SKIN DETAILS`. |
| 6 | `06_Eye_Shape.mp4` | `45926e39-7553-43b1-803a-6ddc787c63dd.MP4` | Confirmed with navigation lead-in | Early sampled frames show Skin Details; later frame shows `EYE SHAPE`. |
| 7 | `07_Eye_Color.mp4` | `a1e6193d-625e-4880-8977-3a8c7670c336.MP4` | Confirmed | Manifest original lacked extension; matched by duration and visible `EYE COLOR` screen. |
| 8 | `08_Nose.mp4` | `5bcd4869-531b-41bf-b643-5331f34cb3f3.MP4` | Confirmed | Manifest original lacked extension; matched by duration and visible `NOSE` screen. |
| 9 | `09_Ear_Shape.mp4` | `55b7d607-eefa-41a4-8635-1eedb5296ab0.MP4` | Confirmed with navigation lead-in | Early sampled frames show Nose; later frame shows `EAR SHAPE`. |

Two additional files in Downloads are exact checksum duplicates and should be preserved but not treated as unique evidence sources:

- `7cafeb6e-0488-42e6-8d6d-5836f8e30daf.MP4` duplicates `03_Appearance_Skin_Tone.MP4`.
- `4df34d2b-7dea-4afe-8dcc-05583430012f.MP4` duplicates `04_Appearance_Skin_Details.MP4`.

## Current Unique Video Set

The unique set currently covers:

1. Environment and Road to Glory creation path.
2. Head Templates, sampled and manifest-described as Faces 1-12.
3. Head Templates, sampled and manifest-described as Faces 12-29.
4. Skin Tone.
5. Skin Details.
6. Eye Shape.
7. Eye Color.
8. Nose.
9. Ear Shape.

The observed sample labels in review frames are evidence snippets only. They are not complete catalog records, verified options, or production recommendations.

## Missing Or Deferred Evidence

No missing videos were requested from the owner during this run. Based on the current set, menu areas after Ear Shape remain outside the current unique video set unless covered by future evidence. Do not infer Mouth Shape, Jaw Shape, Chin, or any other category from the current videos.

## Next Safe Evidence-Ingestion Tasks

1. Create a non-production audit session package referencing these master basenames and checksums.
2. Generate a source-video intake manifest with relative evidence-root assumptions.
3. Extract deterministic derivative contact sheets for the nine unique videos into ignored local evidence storage.
4. Perform frame-by-frame menu-order logging for Head Template videos without creating production records.
5. Record missing-view and missing-category issues rather than asking for more evidence during unattended work.
6. Prepare first-review candidate records only after every visible label/count/order is directly observed in frames.
7. Keep all candidates in `researchCandidate` or equivalent draft state until second human verification.

## Production Gate State

Production recommendations remain disabled. The production catalog still must reject fixture records, placeholder records, unverified records, missing evidence, missing second verification, and any record derived from these videos before formal review is complete.
