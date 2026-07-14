# Current Research Package Validation

**Historical report:** Preserved for provenance. Use `docs/phase-zero/PHASE_ZERO_ARTIFACT_MAP.md` to distinguish current normalized Phase 0 artifacts from older research-package validation snapshots.

**CURRENT RESEARCH PACKAGE VALIDATION - PRIMARY RESEARCH ONLY - NOT PRODUCTION VERIFIED**

This report validates the current partial College Football 27 research package. It does not verify records, publish production data, or enable recommendations.

## Summary

- Status: passed
- Checks: 14
- Passed checks: 14
- Errors: 0
- Warnings: 0
- Research records: 86
- Evidence entries: 335
- Local derivative checksums verified: 324
- Portable source master references verified: 11
- Production recommendations enabled: false

## Required Validations

### uniqueIDs: passed

- Errors: 0
- Warnings: 0
- Details: {"recordCount":86,"uniqueRecordIDs":86,"evidenceCount":335,"uniqueEvidenceIDs":335}

### nativeOrderContinuity: passed

- Errors: 0
- Warnings: 0
- Details: {"heads":{"count":29,"first":1,"last":29},"skin_tones":{"count":24,"first":1,"last":24},"skin_details":{"count":10,"first":1,"last":10},"eye_shapes":{"count":5,"first":1,"last":5},"eye_colors":{"count":7,"first":1,"last":7},"noses":{"count":7,"first":1,"last":7},"ear_shapes":{"count":4,"first":1,"last":4}}

### face12OverlapHandling: passed

- Errors: 0
- Warnings: 0
- Details: {"face12RecordCount":1,"selectedEvidence":"video-002:95-100|video-003:0-5"}

### relativePaths: passed

- Errors: 0
- Warnings: 0
- Details: {"portableExternalReferences":11,"repositoryRelativeReferences":324}

### evidenceExistence: passed

- Errors: 0
- Warnings: 0
- Details: {"localDerivativeEvidencePresent":324,"portableSourceMasterReferences":11}

### checksums: passed

- Errors: 0
- Warnings: 0
- Details: {"exportFilesChecked":25,"localEvidenceChecked":324,"sourceMasterHashesChecked":11}

### sourceTimestamps: passed

- Errors: 0
- Warnings: 0
- Details: {"selectedEvidenceRanges":91,"timestampedEvidenceEntries":324,"captureLogEventsChecked":106}

### allowedStatuses: passed

- Errors: 0
- Warnings: 0
- Details: {"packageAllowedVerificationStatuses":["PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED"],"recordAllowedVerificationStatuses":["NOT_VERIFIED","PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED"]}

### researchVersusProductionSeparation: passed

- Errors: 0
- Warnings: 0
- Details: {"dataClass":"PRIMARY_RESEARCH_CANDIDATE","productionStatus":"NOT_PRODUCTION_DATA","forbiddenProductionValueHits":0}

### noFixtureContamination: passed

- Errors: 0
- Warnings: 0
- Details: {"fixtureReferenceMatches":0}

### noCollegeFootball26Contamination: passed

- Errors: 0
- Warnings: 0
- Details: {"collegeFootball26Matches":0}

### noUnsupportedFace30PlusRecords: passed

- Errors: 0
- Warnings: 0
- Details: {"headRecordCount":29,"maxHeadNativeOrder":29,"unsupportedFace30PlusCount":0}

### noFabricatedVersionOrPatch: passed

- Errors: 0
- Warnings: 0
- Details: {"consoleModel":"UNKNOWN","consoleOSVersion":"UNKNOWN","gameExecutableVersion":"UNKNOWN","patchLabel":"UNKNOWN","patchID":"cf27-patch-unknown-video-001","edition":"UNKNOWN","platformName":"Xbox (model UNKNOWN)","gameVersionID":"cf27-version-unknown-video-001"}

### noProductionRecommendationAccess: passed

- Errors: 0
- Warnings: 0
- Details: {"productionCatalogItemCount":0,"productionRecommendationsEnabled":false}

## Production Gate Statement

- The partial research package is not production data.
- Current records are not second-person verified.
- The production catalog remains empty.
- No production recommendation access is enabled.
