import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createPhase0StatusReport, CURRENT_PHASE0_REPOSITORY_STATE, type Phase0AreaID } from "@/lib/phase-zero/phase-zero-status";

const requiredAreas: Phase0AreaID[] = [
  "publicResearch",
  "auditPreparation",
  "shippingGameInspection",
  "environmentDocumentation",
  "creationPathMapping",
  "menuMapping",
  "headCatalog",
  "hairstyleCatalog",
  "facialHairCatalog",
  "additionalAttributes",
  "dependencyTesting",
  "evidenceIntegrity",
  "catalogExports",
  "catalogManagerValidation",
  "secondPersonVerification",
  "manualMatchingFeasibility",
  "overallPhase0"
];

describe("Phase 0 status service", () => {
  it("reports every required Phase 0 area from repository and catalog state", () => {
    const report = createPhase0StatusReport();
    const ids = [...report.areas.map((area) => area.id), report.overall.id];
    expect(ids).toEqual(requiredAreas);
    expect(report.productionRecordCount).toBe(0);
    expect(report.verifiedProductionRecordCount).toBe(0);
    expect(report.overall.status).toBe("BLOCKED");
    expect(report.overall.percentComplete).toBeLessThan(100);
  });

  it("does not inflate blocked catalog work while production catalog is empty", () => {
    const report = createPhase0StatusReport();
    for (const id of ["shippingGameInspection", "headCatalog", "hairstyleCatalog", "facialHairCatalog", "secondPersonVerification"] as Phase0AreaID[]) {
      const area = report.areas.find((candidate) => candidate.id === id);
      expect(area?.status).toBe("BLOCKED");
      expect(area?.percentComplete).toBe(0);
    }
  });

  it("marks audit preparation and environment documentation complete from existing repository files", () => {
    const report = createPhase0StatusReport();
    expect(report.areas.find((area) => area.id === "auditPreparation")?.status).toBe("COMPLETE");
    expect(report.areas.find((area) => area.id === "environmentDocumentation")?.status).toBe("COMPLETE");
  });

  it("uses repository paths that exist in the workspace", () => {
    const root = path.resolve(process.cwd(), "..");
    const paths = [
      ...CURRENT_PHASE0_REPOSITORY_STATE.repositoryFiles,
      ...CURRENT_PHASE0_REPOSITORY_STATE.auditTemplateFiles,
      ...CURRENT_PHASE0_REPOSITORY_STATE.schemaFiles
    ];
    for (const relativePath of paths) {
      expect(fs.existsSync(path.join(root, relativePath)), relativePath).toBe(true);
    }
  });
});
