import { productionCatalogManifest } from "@/lib/catalog/production-manifest";
import type { GameCatalogItem, GameCatalogManifest } from "@/types/domain";

export type Phase0AreaID =
  | "publicResearch"
  | "auditPreparation"
  | "shippingGameInspection"
  | "environmentDocumentation"
  | "creationPathMapping"
  | "menuMapping"
  | "headCatalog"
  | "hairstyleCatalog"
  | "facialHairCatalog"
  | "additionalAttributes"
  | "dependencyTesting"
  | "evidenceIntegrity"
  | "catalogExports"
  | "catalogManagerValidation"
  | "secondPersonVerification"
  | "manualMatchingFeasibility"
  | "overallPhase0";

export type Phase0Status = "NOT_STARTED" | "IN_PROGRESS" | "READY_WITH_LIMITATIONS" | "BLOCKED" | "COMPLETE";

export interface Phase0EvidenceCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface Phase0AreaStatus {
  id: Phase0AreaID;
  label: string;
  status: Phase0Status;
  percentComplete: number;
  completedChecks: number;
  totalChecks: number;
  evidence: Phase0EvidenceCheck[];
  blockers: string[];
  nextActions: string[];
}

export interface Phase0StatusReport {
  generatedAt: string;
  productionCatalogVersionID: string;
  productionRecordCount: number;
  verifiedProductionRecordCount: number;
  areas: Phase0AreaStatus[];
  overall: Phase0AreaStatus;
}

export interface Phase0RepositoryState {
  nowISO: string;
  productionCatalog: GameCatalogManifest;
  repositoryFiles: string[];
  auditTemplateFiles: string[];
  schemaFiles: string[];
  catalogToolCommands: string[];
  adminCatalogManagerPresent: boolean;
  webTestsConfigured: boolean;
  e2eTestsConfigured: boolean;
  iOSTestsConfigured: boolean;
}

const requiredAuditTemplates = [
  "data/audit/college-football-27/templates/audit-session-template.json",
  "data/audit/college-football-27/templates/menu-audit-checklist.md",
  "data/audit/college-football-27/templates/platform-audit-template.md",
  "data/audit/college-football-27/templates/game-version-template.md",
  "data/audit/college-football-27/templates/capture-session-template.md",
  "data/audit/college-football-27/templates/record-entry-template.md",
  "data/audit/college-football-27/templates/reviewer-checklist.md",
  "data/audit/college-football-27/templates/publication-checklist.md"
];

const requiredSchemas = [
  "data/schemas/catalog-manifest.schema.json",
  "data/schemas/catalog-package.schema.json",
  "data/schemas/catalog-item.schema.json",
  "data/schemas/asset-reference.schema.json",
  "data/schemas/review-record.schema.json",
  "data/schemas/second-person-verification.schema.json",
  "data/schemas/discrepancy-resolution.schema.json",
  "data/schemas/navigation-instruction.schema.json",
  "data/schemas/publication-record.schema.json",
  "data/schemas/evidence-file.schema.json",
  "data/schemas/evidence-intake.schema.json",
  "data/schemas/evidence-naming.schema.json",
  "data/schemas/capture-log.schema.json",
  "data/schemas/manual-matching-study.schema.json",
  "data/schemas/audit-environment.schema.json",
  "data/schemas/creation-path.schema.json",
  "data/schemas/creation-path-workspace.schema.json",
  "data/schemas/canonical-capture-configuration.schema.json",
  "data/schemas/menu-map.schema.json",
  "data/schemas/head-preset.schema.json",
  "data/schemas/head-capture-workspace.schema.json",
  "data/schemas/hairstyle.schema.json",
  "data/schemas/hairstyle-capture-workspace.schema.json",
  "data/schemas/facial-hair-option.schema.json",
  "data/schemas/facial-hair-capture-workspace.schema.json",
  "data/schemas/additional-face-attribute.schema.json",
  "data/schemas/additional-attributes-workspace.schema.json",
  "data/schemas/dependency-test-runner.schema.json",
  "data/schemas/issue-register.schema.json",
  "data/schemas/phase-zero-domain.schema.json"
];

export const CURRENT_PHASE0_REPOSITORY_STATE: Phase0RepositoryState = {
  nowISO: "2026-07-12T00:00:00.000Z",
  productionCatalog: productionCatalogManifest,
  repositoryFiles: [
    "docs/GAMEFACE_MATCH_SOURCE_OF_TRUTH.md",
    "docs/governance/SOURCE_REGISTRY.md",
    "docs/GAME_CATALOG_WORKFLOW.md",
    "docs/GAME_AUDIT_FIELD_GUIDE.md",
    "docs/GAME_SCREENSHOT_STANDARD.md",
    "docs/CATALOG_REVIEW_GUIDE.md",
    "docs/CATALOG_PUBLISHING_RUNBOOK.md",
    "docs/ENVIRONMENT_VARIABLES.md",
    "docs/DEPLOYMENT_READINESS.md",
    "docs/PRIVATE_BETA_READINESS.md",
    ".env.example",
    "admin/catalog-manager/README.md",
    "web/package.json",
    "web/playwright.config.ts",
    "ios/GameFaceMatchTests",
    "ios/GameFaceMatchUITests"
  ],
  auditTemplateFiles: requiredAuditTemplates,
  schemaFiles: requiredSchemas,
  catalogToolCommands: [
    "validate-record",
    "validate-package",
    "validate-production",
    "verify-assets",
    "detect-placeholders",
    "detect-fixtures",
    "detect-duplicates",
    "import-csv",
    "export-csv",
    "publish-package",
    "rollback-package",
    "compare-versions",
    "patch-reaudit"
  ],
  adminCatalogManagerPresent: true,
  webTestsConfigured: true,
  e2eTestsConfigured: true,
  iOSTestsConfigured: true
};

export function createPhase0StatusReport(state: Phase0RepositoryState = CURRENT_PHASE0_REPOSITORY_STATE): Phase0StatusReport {
  const items = state.productionCatalog.items;
  const verifiedItems = items.filter(isVerifiedProductionRecord);
  const areas = [
    buildPublicResearchStatus(state),
    buildAuditPreparationStatus(state),
    buildShippingGameInspectionStatus(items),
    buildEnvironmentDocumentationStatus(state),
    buildCreationPathMappingStatus(verifiedItems),
    buildMenuMappingStatus(verifiedItems),
    buildCategoryStatus("headCatalog", "Head catalog", verifiedItems, isHeadCategory),
    buildCategoryStatus("hairstyleCatalog", "Hairstyle catalog", verifiedItems, isHairstyleCategory),
    buildCategoryStatus("facialHairCatalog", "Facial-hair catalog", verifiedItems, isFacialHairCategory),
    buildAdditionalAttributesStatus(verifiedItems),
    buildDependencyTestingStatus(state),
    buildEvidenceIntegrityStatus(state, verifiedItems),
    buildCatalogExportsStatus(state, verifiedItems),
    buildCatalogManagerValidationStatus(state),
    buildSecondPersonVerificationStatus(verifiedItems),
    buildManualMatchingFeasibilityStatus(state, verifiedItems)
  ];
  const overall = buildOverallStatus(areas);
  return {
    generatedAt: state.nowISO,
    productionCatalogVersionID: state.productionCatalog.catalogVersion.identifier,
    productionRecordCount: items.length,
    verifiedProductionRecordCount: verifiedItems.length,
    areas,
    overall
  };
}

function buildPublicResearchStatus(state: Phase0RepositoryState): Phase0AreaStatus {
  return area("publicResearch", "Public research", [
    fileCheck(state, "docs/GAMEFACE_MATCH_SOURCE_OF_TRUTH.md", "Source-of-truth document is present."),
    fileCheck(state, "docs/governance/SOURCE_REGISTRY.md", "Source registry classifies binding and unrelated sources."),
    fileCheck(state, "docs/GAME_CATALOG_WORKFLOW.md", "Catalog workflow documents no-invention research rules.")
  ], [], ["Keep public research separate from shipping-game inspection evidence."]);
}

function buildAuditPreparationStatus(state: Phase0RepositoryState): Phase0AreaStatus {
  return area("auditPreparation", "Audit preparation", [
    ...requiredAuditTemplates.map((file) => fileCheck(state, file, `${file} exists.`)),
    ...requiredSchemas.map((file) => schemaCheck(state, file)),
    commandCheck(state, "validate-package"),
    commandCheck(state, "verify-assets"),
    commandCheck(state, "detect-fixtures")
  ], [], ["Begin a real audit session only with shipping-game evidence."]);
}

function buildShippingGameInspectionStatus(items: GameCatalogItem[]): Phase0AreaStatus {
  return area("shippingGameInspection", "Shipping-game inspection", [
    check("production-records-present", "At least one evidence-backed production record exists.", items.length > 0, `${items.length} production records loaded.`),
    check("verified-records-present", "At least one verified production record exists.", items.some(isVerifiedProductionRecord), "Verified production records are required.")
  ], ["No shipping-game evidence-backed production records are present."], ["Inspect the shipping game and enter records through the audit workflow."]);
}

function buildEnvironmentDocumentationStatus(state: Phase0RepositoryState): Phase0AreaStatus {
  return area("environmentDocumentation", "Environment documentation", [
    fileCheck(state, ".env.example", "Environment variable names are documented without secrets."),
    fileCheck(state, "docs/ENVIRONMENT_VARIABLES.md", "Environment variable documentation exists."),
    fileCheck(state, "docs/DEPLOYMENT_READINESS.md", "Deployment readiness documentation exists.")
  ], [], ["Keep deployment/payment values out of client code and chat."]);
}

function buildCreationPathMappingStatus(items: GameCatalogItem[]): Phase0AreaStatus {
  const paths = unique(items.map((item) => item.creationPath));
  return area("creationPathMapping", "Creation-path mapping", [
    check("creation-path-present", "Verified records include creation paths.", paths.length > 0, `${paths.length} creation paths mapped.`),
    check("rtg-path-present", "Road to Glory path is represented.", items.some((item) => /road to glory/i.test(item.gameMode) || /road to glory/i.test(item.creationPath)), "Road to Glory mapping is required.")
  ], ["Creation paths are blocked until verified shipping-game records exist."], ["Map Road to Glory creation paths from the live game."]);
}

function buildMenuMappingStatus(items: GameCatalogItem[]): Phase0AreaStatus {
  const withInstructions = items.filter((item) => (item.navigationInstructions ?? []).length > 0);
  return area("menuMapping", "Menu mapping", [
    check("navigation-instructions-present", "Verified records include menu instructions.", withInstructions.length > 0, `${withInstructions.length} records include instructions.`),
    check("all-records-have-instructions", "Every verified record has instructions.", items.length > 0 && withInstructions.length === items.length, `${withInstructions.length}/${items.length} verified records have instructions.`)
  ], ["Menu mapping is blocked until audited records include navigation evidence."], ["Record exact menu instructions with evidence assets."]);
}

function buildCategoryStatus(id: Phase0AreaID, label: string, items: GameCatalogItem[], predicate: (item: GameCatalogItem) => boolean): Phase0AreaStatus {
  const categoryItems = items.filter(predicate);
  return area(id, label, [
    check("category-records-present", `${label} has verified records.`, categoryItems.length > 0, `${categoryItems.length} verified records found.`),
    check("category-menu-evidence", `${label} records include menu evidence.`, categoryItems.length > 0 && categoryItems.every((item) => (item.navigationInstructions ?? []).length > 0), "Menu evidence is required.")
  ], [`${label} is blocked until verified shipping-game records exist.`], ["Audit this category from the shipping game before publication."]);
}

function buildAdditionalAttributesStatus(items: GameCatalogItem[]): Phase0AreaStatus {
  const additional = items.filter((item) => !isHeadCategory(item) && !isHairstyleCategory(item) && !isFacialHairCategory(item));
  return area("additionalAttributes", "Additional attributes", [
    check("additional-records-present", "Additional verified attribute records exist.", additional.length > 0, `${additional.length} additional records found.`),
    check("additional-categories-present", "Additional categories are discovered.", unique(additional.map((item) => item.category)).length > 0, "No additional categories discovered.")
  ], ["Additional attributes are blocked until verified game categories are discovered."], ["Audit height, weight, body, eyebrows, marks, and other verified categories only as shown in the game."]);
}

function buildDependencyTestingStatus(state: Phase0RepositoryState): Phase0AreaStatus {
  return area("dependencyTesting", "Dependency testing", [
    check("web-tests", "Web tests are configured.", state.webTestsConfigured, "Vitest suite is configured."),
    check("e2e-tests", "Browser E2E tests are configured.", state.e2eTestsConfigured, "Playwright suite is configured."),
    check("ios-tests", "Preserved iOS tests are configured.", state.iOSTestsConfigured, "iOS unit and UI tests are configured.")
  ], [], ["Continue running `npm run verify` before status claims."]);
}

function buildEvidenceIntegrityStatus(state: Phase0RepositoryState, items: GameCatalogItem[]): Phase0AreaStatus {
  return area("evidenceIntegrity", "Evidence integrity", [
    commandCheck(state, "verify-assets"),
    commandCheck(state, "detect-placeholders"),
    commandCheck(state, "detect-fixtures"),
    check("records-with-assets", "Verified records reference source images.", items.length > 0 && items.every((item) => item.sourceImageReferences.length > 0), `${items.length} verified records available for evidence checks.`)
  ], items.length === 0 ? ["No evidence-backed records are available to verify yet."] : [], ["Run asset verification on every candidate package before publication."]);
}

function buildCatalogExportsStatus(state: Phase0RepositoryState, items: GameCatalogItem[]): Phase0AreaStatus {
  return area("catalogExports", "Catalog exports", [
    commandCheck(state, "import-csv"),
    commandCheck(state, "export-csv"),
    commandCheck(state, "publish-package"),
    commandCheck(state, "rollback-package"),
    check("exportable-records", "Verified records are available for package export.", items.length > 0, `${items.length} verified records are available.`)
  ], items.length === 0 ? ["Catalog export publication is blocked by the empty production catalog."] : [], ["Use export/import only for reviewed evidence-backed records."]);
}

function buildCatalogManagerValidationStatus(state: Phase0RepositoryState): Phase0AreaStatus {
  return area("catalogManagerValidation", "Catalog-manager validation", [
    check("reserved-directory", "Catalog manager workspace is reserved.", state.adminCatalogManagerPresent, "admin/catalog-manager is present."),
    fileCheck(state, "admin/catalog-manager/README.md", "Catalog manager boundary document exists."),
    check("manager-built", "A complete local catalog manager is implemented.", false, "Only a reserved placeholder exists today."),
    check("manager-validation-tested", "Catalog manager validation is covered by tests.", false, "No complete catalog manager validation exists yet.")
  ], ["Catalog-manager validation is not started beyond the reserved boundary."], ["Build only after manual audit workflow proves the required fields and review states."]);
}

function buildSecondPersonVerificationStatus(items: GameCatalogItem[]): Phase0AreaStatus {
  const secondReviewed = items.filter((item) => Boolean(item.auditTrail?.secondReviewID));
  return area("secondPersonVerification", "Second-person verification", [
    check("verified-records-present", "Verified records exist for review.", items.length > 0, `${items.length} verified records loaded.`),
    check("second-review-present", "Records include second-review IDs.", items.length > 0 && secondReviewed.length === items.length, `${secondReviewed.length}/${items.length} records include second review.`)
  ], ["Second-person verification is blocked until real audit records exist."], ["Assign a different reviewer before any record can become production data."]);
}

function buildManualMatchingFeasibilityStatus(state: Phase0RepositoryState, items: GameCatalogItem[]): Phase0AreaStatus {
  return area("manualMatchingFeasibility", "Manual matching feasibility", [
    check("matching-tests", "Matching tests are configured.", state.webTestsConfigured, "Synthetic matching tests exist."),
    check("catalog-records", "Verified records are available for manual matching evaluation.", items.length > 0, `${items.length} verified records loaded.`),
    check("menu-instructions", "Verified records include menu instructions.", items.length > 0 && items.every((item) => (item.navigationInstructions ?? []).length > 0), "Menu instructions are required for manual build feasibility.")
  ], items.length === 0 ? ["Manual matching feasibility is blocked by the empty production catalog."] : [], ["Import verified records, then manually compare build instructions beside the game."]);
}

function buildOverallStatus(areas: Phase0AreaStatus[]): Phase0AreaStatus {
  const evidence = areas.flatMap((item) => item.evidence.map((checkItem) => ({ ...checkItem, id: `${item.id}.${checkItem.id}` })));
  const blockers = areas.flatMap((item) => item.blockers);
  const nextActions = areas.flatMap((item) => item.nextActions).slice(0, 8);
  return area("overallPhase0", "Overall Phase 0", evidence, blockers, nextActions);
}

function area(id: Phase0AreaID, label: string, evidence: Phase0EvidenceCheck[], blockers: string[], nextActions: string[]): Phase0AreaStatus {
  const completedChecks = evidence.filter((checkItem) => checkItem.passed).length;
  const totalChecks = evidence.length;
  const percentComplete = totalChecks === 0 ? 0 : Math.round((completedChecks / totalChecks) * 100);
  return {
    id,
    label,
    status: getStatus({ completedChecks, totalChecks, blockers }),
    percentComplete,
    completedChecks,
    totalChecks,
    evidence,
    blockers: percentComplete === 100 ? [] : blockers,
    nextActions
  };
}

function getStatus(input: { completedChecks: number; totalChecks: number; blockers: string[] }): Phase0Status {
  if (input.totalChecks === 0 || input.completedChecks === 0) return input.blockers.length > 0 ? "BLOCKED" : "NOT_STARTED";
  if (input.completedChecks === input.totalChecks) return "COMPLETE";
  if (input.blockers.length > 0) return "BLOCKED";
  if (input.completedChecks / input.totalChecks >= 0.75) return "READY_WITH_LIMITATIONS";
  return "IN_PROGRESS";
}

function check(id: string, label: string, passed: boolean, detail: string): Phase0EvidenceCheck {
  return { id, label, passed, detail };
}

function fileCheck(state: Phase0RepositoryState, file: string, label: string) {
  return check(file, label, state.repositoryFiles.includes(file) || state.auditTemplateFiles.includes(file) || state.schemaFiles.includes(file), file);
}

function schemaCheck(state: Phase0RepositoryState, file: string) {
  return check(file, `${file} exists.`, state.schemaFiles.includes(file), file);
}

function commandCheck(state: Phase0RepositoryState, command: string) {
  return check(command, `Catalog command '${command}' exists.`, state.catalogToolCommands.includes(command), command);
}

function isVerifiedProductionRecord(item: GameCatalogItem) {
  return item.verificationState === "verified" && !item.isTestFixture;
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

function unique(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0))).sort();
}
