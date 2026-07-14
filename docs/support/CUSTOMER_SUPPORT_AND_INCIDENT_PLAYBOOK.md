# Customer Support And Incident Playbook

Status: launch-readiness workflow draft. Human review is required before sending any support response that involves privacy, child safety, payments, legal complaints, catalog correctness, or incidents.

Machine-readable source: `data/support/customer_support_workflows.json`.

GameFace Match must continue to communicate:

> GameFace Match recommends the closest available in-game appearance settings. It does not directly import your face into College Football 27.

Current catalog state:

> Verified College Football 27 catalog not loaded.

Independent-app language:

> GameFace Match is an independent companion application and is not affiliated with, endorsed by, or sponsored by Electronic Arts or EA SPORTS.

## Operating Rules

- Do not automate sensitive responses without human review.
- Do not request face images, created-player screenshots with faces, passwords, payment credentials, recovery codes, API keys, sensitive traits, identity labels, or raw biometric media through ordinary support.
- Do not invent College Football 27 options, labels, indices, menu paths, presets, sliders, hairstyles, facial-hair options, counts, patch behavior, or platform differences.
- Do not tell a user that an unverified catalog option is correct.
- Do not promise deletion outside app-controlled local data.
- Do not promise refunds, payment restoration, or entitlement changes without an approved provider record and policy.
- Do not admit or deny legal liability for trademark, child-safety, privacy, or data-incident claims without owner and counsel review.
- Preserve non-sensitive evidence for incidents. Do not preserve raw face media in ordinary support records.

## Severity Levels

| Severity | Meaning | Required action |
| --- | --- | --- |
| S0 | Critical privacy, safety, legal, or data-integrity incident | Stop affected path where possible, preserve non-sensitive evidence, notify Wyatt, and assign a human incident owner same day. |
| S1 | Launch or beta blocker | Pause affected workflow or cohort until mitigation, rollback, or user guidance is approved. |
| S2 | Major support issue | Triage, assign owner, and decide hotfix versus documented workaround. |
| S3 | Routine support issue | Track for routine support response or next iteration. |

## Intake Rules

Collect only the minimum information needed for support:

- Device, OS, browser, and whether the page used a secure context.
- App screen or flow area.
- Exact non-sensitive error text.
- Catalog version, platform, mode, creation path, and build-guide step when relevant.
- Provider receipt reference only when payments exist; never card numbers.
- Whether raw media, screenshots, or child data were involved, without collecting the media itself.
- User-requested action.

## Workflows And Templates

### Incorrect Recommendation

Severity: S1.

First response draft:

> Thanks for reporting a recommendation issue. We will review the catalog version, platform, mode, and build-guide step before making any claim about the correct game setting. Please do not send face images through support.

Escalate to the catalog manager when a verified option, rank, or build step may be wrong. Escalate to S0 if an unverified or fixture option reached a production user. Never guess or suggest a replacement option without verified catalog evidence.

### Catalog Option Missing

Severity: S2.

First response draft:

> Thanks for flagging a possible missing catalog option. Catalog additions require direct shipping-game evidence and verification before they can appear in recommendations.

Route to catalog audit. Keep the option unavailable in production until direct evidence, second verification, catalog-manager review, and production gates pass.

### Patch Changed Menu

Severity: S1.

First response draft:

> Thanks for reporting a possible game update or menu change. We will compare it with the catalog version and block stale recommendations if the change affects verified build steps.

Escalate to the catalog release manager. Do not silently edit immutable releases. If the patch breaks reproducibility for production recommendations, block affected recommendations until a new verified catalog release exists.

### Payment Issue

Severity: S2.

First response draft:

> Thanks for reporting a payment issue. Live checkout is not connected yet unless the owner has separately approved a provider. Please do not send card numbers, passwords, or payment credentials.

Use provider-backed records only after a provider is approved. Until then, confirm checkout is unavailable and do not alter entitlements.

### Capture Failure

Severity: S2.

First response draft:

> Thanks for reporting capture trouble. Please try the upload fallback for the affected angle and avoid sending face photos to support. We can diagnose with device, browser, permission state, and the on-screen error text.

Escalate primary iPhone Safari or Android Chrome failures to product engineering. Escalate accessibility blockers if the user cannot complete capture with fallback or extended timing.

### Deletion Request

Severity: S1.

First response draft:

> We can help with deletion for app-controlled local data. Use Privacy Center to delete the active scan, screenshots, saved profiles, saved builds, or all local data. Do not send face images in the support request.

Escalate to S0 if app-controlled deletion materially fails or the user reports unexpected retained face media. Do not promise deletion of files saved outside the app or messages already sent through unapproved channels.

### Privacy Concern

Severity: S0.

First response draft:

> Thank you for raising a privacy concern. A human reviewer will assess it before any response is finalized. Please do not send face images, sensitive traits, or identity documents through support.

Escalate immediately to Wyatt, privacy owner, and legal review if user rights, biometric privacy, child privacy, deletion, retention, or notification obligations may apply.

### Trademark Complaint

Severity: S0.

First response draft:

> We have received your trademark concern and will route it for human review. GameFace Match is intended to be an independent companion application and does not claim affiliation with EA.

Escalate to Wyatt and legal review. Preserve the reported page or asset. Do not admit liability or reject the complaint without counsel-reviewed language.

### Child-Safety Concern

Severity: S0.

First response draft:

> Thank you for reporting a child-safety concern. A human reviewer will handle this before any substantive response. Please do not send images of a child or other sensitive material through support.

Escalate immediately to Wyatt, privacy owner, and legal review. Pause affected beta participation if consent is unclear. Do not request or retain child face media through support.

### Data Incident

Severity: S0.

First response draft:

> We are reviewing a reported data incident. A human incident owner will assess containment, affected data categories, and notification obligations before any external response.

Notify Wyatt immediately. Stop the affected path if raw media, secrets, or user data may be exposed. Preserve non-sensitive logs. Do not send automated incident notices.

### Accessibility Problem

Severity: S2.

First response draft:

> Thanks for reporting an accessibility barrier. We can investigate with device, browser, assistive technology, flow area, and the barrier description. Please avoid sending face media.

Escalate to S1 if onboarding, consent, capture, deletion, or results cannot be completed with assistive technology. Do not blame the user or require a full capture restart as the only recovery.

### Unsupported Device

Severity: S3.

First response draft:

> Thanks for checking device support. GameFace Match web capture works best in supported modern mobile browsers over a secure context. If camera capture is unavailable, use upload fallback where possible.

Do not claim support for untested browsers, embedded web views, or browser capture equivalent to native TrueDepth.

### Refund Request

Severity: S2.

First response draft:

> Thanks for contacting us about a refund. Checkout is not connected yet unless the owner has approved a provider. Please do not send card numbers or payment credentials; use only provider receipt references when available.

Escalate to Wyatt until final refund policy and provider process are approved. Do not promise refunds outside the approved policy or provider capability.

## Escalation Contacts To Define Before Launch

- Wyatt owner escalation.
- Privacy owner.
- Security or incident owner.
- Catalog manager.
- Payment provider owner.
- Legal counsel contact.
- Accessibility reviewer.
- Hosting provider contact, if deployed later.

Do not publish or invite testers until these contacts and response-time expectations are approved.

## Closeout Record

Every S0, S1, refund, deletion, privacy, child-safety, trademark, payment, and catalog-integrity issue needs a closeout record containing:

- Issue ID.
- Reporter channel and date.
- Severity.
- Affected version, catalog version, or commit where applicable.
- Data categories involved.
- Whether raw media was involved.
- Human reviewer.
- Containment action.
- Resolution.
- User response sent.
- Follow-up prevention.
