import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(__dirname, "..", "..");
const workflowPath = path.join(repositoryRoot, "data/support/customer_support_workflows.json");
const playbookPath = path.join(repositoryRoot, "docs/support/CUSTOMER_SUPPORT_AND_INCIDENT_PLAYBOOK.md");

interface SupportWorkflowCatalog {
  version: string;
  defaultPolicy: {
    automatedSensitiveResponsesAllowed: boolean;
    humanReviewRequiredBeforeSending: boolean;
    doNotRequest: string[];
    requiredDisclaimer: string;
  };
  workflows: Array<{
    id: string;
    title: string;
    severity: "S0" | "S1" | "S2" | "S3";
    humanReviewRequired: boolean;
    automatedResponseAllowed: boolean;
    intakeFields: string[];
    firstResponseTemplate: string;
    resolutionTemplate: string;
    escalationRules: string[];
  }>;
}

function loadCatalog() {
  return JSON.parse(fs.readFileSync(workflowPath, "utf8")) as SupportWorkflowCatalog;
}

describe("customer support and incident readiness", () => {
  it("defines every required support workflow", () => {
    const catalog = loadCatalog();
    const workflowIDs = catalog.workflows.map((workflow) => workflow.id).sort();

    expect(workflowIDs).toEqual(
      [
        "accessibility-problem",
        "capture-failure",
        "catalog-option-missing",
        "child-safety-concern",
        "data-incident",
        "deletion-request",
        "incorrect-recommendation",
        "patch-changed-menu",
        "payment-issue",
        "privacy-concern",
        "refund-request",
        "trademark-complaint",
        "unsupported-device"
      ].sort()
    );
  });

  it("keeps sensitive responses under human review and disables automation", () => {
    const catalog = loadCatalog();

    expect(catalog.defaultPolicy.automatedSensitiveResponsesAllowed).toBe(false);
    expect(catalog.defaultPolicy.humanReviewRequiredBeforeSending).toBe(true);
    expect(catalog.defaultPolicy.doNotRequest).toEqual(expect.arrayContaining(["raw face images", "payment credentials", "sensitive traits"]));

    for (const workflow of catalog.workflows) {
      expect(workflow.humanReviewRequired).toBe(true);
      expect(workflow.automatedResponseAllowed).toBe(false);
      expect(workflow.firstResponseTemplate.length).toBeGreaterThan(40);
      expect(workflow.resolutionTemplate.length).toBeGreaterThan(40);
      expect(workflow.escalationRules.length).toBeGreaterThan(0);
    }
  });

  it("escalates privacy, child-safety, trademark, and data incidents as critical", () => {
    const criticalIDs = ["privacy-concern", "child-safety-concern", "trademark-complaint", "data-incident"];
    const catalog = loadCatalog();

    for (const workflowID of criticalIDs) {
      const workflow = catalog.workflows.find((candidate) => candidate.id === workflowID);
      expect(workflow?.severity).toBe("S0");
      expect(workflow?.escalationRules.join(" ")).toMatch(/Wyatt|legal|privacy|incident/i);
    }
  });

  it("preserves catalog integrity rules in recommendation and patch workflows", () => {
    const catalog = loadCatalog();
    const incorrectRecommendation = catalog.workflows.find((workflow) => workflow.id === "incorrect-recommendation");
    const patchChangedMenu = catalog.workflows.find((workflow) => workflow.id === "patch-changed-menu");
    const catalogOptionMissing = catalog.workflows.find((workflow) => workflow.id === "catalog-option-missing");

    expect(incorrectRecommendation?.escalationRules.join(" ")).toContain("Never guess");
    expect(patchChangedMenu?.escalationRules.join(" ")).toContain("Do not silently edit immutable releases");
    expect(catalogOptionMissing?.resolutionTemplate).toContain("production gates");
  });

  it("keeps payment and refund workflows credential-safe", () => {
    const catalog = loadCatalog();
    const paymentIssue = catalog.workflows.find((workflow) => workflow.id === "payment-issue");
    const refundRequest = catalog.workflows.find((workflow) => workflow.id === "refund-request");

    expect(paymentIssue?.firstResponseTemplate).toContain("Please do not send card numbers");
    expect(refundRequest?.firstResponseTemplate).toContain("Please do not send card numbers");
    expect(`${paymentIssue?.escalationRules.join(" ")} ${refundRequest?.escalationRules.join(" ")}`).toContain("Wyatt");
  });

  it("documents the support playbook and links to the machine-readable source", () => {
    const playbook = fs.readFileSync(playbookPath, "utf8");

    expect(playbook).toContain("data/support/customer_support_workflows.json");
    expect(playbook).toContain("Incorrect Recommendation");
    expect(playbook).toContain("Data Incident");
    expect(playbook).toContain("Do not automate sensitive responses without human review");
    expect(playbook).toContain("Verified College Football 27 catalog not loaded.");
  });
});
