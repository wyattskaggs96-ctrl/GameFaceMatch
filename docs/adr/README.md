# Architecture Decision Records

Last reviewed: 2026-07-12

These ADRs describe the current GameFace Match architecture. They clarify accepted boundaries without rewriting product behavior. If implementation and an ADR diverge, record the gap in the ADR and resolve it in a focused follow-up task.

## Active ADRs

| ADR | Decision |
| --- | --- |
| [ADR-0001](ADR-0001-responsive-web-mvp.md) | Responsive web MVP is the active implementation |
| [ADR-0002](ADR-0002-native-ios-foundation-status.md) | Native iOS foundation is preserved for future premium capture |
| [ADR-0003](ADR-0003-on-device-first-facial-processing.md) | Facial processing is local/on-device first |
| [ADR-0004](ADR-0004-game-specific-adapter-architecture.md) | Game-specific behavior belongs behind adapters |
| [ADR-0005](ADR-0005-production-catalog-versus-fixtures.md) | Production catalog data is separated from fixtures |
| [ADR-0006](ADR-0006-evidence-storage-relative-paths.md) | Catalog evidence uses local storage and relative references |
| [ADR-0007](ADR-0007-immutable-catalog-releases.md) | Published catalog releases are immutable |
| [ADR-0008](ADR-0008-local-first-raw-media-handling.md) | Raw user media is local, temporary, and deleted by default |
| [ADR-0009](ADR-0009-user-facing-recommendation-gate.md) | Recommendations fail closed until verified catalog data exists |
| [ADR-0010](ADR-0010-admin-catalog-manager-boundaries.md) | Catalog manager tooling is local and development-only |
| [ADR-0011](ADR-0011-second-verifier-workflow.md) | Production records require an independent second verifier |
| [ADR-0012](ADR-0012-patch-version-handling.md) | Catalog records are tied to platform, game version, and patch context |
