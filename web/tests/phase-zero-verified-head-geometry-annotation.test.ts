import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createVerifiedHeadGeometryAnnotationTemplate,
  noseTipFormValues,
  PHASE0_VERIFIED_HEAD_GEOMETRY_ANNOTATION_VERSION,
  validateVerifiedHeadGeometryAnnotation,
  verifiedHeadGeometryFieldDefinitions,
  verifiedHeadGeometryFieldIDs,
  verifiedHeadGeometryProhibitedKeys,
  type VerifiedHeadGeometryAnnotation,
  type VerifiedHeadGeometryFieldAnnotation
} from "@/lib/phase-zero/phase-zero-verified-head-geometry-annotation";
// @ts-expect-error Root validation scripts are ESM Node modules without TypeScript declarations.
import { validateVerifiedHeadGeometryAnnotationArtifacts } from "../../scripts/validate-verified-head-geometry-annotations.mjs";

const now = "2026-07-14T00:00:00.000Z";

describe("verified head geometry annotation schema", () => {
  it("defines every required objective head geometry field in code, schema, and forms", () => {
    expect(verifiedHeadGeometryFieldIDs).toEqual([
      "faceWidth",
      "faceLength",
      "foreheadWidth",
      "templeWidth",
      "cheekboneWidth",
      "jawWidth",
      "jawAngle",
      "chinWidth",
      "chinHeight",
      "chinProjection",
      "eyeSize",
      "eyeSpacing",
      "eyeTilt",
      "browPosition",
      "noseLength",
      "noseWidth",
      "noseProjection",
      "noseTipForm",
      "mouthWidth",
      "lipProportions",
      "earHeight",
      "earProjection",
      "symmetryIndicators"
    ]);

    const schema = readJSON<{ properties: { fields: { required: string[] } } }>("../data/schemas/verified-head-geometry-annotation.schema.json");
    const template = readJSON<{ fields: Record<string, unknown>; templateNotice: string }>("../data/phase-zero/annotation-forms/verified_head_geometry_annotation_form.template.json");
    const csvTemplate = fs.readFileSync(path.resolve(process.cwd(), "../data/phase-zero/annotation-forms/verified_head_geometry_annotation_form.template.csv"), "utf8");

    for (const fieldID of verifiedHeadGeometryFieldIDs) {
      expect(schema.properties.fields.required).toContain(fieldID);
      expect(template.fields).toHaveProperty(fieldID);
      expect(csvTemplate).toContain(`,${fieldID},`);
      expect(verifiedHeadGeometryFieldDefinitions[fieldID].missingDataBehavior).toBe("MARK_UNAVAILABLE_DO_NOT_INFER");
    }
    expect(template.templateNotice).toContain("NOT PRODUCTION DATA");
  });

  it("validates a completed objective annotation for a verified head preset", () => {
    const annotation = validAnnotation();
    expect(validateVerifiedHeadGeometryAnnotation(annotation)).toMatchObject({ ok: true, errors: [] });
  });

  it("rejects unverified targets and unsupported fields", () => {
    const annotation = validAnnotation() as unknown as { targetVerificationStatus: string; fields: Record<string, unknown> };
    annotation.targetVerificationStatus = "OBSERVED_PENDING_VERIFICATION";
    annotation.fields.fakeLifestyleField = unavailable("fakeLifestyleField" as never);

    const report = validateVerifiedHeadGeometryAnnotation(annotation as VerifiedHeadGeometryAnnotation);
    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining(["invalidTarget", "unknownField"]));
  });

  it("rejects prohibited sensitive, identity, and subjective-label keys", () => {
    const annotation = validAnnotation() as unknown as { fields: Record<string, unknown> };
    annotation.fields.faceWidth = {
      ...(annotation.fields.faceWidth as unknown as Record<string, unknown>),
      celebrityResemblance: "blocked"
    };

    const report = validateVerifiedHeadGeometryAnnotation(annotation as VerifiedHeadGeometryAnnotation);
    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("prohibitedAnnotationField");
    expect(verifiedHeadGeometryProhibitedKeys).toEqual(expect.arrayContaining(["race", "ethnicity", "attractiveness", "personality", "health", "identity"]));
  });

  it("enforces numeric ranges, controlled nose-tip values, and acceptable evidence views", () => {
    const annotation = validAnnotation();
    annotation.fields.faceWidth.value = 3;
    annotation.fields.noseTipForm.value = "portraitStyle" as never;
    annotation.fields.chinProjection.supportingViews = ["FRONT"];

    const report = validateVerifiedHeadGeometryAnnotation(annotation);
    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining(["invalidValue", "invalidEvidence"]));
    expect(noseTipFormValues).toEqual(expect.arrayContaining(["roundedApex", "pointedApex", "broadApex", "flatApex", "asymmetricApex"]));
  });

  it("keeps unavailable fields honest instead of accepting guessed values", () => {
    const annotation = validAnnotation();
    annotation.fields.earProjection = {
      fieldID: "earProjection",
      availability: "UNAVAILABLE",
      value: 0.4,
      confidence: 0.5,
      measurementSource: "HUMAN_REVIEW",
      supportingEvidenceIDs: [],
      supportingViews: [],
      missingReason: ""
    };

    const report = validateVerifiedHeadGeometryAnnotation(annotation);
    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("invalidAvailability");
  });

  it("requires second-reviewer agreement and QA acceptance evidence before accepted QA can pass", () => {
    const annotation = validAnnotation();
    annotation.reviewerAgreement = {
      status: "AGREED",
      primaryReviewerID: "primary-reviewer",
      secondReviewerID: null,
      agreementScore: 0.96,
      disagreements: []
    };
    annotation.annotationQA.status = "QA_ACCEPTED";
    annotation.annotationQA.checkedBy = null;

    const report = validateVerifiedHeadGeometryAnnotation(annotation);
    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining(["invalidReviewerAgreement", "invalidAnnotationQA"]));
  });

  it("validates repository schema, templates, and documentation artifacts", () => {
    const report = validateVerifiedHeadGeometryAnnotationArtifacts(path.resolve(process.cwd(), ".."));
    expect(report).toMatchObject({ ok: true, checkedFieldCount: verifiedHeadGeometryFieldIDs.length });
  });
});

function validAnnotation(): VerifiedHeadGeometryAnnotation {
  const annotation = createVerifiedHeadGeometryAnnotationTemplate({
    annotationID: "verified-head-annotation-test-only",
    catalogStableID: "CF27_XBOX_RTG_HEAD_001_TEST_ONLY",
    catalogVersionID: "cf27-production-test-only",
    nowISO: now
  });
  annotation.fields.faceWidth = measured("faceWidth", 0.72, ["FRONT"]);
  annotation.fields.faceLength = measured("faceLength", 1.11, ["FRONT"]);
  annotation.fields.foreheadWidth = measured("foreheadWidth", 0.61, ["FRONT"]);
  annotation.fields.templeWidth = measured("templeWidth", 0.58, ["FRONT"]);
  annotation.fields.cheekboneWidth = measured("cheekboneWidth", 0.69, ["FRONT"]);
  annotation.fields.jawWidth = measured("jawWidth", 0.64, ["FRONT"]);
  annotation.fields.jawAngle = measured("jawAngle", 118, ["LEFT_3Q"]);
  annotation.fields.chinWidth = measured("chinWidth", 0.34, ["FRONT"]);
  annotation.fields.chinHeight = measured("chinHeight", 0.22, ["FRONT"]);
  annotation.fields.chinProjection = measured("chinProjection", 0.41, ["LEFT_PROFILE"]);
  annotation.fields.eyeSize = measured("eyeSize", 0.16, ["FRONT"]);
  annotation.fields.eyeSpacing = measured("eyeSpacing", 0.31, ["FRONT"]);
  annotation.fields.eyeTilt = measured("eyeTilt", 2, ["FRONT"]);
  annotation.fields.browPosition = measured("browPosition", 0.2, ["FRONT"]);
  annotation.fields.noseLength = measured("noseLength", 0.32, ["FRONT"]);
  annotation.fields.noseWidth = measured("noseWidth", 0.24, ["FRONT"]);
  annotation.fields.noseProjection = measured("noseProjection", 0.47, ["RIGHT_PROFILE"]);
  annotation.fields.noseTipForm = {
    ...measured("noseTipForm", "roundedApex", ["LEFT_3Q"]),
    availability: "CONTROLLED_REVIEW",
    measurementSource: "HUMAN_REVIEW"
  };
  annotation.fields.mouthWidth = measured("mouthWidth", 0.38, ["FRONT"]);
  annotation.fields.lipProportions = measured("lipProportions", 0.83, ["FRONT"]);
  annotation.fields.earHeight = measured("earHeight", 0.28, ["LEFT_PROFILE"]);
  annotation.fields.earProjection = measured("earProjection", 0.18, ["LEFT_PROFILE"]);
  annotation.fields.symmetryIndicators = {
    fieldID: "symmetryIndicators",
    availability: "MEASURED",
    value: {
      faceMidlineDeviationRatio: 0.01,
      eyeHeightDifferenceRatio: 0.02,
      jawSideDifferenceRatio: 0.03,
      mouthCornerHeightDifferenceRatio: 0.01
    },
    confidence: 0.77,
    measurementSource: "HYBRID_LANDMARK_AND_REVIEW",
    supportingEvidenceIDs: ["evidence-front"],
    supportingViews: ["FRONT"]
  };
  annotation.reviewerAgreement = {
    status: "AGREED",
    primaryReviewerID: "primary-reviewer",
    secondReviewerID: "second-reviewer",
    agreementScore: 0.94,
    disagreements: []
  };
  annotation.annotationQA = {
    status: "QA_ACCEPTED",
    checkedBy: "catalog-manager",
    checkedAt: now,
    checklist: {
      nativeLabelPreserved: true,
      verifiedHeadPresetOnly: true,
      evidenceViewsAllowed: true,
      noSensitiveTraits: true,
      missingDataMarkedUnavailable: true,
      reviewerAgreementRecorded: true
    },
    unresolvedBlockers: []
  };
  return annotation;
}

function measured(fieldID: VerifiedHeadGeometryFieldAnnotation["fieldID"], value: Exclude<VerifiedHeadGeometryFieldAnnotation["value"], null>, views: VerifiedHeadGeometryFieldAnnotation["supportingViews"]): VerifiedHeadGeometryFieldAnnotation {
  return {
    fieldID,
    availability: "MEASURED",
    value,
    confidence: 0.8,
    measurementSource: "HYBRID_LANDMARK_AND_REVIEW",
    supportingEvidenceIDs: views.map((view) => `evidence-${view.toLowerCase()}`),
    supportingViews: views
  };
}

function unavailable(fieldID: VerifiedHeadGeometryFieldAnnotation["fieldID"]): VerifiedHeadGeometryFieldAnnotation {
  return {
    fieldID,
    availability: "UNAVAILABLE",
    value: null,
    confidence: 0,
    measurementSource: "UNAVAILABLE",
    supportingEvidenceIDs: [],
    supportingViews: [],
    missingReason: "Test unavailable field."
  };
}

function readJSON<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8")) as T;
}
