# Catalog Data Integrity Status

This report is generated from repository-local catalog, Phase 0, research, fixture, and audit-template records. It classifies record origin and production access; it does not promote any record.

## Summary

| Classification | Count |
| --- | ---: |
| PRODUCTION_VERIFIED | 0 |
| RESEARCH_OBSERVED | 1298 |
| PUBLIC_SOURCE_ONLY | 0 |
| TEST_FIXTURE | 73 |
| PLACEHOLDER | 375 |
| DEPRECATED | 0 |
| INVALID | 0 |
| UNKNOWN_ORIGIN | 2193 |

## Production Gate Status

- Production catalog record count: 0
- Records allowed production recommendation access: 0
- Production recommendations remain fail-closed unless a record is `PRODUCTION_VERIFIED`, has approved catalog-manager disposition, passes import validation, and is part of an approved release.
- Fixture, research, public-source-only, placeholder, deprecated, invalid, and unknown-origin records are blocked from production access.

## Evidence Requirements

- Research records missing source evidence: 0
- Placeholder records found: 375
- Public-source-only records found: 0
- Test fixture records found: 73

## Current Conclusion

The repository contains research and fixture material, but no production-verified College Football 27 appearance records available to the recommendation engine. Production catalog exports remain empty unless real verified records pass the full publication path.
