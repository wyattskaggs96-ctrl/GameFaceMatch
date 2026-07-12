import {
  PHASE0_DOMAIN_SCHEMA_VERSION,
  validatePhase0AuditEnvironment,
  validatePhase0CreationPath,
  type Phase0AuditEnvironment,
  type Phase0CreationPath,
  type Phase0DomainValidationReport
} from "./phase-zero-domain";
import type { ISODateString } from "@/types/domain";

export const PHASE0_AUDIT_STORE_SCHEMA_VERSION = "phase0-audit-store-v1";
export const PHASE0_AUDIT_STORE_KEY = "gameface-match:phase-zero-audit-store";

export interface Phase0AuditStoreSnapshot {
  schemaVersion: typeof PHASE0_AUDIT_STORE_SCHEMA_VERSION;
  updatedAt: ISODateString;
  auditEnvironments: Phase0AuditEnvironment[];
  creationPaths: Phase0CreationPath[];
}

export interface Phase0AuditStore {
  load(): Phase0AuditStoreSnapshot;
  saveAuditEnvironment(environment: Phase0AuditEnvironment): Phase0DomainValidationReport;
  listAuditEnvironments(): Phase0AuditEnvironment[];
  getAuditEnvironment(id: string): Phase0AuditEnvironment | null;
  deleteAuditEnvironment(id: string): void;
  saveCreationPath(creationPath: Phase0CreationPath): Phase0DomainValidationReport;
  listCreationPaths(): Phase0CreationPath[];
  getCreationPath(id: string): Phase0CreationPath | null;
  deleteCreationPath(id: string): void;
  clear(): void;
}

export function createEmptyPhase0AuditStoreSnapshot(updatedAt: ISODateString): Phase0AuditStoreSnapshot {
  return {
    schemaVersion: PHASE0_AUDIT_STORE_SCHEMA_VERSION,
    updatedAt,
    auditEnvironments: [],
    creationPaths: []
  };
}

export function migratePhase0AuditStoreSnapshot(value: unknown, now: ISODateString): Phase0AuditStoreSnapshot {
  if (!value || typeof value !== "object") return createEmptyPhase0AuditStoreSnapshot(now);
  const candidate = value as Partial<Phase0AuditStoreSnapshot> & { schemaVersion?: string };
  const auditEnvironments = Array.isArray(candidate.auditEnvironments) ? candidate.auditEnvironments.map((environment) => migrateEnvironment(environment, now)) : [];
  const creationPaths = Array.isArray(candidate.creationPaths) ? candidate.creationPaths.map((creationPath) => migrateCreationPath(creationPath, now)) : [];
  return {
    schemaVersion: PHASE0_AUDIT_STORE_SCHEMA_VERSION,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    auditEnvironments,
    creationPaths
  };
}

export function createMemoryPhase0AuditStore(initial?: Phase0AuditStoreSnapshot, now: () => ISODateString = () => new Date().toISOString()): Phase0AuditStore {
  let snapshot = initial ?? createEmptyPhase0AuditStoreSnapshot(now());
  return createStoreAdapter(
    () => snapshot,
    (next) => {
      snapshot = next;
    },
    now
  );
}

export function createBrowserPhase0AuditStore(storage: Storage, key = PHASE0_AUDIT_STORE_KEY, now: () => ISODateString = () => new Date().toISOString()): Phase0AuditStore {
  return createStoreAdapter(
    () => migratePhase0AuditStoreSnapshot(JSON.parse(storage.getItem(key) ?? "null"), now()),
    (next) => {
      storage.setItem(key, JSON.stringify(next));
    },
    now,
    () => storage.removeItem(key)
  );
}

function createStoreAdapter(
  read: () => Phase0AuditStoreSnapshot,
  write: (snapshot: Phase0AuditStoreSnapshot) => void,
  now: () => ISODateString,
  remove?: () => void
): Phase0AuditStore {
  return {
    load() {
      return read();
    },
    saveAuditEnvironment(environment) {
      const report = validatePhase0AuditEnvironment(environment);
      if (!report.ok) return report;
      const snapshot = read();
      write({
        ...snapshot,
        updatedAt: now(),
        auditEnvironments: upsertByID(snapshot.auditEnvironments, environment)
      });
      return report;
    },
    listAuditEnvironments() {
      return read().auditEnvironments;
    },
    getAuditEnvironment(id) {
      return read().auditEnvironments.find((environment) => environment.id === id) ?? null;
    },
    deleteAuditEnvironment(id) {
      const snapshot = read();
      write({
        ...snapshot,
        updatedAt: now(),
        auditEnvironments: snapshot.auditEnvironments.filter((environment) => environment.id !== id)
      });
    },
    saveCreationPath(creationPath) {
      const report = validatePhase0CreationPath(creationPath);
      if (!report.ok) return report;
      const snapshot = read();
      write({
        ...snapshot,
        updatedAt: now(),
        creationPaths: upsertByID(snapshot.creationPaths, creationPath)
      });
      return report;
    },
    listCreationPaths() {
      return read().creationPaths;
    },
    getCreationPath(id) {
      return read().creationPaths.find((creationPath) => creationPath.id === id) ?? null;
    },
    deleteCreationPath(id) {
      const snapshot = read();
      write({
        ...snapshot,
        updatedAt: now(),
        creationPaths: snapshot.creationPaths.filter((creationPath) => creationPath.id !== id)
      });
    },
    clear() {
      if (remove) {
        remove();
      } else {
        write(createEmptyPhase0AuditStoreSnapshot(now()));
      }
    }
  };
}

function upsertByID<T extends { id: string }>(items: T[], next: T) {
  const existing = items.filter((item) => item.id !== next.id);
  return [...existing, next].sort((a, b) => a.id.localeCompare(b.id));
}

function migrateEnvironment(value: unknown, now: ISODateString): Phase0AuditEnvironment {
  const environment = asRecord(value);
  return {
    id: stringOr(environment.id, `environment-${now}`),
    schemaVersion: PHASE0_DOMAIN_SCHEMA_VERSION,
    createdAt: stringOr(environment.createdAt, now),
    updatedAt: stringOr(environment.updatedAt, now),
    kind: enumOr(environment.kind, ["consoleCapture", "browserCapture", "manualReview", "unknown"], "unknown"),
    platformID: stringOr(environment.platformID, "unknown-platform"),
    platformName: stringOr(environment.platformName, stringOr(environment.platform, "unknown")),
    gameVersionID: stringOr(environment.gameVersionID, "unknown-game-version"),
    patchID: stringOr(environment.patchID, "unknown-patch"),
    consoleModel: stringOr(environment.consoleModel, stringOr(environment.consoleDevice, "unknown")),
    consoleOSVersion: stringOr(environment.consoleOSVersion, "unknown"),
    edition: stringOr(environment.edition, "unknown"),
    region: stringOr(environment.region, "unknown"),
    storefront: stringOr(environment.storefront, "unknown"),
    copyType: enumOr(environment.copyType, ["disc", "digital", "subscription", "trial", "unknown"], "unknown"),
    gameExecutableVersion: stringOr(environment.gameExecutableVersion, "unknown"),
    patchLabel: stringOr(environment.patchLabel, stringOr(environment.patchVersion, "unknown")),
    latestUpdateState: enumOr(environment.latestUpdateState, ["latestInstalled", "updateAvailable", "offlineUnknown", "unknown"], "unknown"),
    observedAt: stringOr(environment.observedAt, stringOr(environment.auditDateTime, now)),
    onlineState: enumOr(environment.onlineState, ["online", "offline", "unknown"], enumOr(environment.networkState, ["online", "offline", "unknown"], "unknown")),
    eaAccountState: enumOr(environment.eaAccountState, ["signedIn", "signedOut", "notRequired", "unknown"], "unknown"),
    resolution: stringOr(environment.resolution, "unknown"),
    hdrState: enumOr(environment.hdrState, ["enabled", "disabled", "unsupported", "unknown"], "unknown"),
    displayModel: stringOr(environment.displayModel, stringOr(environment.display, "unknown")),
    captureHardware: stringOr(environment.captureHardware, stringOr(environment.captureDevice, "unknown")),
    captureFormat: stringOr(environment.captureFormat, "unknown"),
    mode: stringOr(environment.mode, stringOr(environment.gameMode, "unknown")),
    exactPath: stringOr(environment.exactPath, stringOr(environment.creationPath, "unknown")),
    position: stringOr(environment.position, "unknown"),
    archetype: stringOr(environment.archetype, "unknown"),
    handedness: enumOr(environment.handedness, ["left", "right", "ambidextrous", "notApplicable", "unknown"], "unknown"),
    height: stringOr(environment.height, "unknown"),
    weight: stringOr(environment.weight, "unknown"),
    bodyType: stringOr(environment.bodyType, "unknown"),
    entitlements: stringArray(environment.entitlements),
    evidenceFileIDs: stringArray(environment.evidenceFileIDs),
    auditorID: stringOr(environment.auditorID, stringOr(environment.auditor, "unknown")),
    consoleDevice: maybeString(environment.consoleDevice),
    display: maybeString(environment.display),
    captureDevice: maybeString(environment.captureDevice),
    lightingDescription: maybeString(environment.lightingDescription),
    networkState: maybeEnum(environment.networkState, ["online", "offline", "unknown"]),
    notes: maybeString(environment.notes)
  };
}

function migrateCreationPath(value: unknown, now: ISODateString): Phase0CreationPath {
  const creationPath = asRecord(value);
  return {
    id: stringOr(creationPath.id, `creation-path-${now}`),
    schemaVersion: PHASE0_DOMAIN_SCHEMA_VERSION,
    createdAt: stringOr(creationPath.createdAt, now),
    updatedAt: stringOr(creationPath.updatedAt, now),
    gameID: stringOr(creationPath.gameID, "unknown-game"),
    gameMode: stringOr(creationPath.gameMode, stringOr(creationPath.mode, "unknown")),
    displayName: stringOr(creationPath.displayName, stringOr(creationPath.name, "unknown")),
    exactPath: stringOr(creationPath.exactPath, stringOr(creationPath.displayName, "unknown")),
    platformIDs: stringArray(creationPath.platformIDs),
    observedPatchIDs: stringArray(creationPath.observedPatchIDs),
    menuItemIDs: stringArray(creationPath.menuItemIDs),
    reproducibleSteps: Array.isArray(creationPath.reproducibleSteps) ? creationPath.reproducibleSteps.map((step, index) => migrateStep(step, index + 1)) : [],
    requirements: Array.isArray(creationPath.requirements) ? creationPath.requirements.map(migrateRequirement) : [],
    restrictions: Array.isArray(creationPath.restrictions) ? creationPath.restrictions.map(migrateRestriction) : [],
    appearanceRelevance: migrateAppearanceRelevance(creationPath.appearanceRelevance),
    dependencies: Array.isArray(creationPath.dependencies) ? creationPath.dependencies.map(migrateDependency) : [],
    verificationState: enumOr(creationPath.verificationState, ["draft", "firstReviewPending", "firstReviewApproved", "secondReviewPending", "verified", "rejected", "retired"], "draft"),
    verificationRecordIDs: stringArray(creationPath.verificationRecordIDs),
    evidenceFileIDs: stringArray(creationPath.evidenceFileIDs),
    status: enumOr(creationPath.status, ["unknown", "planned", "inAudit", "supported", "unsupported", "retired"], "unknown")
  };
}

function migrateStep(value: unknown, fallbackStepNumber: number) {
  const step = asRecord(value);
  return {
    stepNumber: typeof step.stepNumber === "number" ? step.stepNumber : fallbackStepNumber,
    instruction: stringOr(step.instruction, "unknown"),
    expectedResult: stringOr(step.expectedResult, "unknown"),
    menuItemID: maybeStringOrNull(step.menuItemID),
    evidenceFileIDs: stringArray(step.evidenceFileIDs)
  };
}

function migrateRequirement(value: unknown) {
  const requirement = asRecord(value);
  return {
    id: stringOr(requirement.id, "unknown-requirement"),
    description: stringOr(requirement.description, "unknown"),
    required: typeof requirement.required === "boolean" ? requirement.required : true,
    evidenceFileIDs: stringArray(requirement.evidenceFileIDs)
  };
}

function migrateRestriction(value: unknown) {
  const restriction = asRecord(value);
  return {
    id: stringOr(restriction.id, "unknown-restriction"),
    description: stringOr(restriction.description, "unknown"),
    severity: enumOr(restriction.severity, ["info", "blocking"], "info"),
    evidenceFileIDs: stringArray(restriction.evidenceFileIDs)
  };
}

function migrateAppearanceRelevance(value: unknown) {
  const relevance = asRecord(value);
  return {
    affectsAppearance: typeof relevance.affectsAppearance === "boolean" ? relevance.affectsAppearance : false,
    affectedCatalogKinds: stringArray(relevance.affectedCatalogKinds).filter((kind) => ["head", "hairstyle", "facialHair", "additionalAttribute"].includes(kind)) as Array<"head" | "hairstyle" | "facialHair" | "additionalAttribute">,
    affectedAttributeFamilies: stringArray(relevance.affectedAttributeFamilies),
    notes: stringOr(relevance.notes, "unknown")
  };
}

function migrateDependency(value: unknown) {
  const dependency = asRecord(value);
  return {
    id: stringOr(dependency.id, "unknown-dependency"),
    description: stringOr(dependency.description, "unknown"),
    dependencyTestID: maybeStringOrNull(dependency.dependencyTestID),
    requiredCreationPathID: maybeStringOrNull(dependency.requiredCreationPathID),
    evidenceFileIDs: stringArray(dependency.evidenceFileIDs)
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function maybeString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function maybeStringOrNull(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function enumOr<T extends string>(value: unknown, allowed: readonly T[], fallback: T) {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function maybeEnum<T extends string>(value: unknown, allowed: readonly T[]) {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : undefined;
}
