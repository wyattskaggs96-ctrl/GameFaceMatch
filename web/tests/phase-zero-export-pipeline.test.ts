import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PHASE0_EXPORT_PIPELINE_SCHEMA_VERSION,
  PHASE0_REQUIRED_EXPORT_FILE_NAMES,
  assertCompletePhase0ExportPackage,
  createPhase0ExportPackage
} from "@/lib/phase-zero/phase-zero-export-pipeline";
import {
  PHASE0_DOMAIN_SCHEMA_VERSION,
  createEmptyPhase0DomainSnapshot,
  type Phase0CatalogItem,
  type Phase0CreationPath,
  type Phase0DomainSnapshot,
  type Phase0VerificationRecord
} from "@/lib/phase-zero/phase-zero-domain";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 CSV and JSON export pipeline", () => {
  it("documents the required machine-readable export package schema and file names", () => {
    const schema = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/schemas/phase-zero-export-package.schema.json"), "utf8"));

    expect(schema.properties.schemaVersion.const).toBe(PHASE0_EXPORT_PIPELINE_SCHEMA_VERSION);
    expect(schema.$defs.fileName.enum).toEqual([...PHASE0_REQUIRED_EXPORT_FILE_NAMES]);
    expect(schema.$defs.exportFile.properties.contentType.enum).toEqual(expect.arrayContaining([
      "application/json; charset=utf-8",
      "text/csv; charset=utf-8"
    ]));
  });

  it("emits every required export file for an empty production snapshot", () => {
    const exportPackage = createPhase0ExportPackage(createEmptyPhase0DomainSnapshot(now), "production");

    assertCompletePhase0ExportPackage(exportPackage);
    expect(exportPackage.files.map((file) => file.fileName)).toEqual([...PHASE0_REQUIRED_EXPORT_FILE_NAMES]);
    expect(exportPackage.files.every((file) => file.contentUtf8.endsWith("\n"))).toBe(true);
    expect(exportPackage.productionReadiness.ok).toBe(false);
    expect(exportPackage.productionReadiness.warnings).toContain("Production catalog export contains zero verified records; recommendations remain unavailable.");
  });

  it("uses deterministic ordering for JSON and CSV exports", () => {
    const snapshot = sampleSnapshot();
    snapshot.creationPaths = [creationPath("path-b", 2), creationPath("path-a", 1)];

    const first = createPhase0ExportPackage(snapshot, "production");
    const second = createPhase0ExportPackage(snapshot, "production");
    const csv = content(first, "creation_paths.csv");

    expect(first.files.map((file) => file.contentUtf8)).toEqual(second.files.map((file) => file.contentUtf8));
    expect(csv.indexOf("path-a")).toBeLessThan(csv.indexOf("path-b"));
  });

  it("escapes CSV values while keeping UTF-8 content deterministic", () => {
    const snapshot = sampleSnapshot();
    snapshot.issues = [{
      id: "issue-csv",
      schemaVersion: PHASE0_DOMAIN_SCHEMA_VERSION,
      createdAt: now,
      updatedAt: now,
      relatedEntityID: "head-production",
      severity: "warning",
      status: "open",
      title: "Comma, quote \" check",
      description: "Line one\nLine two",
      openedBy: "researcher",
      resolvedAt: null
    }];

    const csv = content(createPhase0ExportPackage(snapshot, "production"), "issues_and_exceptions.csv");

    expect(csv).toContain("\"Comma, quote \"\" check\"");
    expect(csv).toContain("\"Line one\nLine two\"");
  });

  it("excludes fixtures from production package exports", () => {
    const snapshot = sampleSnapshot();
    snapshot.catalogItems.push(catalogItem({
      id: "head-fixture",
      stableInternalID: "CF27_SYNTH_FIXTURE_HEAD_001",
      isTestFixture: true,
      isProductionCandidate: true,
      verificationRecordIDs: []
    }));

    const exportPackage = createPhase0ExportPackage(snapshot, "production");
    const manifest = JSON.parse(content(exportPackage, "catalog_manifest.json"));
    const heads = content(exportPackage, "heads.csv");

    expect(manifest.items.some((item: { id: string }) => item.id === "head-fixture")).toBe(false);
    expect(heads).not.toContain("head-fixture");
    expect(exportPackage.productionReadiness.fixtureRecordsExcluded).toContain("head-fixture");
  });

  it("exports verified production candidates into catalog_manifest.json with readiness status", () => {
    const exportPackage = createPhase0ExportPackage(sampleSnapshot(), "production");
    const manifest = JSON.parse(content(exportPackage, "catalog_manifest.json"));
    const readiness = JSON.parse(content(exportPackage, "production_readiness.json"));

    expect(exportPackage.productionReadiness.ok).toBe(true);
    expect(manifest.sourceType).toBe("production");
    expect(manifest.declaredItemCount).toBe(1);
    expect(manifest.items[0].stableInternalID).toBe("CF27_VERIFIED_HEAD_001");
    expect(readiness.counts.catalogItemsExported).toBe(1);
  });
});

function content(exportPackage: ReturnType<typeof createPhase0ExportPackage>, fileName: string) {
  const file = exportPackage.files.find((item) => item.fileName === fileName);
  if (!file) throw new Error(`Missing ${fileName}`);
  return file.contentUtf8;
}

function sampleSnapshot(): Phase0DomainSnapshot {
  const snapshot = createEmptyPhase0DomainSnapshot(now);
  const firstReview = verificationRecord("review-head-production-first", "first", "reviewer-one");
  const secondReview = verificationRecord("review-head-production-second", "second", "reviewer-two");
  snapshot.verificationRecords = [secondReview, firstReview];
  snapshot.catalogItems = [
    catalogItem({
      id: "head-production",
      stableInternalID: "CF27_VERIFIED_HEAD_001",
      isTestFixture: false,
      isProductionCandidate: true,
      verificationRecordIDs: [firstReview.id, secondReview.id]
    })
  ];
  snapshot.evidenceFiles = [{
    id: "evidence-production-front",
    schemaVersion: PHASE0_DOMAIN_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    kind: "screenshot",
    relativePath: "data/catalog/production/evidence/head-production-front.png",
    sha256: "a".repeat(64),
    storageScope: "productionReference",
    containsRawFaceMedia: false,
    approvedForProductionCatalog: true,
    capturedAt: now,
    capturedAngleID: "straightOn",
    fileSizeBytes: 1200,
    width: 1920,
    height: 1080
  }];
  return snapshot;
}

function catalogItem(input: {
  id: string;
  stableInternalID: string;
  isTestFixture: boolean;
  isProductionCandidate: boolean;
  verificationRecordIDs: string[];
}): Phase0CatalogItem {
  return {
    id: input.id,
    schemaVersion: PHASE0_DOMAIN_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    stableInternalID: input.stableInternalID,
    kind: "head",
    gameID: "game-cf27",
    platformID: "platform-ps5",
    gameVersionID: "version-verified",
    patchID: "patch-verified",
    creationPathID: "creation-path-rtg",
    menuItemID: "menu-head",
    categoryLabel: "Verified category from evidence",
    exactVisibleLabelOrIndex: "Verified label from evidence",
    verificationState: input.verificationRecordIDs.length > 0 ? "verified" : "draft",
    evidenceFileIDs: ["evidence-production-front"],
    captureEventIDs: [],
    verificationRecordIDs: input.verificationRecordIDs,
    issueIDs: [],
    isTestFixture: input.isTestFixture,
    isProductionCandidate: input.isProductionCandidate,
    catalogVersionID: "catalog-version-verified",
    supportedMeasurementIDs: [],
    geometryAnnotationStatus: "partial"
  };
}

function verificationRecord(id: string, stage: "first" | "second", verifierID: string): Phase0VerificationRecord {
  return {
    id,
    schemaVersion: PHASE0_DOMAIN_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    targetEntityID: "head-production",
    targetEntityType: "catalogItem",
    stage,
    verifierID,
    decision: "approved",
    reviewedAt: now,
    checklistVersion: "catalog-review-v1",
    evidenceFileIDs: ["evidence-production-front"],
    discrepancyIDs: [],
    notes: "Synthetic unit-test verification record."
  };
}

function creationPath(id: string, stepNumber: number): Phase0CreationPath {
  return {
    id,
    schemaVersion: PHASE0_DOMAIN_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    gameID: "game-cf27",
    gameMode: "Road to Glory",
    displayName: `Path ${stepNumber}`,
    exactPath: `Path ${stepNumber}`,
    platformIDs: ["platform-ps5"],
    observedPatchIDs: ["patch-verified"],
    menuItemIDs: [],
    reproducibleSteps: [{
      stepNumber: 1,
      instruction: "Open verified path from evidence.",
      expectedResult: "Verified screen appears.",
      menuItemID: null,
      evidenceFileIDs: ["evidence-production-front"]
    }],
    requirements: [],
    restrictions: [],
    appearanceRelevance: {
      affectsAppearance: true,
      affectedCatalogKinds: ["head"],
      affectedAttributeFamilies: [],
      notes: "Synthetic test path."
    },
    dependencies: [],
    verificationState: "draft",
    verificationRecordIDs: [],
    evidenceFileIDs: ["evidence-production-front"],
    status: "inAudit"
  };
}
