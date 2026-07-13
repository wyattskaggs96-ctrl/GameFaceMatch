import type { GameCatalogItem, ISODateString } from "@/types/domain";

export const PRODUCTION_PUBLISH_GATE_VERSION = "production-publish-gate-v1";

export const requiredProductionPublishGateChecks = [
  "shippingEnvironmentConfirmed",
  "menuMapComplete",
  "categoryCountsComplete",
  "requiredEvidencePresent",
  "validChecksums",
  "importValidationPassed",
  "catalogManagerApproved",
  "secondPersonVerificationComplete",
  "allowedRecordStatuses",
  "noUnresolvedBlockingDiscrepancies",
  "supportedTarget",
  "noFixtures",
  "noPlaceholders"
] as const;

export type ProductionPublishGateCheckName = (typeof requiredProductionPublishGateChecks)[number];
export type ProductionPublishGateCheckStatus = "pass" | "fail";

export interface ProductionPublishGateIssue {
  code: string;
  message: string;
  recordID?: string;
}

export interface ProductionPublishGateCheck {
  name: ProductionPublishGateCheckName;
  status: ProductionPublishGateCheckStatus;
  errors: ProductionPublishGateIssue[];
}

export interface ProductionPublishGateReport {
  schemaVersion: typeof PRODUCTION_PUBLISH_GATE_VERSION;
  ok: boolean;
  generatedAt: ISODateString;
  catalogVersionID: string;
  checks: ProductionPublishGateCheck[];
  errors: ProductionPublishGateIssue[];
}

export interface ProductionPublishGateCatalogPackage {
  packageID?: string;
  packageVersion?: string;
  manifest?: {
    sourceType?: string;
    catalogVersion?: {
      identifier?: string;
      gameVersion?: string;
      platform?: string;
      verifiedAt?: string | null;
    };
    generatedAt?: string;
    isProduction?: boolean;
    packageChecksum?: string;
    items?: GameCatalogItem[];
  };
  items?: GameCatalogItem[];
  assets?: Array<{
    assetID?: string;
    angle?: string;
    relativePath?: string;
    sha256?: string;
  }>;
  publication?: {
    sourcePackageChecksum?: string;
    stateTransition?: {
      from?: string;
      to?: string;
      approvedByReviewID?: string;
    };
  };
}

export interface ProductionPublishImportValidationReport {
  ok?: boolean;
  checks?: Array<{ name?: string; status?: string; errors?: unknown[] }>;
}

export interface ProductionPublishCatalogManagerReport {
  approvedForReleaseCandidate?: boolean;
  mandatoryGatesPass?: boolean;
  unresolvedFailureCount?: number;
  repairRequestCount?: number;
  decision?: string;
  signature?: {
    algorithm?: string;
    scope?: string;
    digest?: string;
  };
}

export interface ProductionPublishSecondPersonVerificationRecord {
  targetStableID?: string;
  finalDisposition?: string;
  evidenceExists?: boolean;
  frontViewExists?: boolean;
  secondaryAngleSampleIncluded?: boolean;
  primaryAcknowledgedAt?: string | null;
  verifierAcknowledgedAt?: string | null;
}

export interface ProductionPublishDiscrepancyRecord {
  targetStableID?: string;
  severity?: string;
  status?: string;
  finalDisposition?: string;
  resolvedAt?: string | null;
}

export interface ProductionPublishShippingEnvironment {
  confirmed?: boolean;
  platform?: string;
  gameVersion?: string;
  patchVersion?: string;
  gameMode?: string;
  creationPath?: string;
  evidenceIDs?: string[];
}

export interface ProductionPublishMenuMapStatus {
  complete?: boolean;
  menuCount?: number;
  evidenceIDs?: string[];
}

export interface ProductionPublishCategoryCountStatus {
  complete?: boolean;
  countsByCategory?: Record<string, number>;
  evidenceIDs?: string[];
}

export interface ProductionPublishSupportedTargets {
  platforms?: string[];
  gameVersions?: string[];
  gameModes?: string[];
  creationPaths?: string[];
}

export interface ProductionPublishGateInput {
  catalogPackage?: ProductionPublishGateCatalogPackage | null;
  importValidationReport?: ProductionPublishImportValidationReport | null;
  catalogManagerReport?: ProductionPublishCatalogManagerReport | null;
  secondPersonVerificationRecords?: ProductionPublishSecondPersonVerificationRecord[];
  discrepancies?: ProductionPublishDiscrepancyRecord[];
  shippingEnvironment?: ProductionPublishShippingEnvironment | null;
  menuMap?: ProductionPublishMenuMapStatus | null;
  categoryCounts?: ProductionPublishCategoryCountStatus | null;
  supportedTargets?: ProductionPublishSupportedTargets | null;
  generatedAt?: ISODateString;
}

const requiredAngles = ["straightOn", "left45", "right45", "leftProfile", "rightProfile"] as const;
const allowedProductionRecordStatuses = new Set(["verified"]);
const allowedSecondPersonDispositions = new Set(["VERIFIED", "VERIFIED_WITH_NOTES"]);
const fixtureSourceTypes = new Set(["researchDraft", "testFixture", "demoData", "localDeveloperSample"]);
const placeholderPattern = /REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i;
const fixturePathPattern = /data\/fixtures\/test-only|\/fixtures\/test-only\/|^fixtures\/test-only\/|\/test-only\//i;
const requiredImportValidationChecks = [
  "schemaImports",
  "basePackageValidation",
  "uniqueIDs",
  "resolvableEvidencePaths",
  "nativeOrderContinuity",
  "requiredEvidence",
  "requiredEnvironmentFields",
  "verificationStatusValidity",
  "placeholderRecords",
  "collegeFootball26Records",
  "duplicateObservationsRetained",
  "productionTestSeparation",
  "productionRecommenderFixtureAccess",
  "supportedTarget",
  "validChecksums",
  "validSupersessionChains",
  "dependencyRecordValidity"
];

export function evaluateProductionPublishGate(input: ProductionPublishGateInput): ProductionPublishGateReport {
  const catalogPackage = input.catalogPackage ?? null;
  const items = catalogPackage?.items ?? catalogPackage?.manifest?.items ?? [];
  const assets = catalogPackage?.assets ?? [];
  const checks: ProductionPublishGateCheck[] = [
    check("shippingEnvironmentConfirmed", validateShippingEnvironment(input.shippingEnvironment, items)),
    check("menuMapComplete", validateMenuMap(input.menuMap)),
    check("categoryCountsComplete", validateCategoryCounts(input.categoryCounts, items)),
    check("requiredEvidencePresent", validateRequiredEvidence(items, assets)),
    check("validChecksums", validateChecksumGate(catalogPackage, input.importValidationReport)),
    check("importValidationPassed", validateImportGate(input.importValidationReport)),
    check("catalogManagerApproved", validateCatalogManagerGate(input.catalogManagerReport)),
    check("secondPersonVerificationComplete", validateSecondPersonVerification(items, input.secondPersonVerificationRecords ?? [])),
    check("allowedRecordStatuses", validateAllowedRecordStatuses(items)),
    check("noUnresolvedBlockingDiscrepancies", validateDiscrepancies(input.discrepancies ?? [])),
    check("supportedTarget", validateSupportedTargets(items, input.supportedTargets, input.shippingEnvironment)),
    check("noFixtures", validateNoFixtures(catalogPackage, items, assets)),
    check("noPlaceholders", validateNoPlaceholders(catalogPackage))
  ];
  const errors = checks.flatMap((entry) => entry.errors);
  return {
    schemaVersion: PRODUCTION_PUBLISH_GATE_VERSION,
    ok: errors.length === 0,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    catalogVersionID: catalogPackage?.manifest?.catalogVersion?.identifier ?? "unknown",
    checks,
    errors
  };
}

export function isProductionPublishGateApproved(report: ProductionPublishGateReport | null | undefined): boolean {
  if (!report || report.schemaVersion !== PRODUCTION_PUBLISH_GATE_VERSION || !report.ok) return false;
  const checksByName = new Map(report.checks.map((entry) => [entry.name, entry]));
  return requiredProductionPublishGateChecks.every((name) => checksByName.get(name)?.status === "pass");
}

function validateShippingEnvironment(environment: ProductionPublishShippingEnvironment | null | undefined, items: GameCatalogItem[]) {
  const errors: ProductionPublishGateIssue[] = [];
  if (!environment?.confirmed) errors.push(issue("shippingEnvironmentNotConfirmed", "Shipping-game environment has not been confirmed."));
  for (const field of ["platform", "gameVersion", "patchVersion", "gameMode", "creationPath"] as const) {
    if (!hasText(environment?.[field])) errors.push(issue("missingShippingEnvironmentField", `Shipping-game environment is missing ${field}.`));
  }
  if ((environment?.evidenceIDs ?? []).length === 0) errors.push(issue("missingEnvironmentEvidence", "Shipping-game environment requires evidence references."));
  for (const item of items) {
    if (hasText(environment?.platform) && item.platform !== environment.platform) errors.push(issue("environmentPlatformMismatch", `${item.stableInternalID} does not match confirmed platform.`, item.stableInternalID));
    if (hasText(environment?.gameVersion) && item.gameVersion !== environment.gameVersion) errors.push(issue("environmentGameVersionMismatch", `${item.stableInternalID} does not match confirmed game version.`, item.stableInternalID));
    if (hasText(environment?.patchVersion) && item.patchVersion !== environment.patchVersion) errors.push(issue("environmentPatchMismatch", `${item.stableInternalID} does not match confirmed patch.`, item.stableInternalID));
    if (hasText(environment?.gameMode) && item.gameMode !== environment.gameMode) errors.push(issue("environmentModeMismatch", `${item.stableInternalID} does not match confirmed mode.`, item.stableInternalID));
    if (hasText(environment?.creationPath) && item.creationPath !== environment.creationPath) errors.push(issue("environmentCreationPathMismatch", `${item.stableInternalID} does not match confirmed creation path.`, item.stableInternalID));
  }
  return errors;
}

function validateMenuMap(menuMap: ProductionPublishMenuMapStatus | null | undefined) {
  const errors: ProductionPublishGateIssue[] = [];
  if (!menuMap?.complete) errors.push(issue("menuMapIncomplete", "Required menu map is not complete."));
  if (!Number.isInteger(menuMap?.menuCount) || (menuMap?.menuCount ?? 0) < 1) errors.push(issue("menuMapMissingCount", "Menu map requires a positive menu count."));
  if ((menuMap?.evidenceIDs ?? []).length === 0) errors.push(issue("menuMapMissingEvidence", "Menu map requires evidence references."));
  return errors;
}

function validateCategoryCounts(categoryCounts: ProductionPublishCategoryCountStatus | null | undefined, items: GameCatalogItem[]) {
  const errors: ProductionPublishGateIssue[] = [];
  if (!categoryCounts?.complete) errors.push(issue("categoryCountsIncomplete", "Category counts are not complete."));
  const counts = categoryCounts?.countsByCategory ?? {};
  if (Object.keys(counts).length === 0) errors.push(issue("categoryCountsMissing", "Category counts must include at least one category."));
  if ((categoryCounts?.evidenceIDs ?? []).length === 0) errors.push(issue("categoryCountsMissingEvidence", "Category counts require evidence references."));
  const actualCounts = countByCategory(items);
  for (const [category, expectedCount] of Object.entries(counts)) {
    if (!Number.isInteger(expectedCount) || expectedCount < 0) errors.push(issue("invalidCategoryCount", `${category} has an invalid expected count.`));
    if ((actualCounts[category] ?? 0) !== expectedCount) errors.push(issue("categoryCountMismatch", `${category} expected ${expectedCount} records but package has ${actualCounts[category] ?? 0}.`));
  }
  return errors;
}

function validateRequiredEvidence(items: GameCatalogItem[], assets: Array<{ assetID?: string }>) {
  const errors: ProductionPublishGateIssue[] = [];
  const assetIDs = new Set(assets.map((asset) => asset.assetID).filter(hasText));
  for (const item of items) {
    const sourceRefs = new Set(item.sourceImageReferences ?? []);
    for (const angle of requiredAngles) {
      const assetID = item.requiredAngles?.[angle];
      if (!hasText(assetID)) errors.push(issue("missingRequiredAngle", `${item.stableInternalID} is missing ${angle}.`, item.stableInternalID));
      else if (!sourceRefs.has(assetID) || !assetIDs.has(assetID)) errors.push(issue("missingRequiredEvidence", `${item.stableInternalID} ${angle} evidence is not available.`, item.stableInternalID));
    }
    if ((item.navigationInstructions ?? []).length === 0) errors.push(issue("missingMenuInstructionEvidence", `${item.stableInternalID} is missing menu-instruction evidence.`, item.stableInternalID));
    for (const instruction of item.navigationInstructions ?? []) {
      if (!assetIDs.has(instruction.evidenceAssetID)) errors.push(issue("missingMenuInstructionEvidence", `${item.stableInternalID} menu instruction evidence is unavailable.`, item.stableInternalID));
    }
  }
  return errors;
}

function validateChecksumGate(catalogPackage: ProductionPublishGateCatalogPackage | null, importReport: ProductionPublishImportValidationReport | null | undefined) {
  const errors: ProductionPublishGateIssue[] = [];
  if (!hasText(catalogPackage?.manifest?.packageChecksum)) errors.push(issue("missingManifestChecksum", "Manifest packageChecksum is missing."));
  if (!hasText(catalogPackage?.publication?.sourcePackageChecksum)) errors.push(issue("missingPublicationChecksum", "Publication sourcePackageChecksum is missing."));
  if (!importCheckPassed(importReport, "validChecksums")) errors.push(issue("checksumValidationNotPassed", "Import validation validChecksums check has not passed."));
  return errors;
}

function validateImportGate(importReport: ProductionPublishImportValidationReport | null | undefined) {
  const errors: ProductionPublishGateIssue[] = [];
  if (!importReport?.ok) errors.push(issue("importValidationFailed", "Catalog import validation has not passed."));
  for (const name of requiredImportValidationChecks) {
    if (!importCheckPassed(importReport, name)) errors.push(issue("missingImportValidationCheck", `Import validation check ${name} has not passed.`));
  }
  return errors;
}

function validateCatalogManagerGate(report: ProductionPublishCatalogManagerReport | null | undefined) {
  const errors: ProductionPublishGateIssue[] = [];
  if (!report?.approvedForReleaseCandidate || report.decision !== "approvedReleaseCandidate") errors.push(issue("catalogManagerApprovalMissing", "Catalog-manager release-candidate approval is missing."));
  if (!report?.mandatoryGatesPass) errors.push(issue("catalogManagerMandatoryGatesFailed", "Catalog-manager mandatory gates have not passed."));
  if ((report?.unresolvedFailureCount ?? 1) !== 0) errors.push(issue("catalogManagerUnresolvedFailures", "Catalog-manager report still has unresolved failures."));
  if ((report?.repairRequestCount ?? 1) !== 0) errors.push(issue("catalogManagerRepairRequests", "Catalog-manager report still has repair requests."));
  if (report?.signature?.algorithm !== "SHA-256" || !hasText(report.signature.digest)) errors.push(issue("catalogManagerSignatureMissing", "Catalog-manager approval requires a SHA-256 signed report."));
  return errors;
}

function validateSecondPersonVerification(items: GameCatalogItem[], records: ProductionPublishSecondPersonVerificationRecord[]) {
  const errors: ProductionPublishGateIssue[] = [];
  const byID = new Map(records.map((record) => [record.targetStableID, record]));
  for (const item of items) {
    const record = byID.get(item.stableInternalID);
    if (!record) {
      errors.push(issue("missingSecondPersonVerification", `${item.stableInternalID} is missing second-person verification.`, item.stableInternalID));
      continue;
    }
    if (!allowedSecondPersonDispositions.has(record.finalDisposition ?? "")) errors.push(issue("secondPersonVerificationNotPublishable", `${item.stableInternalID} is not VERIFIED or VERIFIED_WITH_NOTES.`, item.stableInternalID));
    if (!record.evidenceExists || !record.frontViewExists || !record.secondaryAngleSampleIncluded) {
      errors.push(issue("secondPersonVerificationEvidenceIncomplete", `${item.stableInternalID} second-person verification evidence is incomplete.`, item.stableInternalID));
    }
    if (!hasText(record.primaryAcknowledgedAt) || !hasText(record.verifierAcknowledgedAt)) {
      errors.push(issue("secondPersonVerificationAcknowledgmentMissing", `${item.stableInternalID} is missing both-party acknowledgment.`, item.stableInternalID));
    }
  }
  return errors;
}

function validateAllowedRecordStatuses(items: GameCatalogItem[]) {
  return items.flatMap((item) =>
    allowedProductionRecordStatuses.has(item.verificationState)
      ? []
      : [issue("recordStatusNotAllowed", `${item.stableInternalID} has disallowed production status ${item.verificationState}.`, item.stableInternalID)]
  );
}

function validateDiscrepancies(discrepancies: ProductionPublishDiscrepancyRecord[]) {
  return discrepancies.flatMap((discrepancy) => {
    const unresolved = !hasText(discrepancy.resolvedAt) && !["resolved", "closed"].includes(String(discrepancy.status ?? "").toLowerCase());
    const blocking = ["blocking", "critical"].includes(String(discrepancy.severity ?? "").toLowerCase());
    return unresolved && blocking
      ? [issue("unresolvedBlockingDiscrepancy", `${discrepancy.targetStableID ?? "Catalog package"} has an unresolved blocking discrepancy.`, discrepancy.targetStableID)]
      : [];
  });
}

function validateSupportedTargets(items: GameCatalogItem[], supportedTargets: ProductionPublishSupportedTargets | null | undefined, environment: ProductionPublishShippingEnvironment | null | undefined) {
  const errors: ProductionPublishGateIssue[] = [];
  for (const item of items) {
    for (const [field, values] of [
      ["platform", supportedTargets?.platforms],
      ["gameVersion", supportedTargets?.gameVersions],
      ["gameMode", supportedTargets?.gameModes],
      ["creationPath", supportedTargets?.creationPaths]
    ] as const) {
      if (!values?.includes(String(item[field]))) errors.push(issue("unsupportedTarget", `${item.stableInternalID} has unsupported ${field}: ${String(item[field])}.`, item.stableInternalID));
    }
  }
  if (!supportedTargets?.platforms?.includes(environment?.platform ?? "")) errors.push(issue("unsupportedShippingPlatform", "Confirmed shipping platform is not supported by this release."));
  if (!supportedTargets?.gameVersions?.includes(environment?.gameVersion ?? "")) errors.push(issue("unsupportedShippingVersion", "Confirmed shipping game version is not supported by this release."));
  if (!supportedTargets?.gameModes?.includes(environment?.gameMode ?? "")) errors.push(issue("unsupportedShippingMode", "Confirmed shipping game mode is not supported by this release."));
  if (!supportedTargets?.creationPaths?.includes(environment?.creationPath ?? "")) errors.push(issue("unsupportedShippingPath", "Confirmed shipping creation path is not supported by this release."));
  return errors;
}

function validateNoFixtures(catalogPackage: ProductionPublishGateCatalogPackage | null, items: GameCatalogItem[], assets: Array<{ relativePath?: string }>) {
  const errors: ProductionPublishGateIssue[] = [];
  if (catalogPackage?.manifest?.sourceType !== "production") errors.push(issue("manifestNotProduction", "Manifest sourceType is not production."));
  for (const item of items) {
    if (item.isTestFixture || fixtureSourceTypes.has(item.sourceType)) errors.push(issue("fixtureRecordInProduction", `${item.stableInternalID} is fixture or non-production data.`, item.stableInternalID));
  }
  for (const asset of assets) {
    if (fixturePathPattern.test(String(asset.relativePath ?? "").replaceAll("\\", "/"))) errors.push(issue("fixtureEvidencePath", `${asset.relativePath ?? "Asset"} points to fixture evidence.`));
  }
  return errors;
}

function validateNoPlaceholders(catalogPackage: ProductionPublishGateCatalogPackage | null) {
  return placeholderPattern.test(JSON.stringify(catalogPackage ?? ""))
    ? [issue("placeholderToken", "Catalog package contains placeholder text.")]
    : [];
}

function importCheckPassed(report: ProductionPublishImportValidationReport | null | undefined, name: string) {
  return report?.checks?.some((checkEntry) => checkEntry.name === name && checkEntry.status !== "fail" && (checkEntry.errors ?? []).length === 0) ?? false;
}

function countByCategory(items: GameCatalogItem[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.category] = (counts[item.category] ?? 0) + 1;
    return counts;
  }, {});
}

function check(name: ProductionPublishGateCheckName, errors: ProductionPublishGateIssue[]): ProductionPublishGateCheck {
  return { name, status: errors.length === 0 ? "pass" : "fail", errors };
}

function issue(code: string, message: string, recordID?: string): ProductionPublishGateIssue {
  return { code, message, recordID };
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
