# Media Inspection Manifests

`npm run media:inspect -- inspect <video>` writes reusable technical inspection manifests here by default.

Each inspection package records:

- Source-video checksum and file size
- ffprobe metadata JSON
- Duration, resolution, and frame-rate report
- Scene-change index
- Candidate menu-transition timestamps
- Candidate stable-frame timestamps
- Processing errors or warnings
- Provenance for generated contact sheets

These manifests are research metadata only. They do not create production catalog records and do not verify game options.
