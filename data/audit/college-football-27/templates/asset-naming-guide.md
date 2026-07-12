# Asset Naming Guide

NOT PRODUCTION DATA  
NOT A VERIFIED GAME RECORD

Use deterministic names so assets can be reviewed and verified locally.

## Pattern

Use this token order:

`[REPLACE_WITH_CATALOG_ID]_[REPLACE_WITH_VIEW]_[REPLACE_WITH_GAME_VERSION]_[REPLACE_WITH_PATCH]_[REPLACE_WITH_CAPTURE_DATE_YYYYMMDD].[REPLACE_WITH_EXTENSION]`

The local tooling generates the tokens with safe underscore separators:

`[REPLACE_WITH_CATALOG_ID]_[REPLACE_WITH_VIEW]_[REPLACE_WITH_GAME_VERSION]_[REPLACE_WITH_PATCH]_[REPLACE_WITH_CAPTURE_DATE_YYYYMMDD].png`

Do not use literal `*` characters in stored filenames. They are unsafe on common filesystems.

## Approved View Labels

- `straightOn`
- `left45`
- `right45`
- `leftProfile`
- `rightProfile`
- `front`
- `leftThreeQuarter`
- `rightThreeQuarter`
- `elevated`
- `lowered`
- `rear`
- `fullScreenMenu`
- `navigationEvidence`
- `menuOverview`
- `environment`
- `review`
- `notApplicable`

## Rules

- Do not include user names.
- Do not include guessed game labels.
- Do not overwrite older evidence.
- Keep original evidence under local audit storage until publication review is complete.
- Use rename-plan preview first. Do not destructively rename master evidence without explicit operator confirmation.
