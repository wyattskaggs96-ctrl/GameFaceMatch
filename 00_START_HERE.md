# Start Here

This repository is the working home for **GameFace Match**, beginning with a responsive web MVP for College Football 27 Road to Glory.

## First actions

1. Keep `docs/GAMEFACE_MATCH_SOURCE_OF_TRUTH.md` unchanged as the binding product source.
2. Open this folder as the Codex project repository.
3. Ask Codex to inspect the repository before generating code.
4. Build the active customer-facing MVP inside `web/`.
5. Preserve the native iPhone project inside `ios/` as a future premium TrueDepth capture client.
6. Keep the production game catalog empty until every option has been verified in the shipping game.
7. Keep all test-only records under `data/fixtures/test-only/`.

## Recommended first build order

1. Repository and web application foundation
2. Catalog schema and validator shared across clients
3. Privacy-safe browser session storage and deletion
4. Browser capability detection and manual upload fallback
5. Guided RGB multi-angle capture prototype
6. Face profile measurements
7. Rule-based top-three matching
8. Screenshot refinement

The native iPhone app remains valuable for future premium capture. The web MVP must clearly communicate that browser RGB capture is less precise than native TrueDepth capture.
