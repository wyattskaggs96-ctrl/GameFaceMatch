# ADR-0001: Responsive Web MVP Is The Active Implementation

Date: 2026-07-12

Status: Accepted

## Context

The initial source of truth described an iPhone-first implementation because native TrueDepth and ARKit are stronger capture paths. Later project decisions pivoted the first customer-facing MVP to a responsive web application for faster iteration and easier distribution.

## Decision

The active MVP implementation is the responsive TypeScript, React, and Next.js web app under `web/`.

The web MVP uses guided RGB capture and upload fallback. It must clearly state that browser RGB capture is not equivalent to native TrueDepth, ARKit, depth geometry, or 3D reconstruction.

## Consequences

- Web routes, browser capture, local privacy storage, catalog loading, matching, results, QA, and deployment planning are the primary implementation path.
- Documentation must identify `web/` as active and `ios/` as preserved future work.
- Web code must not depend on iOS frameworks or native-only capture claims.

## Current Gaps

- Current mobile browser behavior still requires real-device HTTPS validation.
- The local MediaPipe model asset is not present, so landmark processing remains implementation-ready but not fully runtime-verified.
