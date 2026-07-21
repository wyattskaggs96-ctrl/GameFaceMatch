# Evidence Intake Guide

This is the supported workflow for adding new College Football 27 Xbox recordings, screenshots, and sidecar metadata to GameFace Match.

## Where Wyatt Places Files

Place new files here:

```text
data/phase-zero/intake/pending/
```

Supported intake file types:

- MP4 video
- MOV video
- PNG screenshot
- JPG or JPEG screenshot
- JSON, CSV, TXT, or Markdown sidecar metadata

Do not edit source files before placing them in the pending folder. Do not trim videos, crop screenshots, rename masters destructively, recompress footage, or remove overlays. If a better filename is useful, make a copy or ask Codex to create a non-destructive derivative plan.

## Recommended File Names

When a recording is intended to satisfy a capture request, include the capture ID in the filename:

```text
GFM-CAP-001_Appearance_Menu_Boundary_2026-07-20.mp4
GFM-CAP-004_Head_Template_Standardized_Recapture_2026-07-20.mov
GFM-CAP-007_Skin_Details_Still_2026-07-20.png
```

The `GFM-CAP-###` token lets the intake tool map the file to the correct open capture assignment. If the token is missing, the file is still inventoried, but it is marked as unassigned and requires explicit review.

## What To Record

Follow the current recapture instructions in:

```text
docs/phase-zero/WYATT_RECAPTURE_INSTRUCTIONS.md
```

Keep menu labels, option numbers, and selector positions visible whenever possible. Pause long enough for Codex and a human reviewer to read the selected option. Show first and final values, wrap behavior, and required angles when the capture request asks for them.

## What Codex Does During Intake

Run:

```sh
npm run phase-zero:intake -- --path data/phase-zero/intake/pending
```

The command:

- recursively scans supported files
- calculates SHA-256 hashes
- detects exact duplicates
- inspects video and image metadata when possible
- preserves original filenames
- maps filenames to `GFM-CAP-###` assignments when possible
- marks ambiguous or unassigned files for review
- writes a machine-readable intake manifest
- writes a review queue
- reports capture assignments that still lack coverage

The command does not:

- rename master files
- move master files
- delete duplicates
- create production catalog records
- mark evidence as verified
- promote research candidates into recommendations

## Duplicate Handling

Exact duplicates are identified by SHA-256 hash, not filename. Duplicate files are preserved until a human evidence custodian decides what to do with them. Duplicate evidence can still be useful for provenance, upload recovery, or continuity checks, but it does not become production data automatically.

## Production Safety

Every imported record starts as:

```text
UNREVIEWED_RESEARCH_EVIDENCE_NOT_PRODUCTION
```

No intake record can become production catalog data without:

1. primary evidence QA
2. complete source traceability
3. required environment metadata
4. second-person verification
5. catalog-manager approval
6. production release gate validation

An intake record is never enough to enable GameFace Match recommendations by itself.
