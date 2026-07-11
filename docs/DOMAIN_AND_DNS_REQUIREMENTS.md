# Domain And DNS Requirements

## Recommended structure

Keep the Skaggs Systems marketing site in Squarespace and host GameFace Match on a dedicated HTTPS subdomain.

Candidate subdomains:

- `gameface.skaggssystems.com`
- `app.skaggssystems.com`
- `match.skaggssystems.com`

The owner must choose the public URL before deployment.

## DNS records

Exact DNS records depend on the selected app host. Common patterns include:

- CNAME from the app subdomain to the hosting provider target
- A or AAAA records if the host supplies fixed IPs
- TXT records for domain verification
- CAA records if certificate issuance is restricted

Do not change DNS until the owner provides registrar/DNS access process and approves the final host.

## HTTPS and certificates

The app must be served over HTTPS for browser camera access outside localhost. Certificate provisioning should be handled by the selected host or DNS/CDN provider.

## Base URL configuration

Set `NEXT_PUBLIC_GAMEFACE_APP_BASE_URL` to the final HTTPS app URL.

Set public legal/support URLs:

- `NEXT_PUBLIC_GAMEFACE_PRIVACY_URL`
- `NEXT_PUBLIC_GAMEFACE_TERMS_URL`
- `NEXT_PUBLIC_GAMEFACE_SUPPORT_URL`

## Cookie and origin decisions

The current MVP does not need cookies. Future paid access may need account/session decisions. Keep payment cookies and app cookies first-party where possible, and avoid iframe-dependent third-party cookie behavior.

## Owner information required

- Domain registrar or DNS host
- Whether Squarespace manages DNS
- Desired app subdomain
- Approval to create DNS records
- Hosting provider DNS instructions after provider selection
- Certificate/HTTPS requirements if not automatic
- Existing DNS records that must not be disrupted
