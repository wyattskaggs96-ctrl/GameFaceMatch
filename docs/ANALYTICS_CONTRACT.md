# Privacy-Safe Analytics Contract

Last updated: 2026-07-13

GameFace Match does not have an approved analytics provider in the MVP. The active implementation is a provider-independent TypeScript contract in `web/lib/analytics/privacy-safe-analytics.ts` with local-memory and no-op implementations only.

## Allowed Product Events

The contract currently allows only these coarse product events:

- `captureStarted`
- `captureCompleted`
- `captureAbandoned`
- `qualityFailureCategory`
- `retake`
- `resultBlocked`
- `catalogUnavailable`
- `profileDeleted`
- `refinementStarted`
- `refinementCompleted`

Payloads are limited to coarse, non-identifying fields such as capture mode, capture source, completed angle count, required angle count, broad quality failure category, result block reason, catalog version ID, catalog record count, deletion scope, and refinement outcome.

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
