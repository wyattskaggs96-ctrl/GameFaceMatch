export const supabaseRlsPolicySpecVersion = "supabase-rls-policy-spec-v1";

export type SupabaseRole = "anon" | "authenticated" | "service_role";
export type RlsOperation = "select" | "insert" | "update" | "delete";

export interface RlsPolicySpec {
  table: string;
  operation: RlsOperation;
  roles: SupabaseRole[];
  rule: string;
  requiresOwnershipPredicate: boolean;
  allowsProductionApproval: boolean;
  allowsPrivateEvidence: boolean;
}

export const supabaseRlsPolicySpecs: RlsPolicySpec[] = [
  {
    table: "catalog_records",
    operation: "select",
    roles: ["anon", "authenticated"],
    rule: "Read only production-approved records included in approved immutable releases.",
    requiresOwnershipPredicate: false,
    allowsProductionApproval: false,
    allowsPrivateEvidence: false
  },
  {
    table: "evidence_files",
    operation: "select",
    roles: ["authenticated"],
    rule: "Read private evidence metadata only for assigned reviewer roles through server-mediated checks.",
    requiresOwnershipPredicate: false,
    allowsProductionApproval: false,
    allowsPrivateEvidence: true
  },
  {
    table: "review_records",
    operation: "insert",
    roles: ["authenticated"],
    rule: "Primary reviewers can create primary reviews; second verifiers can create secondary reviews; neither can overwrite the other stage.",
    requiresOwnershipPredicate: false,
    allowsProductionApproval: false,
    allowsPrivateEvidence: false
  },
  {
    table: "catalog_status_transitions",
    operation: "insert",
    roles: ["authenticated"],
    rule: "Append-only status transitions; automated actors and primary reviewers cannot set PRODUCTION_APPROVED.",
    requiresOwnershipPredicate: false,
    allowsProductionApproval: false,
    allowsPrivateEvidence: false
  },
  {
    table: "private_beta_trial_sessions",
    operation: "insert",
    roles: ["service_role"],
    rule: "Only trusted server processes may create private-beta trial records after invite and consent validation; raw face media is not stored.",
    requiresOwnershipPredicate: false,
    allowsProductionApproval: false,
    allowsPrivateEvidence: false
  },
  {
    table: "private_beta_trial_sessions",
    operation: "update",
    roles: ["service_role"],
    rule: "Only trusted server processes may update, expire, or delete private-beta trial records; customer-facing deletion is mediated by the server.",
    requiresOwnershipPredicate: false,
    allowsProductionApproval: false,
    allowsPrivateEvidence: false
  },
  {
    table: "private_beta_trial_audit_events",
    operation: "insert",
    roles: ["service_role"],
    rule: "Only trusted server processes may append privacy-safe private-beta persistence and deletion audit events.",
    requiresOwnershipPredicate: false,
    allowsProductionApproval: false,
    allowsPrivateEvidence: false
  },
  {
    table: "private_beta_trial_feedback",
    operation: "insert",
    roles: ["service_role"],
    rule: "Only trusted server processes may persist scrubbed private-beta tester feedback after invite/session authorization.",
    requiresOwnershipPredicate: false,
    allowsProductionApproval: false,
    allowsPrivateEvidence: false
  },
  {
    table: "private_beta_trial_uploads",
    operation: "insert",
    roles: ["service_role"],
    rule: "Only trusted server processes may create private game-result screenshot/photo metadata after invite/session authorization; raw face scan media is not stored.",
    requiresOwnershipPredicate: false,
    allowsProductionApproval: false,
    allowsPrivateEvidence: true
  },
  {
    table: "saved_builds",
    operation: "select",
    roles: ["authenticated"],
    rule: "Customers can read only their own saved non-image builds.",
    requiresOwnershipPredicate: true,
    allowsProductionApproval: false,
    allowsPrivateEvidence: false
  },
  {
    table: "entitlements",
    operation: "insert",
    roles: ["service_role"],
    rule: "Only trusted server processes can create or revoke paid entitlements.",
    requiresOwnershipPredicate: false,
    allowsProductionApproval: false,
    allowsPrivateEvidence: false
  },
  {
    table: "audit_events",
    operation: "insert",
    roles: ["authenticated", "service_role"],
    rule: "Append-only audit events; application roles cannot update or delete audit history.",
    requiresOwnershipPredicate: false,
    allowsProductionApproval: false,
    allowsPrivateEvidence: false
  }
];

export interface RlsPolicySpecValidation {
  ok: boolean;
  errors: string[];
}

export function validateRlsPolicySpecs(specs: RlsPolicySpec[] = supabaseRlsPolicySpecs): RlsPolicySpecValidation {
  const errors: string[] = [];
  for (const spec of specs) {
    if (spec.roles.includes("anon") && spec.allowsPrivateEvidence) {
      errors.push(`${spec.table} exposes private evidence to anon.`);
    }
    if (spec.roles.includes("anon") && spec.operation !== "select") {
      errors.push(`${spec.table} permits anon mutation.`);
    }
    if (spec.allowsProductionApproval) {
      errors.push(`${spec.table} policy specs must not grant production approval directly.`);
    }
    if (spec.requiresOwnershipPredicate && !/own|owner|user/i.test(spec.rule)) {
      errors.push(`${spec.table} requires an ownership predicate but the rule does not describe ownership.`);
    }
  }
  return { ok: errors.length === 0, errors };
}
