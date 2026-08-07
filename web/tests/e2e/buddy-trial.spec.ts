import { expect, test } from "@playwright/test";

const activeInvite = "btv1_8f4c2a7d9e6b41c0a3f5d8e2b9c7a1f0";
const expiredInvite = "btv1_2a6d4f8c1b3e5a7099e8d7c6b5a43210";
const usedInvite = "btv1_7c9a1e5d3f8b2460a4c2e1d9b8f60531";

test.describe("Buddy Trial invite route", () => {
  test("enters an active fixture invite, records consent, and resumes without an account", async ({ page }) => {
    await page.goto(`/trial/${activeInvite}`);

    await expect(page.getByRole("heading", { name: /Build your College Football 27 game face/i })).toBeVisible();
    await expect(page.getByText("Private Buddy Trial")).toBeVisible();
    await expect(page.getByText("GameFace Match is an independent companion app, not an official game integration.")).toBeVisible();
    await expect(page.getByText(/production catalog has 0 approved records/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /verifier/i })).toHaveCount(0);

    const beginButton = page.getByRole("button", { name: "Begin face scan" });
    await expect(beginButton).toBeDisabled();

    await page.getByLabel(/Age eligibility/i).check();
    await page.getByLabel(/Self or permission confirmation/i).check();
    await page.getByLabel(/Camera use/i).check();
    await page.getByLabel(/Face analysis for this recommendation/i).check();
    await page.getByLabel(/Temporary local processing/i).check();
    await expect(beginButton).toBeEnabled();
    await beginButton.click();

    await expect(page.getByText("SCAN_IN_PROGRESS")).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue guided scan" })).toHaveAttribute("href", `/?buddyTrialInvite=${activeInvite}#start`);

    await page.reload();
    await expect(page.getByText("SCAN_IN_PROGRESS")).toBeVisible();
    await expect(page.getByText(`/trial/${activeInvite}`)).toBeVisible();
  });

  test("shows invalid, expired, and completed invite states", async ({ page }) => {
    await page.goto("/trial/not-a-real-invite");
    await expect(page.getByRole("heading", { name: "This private link is not valid" })).toBeVisible();

    await page.goto(`/trial/${expiredInvite}`);
    await expect(page.getByRole("heading", { name: "This private link expired" })).toBeVisible();

    await page.goto(`/trial/${usedInvite}`);
    await expect(page.getByRole("heading", { name: "This private link is complete" })).toBeVisible();
  });

  test("keeps deleted local trial state through refresh", async ({ page }) => {
    await page.goto(`/trial/${activeInvite}`);
    await page.getByRole("button", { name: "Delete My Trial Data" }).click();
    await expect(page.getByRole("heading", { name: "Trial data removed" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Trial data removed" })).toBeVisible();
  });
});
