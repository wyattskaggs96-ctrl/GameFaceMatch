# Start Here

This repository is the working home for **GameFace Match**, beginning with an iPhone companion app for College Football 27 Road to Glory.

## First actions

1. Keep `docs/GAMEFACE_MATCH_SOURCE_OF_TRUTH.md` unchanged as the binding product source.
2. Open this folder as the Codex project repository.
3. Ask Codex to inspect the repository before generating code.
4. Have Codex create the Xcode project inside `ios/`.
5. Keep the production game catalog empty until every option has been verified in the shipping game.
6. Keep all test-only records under `data/fixtures/test-only/`.

## Recommended first build order

1. Repository and Xcode foundation
2. Catalog schema and validator
3. Privacy-safe local storage and deletion
4. Device capability detection
5. Guided capture prototype
6. Face profile measurements
7. Rule-based top-three matching
8. Screenshot refinement
