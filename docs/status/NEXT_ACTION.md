# Next Action

`OWNER ACTION | Select/connect GameFace Match Supabase project for Q07 beta persistence and owner review`

Repository:
`/Users/skaggssystems/Developer/GameFaceMatch`

Run after:
`GFM | Q07 | PROMPT 136 | PHASE 01 | Lock ten-user beta scope and restore baseline`

## Current State

Q07 changes the immediate target from paid-public production to an unpaid, invite-only, maximum 10-user College Football 27 research beta.

- Authoritative beta contract: `docs/Product/TEN_USER_PRIVATE_BETA.md`
- Owner decision: `docs/DECISIONS.md` D-015
- Hosting target for beta: Vercel HTTPS
- Primary beta client: iPhone Safari
- Basic beta account requirement: none
- Basic beta payment requirement: none
- Beta recommendation tier: `betaResearch` / `BETA_RESEARCH`
- Production catalog records: 0
- Production recommendations enabled: false
- Second-verifier decisions: 0
- Human catalog verification: deferred for the 10-user beta only
- Paid/public production gate: still requires real second verification, catalog-manager approval, and immutable production catalog release

## Immediate Codex Action

Prompt 140 has local code/schema contracts for beta persistence and private game-result storage, Prompt 141 adds the local customer-facing CF27 created-player photo/feedback loop, and Prompt 142 extends `/owner/trials` into a protected owner beta review command center with aggregate metrics, per-session evidence, owner review disposition, and privacy-safe research export.

Live Supabase activation is still on hold because the connected Supabase account inspected by Codex did not list an approved GameFace Match project.

Wyatt should provide or confirm:

- the intended GameFace Match Supabase project;
- the Vercel private-beta project environment access;
- server-only Supabase secret/database values in Vercel, not in Git or chat;
- approval to apply the local migration and create/verify the private `private-beta-game-results` bucket.

After that hold clears, Codex can run live migration/storage validation and deployed beta smoke checks.

The next implementation milestone should activate and smoke-test the durable remote beta path once the owner project/credentials hold clears:

- connect the approved Supabase project and private `private-beta-game-results` storage bucket;
- configure server-only Vercel environment values without committing secrets;
- verify deployed invite/session persistence, result-photo upload metadata, owner review dashboard aggregation, export, and deletion;
- keep raw face media local/browser-only by default;
- keep production recommendations fail-closed and beta research results clearly labeled.

Recommended next Codex label after owner connection hold:

`GFM | Q07 | PROMPT 143 | PHASE 06 | Activate live beta persistence and owner review smoke`

## Deferred Human-Verifier Action

The owner-usable CF27 verifier remains ready at:

```bash
npm run verifier:start
```

```text
http://localhost:3000/verifier
```

That work is now a paid/public production prerequisite, not a blocker for the Q07 10-user research beta. Codex must still not fabricate verifier decisions, import fake decisions, publish production catalog records, or enable production recommendations.

## Stop Point

Do not deploy, connect payments, publish a production catalog, or relabel beta/research records as verified during the next prompt.
