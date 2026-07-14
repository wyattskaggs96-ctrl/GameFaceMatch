export type Phase0CompletionStatus = "notStarted" | "evidenceAvailable" | "observed" | "cataloged" | "qaReviewed" | "verified" | "productionApproved";
export type Phase0ProductionReadinessStatus = "blocked" | "verificationRequired" | "ready";

export type Phase0CompletionCategoryID =
  | "environment"
  | "creationPaths"
  | "menuHierarchy"
  | "headTemplates"
  | "hairstyles"
  | "hairColors"
  | "facialHair"
  | "facialHairColors"
  | "skinTone"
  | "skinDetails"
  | "eyeShape"
  | "eyeColor"
  | "eyebrows"
  | "nose"
  | "ears"
  | "mouth"
  | "jawChinCheeks"
  | "additionalGeometryControls"
  | "bodyHeightWeightPhysique"
  | "dependencyTests"
  | "evidenceManifest"
  | "catalogExports"
  | "secondVerification"
  | "manualTopThreeFeasibilityStudy";

export interface Phase0CompletionCategoryProgress {
  id: Phase0CompletionCategoryID;
  label: string;
  required: boolean;
  evidenceAvailable: number;
  observed: number;
  cataloged: number;
  qaReviewed: number;
  independentlyVerified: number;
  productionApproved: number;
  recaptureRequired: number;
  blockingIssueCount: number;
  status: Phase0CompletionStatus;
  completionPercent: number;
  sourceSummary: string;
  nextAction: string;
}

export interface Phase0CompletionDashboardReport {
  generatedAt: string;
  categoryProgress: Phase0CompletionCategoryProgress[];
  appearanceMenuGapSummary: Phase0AppearanceMenuGapSummary;
  metrics: {
    overallPhase0CompletionPercent: number;
    evidenceCompletionPercent: number;
    catalogCompletionPercent: number;
    verificationCompletionPercent: number;
  };
  productionReadiness: {
    status: Phase0ProductionReadinessStatus;
    reason: string;
  };
  highestPriorityMissingCapture: string;
  nextRecommendedCodexAction: string;
  nextRequiredHumanAction: string;
}

export interface Phase0AppearanceMenuGapSummary {
  totalRows: number;
  confirmedPresentIncomplete: number;
  confirmedPresentCompleteForResearch: number;
  suspectedButNotObserved: number;
  confirmedAbsent: number;
  unknownBecauseMenuNotFullyInspected: number;
  notCaptured: number;
  partiallyCaptured: number;
  capturedWithoutClearIndices: number;
  capturedWithoutSelectorBoundaries: number;
  capturedWithoutStableConditions: number;
  capturedWithoutSufficientVisualViews: number;
  capturedButUnsuitableForProductionMatching: number;
  productionEligibleRows: number;
}

export interface Phase0CompletionArtifacts {
  additionalAttributes?: unknown;
  additionalAttributeRecapture?: unknown;
  appearanceMenuGaps?: unknown;
  environment?: unknown;
  evidenceManifest?: unknown;
  headRecapture?: unknown;
  heads?: unknown;
  issues?: unknown;
  menuMap?: unknown;
  creationPaths?: unknown;
  researchExportManifest?: unknown;
  researchValidation?: unknown;
  authoritativeRecaptureQueue?: unknown;
  captureRequests?: unknown;
  nowISO?: string;
}

const CHECKPOINT_COUNT = 6;

const categoryDefinitions: Array<{
  id: Phase0CompletionCategoryID;
  label: string;
  terms: string[];
}> = [
  { id: "environment", label: "Environment", terms: ["environment", "console", "platform", "patch", "edition", "entitlement", "display"] },
  { id: "creationPaths", label: "Creation paths", terms: ["creation path", "road to glory", "path", "workflow"] },
  { id: "menuHierarchy", label: "Menu hierarchy", terms: ["menu", "hierarchy"] },
  { id: "headTemplates", label: "Head templates", terms: ["head", "template", "face"] },
  { id: "hairstyles", label: "Hairstyles", terms: ["hairstyle", "hair style"] },
  { id: "hairColors", label: "Hair colors", terms: ["hair color", "hair colour"] },
  { id: "facialHair", label: "Facial hair", terms: ["facial hair", "beard", "mustache", "moustache"] },
  { id: "facialHairColors", label: "Facial-hair colors", terms: ["facial-hair color", "facial hair color", "beard color"] },
  { id: "skinTone", label: "Skin tone", terms: ["skin tone", "skintone"] },
  { id: "skinDetails", label: "Skin details", terms: ["skin details", "freckles", "scars", "redness"] },
  { id: "eyeShape", label: "Eye shape", terms: ["eye shape"] },
  { id: "eyeColor", label: "Eye color", terms: ["eye color", "eye colour"] },
  { id: "eyebrows", label: "Eyebrows", terms: ["eyebrow", "brow"] },
  { id: "nose", label: "Nose", terms: ["nose"] },
  { id: "ears", label: "Ears", terms: ["ear"] },
  { id: "mouth", label: "Mouth", terms: ["mouth"] },
  { id: "jawChinCheeks", label: "Jaw/chin/cheeks", terms: ["jaw", "chin", "cheek"] },
  { id: "additionalGeometryControls", label: "Additional geometry controls", terms: ["geometry", "additional attribute", "additional control"] },
  { id: "bodyHeightWeightPhysique", label: "Body/height/weight/physique", terms: ["body", "height", "weight", "physique"] },
  { id: "dependencyTests", label: "Dependency tests", terms: ["dependency", "dependency test"] },
  { id: "evidenceManifest", label: "Evidence manifest", terms: ["evidence manifest", "evidence"] },
  { id: "catalogExports", label: "Catalog exports", terms: ["catalog export", "research package", "partial research"] },
  { id: "secondVerification", label: "Second verification", terms: ["second verification", "second verifier", "verifier"] },
  { id: "manualTopThreeFeasibilityStudy", label: "Manual top-three feasibility study", terms: ["manual", "top-three", "study", "feasibility"] }
];

export function createPhase0CompletionDashboard(input: Phase0CompletionArtifacts = {}): Phase0CompletionDashboardReport {
  const context = buildArtifactContext(input);
  const categoryProgress = categoryDefinitions.map((definition) => buildCategoryProgress(definition, context));
  const metrics = calculatePhase0CompletionMetrics(categoryProgress);
  const productionApprovedTotal = sum(categoryProgress.map((category) => category.productionApproved));
  const independentlyVerifiedTotal = sum(categoryProgress.map((category) => category.independentlyVerified));
  const productionReadiness = productionApprovedTotal > 0 && independentlyVerifiedTotal > 0
    ? { status: "ready" as const, reason: "Approved production records are present." }
    : independentlyVerifiedTotal > 0
      ? { status: "verificationRequired" as const, reason: "Some records have independent verification, but no approved production release is available." }
      : { status: "blocked" as const, reason: "No independently verified, production-approved College Football 27 catalog release exists." };

  return {
    generatedAt: input.nowISO ?? new Date().toISOString(),
    categoryProgress,
    appearanceMenuGapSummary: context.appearanceMenuGapSummary,
    metrics,
    productionReadiness,
    highestPriorityMissingCapture: chooseHighestPriorityMissingCapture(context),
    nextRecommendedCodexAction: chooseNextCodexAction(categoryProgress, context),
    nextRequiredHumanAction: chooseNextHumanAction(context)
  };
}

export function calculatePhase0CompletionMetrics(categories: Phase0CompletionCategoryProgress[]) {
  const requiredCategories = categories.filter((category) => category.required);
  const denominator = Math.max(requiredCategories.length, 1);
  const checkpointDenominator = denominator * CHECKPOINT_COUNT;
  const completedCheckpoints = sum(requiredCategories.map((category) => checkpointProgress(category)));

  return {
    overallPhase0CompletionPercent: percent(completedCheckpoints, checkpointDenominator),
    evidenceCompletionPercent: percent(requiredCategories.filter((category) => category.evidenceAvailable > 0).length, denominator),
    catalogCompletionPercent: percent(requiredCategories.filter((category) => category.cataloged > 0).length, denominator),
    verificationCompletionPercent: percent(requiredCategories.filter((category) => category.independentlyVerified > 0).length, denominator)
  };
}

export function getPhase0CompletionStatus(category: Pick<
  Phase0CompletionCategoryProgress,
  "evidenceAvailable" | "observed" | "cataloged" | "qaReviewed" | "independentlyVerified" | "productionApproved"
>): Phase0CompletionStatus {
  if (category.productionApproved > 0) return "productionApproved";
  if (category.independentlyVerified > 0) return "verified";
  if (category.qaReviewed > 0) return "qaReviewed";
  if (category.cataloged > 0) return "cataloged";
  if (category.observed > 0) return "observed";
  if (category.evidenceAvailable > 0) return "evidenceAvailable";
  return "notStarted";
}

interface ArtifactContext {
  additionalRecords: RecordObject[];
  additionalCategories: RecordObject[];
  creationPaths: RecordObject[];
  environment: RecordObject;
  evidenceEntries: RecordObject[];
  headRecords: RecordObject[];
  headRecaptureSummary: RecordObject;
  issues: RecordObject[];
  menuRecords: RecordObject[];
  recaptureItems: RecordObject[];
  captureRequests: RecordObject[];
  researchExportCounts: Record<string, number>;
  researchPackageValidated: boolean;
  appearanceMenuGapSummary: Phase0AppearanceMenuGapSummary;
}

interface RecordObject {
  [key: string]: unknown;
}

function buildArtifactContext(artifacts: Phase0CompletionArtifacts): ArtifactContext {
  const additionalAttributes = asRecord(artifacts.additionalAttributes);
  const creationPaths = asRecord(artifacts.creationPaths);
  const evidenceManifest = asRecord(artifacts.evidenceManifest);
  const heads = asRecord(artifacts.heads);
  const issues = asRecord(artifacts.issues);
  const menuMap = asRecord(artifacts.menuMap);
  const researchExportManifest = asRecord(artifacts.researchExportManifest);
  const researchValidation = asRecord(artifacts.researchValidation);
  const appearanceMenuGaps = asRecord(artifacts.appearanceMenuGaps);

  return {
    additionalRecords: asArray(additionalAttributes.records),
    additionalCategories: asArray(additionalAttributes.categories),
    creationPaths: asArray(creationPaths.creationPaths),
    environment: asRecord(artifacts.environment),
    evidenceEntries: asArray(evidenceManifest.entries),
    headRecaptureSummary: asRecord(asRecord(artifacts.headRecapture).summary),
    headRecords: asArray(heads.records),
    issues: asArray(issues.issues),
    menuRecords: asArray(menuMap.records),
    recaptureItems: [
      ...asArray(asRecord(artifacts.headRecapture).items),
      ...asArray(asRecord(artifacts.additionalAttributeRecapture).items),
      ...asArray(asRecord(artifacts.authoritativeRecaptureQueue).items)
    ],
    captureRequests: asArray(asRecord(artifacts.captureRequests).requests),
    researchExportCounts: numberRecord(asRecord(researchExportManifest.counts)),
    researchPackageValidated: researchValidation.ok === true || researchValidation.status === "passed",
    appearanceMenuGapSummary: normalizeAppearanceMenuGapSummary(asRecord(appearanceMenuGaps.summary))
  };
}

function buildCategoryProgress(
  definition: (typeof categoryDefinitions)[number],
  context: ArtifactContext
): Phase0CompletionCategoryProgress {
  const base = {
    id: definition.id,
    label: definition.label,
    required: true,
    evidenceAvailable: 0,
    observed: 0,
    cataloged: 0,
    qaReviewed: 0,
    independentlyVerified: 0,
    productionApproved: 0,
    recaptureRequired: countRecaptureItems(context, definition),
    blockingIssueCount: countBlockingIssues(context, definition),
    sourceSummary: "No machine-readable Phase 0 artifact exists for this category.",
    nextAction: "Capture evidence, catalog direct observations, and keep the record out of production until verification."
  };

  const row = populateCategoryProgress(base, context);
  return {
    ...row,
    status: getPhase0CompletionStatus(row),
    completionPercent: percent(checkpointProgress(row), CHECKPOINT_COUNT)
  };
}

function populateCategoryProgress(
  row: Omit<Phase0CompletionCategoryProgress, "status" | "completionPercent">,
  context: ArtifactContext
): Omit<Phase0CompletionCategoryProgress, "status" | "completionPercent"> {
  switch (row.id) {
    case "environment": {
      const evidenceCount = Object.keys(asRecord(context.environment.fieldEvidence)).length + (stringValue(context.environment.sourceVideo) ? 1 : 0);
      const observed = stringValue(context.environment.environmentID) ? 1 : 0;
      return {
        ...row,
        evidenceAvailable: evidenceCount,
        observed,
        cataloged: observed,
        qaReviewed: context.researchPackageValidated && observed > 0 ? 1 : 0,
        sourceSummary: observed > 0 ? "Research environment manifest exists with direct evidence references." : row.sourceSummary,
        nextAction: row.recaptureRequired > 0 ? "Resolve missing environment evidence before any production catalog release." : "Submit the environment to independent verification."
      };
    }
    case "creationPaths": {
      const observed = context.creationPaths.length;
      return {
        ...row,
        evidenceAvailable: countRecordsWithEvidence(context.creationPaths),
        observed,
        cataloged: observed,
        qaReviewed: context.researchPackageValidated && observed > 0 ? observed : 0,
        sourceSummary: observed > 0 ? `${observed} research creation path record(s) are present.` : row.sourceSummary,
        nextAction: "Verify the canonical Road to Glory path with direct evidence and second-person review."
      };
    }
    case "menuHierarchy": {
      const observed = context.menuRecords.length;
      return {
        ...row,
        evidenceAvailable: countRecordsWithEvidence(context.menuRecords),
        observed,
        cataloged: observed,
        qaReviewed: context.researchPackageValidated && observed > 0 ? observed : 0,
        sourceSummary: observed > 0 ? `${observed} directly observed menu-map record(s) are present.` : row.sourceSummary,
        nextAction: row.recaptureRequired > 0 ? "Complete partial menu boundaries and selector counts." : "Send the menu map through second verification."
      };
    }
    case "headTemplates": {
      const observed = context.headRecords.length;
      return {
        ...row,
        evidenceAvailable: countRecordsWithEvidence(context.headRecords),
        observed,
        cataloged: observed,
        qaReviewed: context.researchPackageValidated && observed > 0 ? observed : 0,
        recaptureRequired: Math.max(row.recaptureRequired, numberValue(context.headRecaptureSummary.recordsRequiringProductionRecapture)),
        sourceSummary: observed > 0 ? `${observed} head-template research candidate(s) are cataloged from supplied video evidence.` : row.sourceSummary,
        nextAction: "Record a standardized head-template pass that proves category boundaries and production-quality views."
      };
    }
    case "skinTone":
      return attributeCategory(row, context, "Skin Tone");
    case "skinDetails":
      return attributeCategory(row, context, "Skin Details");
    case "eyeShape":
      return attributeCategory(row, context, "Eye Shape");
    case "eyeColor":
      return attributeCategory(row, context, "Eye Color");
    case "nose":
      return attributeCategory(row, context, "Nose");
    case "ears":
      return attributeCategory(row, context, "Ear Shape");
    case "evidenceManifest": {
      const observed = context.evidenceEntries.length;
      return {
        ...row,
        evidenceAvailable: observed,
        observed,
        cataloged: observed,
        qaReviewed: context.researchPackageValidated && observed > 0 ? observed : 0,
        sourceSummary: observed > 0 ? `${observed} evidence manifest entr${observed === 1 ? "y is" : "ies are"} present.` : row.sourceSummary,
        nextAction: "Keep relative paths and checksums current as new evidence arrives."
      };
    }
    case "catalogExports": {
      const records = context.researchExportCounts.totalResearchCatalogRecords ?? 0;
      const exportFileCount = Object.keys(context.researchExportCounts).length;
      return {
        ...row,
        evidenceAvailable: exportFileCount,
        observed: records,
        cataloged: records,
        qaReviewed: context.researchPackageValidated && records > 0 ? records : 0,
        sourceSummary: records > 0 ? `${records} research catalog record(s) are included in the partial export.` : row.sourceSummary,
        nextAction: "Keep research exports labeled not-production and rerun validation after each evidence ingest."
      };
    }
    case "secondVerification":
      return {
        ...row,
        sourceSummary: "No machine-readable second-person verification completion is present.",
        nextAction: "Assign an independent verifier after the current research package has complete evidence."
      };
    case "manualTopThreeFeasibilityStudy":
      return {
        ...row,
        sourceSummary: "No real 10-20 person manual top-three study results are present.",
        nextAction: "Run the feasibility study only after a verified catalog candidate exists."
      };
    default:
      return uncatalogedRequiredCategory(row);
  }
}

function attributeCategory(
  row: Omit<Phase0CompletionCategoryProgress, "status" | "completionPercent">,
  context: ArtifactContext,
  categoryName: string
): Omit<Phase0CompletionCategoryProgress, "status" | "completionPercent"> {
  const records = context.additionalRecords.filter((record) => stringValue(record.category) === categoryName);
  const category = context.additionalCategories.find((record) => stringValue(record.category) === categoryName);
  const observed = records.length || numberValue(category?.directlyObservedUniqueValueCount);
  return {
    ...row,
    evidenceAvailable: countRecordsWithEvidence(records),
    observed,
    cataloged: records.length,
    qaReviewed: context.researchPackageValidated && records.length > 0 ? records.length : 0,
    sourceSummary: records.length > 0 ? `${records.length} ${categoryName} research candidate(s) are cataloged from supplied video evidence.` : row.sourceSummary,
    nextAction: row.recaptureRequired > 0
      ? `Complete ${categoryName} selector boundary, default, wrap, and second-verification evidence.`
      : `Submit ${categoryName} records for independent verification.`
  };
}

function uncatalogedRequiredCategory(row: Omit<Phase0CompletionCategoryProgress, "status" | "completionPercent">) {
  return {
    ...row,
    nextAction: "Record direct shipping-game evidence before creating any research candidate records."
  };
}

function checkpointProgress(category: Pick<
  Phase0CompletionCategoryProgress,
  "evidenceAvailable" | "observed" | "cataloged" | "qaReviewed" | "independentlyVerified" | "productionApproved"
>): number {
  return [
    category.evidenceAvailable > 0,
    category.observed > 0,
    category.cataloged > 0,
    category.qaReviewed > 0,
    category.independentlyVerified > 0,
    category.productionApproved > 0
  ].filter(Boolean).length;
}

function chooseHighestPriorityMissingCapture(context: ArtifactContext): string {
  const captureRequest = chooseHighestPriorityCaptureRequest(context);
  if (captureRequest) return `${stringValue(captureRequest.priority) || "P?"}: ${stringValue(captureRequest.captureID)} - ${stringValue(captureRequest.exactCategory)}`;
  const sorted = [...context.recaptureItems]
    .filter((item) => stringValue(item.status).toLowerCase() !== "closed")
    .sort((first, second) => priorityRank(first) - priorityRank(second) || stringValue(first.title).localeCompare(stringValue(second.title)));
  return sorted[0] ? `${stringValue(sorted[0].priority) || "P?"}: ${stringValue(sorted[0].title)}` : "No open recapture item found in machine-readable artifacts.";
}

function chooseNextHumanAction(context: ArtifactContext): string {
  const captureRequest = chooseHighestPriorityCaptureRequest(context);
  if (captureRequest) {
    const startingOption = stringValue(captureRequest.exactStartingOption) || stringValue(captureRequest.startingOption);
    const endingOption = stringValue(captureRequest.exactEndingOption) || stringValue(captureRequest.endingOption);
    return `${stringValue(captureRequest.captureID)}: record ${stringValue(captureRequest.exactCategory)} from ${startingOption} through ${endingOption}.`;
  }
  const item = [...context.recaptureItems]
    .filter((candidate) => stringValue(candidate.blocksProduction) !== "false")
    .sort((first, second) => priorityRank(first) - priorityRank(second) || stringValue(first.title).localeCompare(stringValue(second.title)))[0];
  return item ? `${stringValue(item.title)} — ${stringValue(item.ownerRecordingInstructions) || "capture the required evidence listed in the queue."}` : "Assign second-person verification after evidence capture is complete.";
}

function chooseHighestPriorityCaptureRequest(context: ArtifactContext): RecordObject | null {
  const currentScriptRequest = [...context.captureRequests]
    .filter((request) => stringValue(request.section) === "record_this_tonight")
    .sort((first, second) => priorityRank(first) - priorityRank(second) || numberValue(first.sessionNumber) - numberValue(second.sessionNumber) || stringValue(first.captureID).localeCompare(stringValue(second.captureID)))[0];
  if (currentScriptRequest) return currentScriptRequest;
  return [...context.captureRequests]
    .filter((request) => stringValue(request.section) === "must_capture_before_phase0_catalog_completion" || stringValue(request.section) === "must_recapture_because_current_evidence_is_inadequate")
    .sort((first, second) => priorityRank(first) - priorityRank(second) || stringValue(first.captureID).localeCompare(stringValue(second.captureID)))[0] ?? null;
}

function chooseNextCodexAction(categories: Phase0CompletionCategoryProgress[], context: ArtifactContext): string {
  if (!context.researchPackageValidated) return "Fix research-package validation before updating dashboard status.";
  if (categories.some((category) => category.cataloged === 0 && category.required)) {
    return "After new evidence is supplied, ingest the remaining uncataloged required categories into the research namespace.";
  }
  if (categories.some((category) => category.blockingIssueCount > 0)) {
    return "Triage open blocking issues and keep recapture requirements synchronized with machine-readable artifacts.";
  }
  return "Prepare second-verifier workflow inputs from the completed research package.";
}

function countBlockingIssues(context: ArtifactContext, definition: (typeof categoryDefinitions)[number]): number {
  return context.issues.filter((issue) => {
    const severity = stringValue(issue.severity).toLowerCase();
    const status = stringValue(issue.status).toLowerCase();
    return severity === "blocking" && status !== "closed" && recordMatchesTerms(issue, definition.terms);
  }).length;
}

function countRecaptureItems(context: ArtifactContext, definition: (typeof categoryDefinitions)[number]): number {
  return context.recaptureItems.filter((item) => {
    const status = stringValue(item.status).toLowerCase();
    return status !== "closed" && recordMatchesTerms(item, definition.terms);
  }).length;
}

function countRecordsWithEvidence(records: RecordObject[]): number {
  return records.filter((record) => {
    if (asArray(record.evidenceReferences).length > 0) return true;
    if (asArray(record.sourceVideos).length > 0) return true;
    if (asArray(record.sourceObservations).length > 0) return true;
    if (asArray(record.reproducibleSteps).some((step) => asArray(step.evidenceReferences).length > 0)) return true;
    if (stringValue(record.evidenceFrame)) return true;
    if (asArray(record.selectedEvidence).length > 0) return true;
    return false;
  }).length;
}

function recordMatchesTerms(record: RecordObject, terms: string[]): boolean {
  const haystack = JSON.stringify(record).toLowerCase();
  return terms.some((term) => haystack.includes(term.toLowerCase()));
}

function priorityRank(record: RecordObject): number {
  const priority = stringValue(record.priority).toUpperCase();
  if (priority === "P0") return 0;
  if (priority === "P1") return 1;
  if (priority === "P2") return 2;
  if (priority === "P3") return 3;
  return 9;
}

function asRecord(value: unknown): RecordObject {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as RecordObject : {};
}

function asArray(value: unknown): RecordObject[] {
  return Array.isArray(value) ? value.filter((item): item is RecordObject => typeof item === "object" && item !== null && !Array.isArray(item)) : [];
}

function numberRecord(value: RecordObject): Record<string, number> {
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === "number"));
}

function normalizeAppearanceMenuGapSummary(value: RecordObject): Phase0AppearanceMenuGapSummary {
  return {
    totalRows: numberValue(value.totalRows),
    confirmedPresentIncomplete: numberValue(value.confirmedPresentIncomplete),
    confirmedPresentCompleteForResearch: numberValue(value.confirmedPresentCompleteForResearch),
    suspectedButNotObserved: numberValue(value.suspectedButNotObserved),
    confirmedAbsent: numberValue(value.confirmedAbsent),
    unknownBecauseMenuNotFullyInspected: numberValue(value.unknownBecauseMenuNotFullyInspected),
    notCaptured: numberValue(value.notCaptured),
    partiallyCaptured: numberValue(value.partiallyCaptured),
    capturedWithoutClearIndices: numberValue(value.capturedWithoutClearIndices),
    capturedWithoutSelectorBoundaries: numberValue(value.capturedWithoutSelectorBoundaries),
    capturedWithoutStableConditions: numberValue(value.capturedWithoutStableConditions),
    capturedWithoutSufficientVisualViews: numberValue(value.capturedWithoutSufficientVisualViews),
    capturedButUnsuitableForProductionMatching: numberValue(value.capturedButUnsuitableForProductionMatching),
    productionEligibleRows: numberValue(value.productionEligibleRows)
  };
}

function stringValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}
