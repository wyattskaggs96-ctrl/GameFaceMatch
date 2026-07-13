declare module "../../scripts/catalog-tools.mjs" {
  export const requiredAngles: string[];
  export const screenshotNamePattern: RegExp;
  export function validateRecord(record: unknown, options?: Record<string, unknown>): { ok: boolean; errors: Array<{ code: string; message: string }>; warnings: string[] };
  export function validateAuditRecord(record: unknown, options?: Record<string, unknown>): { ok: boolean; errors: Array<{ code: string; message: string }>; warnings: string[]; nextActions?: string[]; progress?: Record<string, unknown> };
  export function validateManifest(manifest: unknown, options?: Record<string, unknown>): { ok: boolean; errors: Array<{ code: string; message: string }>; warnings: string[] };
  export function validatePackage(catalogPackage: unknown, options?: Record<string, unknown>): { ok: boolean; errors: Array<{ code: string; message: string }>; warnings: string[]; checksum?: string };
  export function validateProductionDirectory(directoryPath: string): { ok: boolean; errors: Array<{ code: string; message: string }>; warnings: string[] };
  export function detectDuplicateIDsInManifest(manifest: unknown): { ok: boolean; errors: Array<{ code: string; message: string }>; warnings: string[] };
  export function detectPlaceholdersInPath(targetPath: string): { ok: boolean; errors: Array<{ code: string; message: string }>; warnings: string[] };
  export function detectFixtureLeakageInPath(targetPath: string): { ok: boolean; errors: Array<{ code: string; message: string }>; warnings: string[] };
  export function calculateDeterministicChecksum(value: unknown): string;
  export function createAuditSession(input?: Record<string, unknown>): Record<string, unknown>;
  export function importCatalogItemsFromCsv(csvText: string, defaults?: Record<string, unknown>): unknown[];
  export function exportCatalogItemsToCsv(items: unknown[]): string;
  export function compareCatalogVersions(previousManifest: unknown, nextManifest: unknown): Record<string, unknown> & {
    added: string[];
    removed: string[];
    reorderedOptions: string[];
    retiredOptions: string[];
    menuCountChanges: Array<Record<string, unknown>>;
    firstMiddleFinalChanges: Array<Record<string, unknown>>;
    changedLabels: Array<Record<string, unknown>>;
    changedEvidenceHashes: Array<Record<string, unknown>>;
    changedVisualAssets: Array<Record<string, unknown>>;
    dependencyChanges: Array<Record<string, unknown>>;
    environmentChanges: Array<Record<string, unknown>>;
    affectedRecords: Array<Record<string, unknown>>;
    requiredReverification: Array<{ requiredAction: string }>;
    recommendedRecaptureQueue: Array<Record<string, unknown>>;
    suggestedSemanticCatalogVersion: string;
    humanReadableReport: string;
  };
  export function createPatchReauditPlan(previousManifest: unknown, nextGameVersion: string): Record<string, unknown>;
  export function publishPackage(catalogPackage: unknown): { ok: boolean; report: { ok: boolean; scope: string; errors: Array<{ code: string; message: string }>; warnings: string[]; checksum?: string }; manifest: unknown };
  export function rollbackPackage(currentManifest: unknown, targetManifest: unknown, reason?: string): Record<string, unknown>;
  export function formatReport(report: { ok: boolean; scope: string; errors: Array<{ code: string; message: string }>; warnings: string[]; checksum?: string }): string;
}
