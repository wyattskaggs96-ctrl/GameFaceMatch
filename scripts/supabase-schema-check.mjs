#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const migrationPath = path.join(repositoryRoot, "supabase", "migrations", "0001_gameface_core_schema.sql");
const sql = fs.readFileSync(migrationPath, "utf8");
const normalized = sql.toLowerCase();

const requiredTables = [
  "profiles",
  "app_roles",
  "games",
  "platforms",
  "audit_environments",
  "creation_paths",
  "creation_path_steps",
  "menu_nodes",
  "catalog_records",
  "catalog_record_attributes",
  "source_media",
  "evidence_files",
  "source_timeline_events",
  "record_evidence_links",
  "review_records",
  "catalog_status_transitions",
  "duplicate_relationships",
  "issues",
  "recapture_requests",
  "catalog_releases",
  "catalog_release_items",
  "production_approvals",
  "import_sessions",
  "import_session_errors",
  "match_runs",
  "match_results",
  "private_beta_trial_sessions",
  "private_beta_trial_audit_events",
  "private_beta_trial_feedback",
  "private_beta_trial_uploads",
  "saved_builds",
  "products",
  "prices",
  "entitlements",
  "receipt_references",
  "audit_events"
];

const requiredCatalogStatuses = [
  "RESEARCH_CANDIDATE",
  "PRIMARY_REVIEW_PENDING",
  "PRIMARY_APPROVED_WITH_NOTES",
  "DUPLICATE_REVIEW_REQUIRED",
  "PRIMARY_REJECTED",
  "SECONDARY_REVIEW_PENDING",
  "SECOND_VERIFIED",
  "PRODUCTION_APPROVAL_PENDING",
  "PRODUCTION_APPROVED",
  "PRODUCTION_REJECTED",
  "RETIRED"
];

const requiredSecondVerifierOutcomes = [
  "VERIFIED",
  "VERIFIED_WITH_NOTES",
  "RECAPTURE_REQUIRED",
  "VERSION_MISMATCH",
  "MISSING_EVIDENCE",
  "COUNT_MISMATCH",
  "ORDER_MISMATCH",
  "DEPENDENCY_UNRESOLVED",
  "NOT_VERIFIED"
];

const requiredChecks = [
  "catalog_records_no_fixture_production_status",
  "catalog_records_duplicate_status_consistent",
  "review_records_primary_cannot_production_approve",
  "catalog_status_transitions_automated_cannot_approve_production",
  "catalog_status_transitions_primary_not_final_approval",
  "catalog_release_items_only_production_approved",
  "evidence_files_no_absolute_relative_path",
  "catalog_record_attributes_no_sensitive_trait_keys",
  "private_beta_trial_sessions_no_raw_face_media",
  "private_beta_trial_audit_events_no_media_payload",
  "private_beta_trial_feedback_no_raw_face_media",
  "private_beta_trial_uploads_no_raw_face_media",
  "private_beta_trial_uploads_private_bucket"
];

const errors = [];

for (const table of requiredTables) {
  if (!normalized.includes(`create table public.${table}`)) {
    errors.push(`Missing required table: ${table}`);
  }
  if (!normalized.includes(`alter table public.${table} enable row level security`)) {
    errors.push(`Missing fail-closed RLS enablement: ${table}`);
  }
}

for (const status of requiredCatalogStatuses) {
  if (!sql.includes(`'${status}'`)) errors.push(`Missing catalog status: ${status}`);
}

for (const outcome of requiredSecondVerifierOutcomes) {
  if (!sql.includes(`'${outcome}'`)) errors.push(`Missing second-verifier outcome: ${outcome}`);
}

for (const check of requiredChecks) {
  if (!normalized.includes(check.toLowerCase())) errors.push(`Missing integrity constraint: ${check}`);
}

if (/verified\s+boolean/i.test(sql)) {
  errors.push("Schema must not use a vague verified boolean column.");
}

if (/production_approved\s+boolean/i.test(sql)) {
  errors.push("Schema must not use a vague production_approved boolean column.");
}

if (!normalized.includes("create view public.production_catalog_records")) {
  errors.push("Missing production_catalog_records fail-closed view.");
}

if (!normalized.includes("create view public.production_catalog_records\nwith (security_invoker = true)")) {
  errors.push("production_catalog_records view must be security_invoker so it does not bypass table RLS.");
}

if (!normalized.includes("create view public.production_match_candidates\nwith (security_invoker = true)")) {
  errors.push("production_match_candidates view must be security_invoker so it does not bypass table RLS.");
}

if (!normalized.includes("cr.current_status = 'production_approved'")) {
  errors.push("Production catalog view must require PRODUCTION_APPROVED status.");
}

if (!normalized.includes("rel.release_status = 'approved_release'")) {
  errors.push("Production catalog view must require approved immutable release status.");
}

if (!normalized.includes("cr.duplicate_review_required = false")) {
  errors.push("Production catalog view must exclude duplicate-review-required records.");
}

if (!normalized.includes("is_automated and new_status = 'production_approved'")) {
  errors.push("Status transition guard must block automated production approval.");
}

if (!normalized.includes("'beta_research'")) {
  errors.push("Missing non-production beta_research data source type.");
}

if (!normalized.includes("'private-beta-game-results'")) {
  errors.push("Missing private-beta game-result Storage bucket configuration.");
}

if (!normalized.includes("revoke all on public.private_beta_trial_sessions from anon, authenticated")) {
  errors.push("Private-beta trial sessions must revoke direct browser role access.");
}

if (!normalized.includes("create policy private_beta_trial_sessions_trusted_server_only")) {
  errors.push("Missing trusted-server-only policy for private-beta trial sessions.");
}

if (!normalized.includes("storage.buckets") || !normalized.includes("public = false")) {
  errors.push("Private-beta Storage bucket must be configured as private.");
}

if (errors.length > 0) {
  console.error("Supabase schema contract check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Supabase schema contract OK (${requiredTables.length} tables, ${requiredCatalogStatuses.length} catalog statuses).`);
