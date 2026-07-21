export interface RollbackReadinessInput {
  currentReleaseID: string;
  targetReleaseID?: string | null;
  targetBuildArtifactAvailable: boolean;
  targetCatalogManifestAvailable: boolean;
  operatorApprovalRecorded: boolean;
}

export interface RollbackReadinessReport {
  ready: boolean;
  blockers: string[];
  steps: string[];
}

export function createRollbackReadinessReport(input: RollbackReadinessInput): RollbackReadinessReport {
  const blockers: string[] = [];
  if (!input.targetReleaseID) blockers.push("No target release ID was supplied.");
  if (input.targetReleaseID && input.targetReleaseID === input.currentReleaseID) blockers.push("Rollback target must differ from the current release.");
  if (!input.targetBuildArtifactAvailable) blockers.push("Rollback target build artifact is not available.");
  if (!input.targetCatalogManifestAvailable) blockers.push("Rollback target catalog manifest is not available.");
  if (!input.operatorApprovalRecorded) blockers.push("Owner or release-manager rollback approval has not been recorded.");

  return {
    ready: blockers.length === 0,
    blockers,
    steps: [
      "Freeze new releases and preserve current logs.",
      "Confirm the rollback target release ID and catalog manifest checksum.",
      "Disable recommendations with the deployment kill switch if catalog safety is uncertain.",
      "Redeploy the previous build artifact through the hosting provider dashboard.",
      "Verify /api/health and /api/uptime on the rollback URL.",
      "Run production smoke tests against the rollback URL.",
      "Record the rollback decision, operator, time, reason, and verification result."
    ]
  };
}
