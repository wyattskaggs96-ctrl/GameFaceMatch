#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_PARTIAL_MATCHING_SANDBOX_VERSION = "cf27-partial-matching-sandbox-v1";
export const partialMatchingSandboxLabel = "PARTIAL UNVERIFIED CATALOG — INTERNAL RESEARCH SANDBOX ONLY";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultAnnotationWorkspacePath = "data/research/cf27/reports/head-template-annotation-workspace/head_annotation_workspace.json";
const defaultOutputDirectory = "data/research/cf27/reports/partial-matching-sandbox";

const weightedGeometryFeatures = [
  { id: "faceWidthRatio", candidateMeasurementID: "faceWidthToHeightRatio", group: "geometry", weight: 0.12, maxDistance: 0.35 },
  { id: "faceLengthRatio", candidateMeasurementID: "faceLengthRatio", group: "geometry", weight: 0.05, maxDistance: 0.35 },
  { id: "foreheadWidthRatio", candidateMeasurementID: "foreheadWidthRatio", group: "geometry", weight: 0.07, maxDistance: 0.3 },
  { id: "jawWidthRatio", candidateMeasurementID: "jawWidthRatio", group: "geometry", weight: 0.11, maxDistance: 0.3 },
  { id: "chinWidthRatio", candidateMeasurementID: "chinWidthRatio", group: "geometry", weight: 0.07, maxDistance: 0.3 },
  { id: "lowerFaceRatio", candidateMeasurementID: "lowerFaceRatio", group: "geometry", weight: 0.05, maxDistance: 0.22 },
  { id: "eyeSpacingRatio", candidateMeasurementID: "eyeSpacingRatio", group: "geometry", weight: 0.09, maxDistance: 0.22 },
  { id: "noseWidthRatio", candidateMeasurementID: "noseWidthRatio", group: "geometry", weight: 0.09, maxDistance: 0.22 },
  { id: "mouthWidthRatio", candidateMeasurementID: "mouthWidthRatio", group: "geometry", weight: 0.07, maxDistance: 0.26 }
];

const prohibitedGeometryInputs = ["skinTone", "skinPresentation", "race", "ethnicity"];

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] ?? "generate";
  if (["--help", "-h", "help"].includes(command)) {
    printHelp();
  } else if (command === "generate") {
    const report = buildPartialMatchingSandboxReport({
      root: repositoryRoot,
      generatedAt: new Date().toISOString(),
      runtimeMode: cliValue("--runtime-mode") ?? currentRuntimeMode()
    });
    const output = writePartialMatchingSandboxOutputs(report, {
      root: repositoryRoot,
      outputDirectory: cliValue("--output-directory") ?? defaultOutputDirectory
    });
    console.log(JSON.stringify({ ok: true, summary: report.summary, files: output.files }, null, 2));
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exitCode = 1;
  }
}

export function buildPartialMatchingSandboxReport({
  root = repositoryRoot,
  annotationWorkspacePath = defaultAnnotationWorkspacePath,
  profile = createResearchOnlyFixtureProfile(),
  generatedAt = new Date().toISOString(),
  runtimeMode = currentRuntimeMode(),
  limit = 3
} = {}) {
  assertResearchRuntime(runtimeMode);
  assertResearchPath(annotationWorkspacePath, "annotationWorkspacePath");
  const workspacePackage = readJson(path.resolve(root, annotationWorkspacePath));
  validateWorkspacePackage(workspacePackage);
  validateResearchOnlyProfile(profile);
  const catalogCandidateVersion = `${workspacePackage.schemaVersion}:${workspacePackage.generatedAt}`;
  const candidates = workspacePackage.workspaces.map((workspace) => normalizeCandidate(workspace, catalogCandidateVersion));
  const matches = candidates
    .map((candidate) => scoreCandidate({ candidate, profile, catalogCandidateVersion }))
    .sort(compareSandboxMatches)
    .slice(0, limit)
    .map((match, index) => ({ ...match, rank: index + 1 }));
  return {
    schemaVersion: CF27_PARTIAL_MATCHING_SANDBOX_VERSION,
    reportLabel: partialMatchingSandboxLabel,
    generatedAt,
    runtimeMode,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PRIMARY_RESEARCH_CANDIDATE",
    sourceType: "researchCandidate",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "PARTIAL_UNVERIFIED_RESEARCH_ONLY",
    productionBuildEnabled: false,
    publicResultRoute: null,
    sharing: {
      enabled: false,
      reason: "Sharing is disabled because the candidate set is partial, unverified, and not user-facing."
    },
    catalogCandidateVersion,
    sourceInputs: {
      annotationWorkspacePath
    },
    policy: {
      partialCatalogNotice: "Face 1 through Face 29 are current research candidates only. This report does not claim the full College Football 27 head catalog is known.",
      productionUseAllowed: false,
      productionRecommendationAccess: false,
      geometryAppearanceSeparation: "Geometry scoring is reported separately from appearance. Appearance matching is unavailable because candidate appearance annotations are not verified.",
      skinTonePolicy: "Skin tone and skin presentation are not inputs to geometry scoring.",
      missingDataPolicy: "Scores are penalized when profile or catalog-candidate measurements are missing or unreliable.",
      captureQualityPolicy: "The research profile capture-quality score reduces the final architecture-check score.",
      identityPolicy: "Scores are architecture-check closeness among partial game candidates, not identity probability."
    },
    scoringModel: {
      version: CF27_PARTIAL_MATCHING_SANDBOX_VERSION,
      label: "Research-only weighted score against partial unverified Face 1-29 candidates.",
      features: weightedGeometryFeatures.map(({ id, candidateMeasurementID, weight, maxDistance }) => ({ id, candidateMeasurementID, weight, maxDistance })),
      prohibitedGeometryInputs
    },
    profile: summarizeProfile(profile),
    summary: {
      candidateCount: candidates.length,
      rankedCount: matches.length,
      geometryFeatureCount: weightedGeometryFeatures.length,
      appearanceMatchingEnabled: false,
      productionRecommendationsEnabled: false,
      publicRouteCreated: false,
      fullCatalogClaimed: false
    },
    matches
  };
}

export function createResearchOnlyFixtureProfile(overrides = {}) {
  const base = {
    profileID: "research-only-fixture-profile-face-architecture-check",
    sourceType: "researchOnly",
    label: "Research-only fixture StandardFaceProfile",
    profileVersion: "research-only-standard-profile-v1",
    createdAt: "2026-07-13T00:00:00.000Z",
    rawMediaIncluded: false,
    captureQuality: {
      overallScore: 0.82,
      requiredAnglesComplete: true,
      blockingIssueCount: 0,
      advisoryIssueCount: 2
    },
    geometry: {
      measurements: {
        faceWidthRatio: measurement(0.86, 0.72, 1, ["straightOn"]),
        jawWidthRatio: measurement(0.48, 0.58, 1, ["straightOn"]),
        chinWidthRatio: measurement(0.3, 0.52, 1, ["straightOn"]),
        eyeSpacingRatio: unavailableMeasurement("research fixture does not include defensible eye spacing"),
        noseWidthRatio: unavailableMeasurement("research fixture does not include defensible nose width"),
        mouthWidthRatio: unavailableMeasurement("research fixture does not include defensible mouth width")
      }
    },
    appearance: {
      attributes: [],
      note: "Appearance is not matched in the partial research sandbox."
    }
  };
  return deepMerge(base, overrides);
}

export function scoreCandidate({ candidate, profile, catalogCandidateVersion }) {
  const contributions = weightedGeometryFeatures.map((feature) => scoreGeometryFeature({ candidate, profile, feature }));
  const intendedWeight = weightedGeometryFeatures.reduce((sum, feature) => sum + feature.weight, 0);
  const included = contributions.filter((contribution) => contribution.included);
  const includedWeight = included.reduce((sum, contribution) => sum + contribution.effectiveWeight, 0);
  const weightedDistance = includedWeight > 0 ? included.reduce((sum, contribution) => sum + contribution.normalizedDistance * contribution.effectiveWeight, 0) / includedWeight : 1;
  const evidenceCoverage = intendedWeight > 0 ? included.reduce((sum, contribution) => sum + contribution.baseWeight, 0) / intendedWeight : 0;
  const averageReliability = included.length > 0 ? included.reduce((sum, contribution) => sum + contribution.reliability, 0) / included.length : 0;
  const captureQualityMultiplier = clamp(Number(profile.captureQuality?.overallScore ?? 0), 0, 1);
  const missingDataPenalty = 1 - evidenceCoverage;
  const captureQualityPenalty = 1 - captureQualityMultiplier;
  const geometryScore = clamp(round((1 - weightedDistance) * 100), 0, 100);
  const score = clamp(round(geometryScore * evidenceCoverage * captureQualityMultiplier), 0, 100);
  const confidence = clamp(round(evidenceCoverage * averageReliability * captureQualityMultiplier), 0, 1);
  const missingFeatures = contributions.filter((contribution) => !contribution.included).map((contribution) => contribution.featureID);

  return {
    catalogStableID: candidate.catalogStableID,
    nativeOrder: candidate.nativeOrder,
    visibleGameLabelOrIndex: candidate.visibleGameLabelOrIndex,
    catalogCandidateVersion,
    sourceType: candidate.sourceType,
    productionStatus: candidate.productionStatus,
    verificationState: candidate.verificationState,
    rank: 0,
    score,
    scoreLabel: "Research-only score based on partial unverified candidate measurements.",
    geometry: {
      score: geometryScore,
      weightedDistance: round(weightedDistance),
      evidenceCoverage: round(evidenceCoverage),
      averageReliability: round(averageReliability),
      contributionCount: included.length,
      contributions
    },
    appearance: {
      used: false,
      score: null,
      reason: "Appearance matching is not enabled for partial unverified head candidates."
    },
    penalties: {
      missingDataPenalty: round(missingDataPenalty),
      captureQualityPenalty: round(captureQualityPenalty),
      captureQualityMultiplier
    },
    confidence: {
      score: confidence,
      label: confidence >= 0.75 ? "high" : confidence >= 0.45 ? "medium" : confidence > 0 ? "low" : "unavailable"
    },
    explanation: buildExplanation({ candidate, score, contributions, evidenceCoverage, captureQualityMultiplier, missingFeatures }),
    productionUseAllowed: false,
    sharingAllowed: false
  };
}

export function writePartialMatchingSandboxOutputs(report, { root = repositoryRoot, outputDirectory = defaultOutputDirectory } = {}) {
  assertResearchPath(outputDirectory, "outputDirectory");
  const absoluteOutputDirectory = path.resolve(root, outputDirectory);
  fs.mkdirSync(absoluteOutputDirectory, { recursive: true });
  const jsonPath = path.join(absoluteOutputDirectory, "partial_matching_sandbox_report.json");
  const csvPath = path.join(absoluteOutputDirectory, "partial_matching_sandbox_top_matches.csv");
  const markdownPath = path.join(absoluteOutputDirectory, "PARTIAL_MATCHING_SANDBOX.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(csvPath, serializeMatchCSV(report));
  fs.writeFileSync(markdownPath, renderMarkdown(report));
  return { files: [jsonPath, csvPath, markdownPath].map((filePath) => path.relative(root, filePath)) };
}

function scoreGeometryFeature({ candidate, profile, feature }) {
  const profileMeasurement = profile.geometry?.measurements?.[feature.id] ?? null;
  const candidateMeasurement = candidate.automatedMeasurements[feature.candidateMeasurementID] ?? null;
  const profileEvidence = measurementEvidence(profileMeasurement);
  const candidateEvidence = measurementEvidence(candidateMeasurement);
  const reliability = round(Math.min(profileEvidence.confidence, candidateEvidence.confidence) * occlusionMultiplier(profileEvidence.occlusionStatus) * occlusionMultiplier(candidateEvidence.occlusionStatus));
  const missingReason = missingReasonForFeature({ profileEvidence, candidateEvidence, reliability });
  if (missingReason) {
    return {
      featureID: feature.id,
      candidateMeasurementID: feature.candidateMeasurementID,
      group: "geometry",
      baseWeight: feature.weight,
      effectiveWeight: 0,
      normalizedDistance: 1,
      reliability,
      profileValue: profileEvidence.value,
      candidateValue: candidateEvidence.value,
      included: false,
      reason: missingReason
    };
  }
  return {
    featureID: feature.id,
    candidateMeasurementID: feature.candidateMeasurementID,
    group: "geometry",
    baseWeight: feature.weight,
    effectiveWeight: feature.weight * reliability,
    normalizedDistance: clamp(round(Math.abs(profileEvidence.value - candidateEvidence.value) / feature.maxDistance), 0, 1),
    reliability,
    profileValue: profileEvidence.value,
    candidateValue: candidateEvidence.value,
    included: true,
    reason: "Reliable research geometry feature included."
  };
}

function normalizeCandidate(workspace, catalogCandidateVersion) {
  return {
    catalogStableID: workspace.catalogStableID,
    nativeOrder: workspace.nativeGameLabelReference.nativeOrder,
    visibleGameLabelOrIndex: workspace.nativeGameLabelReference.visibleGameLabelOrIndex,
    catalogCandidateVersion,
    sourceType: "researchCandidate",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationState: workspace.sourceClassification.verificationState,
    automatedMeasurements: workspace.automatedMeasurementContext?.measurements ?? {},
    appearanceAnnotations: {},
    supportingViews: workspace.supportingViews ?? []
  };
}

function measurementEvidence(measurement) {
  if (!measurement || measurement.availabilityState !== "available" || measurement.value === null || measurement.value === undefined) {
    return {
      value: null,
      confidence: 0,
      supportingFrameCount: measurement?.supportingFrameCount ?? 0,
      availabilityState: measurement?.availabilityState ?? "unavailable",
      occlusionStatus: measurement?.occlusionStatus ?? "unknown"
    };
  }
  return {
    value: Number(measurement.value),
    confidence: Number(measurement.confidence?.score ?? measurement.confidence ?? 0),
    supportingFrameCount: Number(measurement.supportingFrameCount ?? measurement.supportingViews?.length ?? 0),
    availabilityState: measurement.availabilityState,
    occlusionStatus: measurement.occlusionStatus ?? "unknown"
  };
}

function missingReasonForFeature({ profileEvidence, candidateEvidence, reliability }) {
  if (profileEvidence.availabilityState !== "available" || profileEvidence.value === null) return "Research profile measurement unavailable.";
  if (candidateEvidence.availabilityState !== "available" || candidateEvidence.value === null) return "Catalog-candidate measurement unavailable or not yet annotated.";
  if (profileEvidence.supportingFrameCount <= 0) return "Research profile measurement lacks supporting frame evidence.";
  if (candidateEvidence.supportingFrameCount <= 0) return "Catalog-candidate measurement lacks supporting frame evidence.";
  if (reliability < 0.25) return "Feature confidence below research sandbox threshold.";
  return null;
}

function buildExplanation({ candidate, score, contributions, evidenceCoverage, captureQualityMultiplier, missingFeatures }) {
  const included = contributions.filter((contribution) => contribution.included);
  const closest = included
    .filter((contribution) => contribution.normalizedDistance <= 0.25)
    .sort((left, right) => right.effectiveWeight - left.effectiveWeight)
    .slice(0, 3)
    .map((contribution) => `${contribution.featureID} is close within the current research measurements.`);
  const differences = included
    .filter((contribution) => contribution.normalizedDistance >= 0.45)
    .sort((left, right) => right.normalizedDistance - left.normalizedDistance)
    .slice(0, 3)
    .map((contribution) => `${contribution.featureID} differs within the current research measurements.`);
  const uncertaintyNotes = [
    "PARTIAL UNVERIFIED CATALOG: this sandbox uses only Face 1 through Face 29 research candidates and does not claim a full game catalog.",
    "This is an internal architecture check, not a user-facing recommendation.",
    ...missingFeatures.map((featureID) => `${featureID} was not used because required profile or candidate data is unavailable.`)
  ];
  if (evidenceCoverage < 0.75) uncertaintyNotes.push("Missing-data penalty applied because reliable feature coverage is incomplete.");
  if (captureQualityMultiplier < 1) uncertaintyNotes.push("Capture-quality penalty applied from the research-only profile.");
  return {
    summary: `${candidate.catalogStableID} received a research-only score of ${score}/100 against a partial unverified candidate set. This is not an identity probability.`,
    geometrySimilarities: closest.length > 0 ? closest : ["No strong geometry similarity crossed the current threshold."],
    geometryDifferences: differences.length > 0 ? differences : ["No large geometry difference crossed the current threshold."],
    appearanceNotes: ["Appearance was not used; no verified appearance annotations are available for these research candidates."],
    uncertaintyNotes
  };
}

function summarizeProfile(profile) {
  return {
    profileID: profile.profileID,
    sourceType: profile.sourceType,
    profileVersion: profile.profileVersion,
    rawMediaIncluded: Boolean(profile.rawMediaIncluded),
    captureQuality: profile.captureQuality,
    geometryMeasurementIDs: Object.keys(profile.geometry?.measurements ?? {}),
    appearanceMatchingEnabled: false
  };
}

function validateWorkspacePackage(workspacePackage) {
  if (workspacePackage.productionStatus !== "NOT_PRODUCTION_DATA") throw new Error("Partial matching sandbox requires research-only workspace data.");
  if (workspacePackage.productionRecommendationsEnabled) throw new Error("Partial matching sandbox cannot consume recommendation-enabled data.");
  if (!Array.isArray(workspacePackage.workspaces) || workspacePackage.workspaces.length === 0) throw new Error("No research candidate workspaces are available.");
}

function validateResearchOnlyProfile(profile) {
  if (!["researchOnly", "testOnly"].includes(profile.sourceType)) throw new Error("Partial matching sandbox requires a research-only or test-only profile.");
  if (profile.rawMediaIncluded) throw new Error("Partial matching sandbox profile must not include raw media.");
  for (const prohibitedInput of prohibitedGeometryInputs) {
    if (profile.geometry?.measurements?.[prohibitedInput] !== undefined) {
      throw new Error(`Prohibited geometry input present: ${prohibitedInput}`);
    }
  }
}

function serializeMatchCSV(report) {
  const header = [
    "rank",
    "catalogStableID",
    "nativeOrder",
    "visibleGameLabelOrIndex",
    "score",
    "confidence",
    "geometryEvidenceCoverage",
    "missingDataPenalty",
    "captureQualityPenalty",
    "catalogCandidateVersion",
    "productionStatus",
    "verificationState"
  ];
  const rows = report.matches.map((match) => [
    match.rank,
    match.catalogStableID,
    match.nativeOrder,
    match.visibleGameLabelOrIndex,
    match.score,
    match.confidence.score,
    match.geometry.evidenceCoverage,
    match.penalties.missingDataPenalty,
    match.penalties.captureQualityPenalty,
    match.catalogCandidateVersion,
    match.productionStatus,
    match.verificationState
  ]);
  return `${[header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
}

function renderMarkdown(report) {
  return `${[
    "# Partial Matching Sandbox",
    "",
    `**${partialMatchingSandboxLabel}**`,
    "",
    "This report verifies that the matching architecture can consume current Face 1-29 research candidates. It is not a public result route, does not allow sharing, and does not claim Face 1-29 is the full College Football 27 catalog.",
    "",
    "## Summary",
    "",
    `- Candidate count: ${report.summary.candidateCount}`,
    `- Ranked count: ${report.summary.rankedCount}`,
    `- Catalog-candidate version: ${report.catalogCandidateVersion}`,
    `- Production recommendations enabled: ${report.summary.productionRecommendationsEnabled}`,
    `- Full catalog claimed: ${report.summary.fullCatalogClaimed}`,
    "",
    "## Top Research Sandbox Rankings",
    "",
    "| Rank | Catalog ID | Native Label | Score | Confidence |",
    "| ---: | --- | --- | ---: | ---: |",
    ...report.matches.map((match) => `| ${match.rank} | ${match.catalogStableID} | ${match.visibleGameLabelOrIndex} | ${match.score} | ${match.confidence.score} |`),
    "",
    "## Restrictions",
    "",
    "- Disabled for production runtime.",
    "- No public result route.",
    "- No sharing.",
    "- Research-only or test-only profiles only.",
    "- Geometry and appearance are separated.",
    "- Skin tone has no effect on geometry scoring.",
    ""
  ].join("\n")}\n`;
}

function compareSandboxMatches(first, second) {
  if (second.score !== first.score) return second.score - first.score;
  if (second.confidence.score !== first.confidence.score) return second.confidence.score - first.confidence.score;
  return first.catalogStableID.localeCompare(second.catalogStableID);
}

function assertResearchRuntime(runtimeMode) {
  if (runtimeMode === "production") {
    throw new Error("Partial matching sandbox is disabled in production builds.");
  }
}

function assertResearchPath(relativePath, label) {
  const normalized = relativePath.split(path.sep).join("/");
  if (path.isAbsolute(relativePath)) throw new Error(`${label} must be a repository-relative research path.`);
  if (normalized.includes("..")) throw new Error(`${label} must not escape the repository root.`);
  if (!normalized.startsWith("data/research/cf27/")) throw new Error(`${label} must stay under data/research/cf27/.`);
  if (normalized.includes("/production/")) throw new Error(`${label} must not point at production catalog data.`);
}

function measurement(value, confidence, supportingFrameCount, supportingPoses) {
  return {
    value,
    confidence: { score: confidence, label: confidence >= 0.75 ? "high" : confidence >= 0.45 ? "medium" : "low" },
    supportingFrameCount,
    supportingPoses,
    variance: 0.02,
    depthSupported: false,
    profileEvidenceExists: true,
    occlusionImpact: "minor",
    occlusionStatus: "none",
    measurementSource: "browserRgbImage",
    availabilityState: "available",
    algorithmVersion: "research-only-fixture-profile-v1"
  };
}

function unavailableMeasurement(reason) {
  return {
    value: null,
    confidence: { score: 0, label: "unavailable" },
    supportingFrameCount: 0,
    supportingPoses: [],
    variance: null,
    depthSupported: false,
    profileEvidenceExists: false,
    occlusionImpact: "unknown",
    occlusionStatus: "unknown",
    measurementSource: "notMeasured",
    availabilityState: "unavailable",
    algorithmVersion: "research-only-fixture-profile-v1",
    reasonUnavailable: reason
  };
}

function occlusionMultiplier(occlusionStatus) {
  if (occlusionStatus === "significant") return 0;
  if (occlusionStatus === "partial") return 0.6;
  if (occlusionStatus === "unknown") return 0.85;
  return 1;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function deepMerge(base, override) {
  if (!override || typeof override !== "object") return base;
  const next = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === "object" && !Array.isArray(value) && base[key] && typeof base[key] === "object" && !Array.isArray(base[key])) {
      next[key] = deepMerge(base[key], value);
    } else {
      next[key] = value;
    }
  }
  return next;
}

function currentRuntimeMode() {
  return process.env.NODE_ENV === "production" ? "production" : "research";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function cliValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

function printHelp() {
  console.log(`Usage:
  npm run cf27:partial-match-sandbox -- generate [--runtime-mode research]

Generates an internal research-only weighted matching sandbox report against Face 1-29 candidates.
`);
}
