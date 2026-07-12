# ADR-0007: Immutable Catalog Releases

Date: 2026-07-12

Status: Accepted

## Context

Recommendations must be reproducible and tied to the exact catalog data used when a build was generated. Game patches may rename, reorder, add, or retire options.

## Decision

Published production catalog releases are immutable. Corrections, patch updates, or platform changes require a new catalog version rather than silent mutation of an existing release.

Saved builds and recommendations must retain catalog version, platform, game version, patch context, mode, creation path, and verification date when available.

## Consequences

- Rollback restores a previous immutable package instead of editing history.
- Version comparison and patch re-audit workflows are required before publication after game updates.
- Users can understand which game/catalog version a recommendation came from.

## Current Gaps

- The production catalog is currently the valid empty `empty-production` manifest.
- Historical production package preservation has workflow support but no real package history yet.
