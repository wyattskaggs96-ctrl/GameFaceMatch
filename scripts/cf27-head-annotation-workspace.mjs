#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_HEAD_ANNOTATION_WORKSPACE_SCHEMA_VERSION = "cf27-head-annotation-workspace-v1";
export const headAnnotationWorkspaceLabel = "HEAD ANNOTATION WORKSPACE — PRIMARY RESEARCH CANDIDATE — NOT PRODUCTION VERIFIED";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultHeadCandidatePath = "data/research/cf27/catalog-candidates/research/head-templates-faces-001-029/head_template_research_candidates.json";
const defaultFrameSelectionPath = "data/research/cf27/reports/view-angle-frame-selection/view_angle_frame_selection_report.json";
const defaultMeasurementPath = "data/research/cf27/reports/head-template-visual-measurements/head_visual_measurement_report.json";
const defaultStandardizationQAPath = "data/research/cf27/reports/head-template-standardization-qa/head_template_standardization_qa_report.json";
const defaultOutputDirectory = "data/research/cf27/reports/head-template-annotation-workspace";

const requiredHeadPattern = /^CF27_XBOXUNKNOWN_RTG_HEAD_\d{3}$/;
const annotationGroups = [
  "faceWidth",
  "faceLength",
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
  "hairline",
  "occlusion"
];
const controlledReviewStates = ["UNREVIEWED", "VISIBLE", "VISIBLE_LIMITED", "NOT_VISIBLE", "UNCLEAR", "BLOCKED_BY_OCCLUSION", "NEEDS_RECAPTURE"];
const requiredReviewerFields = ["reviewerID", "reviewerDisplayName", "reviewerRole", "reviewedAt", "reason"];
const viewMap = {
  FRONT: "straightOn",
  LEFT_3Q: "left45",
  RIGHT_3Q: "right45",
  LEFT_PROFILE: "leftProfile",
  RIGHT_PROFILE: "rightProfile",
  REAR: "rear"
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] ?? "generate";
  if (["--help", "-h", "help"].includes(command)) {
    printHelp();
  } else if (command === "generate") {
    const workspace = buildHeadAnnotationWorkspacePackage({
      root: repositoryRoot,
      generatedAt: new Date().toISOString()
    });
    const output = writeHeadAnnotationWorkspaceOutputs(workspace, {
      root: repositoryRoot,
      outputDirectory: cliValue("--output-directory") ?? defaultOutputDirectory
    });
    console.log(JSON.stringify({ ok: true, summary: workspace.summary, files: output.files }, null, 2));
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exitCode = 1;
  }
}

export function buildHeadAnnotationWorkspacePackage({
  root = repositoryRoot,
  headCandidatePath = defaultHeadCandidatePath,
  frameSelectionPath = defaultFrameSelectionPath,
  measurementPath = defaultMeasurementPath,
  standardizationQAPath = defaultStandardizationQAPath,
  generatedAt = new Date().toISOString()
} = {}) {
  assertResearchPath(headCandidatePath, "headCandidatePath");
  assertResearchPath(frameSelectionPath, "frameSelectionPath");
  assertResearchPath(measurementPath, "measurementPath");
  assertResearchPath(standardizationQAPath, "standardizationQAPath");

  const headCandidates = readJson(path.resolve(root, headCandidatePath));
  const frameSelection = readJson(path.resolve(root, frameSelectionPath));
  const measurementReport = readJson(path.resolve(root, measurementPath));
  const qaReport = readJson(path.resolve(root, standardizationQAPath));
  const headRecords = (headCandidates.records ?? [])
    .filter((record) => requiredHeadPattern.test(record.stableInternalID))
    .sort((left, right) => Number(left.nativeOrder) - Number(right.nativeOrder));
  const selectionByID = byStableID(frameSelection.records ?? []);
  const measurementByID = byStableID(measurementReport.records ?? []);
  const qaByID = byStableID(qaReport.records ?? []);

  const workspaces = headRecords.map((record) => createHeadAnnotationWorkspace({
    record,
    frameSelection: selectionByID.get(record.stableInternalID) ?? null,
    measurementRecord: measurementByID.get(record.stableInternalID) ?? null,
    qaRecord: qaByID.get(record.stableInternalID) ?? null,
    generatedAt
  }));
  const missingWorkspaceCount = 29 - workspaces.length;

  return {
    schemaVersion: CF27_HEAD_ANNOTATION_WORKSPACE_SCHEMA_VERSION,
    reportLabel: headAnnotationWorkspaceLabel,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PRIMARY_RESEARCH_CANDIDATE",
    sourceType: "researchCandidate",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "HUMAN_ANNOTATION_REQUIRED_NOT_SECOND_VERIFIED",
    productionRecommendationsEnabled: false,
    sourceInputs: {
      headCandidatePath,
      frameSelectionPath,
      measurementPath,
      standardizationQAPath
    },
    policy: {
      nativeGameLabelSeparation: "Native game labels and ordering are preserved as references only; reviewer annotations do not rewrite native game data.",
      automatedMeasurementSeparation: "Automated measurements are exposed as source context and are not copied into human annotation fields.",
      humanAnnotationPolicy: "Human annotations require reviewer identity and append-only history before they can be used in review.",
      productionGatePolicy: "All current head records remain NOT_VERIFIED and cannot enable production recommendations.",
      sensitiveTraitPolicy: "Annotations must not record race, ethnicity, identity, attractiveness, personality, criminality, health, or real-person resemblance."
    },
    controlledAnnotationModel: {
      version: CF27_HEAD_ANNOTATION_WORKSPACE_SCHEMA_VERSION,
      groups: annotationGroups,
      controlledReviewStates,
      requiredReviewerFields,
      confidenceRange: { minimum: 0, maximum: 1 }
    },
    summary: {
      expectedHeadCandidateCount: 29,
      workspaceCount: workspaces.length,
      missingWorkspaceCount: Math.max(0, missingWorkspaceCount),
      reviewerAnnotationCount: workspaces.reduce((sum, workspace) => sum + workspace.humanAnnotations.current.length, 0),
      recordsWithSupportingViews: workspaces.filter((workspace) => workspace.supportingViews.length > 0).length,
      recordsNeedingHumanAnnotation: workspaces.filter((workspace) => workspace.annotationReadiness.status === "HUMAN_ANNOTATION_REQUIRED").length,
      recordsProductionVerified: 0,
      productionRecommendationsEnabled: false
    },
    workspaces
  };
}

export function createHeadAnnotationWorkspace({ record, frameSelection, measurementRecord, qaRecord, generatedAt }) {
  const supportingViews = buildSupportingViews({ frameSelection, measurementRecord });
  const annotationTemplate = createHumanAnnotationTemplate(record.stableInternalID);
  return {
    workspaceID: `head-annotation-workspace-${record.stableInternalID.toLowerCase()}`,
    catalogStableID: record.stableInternalID,
    nativeGameLabelReference: {
      nativeCategoryLabel: "Head Template",
      visibleGameLabelOrIndex: record.visibleGameLabelOrIndex,
      nativeOrder: record.nativeOrder,
      menuItemID: "cf27-menu-head-skin-head-template",
      sourceEvidence: record.selectedMenuEvidence ?? []
    },
    sourceClassification: {
      dataClass: "PRIMARY_RESEARCH_CANDIDATE",
      sourceType: "researchCandidate",
      productionStatus: "NOT_PRODUCTION_DATA",
      verificationState: "NOT_VERIFIED",
      underlyingRecordVerificationState: "firstReviewPending",
      readyForProductionCatalog: false
    },
    supportingViews,
    humanAnnotations: {
      requiredReviewerIdentityFields: requiredReviewerFields,
      current: [],
      history: [],
      annotationTemplate
    },
    automatedMeasurementContext: summarizeAutomatedMeasurementContext(measurementRecord),
    qaContext: summarizeQAContext(record, qaRecord),
    annotationReadiness: {
      status: "HUMAN_ANNOTATION_REQUIRED",
      blockers: [
        "No reviewer identity has been recorded.",
        "No human annotation revision has been recorded.",
        "Underlying head record is primary research only and not second-person verified."
      ],
      warnings: buildAnnotationWarnings(record, qaRecord, supportingViews)
    },
    createdAt: generatedAt,
    updatedAt: generatedAt
  };
}

export function applyHeadAnnotationRevision(workspace, revision, nowISO = new Date().toISOString()) {
  validateReviewerIdentity(revision.reviewer);
  if (!revision.reason?.trim()) throw new Error("Head annotation revision requires a reason.");
  const annotationFields = revision.annotationFields ?? {};
  for (const group of Object.keys(annotationFields)) {
    if (!annotationGroups.includes(group)) throw new Error(`Unsupported annotation group: ${group}`);
    validateAnnotationField(annotationFields[group], group);
  }
  const previousCurrent = workspace.humanAnnotations.current;
  const revisionEntry = {
    revisionID: revision.revisionID || `annotation-revision-${workspace.catalogStableID.toLowerCase()}-${safeToken(nowISO)}`,
    catalogStableID: workspace.catalogStableID,
    reviewer: {
      reviewerID: revision.reviewer.reviewerID,
      reviewerDisplayName: revision.reviewer.reviewerDisplayName,
      reviewerRole: revision.reviewer.reviewerRole
    },
    reviewedAt: nowISO,
    reason: revision.reason,
    supportingViews: revision.supportingViews ?? [],
    confidence: normalizeConfidence(revision.confidence),
    annotationFields,
    previousAnnotationSnapshot: previousCurrent,
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationState: "NOT_VERIFIED"
  };
  return {
    ...workspace,
    updatedAt: nowISO,
    humanAnnotations: {
      ...workspace.humanAnnotations,
      current: [revisionEntry],
      history: [...workspace.humanAnnotations.history, revisionEntry]
    },
    annotationReadiness: {
      ...workspace.annotationReadiness,
      status: "PRIMARY_REVIEW_RECORDED_NOT_VERIFIED",
      blockers: [
        "Underlying head record is primary research only and not second-person verified.",
        "Production verification has not been granted."
      ]
    }
  };
}

export function writeHeadAnnotationWorkspaceOutputs(workspacePackage, { root = repositoryRoot, outputDirectory = defaultOutputDirectory } = {}) {
  assertResearchPath(outputDirectory, "outputDirectory");
  const absoluteOutputDirectory = path.resolve(root, outputDirectory);
  fs.mkdirSync(absoluteOutputDirectory, { recursive: true });
  const jsonPath = path.join(absoluteOutputDirectory, "head_annotation_workspace.json");
  const csvPath = path.join(absoluteOutputDirectory, "head_annotation_workspace.csv");
  const markdownPath = path.join(absoluteOutputDirectory, "HEAD_ANNOTATION_WORKSPACE.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify(workspacePackage, null, 2)}\n`);
  fs.writeFileSync(csvPath, serializeAnnotationWorkspaceCSV(workspacePackage));
  fs.writeFileSync(markdownPath, renderAnnotationWorkspaceMarkdown(workspacePackage));
  return {
    files: [jsonPath, csvPath, markdownPath].map((filePath) => path.relative(root, filePath))
  };
}

function buildSupportingViews({ frameSelection, measurementRecord }) {
  const measurementByView = byView(measurementRecord?.frameMeasurements ?? []);
  const selections = frameSelection?.selections ?? {};
  return Object.entries(viewMap)
    .map(([sourceView, annotationViewID]) => {
      const selection = selections[sourceView] ?? null;
      const selectedFrame = selection?.selectedFrame ?? null;
      const measurementFrame = measurementByView.get(sourceView) ?? null;
      if (!selectedFrame && !measurementFrame) return null;
      return {
        viewID: annotationViewID,
        sourceView,
        evidenceFileID: selectedFrame?.frameID ?? measurementFrame?.frameID ?? null,
        imageRelativePath: selectedFrame?.outputRelativePath ?? measurementFrame?.outputRelativePath ?? null,
        width: measurementFrame?.width ?? selectedFrame?.width ?? null,
        height: measurementFrame?.height ?? selectedFrame?.height ?? null,
        sourceVideoID: selectedFrame?.sourceVideoID ?? measurementFrame?.sourceVideoID ?? null,
        sourceWorkingFilename: selectedFrame?.sourceWorkingFilename ?? measurementFrame?.sourceWorkingFilename ?? null,
        sourceTimestampSeconds: selectedFrame?.sourceTimestampSeconds ?? measurementFrame?.sourceTimestampSeconds ?? null,
        selectionStatus: selection?.selectionStatus ?? "measurementContextOnly",
        selectionConfidence: selection?.confidence ?? measurementFrame?.selectionConfidence ?? 0,
        reviewRequired: true,
        productionStatus: "NOT_PRODUCTION_DATA"
      };
    })
    .filter(Boolean);
}

function createHumanAnnotationTemplate(stableInternalID) {
  const fields = Object.fromEntries(annotationGroups.map((group) => [
    group,
    {
      reviewState: "UNREVIEWED",
      value: null,
      confidence: 0,
      supportingViews: [],
      notes: "",
      reviewerID: null,
      evidenceFileIDs: [],
      source: "humanReviewerRequired"
    }
  ]));
  return {
    templateID: `head-annotation-template-${stableInternalID.toLowerCase()}`,
    controlledFields: fields,
    prohibitedFields: [
      "race",
      "ethnicity",
      "identity",
      "attractiveness",
      "personality",
      "criminality",
      "health",
      "realPersonResemblance"
    ],
    instructions: [
      "Review only objective visible features from supporting views.",
      "Use native game labels only as references; do not alter them through annotation.",
      "Leave uncertain fields UNREVIEWED or UNCLEAR rather than guessing.",
      "Record reviewer identity and supporting views for every revision."
    ]
  };
}

function summarizeAutomatedMeasurementContext(measurementRecord) {
  if (!measurementRecord) {
    return {
      available: false,
      sourceReport: defaultMeasurementPath,
      measurements: {},
      note: "No automated measurement context was available for this head."
    };
  }
  return {
    available: true,
    sourceReport: defaultMeasurementPath,
    dataClass: measurementRecord.dataClass,
    productionStatus: measurementRecord.productionStatus,
    verificationStatus: measurementRecord.verificationStatus,
    supportingFrameCount: measurementRecord.supportingFrameCount,
    sourceViews: measurementRecord.sourceViews ?? [],
    measurements: Object.fromEntries(Object.entries(measurementRecord.imageDerivedMeasurements ?? {}).map(([key, measurement]) => [
      key,
      {
        availabilityState: measurement.availabilityState,
        value: measurement.value,
        confidence: measurement.confidence,
        supportingViews: measurement.supportingViews ?? [],
        depthSupported: measurement.depthSupported,
        algorithmVersion: measurement.algorithmVersion,
        productionStatus: measurement.productionStatus
      }
    ])),
    note: "Automated measurements are source context only; human annotations remain separate and start empty."
  };
}

function summarizeQAContext(record, qaRecord) {
  const qaChecks = qaRecord?.standardizedCaptureChecks ?? {};
  return {
    sourceReport: defaultStandardizationQAPath,
    evidenceClassification: qaRecord?.evidenceClassification ?? null,
    eyeBlackObservation: record.eyeBlackObservation ?? null,
    hairObservation: record.hairObservation ?? null,
    facialHairObservation: record.facialHairObservation ?? null,
    otherVisibleObstructions: record.otherVisibleObstructions ?? [],
    standardizedCaptureWarnings: Object.fromEntries(Object.entries(qaChecks).map(([key, value]) => [
      key,
      {
        status: value.status,
        severity: value.severity,
        requiredAction: value.requiredAction
      }
    ])),
    recaptureRequiredForProductionComparison: Boolean(qaRecord?.evidenceClassification?.recaptureRequiredForProductionComparison)
  };
}

function buildAnnotationWarnings(record, qaRecord, supportingViews) {
  const warnings = [];
  const supportingViewIDs = new Set(supportingViews.map((view) => view.sourceView));
  for (const view of ["FRONT", "LEFT_3Q", "LEFT_PROFILE", "RIGHT_3Q", "RIGHT_PROFILE"]) {
    if (!supportingViewIDs.has(view)) warnings.push(`Missing supporting ${view} derivative for annotation.`);
  }
  if (record.eyeBlackObservation) warnings.push(record.eyeBlackObservation);
  if (record.hairObservation) warnings.push(record.hairObservation);
  if (qaRecord?.evidenceClassification?.recaptureRequiredForProductionComparison) {
    warnings.push("Recapture is required before production comparison.");
  }
  return unique(warnings);
}

function validateReviewerIdentity(reviewer) {
  if (!reviewer || typeof reviewer !== "object") throw new Error("Reviewer identity is required.");
  for (const field of ["reviewerID", "reviewerDisplayName", "reviewerRole"]) {
    if (typeof reviewer[field] !== "string" || reviewer[field].trim().length === 0) {
      throw new Error(`Reviewer identity requires ${field}.`);
    }
  }
}

function validateAnnotationField(field, group) {
  if (!field || typeof field !== "object") throw new Error(`Annotation group ${group} must be an object.`);
  if (!controlledReviewStates.includes(field.reviewState)) {
    throw new Error(`Annotation group ${group} has unsupported reviewState: ${field.reviewState}`);
  }
  normalizeConfidence(field.confidence);
  if (field.supportingViews && !Array.isArray(field.supportingViews)) {
    throw new Error(`Annotation group ${group} supportingViews must be an array.`);
  }
}

function serializeAnnotationWorkspaceCSV(workspacePackage) {
  const header = [
    "workspaceID",
    "catalogStableID",
    "nativeOrder",
    "visibleGameLabelOrIndex",
    "supportingViewCount",
    "humanAnnotationCount",
    "annotationStatus",
    "verificationState",
    "productionStatus",
    "readyForProductionCatalog"
  ];
  const rows = workspacePackage.workspaces.map((workspace) => [
    workspace.workspaceID,
    workspace.catalogStableID,
    workspace.nativeGameLabelReference.nativeOrder,
    workspace.nativeGameLabelReference.visibleGameLabelOrIndex,
    workspace.supportingViews.length,
    workspace.humanAnnotations.current.length,
    workspace.annotationReadiness.status,
    workspace.sourceClassification.verificationState,
    workspace.sourceClassification.productionStatus,
    String(workspace.sourceClassification.readyForProductionCatalog)
  ]);
  return `${[header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
}

function renderAnnotationWorkspaceMarkdown(workspacePackage) {
  const lines = [
    "# Head Annotation Workspace",
    "",
    "**PRIMARY RESEARCH CANDIDATE — NOT PRODUCTION VERIFIED**",
    "",
    "This workspace preloads the current Face 1 through Face 29 head candidates for objective human review. It does not mark any record production verified and it does not enable recommendations.",
    "",
    "## Summary",
    "",
    `- Workspace count: ${workspacePackage.summary.workspaceCount}`,
    `- Records needing human annotation: ${workspacePackage.summary.recordsNeedingHumanAnnotation}`,
    `- Production-verified records: ${workspacePackage.summary.recordsProductionVerified}`,
    `- Production recommendations enabled: ${workspacePackage.summary.productionRecommendationsEnabled}`,
    "",
    "## Review Fields",
    "",
    workspacePackage.controlledAnnotationModel.groups.map((group) => `- ${group}`).join("\n"),
    "",
    "## Candidate Workspaces",
    "",
    "| Native Order | Catalog ID | Native Label | Supporting Views | Status | Production |",
    "| ---: | --- | --- | ---: | --- | --- |",
    ...workspacePackage.workspaces.map((workspace) =>
      `| ${workspace.nativeGameLabelReference.nativeOrder} | ${workspace.catalogStableID} | ${workspace.nativeGameLabelReference.visibleGameLabelOrIndex} | ${workspace.supportingViews.length} | ${workspace.annotationReadiness.status} | ${workspace.sourceClassification.productionStatus} |`
    ),
    ""
  ];
  return `${lines.join("\n")}\n`;
}

function byStableID(records) {
  return new Map(records.map((record) => [record.stableInternalID, record]));
}

function byView(records) {
  return new Map(records.map((record) => [record.view, record]));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeConfidence(value) {
  if (typeof value !== "number" || value < 0 || value > 1) throw new Error("Confidence must be between 0 and 1.");
  return value;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function safeToken(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function assertResearchPath(relativePath, label) {
  const normalized = relativePath.split(path.sep).join("/");
  if (path.isAbsolute(relativePath)) throw new Error(`${label} must be a repository-relative research path.`);
  if (normalized.includes("..")) throw new Error(`${label} must not escape the repository root.`);
  if (!normalized.startsWith("data/research/cf27/")) {
    throw new Error(`${label} must stay under data/research/cf27/ to prevent production catalog mutation.`);
  }
  if (normalized.includes("/production/")) {
    throw new Error(`${label} must not point at a production catalog directory.`);
  }
}

function cliValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

function printHelp() {
  console.log(`Usage:
  npm run cf27:head-annotation-workspace -- generate [--output-directory data/research/cf27/reports/head-template-annotation-workspace]

Generates the research-only head annotation workspace for Face 1 through Face 29.
`);
}
