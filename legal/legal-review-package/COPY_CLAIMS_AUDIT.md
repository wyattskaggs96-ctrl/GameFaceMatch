# Copy Claims Audit

**Status:** Draft for counsel review. Not legal approval.

## Audit Scope

The repository-level copy guard scans current product and marketing surfaces:

- `README.md`
- `00_START_HERE.md`
- `docs/`
- `legal/`
- `web/app/`
- `web/components/`
- `web/features/`
- `web/lib/`
- `web/public/`, excluding vendored MediaPipe runtime assets

The guard allows prohibition lists, disclaimers, legal questions, and historical notes, but fails on affirmative blocked claims.

## Blocked Claims

Do not claim:

- perfect match, perfect facial duplication, or perfect resemblance
- direct face import into College Football 27
- official EA, EA SPORTS, or Electronic Arts integration
- guaranteed resemblance or guaranteed accuracy
- biometric identification or person identification
- medical-grade measurement, scan, analysis, or accuracy

## Current Audit Result

Command:

```sh
npm run legal:copy-check
```

Current result at package creation: no affirmative blocked legal or marketing claims found.

The audit intentionally permits lines that say not affiliated, does not identify people, do not claim direct face import, or similar negative/disclaimer language.

## Current Approved-For-Review Product Language

The current app copy uses:

> GameFace Match recommends the closest available in-game appearance settings. It does not directly import your face into College Football 27.

The current disclaimer copy uses:

> GameFace Match is an independent companion application and is not affiliated with, endorsed by, or sponsored by Electronic Arts, EA SPORTS, CLC, the NCAA, any college or university, Sony, Microsoft, or Nintendo. All referenced trademarks belong to their respective owners.

Counsel must review final language before launch.

## Notes

- The source-of-truth document contains prohibited phrases inside a section that tells contributors not to use those claims.
- Historical readiness or status documents may mention blocked concepts only to describe what the product must not claim.
- Any future marketing copy, pricing page, social script, app listing, support page, or paid-feature disclosure should run through `npm run legal:copy-check`.

