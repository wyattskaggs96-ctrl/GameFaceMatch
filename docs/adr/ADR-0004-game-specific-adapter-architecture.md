# ADR-0004: Game-Specific Adapter Architecture

Date: 2026-07-12

Status: Accepted

## Context

GameFace Match should eventually support multiple sports games. Generic capture, profile, storage, and matching code must not bake in College Football 27 menu behavior.

## Decision

Game-specific behavior belongs behind the `GameAppearanceAdapter` interface. College Football 27 behavior lives in its adapter scaffold and must fail closed when the verified production catalog is unavailable.

Generic modules may depend on shared domain types, but they must not depend directly on College Football 27 labels, menu structure, option counts, or catalog-specific assumptions.

## Consequences

- New games must add adapters instead of modifying capture/profile modules.
- Matching remains explainable and catalog-version traceable.
- Build instructions must be generated only from verified game-specific catalog records.

## Current Gaps

- Only the College Football 27 adapter exists.
- Real production matching is blocked until verified catalog records are available.
