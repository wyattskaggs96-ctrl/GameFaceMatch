import { expect, test } from "@playwright/test";

test.describe("GameFace Match staging release acceptance", () => {
  test("covers valid TEST DATA matching, build guide, share blocking, and save blocking", async ({ page }) => {
    await page.goto("/staging");

    await expect(page.getByRole("alert").filter({ hasText: "TEST DATA staging mode" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Fixture-backed staging workflow" })).toBeVisible();
    await expect(page.getByText("Catalog source: testFixture. Production: no.")).toBeVisible();
    await expect(page.getByText("Complete product path rehearsal")).toBeVisible();

    await expect(page.locator("#results-title")).toHaveText("Top three closest available settings");
    await expect(page.getByText("TEST DATA results")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Best match", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Second match", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Third match", exact: true })).toBeVisible();
    await expect(page.getByText("synthetic-match-alpha")).toBeVisible();
    await expect(page.getByText("synthetic-match-gamma")).toBeVisible();
    await expect(page.getByText("synthetic-match-beta")).toBeVisible();

    await expect(page.getByRole("heading", { name: "TEST DATA Best match explanation" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Score and confidence" })).toBeVisible();
    await expect(page.getByText("Match score based on the game’s available appearance options.").first()).toBeVisible();
    await expect(page.getByText("Scores are not identity probabilities.")).toBeVisible();
    await expect(page.getByText("Build instructions", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "TEST DATA guide" })).toBeVisible();
    await expect(page.getByText("synthetic-test-platform")).toBeVisible();
    await expect(page.getByText("synthetic-test-catalog-v1").first()).toBeVisible();
    await expect(page.getByText("Catalog verified", { exact: true }).first()).toBeVisible();

    await expect(page.getByText("Share disabled for TEST DATA")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Share card preview" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save build" })).toBeDisabled();
    await expect(page.getByText("Saving disabled for TEST DATA")).toBeVisible();
  });
});
