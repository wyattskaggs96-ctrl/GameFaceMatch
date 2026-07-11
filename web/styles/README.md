# Web Styles

Global responsive styling currently lives in `web/app/globals.css` because the Next.js app router loads global CSS from the app shell.

Reusable React primitives live in `web/components/design-system.tsx` and cover buttons, cards, badges, progress, alerts, empty states, loading states, form fields, dialogs, and step-flow navigation.

Keep reusable design tokens and future style modules here when the visual system grows beyond the initial foundation. Test fixtures and production catalog data must not be copied into `web/public/`.
