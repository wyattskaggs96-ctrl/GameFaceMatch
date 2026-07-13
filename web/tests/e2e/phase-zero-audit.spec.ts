import { expect, test, type Locator, type Page } from "@playwright/test";
import crypto from "node:crypto";
import { syntheticPng } from "./synthetic-images";

test.describe("GameFace Match Phase 0 internal audit E2E", () => {
  test("records an incomplete then complete environment draft and creates a menu-map entry", async ({ page }) => {
    await openPhaseZero(page);

    const environment = sectionByHeading(page, "Environment manifest wizard");
    await expect(environment.getByText("Incomplete non-production draft")).toBeVisible();
    await expect(environment.getByRole("button", { name: "Save complete environment manifest" })).toBeDisabled();

    await fillCompleteEnvironment(environment);
    await attachEnvironmentEvidence(environment);

    await expect(environment.getByText("Manifest ready to save")).toBeVisible();
    await expect(environment.getByRole("button", { name: "Save complete environment manifest" })).toBeEnabled();
    await environment.getByRole("button", { name: "Save complete environment manifest" }).click();
    await expect(environment.getByText("Saved non-production audit environment")).toBeVisible();

    const menuMap = sectionByHeading(page, "Hierarchical menu-map editor");
    await expect(menuMap.getByText("No categories are assumed")).toBeVisible();
    await menuMap.locator("#field-stable-menu-id").fill("TESTONLY_MENU_ROOT");
    await menuMap.locator("#field-display-label").fill("TESTONLY Root Menu");
    await menuMap.locator("#field-native-label").fill("TESTONLY Root Menu");
    await menuMap.locator("#field-native-order").fill("1");
    await menuMap.locator("#field-full-screen-evidence-id").fill("evidence-menu-root-testonly");
    await menuMap.locator("#field-full-screen-evidence-description").fill("Synthetic menu screenshot evidence for E2E only.");
    await menuMap.locator("#field-verification-status").selectOption("draft");
    await menuMap.getByRole("button", { name: "Add menu item" }).click();
    await expect(menuMap.getByLabel("Readable menu tree")).toContainText("TESTONLY Root Menu");
    await expect(menuMap.getByText("TESTONLY_MENU_ROOT - unknown - unknown")).toBeVisible();
  });

  test("covers evidence intake, invalid naming, missing views, and checksum generation", async ({ page }) => {
    await openPhaseZero(page);

    const evidence = sectionByHeading(page, "Evidence intake manager");
    await evidence.locator("input[type='file']").first().setInputFiles(syntheticPng("TESTONLY_bad_filename.png", 640, 640, 30));

    await evidence.getByLabel("Game version token").fill("1 0");
    await evidence.getByLabel("Patch token").fill("patch/unsafe");
    await evidence.getByLabel("Capture date YYYYMMDD").fill("20260231");
    await evidence.getByLabel("Catalog item ID").fill("BAD/ID");
    await evidence.getByLabel("Classification").selectOption("standardAngle");
    await evidence.getByLabel("Master or derivative").selectOption("master");
    await evidence.getByLabel("File role").selectOption("standardAngle");
    await evidence.locator("#field-view").selectOption("straightOn");

    await expect(evidence.getByText("Catalog ID must follow the CF27 platform/mode/category/order convention.")).toBeVisible();
    await expect(evidence.getByText("Game version must use letters, numbers, dots, or hyphens only.")).toBeVisible();
    await expect(evidence.getByText("Patch must use letters, numbers, dots, or hyphens only.")).toBeVisible();
    await expect(evidence.getByText("Date must be a real calendar date in YYYYMMDD format.")).toBeVisible();
    await expect(evidence.getByRole("button", { name: "Finalize metadata" })).toBeDisabled();

    const completeness = sectionByHeading(page, "Required view completeness");
    await expect(completeness.getByText("production blocked")).toBeVisible();
    await expect(completeness.getByText(/: missing\./).first()).toBeVisible();

    const checksum = crypto.createHash("sha256").update(syntheticPng("checksum-source-testonly.png", 32, 32, 31).buffer).digest("hex");
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  test("surfaces import validation failures, fixture promotion rejection, and test-only release simulation", async ({ page }) => {
    await openPhaseZero(page);

    const manager = sectionByHeading(page, "Catalog-manager review console");
    await expect(manager.getByText("This console does not publish data or expose fixtures to production users.")).toBeVisible();

    await importCandidatePackage(manager, candidatePackage({ placeholder: true, missingLeftProfile: true }));
    await expect(manager.getByText("placeholderToken")).toBeVisible();
    await expect(manager.getByText("missingRequiredEvidence")).toBeVisible();
    await expect(manager.getByRole("button", { name: "Approve release candidate" })).toBeDisabled();

    await manager.getByLabel("Optional validation report JSON").fill(JSON.stringify({
      ok: false,
      checks: [
        {
          name: "productionSeparation",
          status: "fail",
          errors: [
            {
              code: "fixtureRecordInProduction",
              message: "Fixture record attempted to enter production import.",
              recordID: "CF27_TESTONLY_RTG_HEAD_001",
              severity: "mandatory"
            }
          ]
        }
      ]
    }));
    await importCandidatePackage(manager, candidatePackage());
    await expect(manager.locator("strong").filter({ hasText: "fixtureRecordInProduction" })).toBeVisible();
    await expect(manager.getByRole("button", { name: "Approve release candidate" })).toBeDisabled();

    await manager.getByLabel("Optional validation report JSON").fill("");
    await importCandidatePackage(manager, candidatePackage());
    await expect(manager.getByText("ready").first()).toBeVisible();
    await expect(manager.getByRole("button", { name: "Approve release candidate" })).toBeEnabled();
    await manager.getByLabel("Report notes").fill("TESTONLY approved-release simulation for E2E; not production data.");
    await manager.getByRole("button", { name: "Approve release candidate" }).click();
    await expect(manager.getByLabel("Signed catalog manager review report")).toContainText('"approvedForReleaseCandidate": true');
    await expect(manager.getByLabel("Signed catalog manager review report")).toContainText("test-only-manager-package");

    const dashboard = page.locator("section").filter({ has: page.getByRole("heading", { name: "Phase 0 readiness" }) });
    await expect(dashboard.getByText("Production gate")).toBeVisible();
    await expect(dashboard.getByText("blocked").first()).toBeVisible();
  });

  test("records verifier mismatch and recapture-based discrepancy resolution", async ({ page }) => {
    await openPhaseZero(page);

    const verifier = sectionByHeading(page, "Second-verifier workspace");
    await verifier.locator("#field-verifier-id").fill("second-verifier-testonly");
    await verifier.locator("#field-platform").fill("TESTONLY Platform");
    await verifier.locator("#field-game-version").fill("testonly-version");
    await verifier.locator("#field-patch-version").fill("testonly-patch");
    await verifier.locator("#field-mode").fill("TESTONLY Mode");
    await verifier.locator("#field-creation-path").fill("TESTONLY Creation Path");
    await verifier.locator("#field-environment-evidence-ids").fill("evidence-environment-testonly");

    await verifier.locator("#field-primary-menu-count").fill("1");
    await verifier.locator("#field-verifier-menu-count").fill("2");
    await verifier.getByRole("button", { name: "Add menu count" }).click();
    await verifier.locator("#field-primary-catalog-count").fill("1");
    await verifier.locator("#field-verifier-catalog-count").fill("1");
    await verifier.getByRole("button", { name: "Add catalog count" }).click();

    await verifier.getByRole("button", { name: "Generate sample" }).click();
    await expect(verifier.getByLabel("Deterministic secondary-angle sample report")).toContainText("deterministic-sha256-category-quartile-v1");

    await verifier.locator("#field-evidence-files").selectOption("mismatch");
    await verifier.locator("#field-front-view").selectOption("confirmed");
    await verifier.locator("#field-secondary-angle-sample").selectOption("confirmed");
    await verifier.getByRole("button", { name: "Add or replace record check" }).click();
    await expect(verifier.getByText("evidenceMismatch")).toBeVisible();

    await verifier.getByRole("button", { name: "Open first mismatch discrepancy" }).click();
    await expect(verifier.getByRole("heading", { name: "Primary observation" })).toBeVisible();
    await expect(verifier.getByRole("heading", { name: "Verifier observation", exact: true })).toBeVisible();
    await verifier.getByRole("button", { name: "Link evidence" }).click();
    await verifier.getByRole("button", { name: "Record resolution" }).click();
    await verifier.getByRole("button", { name: "Primary acknowledge" }).click();
    await verifier.getByRole("button", { name: "Verifier acknowledge" }).click();
    await expect(verifier.getByText("Exported discrepancy-resolution records: 1.")).toBeVisible();
    await expect(verifier.getByText("acknowledged")).toBeVisible();
  });
});

function sectionByHeading(page: Page, heading: string) {
  return page.getByRole("heading", { name: heading }).locator("xpath=ancestor::section[1]");
}

async function openPhaseZero(page: Page) {
  await page.goto("/#phase-0");
  await expect(page.getByRole("heading", { name: "Phase 0 readiness" })).toBeVisible();
  await expect(page.getByText("Development-only status")).toBeVisible();
}

async function fillCompleteEnvironment(environment: Locator) {
  const fields: Array<[string, string]> = [
    ["#field-auditor-id", "auditor-testonly"],
    ["#field-platform", "TESTONLY Platform"],
    ["#field-console-model", "TESTONLY Console"],
    ["#field-console-os", "testonly-os"],
    ["#field-edition", "TESTONLY Edition"],
    ["#field-region", "TESTONLY Region"],
    ["#field-storefront", "TESTONLY Storefront"],
    ["#field-game-executable-version", "testonly-version"],
    ['[id="field-patch/build-label"]', "testonly-patch"],
    ["#field-resolution", "1920x1080"],
    ["#field-display-model", "TESTONLY Display"],
    ["#field-capture-hardware", "TESTONLY Capture Card"],
    ["#field-capture-format", "png"],
    ["#field-selected-mode", "TESTONLY Mode"],
    ["#field-exact-creation-path", "TESTONLY Creation Path"],
    ["#field-position", "TESTONLY Position"],
    ["#field-archetype", "TESTONLY Archetype"],
    ["#field-height", "72"],
    ["#field-weight", "205"],
    ["#field-body-type", "TESTONLY Body Type"]
  ];
  for (const [selector, value] of fields) {
    await environment.locator(selector).fill(value);
  }
  await environment.locator("#field-copy-type").selectOption("digital");
  await environment.locator("#field-latest-update-state").selectOption("latestInstalled");
  await environment.locator("#field-online-state").selectOption("online");
  await environment.locator("#field-ea-account-state").selectOption("notRequired");
  await environment.locator("#field-hdr").selectOption("disabled");
  await environment.locator("#field-handedness").selectOption("right");
}

async function attachEnvironmentEvidence(environment: Locator) {
  const evidenceLabels = [
    "Title screen evidence file",
    "Version/build screen evidence file",
    "Console update screen evidence file",
    "Selected mode evidence file",
    "Creation-workflow start evidence file"
  ];
  for (let index = 0; index < evidenceLabels.length; index += 1) {
    await environment.getByLabel(evidenceLabels[index]).setInputFiles(syntheticPng(`environment-${index}-testonly.png`, 320, 240, 40 + index));
  }
}

async function importCandidatePackage(manager: Locator, candidate: ReturnType<typeof candidatePackage>) {
  await manager.getByLabel("Candidate package JSON").fill(JSON.stringify(candidate, null, 2));
  await manager.getByRole("button", { name: "Import package" }).click();
}

function candidatePackage(options: { placeholder?: boolean; missingLeftProfile?: boolean } = {}) {
  const itemOne = candidateItem("CF27_TESTONLY_RTG_HEAD_001", 1);
  const itemTwo = candidateItem("CF27_TESTONLY_RTG_HEAD_002", 2);
  if (options.placeholder) itemOne.visibleGameLabelOrIndex = "REPLACE_WITH_VERIFIED_GAME_LABEL";
  if (options.missingLeftProfile) itemOne.requiredAngles.leftProfile = "";
  const items = [itemOne, itemTwo];
  const assets = items.flatMap((entry) => [
    candidateAsset(`${entry.stableInternalID}-straightOn`, "straightOn"),
    candidateAsset(`${entry.stableInternalID}-left45`, "left45"),
    candidateAsset(`${entry.stableInternalID}-right45`, "right45"),
    candidateAsset(`${entry.stableInternalID}-leftProfile`, "leftProfile"),
    candidateAsset(`${entry.stableInternalID}-rightProfile`, "rightProfile"),
    candidateAsset(`${entry.stableInternalID}-navigation`, "navigationEvidence")
  ]);

  return {
    packageID: "test-only-manager-package",
    packageVersion: "test-only-package-version",
    manifest: {
      catalogVersion: {
        identifier: "test-only-catalog-version",
        gameVersion: "test-only-version",
        platform: "test-only-platform",
        verifiedAt: "2026-07-13T00:00:00.000Z"
      },
      items
    },
    items,
    assets
  };
}

function candidateItem(stableInternalID: string, nativeOrder: number) {
  const requiredAngles = {
    straightOn: `${stableInternalID}-straightOn`,
    left45: `${stableInternalID}-left45`,
    right45: `${stableInternalID}-right45`,
    leftProfile: `${stableInternalID}-leftProfile`,
    rightProfile: `${stableInternalID}-rightProfile`
  };
  return {
    stableInternalID,
    category: "head",
    nativeOrder,
    visibleGameLabelOrIndex: `TESTONLY_LABEL_${nativeOrder}`,
    verificationState: "verified",
    sourceImageReferences: Object.values(requiredAngles),
    requiredAngles,
    navigationInstructions: [{ instruction: "TESTONLY verified navigation", evidenceAssetID: `${stableInternalID}-navigation` }],
    duplicateObservations: []
  };
}

function candidateAsset(assetID: string, angle: string) {
  return {
    assetID,
    angle,
    relativePath: `assets/masters/${assetID}.png`,
    sha256: "a".repeat(64)
  };
}
