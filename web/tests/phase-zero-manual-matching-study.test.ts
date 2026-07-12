import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  hasCompleteRequiredReferenceViews,
  PHASE0_MANUAL_MATCHING_STUDY_SCHEMA_VERSION,
  validatePhase0ManualMatchingStudyResult,
  type Phase0ManualMatchingStudyResult
} from "@/lib/phase-zero/phase-zero-manual-matching-study";

describe("Phase 0 manual matching study schema", () => {
  it("tracks every required manual top-three feasibility study field", () => {
    expect(schemaRequired()).toEqual([
      "schemaVersion",
      "sourceType",
      "studyVersion",
      "studyID",
      "resultID",
      "consentRecord",
      "subjectPseudonymousID",
      "captureMode",
      "referenceViewCompleteness",
      "humanReviewerIDs",
      "rankedHeadChoices",
      "hairChoice",
      "facialHairChoice",
      "subjectPreferredResult",
      "rankSelected",
      "mainMismatchReasons",
      "reviewerAgreement",
      "rawMediaDeletionState",
      "catalogVersion",
      "status",
      "resultTimestamps",
      "notes",
      "isTestFixture"
    ]);
  });

  it("validates the clearly marked fixture-only synthetic study record", () => {
    const fixture = loadSyntheticFixture();
    const report = validatePhase0ManualMatchingStudyResult(fixture, { fixtureOnly: true });
    expect(fixture.schemaVersion).toBe(PHASE0_MANUAL_MATCHING_STUDY_SCHEMA_VERSION);
    expect(fixture.sourceType).toBe("testFixture");
    expect(fixture.isTestFixture).toBe(true);
    expect(fixture.subjectPseudonymousID).toMatch(/^synthetic-/);
    expect(hasCompleteRequiredReferenceViews(fixture)).toBe(true);
    expect(report).toMatchObject({ ok: true, errors: [] });
  });

  it("warns rather than inventing missing reference views", () => {
    const fixture = loadSyntheticFixture();
    fixture.referenceViewCompleteness.leftProfile = false;
    const report = validatePhase0ManualMatchingStudyResult(fixture, { fixtureOnly: true });
    expect(hasCompleteRequiredReferenceViews(fixture)).toBe(false);
    expect(report.ok).toBe(true);
    expect(report.warnings.map((warning) => warning.code)).toContain("incompleteReferenceViews");
  });

  it("rejects missing study consent and withdrawal timestamp errors", () => {
    const fixture = loadSyntheticFixture();
    fixture.consentRecord.allowsManualReviewerEvaluation = false;
    fixture.consentRecord.withdrawalRequestedAt = "not-a-date";
    const report = validatePhase0ManualMatchingStudyResult(fixture, { fixtureOnly: true });
    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining(["missingRequiredConsent", "invalidConsentTimestamp"]));
  });

  it("requires two reviewers and reviewer agreement tracking", () => {
    const fixture = loadSyntheticFixture();
    fixture.humanReviewerIDs = ["synthetic-reviewer-a"];
    fixture.reviewerAgreement.reviewerIDs = ["synthetic-reviewer-a"];
    const report = validatePhase0ManualMatchingStudyResult(fixture, { fixtureOnly: true });
    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining(["insufficientReviewers", "missingReviewerAgreement"]));
  });

  it("requires exactly three unique ranked head choices with valid ranks", () => {
    const fixture = loadSyntheticFixture();
    fixture.rankedHeadChoices[1] = {
      ...fixture.rankedHeadChoices[0],
      reviewerID: "synthetic-reviewer-b"
    };
    const report = validatePhase0ManualMatchingStudyResult(fixture, { fixtureOnly: true });
    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining(["duplicateRank", "duplicateRankedHeadChoice"]));
  });

  it("validates subject-selected rank and appearance choice consistency", () => {
    const fixture = loadSyntheticFixture();
    fixture.rankSelected = 4 as 1;
    fixture.hairChoice = {
      catalogItemID: "synthetic-hair-choice-001",
      catalogStableInternalID: null,
      reviewerID: "synthetic-reviewer-a",
      reason: "Synthetic inconsistent choice."
    };
    const report = validatePhase0ManualMatchingStudyResult(fixture, { fixtureOnly: true });
    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining(["invalidSelectedRank", "inconsistentAppearanceChoice"]));
  });

  it("tracks raw-media deletion completion and blocks retention without explicit consent reference", () => {
    const fixture = loadSyntheticFixture();
    fixture.rawMediaDeletionState = {
      status: "retainedWithExplicitConsent",
      requestedAt: "2026-07-12T01:00:00.000Z",
      completedAt: null,
      verifiedBy: null,
      retentionConsentRecordID: "different-consent-record"
    };
    const report = validatePhase0ManualMatchingStudyResult(fixture, { fixtureOnly: true });
    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("missingRawMediaRetentionConsent");
  });

  it("keeps development fixtures fixture-only", () => {
    const fixture = loadSyntheticFixture();
    fixture.isTestFixture = false;
    fixture.sourceType = "researchDraft";
    fixture.subjectPseudonymousID = "subject-001";
    const report = validatePhase0ManualMatchingStudyResult(fixture, { fixtureOnly: true });
    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining(["fixtureFlagRequired", "fixtureSourceTypeRequired"]));
  });
});

function schemaRequired(): string[] {
  const schemaPath = path.resolve(process.cwd(), "..", "data", "schemas", "manual-matching-study.schema.json");
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8")) as { required: string[] };
  return schema.required;
}

function loadSyntheticFixture(): Phase0ManualMatchingStudyResult {
  const fixturePath = path.resolve(process.cwd(), "..", "data", "fixtures", "test-only", "manual-matching-study", "synthetic-study-result.json");
  return JSON.parse(fs.readFileSync(fixturePath, "utf8")) as Phase0ManualMatchingStudyResult;
}
