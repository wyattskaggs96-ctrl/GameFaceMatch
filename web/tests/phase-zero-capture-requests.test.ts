import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createPhase0CompletionDashboard } from "@/lib/phase-zero/phase-zero-completion-dashboard";
import { loadPhase0CompletionArtifacts } from "@/lib/phase-zero/phase-zero-completion-artifacts.server";

interface CaptureRequestPackage {
  schemaVersion: string;
  productionStatus: string;
  verificationStatus: string;
  summary: {
    requestCount: number;
    productionEligibleRows: number;
    productionRecommendationsEnabled: boolean;
  };
  requests: Array<Record<string, unknown>>;
}

const repositoryRoot = path.resolve(process.cwd(), "..");
const captureRequests = readJSON<CaptureRequestPackage>("data/phase-zero/capture_requests.json");
const issueRegister = readJSON<{ issues: Array<{ issueID: string; affectedRecordIDs: string[] }> }>("data/phase-zero/issues_register.research.json");

describe("Phase 0 capture requests", () => {
  it("provides the complete non-production capture package with required sections", () => {
    const script = readText("docs/phase-zero/WYATT_RECORDING_SCRIPT.md");
    const checklist = readText("docs/phase-zero/WYATT_RECORDING_QUICK_CHECKLIST.md");

    expect(captureRequests.schemaVersion).toBe("cf27-wyatt-recording-script-v1");
    expect(captureRequests.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(captureRequests.verificationStatus).toBe("REQUESTED_NOT_CAPTURED");
    expect(captureRequests.summary.productionRecommendationsEnabled).toBe(false);
    expect(captureRequests.summary.requestCount).toBe(captureRequests.requests.length);
    expect(captureRequests.summary.requestCount).toBe(10);
    expect(captureRequests.summary.productionEligibleRows).toBe(0);
    expect(new Set(captureRequests.requests.map((request) => request.section))).toEqual(new Set([
      "record_this_tonight",
      "record_after_p0_if_time"
    ]));
    expect(captureRequests.requests.map((request) => request.captureID)).toEqual([
      "GFM-CAP-001",
      "GFM-CAP-002",
      "GFM-CAP-003",
      "GFM-CAP-004",
      "GFM-CAP-005",
      "GFM-CAP-006",
      "GFM-CAP-007",
      "GFM-CAP-008",
      "GFM-CAP-009",
      "GFM-CAP-010"
    ]);
    expect(script).toContain("Session 1: GFM-CAP-001");
    expect(checklist).toContain("Record this tonight, in order");
  });

  it("keeps every capture request executable without inventing production verification", () => {
    const requiredFields = [
      "captureID",
      "sessionNumber",
      "priority",
      "title",
      "expectedDuration",
      "exactMenuPath",
      "exactCategory",
      "exactSettingsToLock",
      "exactStartingOption",
      "exactEndingOption",
      "navigationSpeed",
      "requiredPauses",
      "requiredCameraViews",
      "menuIndexMustRemainVisible",
      "twoIndependentCountsRequired",
      "stillScreenshotsRequired",
      "frontViewsRequired",
      "threeQuarterViewsRequired",
      "profileViewsRequired",
      "rearViewsRequired",
      "requiredViews",
      "requiredFileNamingConvention",
      "qualityChecklist",
      "stopCondition",
      "existingFootageCanBeReused",
      "acceptanceCriteria"
    ];

    for (const request of captureRequests.requests) {
      for (const field of requiredFields) {
        expect(Object.prototype.hasOwnProperty.call(request, field), `${request.captureID} missing ${field}`).toBe(true);
        if (typeof request[field] === "string" || Array.isArray(request[field])) {
          expect(request[field], `${request.captureID} has empty ${field}`).toBeTruthy();
        }
      }
      expect(request.productionStatus).toBe("NOT_PRODUCTION_DATA");
      expect(request.verificationStatus).toBe("REQUESTED_NOT_CAPTURED");
      expect(request.exactMenuPath).not.toMatch(/College Football 26/i);
      expect(request.exactMenuPath).not.toMatch(/Xbox Settings|Payment|Stripe|PayPal/i);
      expect(String(request.existingFootageCanBeReused)).toMatch(/Existing|No complete/);
      expect(request.acceptanceCriteria).toEqual(expect.any(Array));
    }
  });

  it("connects the capture package to the issue register and dashboard next action", () => {
    const trackingIssue = issueRegister.issues.find((issue) => issue.issueID === "issue-phase0-wyatt-next-capture-plan");
    const requestIDs = captureRequests.requests.map((request) => request.captureID);
    const dashboard = createPhase0CompletionDashboard(loadPhase0CompletionArtifacts());

    expect(trackingIssue?.affectedRecordIDs).toEqual(requestIDs);
    expect(dashboard.highestPriorityMissingCapture).toContain("GFM-CAP-001");
    expect(dashboard.highestPriorityMissingCapture).toContain("Appearance");
    expect(dashboard.nextRequiredHumanAction).toContain("GFM-CAP-001");
  });
});

function readText(relativePath: string): string {
  return fs.readFileSync(path.resolve(repositoryRoot, relativePath), "utf8");
}

function readJSON<T>(relativePath: string): T {
  return JSON.parse(readText(relativePath)) as T;
}
