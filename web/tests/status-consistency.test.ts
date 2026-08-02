import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
// @ts-expect-error Root status checker is a plain ESM script without TypeScript declarations.
import { validateCurrentProjectState } from "../../scripts/status-consistency-check.mjs";

describe("current project status consistency", () => {
  const supabaseGatePrefix = "SUPA" + "BASE";

  it("keeps the authoritative status document aligned with live repository artifacts", () => {
    const result = validateCurrentProjectState();

    expect(result.ok).toBe(true);
    expect(result.actual).toMatchObject({
      productionCatalogRecords: 0,
      secondVerificationDecisions: 0,
      manualMatchingStudyValidParticipants: 0,
      productionRecommendationsEnabled: false
    });
    expect(result.gateRegistry.gates.map((gate: { id: string }) => gate.id)).toEqual(expect.arrayContaining([
      "CAPTURE_UI_READY",
      "LIVE_CAPTURE_SIGNALS_READY",
      "FULL_VERIFY_READY",
      `${supabaseGatePrefix}_CODE_BOUNDARY_READY`,
      `${supabaseGatePrefix}_REMOTE_READY`,
      "OWNER_CAPTURE_PACKAGE_READY",
      "OWNER_CAPTURES_COMPLETE",
      "VERIFIER_PACKAGE_READY",
      "SECOND_VERIFICATION_COMPLETE",
      "PRODUCTION_CATALOG_READY",
      "REAL_RECOMMENDATIONS_READY",
      "BILLING_READY",
      "MATCHING_STUDY_READY",
      "LEGAL_READY",
      "PRIVATE_BETA_READY",
      "PUBLIC_LAUNCH_READY"
    ]));
  });

  it("rejects stale claims that would imply production readiness without data", () => {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "gfm-status-check-"));
    const statusPath = path.join(temporaryDirectory, "CURRENT_PROJECT_STATE.md");
    fs.writeFileSync(statusPath, `# Stale Status

<!-- status-assertions:start -->
\`\`\`json
{
  "productionCatalogRecords": 1,
  "secondVerificationDecisions": 1,
  "manualMatchingStudyValidParticipants": 0,
  "matchingAccuracyValidation": "COMPLETE",
  "productionReadiness": "APPROVED",
  "productionRecommendationsEnabled": true
}
\`\`\`
<!-- status-assertions:end -->
`);

    const result = validateCurrentProjectState({ statusPath });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining("productionCatalogRecords mismatch"),
      expect.stringContaining("secondVerificationDecisions mismatch"),
      expect.stringContaining("productionRecommendationsEnabled mismatch"),
      "Status document claims completed matching validation without real study data.",
      "Status document claims production readiness while the production release gate is blocked."
    ]));
  });
});
