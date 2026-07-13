# Staging Release Mode

NOT PRODUCTION DATA
NOT A VERIFIED GAME RECORD

Staging release mode lets the team rehearse the complete GameFace Match web experience with clearly labeled fixture data before a verified College Football 27 production catalog exists.

## Purpose

Use staging mode to test:

- Product explanation and limitation language.
- Consent and capture assumptions.
- StandardFaceProfile generation with synthetic fixture metadata.
- Rule-based top-three rendering.
- Build-guide layout.
- Save/share disabled states for test recommendations.
- Reset behavior.

Staging mode does not create production data, does not verify College Football 27 options, and does not enable public recommendations.

## How to Run

From `web/`:

```bash
npm run build:staging
npm run start
```

Then open:

```text
http://localhost:3000/staging
```

The staging build sets `GAMEFACE_RELEASE_MODE=staging` and `NEXT_PUBLIC_GAMEFACE_RELEASE_MODE=staging` during `next build`.

## Production-Safe Default

Normal production builds use:

```bash
npm run build
```

That command runs the production bundle guard after `next build`. The guard scans built server and static output for blocked fixture and invented-game-data tokens. The `/staging` route remains present but disabled unless the staging build mode is explicitly enabled, and it does not load fixture records in a normal production build.

## TEST DATA Requirements

Every staging result must:

- Display permanent `TEST DATA` labeling.
- Use the test-only catalog version `synthetic-test-catalog-v1`.
- Keep fixture records under `data/fixtures/test-only/`.
- Keep production catalog data under `data/catalog/production/`.
- Disable sharing test recommendations as real results.
- Disable saving staging recommendations as completed builds.
- Provide reset controls for staging-only browser state.

## Prohibited Uses

Do not:

- Copy staging fixture records into `data/catalog/production/`.
- Treat staging labels, IDs, instructions, or scores as College Football 27 facts.
- Use staging screenshots or outputs in marketing.
- Enable staging mode for a public production deployment.
- Remove the catalog-unavailable state from the normal production app while the verified catalog is empty.
