# Production Candidate Import Gate

**Status:** canonical pre-production validation gate
**Last reviewed:** 2026-07-14
**Scope:** College Football 27 verification-candidate package import into an isolated validation environment
**Production status:** NOT PRODUCTION DATA

This gate is the last local validation step before any future production catalog publication work. It does not publish records, does not mutate `data/catalog/production/`, and does not enable recommendations.

## Canonical Input

The default input path is:

`data/phase-zero/verification-candidate-package/catalog_manifest.json`

No verification-candidate package is currently present at that path. The current report is therefore a fail-closed discovery report:

`data/phase-zero/production-candidate-import/production_candidate_import_report.json`

## Command

Run the self-check:

```sh
npm run cf27:production-candidate-import:check
```

Validate the default package path and write reports:

```sh
npm run cf27:production-candidate-import
```

When no package exists, the command exits nonzero and writes a detailed `NO_VERIFICATION_CANDIDATE_PACKAGE` report. That is the correct current behavior.

## Checks

The validator runs:

- schema import
- ID uniqueness
- native-order continuity
- evidence path resolution
- required evidence checks
- verification-status checks
- platform/version/patch completeness
- fixture separation
- placeholder rejection
- production/test separation
- duplicate observation retention
- unresolved count/order mismatch checks
- wrong-environment checks
- visual-condition approval checks
- game reproducibility checks
- dependency resolution checks
- supersession checks

## Rejection Rules

Records are rejected when they:

- lack evidence
- lack `VERIFIED` or `VERIFIED_WITH_NOTES` status
- contain placeholders or unresolved environment tokens
- have unresolved count/order, evidence, version, recapture, or dependency statuses
- reference a different environment than the package environment
- use unapproved visual conditions
- mix platforms, game versions, patches, modes, or creation paths
- cannot be reproduced from verified game menu instructions
- use fixture, test, demo, public-source-only, or research-only data
- reference missing evidence or evidence outside the candidate package
- use destructive duplicate-observation dispositions
- contain invalid supersession references

## Current Result

Current import result: `NO_VERIFICATION_CANDIDATE_PACKAGE`.

Production import remains blocked. The production catalog remains empty until a real verified package passes this isolated gate, catalog-manager approval, immutable-release checks, and the definitive production publish gate.
