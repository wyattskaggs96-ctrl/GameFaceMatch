# CF27 Media Processing Performance and Resumability

Status: internal research operations note
Last updated: 2026-07-13

This note covers the local College Football 27 evidence-video processing workflow. It does not create production catalog records, does not verify game options, and does not modify source masters.

## Current Inventory Size

The committed `data/research/cf27/video_inventory.json` lists nine unique current Xbox screen recordings:

| Scope | Count | Total source size | Total duration | Largest source |
| --- | ---: | ---: | ---: | ---: |
| Unique current videos | 9 | 1.20 GB | 517.85 seconds / 8.6 minutes | 302.6 MB |

Exact duplicate videos are preserved as provenance but should not be processed as unique evidence unless an operator is intentionally validating duplicate custody.

## Processing Strategy

Use:

```sh
npm run media:inspect -- inspect-batch data/research/cf27/imports/tomorrow-additional-videos --evidence-root-token OWNER_DOWNLOADS
```

or inspect a single source:

```sh
npm run media:inspect -- inspect /path/to/local/source-video.mov --evidence-root-token OWNER_DOWNLOADS
```

The media inspector now:

- Streams SHA-256 calculation instead of loading whole videos into memory.
- Caches source checksums in `data/research/cf27/manifests/media-inspection/checksum-cache.json`.
- Uses checksum-addressed inspection directories so changed masters create new packages.
- Skips completed unchanged inspections.
- Reuses valid partial `ffprobe`, scene-index, and contact-sheet artifacts on resume.
- Processes batch inputs sequentially to avoid memory spikes across multiple large videos.
- Emits progress events for callers that invoke the module API.
- Supports cancellation with `--cancel-file <path>` between expensive stages.
- Preserves original master videos unchanged.

## Expected Time

Observed time depends heavily on storage speed and the local `ffmpeg`/`ffprobe` build. For the current 1.20 GB / 8.6-minute unique set, use these planning ranges:

| Operation | First run estimate | Rerun estimate |
| --- | ---: | ---: |
| Streaming checksums | 5-60 seconds total | near-instant when cache metadata matches |
| `ffprobe` metadata | under 10 seconds total | reused when partial artifacts remain valid |
| Scene-change indexing | 1-5 minutes total | reused if `scene-change-index.json` exists |
| Contact sheets | 1-4 minutes total | reused if contact sheets exist |
| Full batch with all artifacts | 2-8 minutes typical local range | seconds to under 1 minute when unchanged |

These are operational estimates, not a guarantee. Large future catalog categories, source videos longer than the current clips, slow external drives, or higher-resolution captures can increase time substantially.

## Expected Disk Use

For the current unique set:

- Source masters: about 1.20 GB, stored outside committed production data.
- Media inspection manifests: small JSON files, normally under a few MB total.
- Contact sheets: derivative images; plan for 10-100 MB for the current set depending on thumbnail width and JPEG output.
- Full-resolution frame extraction and crop derivatives are separate workflows and can become much larger than contact sheets.

Recommended free space before a full remaining-catalog processing run:

- Minimum: 10 GB free for current videos plus derivative review artifacts.
- Safer: 25-50 GB free before full head, hair, facial-hair, and additional-attribute evidence extraction.
- Large future source-video batches: keep at least 3x the incoming source-video size free so masters, generated derivatives, and rollback copies can coexist.

## Resuming and Recovery

If processing is interrupted:

1. Leave source masters untouched.
2. Rerun the same `inspect` or `inspect-batch` command.
3. The inspector will reuse valid partial artifacts and skip completed unchanged packages.
4. Use `--force` only when intentionally rebuilding all artifacts for a source.

To cancel a long run cleanly:

```sh
touch /tmp/gameface-cancel-media
npm run media:inspect -- inspect-batch data/research/cf27/imports/tomorrow-additional-videos --cancel-file /tmp/gameface-cancel-media
```

The cancellation file is checked between checksum, `ffprobe`, scene detection, and contact-sheet work. It cannot interrupt an already-running `ffmpeg` subprocess mid-command; it prevents the next expensive stage from starting.

## Tuning

Use these only when needed:

```sh
npm run media:inspect -- inspect /path/to/video.mov --contact-sheet-columns 5 --contact-sheet-rows 2 --contact-sheet-width 320 --ffmpeg-threads 1
```

Lower thumbnail width reduces contact-sheet time and disk use. Increasing `--ffmpeg-threads` may speed up processing on some machines but can make the computer less responsive while sitting beside the console.

## Remaining Catalog Planning

The current recordings cover environment/path evidence and partial Head Template, Skin Tone, Skin Details, Eye Shape, Eye Color, Nose, and Ear Shape research candidates. The remaining catalog work will likely add longer videos for head recapture, complete hair, facial hair, physique/body controls, height/weight/body type, additional attribute menus, dependency checks, and patch re-audits.

Before processing a large new batch:

1. Put masters in the ignored intake directory or another local evidence root.
2. Confirm enough disk space exists.
3. Run `inspect-batch` without `--force`.
4. Review generated reports and contact sheets.
5. Keep all records research-candidate until second-person verification and production publish gates pass.
