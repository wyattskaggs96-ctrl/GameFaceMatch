# Performance and Large-Evidence Handling

GameFace Match catalog work can involve large screenshot folders, source videos, evidence manifests, CSV/JSON exports, validation reports, and patch comparisons. These workflows remain local-first and must not upload raw evidence.

## Implemented

- Evidence manifests: `scripts/evidence-manifest.mjs` exposes an async generator path that recursively walks approved evidence folders and computes SHA-256 values through file streams.
- Source videos: `scripts/source-video-intake.mjs` inspects local videos with streaming checksums and preserves metadata-only records. FFmpeg frame extraction remains optional and local.
- Evidence intake UI: `web/features/phase-zero/EvidenceIntakeManager.tsx` paginates selected files, budgets immediate image previews, lazy-loads later preview candidates, and shows metadata-only rows for unsupported or oversized evidence.
- Catalog-manager review UI: `web/features/phase-zero/CatalogManagerReviewConsole.tsx` paginates imported record and evidence tables and displays a chunking recommendation for large packages.
- Shared helper: `web/lib/performance/large-evidence-handling.ts` centralizes page sizes, preview planning, and deterministic chunk planning.

## Operating Limits

- Raw file bytes must not be serialized into React state, localStorage, sessionStorage, logs, or reports.
- Source videos and local evidence masters remain local evidence. They are not public web assets by default.
- UI previews are intentionally limited. Unsupported or oversized files should show metadata instead of decoded media.
- Validation and export code should process large sets incrementally where practical. Future long-running browser work should move to a Web Worker before handling real production-scale packages.

## Known Gaps

- CSV and JSON export scripts still construct final output files in memory before writing them. This is acceptable for the current fixture-sized data but should become streaming writers before very large audit packages.
- Patch-diff commands compare in-memory manifests. Very large release histories may need indexed manifests or chunked comparison.
- Browser image preview decoding still depends on browser memory behavior; real-device QA is required with large camera-roll folders.
