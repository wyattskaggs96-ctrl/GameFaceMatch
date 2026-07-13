# Catalog Manager

The current catalog manager is a development-only local review console surfaced inside the web Phase 0 tools.

It can import candidate package JSON, inspect validation results, review records and evidence, check native order, review duplicate observations, decide `VERIFIED_WITH_NOTES` records, request repairs, reject bad rows, and produce a local signed review report.

It does not publish production data, upload evidence, connect a backend, or override the catalog import-validation engine. A release candidate can be approved only when mandatory validation gates pass.

Use `docs/CATALOG_MANAGER_RUNBOOK.md` for the catalog-manager acceptance checklist before approving, rejecting, signing, or rolling back a candidate package.
