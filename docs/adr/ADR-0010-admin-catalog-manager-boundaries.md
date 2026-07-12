# ADR-0010: Admin And Catalog-Manager Boundaries

Date: 2026-07-12

Status: Accepted

## Context

The project includes audit tooling and a placeholder for a future local catalog manager. The application must not become a cloud admin system before deployment and ownership decisions are supplied.

## Decision

Catalog management remains local, development-only, and evidence-driven. The web app may include development-only inspection tools, but production navigation must not expose admin/catalog-manager screens or synthetic records.

The `admin/catalog-manager/` area is reserved for future local tooling and must not imply cloud hosting, authentication, publication rights, or public evidence storage.

## Consequences

- Manual audit commands and templates remain the source of catalog publication workflow.
- No cloud admin, database, authentication, or external storage is introduced by catalog tooling.
- Publication still requires validation, review, and explicit package import.

## Current Gaps

- `admin/catalog-manager/` is currently a placeholder.
- The development-only web catalog inspector is not a complete auditor UI.
