export const ONBOARDING_FLOW = [
  "welcome",
  "product",
  "disclaimer",
  "privacy",
  "consent",
  "home"
] as const;

export const STEP_FLOW = [
  "start",
  "preparation",
  "capability",
  "capture",
  "attributes",
  "profile-review",
  "processing",
  "results"
] as const;

export const KEY_NAVIGATION_FLOW = [...ONBOARDING_FLOW, ...STEP_FLOW] as const;

export const HARDENED_E2E_FLOW = [
  "welcome",
  "disclaimer",
  "privacy",
  "consent",
  "preparation",
  "capability",
  "capture",
  "attributes",
  "profile-review",
  "results",
  "saved",
  "privacy-center",
  "refinement"
] as const;

export const APP_SCREENS = [
  ...KEY_NAVIGATION_FLOW,
  "catalog",
  "saved",
  "refinement",
  "pricing",
  "audit",
  "phase-0",
  "matching-lab",
  "mobile-qa",
  "privacy-center",
  "settings"
] as const;

export type AppScreen = (typeof APP_SCREENS)[number];
export type KeyNavigationStep = (typeof KEY_NAVIGATION_FLOW)[number];
export type StepFlowStep = (typeof STEP_FLOW)[number];

export interface NavigationItem {
  id: AppScreen;
  label: string;
  shortLabel?: string;
}

export const PRIMARY_NAV_ITEMS: NavigationItem[] = [
  { id: "home", label: "Home" },
  { id: "start", label: "Start match", shortLabel: "Start" },
  { id: "catalog", label: "Catalog" },
  { id: "saved", label: "Saved builds", shortLabel: "Saved" },
  { id: "privacy-center", label: "Privacy" },
  { id: "settings", label: "Settings" }
];

export const MOBILE_NAV_ITEMS: NavigationItem[] = [
  { id: "home", label: "Home" },
  { id: "start", label: "Start" },
  { id: "catalog", label: "Catalog" },
  { id: "privacy-center", label: "Privacy" }
];

export const STEP_FLOW_DETAILS: Array<{
  id: StepFlowStep;
  label: string;
  description: string;
}> = [
  { id: "start", label: "Start", description: "Set expectations before capture." },
  { id: "preparation", label: "Prep", description: "Check lighting, hair, hats, glasses, and expression." },
  { id: "capability", label: "Capability", description: "Check browser camera support and upload fallback." },
  { id: "capture", label: "Capture", description: "Collect five guided RGB angles." },
  { id: "attributes", label: "Attributes", description: "Confirm user-provided appearance notes." },
  { id: "profile-review", label: "Profile", description: "Review the standardized profile foundation." },
  { id: "processing", label: "Processing", description: "Validate foundation inputs and catalog availability." },
  { id: "results", label: "Results", description: "Show unavailable state until verified catalog data exists." }
];

export function getNextOnboardingScreen(current: AppScreen, consentAcknowledged: boolean): AppScreen {
  if (current === "privacy") {
    return consentAcknowledged ? "home" : "consent";
  }
  const index = ONBOARDING_FLOW.findIndex((step) => step === current);
  if (index < 0 || index === ONBOARDING_FLOW.length - 1) {
    return current;
  }
  return ONBOARDING_FLOW[index + 1];
}

export function canEnterHome(consentAcknowledged: boolean) {
  return consentAcknowledged;
}

export function getStepFlowProgress(screen: AppScreen) {
  const currentIndex = STEP_FLOW.findIndex((step) => step === screen);
  return {
    currentIndex,
    total: STEP_FLOW.length,
    isInStepFlow: currentIndex >= 0
  };
}

export function getKeyboardNavigatedIndex(currentIndex: number, key: string, itemCount: number) {
  if (itemCount <= 0) return -1;
  if (key === "ArrowRight" || key === "ArrowDown") return (currentIndex + 1) % itemCount;
  if (key === "ArrowLeft" || key === "ArrowUp") return (currentIndex - 1 + itemCount) % itemCount;
  if (key === "Home") return 0;
  if (key === "End") return itemCount - 1;
  return currentIndex;
}

export function isAppScreen(value: string): value is AppScreen {
  return (APP_SCREENS as readonly string[]).includes(value);
}

export function getScreenFromHash(hash: string): AppScreen | null {
  const value = hash.replace(/^#\/?/, "");
  return isAppScreen(value) ? value : null;
}

export function toScreenHash(screen: AppScreen) {
  return `#${screen}`;
}
