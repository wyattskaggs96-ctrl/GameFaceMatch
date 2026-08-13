# Production Blocker Register

**Date:** 2026-08-13
**Current immediate target:** Q07 ten-user unpaid private research beta
**Paid/public target:** still blocked by production catalog, payment, legal, deployment, and validation gates

## Ten-User Private Beta Blockers

| Severity | Blocker | Why it matters | Owner | Required input/action |
| --- | --- | --- | --- | --- |
| P0 | Durable Vercel HTTPS beta environment not deployed | iPhone Safari camera and invite testing require a stable secure origin, not a local LAN or temporary tunnel. | Wyatt + Codex | Configure/authorize Vercel project and deploy beta environment when implementation is ready. |
| P0 | `betaResearch` recommendation path is defined but not fully implemented as the customer beta result source | The Q07 beta cannot show experimental CF27 settings until the app routes recommendations through the explicitly non-production tier. | Codex | Build beta recommendation/result flow that remains separate from production catalog APIs. |
| P0 | Real iPhone scan completion still needs physical-device validation | Recent owner testing exposed capture reliability and natural phone-position concerns. | Wyatt + Codex | Verify guided scan on physical iPhone Safari after the latest capture fixes and beta deployment path. |
| P0 | Beta feedback/photo submission path is not yet the final Q07 flow | The Q07 milestone requires 1-3 photos/screenshots, resemblance rating, and feedback without owner file handling. | Codex | Implement/align the beta customer flow to collect result photos/screenshots and structured feedback. |
| P1 | Server-side beta persistence/deletion not activated | Local/demo persistence is insufficient for remote testers unless a durable backend path is enabled. | Wyatt + Codex | Use the existing persistence architecture and privacy rules to persist only allowed beta data. |

## Paid/Public Production P0 Blockers

| Blocker | Why it matters | Owner | Required input/action |
| --- | --- | --- | --- |
| No verified production catalog records | Paid/public production cannot return verified game settings. | Wyatt, Codex, second verifier | Complete real second verification, reconcile discrepancies, catalog-manager approval, and immutable production release. Current production catalog count is 0. |
| CF27 supported subset requires real second-human verification for production | Prevents research or beta records from becoming production data. | Second verifier, Codex, catalog manager | Use `npm run verifier:start` and `http://localhost:3000/verifier`; import only a real completed package later. |
| No production payment/subscription stack | Approved Launch Pack and All Access cannot collect money or grant entitlements. | Wyatt + Codex + Stripe | Implement Stripe Checkout/Billing/webhooks only after catalog and server-authoritative entitlement gates are ready. |
| No server-authoritative paid entitlements | Customers cannot be safely granted paid access. | Codex | Supabase/Auth/payment integration with fail-closed checks. |
| No real matching validation | Paid product claims are not measured. | Wyatt + study reviewers | Run the appropriate validation study after real recommendation flow exists. |
| Legal/privacy/payment approval missing | Paid biometric-adjacent product cannot safely launch. | Wyatt + counsel | Legal review of terms, privacy, refunds, trademarks, creator terms, and launch claims. |

## P1 - Required Immediately After Primary Paths Work

| Blocker | Owner | Next action |
| --- | --- | --- |
| Supabase remote not deployed | Codex + Wyatt | Apply migrations/RLS/storage through approved credential workflow only when selected for beta. |
| Support operations not staffed | Wyatt | Choose support email/process/escalation owner for beta and later paid launch. |
| Monitoring/error reporting absent | Codex + Wyatt | Add privacy-safe provider after deployment target is active. |
| Dependency/security review must stay current | Codex | Continue audit and apply non-breaking fixes before public launch. |

## P2 - Important But Can Follow Ten-User Beta

| Item | Owner | Notes |
| --- | --- | --- |
| Additional launch-game catalogs beyond CF27 | Wyatt + Codex | Full paid launch still needs actual catalogs; Q07 beta is CF27-only. |
| Production screenshot/video refinement validation | Codex + study reviewers | Needs real beta outcomes and verified production calibration before paid/public claims. |
| Native iOS premium capture | Codex | Preserved foundation, not active Q07 client. |

## Current Holds

- Additional owner source-media recording is not required for the Q07 beta by default.
- Human CF27 verification is deferred for the Q07 ten-user beta only; it remains a production-catalog and paid/public launch gate.
- Production recommendations remain disabled while production catalog records remain 0.
