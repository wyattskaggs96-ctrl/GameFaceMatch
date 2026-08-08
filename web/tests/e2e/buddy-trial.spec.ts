import { expect, test } from "@playwright/test";

const activeInvite = "btv1_8f4c2a7d9e6b41c0a3f5d8e2b9c7a1f0";
const expiredInvite = "btv1_2a6d4f8c1b3e5a7099e8d7c6b5a43210";
const usedInvite = "btv1_7c9a1e5d3f8b2460a4c2e1d9b8f60531";
const activeInviteStorageKey = `gfm:buddy-trial:v1:${activeInvite}`;

test.describe("Buddy Trial invite route", () => {
  test("enters an active fixture invite, records consent, and resumes without an account", async ({ page }) => {
    await page.goto(`/trial/${activeInvite}`);

    await expect(page.getByRole("heading", { name: /Build your College Football 27 game face/i })).toBeVisible();
    await expect(page.getByText("Private Buddy Trial")).toBeVisible();
    await expect(page.getByText("GameFace Match is an independent companion app, not an official game integration.")).toBeVisible();
    if (process.env.NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO === "true") {
      await expect(page.getByText("Owner Review Demo — appearance settings are test data.")).toBeVisible();
    } else {
      await expect(page.getByText(/production catalog has 0 approved records/i)).toBeVisible();
    }
    await expect(page.getByRole("link", { name: /verifier/i })).toHaveCount(0);

    const beginButton = page.getByRole("button", { name: "Start My GameFace" });
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

  test("completes the owner-review demo scan-to-build journey at required mobile widths", async ({ page }) => {
    test.skip(process.env.NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO !== "true", "Owner Review Demo E2E requires NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO=true.");

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 430, height: 932 }
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(`/trial/${activeInvite}`);
      await page.evaluate(() => window.localStorage.clear());
      await page.reload();

      await expect(page.getByRole("heading", { name: /Build your College Football 27 game face/i })).toBeVisible();
      await expect(page.getByText("Owner Review Demo — appearance settings are test data.")).toBeVisible();
      await expect(page.getByRole("button", { name: "Start My GameFace" })).toBeDisabled();

      await page.getByLabel(/Age eligibility/i).check();
      await page.getByLabel(/Self or permission confirmation/i).check();
      await page.getByLabel(/Camera use/i).check();
      await page.getByLabel(/Face analysis for this recommendation/i).check();
      await page.getByLabel(/Temporary local processing/i).check();
      await page.getByRole("button", { name: "Start My GameFace" }).click();

      await expect(page.getByText("SCAN_IN_PROGRESS")).toBeVisible();
      await expect(page.getByRole("link", { name: "Continue guided scan" })).toHaveAttribute("href", `/?buddyTrialInvite=${activeInvite}#start`);

      await page.evaluate(
        ({ key }) => {
          const session = JSON.parse(window.localStorage.getItem(key) ?? "{}");
          const timestamp = "2026-08-07T12:10:00.000Z";
          session.state = "SCAN_COMPLETE";
          session.updatedAt = timestamp;
          session.catalogGate = "owner_review_demo_available";
          session.history = [
            ...(Array.isArray(session.history) ? session.history : []),
            { state: "SCAN_COMPLETE", at: timestamp, note: "E2E deterministic guided scan completion checkpoint; no raw media stored." }
          ];
          window.localStorage.setItem(key, JSON.stringify(session));
        },
        { key: activeInviteStorageKey }
      );
      await page.reload();

      await expect(page.getByRole("heading", { name: "Building your GameFace..." })).toBeVisible();
      await page.getByRole("button", { name: "View my GameFace recommendation" }).click();

      await expect(page.getByRole("heading", { name: "Your GameFace recommendation" })).toBeVisible();
      await expect(page.getByText("Best Match")).toBeVisible();
      await expect(page.getByText(/Match Score \d+\/100/i)).toBeVisible();
      await expect(page.getByText("Skin details")).toBeVisible();
      await expect(page.getByText("Nose bridge", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Build This in College Football 27" }).click();

      await expect(page.getByRole("heading", { name: "Build This in College Football 27" })).toBeVisible();
      await expect(page.getByText("Step 1 of 11")).toBeVisible();
      await page.getByRole("button", { name: "Done" }).click();
      await expect(page.getByText("Step 2 of 11")).toBeVisible();
      await page.getByRole("button", { name: "View All Settings" }).click();
      await expect(page.getByLabel("All owner-review demo build settings")).toBeVisible();
      await page.reload();
      await expect(page.getByLabel("All owner-review demo build settings")).toBeVisible();
      await page.getByRole("button", { name: "Show Current Step" }).click();

      for (let index = 2; index <= 11; index += 1) {
        await expect(page.getByText(`Step ${index} of 11`)).toBeVisible();
        await page.getByRole("button", { name: /Done|Next/ }).click();
      }

      await expect(page.getByRole("heading", { name: "Your player is built." })).toBeVisible();
      await expect(page.getByRole("button", { name: "Review My GameFace" })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });
});
