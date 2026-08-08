# Buddy Trial Learning and Optimization Loop

**Status:** IMPLEMENTED AS PRIVACY-SAFE OFFLINE PROPOSAL PIPELINE
**Prompt:** GFM | Q06 | PROMPT 128 | PHASE 05 | Build trial learning and optimization loop
**Date:** 2026-08-07

## Purpose

Completed Buddy Trials can now produce structured engineering evidence that may improve future GameFace Match recommendations without retaining raw human scan media by default and without silently changing production matching behavior.

The loop is deliberately proposal-only. It can identify patterns and candidate matching changes, but it cannot approve, publish, deploy, or mutate production catalog, ranking, calibration, or matching weights.

## Stored Learning Fields

The learning record schema is implemented in:

```text
web/lib/buddy-trial/buddy-trial-learning.ts
```

Each completed trial learning record stores:

- pseudonymous trial ID;
- source label: `owner_review_demo` or `production`;
- analytics dataset label;
- normal trial consent version;
- separate product-improvement consent version;
- capture quality summary;
- coarse derived face-measurement bins;
- initial recommendation identity;
- recommendation model version;
- catalog version ID;
- initial game settings;
- Video #1 comparison status and standardized-view metadata;
- initial build score;
- refinement changes;
- Video #2 comparison status and standardized-view metadata;
- final build score;
- numeric score delta;
- tester-preferred version;
- resemblance rating;
- optional scrubbed feedback;
- error/retry events.

## Privacy Boundaries

The learning record does not store by default:

- raw human scan media;
- raw character video;
- object URLs;
- thumbnails;
- base64 media;
- raw landmarks;
- exact facial-measurement values.

Derived face measurements are stored as coarse bins such as `low`, `middle`, or `high`, with confidence labels and `valueStored: false`.

Model-training/product-improvement consent is separate from normal trial consent. A record is not eligible for offline optimization unless the tester explicitly opts into structured product improvement.

## Owner Review Demo Exclusion

`OWNER_REVIEW_DEMO` learning records are always tagged as non-production demo evidence:

- `source: owner_review_demo`
- `analyticsDataset: owner_review_demo_excluded_from_beta_metrics`
- `excludedFromRealBetaMetrics: true`
- `excludedFromProductionOptimization: true`
- `eligibleForOfflineOptimization: false`

Demo results can exercise the customer experience and learning contracts, but they cannot enter real beta metrics, matching-study evidence, production optimization datasets, or production catalog state.

## Offline Optimization Workflow

The offline report generator:

```text
createOfflineBuddyTrialOptimizationReport(...)
```

uses only valid, consented, non-demo structured records. It can identify:

- repeated control over/under-shoot patterns;
- preset performance patterns by catalog item;
- matching-weight signals correlated with resemblance ratings;
- refinement changes that consistently improve or worsen scores.

It may propose:

- `matching_weight_change`
- `calibration_change`
- `ranking_change`

Each proposal contains:

- versioned change ID;
- supporting learning-record IDs;
- old behavior summary;
- proposed behavior summary;
- retained-case evaluation;
- observed average score delta;
- required owner approval flag;
- validation-study requirement;
- rollback-plan requirement.

## Production Promotion Gate

An optimization candidate cannot become production behavior unless a later process supplies all of:

- explicit owner approval;
- retained validation cases passed;
- versioned matching/calibration/ranking change ID;
- rollback plan ID.

The optimizer itself always returns:

```text
automaticProductionDeployment: false
approvalRequiredBeforeProduction: true
approvedForProduction: false
```

Prompt 128 does not publish a model version, alter production matching weights, create production catalog records, enable recommendations, or run a real matching study.

## Current Gate State

Unchanged by Prompt 128:

- second-verifier decisions: `0`
- production-approved records: `0`
- production catalog records: `0`
- recommendation-eligible production records: `0`
- real matching-study participants: `0`

## Validation

Focused tests:

```text
npm --prefix web run test -- buddy-trial-learning.test.ts buddy-trial-session.test.ts
```

Full validation should continue to include:

```text
npm --prefix web run typecheck
npm --prefix web run lint
npm --prefix web run test
npm --prefix web run build
npm run status:check
npm run verify
```
