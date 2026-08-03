# Next Production Prompts

## Immediate Next Prompt

`GFM | Q04 | PROMPT 094 | PHASE 02 | Complete real CF27 second-verifier review and import decisions`

Purpose: use the completed second-verifier workspace and canonical CF27 production-verification queue to collect, validate, and import real second-human decisions without promoting records automatically.

## Prompt 092 Result

- Canonical queue: `data/phase-zero/production_verification_queue.json`
- Queue summary: `docs/phase-zero/CF27_PRODUCTION_VERIFICATION_QUEUE.md`
- Queue records: 92
- Evidence-linked records: 92
- Duplicate or near-duplicate records: 5
- Order-unresolved records: 3
- Records with missing required production views: 87
- Production-eligible records: 0
- Second-verified records: 0
- Production-approved records: 0

## Prompt 093 Result

- Internal second-verifier workspace loads the canonical 92-record queue.
- The verifier can filter by category, status, evidence completeness, missing views, duplicates/ambiguity, environment/version gaps, and search terms.
- Candidate details show native order, environment metadata, primary observations, evidence lists, missing views, duplicate/dependency flags, and blocker reasons.
- Draft decisions use only the approved verifier statuses and require verifier identity, date, environment, independent observation, evidence confirmation, native-order confirmation, front-view confirmation, and notes when needed.
- Deterministic 25% secondary-angle sampling is available.
- Draft decisions remain non-production and cannot grant production approval.

## Prompt 094 Acceptance

- A real second verifier has completed attributable decisions.
- Submitted decisions validate against the approved schema and statuses.
- Disagreements, recapture requests, version mismatches, count mismatches, and order mismatches are preserved as unresolved blockers.
- No record is marked production-approved by verifier import alone.

## Later Production Path

1. Complete second-human verification and discrepancy resolution.
2. Publish a nonempty verified production catalog only if all release gates pass.
3. Connect server-authoritative paid access in test mode.
4. Deploy Supabase/Auth/Storage/RLS through the approved credential workflow.
5. Run real manual matching validation.
6. Complete legal, security, privacy, accessibility, deployment, and support gates.

## Explicitly Not Next

- Stripe live checkout
- Supabase remote deployment
- Creator attribution or payouts
- Athlete comparisons
- Public launch approval
