# Tomorrow Additional Videos Import Directory

Use this directory to document the next owner-supplied video batch.

Preferred workflow:

1. Place original videos in owner-controlled local storage, not Git.
2. Add or update an import manifest here with filename, size, checksum, source-root token, and notes.
3. Run the non-destructive classifier:
   `npm run cf27:new-video-classify -- scan data/research/cf27/imports/tomorrow-additional-videos --force`
4. Review `classification/new_video_classification_report.json`, contact sheets, sampled-frame timestamps, duplicate signals, continuation signals, and suggested working filenames.
5. Mark only visually confirmed records as `operatorAccepted` in a reviewed copy of the report.
6. Append accepted rows to the canonical source-to-working-name manifest:
   `npm run cf27:new-video-classify -- accept data/research/cf27/imports/tomorrow-additional-videos/classification/reviewed_new_video_classification_report.json`
7. Run the source-video intake tooling against accepted local master paths.
8. Move generated reports into `data/research/cf27/reports/`.
9. Keep all candidate observations in research status until reviewed.

Raw video files in this tree are ignored by Git. Do not force-add them.

The classifier never renames, trims, recompresses, or overwrites a master video. Extensionless valid videos are scanned, but suggested working names remain proposals until an operator accepts them.
