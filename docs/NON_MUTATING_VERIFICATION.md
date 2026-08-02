# Non-Mutating Verification

GameFace Match has two verification entry points:

- `npm run verify` runs the full validation suite in the current checkout.
- `npm run verify:clean` runs the same suite inside an isolated temporary local clone and proves the source checkout remains clean.

Use `npm run verify:clean` for release audits, handoff audits, and any work where validation must not leave tracked generated files modified.

## Why This Exists

Next.js can rewrite `web/next-env.d.ts` while running `tsc`, `next build`, or dev-server based browser tests. The tracked repository version references:

```ts
import "./.next/types/routes.d.ts";
```

After dev-server based checks, Next can rewrite the same line to:

```ts
import "./.next/dev/types/routes.d.ts";
```

That change is generated route-type wiring, not product code, but it still dirties the source checkout when validation runs in place. The non-mutating runner lets that generated drift happen only in a temporary checkout.

## Command

```bash
npm run verify:clean
```

The command requires a clean source worktree. It refuses to run when tracked or untracked source files are present, because a dirty checkout cannot prove validation success and source cleanliness at the same time.

Useful environment flags:

- `GAMEFACE_VERIFY_SKIP_E2E=1` skips Playwright E2E stages inside the isolated run.
- `GAMEFACE_VERIFY_SKIP_IOS=1` skips native iOS build, unit, and UI tests. CI on Ubuntu uses this flag.
- `GAMEFACE_VERIFY_KEEP_TEMP=1` keeps the temporary checkout for debugging after failure.
- `GAMEFACE_VERIFY_IOS_DESTINATION="platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5"` overrides the simulator destination.

## Included Checks

`npm run verify:clean` delegates to `npm run verify`, so it includes the existing full suite:

- Repository status and documentation safety.
- Requirement traceability.
- Current status consistency.
- Supabase schema contract.
- FC 26 research validation.
- Phase 0 export, evidence, candidate, verifier, and production-gate checks.
- Catalog import and record-classification checks.
- Legal and marketing copy guard.
- Web type checking.
- Web lint.
- Web unit and integration tests.
- Production catalog validation, placeholder check, fixture check, duplicate-ID check.
- Web integrity checks.
- Production build and production bundle guard.
- Web E2E and Phase 0 E2E, unless skipped.
- Native iOS build, unit tests, and UI tests when available and not skipped.

## Mutation Policy

The runner records source Git status before and after the isolated verification. If the source checkout changes, the command fails.

Inside the isolated checkout, the runner allows only:

- The known `web/next-env.d.ts` route-type import flip between `.next/types/routes.d.ts` and `.next/dev/types/routes.d.ts`.

Any other tracked or untracked source mutation inside the isolated checkout fails the command.

The helper smoke command verifies this mutation detection:

```bash
npm run verify:clean:mutation-smoke
```

## Temporary Artifacts

Temporary checkouts are created under the repository-ignored verification directory with names like:

```text
.verification-worktrees/verify-*/checkout
```

The runner removes the temporary checkout on completion unless `GAMEFACE_VERIFY_KEEP_TEMP=1` is set. It runs `npm ci` in the temporary checkout's `web/` directory so build tools use dependencies installed inside the isolated project root.

Ignored local evidence derivatives required by the Phase 0 evidence-integrity checks are also copied into the temporary checkout when present:

- `data/phase-zero/derivative-frames/`
- `data/research/cf27/generated/full-resolution-frames/`

These temporary copies let the path-resolution checks validate existing local evidence without committing raw or generated media.

## CI Usage

The GitHub web CI workflow runs:

```bash
GAMEFACE_VERIFY_SKIP_IOS=1 npm run verify:clean
```

Native iOS verification remains a local or macOS-runner responsibility because the current CI runner is Ubuntu.

## Failure Reporting

Failures are reported in the stage output from `npm run verify`. Additional runner failures identify:

- Dirty source worktree before verification.
- Source worktree mutation during verification.
- Unexpected tracked-file mutation inside the isolated checkout.
- Temporary checkout creation or cleanup failures.
