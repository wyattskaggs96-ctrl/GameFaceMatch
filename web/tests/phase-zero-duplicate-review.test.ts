import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PHASE0_DUPLICATE_REVIEW_SCHEMA_VERSION,
  createDefaultDuplicateReviewThresholds,
  createDuplicateReviewDecision,
  createDuplicateReviewReport,
  createPerceptualHashFromPixelSample,
  hammingDistance,
  type Phase0DuplicateReviewRecord
} from "@/lib/phase-zero/phase-zero-duplicate-review";
import type { PixelSample } from "@/lib/capture/image-quality-service";

const now = "2026-07-12T00:00:00.000Z";
const checksumA = "a".repeat(64);
const checksumB = "b".repeat(64);
const checksumC = "c".repeat(64);

describe("Phase 0 duplicate review assistance", () => {
  it("documents safety fields and decision states", () => {
    const schema = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/schemas/duplicate-review.schema.json"), "utf8"));

    expect(schema.properties.schemaVersion.const).toBe(PHASE0_DUPLICATE_REVIEW_SCHEMA_VERSION);
    expect(schema.$defs.decision.enum).toEqual(expect.arrayContaining(["confirmedDuplicate", "nearDuplicate", "notDuplicate", "needsRecapture"]));
    expect(schema.properties.summary.properties.noAutomaticMergeOrDelete.const).toBe(true);
    expect(schema.properties.summary.properties.verifiedGameFactsCreated.const).toBe(false);
  });

  it("creates deterministic perceptual hashes from synthetic pixels", () => {
    const first = createPerceptualHashFromPixelSample(patternSample("vertical"));
    const second = createPerceptualHashFromPixelSample(patternSample("vertical"));
    const third = createPerceptualHashFromPixelSample(patternSample("horizontal"));

    expect(first).toHaveLength(64);
    expect(first).toBe(second);
    expect(hammingDistance(first, second)).toBe(0);
    expect(hammingDistance(first, third)).toBeGreaterThan(0);
  });

  it("distinguishes duplicate files from visually similar options", () => {
    const visualHash = createPerceptualHashFromPixelSample(patternSample("vertical"));
    const report = createDuplicateReviewReport({
      category: "heads",
      generatedAt: now,
      records: [
        record("CF27_SYNTH_HEAD_001", 1, checksumA, visualHash),
        record("CF27_SYNTH_HEAD_002", 2, checksumA, visualHash),
        record("CF27_SYNTH_HEAD_003", 3, checksumB, visualHash)
      ]
    });

    expect(report.duplicateFileCount).toBe(1);
    expect(report.visuallySimilarOptionCount).toBeGreaterThanOrEqual(2);
    expect(report.candidates.some((candidate) => candidate.kind === "duplicateFile" && candidate.confidenceSource === "checksum")).toBe(true);
    expect(report.candidates.some((candidate) => candidate.kind === "visuallySimilarOption" && candidate.confidenceSource === "perceptualHash")).toBe(true);
  });

  it("preserves native menu order even when records arrive unsorted", () => {
    const visualHash = createPerceptualHashFromPixelSample(patternSample("vertical"));
    const report = createDuplicateReviewReport({
      category: "hairstyles",
      generatedAt: now,
      records: [
        record("CF27_SYNTH_HAIR_003", 3, checksumC, visualHash),
        record("CF27_SYNTH_HAIR_001", 1, checksumA, visualHash),
        record("CF27_SYNTH_HAIR_002", 2, checksumB, visualHash)
      ]
    });

    expect(report.recordsInNativeOrder).toEqual(["CF27_SYNTH_HAIR_001", "CF27_SYNTH_HAIR_002", "CF27_SYNTH_HAIR_003"]);
    expect(report.summary.nativeOrderPreserved).toBe(true);
    expect(report.summary.originalEntriesPreserved).toBe(true);
  });

  it("records a human not-a-duplicate decision without merging records", () => {
    const visualHash = createPerceptualHashFromPixelSample(patternSample("vertical"));
    const initial = createDuplicateReviewReport({
      category: "facialHair",
      generatedAt: now,
      records: [
        record("CF27_SYNTH_FACIALHAIR_001", 1, checksumA, visualHash),
        record("CF27_SYNTH_FACIALHAIR_002", 2, checksumB, visualHash)
      ]
    });
    const observation = createDuplicateReviewDecision({
      candidateID: initial.candidates[0].candidateID,
      researcherID: "researcher-test",
      decision: "notDuplicate",
      notes: "Similar silhouette, but distinct catalog options after review.",
      observedAt: now
    });
    const reviewed = createDuplicateReviewReport({
      category: "facialHair",
      generatedAt: now,
      records: [
        record("CF27_SYNTH_FACIALHAIR_001", 1, checksumA, visualHash, [observation]),
        record("CF27_SYNTH_FACIALHAIR_002", 2, checksumB, visualHash)
      ]
    });

    expect(reviewed.candidates[0].decision).toBe("notDuplicate");
    expect(reviewed.summary.notDuplicateCount).toBe(1);
    expect(reviewed.summary.noAutomaticMergeOrDelete).toBe(true);
    expect(reviewed.recordCount).toBe(2);
  });

  it("tracks confidence as tooling output rather than game fact", () => {
    const report = createDuplicateReviewReport({
      category: "additionalAttributes",
      generatedAt: now,
      thresholds: createDefaultDuplicateReviewThresholds({ nearDuplicateHammingDistance: 64 }),
      records: [
        record("CF27_SYNTH_ATTRIBUTE_001", 1, checksumA, createPerceptualHashFromPixelSample(patternSample("vertical"))),
        record("CF27_SYNTH_ATTRIBUTE_002", 2, checksumB, createPerceptualHashFromPixelSample(patternSample("horizontal")))
      ]
    });

    expect(report.candidates[0].confidenceIsGameFact).toBe(false);
    expect(report.candidates[0].toolConfidence).toBeGreaterThanOrEqual(0);
    expect(report.candidates[0].toolConfidence).toBeLessThanOrEqual(1);
    expect(report.summary.verifiedGameFactsCreated).toBe(false);
  });
});

function record(
  stableInternalID: string,
  nativeOrder: number,
  sha256: string,
  perceptualHash: string,
  researcherObservations: Phase0DuplicateReviewRecord["researcherObservations"] = []
): Phase0DuplicateReviewRecord {
  return {
    stableInternalID,
    nativeOrder,
    category: "heads",
    evidence: [{
      evidenceFileID: `evidence-${stableInternalID.toLowerCase()}`,
      sha256,
      perceptualHash,
      viewID: "front",
      notes: "Synthetic fixture metadata only."
    }],
    researcherObservations
  };
}

function patternSample(kind: "vertical" | "horizontal"): PixelSample {
  const width = 8;
  const height = 8;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const bright = kind === "vertical" ? x >= width / 2 : y >= height / 2;
      const index = (y * width + x) * 4;
      rgba[index] = bright ? 240 : 20;
      rgba[index + 1] = bright ? 240 : 20;
      rgba[index + 2] = bright ? 240 : 20;
      rgba[index + 3] = 255;
    }
  }
  return { width, height, rgba };
}
