# EA SPORTS FC 26 Player-Creator Video Analysis

Status: Research-only observation set  
Last updated: 2026-08-01  
Source data: `data/research/fc26/player_creator_research.json`

## Scope

This document summarizes the two local EA SPORTS FC 26 player-creator videos supplied under `source-media/Fc26/player-creator/`.

The observations here are not production catalog records. They are structured research notes that keep FC 26 separate from the College Football 27 implementation. FC 26 recommendations remain disabled until a verified production catalog exists.

## Source Videos

| Canonical video | Preserved original filename | Duration | Resolution | Codec | SHA-256 | Notes |
| --- | --- | ---: | --- | --- | --- | --- |
| `fc26-player-creator-part-01.mp4` | `fc26-player-creator-part-01.mp4` | 240.98s | 1920x1080 | H.264 Main, AAC | `6ab6bfca771c2f5595f1a51c8b8fdc87ded9078c72bc6071c4303d8d2fc57fea` | Opens successfully. Covers visible Head tab Skin and Head subtabs. |
| `fc26-player-creator-part-02.mp4` | `fb4fb162-0876-4bd3-8cb3-8d86e63dc32e.MP4` | 235.69s | 1920x1080 | H.264 Main, AAC | `0c758eb69716938f5bca7b4c0e7219d802a8fafa64287d0851ce94312911b531` | Opens successfully. The expected canonical filename was not present, so the original filename is preserved and mapped to the part-02 role in research metadata. |

`ffprobe` was not available on the local PATH or repository wrapper. Metadata was collected with `scripts/media/ffmpeg-wrapper ffmpeg`, which opened both files and reported the stream details above.

## Analysis Method

Videos were processed in chronological order. Representative 5-second and 10-second contact sheets plus sampled full-resolution frames were generated under `data/research/fc26/generated/`, which is ignored by Git except for the directory README and `.gitkeep`.

Every structured observation in `player_creator_research.json` stores a source `videoID` and `timestampSeconds`. Labels are recorded only when visible enough to classify as `verified` or `probable`; unclear information is kept in `unresolvedObservations`.

## Visible Menu Hierarchy

Top-level sections visible in the footage:

- `Info`
- `Head`
- `Kit`
- `Tattoos`
- `Animations`

Visible Head subtabs:

- `Skin`
- `Head`
- `Face`
- `Hair`

## Verified Or Probable Controls

The current structured data includes 28 controls:

- Skin: Skin Tone, Complexion, Skin Surface, Freckles, Scarring, Moles, Rosacea, Face Makeup, Lip Makeup
- Head: Forehead, Jaw, Ears, Cheeks, Chin, Neck
- Face: Eye Colour, Eyes, Eyebrows, Nose, Mouth, Teeth
- Hair: Hair Colour, Hair Style Group, Hair Style, Eyebrow & Facial Hair Colour, two eyebrow shape selectors, Facial Hair

Observed values are partial. The videos show sampled selections and menu movement; they do not prove complete first-to-last ranges, complete counts, slider boundaries, or wrap behavior.

## Notable Timestamp Anchors

- `part-01`, 0s: Head > Skin visible with Skin Tone 3, Complexion 3, Skin Surface 18, Freckles None.
- `part-01`, 120s: Head > Head visible with Forehead, Jaw, Ears, and Cheeks rows.
- `part-01`, 190s: Head > Head visible with Ears, Cheeks, Chin, and Neck rows.
- `part-02`, 60s: Head > Face visible with Eyebrows, Nose, Mouth, and Teeth rows.
- `part-02`, 90s: Head > Hair visible with Hair Colour, Hair Style group, Hair Style, and Eyebrow & Facial Hair Colour rows.
- `part-02`, 180s: Hair rows continue; some eyebrow-shape text is probable, not fully verified.
- `part-02`, 230s: Facial Hair row visible.

## Unclear Or Missing Information

The current evidence does not prove:

- Complete option counts for any FC 26 player-creator control.
- First and final selector boundaries.
- Selector wrap behavior.
- Slider minimums, maximums, or step values.
- Body, height, weight, physique, or position-related controls.
- Dependency behavior between head, skin, hair, eyebrow, and facial-hair controls.
- Production-quality standardized views for matching.

Some eyebrow-shape row labels are probable but not fully resolved. They remain separate from verified observations in the structured data.

## Implementation Status

FC 26 is registered as a separate supported game with its own research namespace. Its adapter intentionally fails closed for matching, build instructions, and screenshot refinement because no verified FC 26 production catalog exists.

College Football 27 remains the active MVP target. The FC 26 data added here does not alter the College Football production catalog, candidate records, or recommendation gates.
