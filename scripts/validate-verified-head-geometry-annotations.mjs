#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VERIFIED_HEAD_GEOMETRY_ANNOTATION_VERSION = "phase0-verified-head-geometry-annotation-v1";
export const verifiedHeadGeometryFieldIDs = [
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
];

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = "data/schemas/verified-head-geometry-annotation.schema.json";
const jsonTemplatePath = "data/phase-zero/annotation-forms/verified_head_geometry_annotation_form.template.json";
const csvTemplatePath = "data/phase-zero/annotation-forms/verified_head_geometry_annotation_form.template.csv";
const docsPath = "docs/phase-zero/VERIFIED_HEAD_GEOMETRY_ANNOTATION_SCHEMA.md";
const prohibitedKeys = ["race", "ethnicity", "attractiveness", "personality", "health", "criminality", "identity", "celebrityResemblance", "lifestyle"];

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = validateVerifiedHeadGeometryAnnotationArtifacts(repositoryRoot);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

export function validateVerifiedHeadGeometryAnnotationArtifacts(root = repositoryRoot) {
  const errors = [];
  const warnings = [];
  const schema = readJSON(root, schemaPath, errors);
  const template = readJSON(root, jsonTemplatePath, errors);
  const csvText = readText(root, csvTemplatePath, errors);
  const docsText = readText(root, docsPath, errors);

  if (schema) validateSchema(schema, errors);
  if (template) validateJsonTemplate(template, errors);
  if (csvText) validateCsvTemplate(csvText, errors);
  if (docsText) validateDocs(docsText, errors);

  return {
    ok: errors.length === 0,
    schemaPath,
    jsonTemplatePath,
    csvTemplatePath,
    docsPath,
    checkedFieldCount: verifiedHeadGeometryFieldIDs.length,
    errors,
    warnings
  };
}

function validateSchema(schema, errors) {
  if (schema.properties?.schemaVersion?.const !== VERIFIED_HEAD_GEOMETRY_ANNOTATION_VERSION) {
    errors.push(error("schemaVersion", "Schema const does not match verified head geometry annotation version."));
  }
  const requiredFields = schema.properties?.fields?.required ?? [];
  for (const fieldID of verifiedHeadGeometryFieldIDs) {
    if (!requiredFields.includes(fieldID)) errors.push(error(`schema.fields.${fieldID}`, "Schema does not require this geometry annotation field."));
    if (!schema.properties?.fields?.properties?.[fieldID]) errors.push(error(`schema.fields.${fieldID}`, "Schema is missing this field property."));
  }
  if (!schema.properties?.targetVerificationStatus?.enum?.includes("VERIFIED")) {
    errors.push(error("schema.targetVerificationStatus", "Schema must require verified target status."));
  }
}

function validateJsonTemplate(template, errors) {
  if (!String(template.templateNotice ?? "").includes("NOT PRODUCTION DATA")) {
    errors.push(error("templateNotice", "JSON template must visibly state NOT PRODUCTION DATA."));
  }
  if (template.schemaVersion !== VERIFIED_HEAD_GEOMETRY_ANNOTATION_VERSION || template.fieldDefinitionsVersion !== VERIFIED_HEAD_GEOMETRY_ANNOTATION_VERSION) {
    errors.push(error("template.schemaVersion", "JSON template version is incorrect."));
  }
  if (template.targetCategory !== "headPreset") errors.push(error("template.targetCategory", "JSON template must target headPreset only."));
  if (!String(template.catalogStableID ?? "").includes("REPLACE_WITH_VERIFIED_HEAD_STABLE_ID")) {
    errors.push(error("template.catalogStableID", "JSON template must remain a placeholder until a verified head exists."));
  }
  for (const fieldID of verifiedHeadGeometryFieldIDs) {
    const field = template.fields?.[fieldID];
    if (!field) {
      errors.push(error(`template.fields.${fieldID}`, "JSON template is missing a required geometry field."));
      continue;
    }
    if (field.fieldID !== fieldID) errors.push(error(`template.fields.${fieldID}.fieldID`, "Field ID does not match template key."));
    if (field.availability !== "UNAVAILABLE" || field.value !== null || field.confidence !== 0 || field.measurementSource !== "UNAVAILABLE") {
      errors.push(error(`template.fields.${fieldID}`, "Blank template fields must be unavailable rather than guessed."));
    }
    if (!field.missingReason) errors.push(error(`template.fields.${fieldID}.missingReason`, "Blank template unavailable fields require a missing reason."));
  }
  for (const key of Object.keys(template.fields ?? {})) {
    if (!verifiedHeadGeometryFieldIDs.includes(key)) errors.push(error(`template.fields.${key}`, "JSON template contains an unsupported field."));
  }
  for (const prohibitedKey of prohibitedKeys) {
    if (containsKeyDeep(template.fields, prohibitedKey)) {
      errors.push(error(`template.fields.${prohibitedKey}`, "JSON template contains a prohibited annotation key."));
    }
  }
}

function validateCsvTemplate(csvText, errors) {
  const lines = csvText.trimEnd().split(/\r?\n/);
  const header = lines[0]?.split(",") ?? [];
  if (!header.includes("template_notice") || !header.includes("field_id") || !header.includes("measurement_source")) {
    errors.push(error("csv.header", "CSV template is missing required columns."));
    return;
  }
  const fieldIndex = header.indexOf("field_id");
  const noticeIndex = header.indexOf("template_notice");
  const fields = lines.slice(1).map((line) => line.split(",")[fieldIndex]).filter(Boolean);
  for (const fieldID of verifiedHeadGeometryFieldIDs) {
    if (!fields.includes(fieldID)) errors.push(error(`csv.${fieldID}`, "CSV template is missing a required geometry field."));
  }
  for (const fieldID of fields) {
    if (!verifiedHeadGeometryFieldIDs.includes(fieldID)) errors.push(error(`csv.${fieldID}`, "CSV template contains an unsupported field."));
  }
  if (lines.slice(1).some((line) => !line.split(",")[noticeIndex]?.includes("NOT PRODUCTION DATA"))) {
    errors.push(error("csv.template_notice", "Every CSV template row must visibly state NOT PRODUCTION DATA."));
  }
}

function validateDocs(docsText, errors) {
  for (const fieldID of verifiedHeadGeometryFieldIDs) {
    if (!docsText.includes(`\`${fieldID}\``)) errors.push(error(`docs.${fieldID}`, "Documentation does not list this geometry field."));
  }
  if (!docsText.includes("MARK_UNAVAILABLE_DO_NOT_INFER")) {
    errors.push(error("docs.missingData", "Documentation must state the missing-data behavior."));
  }
  if (!docsText.includes("VERIFIED") || !docsText.includes("second-person")) {
    errors.push(error("docs.verification", "Documentation must require verified records and reviewer agreement."));
  }
}

function readJSON(root, relativePath, errors) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
  } catch (error_) {
    errors.push(error(relativePath, error_.message));
    return null;
  }
}

function readText(root, relativePath, errors) {
  try {
    return fs.readFileSync(path.join(root, relativePath), "utf8");
  } catch (error_) {
    errors.push(error(relativePath, error_.message));
    return "";
  }
}

function containsKeyDeep(value, targetKey) {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, child]) => key.toLowerCase() === targetKey.toLowerCase() || containsKeyDeep(child, targetKey));
}

function error(path_, message) {
  return { path: path_, message };
}
