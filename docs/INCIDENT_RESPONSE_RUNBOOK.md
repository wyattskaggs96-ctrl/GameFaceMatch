# Incident Response Runbook

Status: prepared for private-beta operations. This is not a substitute for formal legal or security counsel.

## Severity

- Critical: possible raw face media exposure, fixture/research records shown as production recommendations, payment/secret exposure, or unsupported catalog producing recommendations.
- High: delete-all failure, catalog version mismatch not blocked, screenshot media retained unexpectedly, or privacy copy materially wrong.
- Medium: degraded camera flow, accessibility regression, broken support links, health check degraded for a known reason.
- Low: cosmetic issue, non-blocking copy issue, or internal dashboard problem.

## Immediate Actions

1. Preserve evidence: release ID, catalog version, timestamp, browser/device, and safe logs.
2. Do not copy raw face media, screenshots, precise measurements, landmarks, or profile payloads into tickets.
3. Activate `NEXT_PUBLIC_GAMEFACE_RECOMMENDATIONS_DISABLED=true` if recommendation integrity is uncertain.
4. Activate `NEXT_PUBLIC_GAMEFACE_SCREENSHOT_REFINEMENT_DISABLED=true` if refinement integrity is uncertain.
5. If user data deletion is implicated, guide the tester through Privacy Center delete-all and record only deletion status.
6. Notify Wyatt for Critical or High incidents before public communication.

## Investigation Checklist

- Check `/api/health`.
- Check `/api/uptime`.
- Confirm release ID and catalog version.
- Confirm production catalog manifest origin and checksum.
- Confirm fixture/research data did not enter the production bundle.
- Confirm operational logs contain no raw images, object URLs, base64 data, landmarks, exact measurements, or profile payloads.
- Confirm analytics are local/no-op or provider-approved.

## Communication Rules

- Use independent companion wording.
- Do not promise perfect matches, direct game import, official affiliation, or guaranteed resemblance.
- Do not request secrets or raw face media in support messages.
- Ask for non-sensitive reproduction details: device, browser, release ID, catalog status, and safe error category.

## Closure

An incident is closed only after:

1. Root cause is documented.
2. Fix or rollback is verified.
3. Delete-all behavior is tested when privacy is involved.
4. Catalog gate behavior is rechecked when recommendations are involved.
5. Wyatt approves closure for Critical or High incidents.
