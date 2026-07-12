# ADR-0005: Production Catalog Versus Fixtures

Date: 2026-07-12

Status: Accepted

## Context

The project uses synthetic fixtures for tests and development-only labs while the production College Football 27 catalog remains empty. The permanent rules prohibit invented user-facing game data.

## Decision

Production catalog data lives under `data/catalog/production/` and must declare `sourceType: "production"`. Research drafts live under `data/audit/college-football-27/` and use `sourceType: "researchDraft"`. Test-only fixtures live under `data/fixtures/test-only/` and use `sourceType: "testFixture"`. Reserved demo and local sample namespaces live under `data/demo/` and `data/local-samples/`.

Fixture, sample, template, demo, local developer, and placeholder records must never be loaded as production data or shown through user-facing production paths.

## Consequences

- Production validation rejects fixture flags, non-production source types, placeholders, unverified records, duplicate IDs, and missing required metadata.
- Repository integrity and production bundle checks guard against fixture and non-production data leakage.
- Development-only preview and lab behavior must stay excluded from production navigation.

## Current Gaps

- Production catalog item count is zero, so no production recommendations can be produced.
- Fixture isolation depends on continued validation and review when new test data is added, but source-type checks now make ambiguous fake data easier to catch.
