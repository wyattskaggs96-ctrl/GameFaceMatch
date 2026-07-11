# Launch Checklist

Do not launch until every required owner decision is complete and the production catalog contains verified records if paid recommendations are offered.

## A. Squarespace website information

- [ ] Current Squarespace site URL
- [ ] Squarespace plan/features relevant to links, custom code, embeds, Commerce, and DNS
- [ ] Whether Squarespace manages DNS or only the marketing site
- [ ] Preferred marketing page copy and call-to-action
- [ ] Whether GameFace Match should appear under Skaggs Systems branding or a separate product brand

## B. Domain and DNS information

- [ ] DNS registrar/provider
- [ ] Existing DNS records that must not be changed
- [ ] Desired app subdomain
- [ ] DNS approval process
- [ ] Certificate/HTTPS expectations if not automatic

## C. Hosting preference

- [ ] Dedicated app subdomain versus independent hosted URL
- [ ] Static export host versus Next-compatible host
- [ ] Whether future server endpoints are expected soon
- [ ] Error monitoring preference
- [ ] Log retention expectations

## D. Payment provider information

- [ ] Provider used by Skaggs Systems
- [ ] Whether provider supports external hosted checkout
- [ ] Whether provider supports API-created checkout sessions
- [ ] Whether provider supports webhooks and signature verification
- [ ] Test-mode process
- [ ] Secure dashboard access process

Do not share passwords, live API secrets, webhook secrets, recovery codes, or payment credentials in chat.

## E. Product and pricing decisions

- [ ] Free beta duration or criteria
- [ ] Whether first paid product is a one-time College Football 27 game pack
- [ ] Exact product names
- [ ] Exact prices and currencies
- [ ] What each purchase unlocks
- [ ] Whether paid access requires accounts

## F. Refund, tax, legal, and support decisions

- [ ] Refund policy
- [ ] Sales-tax responsibility and tooling
- [ ] Terms of purchase
- [ ] Privacy policy
- [ ] Age/minor purchase policy
- [ ] Support email or support URL
- [ ] Chargeback process
- [ ] Cancellation language if subscriptions are ever used

## G. Branding and public URLs

- [ ] Final app URL
- [ ] Privacy URL
- [ ] Terms URL
- [ ] Support URL
- [ ] Public independent-app disclaimer placement
- [ ] Product logo/icon approval

## H. Test-account access process

- [ ] Who can access provider test mode
- [ ] How test credentials are entered securely
- [ ] Who approves test purchases
- [ ] How test webhooks are verified
- [ ] How test entitlements are reset

## I. Production approval process

- [ ] Catalog verification approval
- [ ] Privacy/legal approval
- [ ] Payment-provider approval
- [ ] DNS/hosting approval
- [ ] Final smoke-test approval
- [ ] Go/no-go owner approval

## Local technical checks before launch

- [ ] Type check
- [ ] Lint
- [ ] Unit tests
- [ ] Production build
- [ ] Local production startup
- [ ] Catalog validation
- [ ] Integrity check
- [ ] Fixture-leakage search
- [ ] Secret-exposure search
- [ ] Mobile camera test on final HTTPS origin
