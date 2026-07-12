# ADR-0006: Evidence Storage And Relative Paths

Date: 2026-07-12

Status: Accepted

## Context

Catalog publication requires screenshot/video evidence and review records. Evidence may include large or sensitive local files that should not automatically become public web assets.

## Decision

Audit evidence is local-first and referenced with repository-relative or package-relative paths in catalog audit records. Production catalog records may include source image references only after validation confirms the referenced assets are available in the approved catalog package.

Local evidence masters, raw game videos, and private audit captures are not automatically committed or copied into `web/public/`.

## Consequences

- Catalog validators must reject references to unavailable assets.
- Evidence naming and path rules are part of the manual audit workflow.
- Publication packages can be reviewed without exposing evidence in the production web bundle by default.

## Current Gaps

- No evidence-backed production package is present in the repository.
- The repository has audit templates, but no finalized evidence storage package convention beyond the current relative-reference workflow.
