import { expect, test } from "@playwright/test";
import {
  acceptRequiredConsent,
  completeOnboarding,
  confirmStandardAttributes,
  consentCard,
  expectNoRawImagePersistence,
  navigateToCapture,
  uploadFiveSyntheticAngles
} from "./helpers";
import { syntheticPng } from "./synthetic-images";

test.describe("GameFace Match production-representative journey", () => {
  test("completes the web MVP path with upload fallback and honest catalog-unavailable results", async ({ page }) => {
    await completeOnboarding(page);
    await acceptRequiredConsent(page);
    await navigateToCapture(page);

    await page.getByRole("button", { name: "Skip to file upload" }).click();
    await uploadFiveSyntheticAngles(page);
    await expect(page.getByText("Blocking checks resolved")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue to attribute confirmation" })).toBeEnabled();
    await page.getByRole("button", { name: "Continue to attribute confirmation" }).click();

    await expect(page.getByRole("heading", { name: "Confirm standardized profile attributes" })).toBeVisible();
    await expect(page.getByText("These values stay separate from model estimates")).toBeVisible();
    await expect(page.getByLabel("Skin presentation used by the game")).toBeVisible();
    await confirmStandardAttributes(page);

    await expect(page.getByRole("heading", { name: "Standardized profile foundation" })).toBeVisible();
    await expect(page.getByText("These fields came from the confirmation form, not from model estimates")).toBeVisible();
    await expect(page.getByText("Skin presentation used by the game")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save derived profile locally" })).toBeDisabled();
    await expect(page.getByText("Enable the separate save-derived-profile consent before saving")).toBeVisible();
    await expect(page.getByText("Guided browser RGB")).toBeVisible();
    await expect(page.getByText("Depth supported")).toBeVisible();
    await expect(page.getByText("No", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Geometry status" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Measured" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Approximate" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Unavailable" })).toBeVisible();
    await expect(page.getByText("depth-supported is always no for the web flow")).toBeVisible();
    await page.getByRole("button", { name: "Continue to processing" }).click();

    await expect(page.getByRole("heading", { name: "Processing" })).toBeVisible();
    await page.getByRole("button", { name: "Continue when ready" }).click();

    await expect(page.locator("#results-title")).toHaveText("Verified College Football 27 catalog not loaded.");
    await expect(page.getByText("Your capture and local profile review completed successfully.")).toBeVisible();
    await expect(page.getByText("Real College Football 27 recommendations require a verified production catalog")).toBeVisible();
    await expect(page.getByText("No production top-three results, labels, sliders, hairstyles, facial-hair options, or menu paths are displayed")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ready" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Blocked" })).toBeVisible();
    await expect(page.getByText("This is a catalog availability issue, not a capture mistake.")).toBeVisible();
    await expect(page.getByText("Your derived face profile can stay local in this browser session")).toBeVisible();
    await expect(page.getByRole("button", { name: "Check catalog status" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete local profile" })).toBeVisible();
    await expect(page.getByText("synthetic-match-alpha")).toHaveCount(0);
    await expect(page.getByText("synthetic-label-alpha")).toHaveCount(0);
    await expect(page.getByText("empty-production")).toBeVisible();
    await expectNoRawImagePersistence(page);
  });

  test("covers saved-build empty state, screenshot-refinement intake, privacy inventory, and deletion flows", async ({ page }) => {
    await completeOnboarding(page);
    await consentCard(page, "Save completed build").getByRole("checkbox").check();
    await acceptRequiredConsent(page);
    await navigateToCapture(page);
    await uploadFiveSyntheticAngles(page);

    await page.getByRole("button", { name: "Home" }).click();
    await page.getByRole("heading", { name: "Saved builds" }).locator("xpath=ancestor::div[contains(@class, 'action-card')]").getByRole("button", { name: "Open" }).click();
    await expect(page.getByRole("heading", { name: "Nothing saved" })).toBeVisible();
    await expect(page.getByText("No saved builds on this browser.")).toBeVisible();

    await page.getByRole("button", { name: "Home" }).click();
    await page.getByRole("heading", { name: "Screenshot refinement" }).locator("xpath=ancestor::div[contains(@class, 'action-card')]").getByRole("button", { name: "Open" }).click();
    await expect(page.getByRole("heading", { name: "Screenshot refinement intake" })).toBeVisible();
    await page.getByLabel("Upload screenshot").first().setInputFiles(syntheticPng("created-player-too-small.png", 320, 320, 19));
    await expect(page.getByText("Use a screenshot at least 720 pixels wide and tall.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Check refinement" })).toBeDisabled();
    await page.getByLabel("Upload screenshot").first().setInputFiles(syntheticPng("created-player-front.png", 800, 800, 20));
    await expect(page.getByText("created-player-front.png | 800x800")).toBeVisible();
    await expect(page.getByRole("button", { name: "Check refinement" })).toBeDisabled();
    await expect(page.getByText("Confirm: No helmet is covering the head.")).toBeVisible();
    for (const checkbox of await page.getByRole("checkbox").all()) {
      await checkbox.check();
    }
    await expect(page.getByRole("button", { name: "Check refinement" })).toBeEnabled();
    await page.getByRole("button", { name: "Check refinement" }).click();
    await expect(page.getByText("Screenshot refinement is unavailable until verified catalog data")).toBeVisible();
    await page.getByRole("button", { name: "Delete screenshot session data" }).click();
    await expect(page.getByText("No screenshot selected").first()).toBeVisible();

    await page.getByRole("button", { name: "Privacy" }).click();
    await expect(page.getByRole("heading", { name: "Local data controls" })).toBeVisible();
    await expect(page.getByText("No face images, screenshots, profiles, or builds have been uploaded.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Collected, processed, and saved" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Collected temporarily" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Processed locally" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Saved non-raw data", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Current consent version:/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Analytics and logs" })).toBeVisible();
    await expect(page.getByText("Analytics validation rejects raw images")).toBeVisible();
    await expect(page.getByText("Deletion records contain only scope and completion time")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Temporary Blob URLs" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Captured image bytes in memory" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Current derived profile" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Screenshot-refinement session" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Save completed build" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Revoke save completed build" })).toBeEnabled();
    await page.getByRole("button", { name: "Revoke save completed build" }).click();
    await expect(page.getByRole("button", { name: "Revoke save completed build" })).toBeDisabled();

    await page.getByRole("button", { name: "Generate non-raw export" }).click();
    const exportValue = await page.getByLabel("Non-raw data export").inputValue();
    const exportData = JSON.parse(exportValue) as {
      exportVersion: string;
      consentVersion: string;
      privacyAssertions: string[];
      savedBuilds: unknown[];
    };
    expect(exportData.exportVersion).toBe("gameface-match-non-raw-export-v1");
    expect(exportData.consentVersion).toBe("web-mvp-consent-v1");
    expect(exportData.privacyAssertions.join(" ")).toContain("excludes raw face images");
    expect(exportData.savedBuilds).toEqual([]);
    expect(exportValue).not.toMatch(/data:image|blob:http|objectUrl|landmarkCoordinates|identityEmbedding|faceVector|cameraFrame/i);

    await page.getByRole("button", { name: "Delete capture-session metadata" }).click();
    await expect(page.getByRole("alertdialog", { name: "Delete active capture session?" })).toBeVisible();
    await page.getByRole("button", { name: "Confirm deletion" }).click();
    await expect(page.getByText("Deletion completion recorded.")).toBeVisible();

    await page.getByRole("button", { name: "Delete everything local" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Confirm deletion" }).click();
    await expect(page.getByText("Deletion records do not contain face images.")).toBeVisible();
    await expectNoRawImagePersistence(page);
  });
});
