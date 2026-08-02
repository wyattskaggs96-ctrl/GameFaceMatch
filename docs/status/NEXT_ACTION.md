GFM | MASTER | PROMPT 090 | ALIGN APPROVED LAUNCH PRICING AND GAME SUPPORT GATES

Repository:
`/Users/skaggssystems/Developer/GameFaceMatch`

OBJECTIVE

Align the repository’s product/pricing governance and fail-closed game-support model with the current approved business direction without enabling live payments.

Approved business direction:

- `$4.99` one-time Launch Pack covering the five original launch games.
- `$9.99/year` All Access covering every supported game and future games added while subscribed.
- Original five launch games:
  1. EA SPORTS College Football 27
  2. NBA 2K26
  3. Madden NFL 26
  4. EA SPORTS PGA TOUR
  5. PBA Pro Bowling 2026

STRICT LIMITS

- Do not connect Stripe.
- Do not create checkout sessions.
- Do not create subscriptions.
- Do not grant paid entitlements.
- Do not connect live Supabase.
- Do not add verified catalog records.
- Do not claim any unsupported game is production-supported.
- Do not remove the existing College Football 27 or FC 26 work.
- Do not fabricate game catalog data.

TASKS

1. Inspect the current health-check records:
   - `docs/status/CURRENT_PROJECT_STATE.md`
   - `docs/status/GAMEFACE_MATCH_HEALTH_CHECK.md`
   - `docs/status/PRODUCTION_BLOCKER_REGISTER.md`
   - `docs/status/PRODUCTION_READINESS_SCORECARD.md`
   - `docs/Product/Creator Program/CREATOR_PROGRAM_SOURCE_OF_TRUTH.md`

2. Update source governance:
   - Register the Creator Program source in `docs/governance/SOURCE_REGISTRY.md`.
   - Mark older `$0.99` / `$1.99/month` scan-entry monetization language as superseded for the approved launch model, while preserving it as historical context.

3. Update payment/product configuration:
   - Replace the current customer-facing pricing scaffold with typed, fail-closed products for:
     - `launch_pack` at `$4.99`
     - `all_access_annual` at `$9.99/year`
   - Preserve checkout disabled behavior.
   - Preserve provider-unavailable behavior.
   - Preserve server-verified entitlement requirement.
   - Ensure no visual plan selection is treated as payment.

4. Update launch game registry:
   - Add the five launch games as explicit game definitions.
   - Mark each game’s support state truthfully:
     - College Football 27: research evidence exists, production catalog empty.
     - NBA 2K26: not started.
     - Madden NFL 26: not started.
     - EA SPORTS PGA TOUR: not started.
     - PBA Pro Bowling 2026: not started.
   - Keep FC 26 isolated as research-only/non-launch unless owner later changes scope.

5. Update UI copy only where necessary:
   - The app may show Launch Pack and All Access as planned/disabled offers.
   - Do not imply checkout is available.
   - Do not imply all five games have verified catalogs.
   - Do not imply creator payouts are live.

6. Update tests:
   - Pricing config validates `$4.99` Launch Pack and `$9.99/year` All Access.
   - Checkout remains disabled.
   - Unverified payment cannot unlock scans or recommendations.
   - The five launch games are registered but fail closed without verified catalogs.
   - FC 26 remains isolated from the College Football 27 and five-game launch catalog state.
   - Fixture and research records cannot become production recommendations.

7. Update status docs:
   - `docs/status/CURRENT_PROJECT_STATE.md`
   - `docs/status/GAMEFACE_MATCH_HEALTH_CHECK.md`
   - `docs/status/NEXT_ACTION.md`
   - `docs/status/NEXT_PRODUCTION_PROMPTS.md`
   - Any status registry that references old scan pricing as current.

VALIDATION

Run:

- `npm run status:check`
- `npm run legal:copy-check`
- `npm run supabase:schema:check`
- `npm --prefix web run test -- commerce.test.ts game-adapter-isolation.test.ts scan-entry.test.ts`
- `npm run verify:clean` if the worktree is clean enough for the non-mutating runner

ACCEPTANCE CRITERIA

- The approved Launch Pack and All Access model is the current documented and typed product model.
- Checkout remains disabled and fail-closed.
- No live payment, subscription, creator, or payout behavior is added.
- The five original launch games are represented as launch targets without pretending unsupported catalogs exist.
- Existing College Football 27 fail-closed behavior remains intact.
- Existing FC 26 research remains isolated.
- Tests pass or failures are documented as pre-existing.
- A focused commit is created only if the worktree can be staged without including unrelated source media, secrets, or local artifacts.

STOP POINT

Stop after pricing/game-support governance and tests are aligned. Do not begin Stripe, Supabase, catalog verification, creator attribution, or payout implementation.

