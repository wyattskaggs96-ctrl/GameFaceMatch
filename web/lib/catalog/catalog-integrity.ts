import type { GameCatalogManifest } from "@/types/domain";

export type CatalogIntegrityState = "verified" | "emptyCatalogUnsigned" | "missingChecksum" | "checksumMismatch";
export type CatalogStalenessState = "current" | "stale" | "unverified" | "unknown";

export interface CatalogIntegrityReport {
  state: CatalogIntegrityState;
  expectedChecksum: string | null;
  actualChecksum: string;
  ok: boolean;
  message: string;
}

export interface CatalogCompatibilityReport {
  compatible: boolean;
  platform: string;
  gameVersion: string;
  patchVersion: string | null;
  supportedPlatforms: string[];
  supportedGameVersions: string[];
  message: string;
}

export interface CatalogStalenessReport {
  state: CatalogStalenessState;
  verifiedAt: string | null;
  daysSinceVerification: number | null;
  staleAfterDays: number;
  message: string;
}

export interface CatalogRuntimeErrorRecord {
  code: string;
  message: string;
  catalogVersionID: string;
  recordedAt: string;
}

const checksumKeys = new Set(["packageChecksum", "sourcePackageChecksum"]);

export async function verifyManifestIntegrity(manifest: GameCatalogManifest): Promise<CatalogIntegrityReport> {
  const actualChecksum = await sha256(stableStringify(stripChecksumFields(manifest)));
  const expectedChecksum = manifest.packageChecksum?.trim() || null;
  if (manifest.items.length === 0 && !expectedChecksum) {
    return {
      state: "emptyCatalogUnsigned",
      expectedChecksum,
      actualChecksum,
      ok: true,
      message: "Empty production catalog has no package checksum. Runtime remains fail-closed."
    };
  }
  if (!expectedChecksum) {
    return {
      state: "missingChecksum",
      expectedChecksum,
      actualChecksum,
      ok: false,
      message: "Non-empty production catalog is missing packageChecksum."
    };
  }
  if (expectedChecksum !== actualChecksum) {
    return {
      state: "checksumMismatch",
      expectedChecksum,
      actualChecksum,
      ok: false,
      message: "Production catalog packageChecksum does not match runtime deterministic checksum."
    };
  }
  return {
    state: "verified",
    expectedChecksum,
    actualChecksum,
    ok: true,
    message: "Production catalog checksum verified."
  };
}

export function checkCatalogCompatibility(
  manifest: GameCatalogManifest,
  input: {
    supportedPlatforms?: string[];
    supportedGameVersions?: string[];
  } = {}
): CatalogCompatibilityReport {
  const platforms = Array.from(new Set(manifest.items.map((item) => item.platform).filter(Boolean))).sort();
  const gameVersions = Array.from(new Set(manifest.items.map((item) => item.gameVersion).filter(Boolean))).sort();
  const patchVersions = Array.from(new Set(manifest.items.map((item) => item.patchVersion).filter(Boolean))) as string[];
  const supportedPlatforms = input.supportedPlatforms ?? platforms;
  const supportedGameVersions = input.supportedGameVersions ?? gameVersions;
  if (manifest.items.length === 0) {
    return {
      compatible: true,
      platform: manifest.catalogVersion.platform,
      gameVersion: manifest.catalogVersion.gameVersion,
      patchVersion: patchVersions[0] ?? null,
      supportedPlatforms,
      supportedGameVersions,
      message: "Empty production catalog has no platform or version compatibility requirements."
    };
  }
  const unsupportedPlatform = platforms.find((platform) => !supportedPlatforms.includes(platform));
  const unsupportedVersion = gameVersions.find((version) => !supportedGameVersions.includes(version));
  if (unsupportedPlatform || unsupportedVersion) {
    return {
      compatible: false,
      platform: platforms.join(", "),
      gameVersion: gameVersions.join(", "),
      patchVersion: patchVersions.join(", ") || null,
      supportedPlatforms,
      supportedGameVersions,
      message: "Production catalog contains a platform or game version not supported by this runtime."
    };
  }
  return {
    compatible: true,
    platform: platforms.join(", "),
    gameVersion: gameVersions.join(", "),
    patchVersion: patchVersions.join(", ") || null,
    supportedPlatforms,
    supportedGameVersions,
    message: "Production catalog platform and game version are compatible with this runtime."
  };
}

export function assessCatalogStaleness(manifest: GameCatalogManifest, now = new Date(), staleAfterDays = 45): CatalogStalenessReport {
  const verifiedAt = manifest.catalogVersion.verifiedAt;
  if (!verifiedAt) {
    return {
      state: manifest.items.length === 0 ? "unverified" : "unknown",
      verifiedAt,
      daysSinceVerification: null,
      staleAfterDays,
      message: manifest.items.length === 0 ? "Catalog has no verified records yet." : "Catalog verification date is missing."
    };
  }
  const verifiedTime = Date.parse(verifiedAt);
  if (Number.isNaN(verifiedTime)) {
    return {
      state: "unknown",
      verifiedAt,
      daysSinceVerification: null,
      staleAfterDays,
      message: "Catalog verification date is invalid."
    };
  }
  const daysSinceVerification = Math.floor((now.getTime() - verifiedTime) / 86_400_000);
  const stale = daysSinceVerification > staleAfterDays;
  return {
    state: stale ? "stale" : "current",
    verifiedAt,
    daysSinceVerification,
    staleAfterDays,
    message: stale
      ? `Catalog was verified ${daysSinceVerification} days ago and should be re-audited.`
      : `Catalog was verified ${daysSinceVerification} days ago.`
  };
}

export function createCatalogRuntimeErrorRecord(error: unknown, manifest: GameCatalogManifest, now = new Date()): CatalogRuntimeErrorRecord {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "catalogRuntimeError";
  const message = error instanceof Error ? error.message : "Unknown catalog runtime error.";
  return {
    code,
    message,
    catalogVersionID: manifest.catalogVersion.identifier,
    recordedAt: now.toISOString()
  };
}

async function sha256(text: string) {
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function stripChecksumFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripChecksumFields);
  if (!value || typeof value !== "object") return value;
  const output: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    if (checksumKeys.has(key)) continue;
    output[key] = stripChecksumFields((value as Record<string, unknown>)[key]);
  }
  return output;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
    .join(",")}}`;
}
