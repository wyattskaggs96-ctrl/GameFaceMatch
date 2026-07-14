import { CATALOG_UNAVAILABLE_MESSAGE, INDEPENDENT_APP_DISCLAIMER, PRODUCT_EXPLANATION } from "@/lib/product-copy";

export const REQUIRED_LAUNCH_MESSAGES = [
  "Build yourself in College Football 27",
  "Get your closest available in-game appearance",
  "Top-three verified matches",
  "Manual step-by-step build guide",
  "Independent companion application",
  "No direct game import",
  "Not affiliated with EA"
] as const;

export const LAUNCH_HERO = {
  eyebrow: "Independent College Football 27 companion",
  title: "Build yourself in College Football 27",
  lede: "Get your closest available in-game appearance from verified College Football 27 catalog records, then follow a manual step-by-step build guide.",
  support: PRODUCT_EXPLANATION
} as const;

export const SUPPORTED_GAME_STATEMENT = {
  game: "EA SPORTS College Football 27",
  mode: "Road to Glory player creation",
  platformStatus: "Xbox research evidence is being cataloged first; production support depends on verified platform, game version, patch, mode, and creation-path records.",
  versionStatus: CATALOG_UNAVAILABLE_MESSAGE,
  limitation: "The web MVP uses guided RGB images only. It does not claim TrueDepth, ARKit, depth geometry, direct game import, or official integration."
} as const;

export const HOW_IT_WORKS_STEPS = [
  {
    title: "Capture five guided RGB views",
    body: "Use the browser camera or upload synthetic-safe reference images for straight-on, left 45, right 45, left profile, and right profile views."
  },
  {
    title: "Confirm appearance attributes",
    body: "Review user-confirmed hair, facial-hair, eyebrow, height, weight, and body-preference fields without using invented game option labels."
  },
  {
    title: "Match only when the catalog is verified",
    body: "Top-three verified matches unlock only after approved College Football 27 catalog records are loaded through the production gate."
  },
  {
    title: "Follow the manual build guide",
    body: "When verified data exists, the app will show step-by-step settings tied to catalog version, platform, mode, and creation path."
  }
] as const;

export const FAQ_ITEMS = [
  {
    question: "Does GameFace Match import my face into College Football 27?",
    answer: "No. GameFace Match recommends the closest available in-game appearance settings. It does not directly import your face into College Football 27."
  },
  {
    question: "Is GameFace Match affiliated with EA?",
    answer:
      "No. GameFace Match is an independent companion application and is not affiliated with, endorsed by, or sponsored by Electronic Arts or EA SPORTS."
  },
  {
    question: "Why are results unavailable right now?",
    answer: `${CATALOG_UNAVAILABLE_MESSAGE} Real recommendations require verified game records before any top-three result can be shown.`
  },
  {
    question: "Does the web version use TrueDepth or ARKit?",
    answer: "No. Browser capture uses guided RGB images only and should not be treated as equivalent to a native TrueDepth capture."
  },
  {
    question: "Are my face images sold or used for biometric advertising?",
    answer: "No. Raw face media stays local and temporary by default, face data is not sold, and face data is not used for biometric advertising."
  },
  {
    question: "What happens when verified records are available?",
    answer: "The app can return up to three verified in-game matches, explain uncertainty, and produce manual build steps from verified menu paths only."
  }
] as const;

export const PRIVACY_SUMMARY_POINTS = [
  "Raw capture images are local and temporary by default.",
  "No face images are uploaded by the web MVP.",
  "No identity recognition is implemented.",
  "No sensitive traits are inferred.",
  "Saved profiles and builds exclude raw face media by default.",
  "Users can delete the active scan, screenshots, profiles, builds, or all local data from the Privacy Center."
] as const;

export const EXAMPLE_RESULT = {
  title: "Example result preview",
  status: CATALOG_UNAVAILABLE_MESSAGE,
  slots: [
    "Best verified match: unavailable until catalog verification",
    "Second verified match: unavailable until catalog verification",
    "Third verified match: unavailable until catalog verification"
  ],
  explanation:
    "This preview demonstrates the result layout without showing fake College Football 27 settings. Verified native labels, menu paths, and build steps appear only after approved catalog records exist."
} as const;

export const SAFE_SHARE_CARD = {
  title: "GameFace Match",
  headline: "My College Football 27 build guide is ready when verified catalog data is loaded.",
  body: "Text-only shared cards never include face images unless a future explicit opt-in is implemented.",
  footer: "Independent companion application. No direct game import. Not affiliated with EA."
} as const;

export const SUPPORT_PAGE_CONTENT = {
  title: "GameFace Match Support",
  responseScope: "Support can help with browser capture, upload fallback, deletion controls, catalog status, and purchase-readiness questions.",
  beforeContacting: [
    "Check whether the verified College Football 27 catalog is loaded.",
    "Open the Privacy Center to delete active scans or local saved data.",
    "Use upload fallback if browser camera permission is blocked.",
    "Do not send face images, screenshots, passwords, payment credentials, or recovery codes in a support request."
  ],
  refundGuidance:
    "Paid checkout is not connected yet. Refund and restoration instructions will be finalized with the selected payment provider before paid launch.",
  privacyGuidance: "GameFace Match does not sell face data and does not use face data for biometric advertising."
} as const;

export const CREATOR_DEMO_SCRIPT = [
  "Open with: Build yourself in College Football 27 using an independent companion app.",
  "Show the disclaimer: no direct game import, not affiliated with EA, and manual settings only.",
  "Show the five-angle RGB capture flow or upload fallback without using real-person face imagery in public demos.",
  "Show the catalog state: Verified College Football 27 catalog not loaded.",
  "Explain that top-three verified matches appear only after the catalog is approved.",
  "Show the text-only share card and note that face images are excluded by default.",
  "Close with the support and privacy controls, including delete-all-local-data."
] as const;

export const LAUNCH_SCREENSHOT_ASSETS = [
  {
    path: "/marketing/launch-home.svg",
    title: "Landing page hero",
    alt: "GameFace Match launch landing page with product promise and catalog-unavailable status."
  },
  {
    path: "/marketing/launch-result-preview.svg",
    title: "Safe result preview",
    alt: "Example top-three result layout with verified catalog unavailable and no fake game settings."
  },
  {
    path: "/marketing/share-card.svg",
    title: "Text-only share card",
    alt: "GameFace Match text-only share card without face imagery."
  }
] as const;

export const AFFILIATION_COPY = {
  independent: INDEPENDENT_APP_DISCLAIMER,
  short: "Independent companion application. No direct game import. Not affiliated with EA."
} as const;
