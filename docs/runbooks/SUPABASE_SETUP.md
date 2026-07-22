# Supabase Setup Runbook

**Status:** Phase 1 dashboard project creation completed by Wyatt  
**Project name:** `gameface-match`  
**Organization:** Skaggs Systems  
**Secrets in repository:** none  
**Remote connection from app:** not configured  

## Current Completion

Wyatt confirmed that the Supabase project exists and that the project URL, publishable key, server-only API credentials, database password, direct PostgreSQL URL, and pooled PostgreSQL URLs are stored securely outside the repository.

No secrets were pasted into chat. No tables, migrations, Storage buckets, authentication settings, application connections, or database changes were created manually.

## Secret Handling Rules

Never commit or paste:

- Database password
- Direct PostgreSQL connection string
- Pooled PostgreSQL connection string
- Service-role key
- Supabase access token
- Payment server token
- Webhook signing token
- Error-monitoring server token

Browser-safe values still belong in managed environment configuration, not in source code.

## Next User Action

No user action is required for Phase 2 schema design.

Before any later phase uses credentials, applies migrations, configures Storage, or sets environment variables, the assistant must stop and print:

```text
STOP - USER ACTION REQUIRED
```

Then it must provide exact dashboard or password-manager instructions without asking Wyatt to paste secrets into chat.

## Project Configuration To Confirm Later

These will be checked in a future phase before applying migrations:

- Project URL is stored in the password manager.
- Publishable key is stored separately from server-only credentials.
- Service-role key is stored as a secret.
- Direct and pooled PostgreSQL URLs are stored as secrets.
- Spend Cap is enabled or confirmed.
- No unnecessary paid add-ons are enabled.
- Storage buckets do not exist yet unless created by a later approved migration/setup step.
- Auth settings remain unchanged unless Phase 3 explicitly changes them.
