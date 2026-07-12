# ADR-0002: Native iOS Foundation Status

Date: 2026-07-12

Status: Accepted

## Context

The repository contains a SwiftUI iOS foundation with Apple-framework capability checks, domain models, catalog validation, adapter scaffolding, local storage, unit tests, and UI tests. The product direction later pivoted to a web-first MVP.

## Decision

The iOS project under `ios/` is preserved as a future premium native capture client. It is not the active MVP, and web tasks must not expand or rewrite it unless a repository-wide build, safety, or documentation issue requires a narrow correction.

## Consequences

- Native TrueDepth/ARKit work remains available for a later premium capture path.
- Shared concepts from iOS, such as profiles, catalog validation, adapters, and deletion semantics, may be reused conceptually by the web app.
- The iOS project remains included in full verification so it does not silently rot.

## Current Gaps

- iOS is not wired to the web runtime or shared generated catalog artifacts.
- Native capture is only a foundation; it is not a production TrueDepth capture product.
