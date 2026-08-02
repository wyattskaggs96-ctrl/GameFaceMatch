export const supabaseDeletionContractVersion = "supabase-deletion-contract-v1";

export type SupabaseDeletionTarget =
  | "local_session"
  | "saved_profile_metadata"
  | "saved_build"
  | "screenshot_media"
  | "future_storage_objects"
  | "audit_confirmation";

export interface SupabaseDeletionStep {
  target: SupabaseDeletionTarget;
  required: boolean;
  remoteOperation: boolean;
  rawMediaIncluded: boolean;
  description: string;
}

export interface SupabaseDeletionPlan {
  planVersion: typeof supabaseDeletionContractVersion;
  requestID: string;
  requestedAt: string;
  steps: SupabaseDeletionStep[];
  auditConfirmationRequired: true;
}

export function createSupabaseDeletionPlan(input: { requestID: string; requestedAt: string; includeRemoteStorageObjects: boolean }): SupabaseDeletionPlan {
  return {
    planVersion: supabaseDeletionContractVersion,
    requestID: input.requestID,
    requestedAt: input.requestedAt,
    auditConfirmationRequired: true,
    steps: [
      {
        target: "local_session",
        required: true,
        remoteOperation: false,
        rawMediaIncluded: true,
        description: "Clear active in-browser scan/session references, object URLs, and temporary buffers."
      },
      {
        target: "saved_profile_metadata",
        required: true,
        remoteOperation: input.includeRemoteStorageObjects,
        rawMediaIncluded: false,
        description: "Delete derived profile metadata while preserving required audit confirmation."
      },
      {
        target: "saved_build",
        required: true,
        remoteOperation: input.includeRemoteStorageObjects,
        rawMediaIncluded: false,
        description: "Delete saved non-image build records linked to the request."
      },
      {
        target: "screenshot_media",
        required: true,
        remoteOperation: input.includeRemoteStorageObjects,
        rawMediaIncluded: true,
        description: "Delete temporary screenshot-refinement media; screenshots are not saved by default."
      },
      {
        target: "future_storage_objects",
        required: input.includeRemoteStorageObjects,
        remoteOperation: input.includeRemoteStorageObjects,
        rawMediaIncluded: true,
        description: "Delete any future consented private Storage objects linked to the user or session."
      },
      {
        target: "audit_confirmation",
        required: true,
        remoteOperation: input.includeRemoteStorageObjects,
        rawMediaIncluded: false,
        description: "Write a privacy-safe deletion confirmation record without retaining raw media."
      }
    ]
  };
}

export function validateSupabaseDeletionPlan(plan: SupabaseDeletionPlan): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (plan.planVersion !== supabaseDeletionContractVersion) errors.push("Unexpected deletion plan version.");
  if (!plan.auditConfirmationRequired) errors.push("Deletion plan must require audit confirmation.");
  if (!plan.steps.some((step) => step.target === "local_session" && step.required)) errors.push("Local session deletion is required.");
  if (!plan.steps.some((step) => step.target === "audit_confirmation" && step.required)) errors.push("Audit confirmation is required.");
  return { ok: errors.length === 0, errors };
}
