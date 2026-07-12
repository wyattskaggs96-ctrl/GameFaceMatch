# ADR-0009: User-Facing Recommendation Gate

Date: 2026-07-12

Status: Accepted

## Context

The central product risk is displaying invented College Football 27 options. The production catalog is currently empty.

## Decision

User-facing recommendations are gated on verified production catalog records. When no verified catalog is loaded, the application must fail closed with clear catalog-unavailable language.

Development-only synthetic results may exist for tests and local labs, but they must not be reachable from production navigation or production bundles.

## Consequences

- The app can complete capture/profile/review flows without producing real recommendations.
- Results must explain that the verified College Football 27 catalog is not loaded.
- Paid recommendation claims must remain disabled while production recommendations are unavailable.

## Current Gaps

- No verified College Football 27 production records are present.
- Build instructions and top-three results are UI-ready but production-blocked.
