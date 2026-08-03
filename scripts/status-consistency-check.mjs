#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultStatusPath = "docs/status/CURRENT_PROJECT_STATE.md";
const defaultGateRegistryPath = "data/status/current_gate_registry.json";
const defaultOwnerMediaBaselineLockPath = "data/status/owner_media_baseline_lock.json";
const defaultAllVideoInventoryPath = "data/media-audit/all_video_inventory.json";

if (import.meta.url === `file://${process.argv[1]}`) {
  const statusPath = cliValue("--status") ?? defaultStatusPath;
  const result = validateCurrentProjectState({ root: repositoryRoot, statusPath });
  if (result.ok) {
    console.log(`Current project state consistency OK (${result.checks.length} checks).`);
  } else {
    console.error("Current project state consistency failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  }
}

export function validateCurrentProjectState({ root = repositoryRoot, statusPath = defaultStatusPath } = {}) {
  const statusDocumentPath = path.resolve(root, statusPath);
  const statusDocument = fs.readFileSync(statusDocumentPath, "utf8");
  const assertions = extractStatusAssertions(statusDocument);
  const actual = readActualStatus(root);
  const gateRegistry = readJson(path.join(root, defaultGateRegistryPath));
  const ownerMediaBaselineLock = readJson(path.join(root, defaultOwnerMediaBaselineLockPath));
  const allVideoInventory = readJson(path.join(root, defaultAllVideoInventoryPath));
  const errors = [];
  const checks = [];

  checkEqual(errors, checks, "productionCatalogRecords", assertions.productionCatalogRecords, actual.productionCatalogRecords);
  checkEqual(errors, checks, "secondVerificationDecisions", assertions.secondVerificationDecisions, actual.secondVerificationDecisions);
  checkEqual(errors, checks, "manualMatchingStudyValidParticipants", assertions.manualMatchingStudyValidParticipants, actual.manualMatchingStudyValidParticipants);
  checkEqual(errors, checks, "productionRecommendationsEnabled", assertions.productionRecommendationsEnabled, actual.productionRecommendationsEnabled);

  if (actual.productionCatalogRecords === 0 && assertions.productionCatalogRecords !== 0) {
    errors.push("Status document claims nonzero production records while the active production catalog is empty.");
  }

  if (actual.secondVerificationDecisions === 0 && assertions.secondVerificationDecisions !== 0) {
    errors.push("Status document claims second-verification decisions while no second-verifier decisions exist.");
  }

  const completeMatchingStatuses = new Set(["COMPLETE", "VALIDATED", "VERIFIED", "READY", "MEASURED"]);
  if (actual.manualMatchingStudyValidParticipants === 0 && completeMatchingStatuses.has(String(assertions.matchingAccuracyValidation))) {
    errors.push("Status document claims completed matching validation without real study data.");
  }
  checks.push({
    name: "matchingAccuracyValidation",
    claimed: assertions.matchingAccuracyValidation,
    actualParticipants: actual.manualMatchingStudyValidParticipants
  });

  if (actual.productionReadiness.startsWith("BLOCKED") && !String(assertions.productionReadiness).startsWith("BLOCKED")) {
    errors.push("Status document claims production readiness while the production release gate is blocked.");
  }
  checks.push({
    name: "productionReadiness",
    claimed: assertions.productionReadiness,
    actual: actual.productionReadiness
  });

  validateGateRegistry(errors, checks, gateRegistry, actual);
  validateOwnerMediaBaselineLock(errors, checks, ownerMediaBaselineLock, allVideoInventory, gateRegistry);

  return {
    ok: errors.length === 0,
    errors,
    checks,
    assertions,
    gateRegistry,
    ownerMediaBaselineLock,
    actual
  };
}

export function extractStatusAssertions(statusDocument) {
  const match = /<!-- status-assertions:start -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- status-assertions:end -->/.exec(statusDocument);
  if (!match) throw new Error("CURRENT_PROJECT_STATE.md is missing the status assertions JSON block.");
  return JSON.parse(match[1]);
}

function readActualStatus(root) {
  const productionManifest = readJson(path.join(root, "data/catalog/production/catalog_manifest.json"));
  const primaryReview = readJson(path.join(root, "data/phase-zero/primary_review_status.json"));
  const manualMatching = readJson(path.join(root, "data/phase-zero/manual_matching_accuracy_analysis.json"));
  const productionDecision = readJson(path.join(root, "data/catalog/production-releases/cf27-production-empty-2026-07-14/production_readiness_decision.json"));

  return {
    productionCatalogRecords: productionManifest.items?.length ?? productionManifest.manifest?.items?.length ?? 0,
    secondVerificationDecisions: primaryReview.summary?.secondVerified ?? countSecondVerified(primaryReview.candidates ?? []),
    manualMatchingStudyValidParticipants: manualMatching.validParticipants ?? 0,
    productionReadiness: productionDecision.decision ?? productionDecision.status ?? "UNKNOWN",
    productionRecommendationsEnabled: Boolean(productionManifest.productionRecommendationsEnabled ?? primaryReview.productionRecommendationsEnabled)
  };
}

function countSecondVerified(candidates) {
  return candidates.filter((candidate) => ["VERIFIED", "VERIFIED_WITH_NOTES"].includes(candidate.secondVerificationStatus)).length;
}

function checkEqual(errors, checks, name, claimed, actual) {
  checks.push({ name, claimed, actual });
  if (claimed !== actual) errors.push(`${name} mismatch: document claims ${JSON.stringify(claimed)} but current artifacts report ${JSON.stringify(actual)}.`);
}

function validateGateRegistry(errors, checks, gateRegistry, actual) {
  if (!Array.isArray(gateRegistry.gates)) {
    errors.push(`${defaultGateRegistryPath} must contain a gates array.`);
    return;
  }
  const gates = new Map(gateRegistry.gates.map((gate) => [gate.id, gate]));
  const requiredGateIDs = [
    "CAPTURE_UI_READY",
    "LIVE_CAPTURE_SIGNALS_READY",
    "FULL_VERIFY_READY",
    "OWNER_MEDIA_BASELINE_LOCKED",
    "SUPABASE_CODE_BOUNDARY_READY",
    "SUPABASE_REMOTE_READY",
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
  ];

  for (const gateID of requiredGateIDs) {
    if (!gates.has(gateID)) errors.push(`Gate registry is missing ${gateID}.`);
  }

  checkGateStatus(errors, checks, gates, "PRODUCTION_CATALOG_READY", (status) => {
    if (actual.productionCatalogRecords === 0 && isReadyStatus(status)) {
      return "Gate registry marks PRODUCTION_CATALOG_READY ready while the production catalog is empty.";
    }
    return null;
  });
  checkGateStatus(errors, checks, gates, "REAL_RECOMMENDATIONS_READY", (status) => {
    if (!actual.productionRecommendationsEnabled && isReadyStatus(status)) {
      return "Gate registry marks REAL_RECOMMENDATIONS_READY ready while production recommendations are disabled.";
    }
    return null;
  });
  checkGateStatus(errors, checks, gates, "SECOND_VERIFICATION_COMPLETE", (status) => {
    if (actual.secondVerificationDecisions === 0 && isReadyStatus(status)) {
      return "Gate registry marks SECOND_VERIFICATION_COMPLETE ready while no second-verifier decisions exist.";
    }
    return null;
  });
  checkGateStatus(errors, checks, gates, "MATCHING_STUDY_READY", (status) => {
    if (actual.manualMatchingStudyValidParticipants === 0 && isReadyStatus(status)) {
      return "Gate registry marks MATCHING_STUDY_READY ready while there are no valid study participants.";
    }
    return null;
  });
  checkGateStatus(errors, checks, gates, "PRIVATE_BETA_READY", (status) => {
    if (actual.productionCatalogRecords === 0 && isReadyStatus(status)) {
      return "Gate registry marks PRIVATE_BETA_READY ready while there are no production catalog records.";
    }
    return null;
  });
  checkGateStatus(errors, checks, gates, "PUBLIC_LAUNCH_READY", (status) => {
    if (actual.productionReadiness.startsWith("BLOCKED") && isReadyStatus(status)) {
      return "Gate registry marks PUBLIC_LAUNCH_READY ready while production readiness is blocked.";
    }
    return null;
  });

  checkGateStatus(errors, checks, gates, "OWNER_MEDIA_BASELINE_LOCKED", (status) => {
    if (!isReadyStatus(status)) return "Gate registry does not mark OWNER_MEDIA_BASELINE_LOCKED ready.";
    return null;
  });
  checkGateStatus(errors, checks, gates, "OWNER_CAPTURES_COMPLETE", (status) => {
    if (String(status) === "BLOCKED_OWNER") {
      return "Gate registry still marks OWNER_CAPTURES_COMPLETE as BLOCKED_OWNER after OWNER_MEDIA_BASELINE_LOCKED.";
    }
    return null;
  });
}

function validateOwnerMediaBaselineLock(errors, checks, ownerMediaBaselineLock, allVideoInventory, gateRegistry) {
  checks.push({
    name: "ownerMediaBaselineLock:decision",
    decisionID: ownerMediaBaselineLock.decisionID,
    decisionOwner: ownerMediaBaselineLock.decisionOwner,
    additionalOwnerMediaRequiredForInitialLaunch:
      ownerMediaBaselineLock.ownerMediaRequirement?.additionalOwnerMediaRequiredForInitialLaunch
  });

  if (ownerMediaBaselineLock.decisionID !== "OWNER_MEDIA_BASELINE_LOCKED") {
    errors.push(`${defaultOwnerMediaBaselineLockPath} must record decisionID OWNER_MEDIA_BASELINE_LOCKED.`);
  }
  if (ownerMediaBaselineLock.decisionOwner !== "Wyatt Skaggs") {
    errors.push(`${defaultOwnerMediaBaselineLockPath} must record Wyatt Skaggs as decision owner.`);
  }
  if (ownerMediaBaselineLock.ownerMediaRequirement?.additionalOwnerMediaRequiredForInitialLaunch !== false) {
    errors.push(`${defaultOwnerMediaBaselineLockPath} must state additional owner media is not required for initial launch.`);
  }

  const baselineSummary = ownerMediaBaselineLock.sourceMediaSummary ?? {};
  const inventorySummary = allVideoInventory.summary ?? {};
  checkEqual(errors, checks, "ownerMediaBaseline.totalVideos", baselineSummary.totalVideos, inventorySummary.totalVideos);
  checkEqual(errors, checks, "ownerMediaBaseline.uniqueMasters", baselineSummary.uniqueMasters, inventorySummary.uniqueVideos);
  checkEqual(errors, checks, "ownerMediaBaseline.duplicateUploads", baselineSummary.duplicateUploads, inventorySummary.duplicateVideos);
  checkEqual(errors, checks, "ownerMediaBaseline.openedSuccessfully", baselineSummary.openedSuccessfully, inventorySummary.videosOpened);
  checkEqual(errors, checks, "ownerMediaBaseline.fullDurationReadable", baselineSummary.fullDurationReadable, inventorySummary.videosFullDurationReadable);
  checkEqual(errors, checks, "ownerMediaBaseline.sourceVideosModified", baselineSummary.sourceVideosModified, inventorySummary.sourceVideosModified);

  const gates = new Map((gateRegistry.gates ?? []).map((gate) => [gate.id, gate]));
  const ownerCaptureGate = gates.get("OWNER_CAPTURES_COMPLETE");
  if (ownerMediaBaselineLock.decisionID === "OWNER_MEDIA_BASELINE_LOCKED" && ownerCaptureGate?.status === "BLOCKED_OWNER") {
    errors.push("OWNER_CAPTURES_COMPLETE cannot remain BLOCKED_OWNER after the owner media baseline is locked.");
  }
}

function checkGateStatus(errors, checks, gates, gateID, validate) {
  const gate = gates.get(gateID);
  if (!gate) return;
  checks.push({ name: `gate:${gateID}`, status: gate.status });
  const error = validate(gate.status);
  if (error) errors.push(error);
}

function isReadyStatus(status) {
  return ["READY", "COMPLETE", "APPROVED", "READY_WITH_LIMITATIONS"].includes(String(status));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function cliValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}
