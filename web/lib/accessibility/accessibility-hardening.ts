export type AccessibilityArea =
  | "keyboard"
  | "screenReader"
  | "focusOrder"
  | "labels"
  | "dynamicText"
  | "contrast"
  | "highContrast"
  | "reducedMotion"
  | "spokenInstructions"
  | "textualInstructions"
  | "captionedInstructions"
  | "captions"
  | "hapticAlternatives"
  | "nonColorStatus"
  | "leftRightGuidance"
  | "errorMessages"
  | "oneHandedSupport"
  | "extendedCaptureTime"
  | "selectiveRetake"
  | "plainLanguageErrors"
  | "mobileTouchTargets";

export interface AccessibilityAuditItem {
  id: string;
  area: AccessibilityArea;
  requirement: string;
  automatedEvidence: string[];
  manualTestSteps: string[];
}

export const WEB_ACCESSIBILITY_AUDIT_ITEMS: AccessibilityAuditItem[] = [
  {
    id: "a11y-keyboard-navigation",
    area: "keyboard",
    requirement: "Core navigation and journey controls must work with keyboard input.",
    automatedEvidence: ["AppShell nav key handling", "Playwright keyboard journey test"],
    manualTestSteps: ["Use Tab, Shift+Tab, Enter, Space, ArrowLeft, ArrowRight, Home, and End through welcome, consent, capture, and privacy center."]
  },
  {
    id: "a11y-focus-order",
    area: "focusOrder",
    requirement: "Focus order must follow the visual journey and move to the current screen after navigation without trapping users outside dialogs.",
    automatedEvidence: ["Main landmark receives focus on route changes", "Modal dialog focus trap and Escape dismissal", "Skip link to main content"],
    manualTestSteps: ["Tab forward and backward from the skip link through primary navigation, step rail, capture controls, dialogs, and bottom mobile navigation."]
  },
  {
    id: "a11y-control-labels",
    area: "labels",
    requirement: "Repeated controls must include the relevant angle, region, or action context in their accessible names.",
    automatedEvidence: ["Angle-specific upload labels", "Angle-specific retake/remove aria-labels", "Navigation aria labels"],
    manualTestSteps: ["With a screen reader rotor or controls list, confirm Upload, Retake, Remove, Make current, and navigation controls are distinguishable."]
  },
  {
    id: "a11y-screen-reader-labels",
    area: "screenReader",
    requirement: "Important controls, progress, modal dialogs, upload inputs, and live states must expose readable labels.",
    automatedEvidence: ["Semantic headings", "aria-live route/capture status", "labeled file inputs", "alertdialog modal"],
    manualTestSteps: ["Run VoiceOver or TalkBack through onboarding, capture, manual confirmations, delete confirmation, and results unavailable state."]
  },
  {
    id: "a11y-dynamic-text",
    area: "dynamicText",
    requirement: "Layouts must wrap instead of clipping when users increase text size or zoom.",
    automatedEvidence: ["No viewport-scaled font sizes", "overflow-wrap on controls/cards", "mobile one-column breakpoints"],
    manualTestSteps: ["Test browser zoom at 200 percent and OS large text on an iPhone-sized viewport."]
  },
  {
    id: "a11y-contrast",
    area: "contrast",
    requirement: "Core text colors must meet WCAG AA contrast for normal text.",
    automatedEvidence: ["Token contrast unit tests for ink, muted, status, and nav text"],
    manualTestSteps: ["Spot-check outdoor/bright-room readability on real iPhone Safari and Android Chrome."]
  },
  {
    id: "a11y-high-contrast",
    area: "highContrast",
    requirement: "Core controls and status surfaces must remain understandable in high-contrast or grayscale viewing conditions.",
    automatedEvidence: ["WCAG AA token contrast tests", "StatusBadge text", "blocking/advisory/ready text lists"],
    manualTestSteps: ["Enable high contrast, increased contrast, or grayscale and confirm status words, outlines, and focus indicators remain visible."]
  },
  {
    id: "a11y-reduced-motion",
    area: "reducedMotion",
    requirement: "Motion must be minimized when the user requests reduced motion.",
    automatedEvidence: ["prefers-reduced-motion CSS block", "Playwright reduced-motion scenario"],
    manualTestSteps: ["Enable Reduce Motion at OS level and confirm transitions do not interfere with capture or navigation."]
  },
  {
    id: "a11y-spoken-instructions",
    area: "spokenInstructions",
    requirement: "Capture progress and live guidance must be available to assistive technology.",
    automatedEvidence: ["aria-live current screen and capture progress", "aria-live live guidance panel"],
    manualTestSteps: ["With a screen reader running, confirm angle changes, blocking errors, and deletion confirmations are announced."]
  },
  {
    id: "a11y-textual-capture-instructions",
    area: "textualInstructions",
    requirement: "Capture guidance must be available as persistent visible text, not only live camera feedback, sound, motion, or color.",
    automatedEvidence: ["CapturePreparation checklist", "Current angle instruction text", "Captioned current instruction", "Coverage messages use words and icons"],
    manualTestSteps: ["Mute the device, disable motion, and complete upload fallback using only visible text instructions."]
  },
  {
    id: "a11y-captioned-instructions",
    area: "captionedInstructions",
    requirement: "Every capture instruction must be visible as text, not only spoken, animated, or color-coded.",
    automatedEvidence: ["Text instructions for every required angle", "captioned mobile capture guidance card"],
    manualTestSteps: ["Mute the device and complete capture using only visible text instructions."]
  },
  {
    id: "a11y-captions",
    area: "captions",
    requirement: "Instructional capture content must include caption-like visible text because the web MVP does not rely on audio prompts.",
    automatedEvidence: ["Current capture instruction note", "Mobile capture guidance alert", "Live guidance text summaries"],
    manualTestSteps: ["Confirm no capture instruction requires audio-only or animation-only understanding."]
  },
  {
    id: "a11y-haptic-alternatives",
    area: "hapticAlternatives",
    requirement: "Haptics must never be the only feedback channel; native haptics are future-only.",
    automatedEvidence: ["No browser vibration dependency", "text and screen-reader status messages"],
    manualTestSteps: ["Confirm no task depends on vibration or haptic feedback. Future native haptics must duplicate visible and spoken guidance."]
  },
  {
    id: "a11y-non-color-status",
    area: "nonColorStatus",
    requirement: "Status must use text and icons or words in addition to color.",
    automatedEvidence: ["StatusBadge text", "coverage state icons and text", "blocking/advisory/ready lists"],
    manualTestSteps: ["Use grayscale display mode and confirm capture, coverage, and result states remain understandable."]
  },
  {
    id: "a11y-left-right-guidance",
    area: "leftRightGuidance",
    requirement: "Left and right capture steps must be plain and user-relative.",
    automatedEvidence: ["Required angle instruction tests"],
    manualTestSteps: ["Ask a tester to complete left 45, right 45, left profile, and right profile without extra coaching."]
  },
  {
    id: "a11y-error-messages",
    area: "errorMessages",
    requirement: "Blocking errors must be announced and include a recovery path without blaming the user.",
    automatedEvidence: ["role=alert for camera errors and capture blocking state", "image validation tests", "camera-denied E2E test"],
    manualTestSteps: ["Trigger denied camera, HEIC upload, unreadable file, undersized image, exact duplicate, and catalog unavailable states; confirm each has a next action."]
  },
  {
    id: "a11y-one-handed-support",
    area: "oneHandedSupport",
    requirement: "Core mobile actions should be reachable and usable one-handed where practical.",
    automatedEvidence: ["Bottom mobile navigation", "48px touch targets", "full-width mobile buttons"],
    manualTestSteps: ["On an iPhone-sized device, complete upload fallback and privacy deletion with one hand where practical."]
  },
  {
    id: "a11y-mobile-touch-targets",
    area: "mobileTouchTargets",
    requirement: "Primary mobile actions, navigation, upload fields, and checkboxes must provide at least 44px touch targets, with 48px preferred.",
    automatedEvidence: ["Button, mobile nav, file input, form input, and checkbox CSS minimum sizes", "mobile viewport E2E coverage"],
    manualTestSteps: ["On current iPhone Safari and Android Chrome, verify one-handed tapping without accidental neighboring activation."]
  },
  {
    id: "a11y-extended-capture-time",
    area: "extendedCaptureTime",
    requirement: "Users must be able to extend steady-hold timing and avoid over-blocking.",
    automatedEvidence: ["Use extended steady-hold timing control", "capture guidance threshold tests"],
    manualTestSteps: ["Turn on extended steady-hold timing and confirm manual/upload fallback still works."]
  },
  {
    id: "a11y-selective-retake",
    area: "selectiveRetake",
    requirement: "A failed angle must not force a full capture restart.",
    automatedEvidence: ["Selective retake E2E test", "retake/remove per-angle controls"],
    manualTestSteps: ["Retake only one weak angle and confirm completed angles remain present."]
  },
  {
    id: "a11y-plain-language-errors",
    area: "plainLanguageErrors",
    requirement: "Errors must state the problem and recovery path in plain language.",
    automatedEvidence: ["Camera permission recovery copy", "image validation messages", "catalog unavailable copy"],
    manualTestSteps: ["Trigger camera denial, HEIC upload, undersized upload, duplicate upload, and catalog unavailable results."]
  }
];

export interface ContrastPair {
  id: string;
  foreground: string;
  background: string;
  minimumRatio: number;
}

export const ACCESSIBILITY_CONTRAST_PAIRS: ContrastPair[] = [
  { id: "body-text-on-paper", foreground: "#122019", background: "#ffffff", minimumRatio: 4.5 },
  { id: "muted-text-on-paper", foreground: "#56665d", background: "#ffffff", minimumRatio: 4.5 },
  { id: "nav-text-on-field", foreground: "#fbfcf7", background: "#10251d", minimumRatio: 4.5 },
  { id: "warning-text-on-warning-soft", foreground: "#8a6100", background: "#fff6db", minimumRatio: 4.5 },
  { id: "danger-text-on-danger-soft", foreground: "#a33131", background: "#fff0f0", minimumRatio: 4.5 },
  { id: "success-text-on-success-soft", foreground: "#12532e", background: "#e7f5ec", minimumRatio: 4.5 },
  { id: "link-text-on-paper", foreground: "#246ca8", background: "#ffffff", minimumRatio: 4.5 }
];

export function contrastRatio(foregroundHex: string, backgroundHex: string) {
  const foreground = relativeLuminance(hexToRgb(foregroundHex));
  const background = relativeLuminance(hexToRgb(backgroundHex));
  const lighter = Math.max(foreground, background);
  const darker = Math.min(foreground, background);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getAccessibilityAreasCovered() {
  return new Set(WEB_ACCESSIBILITY_AUDIT_ITEMS.map((item) => item.area));
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16)) as [number, number, number];
}

function relativeLuminance([red, green, blue]: [number, number, number]) {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
