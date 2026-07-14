import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateImageMetadata } from "@/lib/capture/image-validation";
import {
  isProductionPublishGateApproved,
  evaluateProductionPublishGate,
  PRODUCTION_PUBLISH_GATE_VERSION,
  type ProductionPublishGateReport
} from "@/lib/catalog/production-publish-gate";
import { validatePhase0EvidenceFile, PHASE0_EVIDENCE_SCHEMA_VERSION, type Phase0EvidenceFileRecord } from "@/lib/phase-zero/phase-zero-evidence";
import { createEmptyPhase0DomainSnapshot } from "@/lib/phase-zero/phase-zero-domain";
import { createPhase0ExportPackage } from "@/lib/phase-zero/phase-zero-export-pipeline";
import {
  parseLocalStorageJSON,
  sanitizeCSVCellForExport,
  validateUntrustedMetadata,
  isSafeRepositoryRelativePath,
  isSafeUploadFileName
} from "@/lib/security/security-hardening";
import { isAllowedResearchVideoCandidate, resolveResearchVideoPath, type ResearchVideoInventoryFile } from "@/lib/security/research-video-access";

const now = "2026-07-13T00:00:00.000Z";

describe("security hardening", () => {
  it("keeps production browser source maps disabled", () => {
    const config = fs.readFileSync(path.resolve(process.cwd(), "next.config.ts"), "utf8");
    expect(config).toContain("productionBrowserSourceMaps: false");
  });

  it("removes unsafe-eval from the production Content Security Policy", () => {
    const config = fs.readFileSync(path.resolve(process.cwd(), "next.config.ts"), "utf8");
    expect(config).toContain("process.env.NODE_ENV === \"production\"");
    expect(config).toContain("script-src 'self' 'unsafe-inline';");
    expect(config).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval';");
  });

  it("neutralizes spreadsheet formulas in CSV exports", () => {
    expect(sanitizeCSVCellForExport("=IMPORTXML(\"https://example.test\")")).toBe("'=IMPORTXML(\"https://example.test\")");
    expect(sanitizeCSVCellForExport("+cmd")).toBe("'+cmd");
    expect(sanitizeCSVCellForExport("-2+3")).toBe("'-2+3");
    expect(sanitizeCSVCellForExport("@SUM(1,2)")).toBe("'@SUM(1,2)");
    expect(sanitizeCSVCellForExport("ordinary note")).toBe("ordinary note");
  });

  it("applies CSV injection protection to Phase 0 export files", () => {
    const snapshot = createEmptyPhase0DomainSnapshot(now);
    snapshot.issues = [
      {
        id: "issue-security",
        schemaVersion: snapshot.schemaVersion,
        createdAt: now,
        updatedAt: now,
        relatedEntityID: "",
        severity: "warning",
        status: "open",
        title: "=HYPERLINK(\"https://example.test\")",
        description: "@formula-like value",
        openedBy: "security-test",
        resolvedAt: null
      }
    ];

    const issueCSV = createPhase0ExportPackage(snapshot, "production").files.find((file) => file.fileName === "issues_and_exceptions.csv")?.contentUtf8;

    expect(issueCSV).toContain("'=HYPERLINK");
    expect(issueCSV).toContain("'@formula-like value");
  });

  it("rejects unsafe upload filenames and MIME/extension mismatches", () => {
    expect(isSafeUploadFileName("front.jpg", { allowedExtensions: [".jpg"] })).toBe(true);
    expect(isSafeUploadFileName("../front.jpg", { allowedExtensions: [".jpg"] })).toBe(false);
    expect(isSafeUploadFileName("folder/front.jpg", { allowedExtensions: [".jpg"] })).toBe(false);
    expect(isSafeUploadFileName("front\u0000.jpg", { allowedExtensions: [".jpg"] })).toBe(false);

    const result = validateImageMetadata({
      fileName: "../front.svg",
      fileType: "image/svg+xml",
      fileSizeBytes: 12_000,
      width: 900,
      height: 900
    });

    expect(result.errors).toContain("Use a JPEG, PNG, or WebP image.");
    expect(result.errors).toContain("Use a file ending in .jpg, .jpeg, .png, or .webp.");
    expect(result.errors).toContain("Use a simple image filename without folders, control characters, or unsafe path characters.");
  });

  it("rejects evidence paths that traverse, escape, or encode traversal", () => {
    expect(isSafeRepositoryRelativePath("data/catalog/production/evidence/front.png")).toBe(true);
    for (const relativePath of [
      "/Users/wyatt/evidence.png",
      "https://example.test/evidence.png",
      "data\\catalog\\..\\secret.png",
      "data/catalog/%2e%2e/secret.png",
      "data/catalog//front.png",
      "C:\\Users\\wyatt\\front.png"
    ]) {
      const evidence = validEvidence();
      evidence.relativePath = relativePath;
      expect(validatePhase0EvidenceFile(evidence).errors.map((error) => error.code), relativePath).toContain("absoluteProductionEvidencePath");
    }
  });

  it("falls back on malformed or oversized local JSON instead of throwing", () => {
    expect(parseLocalStorageJSON("{", { safe: true })).toEqual({ ok: false, value: { safe: true }, error: "malformed" });
    expect(parseLocalStorageJSON("x".repeat(300 * 1024), [])).toEqual({ ok: false, value: [], error: "oversized" });
    expect(parseLocalStorageJSON(null, null)).toEqual({ ok: true, value: null, error: "missing" });
  });

  it("rejects oversized, malformed, or unexpected untrusted metadata", () => {
    expect(validateUntrustedMetadata({ status: "ok", count: 1 }, ["status", "count"])).toEqual({ ok: true, errors: [] });
    const result = validateUntrustedMetadata(
      {
        status: "x".repeat(300),
        unexpected: "value",
        poisoned: "bad\u0000value"
      },
      ["status"]
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "Metadata key 'unexpected' is not allowed.",
      "Metadata key 'poisoned' is not allowed.",
      "Metadata value for 'status' is not safe.",
      "Metadata value for 'poisoned' is not safe."
    ]));
  });

  it("serves research videos only from configured or repository-local roots", () => {
    const tempRoot = fs.mkdtempSync(path.join(process.cwd(), ".tmp-security-"));
    try {
      const configuredRoot = path.join(tempRoot, "configured-videos");
      const externalRoot = path.join(tempRoot, "external-downloads");
      const repositoryRoot = path.join(tempRoot, "repo");
      fs.mkdirSync(configuredRoot, { recursive: true });
      fs.mkdirSync(externalRoot, { recursive: true });
      fs.mkdirSync(repositoryRoot, { recursive: true });
      fs.writeFileSync(path.join(configuredRoot, "source.mp4"), "configured video");
      fs.writeFileSync(path.join(externalRoot, "source.mp4"), "external video");

      const inventoryEntry: ResearchVideoInventoryFile = {
        inventoryId: "video-001",
        workingFilename: "source.mp4",
        manifestOriginalFilename: "source-original.mp4",
        discoveredFilename: "source-discovered.mp4",
        absoluteDiscoveryPathInternal: path.join(externalRoot, "source.mp4"),
        portableRelativeEvidencePath: "OWNER_DOWNLOADS/source.mp4"
      };

      expect(resolveResearchVideoPath({ repositoryRoot, configuredVideoRoot: configuredRoot, inventoryEntry })).toBe(path.join(configuredRoot, "source.mp4"));
      expect(resolveResearchVideoPath({ repositoryRoot, configuredVideoRoot: null, inventoryEntry })).toBeNull();
      expect(isAllowedResearchVideoCandidate({ repositoryRoot, configuredVideoRoot: configuredRoot, candidate: path.join(externalRoot, "source.mp4") })).toBe(false);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("does not allow a partial or spoofed production gate report to enable recommendations", () => {
    const spoofedReport: ProductionPublishGateReport = {
      schemaVersion: PRODUCTION_PUBLISH_GATE_VERSION,
      ok: true,
      generatedAt: now,
      catalogVersionID: "spoofed",
      checks: [],
      errors: []
    };

    expect(isProductionPublishGateApproved(spoofedReport)).toBe(false);
    expect(isProductionPublishGateApproved({ ...spoofedReport, schemaVersion: "wrong" as never })).toBe(false);
  });

  it("keeps fixture and placeholder records blocked by the production gate", () => {
    const report = evaluateProductionPublishGate({
      generatedAt: now,
      catalogPackage: {
        manifest: {
          sourceType: "testFixture",
          catalogVersion: { identifier: "fixture-catalog", gameVersion: "fixture", platform: "fixture", verifiedAt: now },
          generatedAt: now,
          isProduction: true,
          packageChecksum: "a".repeat(64),
          items: []
        },
        items: [],
        assets: [{ assetID: "fixture-asset", relativePath: "data/fixtures/test-only/front.png", sha256: "a".repeat(64) }],
        publication: {
          sourcePackageChecksum: "a".repeat(64),
          stateTransition: { from: "draft", to: "approvedRelease", approvedByReviewID: "review" }
        }
      },
      importValidationReport: { ok: false, checks: [] },
      catalogManagerReport: null,
      secondPersonVerificationRecords: [],
      discrepancies: [],
      shippingEnvironment: null,
      menuMap: null,
      categoryCounts: null,
      supportedTargets: null
    });

    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining(["manifestNotProduction", "fixtureEvidencePath"]));
    expect(isProductionPublishGateApproved(report)).toBe(false);
  });
});

function validEvidence(): Phase0EvidenceFileRecord {
  return {
    schemaVersion: PHASE0_EVIDENCE_SCHEMA_VERSION,
    stableEvidenceID: "evidence-security-001",
    relativePath: "data/audit/college-football-27/evidence/security/front.png",
    derivativeState: "master",
    fileRole: "standardAngle",
    sha256: "a".repeat(64),
    sizeBytes: 2048,
    mimeType: "image/png",
    platformID: "platform-security",
    gameVersionID: "version-security",
    patchID: "patch-security",
    mode: "security-mode",
    creationPathID: "creation-path-security",
    environmentID: "environment-security",
    catalogItemID: "catalog-item-security",
    view: "straightOn",
    captureMethod: "captureCard",
    captureDevice: "security-test-device",
    capturedAt: now,
    researcherID: "researcher-security",
    verifierID: null,
    verificationStatus: "firstReviewPending",
    supersededEvidenceID: null,
    notes: "Synthetic security test evidence metadata."
  };
}
