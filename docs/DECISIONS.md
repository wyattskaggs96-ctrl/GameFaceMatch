# Decision Log

## D-001 — Native iPhone first
Status: Superseded by D-008
Reason: TrueDepth and ARKit provide the strongest launch capture path.

## D-002 — Verified catalog before sophisticated reconstruction
Status: Accepted
Reason: Product value depends on the game offering distinguishable, auditable appearance options.

## D-003 — On-device-first prototype
Status: Accepted
Reason: Reduces privacy risk and avoids unnecessary backend complexity.

## D-004 — Rule-based matcher before custom model
Status: Accepted
Reason: Explainable, testable, and appropriate for a small verified catalog.

## D-005 — Provisional iOS 18.0 deployment target
Status: Accepted
Reason: iOS 18.0 is a conservative modern baseline for the initial SwiftUI and Apple-framework foundation while the team validates actual TrueDepth, ARKit, and camera requirements on current iPhone hardware.

## D-006 — Hand-authored Xcode project for foundation build
Status: Accepted
Reason: The repository should compile without introducing third-party project generators, package dependencies, or global tools during the first native application build.

## D-007 — Empty production catalog fails closed
Status: Accepted
Reason: An empty production catalog is valid, but no user-facing College Football 27 recommendation can be produced until verified records exist. The College Football 27 adapter returns a catalog-unavailable error rather than inventing options.

## D-008 — Web-first MVP
Status: Accepted
Reason: A responsive web MVP enables faster iteration, easier distribution, and lower installation friction for early validation. The native iPhone client is retained for future premium TrueDepth capture.

## D-009 — Guided RGB browser capture for web MVP
Status: Accepted
Reason: Modern browsers can support guided multi-angle RGB image capture and manual upload fallback. Lower capture precision must be clearly communicated, and the app must not claim browser RGB capture is equivalent to native TrueDepth.

## D-010 — Platform-independent catalog and matching boundaries
Status: Accepted
Reason: The verified game catalog, domain model semantics, validation rules, and game-adapter architecture should be shared across web and native clients so no client invents College Football 27 options or diverges from production catalog rules.

## D-011 — Free beta before payment
Status: Accepted
Reason: The production catalog is empty, recommendation value still needs validation, and trust/privacy concerns are high. The simplest launch model is a free beta with provider-independent payment and entitlement scaffolding only. A one-time College Football 27 game pack can be reconsidered after verified catalog records and useful beta outcomes exist.

## D-012 — Dedicated app subdomain recommended for launch
Status: Recommended
Reason: The owner has an existing Squarespace marketing site, but the GameFace Match app needs a secure HTTPS app origin for browser camera behavior, CSP control, future payment redirects, and possible webhook/server endpoints. Keep marketing in Squarespace and host the app on a dedicated subdomain unless owner-supplied account details prove another approach is safer.

## D-013 — Local MediaPipe Face Landmarker provider
Status: Accepted
Reason: Google MediaPipe Face Landmarker is an official, actively maintained, browser-compatible local landmark implementation with an Apache-2.0 runtime. It stays behind `FaceLandmarkProvider`, lazy-loads during capture analysis, uses a worker when practical, and must return unavailable/error states rather than fabricated landmarks when the reviewed local model asset is absent or fails.

## Architecture Decision Records

Detailed ADRs live under `docs/adr/` and clarify the current architecture without replacing this concise decision log. Where an ADR documents a gap, treat it as a follow-up implementation or validation task rather than silent permission to work around permanent rules.
