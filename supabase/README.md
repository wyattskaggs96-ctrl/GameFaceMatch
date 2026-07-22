# GameFace Match Supabase Workspace

This folder contains local Supabase design and migration artifacts for GameFace Match.

Current state:

- Supabase project name: `gameface-match`
- Remote project connection: not configured in Git
- Secrets in repository: none
- Migrations applied to Supabase: none from this repository

Rules:

- Do not commit Supabase access tokens, database passwords, direct connection strings, pooled connection strings, service-role keys, payment credentials, or webhook secrets.
- Do not run migrations against the remote project until the user has completed the required dashboard/environment-variable steps.
- Research, fixture, synthetic, demo, and placeholder records must never become production records during import.
- Production recommendations must continue to fail closed unless records are in an approved immutable production catalog release.

Phase ownership:

- Phase 2 defines the data model in local SQL and validates the schema contract statically.
- Phase 3 will add and test Row Level Security policies before any app connection.
- Later phases will add migration/import tooling and Supabase client/server integration.
