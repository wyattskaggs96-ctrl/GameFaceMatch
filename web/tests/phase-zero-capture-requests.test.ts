import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createPhase0CompletionDashboard } from "@/lib/phase-zero/phase-zero-completion-dashboard";
import { loadPhase0CompletionArtifacts } from "@/lib/phase-zero/phase-zero-completion-artifacts.server";

interface CaptureRequestPackage {
  productionStatus: string;
  verificationStatus: string;
  summary: {
    requestCount: number;
    productionRecommendationsEnabled: boolean;
  };
  requests: Array<Record<string, unknown>>;
}

const repositoryRoot = path.resolve(process.cwd(), "..");
const captureRequests = readJSON<CaptureRequestPackage>("data/phase-zero/capture_requests.json");
const issueRegister = readJSON<{ issues: Array<{ issueID: string; affectedRecordIDs: string[] }> }>("data/phase-zero/issues_register.research.json");

describe("Phase 0 capture requests", () => {
  it("provides the complete non-production capture package with required sections", () => {
    expect(captureRequests.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(captureRequests.verificationStatus).toBe("REQUESTED_NOT_CAPTURED");
    expect(captureRequests.summary.productionRecommendationsEnabled).toBe(false);
    expect(captureRequests.summary.requestCount).toBe(captureRequests.requests.length);
    expect(new Set(captureRequests.requests.map((request) => request.section))).toEqual(new Set([
      "must_capture_before_phase0_catalog_completion",
      "must_recapture_because_current_evidence_is_inadequate",
      "dependency_tests",
      "second_verifier_captures",
      "nice_to_have_evidence"
    ]));
  });

  it("keeps every capture request executable without inventing production verification", () => {
    const requiredFields = [
      "captureID",
      "priority",
      "exactMenuPath",
      "exactCategory",
      "startingOption",
      "endingOption",
      "performTwoCounts",
      "nativeIndexMustRemainVisible",
      "requiredViews",
      "rearViewRequired",
      "canonicalHead",
      "canonicalHairstyle",
      "facialHairSetting",
      "skinSetting",
      "bodySetting",
      "lightingRequirement",
      "cameraRequirement",
      "zoomRequirement",
      "recommendedRecordingLength",
      "videoOrScreenshotsPreferable",
      "existingFootageCanBeReused",
      "whyRequired",
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
      expect(request.acceptanceCriteria).toEqual(expect.any(Array));
    }
  });

  it("connects the capture package to the issue register and dashboard next action", () => {
    const trackingIssue = issueRegister.issues.find((issue) => issue.issueID === "issue-phase0-wyatt-next-capture-plan");
    const requestIDs = captureRequests.requests.map((request) => request.captureID);
    const dashboard = createPhase0CompletionDashboard(loadPhase0CompletionArtifacts());

    expect(trackingIssue?.affectedRecordIDs).toEqual(requestIDs);
    expect(dashboard.highestPriorityMissingCapture).toContain("GFM-CAP-001");
    expect(dashboard.nextRequiredHumanAction).toContain("GFM-CAP-001");
  });
});

function readJSON<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(repositoryRoot, relativePath), "utf8")) as T;
}
