import { describe, expect, it } from "vitest";
import {
  DEFAULT_EVIDENCE_PREVIEW_PAGE_SIZE,
  createEvidencePreviewPlan,
  createIncrementalProcessingPlan,
  iterateInChunks,
  paginateCollection
} from "@/lib/performance/large-evidence-handling";

describe("large evidence handling", () => {
  it("paginates catalog-sized collections and clamps unsafe page input", () => {
    const result = paginateCollection(Array.from({ length: 130 }, (_, index) => `record-${index + 1}`), {
      page: 999,
      pageSize: 250
    });

    expect(result.pageSize).toBe(100);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.items).toHaveLength(30);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(true);
  });

  it("plans immediate, lazy, and metadata-only previews without loading every raw asset", () => {
    const evidence = Array.from({ length: DEFAULT_EVIDENCE_PREVIEW_PAGE_SIZE + 2 }, (_, index) => ({
      id: `image-${index + 1}`,
      mimeType: "image/png",
      sizeBytes: 1024 * 1024
    }));
    evidence.push({ id: "huge-image", mimeType: "image/jpeg", sizeBytes: 90 * 1024 * 1024 });
    evidence.push({ id: "source-video", mimeType: "video/quicktime", sizeBytes: 512 * 1024 * 1024 });

    const plan = createEvidencePreviewPlan(evidence);

    expect(plan.immediatePreviewIDs).toHaveLength(DEFAULT_EVIDENCE_PREVIEW_PAGE_SIZE);
    expect(plan.lazyPreviewIDs).toEqual(["image-13", "image-14"]);
    expect(plan.skippedPreviewIDs).toEqual(["huge-image", "source-video"]);
    expect(plan.totalPreviewBytes).toBe(DEFAULT_EVIDENCE_PREVIEW_PAGE_SIZE * 1024 * 1024);
    expect(plan.warnings.join(" ")).toContain("lazy-loaded");
    expect(plan.warnings.join(" ")).toContain("metadata only");
  });

  it("creates deterministic chunking plans for long validation and export runs", () => {
    const plan = createIncrementalProcessingPlan({
      totalItems: 525,
      largeItemCount: 3,
      chunkSize: 50
    });
    const chunks = [...iterateInChunks(Array.from({ length: 105 }, (_, index) => index), 25)];

    expect(plan).toMatchObject({
      chunkCount: 11,
      chunkSize: 50,
      workerRecommended: true,
      estimatedLargeItemCount: 3
    });
    expect(chunks.map((chunk) => chunk.length)).toEqual([25, 25, 25, 25, 5]);
  });
});
