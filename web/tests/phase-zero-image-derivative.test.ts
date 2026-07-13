import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PHASE0_IMAGE_DERIVATIVE_SCHEMA_VERSION,
  createDefaultImageTransform,
  createImageDerivativeLocalStore,
  createImageDerivativePlan,
  validateImageDerivativeRequest,
  type Phase0ImageDerivativeRequest
} from "@/lib/phase-zero/phase-zero-image-derivative";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 image derivative tool", () => {
  it("documents non-destructive derivative schema fields", () => {
    const schema = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/schemas/image-derivative.schema.json"), "utf8"));

    expect(schema.required).toContain("sourceMasterEvidenceID");
    expect(schema.required).toContain("transformationMetadata");
    expect(schema.properties.derivativeState.const).toBe("derivative");
    expect(schema.$defs.transformationMetadata.properties.preservesDepictedOption.const).toBe(true);
    expect(schema.$defs.transformationMetadata.properties.prohibitedOperations.maxItems).toBe(0);
  });

  it("creates derivative records with crop, rotation, framing, alignment, and master provenance", () => {
    const plan = createImageDerivativePlan(validRequest());

    expect(plan.status).toBe("ready");
    expect(plan.destructiveOverwriteAllowed).toBe(false);
    expect(plan.record).toMatchObject({
      schemaVersion: PHASE0_IMAGE_DERIVATIVE_SCHEMA_VERSION,
      derivativeID: "derivative-synthetic-front",
      sourceMasterEvidenceID: "master-evidence-synthetic-front",
      sourceMasterRelativePath: "data/audit/college-football-27/evidence/masters/master-front.png",
      outputRelativePath: "data/audit/college-football-27/evidence/derivatives/derivative-front.png",
      derivativeState: "derivative",
      exportFormat: "image/png",
      view: "straightOn"
    });
    expect(plan.record?.transformationMetadata.framingGuides).toEqual(["centerCrosshair", "safeMargin"]);
    expect(plan.record?.transformationMetadata.faceRegionAlignmentGuide.notes).toMatch(/Alignment guide only/);
    expect(plan.record?.preservationNote).toMatch(/master evidence file is never overwritten/);
    expect(JSON.stringify(plan.record)).not.toContain("fileBytes");
  });

  it("estimates fixed aspect-ratio output while preserving crop semantics", () => {
    const request = validRequest();
    request.transform.crop = { unit: "normalized", x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
    request.transform.aspectRatio = { mode: "fixed", width: 1, height: 1 };
    const plan = createImageDerivativePlan(request);

    expect(plan.record?.outputDimensions).toEqual({ width: 1600, height: 1600 });
  });

  it("rejects output paths that overwrite the master", () => {
    const request = validRequest();
    request.outputRelativePath = request.sourceMaster.relativePath;

    expect(validateImageDerivativeRequest(request).map((issue) => issue.code)).toContain("wouldOverwriteMaster");
    expect(createImageDerivativePlan(request).record).toBeNull();
  });

  it("rejects unsafe paths, invalid crops, invalid rotation, and missing operator metadata", () => {
    const request = validRequest();
    request.sourceMaster.relativePath = "/Users/wyatt/master.png";
    request.outputRelativePath = "../derivatives/output.png";
    request.transform.crop = { unit: "normalized", x: 0.8, y: 0.8, width: 0.4, height: 0.4 };
    request.transform.rotationDegrees = 60;
    request.operatorID = "";

    const codes = validateImageDerivativeRequest(request).map((issue) => issue.code);
    expect(codes).toEqual(expect.arrayContaining(["unsafeMasterPath", "unsafeOutputPath", "cropOutOfBounds", "invalidRotation", "missingOperator"]));
  });

  it("rejects beauty filters, generative edits, geometry warping, and option-changing modifications", () => {
    const request = validRequest();
    request.transform.prohibitedOperations = ["beautyFilter", "generativeEdit", "geometryWarp", "optionChangingEdit"];
    (request.transform as unknown as { preservesDepictedOption: boolean }).preservesDepictedOption = false;

    const codes = validateImageDerivativeRequest(request).map((issue) => issue.code);
    expect(codes).toContain("prohibitedVisualModification");
    expect(codes).toContain("optionChangingEdit");
  });

  it("warns when alignment guide is enabled but not operator-confirmed", () => {
    const request = validRequest();
    request.transform.faceRegionAlignmentGuide.enabled = true;
    request.transform.faceRegionAlignmentGuide.operatorConfirmed = false;
    const plan = createImageDerivativePlan(request);

    expect(plan.status).toBe("ready");
    expect(plan.warnings.map((warning) => warning.code)).toContain("alignmentGuideUnconfirmed");
  });

  it("stores only derivative metadata in local storage", () => {
    const storage = fakeStorage();
    const store = createImageDerivativeLocalStore(storage);
    const record = createImageDerivativePlan(validRequest()).record;
    expect(record).not.toBeNull();

    store.save(record ? [record] : []);
    const raw = storage.getItem("gameface-match.phase0.image-derivative.metadata.v1") ?? "";

    expect(store.load()).toHaveLength(1);
    expect(raw).toContain("derivative-front.png");
    expect(raw).not.toContain("data:image");
    expect(raw).not.toContain("ArrayBuffer");
    store.clear();
    expect(store.load()).toEqual([]);
  });
});

function validRequest(): Phase0ImageDerivativeRequest {
  return {
    derivativeID: "derivative-synthetic-front",
    sourceMaster: {
      stableEvidenceID: "master-evidence-synthetic-front",
      relativePath: "data/audit/college-football-27/evidence/masters/master-front.png",
      sha256: "a".repeat(64),
      dimensions: {
        width: 2000,
        height: 2400
      },
      view: "straightOn",
      derivativeState: "master"
    },
    outputRelativePath: "data/audit/college-football-27/evidence/derivatives/derivative-front.png",
    exportFormat: "image/png",
    transform: createDefaultImageTransform(),
    operatorID: "operator-synthetic",
    exportedAt: now,
    notes: "Synthetic derivative metadata for crop and alignment testing."
  };
}

function fakeStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    }
  };
}
