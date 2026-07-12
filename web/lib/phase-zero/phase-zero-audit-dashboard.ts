import { approveCatalogRelease } from "@/lib/gates/feature-gates";
import { getDataSourceTypeLabel, isProductionSource } from "@/lib/data/source-types";
import { productionCatalogManifest } from "@/lib/catalog/production-manifest";
import type { CapturedAngleID, DataSourceType, GameCatalogItem, GameCatalogManifest } from "@/types/domain";
import { createPhase0StatusReport, type Phase0AreaStatus, type Phase0StatusReport } from "./phase-zero-status";

export type Phase0AuditDashboardStatus = "ready" | "inProgress" | "blocked" | "notStarted";
export type Phase0AuditCategoryID = "headCatalog" | "hairstyleCatalog" | "facialHairCatalog" | "additionalAttributes";

export interface Phase0AuditEnvironmentSummary {
  state: Phase0AuditDashboardStatus;
  label: string;
  platform: string;
  gameVersion: string;
  patchVersion: string;
  gameMode: string;
  creationPath: string;
}

export interface Phase0AuditCategoryProgress {
  id: Phase0AuditCategoryID;
  label: string;
  capturedCount: number;
  verifiedCount: number;
  missingViewCount: number;
  missingEvidenceCount: number;
  percentComplete: number;
  status: Phase0AuditDashboardStatus;
  blocker: string | null;
  nextAction: string;
}

export interface Phase0AuditProgressSummary {
  totalCaptured: number;
  totalVerified: number;
  missingViews: number;
  missingEvidence: number;
  recaptureRequests: number;
  dependencyTestsPending: number;
}

export interface Phase0AuditDashboardReport {
  generatedAt: string;
  productionMode: boolean;
  dataSourceType: DataSourceType;
  dataClassLabel: string;
  ignoredNonProductionRecordCount: number;
  currentEnvironment: Phase0AuditEnvironmentSummary;
  catalogVersion: {
    identifier: string;
    gameVersion: string;
    platform: string;
    verifiedAt: string | null;
    itemCount: number;
  };
  categoryProgress: Phase0AuditCategoryProgress[];
  progress: Phase0AuditProgressSummary;
  catalogManagerValidationState: Phase0AreaStatus;
  secondVerifierProgress: {
    completed: number;
    total: number;
    percentComplete: number;
    status: Phase0AuditDashboardStatus;
  };
  manualStudyReadiness: Phase0AreaStatus;
  productionGateState: {
    status: Phase0AuditDashboardStatus;
    reasons: string[];
  };
  blockedStates: string[];
  highestPriorityNextAction: string;
}

const requiredAngles: CapturedAngleID[] = ["straightOn", "left45", "right45", "leftProfile", "rightProfile"];

export function createPhase0AuditDashboardReport(input: {
  manifest?: GameCatalogManifest;
  phase0Report?: Phase0StatusReport;
  productionMode?: boolean;
} = {}): Phase0AuditDashboardReport {
  const manifest = input.manifest ?? productionCatalogManifest;
  const phase0Report = input.phase0Report ?? createPhase0StatusReport();
  const productionMode = input.productionMode ?? true;
  const productionRecords = productionEligibleItems(manifest);
  const verifiedRecords = productionRecords.filter((item) => item.verificationState === "verified");
  const ignoredNonProductionRecordCount = manifest.items.length - productionRecords.length;
  const releaseApproval = approveCatalogRelease({ manifest });
  const categoryProgress = buildCategoryProgress(productionRecords);
  const progress = {
    totalCaptured: productionRecords.filter(hasAnyEvidence).length,
    totalVerified: verifiedRecords.length,
    missingViews: sum(categoryProgress.map((category) => category.missingViewCount)),
    missingEvidence: sum(categoryProgress.map((category) => category.missingEvidenceCount)),
    recaptureRequests: productionRecords.filter((item) => item.verificationState === "rejected").length,
    dependencyTestsPending: productionRecords.length === 0 ? 0 : productionRecords.filter((item) => !hasDependencyAnnotations(item)).length
  };
  const secondVerifierCompleted = productionRecords.filter((item) => Boolean(item.auditTrail?.secondReviewID)).length;
  const secondVerifierTotal = productionRecords.length;
  const productionGateReasons = releaseApproval.approvedRelease ? ["Approved catalog release is available."] : releaseApproval.reasons;
  const blockedStates = buildBlockedStates({
    productionRecords,
    ignoredNonProductionRecordCount,
    progress,
    releaseApprovalReasons: productionGateReasons,
    categoryProgress
  });

  return {
    generatedAt: phase0Report.generatedAt,
    productionMode,
    dataSourceType: manifest.sourceType,
    dataClassLabel: getDataSourceTypeLabel(manifest.sourceType),
    ignoredNonProductionRecordCount,
    currentEnvironment: buildCurrentEnvironment(productionRecords),
    catalogVersion: {
      identifier: manifest.catalogVersion.identifier,
      gameVersion: manifest.catalogVersion.gameVersion || "Not recorded",
      platform: manifest.catalogVersion.platform || "Not recorded",
      verifiedAt: manifest.catalogVersion.verifiedAt,
      itemCount: productionRecords.length
    },
    categoryProgress,
    progress,
    catalogManagerValidationState: requireArea(phase0Report, "catalogManagerValidation"),
    secondVerifierProgress: {
      completed: secondVerifierCompleted,
      total: secondVerifierTotal,
      percentComplete: percent(secondVerifierCompleted, secondVerifierTotal),
      status: secondVerifierTotal === 0 ? "blocked" : secondVerifierCompleted === secondVerifierTotal ? "ready" : "blocked"
    },
    manualStudyReadiness: requireArea(phase0Report, "manualMatchingFeasibility"),
    productionGateState: {
      status: releaseApproval.approvedRelease ? "ready" : "blocked",
      reasons: productionGateReasons
    },
    blockedStates,
    highestPriorityNextAction: chooseHighestPriorityNextAction({ productionRecords, progress, categoryProgress, releaseApprovalReasons: productionGateReasons })
  };
}

function productionEligibleItems(manifest: GameCatalogManifest): GameCatalogItem[] {
  if (!manifest.isProduction || !isProductionSource(manifest.sourceType)) return [];
  return manifest.items.filter((item) => isProductionSource(item.sourceType) && !item.isTestFixture);
}

function buildCategoryProgress(items: GameCatalogItem[]): Phase0AuditCategoryProgress[] {
  return [
    category("headCatalog", "Head catalog", items, isHeadCategory),
    category("hairstyleCatalog", "Hairstyle catalog", items, isHairstyleCategory),
    category("facialHairCatalog", "Facial-hair catalog", items, isFacialHairCategory),
    category("additionalAttributes", "Additional attributes", items, isAdditionalCategory)
  ];
}

function category(
  id: Phase0AuditCategoryID,
  label: string,
  items: GameCatalogItem[],
  predicate: (item: GameCatalogItem) => boolean
): Phase0AuditCategoryProgress {
  const categoryItems = items.filter(predicate);
  const capturedCount = categoryItems.filter(hasAnyEvidence).length;
  const verifiedCount = categoryItems.filter((item) => item.verificationState === "verified").length;
  const missingViewCount = sum(categoryItems.map(countMissingRequiredViews));
  const missingEvidenceCount = categoryItems.filter((item) => item.sourceImageReferences.length === 0).length;
  const blocker = categoryItems.length === 0 ? `${label} has no evidence-backed production records.` : missingViewCount > 0 || missingEvidenceCount > 0 ? `${label} has incomplete evidence.` : verifiedCount < categoryItems.length ? `${label} still needs verification.` : null;

  return {
    id,
    label,
    capturedCount,
    verifiedCount,
    missingViewCount,
    missingEvidenceCount,
    percentComplete: percent(verifiedCount, Math.max(categoryItems.length, 1)),
    status: blocker ? "blocked" : "ready",
    blocker,
    nextAction: blocker ? getCategoryNextAction(id, categoryItems.length, missingViewCount, missingEvidenceCount) : "Keep this category under patch-version monitoring."
  };
}

function buildCurrentEnvironment(items: GameCatalogItem[]): Phase0AuditEnvironmentSummary {
  if (items.length === 0) {
    return {
      state: "blocked",
      label: "No production audit environment recorded",
      platform: "Not recorded",
      gameVersion: "Not recorded",
      patchVersion: "Not recorded",
      gameMode: "Not recorded",
      creationPath: "Not recorded"
    };
  }
  return {
    state: "inProgress",
    label: "Derived from production catalog records",
    platform: formatUnique(items.map((item) => item.platform)),
    gameVersion: formatUnique(items.map((item) => item.gameVersion)),
    patchVersion: formatUnique(items.map((item) => item.patchVersion ?? "")),
    gameMode: formatUnique(items.map((item) => item.gameMode)),
    creationPath: formatUnique(items.map((item) => item.creationPath))
  };
}

function buildBlockedStates(input: {
  productionRecords: GameCatalogItem[];
  ignoredNonProductionRecordCount: number;
  progress: Phase0AuditProgressSummary;
  releaseApprovalReasons: string[];
  categoryProgress: Phase0AuditCategoryProgress[];
}) {
  const blockers: string[] = [];
  if (input.productionRecords.length === 0) blockers.push("No verified shipping-game production records exist.");
  if (input.ignoredNonProductionRecordCount > 0) blockers.push(`${input.ignoredNonProductionRecordCount} non-production records were ignored for production dashboard progress.`);
  if (input.progress.missingViews > 0) blockers.push(`${input.progress.missingViews} required views are missing from production records.`);
  if (input.progress.missingEvidence > 0) blockers.push(`${input.progress.missingEvidence} production records are missing source evidence.`);
  if (input.progress.recaptureRequests > 0) blockers.push(`${input.progress.recaptureRequests} records require recapture or rejection resolution.`);
  blockers.push(...input.categoryProgress.flatMap((category) => (category.blocker ? [category.blocker] : [])));
  blockers.push(...input.releaseApprovalReasons.filter((reason) => !/approved catalog release/i.test(reason)));
  return unique(blockers);
}

function chooseHighestPriorityNextAction(input: {
  productionRecords: GameCatalogItem[];
  progress: Phase0AuditProgressSummary;
  categoryProgress: Phase0AuditCategoryProgress[];
  releaseApprovalReasons: string[];
}) {
  if (input.productionRecords.length === 0) return "Create a real College Football 27 audit session, record the environment, then capture the first evidence-backed category record.";
  if (input.progress.missingEvidence > 0) return "Attach required source evidence before review.";
  if (input.progress.missingViews > 0) return "Capture or recapture the missing required views.";
  if (input.progress.recaptureRequests > 0) return "Resolve open recapture requests before second review.";
  const blockedCategory = input.categoryProgress.find((category) => category.status === "blocked");
  if (blockedCategory) return blockedCategory.nextAction;
  if (input.releaseApprovalReasons.length > 0) return input.releaseApprovalReasons[0];
  return "Prepare an immutable catalog release candidate for owner review.";
}

function requireArea(report: Phase0StatusReport, id: Phase0AreaStatus["id"]) {
  const area = report.areas.find((candidate) => candidate.id === id);
  if (!area) throw new Error(`Missing Phase 0 status area: ${id}`);
  return area;
}

function hasAnyEvidence(item: GameCatalogItem) {
  return item.sourceImageReferences.length > 0 || Object.values(item.requiredAngles ?? {}).some((value) => value.trim().length > 0);
}

function countMissingRequiredViews(item: GameCatalogItem) {
  const provided: Partial<Record<CapturedAngleID, string>> = item.requiredAngles ?? {};
  return requiredAngles.filter((angle) => !provided[angle]?.trim()).length;
}

function hasDependencyAnnotations(item: GameCatalogItem) {
  return Object.keys(item.humanAnnotations).some((key) => /depend|lock|requires|interaction/i.test(key));
}

function isHeadCategory(item: GameCatalogItem) {
  return /head|face/i.test(item.category);
}

function isHairstyleCategory(item: GameCatalogItem) {
  return /hair/i.test(item.category) && !isFacialHairCategory(item);
}

function isFacialHairCategory(item: GameCatalogItem) {
  return /facial\s*hair|beard|mustache|moustache/i.test(item.category);
}

function isAdditionalCategory(item: GameCatalogItem) {
  return !isHeadCategory(item) && !isHairstyleCategory(item) && !isFacialHairCategory(item);
}

function getCategoryNextAction(id: Phase0AuditCategoryID, itemCount: number, missingViewCount: number, missingEvidenceCount: number) {
  if (itemCount === 0) return `Audit the first ${categoryNoun(id)} record from shipping-game evidence.`;
  if (missingEvidenceCount > 0) return "Attach source evidence references for every entered record.";
  if (missingViewCount > 0) return "Capture the standard five-view screenshot set for each record.";
  return "Complete first review and second-person verification.";
}

function categoryNoun(id: Phase0AuditCategoryID) {
  if (id === "headCatalog") return "head";
  if (id === "hairstyleCatalog") return "hairstyle";
  if (id === "facialHairCatalog") return "facial-hair";
  return "additional attribute";
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function formatUnique(values: string[]) {
  const entries = unique(values.filter((value) => value.trim().length > 0));
  return entries.length === 0 ? "Not recorded" : entries.join(", ");
}

function unique(values: string[]) {
  return Array.from(new Set(values)).sort();
}
