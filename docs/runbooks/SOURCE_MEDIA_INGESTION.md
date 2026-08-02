# Source Media Ingestion Runbook

GameFace Match source media ingestion recursively inventories local game evidence under `source-media/` without renaming, moving, deleting, recompressing, or uploading originals.

## Command

```sh
npm run media:ingest -- --source source-media --generate-proxies --extract-frames --generate-contact-sheets --classify --prepare-review-queue
```

Use `--dry-run` to inspect behavior without writing outputs and `--check` to validate committed manifests. Generated proxies, frames, and contact sheets are written under `build-artifacts/source-media-ingestion/`, which is ignored by Git.

Useful flags:

- `--run-id GFM_MEDIA_INGEST_YYYYMMDD_HHMMSS` preserves a stable artifact root for a run.
- `--generate-proxies` creates H.264 review MP4s no longer than five minutes per segment.
- `--extract-frames` extracts interval and segment-start frames with original timestamps in filenames.
- `--generate-contact-sheets` creates compact chronological review sheets.
- `--media-id <ID>` limits derivative work to one source.
- `--rebuild-derived` replaces derived artifacts in the ignored artifact root.

## Supported Inputs

The inventory records every file recursively, including unsupported files. The current reader handles MP4, MOV, M4V, MKV/WebM, PNG, JPG/JPEG, HEIC, WEBP, GIF, WAV, M4A, AAC, sidecar metadata, extensionless files by MIME where possible, and unknown files as fail-closed dispositions.

## Safety Rules

- Folder names and filenames are only classification hints.
- FC26 and College Football 27 records remain separated by explicit `game_id`.
- OCR or automated extraction cannot verify labels, counts, or production readiness.
- All automated candidates are non-production and require primary review plus a real second human verifier before any production release.
- Raw source videos and large generated derivatives are not committed.
- Unknown game and unknown category records must remain review-only.
- Generated frames or crops are derivatives and cannot replace full-screen menu evidence for native order.

## Outputs

- `data/source-media-index/source_media_manifest.json`
- `data/source-media-index/media_segments.json`
- `data/source-media-index/ingestion_artifacts.json`
- `data/source-media-index/standardized_views.json`
- `data/catalog-research/research_candidates.json`
- `data/catalog-research/primary_review_queue.json`
- `data/catalog-research/second_verifier_queue.json`
- `data/catalog-research/recapture_queue.json`

## Review Workflow

1. Confirm source hashes and preservation status in the source manifest.
2. Open review proxies and contact sheets from `build-artifacts/source-media-ingestion/`.
3. Review each segment's source timestamp and evidence frame references.
4. Confirm or correct game identity, category, native label, native index, and order in the primary-review queue.
5. Move only approved primary records into the separate second-verifier workflow.
6. Keep all verifier decisions separate from primary review; Codex automation cannot act as the second human.
7. Convert unresolved records into precise recapture requests rather than guessing missing counts or labels.

## Storage Requirements

The committed manifests are small. The ignored review artifacts can be hundreds of megabytes for a short local batch and should be regenerated or pruned locally as needed. Do not commit source masters, proxies, bulk frames, or contact sheets.

## Troubleshooting

If FFmpeg is unavailable, metadata and derivative generation will be limited. Set `GFM_FFMPEG_PATH` to a local binary. Do not install paid or cloud vision services for this workflow without an explicit architecture decision.
