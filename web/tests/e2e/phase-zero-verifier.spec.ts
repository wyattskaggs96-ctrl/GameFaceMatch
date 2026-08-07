import { expect, test } from "@playwright/test";

test.describe("CF27 supported-subset friend verifier workflow", () => {
  test("launches, records identity, saves a draft through refresh, and blocks incomplete export", async ({ page }) => {
    await page.goto("/verifier");
    await expect(page.getByRole("heading", { name: "CF27 Supported-Subset Human Verification" })).toBeVisible();
    await expect(page.getByText("Queue records").locator("xpath=following-sibling::*[1]")).toContainText("76");

    await page.getByLabel("Verifier name or ID").fill("friend-human-105");
    await page.getByLabel("Platform").fill("Xbox");
    await page.getByLabel("Console model").fill("Xbox Series X");
    await page.getByLabel("I independently opened the shipping game for this verification.").check();
    await page.getByLabel("I accept this verifier attestation.").check();
    await page.getByLabel("I am a real second person, not the primary researcher.").check();
    await page.getByLabel("I independently accessed the shipping game.").check();
    await page.getByLabel("I did not merely approve the existing notes.").check();
    await page.getByLabel("I reviewed the candidate and evidence shown.").check();
    await page.getByLabel("I recorded disagreements honestly.").check();
    await page.getByLabel("I did not guess missing labels, order, counts, or views.").check();
    await page.getByLabel("I understand this does not publish the catalog.").check();
    await page.getByLabel("I understand catalog-manager approval is separate.").check();

    await page.getByRole("button", { name: "2. Records" }).click();
    await expect(page.getByText("Record 1 of 76")).toBeVisible();
    await page.getByLabel("Independent observation").fill("I checked this option in the shipping game.");
    await page.getByLabel("Candidate identity confirmed").selectOption("yes");
    await page.getByLabel("Native label confirmed").selectOption("yes");
    await page.getByLabel("Native index confirmed").selectOption("yes");
    await page.getByLabel("Native order confirmed").selectOption("yes");
    await page.getByLabel("Evidence files resolve").selectOption("yes");
    await page.getByLabel("Front view confirmed").selectOption("yes");
    await page.getByLabel("Secondary angle reviewed").selectOption("yes");
    await page.getByLabel("Menu count confirmed").selectOption("yes");
    await page.getByLabel("Duplicate relationship confirmed").selectOption("not_applicable");
    await page.getByLabel("Environment compatible").selectOption("yes");
    await page.getByLabel("Decision status").selectOption("VERIFIED");
    await page.getByLabel("Sample reviewed").selectOption("yes");
    await page.getByLabel("Sample result").fill("confirmed");
    await page.getByLabel("Secondary-angle observation").fill("Secondary angle checked.");
    await expect(page.getByText("Progress saved in this browser.")).toBeVisible();

    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: "2. Records" }).click();
    await expect(page.getByText("Record 2 of 76")).toBeVisible();
    await expect(page.getByRole("button", { name: "Export verifier package" }).first()).toBeDisabled();

    await page.getByRole("button", { name: "5. Review/export" }).click();
    await expect(page.getByText(/required item\(s\) remain/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Export verifier package" }).first()).toBeDisabled();
  });
});
