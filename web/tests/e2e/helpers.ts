import { expect, type Locator, type Page } from "@playwright/test";
import { syntheticPng, type SyntheticImageFile } from "./synthetic-images";

export const requiredConsentNames = [
  "Camera use",
  "Face analysis for this recommendation",
  "Temporary local processing",
  "Age eligibility",
  "Self or permission confirmation"
] as const;

export const requiredAngleLabels = ["Straight-on", "Left 45 degrees", "Right 45 degrees", "Left profile", "Right profile"] as const;

export async function completeOnboarding(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Quick Scan to put you in the game" })).toBeVisible();
  await page.getByRole("button", { name: "Get Started" }).click();
  await expect(page.getByRole("heading", { name: "Closest available settings, not a face import" })).toBeVisible();
  await page.getByRole("button", { name: "Continue to disclaimer" }).click();
  await expect(page.getByRole("heading", { name: "Independent companion" })).toBeVisible();
  await page.getByRole("button", { name: "I understand" }).click();
  await expect(page.getByRole("heading", { name: "Privacy summary" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
}

export async function acceptRequiredConsent(page: Page) {
  for (const name of requiredConsentNames) {
    await consentCard(page, name).getByRole("checkbox").check();
  }
  await expect(page.getByRole("button", { name: "Continue to home" })).toBeEnabled();
  await page.getByRole("button", { name: "Continue to home" }).click();
  await expect(page.getByRole("heading", { name: "Ready near your console" })).toBeVisible();
}

export function consentCard(page: Page, name: string): Locator {
  return page.getByRole("heading", { name }).locator("xpath=ancestor::div[contains(@class, 'consent-card')]");
}

export async function navigateToCapture(page: Page) {
  await page.route("**/models/mediapipe/face_landmarker.task", (route) => route.abort("failed"));
  await page.getByRole("button", { name: "Start" }).first().click();
  await expect(page.getByRole("heading", { name: "Set Up Your GameFace" })).toBeVisible();
  await expect(page.getByText("Purchase verification is not connected yet")).toBeVisible();
  await expect(page.getByRole("button", { name: "Get Started" })).toBeDisabled();
  await page.goto("/#preparation");
  await expect(page.getByRole("heading", { name: "Get ready for your face scan" })).toBeVisible();
  await expect(page.getByText("Browser capture uses guided RGB images only.")).toBeVisible();
  await expect(page.getByText("Hold the phone at eye level.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Use assisted capture" })).toBeVisible();
  await page.getByRole("button", { name: "Get Started" }).click();
  await expect(page.getByRole("heading", { name: "Confirm lighting before capture" })).toBeVisible();
  await expect(page.getByText("This is a manual readiness checkpoint for the web RGB workflow.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to browser capability" })).toBeDisabled();
  for (const checkbox of await page.getByRole("group", { name: "Required lighting confirmations" }).getByRole("checkbox").all()) {
    await checkbox.check();
  }
  await expect(page.getByText("Lighting readiness confirmed for guided RGB capture.")).toBeVisible();
  await page.getByRole("button", { name: "Continue to browser capability" }).click();
  await expect(page.getByRole("heading", { name: "Camera or upload" })).toBeVisible();
  await expect(page.getByText("Upload fallback is still an RGB-only workflow")).toBeVisible();
  await page.getByRole("button", { name: "Continue to guided capture" }).click();
  await expect(page.getByRole("heading", { name: /Position your face within the frame\.|Rotate to portrait/ })).toBeVisible();
  await expect(
    page.getByText(/Keep your face centered with even light(?: and a neutral expression)?\.|Turn your phone upright before the scan starts\./)
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Accessibility Options" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Accessibility Options" }).first().click();
  await expect(page.getByRole("heading", { name: "0 of 5 angles completed" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Angle plan" })).toBeVisible();
  await expect(page.getByText("one straight-on front view, two three-quarter views, and two full profile views")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Retake without restarting" })).toBeVisible();
  await expect(page.getByText("Browser RGB capture is not TrueDepth, depth geometry, ARKit, or 3D reconstruction.")).toBeVisible();
}

export async function uploadFiveSyntheticAngles(page: Page) {
  const files = requiredAngleLabels.map((label, index) => syntheticPng(`${toSlug(label)}-${index}.png`, 640, 640, index + 1));
  for (let index = 0; index < requiredAngleLabels.length; index += 1) {
    await uploadFallbackForAngle(page, requiredAngleLabels[index], files[index], { waitForAccepted: true });
  }
  await expect(page.getByRole("heading", { name: "5 of 5 angles completed" })).toBeVisible();
}

export async function uploadFallbackForAngle(page: Page, label: string, file: SyntheticImageFile, options: { waitForAccepted?: boolean } = {}) {
  await page.getByLabel(`Upload fallback for ${label.toLowerCase()}`).setInputFiles(file);
  if (options.waitForAccepted) {
    await expect(page.getByText(`${file.name} |`, { exact: false })).toBeVisible();
    const qualityCard = page.locator("article.quality-review-card").filter({ has: page.getByRole("heading", { name: label, exact: true }) });
    for (const checkbox of await qualityCard.getByRole("group", { name: "Manual confirmations" }).getByRole("checkbox").all()) {
      await checkbox.check();
    }
  }
}

export async function confirmStandardAttributes(page: Page) {
  await page.locator("#field-hair-color-family").selectOption("brown");
  await page.locator("#field-hair-texture-family").selectOption("straight");
  await page.locator("#field-hairstyle-family").selectOption("short");
  await page.locator("#field-facial-hair-presence").selectOption("none");
  await page.locator("#field-eyebrow-thickness").selectOption("medium");
  await page.locator("#field-skin-presentation-used-by-the-game").selectOption("medium");
  await page.locator("#field-desired-in-game-height").fill("72");
  await page.locator("#field-desired-in-game-weight").fill("205");
  await page.locator("#field-preferred-body-type").selectOption("balanced");
  await page.locator("#field-facial-resemblance-versus-athlete-physique").selectOption("balanced");
  await expect(page.getByRole("button", { name: "Create profile review" })).toBeEnabled();
  await page.getByRole("button", { name: "Create profile review" }).click();
}

export async function expectNoRawImagePersistence(page: Page) {
  const storedText = await page.evaluate(() => {
    const localValues = Object.entries(localStorage).map(([key, value]) => `${key}:${value}`);
    const sessionValues = Object.entries(sessionStorage).map(([key, value]) => `${key}:${value}`);
    return [...localValues, ...sessionValues].join("\n");
  });
  expect(storedText).not.toContain("data:image");
  expect(storedText).not.toContain("blob:");
  expect(storedText).not.toContain("synthetic");
}

function toSlug(value: string) {
  return value.toLowerCase().replaceAll(" ", "-");
}
