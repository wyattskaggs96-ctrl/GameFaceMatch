# Git Workflow

Last reviewed: 2026-07-12

This workflow is for queued Codex work and human contributors on GameFace Match. It is designed to preserve user work, keep commits reviewable, and prevent accidental commits of secrets, raw face media, game evidence masters, or unverified College Football 27 data.

## Non-Destructive Rules

- Do not run `git reset --hard`, `git checkout --`, `git clean`, or destructive filesystem cleanup unless the owner explicitly requests it.
- Do not stash user work as a default behavior.
- Do not discard, rewrite, or silently modify unrelated files.
- Do not commit generated build output, dependency folders, local simulator data, local evidence masters, raw facial media, or raw game videos.
- Do not place fixtures, samples, demos, placeholders, or synthetic data in `data/catalog/production/`.

## Checkpoint Process

1. Read `AGENTS.md`, `docs/governance/SOURCE_REGISTRY.md`, and the task-specific binding docs.
2. Inspect the current state:

   ```sh
   git status --short --ignored
   git log --oneline -5
   node scripts/repository-status.mjs
   ```

3. Identify whether existing modified/untracked files are related to the task.
4. If unrelated user work exists, leave it untouched and stage only files changed for the task.
5. Implement the smallest complete change.
6. Run focused tests first, then broader checks appropriate to the change.
   For the full repository verification suite, run from the repository root:

   ```sh
   npm run verify
   ```

7. Review the final diff:

   ```sh
   git diff --check
   git diff --stat
   git diff
   ```

8. Stage only task-related files:

   ```sh
   git add <specific-file> <specific-file>
   ```

9. Check staged content:

   ```sh
   git diff --cached --stat
   git diff --cached
   node scripts/repository-status.mjs
   ```

10. Commit with a clear conventional message:

    ```sh
    git commit -m "type: concise task summary"
    ```

11. Confirm the final state:

    ```sh
    git status --short
    git log -1 --oneline
    ```

## Repository Status Script

Run:

```sh
node scripts/repository-status.mjs
```

The script reports:

- Current branch and HEAD.
- Staged files.
- Modified files.
- Untracked files.
- Ignored files reported by Git.
- Files over the default size threshold.
- Safety warnings for potential secrets.
- Fixture-like files or fixture content in production catalog directories.
- Possible raw facial media outside approved temporary directories.
- Raw game videos or local evidence masters that should stay out of git.

Use strict mode when a queue task should fail on safety warnings:

```sh
node scripts/repository-status.mjs --strict
```

The default oversized-file threshold is 25 MB. To change it for a local audit:

```sh
REPO_STATUS_SIZE_LIMIT_MB=10 node scripts/repository-status.mjs
```

## Unified Verification Command

Run from the repository root:

```sh
npm run verify
```

The command stops on the first failed stage and prints the stage name before returning a nonzero exit code. It runs:

- Repository status and documentation safety checks.
- Web type-checking.
- Web linting.
- Web unit and integration tests.
- Production catalog schema validation.
- Production catalog placeholder, fixture, and duplicate checks.
- Web integrity and documentation checks.
- Web production build and production gates.
- Playwright local smoke/end-to-end tests.
- Native iOS build, unit tests, and UI tests when Xcode is available.

For machines that cannot run local browser or simulator checks, these escape hatches are available for local troubleshooting only:

```sh
GAMEFACE_VERIFY_SKIP_E2E=1 npm run verify
GAMEFACE_VERIFY_SKIP_IOS=1 npm run verify
```

Do not use skip flags to claim complete verification.

## Approved Temporary Or Generated Areas

These may exist locally but should not be committed:

- `build-artifacts/DerivedData/`
- `web/.next/`
- `web/node_modules/`
- `web/public/mediapipe/`
- `web/test-results/`
- `web/playwright-report/`
- `web/blob-report/`
- `web/tsconfig.tsbuildinfo`
- Xcode workspace/user data under `ios/GameFaceMatch.xcodeproj/`

## Private Evidence And Media

Raw facial media, local tester captures, raw game videos, and local evidence masters are private by default. Keep them outside the repository or under ignored local-only directories such as:

- `local-evidence/`
- `evidence-masters/`
- `raw-captures/`
- `captured-media/`
- `face-captures/`
- `game-videos/`

Catalog production records must reference only approved evidence identifiers and must pass the catalog publication workflow. Screenshots or videos must not become public web assets just because they were used during local audit.

## Catalog Safety

Before committing any catalog-related change:

```sh
cd web
npm run catalog:validate
npm run catalog:placeholders
npm run catalog:fixtures
node ../scripts/catalog-tools.mjs detect-duplicates ../data/catalog/production/catalog_manifest.json
npm run build:guard
```

The production catalog may remain empty. An empty production catalog is valid and must fail closed with:

> Verified College Football 27 catalog not loaded.

## Commit Grouping

Prefer small logical commits:

- `docs:` documentation-only updates.
- `test:` test-only changes.
- `fix:` code repairs.
- `feat:` scoped user-facing or developer-facing feature increments.
- `chore:` tooling or repository maintenance.

Do not combine unrelated app behavior, catalog data, deployment prep, and documentation cleanup in one unclear commit.
