-- GameFace Match Supabase core schema
-- Phase 2 local design artifact. This file has not been applied to a remote project.
-- It intentionally preserves research, fixture, verification, and production boundaries.

create extension if not exists pgcrypto;

create type public.data_source_type as enum (
  'production',
  'research',
  'research_candidate',
  'shipping_game_video_research',
  'public_source_only',
  'test_fixture',
  'demo_data',
  'local_developer_sample'
);

create type public.catalog_record_status as enum (
  'RESEARCH_CANDIDATE',
  'PRIMARY_REVIEW_PENDING',
  'PRIMARY_APPROVED_WITH_NOTES',
  'DUPLICATE_REVIEW_REQUIRED',
  'PRIMARY_REJECTED',
  'SECONDARY_REVIEW_PENDING',
  'SECOND_VERIFIED',
  'PRODUCTION_APPROVAL_PENDING',
  'PRODUCTION_APPROVED',
  'PRODUCTION_REJECTED',
  'RETIRED'
);

create type public.review_stage as enum (
  'primary',
  'secondary',
  'catalog_manager',
  'system_validation'
);

create type public.review_outcome_status as enum (
  'PRIMARY_REVIEW_PENDING',
  'PRIMARY_APPROVED_WITH_NOTES',
  'DUPLICATE_REVIEW_REQUIRED',
  'PRIMARY_REJECTED',
  'VERIFIED',
  'VERIFIED_WITH_NOTES',
  'RECAPTURE_REQUIRED',
  'VERSION_MISMATCH',
  'MISSING_EVIDENCE',
  'COUNT_MISMATCH',
  'ORDER_MISMATCH',
  'DEPENDENCY_UNRESOLVED',
  'NOT_VERIFIED',
  'PRODUCTION_APPROVAL_PENDING',
  'PRODUCTION_APPROVED',
  'PRODUCTION_REJECTED'
);

create type public.evidence_access_classification as enum (
  'private_source',
  'private_review',
  'derived_review',
  'public_release_metadata',
  'test_only'
);

create type public.catalog_release_status as enum (
  'draft',
  'review_candidate',
  'verification_candidate',
  'approved_release',
  'superseded_release',
  'rejected_release'
);

create type public.app_role as enum (
  'owner_admin',
  'catalog_reviewer',
  'second_verifier',
  'read_only_reviewer',
  'private_beta_customer',
  'trusted_server_process'
);

create type public.actor_type as enum (
  'owner_admin',
  'catalog_reviewer',
  'second_verifier',
  'read_only_reviewer',
  'private_beta_customer',
  'trusted_server_process',
  'automated_validator'
);

create type public.issue_status as enum (
  'open',
  'blocked',
  'resolved',
  'rejected',
  'retired'
);

create table public.profiles (
  id uuid primary key,
  display_name text,
  created_at timestamptz not null default now(),
  disabled_at timestamptz,
  constraint profiles_display_name_not_blank check (display_name is null or length(trim(display_name)) > 0)
);

create table public.app_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  reason text,
  constraint app_roles_revoked_after_granted check (revoked_at is null or revoked_at >= granted_at)
);

create unique index app_roles_one_active_role_per_user
  on public.app_roles(user_id, role)
  where revoked_at is null;

create table public.games (
  id text primary key,
  title text not null,
  publisher text,
  source_policy text not null default 'direct_shipping_game_evidence_required',
  created_at timestamptz not null default now(),
  constraint games_id_not_blank check (length(trim(id)) > 0),
  constraint games_title_not_blank check (length(trim(title)) > 0)
);

create table public.platforms (
  id text primary key,
  platform_family text not null,
  platform_label text not null,
  created_at timestamptz not null default now(),
  constraint platforms_id_not_blank check (length(trim(id)) > 0)
);

create table public.audit_environments (
  environment_id text primary key,
  game_id text not null references public.games(id),
  platform_id text not null references public.platforms(id),
  game_version text,
  patch_version text,
  mode text not null,
  creation_path_label text,
  environment_status public.catalog_record_status not null default 'RESEARCH_CANDIDATE',
  unresolved_fields jsonb not null default '[]'::jsonb,
  evidence_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint audit_environments_id_not_blank check (length(trim(environment_id)) > 0),
  constraint audit_environments_mode_not_blank check (length(trim(mode)) > 0),
  constraint audit_environments_production_requires_version_patch check (
    environment_status <> 'PRODUCTION_APPROVED'
    or (game_version is not null and patch_version is not null)
  )
);

create table public.creation_paths (
  creation_path_id text primary key,
  environment_id text not null references public.audit_environments(environment_id),
  mode text not null,
  path_label text not null,
  status public.catalog_record_status not null default 'RESEARCH_CANDIDATE',
  evidence_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint creation_paths_id_not_blank check (length(trim(creation_path_id)) > 0)
);

create table public.creation_path_steps (
  step_id uuid primary key default gen_random_uuid(),
  creation_path_id text not null references public.creation_paths(creation_path_id) on delete cascade,
  step_number integer not null,
  visible_label text,
  action text not null,
  evidence_id text,
  notes text,
  constraint creation_path_steps_positive_step check (step_number > 0),
  constraint creation_path_steps_action_not_blank check (length(trim(action)) > 0),
  unique (creation_path_id, step_number)
);

create table public.menu_nodes (
  menu_id text primary key,
  parent_menu_id text references public.menu_nodes(menu_id),
  environment_id text references public.audit_environments(environment_id),
  display_label text not null,
  native_label text,
  native_order integer,
  control_type text,
  completeness_status text not null default 'PARTIAL',
  source_type public.data_source_type not null default 'research_candidate',
  evidence_summary jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  constraint menu_nodes_id_not_blank check (length(trim(menu_id)) > 0),
  constraint menu_nodes_display_label_not_blank check (length(trim(display_label)) > 0),
  constraint menu_nodes_native_order_positive check (native_order is null or native_order > 0)
);

create index menu_nodes_parent_idx on public.menu_nodes(parent_menu_id);
create index menu_nodes_environment_idx on public.menu_nodes(environment_id);

create table public.catalog_records (
  catalog_record_id text primary key,
  game_id text not null references public.games(id),
  platform_id text references public.platforms(id),
  environment_id text references public.audit_environments(environment_id),
  creation_path_id text references public.creation_paths(creation_path_id),
  menu_id text references public.menu_nodes(menu_id),
  category text not null,
  native_label text,
  native_index integer,
  native_order integer,
  source_type public.data_source_type not null,
  current_status public.catalog_record_status not null default 'RESEARCH_CANDIDATE',
  duplicate_review_required boolean not null default false,
  production_blocked_reason text,
  record_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_records_id_not_blank check (length(trim(catalog_record_id)) > 0),
  constraint catalog_records_category_not_blank check (length(trim(category)) > 0),
  constraint catalog_records_native_index_positive check (native_index is null or native_index > 0),
  constraint catalog_records_native_order_positive check (native_order is null or native_order > 0),
  constraint catalog_records_duplicate_status_consistent check (
    duplicate_review_required = false or current_status = 'DUPLICATE_REVIEW_REQUIRED'
  ),
  constraint catalog_records_no_fixture_production_status check (
    current_status <> 'PRODUCTION_APPROVED'
    or source_type = 'production'
  )
);

create index catalog_records_category_idx on public.catalog_records(category);
create index catalog_records_status_idx on public.catalog_records(current_status);
create index catalog_records_source_type_idx on public.catalog_records(source_type);

create table public.catalog_record_attributes (
  attribute_id uuid primary key default gen_random_uuid(),
  catalog_record_id text not null references public.catalog_records(catalog_record_id) on delete cascade,
  attribute_key text not null,
  attribute_value jsonb not null,
  source_type public.data_source_type not null,
  evidence_id text,
  created_at timestamptz not null default now(),
  constraint catalog_record_attributes_key_not_blank check (length(trim(attribute_key)) > 0),
  constraint catalog_record_attributes_no_sensitive_trait_keys check (
    lower(attribute_key) not in (
      'race',
      'ethnicity',
      'attractiveness',
      'personality',
      'intelligence',
      'health',
      'criminality',
      'identity',
      'celebrity_resemblance'
    )
  )
);

create index catalog_record_attributes_record_idx on public.catalog_record_attributes(catalog_record_id);

create table public.source_media (
  source_media_id text primary key,
  original_filename text not null,
  canonical_filename text,
  storage_bucket text,
  object_path text,
  sha256 text not null,
  size_bytes bigint not null,
  duration_seconds numeric,
  width integer,
  height integer,
  frame_rate numeric,
  video_codec text,
  audio_codec text,
  media_container text,
  opens_successfully boolean not null default false,
  duplicate_of text references public.source_media(source_media_id),
  source_type public.data_source_type not null default 'shipping_game_video_research',
  created_at timestamptz not null default now(),
  constraint source_media_id_not_blank check (length(trim(source_media_id)) > 0),
  constraint source_media_filename_not_blank check (length(trim(original_filename)) > 0),
  constraint source_media_sha256_format check (sha256 ~ '^[a-f0-9]{64}$'),
  constraint source_media_size_nonnegative check (size_bytes >= 0),
  constraint source_media_dimensions_positive check (
    (width is null or width > 0) and (height is null or height > 0)
  )
);

create index source_media_sha256_idx on public.source_media(sha256);

create table public.evidence_files (
  evidence_id text primary key,
  source_media_id text references public.source_media(source_media_id),
  storage_bucket text,
  object_path text,
  original_filename text,
  relative_path text,
  sha256 text not null,
  size_bytes bigint not null,
  mime_type text not null,
  access_classification public.evidence_access_classification not null,
  source_type public.data_source_type not null,
  verification_status public.catalog_record_status not null default 'RESEARCH_CANDIDATE',
  source_timestamp_seconds numeric,
  retention_status text not null default 'active',
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint evidence_files_id_not_blank check (length(trim(evidence_id)) > 0),
  constraint evidence_files_sha256_format check (sha256 ~ '^[a-f0-9]{64}$'),
  constraint evidence_files_size_nonnegative check (size_bytes >= 0),
  constraint evidence_files_mime_not_blank check (length(trim(mime_type)) > 0),
  constraint evidence_files_has_portable_reference check (
    object_path is not null or relative_path is not null
  ),
  constraint evidence_files_no_absolute_relative_path check (
    relative_path is null or (relative_path !~ '^/' and relative_path !~ '\\.\\.')
  ),
  constraint evidence_files_no_public_private_source check (
    access_classification <> 'private_source'
    or storage_bucket is null
    or storage_bucket = 'catalog-source-videos'
  )
);

create index evidence_files_sha256_idx on public.evidence_files(sha256);
create index evidence_files_source_media_idx on public.evidence_files(source_media_id);

create table public.source_timeline_events (
  timeline_event_id text primary key,
  source_media_id text not null references public.source_media(source_media_id),
  start_timestamp_seconds numeric not null,
  end_timestamp_seconds numeric,
  event_type text not null,
  parent_menu text,
  visible_menu_label text,
  visible_option_label text,
  visible_option_index integer,
  observed_action text,
  confidence numeric not null default 0,
  transition_active boolean not null default false,
  blur_present boolean not null default false,
  obstruction_present boolean not null default false,
  usable_for_count boolean not null default false,
  usable_for_order boolean not null default false,
  usable_for_visual_analysis boolean not null default false,
  evidence_id text references public.evidence_files(evidence_id),
  notes text,
  constraint source_timeline_events_time_nonnegative check (start_timestamp_seconds >= 0),
  constraint source_timeline_events_end_after_start check (end_timestamp_seconds is null or end_timestamp_seconds >= start_timestamp_seconds),
  constraint source_timeline_events_confidence_range check (confidence >= 0 and confidence <= 1)
);

create index source_timeline_events_media_time_idx on public.source_timeline_events(source_media_id, start_timestamp_seconds);

create table public.record_evidence_links (
  id uuid primary key default gen_random_uuid(),
  catalog_record_id text not null references public.catalog_records(catalog_record_id) on delete cascade,
  evidence_id text not null references public.evidence_files(evidence_id),
  view_label text,
  evidence_role text not null,
  support_level text not null default 'supporting',
  created_at timestamptz not null default now(),
  unique (catalog_record_id, evidence_id, evidence_role)
);

create table public.review_records (
  review_id uuid primary key default gen_random_uuid(),
  catalog_record_id text not null references public.catalog_records(catalog_record_id),
  review_stage public.review_stage not null,
  outcome public.review_outcome_status not null,
  reviewer_id uuid references public.profiles(id),
  reviewed_at timestamptz not null default now(),
  evidence_id text references public.evidence_files(evidence_id),
  reason text,
  notes text,
  import_session_id uuid,
  created_at timestamptz not null default now(),
  constraint review_records_secondary_outcomes check (
    review_stage <> 'secondary'
    or outcome in (
      'VERIFIED',
      'VERIFIED_WITH_NOTES',
      'RECAPTURE_REQUIRED',
      'VERSION_MISMATCH',
      'MISSING_EVIDENCE',
      'COUNT_MISMATCH',
      'ORDER_MISMATCH',
      'DEPENDENCY_UNRESOLVED',
      'NOT_VERIFIED'
    )
  ),
  constraint review_records_primary_cannot_production_approve check (
    review_stage <> 'primary' or outcome <> 'PRODUCTION_APPROVED'
  )
);

create index review_records_record_idx on public.review_records(catalog_record_id);
create index review_records_stage_outcome_idx on public.review_records(review_stage, outcome);

create table public.import_sessions (
  import_session_id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  source_artifact text not null,
  dry_run boolean not null default true,
  started_by uuid references public.profiles(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'started',
  summary_json jsonb not null default '{}'::jsonb,
  constraint import_sessions_source_not_blank check (length(trim(source_artifact)) > 0),
  constraint import_sessions_completed_after_started check (completed_at is null or completed_at >= started_at)
);

alter table public.review_records
  add constraint review_records_import_session_fk
  foreign key (import_session_id) references public.import_sessions(import_session_id);

create table public.catalog_status_transitions (
  transition_id uuid primary key default gen_random_uuid(),
  catalog_record_id text not null references public.catalog_records(catalog_record_id),
  previous_status public.catalog_record_status,
  new_status public.catalog_record_status not null,
  actor_id uuid references public.profiles(id),
  actor_type public.actor_type not null,
  occurred_at timestamptz not null default now(),
  reason text not null,
  evidence_id text references public.evidence_files(evidence_id),
  import_session_id uuid references public.import_sessions(import_session_id),
  is_automated boolean not null default false,
  metadata_json jsonb not null default '{}'::jsonb,
  constraint catalog_status_transitions_reason_not_blank check (length(trim(reason)) > 0),
  constraint catalog_status_transitions_automated_cannot_approve_production check (
    not (is_automated and new_status = 'PRODUCTION_APPROVED')
  ),
  constraint catalog_status_transitions_primary_not_final_approval check (
    actor_type <> 'catalog_reviewer' or new_status <> 'PRODUCTION_APPROVED'
  )
);

create index catalog_status_transitions_record_time_idx on public.catalog_status_transitions(catalog_record_id, occurred_at);

create table public.duplicate_relationships (
  duplicate_relationship_id uuid primary key default gen_random_uuid(),
  catalog_record_id text not null references public.catalog_records(catalog_record_id),
  related_catalog_record_id text not null references public.catalog_records(catalog_record_id),
  relationship_type text not null,
  status public.catalog_record_status not null default 'DUPLICATE_REVIEW_REQUIRED',
  evidence_id text references public.evidence_files(evidence_id),
  notes text,
  created_at timestamptz not null default now(),
  constraint duplicate_relationships_not_self check (catalog_record_id <> related_catalog_record_id),
  unique (catalog_record_id, related_catalog_record_id, relationship_type)
);

create table public.issues (
  issue_id text primary key,
  issue_type text not null,
  severity text not null,
  status public.issue_status not null default 'open',
  affected_catalog_record_id text references public.catalog_records(catalog_record_id),
  affected_evidence_id text references public.evidence_files(evidence_id),
  resolution_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint issues_id_not_blank check (length(trim(issue_id)) > 0),
  constraint issues_resolved_at_required_when_resolved check (
    status <> 'resolved' or resolved_at is not null
  )
);

create table public.recapture_requests (
  capture_request_id text primary key,
  issue_id text references public.issues(issue_id),
  category text not null,
  priority text not null,
  objective text not null,
  acceptance_criteria jsonb not null default '[]'::jsonb,
  status text not null default 'open',
  owner text not null default 'Wyatt',
  created_at timestamptz not null default now(),
  constraint recapture_requests_id_not_blank check (length(trim(capture_request_id)) > 0)
);

create table public.catalog_releases (
  release_id text primary key,
  version text not null,
  game_id text not null references public.games(id),
  platform_id text references public.platforms(id),
  environment_id text references public.audit_environments(environment_id),
  release_status public.catalog_release_status not null,
  manifest_checksum text,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  release_notes text,
  created_at timestamptz not null default now(),
  constraint catalog_releases_id_not_blank check (length(trim(release_id)) > 0),
  constraint catalog_releases_approved_release_requires_approval check (
    release_status <> 'approved_release'
    or (approved_by is not null and approved_at is not null and manifest_checksum is not null)
  )
);

create table public.catalog_release_items (
  release_id text not null references public.catalog_releases(release_id) on delete cascade,
  catalog_record_id text not null references public.catalog_records(catalog_record_id),
  record_checksum text not null,
  included_status public.catalog_record_status not null,
  created_at timestamptz not null default now(),
  primary key (release_id, catalog_record_id),
  constraint catalog_release_items_only_production_approved check (included_status = 'PRODUCTION_APPROVED')
);

create table public.production_approvals (
  production_approval_id uuid primary key default gen_random_uuid(),
  catalog_record_id text not null references public.catalog_records(catalog_record_id),
  release_id text references public.catalog_releases(release_id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz not null default now(),
  approval_status public.review_outcome_status not null,
  reason text not null,
  evidence_id text references public.evidence_files(evidence_id),
  constraint production_approvals_final_status check (
    approval_status in ('PRODUCTION_APPROVED', 'PRODUCTION_REJECTED')
  ),
  constraint production_approvals_reason_not_blank check (length(trim(reason)) > 0)
);

create table public.import_session_errors (
  error_id uuid primary key default gen_random_uuid(),
  import_session_id uuid not null references public.import_sessions(import_session_id) on delete cascade,
  entity_id text,
  error_code text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table public.match_runs (
  match_run_id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  profile_id text,
  catalog_release_id text references public.catalog_releases(release_id),
  algorithm_version text not null,
  status text not null,
  unavailable_reason text,
  created_at timestamptz not null default now(),
  constraint match_runs_algorithm_not_blank check (length(trim(algorithm_version)) > 0),
  constraint match_runs_release_required_for_completed check (
    status <> 'completed' or catalog_release_id is not null
  )
);

create table public.match_results (
  match_result_id uuid primary key default gen_random_uuid(),
  match_run_id uuid not null references public.match_runs(match_run_id) on delete cascade,
  rank integer not null,
  catalog_record_id text not null references public.catalog_records(catalog_record_id),
  score numeric not null,
  confidence numeric not null,
  explanation_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint match_results_rank_top_three check (rank between 1 and 3),
  constraint match_results_score_range check (score >= 0 and score <= 1),
  constraint match_results_confidence_range check (confidence >= 0 and confidence <= 1),
  unique (match_run_id, rank)
);

create table public.saved_builds (
  saved_build_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  match_run_id uuid references public.match_runs(match_run_id),
  catalog_release_id text references public.catalog_releases(release_id),
  build_json jsonb not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint saved_builds_release_required check (catalog_release_id is not null or match_run_id is null)
);

create table public.products (
  product_id text primary key,
  name text not null,
  purchase_type text not null,
  active boolean not null default false,
  metadata_json jsonb not null default '{}'::jsonb
);

create table public.prices (
  price_id text primary key,
  product_id text not null references public.products(product_id),
  currency text not null,
  amount_minor integer not null,
  active boolean not null default false,
  provider_price_ref text,
  constraint prices_amount_nonnegative check (amount_minor >= 0)
);

create table public.entitlements (
  entitlement_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  entitlement_key text not null,
  status text not null,
  source text not null,
  granted_by uuid references public.profiles(id),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint entitlements_key_not_blank check (length(trim(entitlement_key)) > 0),
  constraint entitlements_revoked_or_expired_not_active check (
    status <> 'active' or revoked_at is null
  )
);

create table public.receipt_references (
  receipt_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  provider text not null,
  provider_reference text not null,
  product_id text references public.products(product_id),
  price_id text references public.prices(price_id),
  payment_status text not null,
  refund_status text not null default 'notRequested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

create table public.audit_events (
  audit_event_id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  actor_type public.actor_type not null,
  action text not null,
  target_table text not null,
  target_id text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_action_not_blank check (length(trim(action)) > 0),
  constraint audit_events_target_table_not_blank check (length(trim(target_table)) > 0)
);

create view public.production_catalog_records
with (security_invoker = true) as
select cr.*
from public.catalog_records cr
where cr.current_status = 'PRODUCTION_APPROVED'
  and cr.source_type = 'production'
  and cr.duplicate_review_required = false
  and exists (
    select 1
    from public.catalog_release_items cri
    join public.catalog_releases rel on rel.release_id = cri.release_id
    where cri.catalog_record_id = cr.catalog_record_id
      and cri.included_status = 'PRODUCTION_APPROVED'
      and rel.release_status = 'approved_release'
  );

create view public.production_match_candidates
with (security_invoker = true) as
select cr.catalog_record_id,
       cr.game_id,
       cr.platform_id,
       cr.category,
       cr.native_label,
       cr.native_index,
       cr.native_order
from public.production_catalog_records cr;

-- RLS is enabled now so a mistakenly applied schema fails closed.
-- Phase 3 will add named policies and tests before application access.
alter table public.profiles enable row level security;
alter table public.app_roles enable row level security;
alter table public.games enable row level security;
alter table public.platforms enable row level security;
alter table public.audit_environments enable row level security;
alter table public.creation_paths enable row level security;
alter table public.creation_path_steps enable row level security;
alter table public.menu_nodes enable row level security;
alter table public.catalog_records enable row level security;
alter table public.catalog_record_attributes enable row level security;
alter table public.source_media enable row level security;
alter table public.evidence_files enable row level security;
alter table public.source_timeline_events enable row level security;
alter table public.record_evidence_links enable row level security;
alter table public.review_records enable row level security;
alter table public.import_sessions enable row level security;
alter table public.catalog_status_transitions enable row level security;
alter table public.duplicate_relationships enable row level security;
alter table public.issues enable row level security;
alter table public.recapture_requests enable row level security;
alter table public.catalog_releases enable row level security;
alter table public.catalog_release_items enable row level security;
alter table public.production_approvals enable row level security;
alter table public.import_session_errors enable row level security;
alter table public.match_runs enable row level security;
alter table public.match_results enable row level security;
alter table public.saved_builds enable row level security;
alter table public.products enable row level security;
alter table public.prices enable row level security;
alter table public.entitlements enable row level security;
alter table public.receipt_references enable row level security;
alter table public.audit_events enable row level security;
