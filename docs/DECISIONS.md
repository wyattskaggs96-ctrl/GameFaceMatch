# Decision Log

## D-001 — Native iPhone first
Status: Accepted  
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
