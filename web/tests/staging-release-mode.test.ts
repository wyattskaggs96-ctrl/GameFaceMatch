import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { productionCatalogManifest } from "@/lib/catalog/production-manifest";
import {
  assertStagingCatalog,
  createStagingReleaseScenario,
  isStagingReleaseModeEnabled,
  STAGING_TEST_CATALOG_VERSION,
  STAGING_TEST_DATA_LABEL
} from "@/lib/staging/staging-release-mode";
import type { GameCatalogManifest } from "@/types/domain";

const fixtureCatalog = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "..", "data", "fixtures", "test-only", "matching", "synthetic-catalog.json"), "utf8")
) as GameCatalogManifest;

describe("staging release mode", () => {
  it("is disabled unless the explicit staging release mode is set", () => {
    expect(isStagingReleaseModeEnabled({})).toBe(false);
    expect(isStagingReleaseModeEnabled({ GAMEFACE_RELEASE_MODE: "production" })).toBe(false);
    expect(isStagingReleaseModeEnabled({ GAMEFACE_RELEASE_MODE: "staging" })).toBe(true);
    expect(isStagingReleaseModeEnabled({ NEXT_PUBLIC_GAMEFACE_RELEASE_MODE: "staging" })).toBe(true);
  });

  it("accepts only the test-only staging catalog shape", () => {
    const validation = assertStagingCatalog(fixtureCatalog);
    expect(validation).toEqual({ ok: true, errors: [] });
    expect(fixtureCatalog.catalogVersion.identifier).toBe(STAGING_TEST_CATALOG_VERSION);
  });

  it("rejects production catalogs for staging fixture mode", () => {
    const validation = assertStagingCatalog(productionCatalogManifest);
    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toMatch(/sourceType testFixture/i);
    expect(validation.errors.join(" ")).toMatch(/must not be production/i);
  });

  it("creates a labeled top-three staging scenario from fixture data", () => {
    const scenario = createStagingReleaseScenario(fixtureCatalog);
    expect(scenario.label).toBe(STAGING_TEST_DATA_LABEL);
    expect(scenario.catalog.sourceType).toBe("testFixture");
    expect(scenario.catalog.isProduction).toBe(false);
    expect(scenario.matches.map((match) => match.catalogItem.stableInternalID)).toEqual([
      "synthetic-match-alpha",
      "synthetic-match-gamma",
      "synthetic-match-beta"
    ]);
    expect(scenario.matches.every((match) => match.catalogItem.sourceType === "testFixture" && match.catalogItem.isTestFixture)).toBe(true);
    expect(scenario.sharingDisabledMessage).toMatch(/Sharing is disabled/i);
  });

  it("never treats staging recommendations as production results", () => {
    const scenario = createStagingReleaseScenario(fixtureCatalog);
    expect(scenario.matches.every((match) => match.catalogItem.game === "SYNTHETIC_TEST_GAME_DO_NOT_USE")).toBe(true);
    expect(scenario.matches.every((match) => match.catalogItem.gameVersion === "synthetic-test-version")).toBe(true);
    expect(scenario.catalog.isProduction).toBe(false);
  });
});
