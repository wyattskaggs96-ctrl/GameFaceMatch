import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createBrowserPhase0AuditStore,
  createMemoryPhase0AuditStore,
  migratePhase0AuditStoreSnapshot,
  PHASE0_AUDIT_STORE_KEY,
  PHASE0_AUDIT_STORE_SCHEMA_VERSION
} from "@/lib/phase-zero/phase-zero-audit-store";
import { PHASE0_DOMAIN_SCHEMA_VERSION, type Phase0AuditEnvironment, type Phase0CreationPath } from "@/lib/phase-zero/phase-zero-domain";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 audit environment and creation-path persistence", () => {
  it("ships dedicated schemas with all source-required environment and creation-path fields", () => {
    const environmentSchema = readSchema("audit-environment.schema.json");
    const creationPathSchema = readSchema("creation-path.schema.json");
    for (const field of [
      "platformName",
      "consoleModel",
      "consoleOSVersion",
      "edition",
      "region",
      "storefront",
      "copyType",
      "gameExecutableVersion",
      "patchLabel",
      "latestUpdateState",
      "observedAt",
      "onlineState",
      "eaAccountState",
      "resolution",
      "hdrState",
      "displayModel",
      "captureHardware",
      "captureFormat",
      "mode",
      "exactPath",
      "position",
      "archetype",
      "handedness",
      "height",
      "weight",
      "bodyType",
      "entitlements",
      "evidenceFileIDs"
    ]) {
      expect(environmentSchema.required).toContain(field);
    }
    for (const field of ["reproducibleSteps", "requirements", "restrictions", "appearanceRelevance", "dependencies", "verificationState"]) {
      expect(creationPathSchema.required).toContain(field);
    }
  });

  it("persists valid audit environments and creation paths in memory", () => {
    const store = createMemoryPhase0AuditStore(undefined, () => now);
    expect(store.saveAuditEnvironment(validEnvironment()).ok).toBe(true);
    expect(store.saveCreationPath(validCreationPath()).ok).toBe(true);
    expect(store.listAuditEnvironments()).toHaveLength(1);
    expect(store.getAuditEnvironment("environment-synthetic")?.platformName).toBe("synthetic-platform");
    expect(store.listCreationPaths()).toHaveLength(1);
    expect(store.getCreationPath("creation-path-synthetic")?.reproducibleSteps[0].stepNumber).toBe(1);
    expect(store.load()).toMatchObject({
      schemaVersion: PHASE0_AUDIT_STORE_SCHEMA_VERSION,
      updatedAt: now
    });
  });

  it("rejects invalid records before persistence", () => {
    const store = createMemoryPhase0AuditStore(undefined, () => now);
    const invalidEnvironment = { ...validEnvironment(), evidenceFileIDs: [] };
    const invalidPath = { ...validCreationPath(), reproducibleSteps: [] };
    expect(store.saveAuditEnvironment(invalidEnvironment).errors.map((error) => error.code)).toContain("missingEvidenceReference");
    expect(store.saveCreationPath(invalidPath).errors.map((error) => error.code)).toContain("missingCreationPathSteps");
    expect(store.listAuditEnvironments()).toHaveLength(0);
    expect(store.listCreationPaths()).toHaveLength(0);
  });

  it("persists through browser localStorage-compatible storage without media bytes", () => {
    const storage = memoryStorage();
    const store = createBrowserPhase0AuditStore(storage, PHASE0_AUDIT_STORE_KEY, () => now);
    store.saveAuditEnvironment(validEnvironment());
    store.saveCreationPath(validCreationPath());
    const raw = storage.getItem(PHASE0_AUDIT_STORE_KEY) ?? "";
    expect(raw).toContain("environment-synthetic");
    expect(raw).toContain("creation-path-synthetic");
    expect(raw).not.toContain("data:image");
    expect(raw).not.toContain("blob:");
    const reloaded = createBrowserPhase0AuditStore(storage, PHASE0_AUDIT_STORE_KEY, () => now);
    expect(reloaded.listAuditEnvironments()).toHaveLength(1);
    expect(reloaded.listCreationPaths()).toHaveLength(1);
  });

  it("migrates unversioned snapshots to the current audit-store schema", () => {
    const migrated = migratePhase0AuditStoreSnapshot(
      {
        auditEnvironments: [
          {
            id: "legacy-environment",
            platform: "legacy-platform",
            gameMode: "legacy-mode",
            creationPath: "legacy-path",
            patchVersion: "legacy-patch",
            auditor: "legacy-auditor",
            evidenceFileIDs: ["legacy-evidence"]
          }
        ],
        creationPaths: [
          {
            id: "legacy-creation-path",
            gameID: "legacy-game",
            gameMode: "legacy-mode",
            displayName: "legacy-path",
            evidenceFileIDs: ["legacy-evidence"],
            reproducibleSteps: [
              {
                instruction: "legacy step",
                expectedResult: "legacy result",
                evidenceFileIDs: ["legacy-evidence"]
              }
            ]
          }
        ]
      },
      now
    );
    expect(migrated.schemaVersion).toBe(PHASE0_AUDIT_STORE_SCHEMA_VERSION);
    expect(migrated.auditEnvironments[0]).toMatchObject({
      schemaVersion: PHASE0_DOMAIN_SCHEMA_VERSION,
      platformName: "legacy-platform",
      mode: "legacy-mode",
      exactPath: "legacy-path"
    });
    expect(migrated.creationPaths[0].reproducibleSteps[0].stepNumber).toBe(1);
  });
});

function readSchema(file: string) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/schemas", file), "utf8"));
}

function validEnvironment(): Phase0AuditEnvironment {
  return {
    id: "environment-synthetic",
    schemaVersion: PHASE0_DOMAIN_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    kind: "consoleCapture",
    platformID: "platform-synthetic",
    platformName: "synthetic-platform",
    gameVersionID: "version-synthetic",
    patchID: "patch-synthetic",
    consoleModel: "synthetic-console-model",
    consoleOSVersion: "synthetic-console-os",
    edition: "synthetic-edition",
    region: "synthetic-region",
    storefront: "synthetic-storefront",
    copyType: "digital",
    gameExecutableVersion: "synthetic-executable-version",
    patchLabel: "synthetic-patch",
    latestUpdateState: "latestInstalled",
    observedAt: now,
    onlineState: "online",
    eaAccountState: "signedOut",
    resolution: "synthetic-resolution",
    hdrState: "disabled",
    displayModel: "synthetic-display-model",
    captureHardware: "synthetic-capture-hardware",
    captureFormat: "synthetic-capture-format",
    mode: "synthetic-mode",
    exactPath: "synthetic-mode > synthetic-creation-path",
    position: "synthetic-position",
    archetype: "synthetic-archetype",
    handedness: "right",
    height: "synthetic-height",
    weight: "synthetic-weight",
    bodyType: "synthetic-body-type",
    entitlements: ["synthetic-entitlement"],
    evidenceFileIDs: ["evidence-synthetic"],
    auditorID: "synthetic-auditor"
  };
}

function validCreationPath(): Phase0CreationPath {
  return {
    id: "creation-path-synthetic",
    schemaVersion: PHASE0_DOMAIN_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    gameID: "game-synthetic",
    gameMode: "synthetic-mode",
    displayName: "synthetic-path",
    exactPath: "synthetic-mode > synthetic-path",
    platformIDs: ["platform-synthetic"],
    observedPatchIDs: ["patch-synthetic"],
    menuItemIDs: ["menu-synthetic"],
    reproducibleSteps: [
      {
        stepNumber: 1,
        instruction: "Select synthetic mode.",
        expectedResult: "Synthetic path appears.",
        menuItemID: "menu-synthetic",
        evidenceFileIDs: ["evidence-synthetic"]
      }
    ],
    requirements: [
      {
        id: "requirement-synthetic",
        description: "Synthetic requirement.",
        required: true,
        evidenceFileIDs: ["evidence-synthetic"]
      }
    ],
    restrictions: [
      {
        id: "restriction-synthetic",
        description: "Synthetic restriction.",
        severity: "info",
        evidenceFileIDs: ["evidence-synthetic"]
      }
    ],
    appearanceRelevance: {
      affectsAppearance: true,
      affectedCatalogKinds: ["head", "hairstyle"],
      affectedAttributeFamilies: ["synthetic-family"],
      notes: "Synthetic appearance relevance."
    },
    dependencies: [
      {
        id: "dependency-synthetic",
        description: "Synthetic dependency.",
        dependencyTestID: null,
        requiredCreationPathID: null,
        evidenceFileIDs: ["evidence-synthetic"]
      }
    ],
    verificationState: "firstReviewPending",
    verificationRecordIDs: [],
    evidenceFileIDs: ["evidence-synthetic"],
    status: "inAudit"
  };
}

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key) {
      return map.get(key) ?? null;
    },
    key(index) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key) {
      map.delete(key);
    },
    setItem(key, value) {
      map.set(key, value);
    }
  };
}
