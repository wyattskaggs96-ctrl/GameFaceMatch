import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { productionCatalogManifest } from "@/lib/catalog/production-manifest";
import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";
import { createBuildInstructions, createRecommendationExplanationReport, createResultsState } from "@/lib/results/results-experience";
import { createSafeShareCard } from "@/lib/share/share-card";
import { createStagingReleaseScenario } from "@/lib/staging/staging-release-mode";
import type { GameCatalogManifest } from "@/types/domain";

const fixtureCatalog = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "..", "data", "fixtures", "test-only", "matching", "synthetic-catalog.json"), "utf8")
) as GameCatalogManifest;

describe("web MVP release acceptance contracts", () => {
  it("accepts valid fixture-only matching only through the staging release scenario", () => {
    const scenario = createStagingReleaseScenario(fixtureCatalog);

    expect(scenario.catalog.sourceType).toBe("testFixture");
    expect(scenario.catalog.isProduction).toBe(false);
    expect(scenario.matches.map((match) => match.catalogItem.stableInternalID)).toEqual([
      "synthetic-match-alpha",
      "synthetic-match-gamma",
      "synthetic-match-beta"
    ]);
    expect(scenario.matches.every((match) => match.catalogItem.isTestFixture)).toBe(true);
  });

  it("keeps low-confidence matching explicit without identity-probability language", () => {
    const scenario = createStagingReleaseScenario(fixtureCatalog);
    const lowConfidenceMatch = {
      ...scenario.matches[0],
      confidence: {
        score: 0.2,
        label: "low" as const
      },
      explanation: {
        ...scenario.matches[0].explanation,
        uncertaintyNotes: [...scenario.matches[0].explanation.uncertaintyNotes, "Low confidence because fixture evidence is intentionally weak."]
      }
    };
    const report = createRecommendationExplanationReport({ profile: scenario.profile, matches: [lowConfidenceMatch] });

    expect(report.recommendations[0].confidence).toEqual({ score: 0.2, label: "low" });
    expect(report.recommendations[0].uncertaintyNotes.join(" ")).toMatch(/low confidence/i);
    expect(JSON.stringify(report).toLowerCase()).not.toMatch(/percent identical|% identical|identity probability/);
  });

  it("generates build-guide and share outputs from verified fixture metadata without raw face media", () => {
    const scenario = createStagingReleaseScenario(fixtureCatalog);
    const instructions = createBuildInstructions(scenario.matches[0]);
    const shareCard = createSafeShareCard({
      match: scenario.matches[0],
      buildInstructions: instructions,
      includeFaceImage: false,
      faceImageObjectUrl: "blob:raw-face-image"
    });

    expect(instructions[0]).toMatchObject({
      gameTitle: "SYNTHETIC_TEST_GAME_DO_NOT_USE",
      platform: "synthetic-test-platform",
      gameVersion: "synthetic-test-version",
      mode: "synthetic-test-mode",
      creationPath: "synthetic-test-path"
    });
    expect(shareCard.includesFaceImage).toBe(false);
    expect(shareCard.faceImageObjectUrl).toBeUndefined();
    expect(shareCard.text).not.toContain("blob:raw-face-image");
  });

  it("keeps production recommendations fail-closed while the verified catalog is empty", () => {
    const scenario = createStagingReleaseScenario(fixtureCatalog);
    const state = createResultsState({
      profile: scenario.profile,
      catalogIsEmpty: productionCatalogManifest.items.length === 0,
      matches: scenario.matches
    });

    expect(productionCatalogManifest.items).toEqual([]);
    expect(state.kind).toBe("catalogUnavailable");
    expect(state.title).toBe(CATALOG_UNAVAILABLE_MESSAGE);
    expect(state.matches).toEqual([]);
    expect(JSON.stringify(state)).not.toContain("synthetic-match-alpha");
  });
});
