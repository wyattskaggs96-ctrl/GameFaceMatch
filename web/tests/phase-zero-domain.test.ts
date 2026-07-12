import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createEmptyPhase0DomainSnapshot,
  PHASE0_DOMAIN_SCHEMA_VERSION,
  validatePhase0DomainSnapshot,
  type Phase0BaseEntity,
  type Phase0DomainSnapshot,
  type Phase0HeadCatalogItem,
  type Phase0VerificationState,
  type Phase0VerificationRecord
} from "@/lib/phase-zero/phase-zero-domain";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 domain model", () => {
  it("creates an empty JSON-serializable snapshot without production option records", () => {
    const snapshot = createEmptyPhase0DomainSnapshot(now);
    expect(snapshot.schemaVersion).toBe(PHASE0_DOMAIN_SCHEMA_VERSION);
    expect(snapshot.generatedAt).toBe(now);
    expect(snapshot.catalogItems).toHaveLength(0);
    expect(snapshot.games).toHaveLength(0);
    expect(validatePhase0DomainSnapshot(snapshot)).toMatchObject({ ok: true });
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it("covers every required Phase 0 collection in the shared schema", () => {
    const schemaPath = path.resolve(process.cwd(), "../data/schemas/phase-zero-domain.schema.json");
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    expect(schema.title).toBe("PhaseZeroDomainSnapshot");
    for (const key of Object.keys(createEmptyPhase0DomainSnapshot(now)).filter((key) => key !== "schemaVersion" && key !== "generatedAt")) {
      expect(schema.required).toContain(key);
      expect(schema.properties[key]).toBeTruthy();
    }
  });

  it("accepts a complete synthetic non-production audit model", () => {
    const snapshot = syntheticSnapshot();
    const report = validatePhase0DomainSnapshot(snapshot);
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(snapshot.catalogItems.map((item) => item.kind)).toEqual(["head", "hairstyle", "facialHair", "additionalAttribute"]);
  });

  it("rejects duplicate stable IDs, invalid timestamps, and placeholder game labels", () => {
    const snapshot = syntheticSnapshot();
    snapshot.games.push({ ...snapshot.games[0] });
    snapshot.catalogItems[0].exactVisibleLabelOrIndex = "REPLACE_WITH_VERIFIED_GAME_LABEL";
    snapshot.evidenceFiles[0].updatedAt = "not-a-date";
    const codes = validatePhase0DomainSnapshot(snapshot).errors.map((error) => error.code);
    expect(codes).toContain("duplicateStableID");
    expect(codes).toContain("placeholderGameData");
    expect(codes).toContain("invalidTimestamp");
  });

  it("requires verified catalog items to have first and second approved reviews from different verifiers", () => {
    const snapshot = syntheticSnapshot();
    snapshot.verificationRecords = snapshot.verificationRecords.filter((record) => record.stage === "first");
    const report = validatePhase0DomainSnapshot(snapshot);
    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("missingSecondReview");
  });

  it("blocks fixture items and missing checksums from published catalog releases", () => {
    const snapshot = syntheticSnapshot();
    snapshot.catalogReleases[0].status = "published";
    snapshot.catalogReleases[0].deterministicChecksum = null;
    const codes = validatePhase0DomainSnapshot(snapshot).errors.map((error) => error.code);
    expect(codes).toContain("missingReleaseChecksum");
    expect(codes).toContain("unverifiedReleaseItem");
  });

  it("blocks raw face media from production reference evidence", () => {
    const snapshot = syntheticSnapshot();
    snapshot.evidenceFiles[0].storageScope = "productionReference";
    snapshot.evidenceFiles[0].containsRawFaceMedia = true;
    const report = validatePhase0DomainSnapshot(snapshot);
    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("rawFaceMediaInProductionReference");
  });
});

function syntheticSnapshot(): Phase0DomainSnapshot {
  const snapshot = createEmptyPhase0DomainSnapshot(now);
  snapshot.games.push({
    ...base("game-synthetic"),
    title: "Synthetic Test Game",
    publisher: "Synthetic Test Publisher",
    releaseYear: 2026,
    status: "inAudit"
  });
  snapshot.platforms.push({
    ...base("platform-synthetic"),
    gameID: "game-synthetic",
    name: "synthetic-platform",
    family: "unknown",
    status: "inAudit"
  });
  snapshot.gameVersions.push({
    ...base("version-synthetic"),
    gameID: "game-synthetic",
    versionLabel: "synthetic-version",
    releaseDate: null,
    sourceEvidenceFileIDs: ["evidence-synthetic"],
    status: "inAudit"
  });
  snapshot.patches.push({
    ...base("patch-synthetic"),
    gameVersionID: "version-synthetic",
    patchLabel: "synthetic-patch",
    platformIDs: ["platform-synthetic"],
    observedAt: now,
    sourceEvidenceFileIDs: ["evidence-synthetic"],
    status: "inAudit"
  });
  snapshot.auditEnvironments.push({
    ...base("environment-synthetic"),
    kind: "consoleCapture",
    platformID: "platform-synthetic",
    gameVersionID: "version-synthetic",
    patchID: "patch-synthetic",
    auditorID: "synthetic-auditor",
    networkState: "unknown"
  });
  snapshot.creationPaths.push({
    ...base("creation-path-synthetic"),
    gameID: "game-synthetic",
    gameMode: "synthetic-mode",
    displayName: "synthetic-creation-path",
    platformIDs: ["platform-synthetic"],
    observedPatchIDs: ["patch-synthetic"],
    menuItemIDs: ["menu-synthetic"],
    status: "inAudit"
  });
  snapshot.menuItems.push({
    ...base("menu-synthetic"),
    gameID: "game-synthetic",
    creationPathID: "creation-path-synthetic",
    parentMenuItemID: null,
    kind: "option",
    exactVisibleLabelOrIndex: "synthetic-visible-label",
    ordinal: 1,
    navigationInstructionIDs: [],
    evidenceFileIDs: ["evidence-synthetic"],
    verificationState: "firstReviewApproved"
  });
  snapshot.captureConfigurations.push({
    ...base("capture-config-synthetic"),
    name: "Synthetic five-angle capture",
    version: "synthetic-v1",
    fileNamingPattern: "synthetic-pattern",
    requiredEvidenceKinds: ["screenshot"],
    requiredAngles: [
      "straightOn",
      "left45",
      "right45",
      "leftProfile",
      "rightProfile"
    ].map((angleID) => ({
      angleID: angleID as "straightOn" | "left45" | "right45" | "leftProfile" | "rightProfile",
      required: true,
      instruction: `Synthetic ${angleID} instruction`,
      minimumWidth: 640,
      minimumHeight: 640
    }))
  });
  snapshot.evidenceFiles.push({
    ...base("evidence-synthetic"),
    kind: "screenshot",
    relativePath: "data/fixtures/test-only/phase-zero/synthetic.png",
    sha256: "a".repeat(64),
    storageScope: "testFixture",
    containsRawFaceMedia: false,
    approvedForProductionCatalog: false,
    capturedAt: now,
    capturedAngleID: "straightOn",
    fileSizeBytes: 1024,
    width: 640,
    height: 640
  });
  snapshot.captureEvents.push({
    ...base("capture-event-synthetic"),
    kind: "standardAngle",
    auditEnvironmentID: "environment-synthetic",
    captureConfigurationID: "capture-config-synthetic",
    catalogItemID: "head-synthetic",
    angleID: "straightOn",
    evidenceFileID: "evidence-synthetic",
    capturedAt: now,
    operatorID: "synthetic-operator",
    qualityState: "accepted"
  });
  snapshot.issues.push({
    ...base("issue-synthetic"),
    relatedEntityID: "head-synthetic",
    severity: "warning",
    status: "open",
    title: "Synthetic issue",
    description: "Synthetic issue for unit tests.",
    openedBy: "synthetic-auditor",
    resolvedAt: null
  });
  snapshot.recaptureRequests.push({
    ...base("recapture-synthetic"),
    catalogItemID: "head-synthetic",
    requestedAngleIDs: ["left45"],
    reason: "Synthetic recapture request.",
    issueID: "issue-synthetic",
    requestedBy: "synthetic-reviewer",
    status: "open",
    completedCaptureEventIDs: []
  });
  snapshot.discrepancies.push({
    ...base("discrepancy-synthetic"),
    kind: "missingEvidence",
    relatedEntityIDs: ["head-synthetic"],
    description: "Synthetic discrepancy.",
    evidenceFileIDs: ["evidence-synthetic"],
    severity: "warning",
    status: "open"
  });
  snapshot.verificationRecords.push(review("review-synthetic-first", "first", "synthetic-reviewer-one"));
  snapshot.verificationRecords.push(review("review-synthetic-second", "second", "synthetic-reviewer-two"));
  snapshot.catalogItems.push(headItem());
  snapshot.catalogItems.push({
    ...catalogBase("hairstyle-synthetic", "hairstyle"),
    standardizedHairLength: "unknown",
    obscuresForehead: null,
    obscuresEars: null
  });
  snapshot.catalogItems.push({
    ...catalogBase("facial-hair-synthetic", "facialHair"),
    standardizedCoverage: "unknown"
  });
  snapshot.catalogItems.push({
    ...catalogBase("attribute-synthetic", "additionalAttribute"),
    attributeFamily: "other",
    valueType: "label"
  });
  snapshot.dependencyTests.push({
    ...base("dependency-synthetic"),
    kind: "categoryDependency",
    gameID: "game-synthetic",
    platformIDs: ["platform-synthetic"],
    gameVersionIDs: ["version-synthetic"],
    patchIDs: ["patch-synthetic"],
    catalogItemIDs: ["head-synthetic"],
    hypothesis: "Synthetic dependency hypothesis.",
    result: "inconclusive",
    evidenceFileIDs: ["evidence-synthetic"]
  });
  snapshot.catalogReleases.push({
    ...base("release-synthetic"),
    releaseID: "release-synthetic",
    catalogVersionID: "catalog-synthetic",
    gameID: "game-synthetic",
    platformID: "platform-synthetic",
    gameVersionID: "version-synthetic",
    patchID: "patch-synthetic",
    status: "candidate",
    itemIDs: ["head-synthetic"],
    manifestRelativePath: "data/fixtures/test-only/phase-zero/catalog_manifest.json",
    deterministicChecksum: "b".repeat(64),
    approvedVerificationRecordIDs: ["review-synthetic-first", "review-synthetic-second"],
    publishedAt: null,
    rolledBackAt: null
  });
  snapshot.importValidationRuns.push({
    ...base("import-run-synthetic"),
    runID: "import-run-synthetic",
    inputRelativePath: "data/fixtures/test-only/phase-zero/import.csv",
    startedAt: now,
    completedAt: now,
    status: "passedWithWarnings",
    checkedRecordCount: 4,
    errorCount: 0,
    warningCount: 1,
    issueIDs: ["issue-synthetic"],
    reportRelativePath: null
  });
  snapshot.manualMatchingStudies.push({
    ...base("study-synthetic"),
    studyID: "study-synthetic",
    protocolVersion: "synthetic-v1",
    catalogReleaseID: null,
    status: "blocked",
    startedAt: now,
    completedAt: null,
    subjectResultIDs: ["subject-result-synthetic"],
    targetMetrics: {
      topOneAcceptanceTarget: 0.6,
      topThreeUsefulnessTarget: 0.8,
      repeatabilityTarget: 0.85
    }
  });
  snapshot.subjectResults.push({
    ...base("subject-result-synthetic"),
    subjectResultID: "subject-result-synthetic",
    studyID: "study-synthetic",
    anonymizedSubjectID: "synthetic-subject",
    profileID: null,
    matchedCatalogItemIDs: [],
    selectedTopCandidateID: null,
    topThreeUseful: null,
    resemblanceRating: null,
    status: "incomplete"
  });
  return snapshot;
}

function base(id: string): Phase0BaseEntity {
  return {
    id,
    schemaVersion: PHASE0_DOMAIN_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now
  };
}

function catalogBase<K extends "head" | "hairstyle" | "facialHair" | "additionalAttribute">(
  id: string,
  kind: K,
  verificationState: Phase0VerificationState = "draft"
) {
  return {
    ...base(id),
    stableInternalID: id,
    kind,
    gameID: "game-synthetic",
    platformID: "platform-synthetic",
    gameVersionID: "version-synthetic",
    patchID: "patch-synthetic",
    creationPathID: "creation-path-synthetic",
    menuItemID: "menu-synthetic",
    categoryLabel: "synthetic-category",
    exactVisibleLabelOrIndex: "synthetic-visible-label",
    verificationState,
    evidenceFileIDs: ["evidence-synthetic"],
    captureEventIDs: ["capture-event-synthetic"],
    verificationRecordIDs: ["review-synthetic-first", "review-synthetic-second"],
    issueIDs: [],
    isTestFixture: true,
    isProductionCandidate: false,
    catalogVersionID: null
  };
}

function headItem(): Phase0HeadCatalogItem {
  return {
    ...catalogBase("head-synthetic", "head", "verified"),
    supportedMeasurementIDs: ["faceWidthRatio"],
    geometryAnnotationStatus: "partial"
  };
}

function review(id: string, stage: "first" | "second", verifierID: string): Phase0VerificationRecord {
  return {
    ...base(id),
    targetEntityID: "head-synthetic",
    targetEntityType: "catalogItem",
    stage,
    verifierID,
    decision: "approved",
    reviewedAt: now,
    checklistVersion: "synthetic-v1",
    evidenceFileIDs: ["evidence-synthetic"],
    discrepancyIDs: []
  };
}
