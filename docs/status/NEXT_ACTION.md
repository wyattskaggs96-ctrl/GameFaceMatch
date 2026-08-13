# Next Action

`CODEX ACTION | Implement ten-user private beta research recommendation path`

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

Prompt 137 should implement the actual ten-user beta research recommendation path against the `betaResearch` tier:

- keep production recommendations fail-closed;
- label beta results as experimental/private-beta output;
- use only documented CF27 settings from existing evidence/support records;
- omit unsupported categories rather than inventing values;
- collect 1-3 CF27 result screenshots/photos, resemblance rating, and feedback;
- preserve raw face media as local/browser-only by default;
- keep the beta cohort capped at 10 invites.

Recommended next label:

`GFM | Q07 | PROMPT 137 | PHASE 02 | Implement beta research recommendation and feedback flow`

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
