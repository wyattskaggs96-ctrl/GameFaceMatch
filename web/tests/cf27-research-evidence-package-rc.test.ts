import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root Phase 0 evidence-package CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { CF27_RESEARCH_EVIDENCE_PACKAGE_RC_SCHEMA_VERSION, generateResearchEvidencePackageManifest } from "../../scripts/cf27-research-evidence-package-rc.mjs";

const repositoryRoot = path.resolve(process.cwd(), "..");

describe("CF27 research evidence package release candidate", () => {
  it("passes custody and path-resolution checks for the canonical Phase 0 artifacts", () => {
    const manifest = generateResearchEvidencePackageManifest({
      root: repositoryRoot,
      generatedAt: "2026-07-14T02:45:00-04:00"
    });

    expect(manifest.schemaVersion).toBe(CF27_RESEARCH_EVIDENCE_PACKAGE_RC_SCHEMA_VERSION);
    expect(manifest.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(manifest.productionRecommendationsEnabled).toBe(false);
    expect(manifest.releaseCandidateStatus).toBe("PASS_RESEARCH_PACKAGE_RC_PATH_RESOLUTION");
    expect(manifest.summary.sourceMastersInInventory).toBe(14);
    expect(manifest.summary.uniqueSourceMastersInEvidenceManifest).toBe(12);
    expect(manifest.summary.derivativeEvidenceEntries).toBe(113);
    expect(manifest.summary.exactDuplicateSourceFilesDocumented).toBe(2);
    expect(manifest.summary.catalogRowsWithInvalidEvidence).toBe(0);
    expect(manifest.summary.missingResolvedFiles).toBe(0);
    expect(manifest.summary.captureLogChronological).toBe(true);
    expect(manifest.summary.issuesWithoutLinks).toBe(0);
    expect(manifest.blockers).toHaveLength(0);
    expect(JSON.stringify(manifest)).not.toContain("/Users/skaggssystems/");
  });

  it("requires every source master to retain portable metadata and every derivative to link to a timestamped master", () => {
    const manifest = generateResearchEvidencePackageManifest({ root: repositoryRoot });

    for (const master of manifest.masterInventory) {
      expect(master.portableRelativeEvidencePath, master.inventoryId).toMatch(/^(OWNER_DOWNLOADS|source-media\/NCAA 26)\//);
      expect(master.sha256, master.inventoryId).toMatch(/^[a-f0-9]{64}$/);
      expect(master.fileSizeBytes, master.inventoryId).toBeGreaterThan(0);
      expect(master.hasMediaType, master.inventoryId).toBe(true);
    }

    for (const derivative of manifest.derivativeInventory) {
      expect(derivative.hasMasterReference, derivative.evidenceID).toBe(true);
      expect(derivative.hasSourceTimestamp, derivative.evidenceID).toBe(true);
      expect(derivative.hasSha256, derivative.evidenceID).toBe(true);
      expect(derivative.hasFileSize, derivative.evidenceID).toBe(true);
      expect(derivative.hasMediaType, derivative.evidenceID).toBe(true);
    }
  });

  it("documents exact duplicate source files without deleting their provenance", () => {
    const manifest = generateResearchEvidencePackageManifest({ root: repositoryRoot });

    expect(manifest.duplicateEvidence.exactDuplicateGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          duplicateInventoryId: "phase0-video-010",
          duplicateOfInventoryId: "phase0-video-005"
        }),
        expect.objectContaining({
          duplicateInventoryId: "phase0-video-011",
          duplicateOfInventoryId: "phase0-video-004"
        })
      ])
    );
  });

  it("blocks the release candidate when a derivative file cannot be resolved", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gfm-evidence-rc-"));
    writeJSON(tempRoot, "data/phase-zero/video_inventory.json", {
      inventory: [
        {
          inventoryId: "phase0-video-fixture-001",
          originalFilename: "fixture-source.mp4",
          canonicalFilename: "fixture-source.mp4",
          sourceLocation: {
            portableRelativeEvidencePath: "OWNER_DOWNLOADS/fixture-source.mp4"
          },
          sha256: "a".repeat(64),
          fileSizeBytes: 1024,
          mediaContainer: "MP4",
          durationSeconds: 1,
          dimensions: { width: 1920, height: 1080 },
          frameRate: 30,
          fileOpenStatus: "opens",
          preservationStatus: "master_preserved_unchanged",
          exactDuplicate: false,
          exactDuplicateOf: null,
          productionUseStatus: "not_production_data"
        }
      ]
    });
    writeJSON(tempRoot, "data/phase-zero/evidence_manifest.json", {
      entries: [
        {
          evidence_id: "phase0-source-fixture-001",
          video_id: "phase0-video-fixture-001",
          relative_path: "OWNER_DOWNLOADS/fixture-source.mp4",
          master_or_derivative: "master",
          file_role: "source_video_master_reference",
          sha256: "a".repeat(64),
          size_bytes: 1024,
          mime_type: "video/mp4",
          source_video: "fixture-source.mp4",
          timestamp: null,
          verification_state: "OBSERVED_PENDING_VERIFICATION"
        },
        {
          evidence_id: "phase0-frame-missing",
          video_id: "phase0-video-fixture-001",
          relative_path: "data/phase-zero/derivative-frames/missing.png",
          master_or_derivative: "derivative",
          file_role: "phase_zero_timeline_derivative",
          sha256: "b".repeat(64),
          size_bytes: 2048,
          mime_type: "image/png",
          source_video: "fixture-source.mp4",
          timestamp: 0.5,
          verification_state: "OBSERVED_PENDING_VERIFICATION"
        }
      ]
    });
    writeJSON(tempRoot, "data/phase-zero/capture_log.json", {
      events: [
        {
          capture_event_id: "capture-fixture-001",
          video_id: "phase0-video-fixture-001",
          start_timestamp: 0,
          end_timestamp: 1,
          evidence_generated: ["phase0-frame-missing"]
        }
      ]
    });
    writeJSON(tempRoot, "data/phase-zero/issues_register.research.json", {
      issues: [
        {
          issueID: "issue-fixture-linked",
          affectedRecordIDs: ["CF27_FIXTURE_RECORD_001"]
        }
      ]
    });
    writeJSON(tempRoot, "data/phase-zero/heads.research.json", {
      records: [
        {
          stableResearchCatalogID: "CF27_FIXTURE_RECORD_001",
          evidenceFrame: { evidenceID: "phase0-frame-missing" },
          productionStatus: "NOT_PRODUCTION_DATA",
          verificationStatus: "OBSERVED_PENDING_VERIFICATION"
        }
      ]
    });

    const manifest = generateResearchEvidencePackageManifest({ root: tempRoot });

    expect(manifest.releaseCandidateStatus).toBe("BLOCKED_RESEARCH_PACKAGE_RC");
    expect(manifest.pathResolution.missingFiles).toEqual([
      {
        id: "phase0-frame-missing",
        relativePath: "data/phase-zero/derivative-frames/missing.png",
        kind: "derivative"
      }
    ]);
    expect(manifest.summary.blockingIssueCount).toBeGreaterThan(0);
  });
});

function writeJSON(root: string, relativePath: string, value: unknown) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
}
