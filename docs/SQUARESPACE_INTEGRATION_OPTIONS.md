# Squarespace Integration Options

## Owner context

Skaggs Systems already has a Squarespace website. The exact Squarespace plan, domain setup, Commerce configuration, custom code capability, and payment provider details have not been supplied.

Do not assume Squarespace can directly execute or host the current Next.js application.

## Option 1 — Marketing site remains in Squarespace; app runs on a dedicated subdomain

Example:

- `www.skaggssystems.com` remains Squarespace.
- `gameface.skaggssystems.com` or `app.skaggssystems.com` hosts GameFace Match.

Pros:

- Clean separation between marketing content and app runtime.
- App origin can be configured for HTTPS camera access, CSP, headers, and future server endpoints.
- Avoids iframe camera restrictions.
- Easier to add future payment webhook endpoints or provider-hosted checkout callbacks.

Risks:

- Requires DNS/subdomain configuration.
- Requires a separate app host.
- Cross-domain brand consistency must be managed.

Current recommendation: best fit.

## Option 2 — Squarespace marketing site links to independently hosted app

Example:

- Squarespace button links to an app host URL.

Pros:

- Lowest Squarespace complexity.
- Avoids embedding/camera iframe issues.
- Keeps account-specific Squarespace capabilities mostly irrelevant.

Risks:

- The app may live on a less branded domain unless a custom subdomain is configured.
- Users move between origins.

Good fallback if DNS setup is delayed.

## Option 3 — Embed app in Squarespace

Example:

- Squarespace page uses an iframe or embed block pointing to the app.

Pros:

- Keeps the visual entry point inside the existing website.

Risks:

- Browser camera access in iframes can be blocked or require parent-page permissions.
- CSP `frame-ancestors 'none'` currently blocks embedding.
- Cross-origin iframe storage and permissions are more fragile on mobile browsers.
- Payment provider embeds could add more CSP and cookie complexity.
- Support and privacy expectations become harder to explain.

Not recommended unless mobile camera testing proves it works and security headers are deliberately adjusted.

## Option 4 — Rebuild as native Squarespace pages

This is not appropriate for the current application. Squarespace can host marketing copy, but it should not be assumed to run the current React/Next.js capture app, camera flow, object URL lifecycle, or future entitlement/payment server logic.

## CSP implications

Current app CSP blocks framing and only permits same-origin scripts/styles/media plus blob/data image sources. Embedding in Squarespace would require changing `frame-ancestors`, testing iframe permissions, and potentially allowing provider domains after a payment provider is selected.

## Cross-origin and cookie implications

The current app does not need cookies. Future payments may use provider-hosted checkout, receipts, and webhook events. Embedding can complicate third-party cookies, redirect callbacks, storage access, and mobile browser behavior.

## Mobile camera implications

The safest mobile camera model is a first-party HTTPS app origin, not an embedded iframe. Upload fallback should still work in all deployment models that allow file input.

## Account-specific owner information required

- Squarespace plan and feature set
- Whether custom code/embed blocks are allowed
- Whether Squarespace controls DNS or an external registrar does
- Current payment processor used by Skaggs Systems
- Whether existing provider supports external hosted checkout or API integration
- Whether the owner wants a subdomain, separate app domain, or simple outbound link
