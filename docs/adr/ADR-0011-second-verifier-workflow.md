# ADR-0011: Second-Verifier Workflow

Date: 2026-07-12

Status: Accepted

## Context

Manual game catalog entry is error-prone. A single auditor can misread labels, miss patch differences, or accidentally publish placeholders.

## Decision

Production catalog records require first review and second review by different reviewers before verification. The second verifier must confirm visible labels, required evidence, platform/game/patch context, game mode, creation path, and menu instructions.

No record may auto-verify from CSV import, template completion, or single-person entry.

## Consequences

- Production validation rejects records missing required review context.
- Audit reports should give non-developer next actions for missing second review.
- Review state transitions must be explicit and auditable.

## Current Gaps

- No real two-reviewer production records are present.
- Reviewer identity/authorization remains a local process, not an account-backed system.
