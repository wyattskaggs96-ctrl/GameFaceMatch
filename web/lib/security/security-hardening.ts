export const SECURITY_HARDENING_VERSION = "security-hardening-v1";

const dangerousSpreadsheetPrefixPattern = /^[\t\r\n=+\-@]/;
const urlSchemePattern = /^[a-z][a-z0-9+.-]*:/i;
const windowsDrivePattern = /^[A-Za-z]:[\\/]/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;
const encodedTraversalPattern = /(?:%2e|%2f|%5c)/i;

export interface SafeJSONParseResult<T> {
  ok: boolean;
  value: T;
  error?: "missing" | "oversized" | "malformed";
}

export interface SecurityValidationResult {
  ok: boolean;
  errors: string[];
}

export function sanitizeCSVCellForExport(value: unknown): string {
  const text = String(value);
  return dangerousSpreadsheetPrefixPattern.test(text) ? `'${text}` : text;
}

export function isSafeUploadFileName(fileName: string, options: { allowedExtensions: string[]; maxLength?: number }): boolean {
  const trimmed = fileName.trim();
  if (trimmed.length === 0 || trimmed.length > (options.maxLength ?? 180)) return false;
  if (trimmed === "." || trimmed === "..") return false;
  if (controlCharacterPattern.test(trimmed)) return false;
  if (trimmed.includes("/") || trimmed.includes("\\")) return false;
  if (encodedTraversalPattern.test(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  return options.allowedExtensions.some((extension) => lower.endsWith(extension.toLowerCase()));
}

export function isSafeRepositoryRelativePath(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (controlCharacterPattern.test(trimmed)) return false;
  if (encodedTraversalPattern.test(trimmed)) return false;
  if (trimmed.startsWith("/") || trimmed.startsWith("\\")) return false;
  if (urlSchemePattern.test(trimmed) || windowsDrivePattern.test(trimmed)) return false;
  const normalized = trimmed.replaceAll("\\", "/");
  const segments = normalized.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

export function parseLocalStorageJSON<T>(raw: string | null, fallback: T, maxBytes = 256 * 1024): SafeJSONParseResult<T> {
  if (raw === null) return { ok: true, value: fallback, error: "missing" };
  if (new TextEncoder().encode(raw).byteLength > maxBytes) return { ok: false, value: fallback, error: "oversized" };
  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch {
    return { ok: false, value: fallback, error: "malformed" };
  }
}

export function validateUntrustedMetadata(input: Record<string, unknown>, allowedKeys: readonly string[], maxStringLength = 240): SecurityValidationResult {
  const errors: string[] = [];
  const allowed = new Set(allowedKeys);
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.has(key)) errors.push(`Metadata key '${key}' is not allowed.`);
    if (controlCharacterPattern.test(key)) errors.push(`Metadata key '${key}' contains control characters.`);
    if (!isSafeMetadataValue(value, maxStringLength)) errors.push(`Metadata value for '${key}' is not safe.`);
  }
  return { ok: errors.length === 0, errors };
}

function isSafeMetadataValue(value: unknown, maxStringLength: number): boolean {
  if (value === null || value === undefined || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string") return false;
  if (value.length > maxStringLength) return false;
  return !controlCharacterPattern.test(value);
}
