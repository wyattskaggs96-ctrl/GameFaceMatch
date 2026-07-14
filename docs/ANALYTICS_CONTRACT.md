# Privacy-Safe Analytics Contract

Last updated: 2026-07-14

GameFace Match does not have an approved analytics provider in the MVP. The active implementation is a provider-independent TypeScript contract in `web/lib/analytics/privacy-safe-analytics.ts` with local-memory and no-op implementations only.

## Allowed Product Events

The contract currently allows only these coarse product events:

- `appSessionStarted`
- `onboardingCompleted`
- `permissionAccepted`
- `captureStarted`
- `captureCompleted`
- `captureAbandoned`
- `qualityFailureCategory`
- `retake`
- `resultGenerated`
- `resultBlocked`
- `catalogUnavailable`
- `topThreeViewed`
- `recommendationSelected`
- `buildGuideUsed`
- `buildSaved`
- `buildShared`
- `deletionRequested`
- `deletionCompleted`
- `profileDeleted`
- `refinementStarted`
- `refinementCompleted`
- `errorOccurred`
- `latencyRecorded`
- `crashReported`

Payloads are limited to coarse, non-identifying fields such as onboarding step count, permission category, capture mode, capture source, completed angle count, required angle count, broad quality failure category, result outcome, result block reason, catalog version ID, catalog record count, recommendation count, selected recommendation rank, build-guide step count, save/share category, deletion scope, refinement outcome, error category, latency operation, latency duration, and crash category.

## Local Dashboard Metrics

`createAnalyticsDashboard()` aggregates only validated local events into internal metrics:

- scan completion
- retake rate
- quality pass rate
- recommendation success
- top-one selection
- top-three selection
- screenshot refinement completion
- deletion success
- crash-free sessions
- processing latency

The development-only `analytics` page renders these metrics from in-memory events in the current tab. It is not included in production navigation and does not contact a provider.

## Prohibited Analytics Data

Analytics events must never contain:

- Raw images
- Object URLs, Blob URLs, data URLs, or base64 media
- Identifying camera frames
- Facial geometry
- Exact facial measurements
- Landmark coordinates
- Identity embeddings or face vectors
- Unencrypted profile content
- Free-form notes that could collect sensitive information
- Names, email addresses, gamer tags, account IDs, school identifiers, or other identity data
- Sensitive-trait inferences

The runtime validator rejects unknown payload keys, prohibited key patterns, unsafe media-like string values, object/array values, non-finite numbers, and long strings.

## Default Implementation

The MVP may use:

- `createNoopAnalytics()` for no retained events.
- `createLocalAnalyticsRecorder()` for in-memory local debugging or tests.

Both implementations stay local. Neither uploads events or contacts a provider.

## Provider Approval Gate

`assertAnalyticsProviderApproved()` currently always returns `approved: false`.

Before any analytics provider can be connected, the owner must explicitly approve:

- Provider name
- Event list
- Payload schema
- Privacy-policy language
- Retention period
- Opt-in or opt-out behavior
- Data processing agreement needs
- Deletion/export behavior
- Production environment-variable handling

No analytics SDK, external endpoint, or upload path may be added until that decision is documented.
