import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  canActorPerformPhase0Action,
  canRolePerformPhase0Action,
  createEmptyPhase0AdminAuditLogSnapshot,
  phase0AdminRoles,
  phase0MaterialActions,
  PHASE0_ADMIN_AUDIT_LOG_SCHEMA_VERSION,
  Phase0AdminAuditLogError,
  recordPhase0AdminMaterialAction,
  summarizePhase0AdminAuditLog,
  validatePhase0AdminAuditLogSnapshot,
  type Phase0AdminAuditLogSnapshot,
  type Phase0AdminRole,
  type Phase0AuditActor,
  type Phase0AuditTarget,
  type Phase0MaterialAction
} from "@/lib/phase-zero/phase-zero-admin-audit-log";

const now = "2026-07-13T00:00:00.000Z";

describe("Phase 0 admin roles and audit logging", () => {
  it("ships the required local workflow roles and material actions in schema form", () => {
    const schemaPath = path.resolve(process.cwd(), "../data/schemas/admin-audit-log.schema.json");
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    expect(schema.title).toBe("PhaseZeroAdminAuditLogSnapshot");
    expect(schema.$defs.adminRole.enum).toEqual(phase0AdminRoles);
    expect(schema.$defs.materialAction.enum).toEqual(phase0MaterialActions);
    expect(phase0AdminRoles).toEqual([
      "primaryResearcher",
      "evidenceCustodian",
      "catalogManager",
      "secondVerifier",
      "readOnlyReviewer",
      "developer"
    ]);
  });

  it("records every material action with an explicitly permitted local role", async () => {
    let snapshot = createEmptyPhase0AdminAuditLogSnapshot(now);
    for (const [index, action] of phase0MaterialActions.entries()) {
      const actor = actorForAction(action);
      const result = await recordPhase0AdminMaterialAction(snapshot, {
        entryID: `audit-entry-${String(index + 1).padStart(2, "0")}`,
        occurredAt: `2026-07-13T00:00:${String(index).padStart(2, "0")}.000Z`,
        actor,
        action,
        target: targetForAction(action),
        summary: `Synthetic ${action} audit event.`,
        reason: `Required to track ${action} in the local catalog workflow.`,
        relatedEntityIDs: ["synthetic-related-entity"],
        metadata: { source: "test-only" }
      });
      snapshot = result.snapshot;
      expect(result.entry.actor.roles.some((role) => canRolePerformPhase0Action(role, action))).toBe(true);
    }

    const report = await validatePhase0AdminAuditLogSnapshot(snapshot);
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(snapshot.entries.map((entry) => entry.action)).toEqual(phase0MaterialActions);
    expect(new Set(snapshot.entries.map((entry) => entry.entryHash)).size).toBe(phase0MaterialActions.length);
    expect(summarizePhase0AdminAuditLog(snapshot).entryCount).toBe(phase0MaterialActions.length);
  });

  it("does not treat read-only reviewers or developers as production-enablement authorities", async () => {
    expect(canActorPerformPhase0Action(actor("read-only", ["readOnlyReviewer"]), "validation")).toBe(false);
    expect(canActorPerformPhase0Action(actor("developer", ["developer"]), "productionEnablement")).toBe(false);

    await expect(
      recordPhase0AdminMaterialAction(createEmptyPhase0AdminAuditLogSnapshot(now), {
        entryID: "blocked-read-only-reviewer",
        occurredAt: now,
        actor: actor("read-only", ["readOnlyReviewer"]),
        action: "rejection",
        target: { targetType: "catalogRecord", targetID: "synthetic-record" },
        summary: "Read-only reviewer attempted a material write.",
        reason: "This must remain blocked."
      })
    ).rejects.toMatchObject({ code: "roleNotPermitted" });

    await expect(
      recordPhase0AdminMaterialAction(createEmptyPhase0AdminAuditLogSnapshot(now), {
        entryID: "blocked-developer-production-enablement",
        occurredAt: now,
        actor: actor("developer", ["developer"]),
        action: "productionEnablement",
        target: { targetType: "productionGate", targetID: "production-gate-synthetic" },
        summary: "Developer attempted production enablement.",
        reason: "No single developer role can enable recommendations."
      })
    ).rejects.toBeInstanceOf(Phase0AdminAuditLogError);
  });

  it("requires actor, target, summary, reason, and valid timestamps for material actions", async () => {
    await expect(
      recordPhase0AdminMaterialAction(createEmptyPhase0AdminAuditLogSnapshot(now), {
        entryID: "missing-reason",
        occurredAt: "not-a-date",
        actor: actor("", ["primaryResearcher"]),
        action: "recordCreation",
        target: { targetType: "catalogRecord", targetID: "" },
        summary: "",
        reason: ""
      })
    ).rejects.toMatchObject({ code: "invalidTimestamp" });
  });

  it("detects tampering and broken hash-chain history", async () => {
    const first = await recordPhase0AdminMaterialAction(createEmptyPhase0AdminAuditLogSnapshot(now), {
      entryID: "audit-entry-1",
      occurredAt: now,
      actor: actor("researcher", ["primaryResearcher"]),
      action: "recordCreation",
      target: { targetType: "catalogRecord", targetID: "synthetic-record" },
      summary: "Created a synthetic local audit record.",
      reason: "Testing append-only audit logging."
    });
    const second = await recordPhase0AdminMaterialAction(first.snapshot, {
      entryID: "audit-entry-2",
      occurredAt: "2026-07-13T00:00:01.000Z",
      actor: actor("manager", ["catalogManager"]),
      action: "validation",
      target: { targetType: "validationRun", targetID: "synthetic-validation" },
      summary: "Validated synthetic local audit record.",
      reason: "Testing append-only audit logging."
    });

    const tampered: Phase0AdminAuditLogSnapshot = {
      ...second.snapshot,
      entries: [
        { ...second.snapshot.entries[0], summary: "Tampered summary." },
        { ...second.snapshot.entries[1], previousEntryHash: "broken-previous-hash" }
      ]
    };
    const report = await validatePhase0AdminAuditLogSnapshot(tampered);
    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining(["entryHashMismatch", "invalidPreviousEntryHash"]));
  });
});

function actor(actorID: string, roles: Phase0AdminRole[]): Phase0AuditActor {
  return {
    actorID,
    displayName: actorID ? `Synthetic ${actorID}` : undefined,
    roles
  };
}

function actorForAction(action: Phase0MaterialAction): Phase0AuditActor {
  const roleByAction: Record<Phase0MaterialAction, Phase0AdminRole> = {
    recordCreation: "primaryResearcher",
    edit: "primaryResearcher",
    evidenceAssociation: "evidenceCustodian",
    verification: "secondVerifier",
    rejection: "catalogManager",
    recaptureRequest: "primaryResearcher",
    import: "catalogManager",
    validation: "developer",
    release: "catalogManager",
    rollback: "catalogManager",
    productionEnablement: "catalogManager"
  };
  return actor(`synthetic-${roleByAction[action]}`, [roleByAction[action]]);
}

function targetForAction(action: Phase0MaterialAction): Phase0AuditTarget {
  const targetByAction: Record<Phase0MaterialAction, Phase0AuditTarget> = {
    recordCreation: { targetType: "catalogRecord", targetID: "synthetic-record" },
    edit: { targetType: "catalogRecord", targetID: "synthetic-record" },
    evidenceAssociation: { targetType: "evidenceFile", targetID: "synthetic-evidence" },
    verification: { targetType: "catalogRecord", targetID: "synthetic-record" },
    rejection: { targetType: "catalogRecord", targetID: "synthetic-record" },
    recaptureRequest: { targetType: "evidenceFile", targetID: "synthetic-evidence" },
    import: { targetType: "catalogPackage", targetID: "synthetic-package" },
    validation: { targetType: "validationRun", targetID: "synthetic-validation" },
    release: { targetType: "catalogRelease", targetID: "synthetic-release" },
    rollback: { targetType: "rollback", targetID: "synthetic-rollback" },
    productionEnablement: { targetType: "productionGate", targetID: "synthetic-production-gate" }
  };
  return targetByAction[action];
}
