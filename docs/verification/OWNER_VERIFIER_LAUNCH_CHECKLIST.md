# Owner Verifier Launch Checklist

1. Open Terminal in `/Users/skaggssystems/Developer/GameFaceMatch`.
2. Run:

```bash
npm run verifier:start
```

3. Open: `http://localhost:3000/verifier`
4. Open College Football 27 on the Xbox and navigate to Road to Glory player creation appearance screens.
5. Hand the verifier this page and `docs/verification/HUMAN_VERIFIER_QUICK_START.md`.
6. Let the verifier enter their own ID, environment, decisions, and notes.
7. Do not preselect or suggest `VERIFIED`.
8. Make sure they complete all 76 record decisions, 24 secondary-angle checks, 8 duplicate/order limitation rows, and the final signature/export step.
9. Finished export location:

```text
~/Downloads/cf27-supported-subset-verifier-export-<verifier-id>-<verification-date>.json
```

10. Optional validation command after the file is downloaded:

```bash
npm run cf27:supported-subset-verifier-session:validate-export -- ~/Downloads/cf27-supported-subset-verifier-export-<verifier-id>-<verification-date>.json
```

11. Next Codex prompt after a real completed export exists:

```text
GFM | Q06 | PROMPT 136 | PHASE 02 | Import and reconcile CF27 human verifier package
```
