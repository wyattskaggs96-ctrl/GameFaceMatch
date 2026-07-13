# Research Evidence Staging

Last updated: 2026-07-13

This document describes the safe repository-side staging area for current College Football 27 Xbox video evidence.

The staging area is under `data/research/cf27/` and is intentionally separate from:

- Production catalog data: `data/catalog/production/`
- Test fixtures: `data/fixtures/test-only/`
- Local audit templates and private local evidence: `data/audit/college-football-27/`

## Required Separation

| Evidence class | Repository location | Production eligible? |
| --- | --- | --- |
| Source-video references | `data/research/cf27/source-video-references/` | No |
| Generated contact sheets | `data/research/cf27/generated/contact-sheets/` | No |
| Extracted full-resolution frames | `data/research/cf27/generated/full-resolution-frames/` | No |
| Cropped measurement derivatives | `data/research/cf27/generated/cropped-measurement-derivatives/` | No |
| Technical media inspection artifacts | `data/research/cf27/generated/media-inspections/` plus manifests in `data/research/cf27/manifests/media-inspection/` | No |
| Research-candidate catalog data | `data/research/cf27/catalog-candidates/research/` | No |
| Verification-candidate data | `data/research/cf27/catalog-candidates/verification/` | Not until publish gates pass |
| Production data | `data/catalog/production/` | Only through existing production gates |
| Test fixtures | `data/fixtures/test-only/` | Never |

## Master Video Policy

Original Xbox videos are master evidence. Preserve them unchanged.

Do not:

- Rename, trim, overwrite, recompress, or edit masters.
- Copy masters into Git unless the owner explicitly approves a future evidence-storage decision.
- Treat a symlink or copied master as a production asset.

Do:

- Reference masters by source-root token, filename, checksum, file size, and portable relative path.
- Keep local absolute paths internal-only and paired with portable references.
- Record exact timestamps for every derivative or observation.

## Generated Derivatives

Contact sheets, extracted frames, and crops are derivatives.

They must retain provenance back to:

- Source video inventory ID
- Original filename
- Source SHA-256
- Timestamp or timestamp range
- Extraction or transformation tool
- Operator/date when known

Generated media files are ignored by Git. Commit manifests and reports instead.

## Technical Media Inspection

Use:

```sh
npm run media:inspect -- inspect /path/to/local/source-video.mov --evidence-root-token OWNER_DOWNLOADS
```

The command preserves the master and generates:

- `ffprobe.json`
- `media-report.json`
- `scene-change-index.json`
- `stable-frame-index.json`
- `processing-error-report.json`
- A low-resolution contact sheet in ignored generated storage

Outputs are checksum-addressed and resumable. If the same file is processed again unchanged, the command skips existing complete outputs. If the checksum changes, it writes a new inspection package.

## Additional Video Import

Use `data/research/cf27/imports/tomorrow-additional-videos/` for tomorrow's video-batch notes and import manifests.

The raw videos themselves should remain in owner-controlled local storage. If videos are accidentally placed in the import directory, `.gitignore` prevents ordinary staging and `node scripts/repository-status.mjs --strict` warns if they are force-added.

## Promotion Rules

Research candidates can move toward verification only after direct frame inspection records visible evidence. Verification candidates still cannot become production data until the existing catalog-manager, second-verifier, import-validation, discrepancy, and production-publish gates pass.

No environment variable, fixture, contact sheet, or research note can enable production recommendations.
