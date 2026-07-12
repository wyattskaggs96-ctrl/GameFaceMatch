import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCreationPathFromCandidate,
  canonicalCreationPathID,
  createCreationPathCandidateDraft,
  createCreationPathWorkspace,
  evaluateCreationPathCandidate,
  type CreationPathCandidateDraft
} from "@/lib/phase-zero/phase-zero-creation-path-workspace";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 creation-path audit workspace", () => {
  it("creates non-production candidate drafts for path investigation", () => {
    const workspace = createCreationPathWorkspace(now);
    const candidate = workspace.candidates[0];
    const evaluation = evaluateCreationPathCandidate(candidate);

    expect(workspace.schemaVersion).toBe("phase0-creation-path-workspace-v1");
    expect(candidate.sourceType).toBe("researchDraft");
    expect(candidate.confirmationState).toBe("draft");
    expect(evaluation.canExportCreationPath).toBe(false);
    expect(evaluation.blockers).toContain("Candidate path is missing required identifying fields.");
  });

  it("keeps a proposed Road to Glory path provisional until direct evidence confirms it", () => {
    const candidate = completeCandidate({
      displayName: "Proposed Road to Glory path",
      gameMode: "Road to Glory",
      exactPath: "Road to Glory > Player Creation",
      confirmationState: "provisional"
    });
    const evaluation = evaluateCreationPathCandidate(candidate);

    expect(evaluation.canExportCreationPath).toBe(false);
    expect(evaluation.blockers).toContain("Road to Glory path is provisional until confirmed through direct evidence.");
    expect(evaluation.nextAction).toMatch(/Road to Glory path/);
  });

  it("blocks export when any reproducible step is missing evidence", () => {
    const candidate = completeCandidate();
    candidate.steps[1].evidenceFileIDs = [];
    const evaluation = evaluateCreationPathCandidate(candidate);
    const result = buildCreationPathFromCandidate(candidate, now);

    expect(evaluation.missingEvidenceStepNumbers).toEqual([2]);
    expect(evaluation.canExportCreationPath).toBe(false);
    expect(result.creationPath).toBeNull();
  });

  it("exports evidence-backed candidates into valid creation-path records with input sequences", () => {
    const candidate = completeCandidate();
    const evaluation = evaluateCreationPathCandidate(candidate);
    const result = buildCreationPathFromCandidate(candidate, now);

    expect(evaluation.canonicalScore).toBe(91);
    expect(evaluation.canExportCreationPath).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.creationPath).toMatchObject({
      id: canonicalCreationPathID(candidate),
      gameMode: "synthetic-mode",
      exactPath: "synthetic-mode > synthetic-player-creation",
      verificationState: "firstReviewPending",
      status: "inAudit"
    });
    expect(result.creationPath?.reproducibleSteps[0].instruction).toContain("Input sequence:");
    expect(result.creationPath?.appearanceRelevance.affectedCatalogKinds).toEqual(["head", "hairstyle", "facialHair"]);
  });

  it("marks supplemental path exports as planned instead of canonical in-audit paths", () => {
    const candidate = completeCandidate({ candidateKind: "supplemental" });
    const result = buildCreationPathFromCandidate(candidate, now);

    expect(result.creationPath?.status).toBe("planned");
  });

  it("ships a schema covering candidate paths, input sequences, dependencies, scoring, and supplemental paths", () => {
    const schema = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/schemas/creation-path-workspace.schema.json"), "utf8"));
    const candidateProperties = schema.properties.candidates.items.properties;

    expect(candidateProperties.steps.items.properties).toHaveProperty("buttonInputSequence");
    expect(candidateProperties).toHaveProperty("accountRequirement");
    expect(candidateProperties).toHaveProperty("onlineRequirement");
    expect(candidateProperties).toHaveProperty("identifierConsistency");
    expect(candidateProperties).toHaveProperty("laterEditability");
    expect(candidateProperties).toHaveProperty("canonicalScoreInput");
    expect(candidateProperties).toHaveProperty("supplementalPathIDs");
  });
});

function completeCandidate(overrides: Partial<CreationPathCandidateDraft> = {}): CreationPathCandidateDraft {
  return {
    ...createCreationPathCandidateDraft("creation-path-candidate-synthetic", now),
    candidateKind: "primaryCandidate",
    confirmationState: "evidenceBacked",
    gameID: "college-football-27",
    displayName: "Synthetic player creation path",
    gameMode: "synthetic-mode",
    exactPath: "synthetic-mode > synthetic-player-creation",
    platformIDs: ["platform-synthetic"],
    observedPatchIDs: ["patch-synthetic"],
    menuItemIDs: ["menu-synthetic-1", "menu-synthetic-2"],
    accountRequirement: "notRequired",
    accountRequirementNotes: "Synthetic account requirement note.",
    onlineRequirement: "notRequired",
    onlineRequirementNotes: "Synthetic online requirement note.",
    restrictions: ["Synthetic restriction."],
    appearanceCategoriesAvailable: ["head", "hairstyle", "facialHair"],
    identifierConsistency: "consistent",
    identifierConsistencyNotes: "Synthetic identifiers stayed consistent.",
    dependencies: [
      {
        id: "dependency-synthetic-position",
        kind: "position",
        description: "Synthetic position dependency.",
        evidenceFileIDs: ["evidence-step-1"]
      }
    ],
    laterEditability: "partiallyEditable",
    laterEditabilityNotes: "Synthetic later editability note.",
    steps: [
      {
        stepNumber: 1,
        instruction: "Open synthetic creation path.",
        expectedResult: "Synthetic first menu appears.",
        buttonInputSequence: "synthetic-button-a",
        evidenceFileIDs: ["evidence-step-1"]
      },
      {
        stepNumber: 2,
        instruction: "Select synthetic appearance menu.",
        expectedResult: "Synthetic appearance categories appear.",
        buttonInputSequence: "synthetic-button-b",
        evidenceFileIDs: ["evidence-step-2"]
      }
    ],
    canonicalScoreInput: {
      evidenceCompleteness: 95,
      reproducibility: 90,
      appearanceCoverage: 90,
      dependencyClarity: 85,
      laterEditabilityConfidence: 95
    },
    canonicalJustification: "Synthetic evidence-backed candidate scored for test-only reproducibility.",
    supplementalPathIDs: ["creation-path-supplemental-synthetic"],
    notes: "Synthetic test-only candidate.",
    ...overrides
  };
}
