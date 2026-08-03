# CF27 Supported-Subset Verifier Runbook

**Status:** READY_FOR_HUMAN_VERIFIER
**Package:** `CF27_SUPPORTED_SUBSET_SECOND_VERIFIER_SESSION_v0.1.0`
**Generated:** 2026-08-03T05:30:00-04:00
**Production data:** no
**Human decisions recorded by Codex:** no

## 1. Start the Local Tool

From the repository root:

```bash
npm install
npm run cf27:supported-subset-verifier-session:check
npm --prefix web run dev
```

Open the local app at `http://localhost:3000`. Use the internal Phase 0 verifier/status panels for browsing evidence, and use the package files in `data/phase-zero/supported-subset-verifier-session` for the supported-subset decision export.

## 2. Create a Verifier Session

Open `data/phase-zero/supported-subset-verifier-session/verifier_decision_export_template.json`. Copy it outside the repository or into a verifier working folder. Fill only your own observations. Do not edit source media or catalog files.

## 3. Environment Details To Collect

Record verifier ID, verification date, displayed game title, platform, console model, edition if known, region if known, game version, installed update if known, mode, creation path, account state, online state, environment differences, and evidence reference.

Use `unknown` only when the value cannot be established. Do not invent values.

## 4. Save and Resume

Save the decision export JSON as you work. The session is resumable because each candidate row is keyed by `candidateID`. Do not delete rows.

## 5. Inspect Evidence

Use `data/phase-zero/supported-subset-verifier-session/candidate_detail_reference.csv` for source-video IDs, timestamps, derivative references, limitations, and required checks. Evidence may also be browsed in the local internal Phase 0 UI.

## 6. Inspect the Shipping Game Independently

Use the shipping game, not memory and not the primary summary alone. Confirm native labels, indices, order, menu counts, front views, evidence-file existence, and the 24 sampled secondary-angle rows.

## 7. Enter Decisions

Every one of the 76 records must receive exactly one of:

- `VERIFIED`
- `VERIFIED_WITH_NOTES`
- `RECAPTURE_REQUIRED`
- `VERSION_MISMATCH`
- `MISSING_EVIDENCE`
- `COUNT_MISMATCH`
- `ORDER_MISMATCH`
- `DEPENDENCY_UNRESOLVED`
- `NOT_VERIFIED`

Clean `VERIFIED` still requires an independent observation. Any uncertain field or non-clean status requires notes.

## 8. Handle Uncertainty

If a label, count, order, view, environment value, or evidence file cannot be confirmed, use the appropriate blocking status and write notes. Do not guess. Do not request new Wyatt recordings by default.

## 9. Review the Deterministic Sample

Complete all 24 rows in `secondary_angle_sample_review.csv/json`. The sample method is `CF27_SUPPORTED_SUBSET_VERIFICATION_CANDIDATE_v0.1.0` with seed from Prompt 101; do not replace it with a more convenient sample.

## 10. Export and Return

Return the completed JSON decision export to Wyatt/Codex. Codex will validate it with:

```bash
npm run cf27:supported-subset-verifier-session:check
```

A future import command will store valid decisions as non-production only. It will not publish a catalog.

## Expected Time

Plan for 2 to 4 focused hours depending on console access, environment metadata visibility, and how many rows require notes.

## Completion Checklist

- Environment completed.
- Attestation accepted.
- 76 record decisions completed.
- Independent menu counts completed where observable.
- 24 secondary-angle sample rows completed.
- Duplicate/order excluded rows reviewed as limitations, not recommendations.
- Disagreements recorded.
- No production approval entered.
