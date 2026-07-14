# Performance and Large-Evidence Handling

GameFace Match catalog work can involve large screenshot folders, source videos, evidence manifests, CSV/JSON exports, validation reports, and patch comparisons. These workflows remain local-first and must not upload raw evidence.

## Implemented

- Web MVP performance monitor: `web/lib/performance/performance-monitor.ts` defines privacy-safe local performance records, budgets, coarse temporary-image memory estimates, dashboard aggregation, live-frame throttling helpers, and cooperative chunk processing helpers.
- Development performance dashboard: `web/features/performance/PerformanceDashboard.tsx` displays local-only budget status for initial load, camera start, live guidance, selected-frame processing, profile generation, matching, catalog loading, screenshot refinement, memory, mobile responsiveness, failure recovery, and interrupted-session recovery.
- Capture responsiveness: live camera guidance skips analysis when a previous frame is still processing or the page is hidden, rather than queueing stale work on the main UI thread.
- App instrumentation: the web shell records local timings for initial load, catalog loading, profile generation, recommendation gating/matching, screenshot-refinement cleanup, deletion recovery, interrupted-session recovery, camera start, frame processing, and temporary image memory pressure.
- Evidence manifests: `scripts/evidence-manifest.mjs` exposes an async generator path that recursively walks approved evidence folders and computes SHA-256 values through file streams.
- Source videos: `scripts/source-video-intake.mjs` inspects local videos with streaming checksums and preserves metadata-only records. FFmpeg frame extraction remains optional and local.
- Evidence intake UI: `web/features/phase-zero/EvidenceIntakeManager.tsx` paginates selected files, budgets immediate image previews, lazy-loads later preview candidates, and shows metadata-only rows for unsupported or oversized evidence.
- Catalog-manager review UI: `web/features/phase-zero/CatalogManagerReviewConsole.tsx` paginates imported record and evidence tables and displays a chunking recommendation for large packages.
- Shared helper: `web/lib/performance/large-evidence-handling.ts` centralizes page sizes, preview planning, and deterministic chunk planning.

## Web MVP Performance Budgets

Budgets are enforced in unit tests through `web/tests/performance-monitor.test.ts` and surfaced in the internal development performance dashboard. They are local engineering budgets, not public product claims.

| Operation | Budget |
| --- | --- |
| Initial load | 2500 ms |
| Camera start | 1500 ms |
| Live guidance frame | 120 ms |
| Captured frame processing | 900 ms and 32 MB estimated temporary image memory |
| StandardFaceProfile generation | 250 ms |
| Matching latency | 250 ms |
| Catalog loading | 500 ms |
| Screenshot refinement scaffold | 700 ms and 24 MB estimated temporary screenshot memory |
| Active temporary image memory | 96 MB estimated encoded plus decoded footprint |
| Mobile responsiveness sample | 50 ms |
| Failure recovery | 250 ms |
| Interrupted-session recovery | 250 ms |

Performance records are local-only and intentionally coarse. They must not include raw images, object URLs, precise facial measurements, landmarks, identity data, or sensitive inferences.

## Operating Limits

- Raw file bytes must not be serialized into React state, localStorage, sessionStorage, logs, or reports.
- Source videos and local evidence masters remain local evidence. They are not public web assets by default.
- UI previews are intentionally limited. Unsupported or oversized files should show metadata instead of decoded media.
- Validation and export code should process large sets incrementally where practical. Future long-running browser work should move to a Web Worker before handling real production-scale packages.

## Known Gaps

- CSV and JSON export scripts still construct final output files in memory before writing them. This is acceptable for the current fixture-sized data but should become streaming writers before very large audit packages.
- Patch-diff commands compare in-memory manifests. Very large release histories may need indexed manifests or chunked comparison.
- Browser image preview decoding still depends on browser memory behavior; real-device QA is required with large camera-roll folders.
- The current monitor measures local browser timings in development sessions. It is not connected to an external observability provider.
- Performance budgets need real iPhone Safari and Android Chrome validation before private beta readiness can be claimed.
- The production catalog is still empty, so matching-latency samples currently measure fail-closed recommendation gating rather than full verified-catalog ranking at production scale.
