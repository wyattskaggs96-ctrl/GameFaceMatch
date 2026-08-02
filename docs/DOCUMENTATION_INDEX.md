# Documentation Index

**Status:** current document map  
**Current operational status source:** `docs/status/CURRENT_PROJECT_STATE.md`

This index explains how to read the repository documentation without mixing binding requirements, current status, historical audits, operational instructions, generated evidence artifacts, and future planning.

## Governing Requirements

Read these before changing catalog, matching, capture, privacy, verification, or production-gate behavior.

| Document | Role |
| --- | --- |
| `AGENTS.md` | Binding contributor rules and current implementation focus. |
| `docs/governance/SOURCE_REGISTRY.md` | Binding source precedence and unrelated-source exclusions. |
| `docs/GAMEFACE_MATCH_SOURCE_OF_TRUTH.md` | Binding product and technical source of truth. |
| `docs/DECISIONS.md` | Accepted and superseded project decisions. |
| `docs/adr/` | Detailed architecture decision records. |
| `docs/GAME_CATALOG_WORKFLOW.md` | Binding catalog workflow and production-data separation. |
| `docs/MATCHING_ENGINE_SPEC.md` | Binding matching behavior requirements. |
| `docs/PRIVACY_IMPLEMENTATION_NOTES.md` | Binding privacy, consent, storage, and deletion requirements. |
| `docs/TEST_PLAN.md` | Binding verification scope when applicable. |

## Current Status

| Document | Role |
| --- | --- |
| `docs/status/CURRENT_PROJECT_STATE.md` | Single authoritative operational status source. |
| `docs/status/PHASE_ZERO_PRIMARY_REVIEW_STATUS.md` | Current primary-review checkpoint for the 85 research candidates. |
| `data/phase-zero/primary_review_status.json` | Machine-readable current candidate and gate authority. |
| `data/phase-zero/primary_review_traceability.json` | Machine-readable current candidate source-video traceability. |
| `data/phase-zero/verifier_candidate_queue.json` | Machine-readable current verifier handoff queue. |

## Historical Audits and Snapshots

These documents are preserved as audit history. They may contain stale counts, stale percentages, or blocker descriptions that were true when written. Do not use them as the current operating source when they conflict with `docs/status/CURRENT_PROJECT_STATE.md`.

| Document | Historical scope |
| --- | --- |
| `docs/status/CURRENT_BUILD_AUDIT.md` | Early current-build audit. |
| `docs/status/CURRENT_PROJECT_COMPLETION_AUDIT.md` | Completion audit baseline before the primary-review checkpoint. |
| `docs/status/CURRENT_PROJECT_STATE_RECONSTRUCTION.md` | State reconstruction after the web/Phase 0 queue. |
| `docs/status/CURRENT_VIDEO_EVIDENCE_OPERATING_LOCK.md` | Video-evidence operating lock snapshot. |
| `docs/status/FINAL_CLEANROOM_AUDIT.md` | Cleanroom audit snapshot. |
| `docs/status/FINAL_PRODUCTION_READINESS_BOARD.md` | Production-readiness board snapshot. |
| `docs/status/FINAL_PROGRAM_CHECKPOINT.md` | Final program checkpoint before primary-review consolidation. |
| `docs/status/OVERNIGHT_VIDEO_EVIDENCE_CLOSEOUT.md` | Overnight video-evidence closeout. |
| `docs/status/PRE_DATA_READINESS_REVIEW.md` | Pre-data readiness review. |
| `docs/status/RELEASE_CANDIDATE_DECISION.md` | Release-candidate no-go decision. |
| `docs/status/MVP_ACCEPTANCE_REVIEW.md` | MVP acceptance review snapshot. |
| `docs/status/WEB_CAPTURE_FLOW_AUDIT.md` | Web capture audit snapshot. |
| `docs/status/WEB_USER_JOURNEY_QA_AUDIT.md` | Web journey QA snapshot. |
| `docs/status/IOS_FOUNDATION_READINESS.md` | Native iOS foundation readiness snapshot. |

## Operational Instructions

| Document | Use |
| --- | --- |
| `docs/phase-zero/WYATT_RECAPTURE_INSTRUCTIONS.md` | Current Xbox recapture checklist for Wyatt. |
| `docs/phase-zero/SECOND_VERIFIER_HANDOFF.md` | Current second-verifier handoff instructions. |
| `docs/phase-zero/SECOND_VERIFIER_INSTRUCTIONS.md` | Verifier package instructions. |
| `docs/AUDIT_OPERATOR_RUNBOOK.md` | Console-audit operator process. |
| `docs/SECOND_VERIFIER_RUNBOOK.md` | Independent verification process. |
| `docs/CATALOG_MANAGER_RUNBOOK.md` | Catalog-manager review and release workflow. |
| `docs/CATALOG_PUBLISHING_RUNBOOK.md` | Production publication workflow. |
| `docs/NON_MUTATING_VERIFICATION.md` | Audit-safe full verification command and generated-file mutation policy. |
| `docs/MOBILE_BROWSER_QA.md` | Mobile browser QA plan. |
| `docs/REAL_DEVICE_TEST_MATRIX.md` | Manual device matrix. |
| `docs/PRIVATE_BETA_RUNBOOK.md` | Private-beta operations plan. |

## Generated Evidence Artifacts

These are machine-readable outputs or generated reports. They are not governing requirements by themselves, but current status documents cite them as evidence.

| Artifact | Role |
| --- | --- |
| `data/phase-zero/video_inventory.json` | Current source-video inventory. |
| `data/phase-zero/video_timeline.json` | Current video timeline events. |
| `data/phase-zero/evidence_manifest.json` | Current evidence manifest. |
| `data/phase-zero/capture_log.json` | Current capture log. |
| `data/phase-zero/issues_register.research.json` | Current issue register. |
| `data/phase-zero/research-catalog-releases/0.1.0-research.1/` | Current research catalog release checkpoint, not production data. |
| `data/catalog/production/catalog_manifest.json` | Active production catalog manifest; currently empty. |
| `data/catalog/production-releases/cf27-production-empty-2026-07-14/` | Empty production release no-go artifacts. |

## Future Planning and Handoff

| Document | Role |
| --- | --- |
| `docs/DEPLOYMENT_READINESS.md` | Deployment audit and requirements. |
| `docs/SQUARESPACE_INTEGRATION_OPTIONS.md` | Squarespace integration options. |
| `docs/DOMAIN_AND_DNS_REQUIREMENTS.md` | Domain/DNS planning. |
| `docs/PAYMENT_PROVIDER_HANDOFF.md` | Payment-provider handoff checklist. |
| `docs/ENVIRONMENT_VARIABLES.md` | Environment-variable naming and exposure rules. |
| `docs/MONETIZATION_DECISION.md` | Monetization recommendation. |
| `docs/PAYMENT_INTEGRATION_REQUIREMENTS.md` | Payment integration requirements. |
| `docs/LEGAL_REVIEW_CHECKLIST.md` | Legal counsel review package. |

## Current Reading Rule

When a document conflicts with current counts or readiness, follow this order:

1. `AGENTS.md`
2. `docs/governance/SOURCE_REGISTRY.md`
3. `docs/GAMEFACE_MATCH_SOURCE_OF_TRUTH.md`
4. `docs/DECISIONS.md` and applicable ADRs
5. `docs/status/CURRENT_PROJECT_STATE.md`
6. Machine-readable artifacts referenced by `docs/status/CURRENT_PROJECT_STATE.md`
7. Historical audits and generated reports as supporting context only
