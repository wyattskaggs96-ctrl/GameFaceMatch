import { expect, test } from "@playwright/test";
import { acceptRequiredConsent, completeOnboarding, consentCard, navigateToCapture, uploadFallbackForAngle } from "./helpers";
import { invalidTextFile, syntheticPng } from "./synthetic-images";

test.describe("GameFace Match E2E edge flows", () => {
  test("blocks progress when required consent is missing", async ({ page }) => {
    await completeOnboarding(page);
    await expect(page.getByRole("heading", { name: "Choose each consent separately" })).toBeVisible();
    await consentCard(page, "Camera use").getByRole("checkbox").check();
    await consentCard(page, "Face analysis for this recommendation").getByRole("checkbox").check();
    await expect(page.getByText("Required consent missing")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue to home" })).toBeDisabled();
  });

  test("reports camera permission denial and keeps upload fallback available", async ({ page }) => {
    await page.addInitScript(() => {
      const deniedStatus = { state: "denied", onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false };
      Object.defineProperty(navigator, "permissions", {
        value: { query: () => Promise.resolve(deniedStatus) },
        configurable: true
      });
      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          enumerateDevices: () => Promise.resolve([{ kind: "videoinput", label: "Front camera", deviceId: "synthetic", groupId: "synthetic" }]),
          getUserMedia: () => Promise.reject(new DOMException("Denied by E2E test", "NotAllowedError"))
        },
        configurable: true
      });
    });
    await completeOnboarding(page);
    await acceptRequiredConsent(page);
    await navigateToCapture(page);
    await page.getByRole("button", { name: "Start camera" }).click();
    await expect(page.getByText("Camera permission denied. You can use file upload instead.")).toBeVisible();
    await expect(page.getByLabel("Upload straight-on image")).toBeVisible();
  });

  test("rejects unsupported and undersized images, then allows selective retake", async ({ page }) => {
    await completeOnboarding(page);
    await acceptRequiredConsent(page);
    await navigateToCapture(page);

    await page.getByLabel("Upload fallback for straight-on").setInputFiles(invalidTextFile());
    await expect(page.getByText("The image could not be read.")).toBeVisible();

    await uploadFallbackForAngle(page, "Straight-on", syntheticPng("too-small.png", 120, 120, 1));
    await expect(page.getByText("Use an image at least 480 pixels wide and tall.")).toBeVisible();

    const straightOn = syntheticPng("straight-valid.png", 640, 640, 2);
    await uploadFallbackForAngle(page, "Straight-on", straightOn);
    await uploadFallbackForAngle(page, "Left 45 degrees", syntheticPng("left-45-valid.png", 640, 640, 3));
    await uploadFallbackForAngle(page, "Right 45 degrees", straightOn);
    await expect(page.getByText("This image appears to duplicate Straight-on.")).toBeVisible();

    await uploadFallbackForAngle(page, "Right 45 degrees", syntheticPng("right-45-valid.png", 640, 640, 4));
    await uploadFallbackForAngle(page, "Left profile", syntheticPng("left-profile-valid.png", 640, 640, 5));
    await uploadFallbackForAngle(page, "Right profile", syntheticPng("right-profile-valid.png", 640, 640, 6));
    await expect(page.getByRole("heading", { name: "5 of 5 angles completed" })).toBeVisible();

    await page.getByRole("heading", { name: "Left 45 degrees" }).locator("xpath=ancestor::article[contains(@class, 'quality-review-card')]").getByRole("button", { name: "Retake" }).click();
    await expect(page.getByRole("heading", { name: "4 of 5 angles completed" })).toBeVisible();
    await uploadFallbackForAngle(page, "Left 45 degrees", syntheticPng("left-45-retake-valid.png", 640, 640, 7));
    await expect(page.getByRole("heading", { name: "5 of 5 angles completed" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue to attribute confirmation" })).toBeEnabled();
  });

  test("supports keyboard navigation through the main journey", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start walkthrough" }).focus();
    await expect(page.getByRole("button", { name: "Start walkthrough" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Closest available settings, not a face import" })).toBeVisible();
    await page.getByRole("button", { name: "Continue to disclaimer" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Independent companion" })).toBeVisible();
  });

  test("remains usable with reduced motion preferences", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const prefersReducedMotion = await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    expect(prefersReducedMotion).toBe(true);
    await page.getByRole("button", { name: "Start walkthrough" }).click();
    await expect(page.getByRole("heading", { name: "Closest available settings, not a face import" })).toBeVisible();
  });
});
