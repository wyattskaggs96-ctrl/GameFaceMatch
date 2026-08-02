GFM | Q04 | PROMPT 091 | PHASE 01 | Verify pricing alignment and checkpoint repository

Repository:
`/Users/skaggssystems/Developer/GameFaceMatch`

Run after:
`GFM | MASTER | PROMPT 090 | ALIGN APPROVED LAUNCH PRICING AND GAME SUPPORT GATES`

## Objective

Independently verify Prompt 090 pricing and launch-game alignment against the repository's actual state, repair only in-scope inconsistencies, reconcile status records, and create a safe focused checkpoint if required.

## Current Product Direction To Verify

- `launch_pack`
  - `$4.99`
  - One-time purchase
  - Intended to cover the five original launch games only when those games become production-supported
- `all_access_annual`
  - `$9.99/year`
  - Annual subscription
  - Intended to cover all currently supported and subsequently added games while active

Original five launch targets:

1. EA SPORTS College Football 27
2. NBA 2K26
3. Madden NFL 26
4. EA SPORTS PGA TOUR
5. PBA Pro Bowling 2026

Truthful support state:

- College Football 27 has research evidence and zero production catalog records.
- NBA 2K26, Madden NFL 26, EA SPORTS PGA TOUR, and PBA Pro Bowling 2026 are not started.
- EA SPORTS FC 26 remains research-only and outside the five-game Launch Pack definition.

## Verification Scope

- Active pricing config, UI copy, and tests use Launch Pack / All Access as current.
- Older Prompt 080 `$0.99` / `$1.99/month` references are removed from active product configuration or clearly historical.
- Checkout remains disabled and provider-unavailable.
- Client state, query params, local storage, fixtures, or mock payments cannot grant paid access.
- Game registry includes all five launch targets without false production support.
- FC 26 remains isolated.
- Fixture and research records remain excluded from production recommendations.
- Status and governance records match implementation.

## Required Commands

- `npm run status:check`
- `npm run legal:copy-check`
- `npm run supabase:schema:check`
- `npm --prefix web run lint`
- `npm --prefix web run test -- commerce.test.ts game-adapter-isolation.test.ts scan-entry.test.ts status-consistency.test.ts`
- Additional directly relevant tests discovered during inspection
- `npm run verify:clean` only when worktree assumptions can be satisfied without hiding legitimate work

## Stop Point

Do not begin Stripe, Supabase deployment, catalog promotion, creator attribution, creator payouts, athlete comparisons, or additional game research.
