#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultStatusPath = "docs/status/CURRENT_PROJECT_STATE.md";

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

  return {
    ok: errors.length === 0,
    errors,
    checks,
    assertions,
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function cliValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

