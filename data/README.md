# GameFace Match Data Classes

Every persisted catalog-like record must declare one `sourceType`:

- `production` — verified catalog data approved for production loading.
- `researchDraft` — audit work in progress, including manually entered research records.
- `testFixture` — synthetic automated-test data under `data/fixtures/test-only/`.
- `demoData` — non-production demo records under `data/demo/`.
- `localDeveloperSample` — local-only samples under `data/local-samples/`.

Production import and runtime loading must reject every non-production source type. Empty production catalogs are valid, but recommendations remain unavailable until verified production records exist.
