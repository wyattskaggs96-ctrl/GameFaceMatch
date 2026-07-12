# ADR-0012: Patch-Version Handling

Date: 2026-07-12

Status: Accepted

## Context

College Football 27 patches may change appearance options, labels, ordering, availability, or creation paths. Recommendations must remain tied to the catalog state that produced them.

## Decision

Catalog records and packages must retain platform, game version, patch version when known, game mode, creation path, capture date, verification date, and catalog version. Patch re-audit is required when game updates may affect appearance options.

Runtime compatibility checks must fail closed or warn when the selected catalog does not match the user's intended platform/version context.

## Consequences

- Patch mismatch, reordered options, retired options, and renamed labels require review before publication.
- Saved builds must retain the exact catalog version used.
- Historical catalog versions remain important for understanding older saved builds.

## Current Gaps

- The empty production manifest does not contain usable platform/game/patch coverage.
- User-selectable runtime platform/version selection remains limited while no verified catalog exists.
