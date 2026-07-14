# Production Candidate Import Report

- Status: NO_VERIFICATION_CANDIDATE_PACKAGE
- OK: no
- Schema: cf27-production-candidate-import-v1
- Package: missing
- Input: data/phase-zero/verification-candidate-package/catalog_manifest.json
- Records: 0
- Evidence assets: 0
- Rejected records: 0
- Errors: 1
- Warnings: 0
- Production import allowed: no

## Checks

| Check | Status | Errors | Warnings |
| --- | --- | ---: | ---: |
| candidatePackageDiscovery | fail | 1 | 0 |

## Errors

- `candidatePackageDiscovery/candidatePackageMissing`: No verification-candidate package was found at data/phase-zero/verification-candidate-package/catalog_manifest.json.
  - Repair: Place a catalog-manager-approved verification candidate package at the configured path, then rerun the isolated production-candidate import validator.
