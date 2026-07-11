declare module "../../scripts/catalog-tools.mjs" {
  export const requiredAngles: string[];
  export function validateRecord(record: unknown, options?: Record<string, unknown>): { ok: boolean; errors: Array<{ code: string; message: string }>; warnings: string[] };
  export function validateManifest(manifest: unknown, options?: Record<string, unknown>): { ok: boolean; errors: Array<{ code: string; message: string }>; warnings: string[] };
  export function validatePackage(catalogPackage: unknown, options?: Record<string, unknown>): { ok: boolean; errors: Array<{ code: string; message: string }>; warnings: string[]; checksum?: string };
  export function validateProductionDirectory(directoryPath: string): { ok: boolean; errors: Array<{ code: string; message: string }>; warnings: string[] };
  export function detectDuplicateIDsInManifest(manifest: unknown): { ok: boolean; errors: Array<{ code: string; message: string }>; warnings: string[] };
  export function detectPlaceholdersInPath(targetPath: string): { ok: boolean; errors: Array<{ code: string; message: string }>; warnings: string[] };
  export function detectFixtureLeakageInPath(targetPath: string): { ok: boolean; errors: Array<{ code: string; message: string }>; warnings: string[] };
  export function calculateDeterministicChecksum(value: unknown): string;
  export function formatReport(report: { ok: boolean; scope: string; errors: Array<{ code: string; message: string }>; warnings: string[]; checksum?: string }): string;
}
