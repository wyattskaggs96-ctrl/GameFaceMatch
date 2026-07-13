import { describe, expect, it } from "vitest";
import {
  ACCESSIBILITY_CONTRAST_PAIRS,
  WEB_ACCESSIBILITY_AUDIT_ITEMS,
  contrastRatio,
  getAccessibilityAreasCovered,
  type AccessibilityArea
} from "@/lib/accessibility/accessibility-hardening";
import { REQUIRED_CAPTURE_ANGLES } from "@/lib/capture/capture-session";

describe("accessibility hardening checklist", () => {
  it("tracks every requested accessibility audit area", () => {
    const expectedAreas: AccessibilityArea[] = [
      "keyboard",
      "screenReader",
      "dynamicText",
      "contrast",
      "reducedMotion",
      "spokenInstructions",
      "captionedInstructions",
      "hapticAlternatives",
      "nonColorStatus",
      "leftRightGuidance",
      "oneHandedSupport",
      "extendedCaptureTime",
      "selectiveRetake",
      "plainLanguageErrors"
    ];

    const coveredAreas = getAccessibilityAreasCovered();
    for (const area of expectedAreas) {
      expect(coveredAreas.has(area)).toBe(true);
    }
  });

  it("keeps audit items actionable with automated evidence and manual steps", () => {
    expect(WEB_ACCESSIBILITY_AUDIT_ITEMS.length).toBeGreaterThanOrEqual(14);
    for (const item of WEB_ACCESSIBILITY_AUDIT_ITEMS) {
      expect(item.requirement.length).toBeGreaterThan(20);
      expect(item.automatedEvidence.length).toBeGreaterThan(0);
      expect(item.manualTestSteps.length).toBeGreaterThan(0);
    }
  });

  it("keeps core color pairs above WCAG AA normal-text contrast", () => {
    for (const pair of ACCESSIBILITY_CONTRAST_PAIRS) {
      expect(contrastRatio(pair.foreground, pair.background), pair.id).toBeGreaterThanOrEqual(pair.minimumRatio);
    }
  });

  it("uses plain user-relative left and right capture guidance", () => {
    const instructions = Object.fromEntries(REQUIRED_CAPTURE_ANGLES.map((angle) => [angle.id, angle.instruction]));

    expect(instructions.left45).toContain("your left");
    expect(instructions.left45).toContain("left side of your face");
    expect(instructions.right45).toContain("your right");
    expect(instructions.right45).toContain("right side of your face");
    expect(instructions.leftProfile).toContain("left ear side faces the camera");
    expect(instructions.rightProfile).toContain("right ear side faces the camera");
  });
});
