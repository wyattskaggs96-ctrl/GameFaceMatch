import { verifyManifestIntegrity } from "@/lib/catalog/catalog-integrity";
import type {
  CatalogReleaseChange,
  CatalogReleaseLifecycleStatus,
  CatalogReleaseNotes,
  GameCatalogManifest,
  GameCatalogVersion
} from "@/types/domain";

export const immutableCatalogReleasePolicyVersion = "immutable-catalog-release-v1";

export interface CatalogReleaseRecord {
  catalogVersionID: string;
  status: CatalogReleaseLifecycleStatus;
  manifest: GameCatalogManifest;
  manifestChecksum: string;
  releaseNotes: CatalogReleaseNotes;
  createdAt: string;
  approvedAt: string | null;
  supersededAt: string | null;
  rejectedAt: string | null;
  previousCatalogVersionID: string | null;
}

export interface CatalogReleaseRegistry {
  policyVersion: typeof immutableCatalogReleasePolicyVersion;
  activeCatalogVersionID: string | null;
  releases: CatalogReleaseRecord[];
}

export interface ReleaseValidationIssue {
  code: string;
  message: string;
  catalogVersionID?: string;
}

export interface ReleaseValidationReport {
  ok: boolean;
  errors: ReleaseValidationIssue[];
  warnings: ReleaseValidationIssue[];
}

export class ImmutableCatalogReleaseError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ImmutableCatalogReleaseError";
  }
}

const immutableStatuses = new Set<CatalogReleaseLifecycleStatus>(["approvedRelease", "supersededRelease"]);
const allowedTransitions: Record<CatalogReleaseLifecycleStatus, CatalogReleaseLifecycleStatus[]> = {
  draft: ["reviewCandidate", "rejectedRelease"],
  reviewCandidate: ["verificationCandidate", "draft", "rejectedRelease"],
  verificationCandidate: ["approvedRelease", "reviewCandidate", "rejectedRelease"],
  approvedRelease: ["supersededRelease"],
  supersededRelease: [],
  rejectedRelease: []
};

export function createEmptyCatalogReleaseRegistry(): CatalogReleaseRegistry {
  return {
    policyVersion: immutableCatalogReleasePolicyVersion,
    activeCatalogVersionID: null,
    releases: []
  };
}

export async function createCatalogReleaseRecord(input: {
  manifest: GameCatalogManifest;
  status: CatalogReleaseLifecycleStatus;
  releaseNotes: CatalogReleaseNotes;
  createdAt: string;
  previousCatalogVersionID?: string | null;
}): Promise<CatalogReleaseRecord> {
  const manifest = await attachReleaseChecksum({
    ...input.manifest,
    releaseStatus: input.status,
    releaseNotes: input.releaseNotes,
    previousCatalogVersionID: input.previousCatalogVersionID ?? input.manifest.previousCatalogVersionID ?? null
  });
  return {
    catalogVersionID: manifest.catalogVersion.identifier,
    status: input.status,
    manifest,
    manifestChecksum: manifest.packageChecksum ?? "",
    releaseNotes: input.releaseNotes,
    createdAt: input.createdAt,
    approvedAt: input.status === "approvedRelease" ? input.createdAt : null,
    supersededAt: input.status === "supersededRelease" ? input.createdAt : null,
    rejectedAt: input.status === "rejectedRelease" ? input.createdAt : null,
    previousCatalogVersionID: input.previousCatalogVersionID ?? manifest.previousCatalogVersionID ?? null
  };
}

export function addCatalogRelease(registry: CatalogReleaseRegistry, release: CatalogReleaseRecord): CatalogReleaseRegistry {
  if (registry.releases.some((candidate) => candidate.catalogVersionID === release.catalogVersionID)) {
    throw new ImmutableCatalogReleaseError("duplicateReleaseVersion", `${release.catalogVersionID} already exists in the catalog release registry.`);
  }
  return withActiveRelease({
    ...registry,
    releases: [...registry.releases, cloneRelease(release)]
  });
}

export async function transitionCatalogRelease(input: {
  registry: CatalogReleaseRegistry;
  catalogVersionID: string;
  toStatus: CatalogReleaseLifecycleStatus;
  changedAt: string;
  releaseNotes?: CatalogReleaseNotes;
}): Promise<CatalogReleaseRegistry> {
  const release = getReleaseOrThrow(input.registry, input.catalogVersionID);
  if (immutableStatuses.has(release.status) && input.toStatus !== "supersededRelease") {
    throw new ImmutableCatalogReleaseError("immutablePublishedRelease", `${release.catalogVersionID} is immutable after approval. Create a corrected release instead.`);
  }
  if (!allowedTransitions[release.status].includes(input.toStatus)) {
    throw new ImmutableCatalogReleaseError("invalidReleaseTransition", `Cannot transition ${release.catalogVersionID} from ${release.status} to ${input.toStatus}.`);
  }
  const updatedRelease = await createCatalogReleaseRecord({
    manifest: {
      ...release.manifest,
      releaseNotes: input.releaseNotes ?? release.releaseNotes,
      releaseStatus: input.toStatus
    },
    status: input.toStatus,
    releaseNotes: input.releaseNotes ?? release.releaseNotes,
    createdAt: release.createdAt,
    previousCatalogVersionID: release.previousCatalogVersionID
  });
  updatedRelease.approvedAt = input.toStatus === "approvedRelease" ? input.changedAt : release.approvedAt;
  updatedRelease.supersededAt = input.toStatus === "supersededRelease" ? input.changedAt : release.supersededAt;
  updatedRelease.rejectedAt = input.toStatus === "rejectedRelease" ? input.changedAt : release.rejectedAt;
  return withActiveRelease({
    ...input.registry,
    releases: input.registry.releases.map((candidate) =>
      candidate.catalogVersionID === input.catalogVersionID ? updatedRelease : cloneRelease(candidate)
    )
  });
}

export async function createCorrectedCatalogRelease(input: {
  registry: CatalogReleaseRegistry;
  previousCatalogVersionID: string;
  correctedManifest: GameCatalogManifest;
  releaseNotes: CatalogReleaseNotes;
  createdAt: string;
}): Promise<CatalogReleaseRegistry> {
  const previousRelease = getReleaseOrThrow(input.registry, input.previousCatalogVersionID);
  if (!immutableStatuses.has(previousRelease.status)) {
    throw new ImmutableCatalogReleaseError("previousReleaseNotImmutable", `${previousRelease.catalogVersionID} is not an approved or superseded release.`);
  }
  if (input.correctedManifest.catalogVersion.identifier === previousRelease.catalogVersionID) {
    throw new ImmutableCatalogReleaseError("correctionMustUseNewVersion", "Corrections to published catalogs must create a new catalog version.");
  }
  const correctedRelease = await createCatalogReleaseRecord({
    manifest: {
      ...input.correctedManifest,
      previousCatalogVersionID: previousRelease.catalogVersionID
    },
    status: "verificationCandidate",
    releaseNotes: input.releaseNotes,
    createdAt: input.createdAt,
    previousCatalogVersionID: previousRelease.catalogVersionID
  });
  return addCatalogRelease(input.registry, correctedRelease);
}

export function getHistoricalCatalogRelease(registry: CatalogReleaseRegistry, catalogVersionID: string): CatalogReleaseRecord | null {
  const release = registry.releases.find((candidate) => candidate.catalogVersionID === catalogVersionID);
  return release ? cloneRelease(release) : null;
}

export function getCatalogVersionForRecommendation(match: { catalogVersion: GameCatalogVersion }, registry: CatalogReleaseRegistry): CatalogReleaseRecord | null {
  return getHistoricalCatalogRelease(registry, match.catalogVersion.identifier);
}

export function validateCatalogReleaseRegistry(registry: CatalogReleaseRegistry): ReleaseValidationReport {
  const errors: ReleaseValidationIssue[] = [];
  const warnings: ReleaseValidationIssue[] = [];
  if (registry.policyVersion !== immutableCatalogReleasePolicyVersion) {
    errors.push(issue("invalidPolicyVersion", `Expected ${immutableCatalogReleasePolicyVersion}.`));
  }
  const seen = new Set<string>();
  for (const release of registry.releases) {
    if (seen.has(release.catalogVersionID)) errors.push(issue("duplicateReleaseVersion", `${release.catalogVersionID} appears more than once.`, release.catalogVersionID));
    seen.add(release.catalogVersionID);
    validateRelease(release, errors, warnings);
  }
  if (registry.activeCatalogVersionID && !registry.releases.some((release) => release.catalogVersionID === registry.activeCatalogVersionID && release.status === "approvedRelease")) {
    errors.push(issue("invalidActiveRelease", "Active catalog version must point to an approved release.", registry.activeCatalogVersionID));
  }
  return { ok: errors.length === 0, errors, warnings };
}

export async function verifyCatalogReleaseRecordIntegrity(release: CatalogReleaseRecord): Promise<ReleaseValidationReport> {
  const errors: ReleaseValidationIssue[] = [];
  const warnings: ReleaseValidationIssue[] = [];
  validateRelease(release, errors, warnings);
  const integrity = await verifyManifestIntegrity(release.manifest);
  if (!integrity.ok || integrity.actualChecksum !== release.manifestChecksum) {
    errors.push(issue("immutableReleaseModified", `${release.catalogVersionID} manifest no longer matches its immutable release checksum.`, release.catalogVersionID));
  }
  return { ok: errors.length === 0, errors, warnings };
}

export async function validateCatalogReleaseRegistryIntegrity(registry: CatalogReleaseRegistry): Promise<ReleaseValidationReport> {
  const baseReport = validateCatalogReleaseRegistry(registry);
  const errors = [...baseReport.errors];
  const warnings = [...baseReport.warnings];
  for (const release of registry.releases) {
    const report = await verifyCatalogReleaseRecordIntegrity(release);
    errors.push(...report.errors);
    warnings.push(...report.warnings);
  }
  return { ok: errors.length === 0, errors, warnings };
}

export async function attachReleaseChecksum(manifest: GameCatalogManifest): Promise<GameCatalogManifest> {
  const checksum = await verifyManifestIntegrity({ ...manifest, packageChecksum: undefined });
  return { ...manifest, packageChecksum: checksum.actualChecksum };
}

function validateRelease(release: CatalogReleaseRecord, errors: ReleaseValidationIssue[], warnings: ReleaseValidationIssue[]) {
  if (release.catalogVersionID !== release.manifest.catalogVersion.identifier) {
    errors.push(issue("releaseManifestVersionMismatch", `${release.catalogVersionID} does not match manifest version.`, release.catalogVersionID));
  }
  if (release.status !== release.manifest.releaseStatus) {
    errors.push(issue("releaseStatusMismatch", `${release.catalogVersionID} status does not match manifest releaseStatus.`, release.catalogVersionID));
  }
  if (!release.manifestChecksum || release.manifestChecksum !== release.manifest.packageChecksum) {
    errors.push(issue("releaseChecksumMismatch", `${release.catalogVersionID} manifest checksum is missing or mismatched.`, release.catalogVersionID));
  }
  if (!release.releaseNotes.summary.trim() || release.releaseNotes.changes.length === 0) {
    errors.push(issue("missingReleaseNotes", `${release.catalogVersionID} requires release notes with changes.`, release.catalogVersionID));
  }
  if ((release.status === "approvedRelease" || release.status === "supersededRelease") && !release.approvedAt) {
    errors.push(issue("missingApprovalTimestamp", `${release.catalogVersionID} requires approvedAt before it can be used for recommendations.`, release.catalogVersionID));
  }
  if (release.status === "supersededRelease" && !release.supersededAt) {
    errors.push(issue("missingSupersededTimestamp", `${release.catalogVersionID} requires supersededAt.`, release.catalogVersionID));
  }
  if (release.status === "rejectedRelease" && !release.rejectedAt) {
    errors.push(issue("missingRejectedTimestamp", `${release.catalogVersionID} requires rejectedAt.`, release.catalogVersionID));
  }
  if (release.status === "draft") {
    warnings.push(issue("draftReleaseNotUserFacing", `${release.catalogVersionID} is a draft and cannot enable recommendations.`, release.catalogVersionID));
  }
}

function getReleaseOrThrow(registry: CatalogReleaseRegistry, catalogVersionID: string) {
  const release = registry.releases.find((candidate) => candidate.catalogVersionID === catalogVersionID);
  if (!release) throw new ImmutableCatalogReleaseError("releaseNotFound", `${catalogVersionID} is not in the catalog release registry.`);
  return release;
}

function withActiveRelease(registry: CatalogReleaseRegistry): CatalogReleaseRegistry {
  const activeRelease = registry.releases.find((release) => release.status === "approvedRelease") ?? null;
  return {
    ...registry,
    activeCatalogVersionID: activeRelease?.catalogVersionID ?? null,
    releases: registry.releases.map(cloneRelease)
  };
}

function cloneRelease(release: CatalogReleaseRecord): CatalogReleaseRecord {
  return JSON.parse(JSON.stringify(release)) as CatalogReleaseRecord;
}

function issue(code: string, message: string, catalogVersionID?: string): ReleaseValidationIssue {
  return { code, message, catalogVersionID };
}
