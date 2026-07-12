import { describe, expect, it } from "vitest";
import {
  buildAuditEnvironmentFromWizard,
  createEnvironmentEvidenceReference,
  createEnvironmentWizardDraft,
  generateEnvironmentID,
  getEnvironmentWizardCompletion,
  requiredEvidenceSlotIDs,
  type Phase0EnvironmentWizardDraft
} from "@/lib/phase-zero/phase-zero-environment-wizard";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 environment manifest wizard", () => {
  it("creates incomplete non-production drafts by default", () => {
    const draft = createEnvironmentWizardDraft(now);
    const completion = getEnvironmentWizardCompletion(draft);

    expect(completion.status).toBe("draftIncomplete");
    expect(completion.sourceType).toBe("researchDraft");
    expect(completion.canComplete).toBe(false);
    expect(completion.missingCriticalFields).toEqual(["platform name", "game executable version", "patch label", "mode", "exact path"]);
    expect(completion.missingEvidenceSlots).toEqual(requiredEvidenceSlotIDs());
  });

  it("prevents completion when critical platform, version, patch, mode, or path data is missing", () => {
    const draft = completeDraft();
    draft.patchLabel = "";
    draft.exactPath = "";
    const completion = getEnvironmentWizardCompletion(draft);
    const result = buildAuditEnvironmentFromWizard(draft, now);

    expect(completion.canComplete).toBe(false);
    expect(completion.missingCriticalFields).toEqual(["patch label", "exact path"]);
    expect(result.environment).toBeNull();
    expect(result.errors).toContain("Environment manifest is incomplete.");
  });

  it("requires all five source evidence slots before completion", () => {
    const draft = completeDraft();
    draft.evidenceSlots.titleScreen = { ...draft.evidenceSlots.titleScreen, evidenceFileID: "", fileName: "" };
    const completion = getEnvironmentWizardCompletion(draft);

    expect(completion.canComplete).toBe(false);
    expect(completion.missingEvidenceSlots).toEqual(["titleScreen"]);
  });

  it("generates a deterministic environment ID from confirmed environment values", () => {
    const draft = completeDraft();
    const first = generateEnvironmentID(draft);
    const second = generateEnvironmentID({ ...draft, notes: "Notes must not affect stable identity." });
    const changedPatch = generateEnvironmentID({ ...draft, patchLabel: "synthetic-test-only-patch-2" });

    expect(first).toBe(second);
    expect(first).toMatch(/^environment-synthetic-platform-synthetic-executable-version-synthetic-patch-synthetic-mode-synthetic-mode-synthetic-creation-path-[a-f0-9]{8}$/);
    expect(changedPatch).not.toBe(first);
  });

  it("builds a valid audit environment without storing file bytes", () => {
    const draft = completeDraft();
    const result = buildAuditEnvironmentFromWizard(draft, now);

    expect(result.errors).toEqual([]);
    expect(result.environment).toMatchObject({
      id: generateEnvironmentID(draft),
      kind: "consoleCapture",
      platformName: "synthetic-platform",
      gameExecutableVersion: "synthetic-executable-version",
      patchLabel: "synthetic-patch",
      mode: "synthetic-mode",
      exactPath: "synthetic-mode > synthetic-creation-path",
      evidenceFileIDs: requiredEvidenceSlotIDs().map((slotID) => draft.evidenceSlots[slotID].evidenceFileID)
    });
    expect(JSON.stringify(result.environment)).not.toContain("data:image");
    expect(JSON.stringify(result.environment)).not.toContain("blob:");
  });
});

function completeDraft(): Phase0EnvironmentWizardDraft {
  const draft = {
    ...createEnvironmentWizardDraft(now),
    auditorID: "synthetic-auditor",
    platformName: "synthetic-platform",
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
    entitlements: "synthetic-entitlement",
    notes: "Synthetic test-only environment."
  } satisfies Phase0EnvironmentWizardDraft;

  return {
    ...draft,
    evidenceSlots: Object.fromEntries(
      requiredEvidenceSlotIDs().map((slotID) => [
        slotID,
        createEnvironmentEvidenceReference({
          slotID,
          fileName: `${slotID}-synthetic-test-only.png`,
          mimeType: "image/png",
          sizeBytes: 1024,
          draft
        })
      ])
    ) as Phase0EnvironmentWizardDraft["evidenceSlots"]
  };
}
