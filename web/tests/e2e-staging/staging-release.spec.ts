import { expect, test } from "@playwright/test";

test.describe("GameFace Match staging release mode", () => {
  test("rehearses the top-three product path with permanent TEST DATA labels", async ({ page }) => {
    await page.goto("/staging");

    await expect(page.getByRole("alert").filter({ hasText: "TEST DATA staging mode" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Fixture-backed staging workflow" })).toBeVisible();
    await expect(page.getByText("Catalog source: testFixture. Production: no.")).toBeVisible();
    await expect(page.getByText("synthetic-test-catalog-v1").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Complete product path rehearsal" })).toBeVisible();

    await expect(page.locator("#results-title")).toHaveText("Top three closest available settings");
    await expect(page.getByText("TEST DATA results")).toBeVisible();
    await expect(page.getByText("synthetic-match-alpha")).toBeVisible();
    await expect(page.getByText("synthetic-match-gamma")).toBeVisible();
    await expect(page.getByText("synthetic-match-beta")).toBeVisible();
    await expect(page.getByText("synthetic-label-alpha")).toBeVisible();
    await expect(page.getByText("Share disabled for TEST DATA")).toBeVisible();
    await expect(page.getByText("Sharing is disabled in staging mode")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Share card preview" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save build" })).toBeDisabled();
    await expect(page.getByText("Saving disabled for TEST DATA")).toBeVisible();

    await expect(page.getByText("Reset count: 0")).toBeVisible();
    await page.getByRole("button", { name: "Reset staging test data" }).click();
    await expect(page.getByText("Reset count: 1")).toBeVisible();
  });
});
