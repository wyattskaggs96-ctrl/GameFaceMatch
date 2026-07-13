import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createUnavailablePhase0FeatureMetric,
  phase0FacialFeatureGroups,
  PHASE0_FACIAL_FEATURE_TAXONOMY_VERSION,
  prohibitedFacialFeatureAnnotationKeys,
  validatePhase0FacialFeatureAnnotationSet,
  type Phase0FacialFeatureAnnotationSet,
  type Phase0FeatureMetric
} from "@/lib/phase-zero/phase-zero-facial-feature-taxonomy";

const now = "2026-07-13T00:00:00.000Z";

describe("Phase 0 objective facial-feature taxonomy", () => {
  it("defines all required objective feature groups in code and schema", () => {
    expect(phase0FacialFeatureGroups).toEqual([
      "face",
      "forehead",
      "temples",
      "cheekbones",
      "jaw",
      "chin",
      "eyes",
      "brows",
      "nose",
      "mouth",
      "ears",
      "symmetry",
      "hairline",
      "facialHairCoverage"
    ]);

    const schema = readSchema();
    for (const group of phase0FacialFeatureGroups) {
      expect(schema.properties.researcherAppliedMetadata.required).toContain(group);
      expect(schema.properties.researcherAppliedMetadata.properties[group]).toBeTruthy();
    }
  });

  it("keeps native game labels separate from researcher-applied metadata", () => {
    const annotation = validAnnotationSet();
    expect(annotation.nativeGameLabel.visibleGameLabelOrIndex).toBe("SYNTHETIC_VISIBLE_LABEL_TEST_ONLY");
    expect(annotation.researcherAppliedMetadata).not.toHaveProperty("visibleGameLabelOrIndex");
    expect(validatePhase0FacialFeatureAnnotationSet(annotation)).toMatchObject({ ok: true, errors: [] });
  });

  it("rejects prohibited sensitive, identity, and real-person resemblance labels", () => {
    const annotation = validAnnotationSet() as unknown as Phase0FacialFeatureAnnotationSet & {
      researcherAppliedMetadata: Record<string, unknown>;
    };
    annotation.researcherAppliedMetadata.race = "blocked";
    annotation.researcherAppliedMetadata.nose = {
      ...(annotation.researcherAppliedMetadata.nose as unknown as Record<string, unknown>),
      realPersonResemblance: "blocked"
    } as never;

    const report = validatePhase0FacialFeatureAnnotationSet(annotation);
    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining(["prohibitedAnnotationField"]));
    expect(report.errors.map((error) => error.path)).toEqual(expect.arrayContaining(["researcherAppliedMetadata.race", "researcherAppliedMetadata.realPersonResemblance"]));
    expect(prohibitedFacialFeatureAnnotationKeys).toEqual(
      expect.arrayContaining(["race", "ethnicity", "attractiveness", "personality", "identity", "criminality", "health", "realPersonResemblance"])
    );
  });

  it("requires complete native-label references and metric evidence for reviewed values", () => {
    const annotation = validAnnotationSet();
    annotation.nativeGameLabel.visibleGameLabelOrIndex = "";
    annotation.researcherAppliedMetadata.face.widthClass = {
      value: "wide",
      source: "researcherReviewed",
      confidence: 0.8,
      evidenceFileIDs: []
    };

    const report = validatePhase0FacialFeatureAnnotationSet(annotation);
    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining(["missingNativeGameLabel", "invalidMetric"]));
  });

  it("allows honest unavailable metrics without evidence references or fabricated values", () => {
    const unavailable = createUnavailablePhase0FeatureMetric<number | null>(null);
    expect(unavailable).toEqual({
      value: null,
      source: "unavailable",
      confidence: 0,
      evidenceFileIDs: []
    });

    const annotation = validAnnotationSet();
    annotation.researcherAppliedMetadata.chin.projectionClass = createUnavailablePhase0FeatureMetric("unknown");
    expect(validatePhase0FacialFeatureAnnotationSet(annotation)).toMatchObject({ ok: true });
  });
});

function readSchema() {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/schemas/facial-feature-taxonomy.schema.json"), "utf8"));
}

function metric<TValue extends string | number | boolean | null>(value: TValue, source: Phase0FeatureMetric<TValue>["source"] = "researcherReviewed"): Phase0FeatureMetric<TValue> {
  return {
    value,
    source,
    confidence: source === "unavailable" ? 0 : 0.8,
    evidenceFileIDs: source === "unavailable" ? [] : ["evidence-synthetic-taxonomy"]
  };
}

function validAnnotationSet(): Phase0FacialFeatureAnnotationSet {
  return {
    schemaVersion: PHASE0_FACIAL_FEATURE_TAXONOMY_VERSION,
    annotationID: "annotation-synthetic-taxonomy",
    catalogStableID: "CF27_PS5_RTG_HEAD_001",
    createdAt: now,
    updatedAt: now,
    nativeGameLabel: {
      nativeCategoryLabel: "SYNTHETIC_NATIVE_CATEGORY_TEST_ONLY",
      visibleGameLabelOrIndex: "SYNTHETIC_VISIBLE_LABEL_TEST_ONLY",
      nativeOrder: 1,
      menuItemID: "menu-synthetic-taxonomy"
    },
    researcherAppliedMetadata: {
      taxonomyVersion: PHASE0_FACIAL_FEATURE_TAXONOMY_VERSION,
      face: {
        widthRatio: metric(0.72, "measured"),
        lengthRatio: metric(1.18, "measured"),
        widthClass: metric("medium"),
        lengthClass: metric("medium")
      },
      forehead: {
        widthRatio: metric(0.62, "measured"),
        heightRatio: metric(0.29, "measured"),
        widthClass: metric("medium"),
        heightClass: metric("medium")
      },
      temples: {
        widthRatio: metric(0.58, "measured"),
        taperClass: metric("straight")
      },
      cheekbones: {
        widthRatio: metric(0.69, "measured"),
        prominenceClass: metric("medium")
      },
      jaw: {
        widthRatio: metric(0.61, "measured"),
        angleClass: metric("medium"),
        taperClass: metric("straight")
      },
      chin: {
        widthRatio: metric(0.34, "measured"),
        lengthRatio: metric(0.21, "measured"),
        projectionClass: metric("medium")
      },
      eyes: {
        spacingRatio: metric(0.31, "measured"),
        meanEyeWidthRatio: metric(0.18, "measured"),
        tiltClass: metric("level"),
        opennessClass: metric("medium")
      },
      brows: {
        thicknessClass: metric("medium"),
        positionRatio: metric(0.42, "measured"),
        archClass: metric("slightArch")
      },
      nose: {
        widthRatio: metric(0.23, "measured"),
        lengthRatio: metric(0.34, "measured"),
        bridgeClass: metric("medium"),
        projectionClass: metric("medium")
      },
      mouth: {
        widthRatio: metric(0.38, "measured"),
        fullnessClass: metric("medium"),
        cornerTiltClass: metric("level")
      },
      ears: {
        visibilityClass: metric("visible"),
        sizeClass: metric("medium"),
        protrusionClass: metric("medium")
      },
      symmetry: {
        leftRightDifferenceRatio: metric(0.02, "measured"),
        reviewClass: metric("appearsSymmetric")
      },
      hairline: {
        positionClass: metric("medium"),
        contourClass: metric("straight"),
        visibleCoverageClass: metric("visible")
      },
      facialHairCoverage: {
        upperLipCoverage: metric("none"),
        chinCoverage: metric("none"),
        cheekCoverage: metric("none"),
        jawCoverage: metric("none"),
        sideburnCoverage: metric("none"),
        densityClass: metric("unknown", "unavailable")
      }
    }
  };
}
