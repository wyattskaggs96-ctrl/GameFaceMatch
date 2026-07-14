import { expect, test, type Page } from "@playwright/test";
import {
  acceptRequiredConsent,
  completeOnboarding,
  confirmStandardAttributes,
  consentCard,
  expectNoRawImagePersistence,
  navigateToCapture,
  uploadFallbackForAngle
} from "./helpers";
import { invalidTextFile, syntheticPng } from "./synthetic-images";

test.describe("GameFace Match web MVP release acceptance", () => {
  test("covers the production MVP journey and fail-closed release gates", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    await expectNoHorizontalOverflow(page);

    await completeOnboarding(page);
    await expect(page.getByRole("heading", { name: "Choose each consent separately" })).toBeVisible();
    await consentCard(page, "Camera use").getByRole("checkbox").check();
    await expect(page.getByRole("button", { name: "Continue to home" })).toBeDisabled();
    await expect(page.getByText("Required consent missing")).toBeVisible();
    await consentCard(page, "Save derived face profile").getByRole("checkbox").check();
    await acceptRequiredConsent(page);
    await expectNoHorizontalOverflow(page);

    await navigateToCapture(page);
    await expect(page.getByText("Browser RGB capture is not TrueDepth, depth geometry, ARKit, or 3D reconstruction.")).toBeVisible();
    await page.getByRole("button", { name: "Skip to file upload" }).click();

    await page.getByLabel("Upload fallback for straight-on").setInputFiles(invalidTextFile());
    await expect(page.getByText("The image could not be read.")).toBeVisible();
    await expect(page.getByText("Choose a different image: Use a readable JPEG, PNG, or WebP file within the size and dimension limits.")).toBeVisible();

    await uploadFallbackForAngle(page, "Straight-on", syntheticPng("release-too-small.png", 120, 120, 101));
    await expect(page.getByText("Use an image at least 480 pixels wide and tall.")).toBeVisible();

    const straightOn = syntheticPng("release-straight-valid.png", 640, 640, 102);
    await uploadFallbackForAngle(page, "Straight-on", straightOn, { waitForAccepted: true });
    await uploadFallbackForAngle(page, "Left 45 degrees", syntheticPng("release-left45-valid.png", 640, 640, 103), { waitForAccepted: true });
    await uploadFallbackForAngle(page, "Right 45 degrees", straightOn);
    await expect(page.getByText("This image appears to duplicate Straight-on.")).toBeVisible();
    await uploadFallbackForAngle(page, "Right 45 degrees", syntheticPng("release-right45-valid.png", 640, 640, 104), { waitForAccepted: true });
    await uploadFallbackForAngle(page, "Left profile", syntheticPng("release-left-profile-valid.png", 640, 640, 105), { waitForAccepted: true });
    await uploadFallbackForAngle(page, "Right profile", syntheticPng("release-right-profile-valid.png", 640, 640, 106), { waitForAccepted: true });
    await expect(page.getByRole("heading", { name: "5 of 5 angles completed" })).toBeVisible();

    await page
      .getByRole("heading", { name: "Left 45 degrees" })
      .locator("xpath=ancestor::article[contains(@class, 'quality-review-card')]")
      .getByRole("button", { name: "Retake" })
      .click();
    await expect(page.getByRole("heading", { name: "4 of 5 angles completed" })).toBeVisible();
    await uploadFallbackForAngle(page, "Left 45 degrees", syntheticPng("release-left45-retake-valid.png", 640, 640, 107), { waitForAccepted: true });
    await expect(page.getByRole("button", { name: "Continue to attribute confirmation" })).toBeEnabled();
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Continue to attribute confirmation" }).click();

    await expect(page.getByRole("heading", { name: "Confirm standardized profile attributes" })).toBeVisible();
    await confirmStandardAttributes(page);
    await expect(page.getByRole("heading", { name: "Standardized profile foundation" })).toBeVisible();
    await expect(page.getByText("Depth supported")).toBeVisible();
    await page.getByRole("button", { name: "Save derived profile locally" }).click();
    await expect(page.getByText("Saved non-image profile")).toBeVisible();
    await page.getByRole("button", { name: "Continue to processing" }).click();
    await expect(page.getByRole("heading", { name: "Processing" })).toBeVisible();
    await page.getByRole("button", { name: "Continue when ready" }).click();

    await expect(page.locator("#results-title")).toHaveText("Verified College Football 27 catalog not loaded.");
    await expect(page.getByText("Check catalog status later: Keep or delete the local profile, then retry after an approved catalog release is loaded.")).toBeVisible();
    await expect(page.getByText("No production top-three results, labels, sliders, hairstyles, facial-hair options, or menu paths are displayed")).toBeVisible();
    await expect(page.getByText("synthetic-match-alpha")).toHaveCount(0);
    await expect(page.getByText("synthetic-label-alpha")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete local profile" })).toBeVisible();
    await expectNoRawImagePersistence(page);
    await expectNoHorizontalOverflow(page);

    if (!isMobileViewport(page)) {
      await page.getByRole("button", { name: "Saved builds" }).click();
      await expect(page.getByRole("heading", { name: "Nothing saved" })).toBeVisible();

      await page.getByRole("button", { name: "Home" }).click();
      await page.getByRole("heading", { name: "Screenshot refinement" }).locator("xpath=ancestor::div[contains(@class, 'action-card')]").getByRole("button", { name: "Open" }).click();
      await expect(page.getByRole("heading", { name: "Screenshot refinement intake" })).toBeVisible();
      await page.getByLabel("Upload screenshot").first().setInputFiles(syntheticPng("release-invalid-screenshot.png", 320, 320, 108));
      await expect(page.getByText("Use a screenshot at least 720 pixels wide and tall.")).toBeVisible();
      await expect(page.getByLabel("Screenshot upload recovery").getByText("Replace the screenshot: Upload a clear front screenshot", { exact: false })).toBeVisible();
      await expect(page.getByRole("button", { name: "Check refinement" })).toBeDisabled();
    }

    await page.getByRole("button", { name: "Privacy" }).click();
    await expect(page.getByRole("heading", { name: "Local data controls" })).toBeVisible();
    await expect(page.getByText("No face images, screenshots, profiles, or builds have been uploaded.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Local-only failure handling" })).toBeVisible();
    await page.getByRole("button", { name: "Delete everything local" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Confirm deletion" }).click();
    await expect(page.getByText("Deletion records do not contain face images.")).toBeVisible();
    await expectNoRawImagePersistence(page);
  });
});

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2))
    .toBe(true);
}

function isMobileViewport(page: Page) {
  return (page.viewportSize()?.width ?? 0) <= 720;
}
