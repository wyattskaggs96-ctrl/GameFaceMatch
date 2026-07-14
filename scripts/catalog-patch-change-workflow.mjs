#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compareCatalogVersions } from "./catalog-tools.mjs";

const defaultOutputDirectory = "data/catalog/patch-change-reports";

export function buildPatchChangeWorkflow({
  previousManifest,
  nextManifest,
  newGameVersion,
  newPatchVersion,
  observedAt = new Date().toISOString()
}) {
  const comparison = compareCatalogVersions(previousManifest, nextManifest);
  const categoryTotals = categoryTotalRows(nextManifest);
  const changedRecordIDs = Array.from(new Set(comparison.affectedRecords.map((record) => record.stableInternalID))).sort();
  const compatibilityGuard = createCompatibilityGuard({ comparison, newGameVersion, newPatchVersion });
  return {
    schemaVersion: "catalog-patch-change-workflow-v1",
    generatedAt: observedAt,
    updateContext: {
      previousCatalogVersionID: comparison.previousCatalogVersionID,
      nextCatalogVersionID: comparison.nextCatalogVersionID,
      previousGameVersion: previousManifest?.catalogVersion?.gameVersion ?? null,
      nextGameVersion: newGameVersion ?? nextManifest?.catalogVersion?.gameVersion ?? null,
      previousPatchVersion: comparison.previousPatchVersion,
      nextPatchVersion: newPatchVersion ?? comparison.nextPatchVersion
    },
    categoryTotals,
    firstMiddleFinalChanges: comparison.firstMiddleFinalChanges,
    nativeOrderChanges: comparison.nativeOrderChanges,
    visualAssetChanges: comparison.changedVisualAssets,
    countPreservingVisualChanges: comparison.countPreservingVisualChanges,
    affectedRecords: comparison.affectedRecords,
    requiredReverification: comparison.requiredReverification.map((task) => ({
      ...task,
      status: "REVERIFICATION_REQUIRED"
    })),
    recommendedRecaptureQueue: comparison.recommendedRecaptureQueue,
    compatibilityGuard,
    priorSnapshotPolicy: {
      preserved: true,
      snapshotFileName: "prior_catalog_snapshot.json",
      note: "The previous manifest is copied byte-for-byte into the workflow output directory. Do not edit historical catalog releases silently."
    },
    diff: comparison
  };
}

export function writePatchChangeWorkflowFiles({ previousManifest, nextManifest, outputDirectory, newGameVersion, newPatchVersion, observedAt }) {
  const workflow = buildPatchChangeWorkflow({ previousManifest, nextManifest, newGameVersion, newPatchVersion, observedAt });
  fs.mkdirSync(outputDirectory, { recursive: true });
  const files = [
    {
      name: "prior_catalog_snapshot.json",
      content: `${JSON.stringify(previousManifest, null, 2)}\n`
    },
    {
      name: "patch_change_report.json",
      content: `${JSON.stringify(workflow, null, 2)}\n`
    },
    {
      name: "patch_change_report.md",
      content: formatPatchChangeMarkdown(workflow)
    },
    {
      name: "affected_records.csv",
      content: recordsToCsv(workflow.affectedRecords, ["stableInternalID", "category", "reason", "severity", "sourceChangeSet"])
    },
    {
      name: "reverification_queue.csv",
      content: recordsToCsv(workflow.requiredReverification, ["stableInternalID", "category", "reason", "severity", "status", "requiredAction"])
    },
    {
      name: "compatibility_guard.json",
      content: `${JSON.stringify(workflow.compatibilityGuard, null, 2)}\n`
    }
  ];
  for (const file of files) {
    fs.writeFileSync(path.join(outputDirectory, file.name), file.content);
  }
  return { workflow, files: files.map((file) => path.join(outputDirectory, file.name)) };
}

function createCompatibilityGuard({ comparison, newGameVersion, newPatchVersion }) {
  const patchChanged = Boolean(newPatchVersion && comparison.previousPatchVersion && newPatchVersion !== comparison.previousPatchVersion)
    || Boolean(comparison.nextPatchVersion && comparison.previousPatchVersion && comparison.nextPatchVersion !== comparison.previousPatchVersion);
  const hasBlockingChanges = comparison.affectedRecords.some((record) => record.severity === "blocking");
  const recommendationsBlocked = patchChanged || hasBlockingChanges || comparison.requiredReverification.length > 0;
  return {
    recommendationsBlocked,
    compatibleForRecommendations: !recommendationsBlocked,
    gameVersion: newGameVersion ?? null,
    patchVersion: newPatchVersion ?? comparison.nextPatchVersion,
    reasons: recommendationsBlocked
      ? [
          patchChanged ? "Game patch changed; affected records require review before recommendations can use this catalog." : null,
          hasBlockingChanges ? "Blocking catalog changes were detected." : null,
          comparison.requiredReverification.length > 0 ? "Changed records require re-verification." : null
        ].filter(Boolean)
      : ["No blocking catalog changes detected by the patch workflow."],
    requiredBeforeEnablement: [
      "Recount affected category totals.",
      "Confirm first, middle, and final values from direct evidence.",
      "Confirm native order continuity.",
      "Compare visual assets and count-preserving visual changes.",
      "Re-verify changed records with second-person review.",
      "Publish a new immutable approved catalog release before recommendations are enabled."
    ]
  };
}

function categoryTotalRows(manifest) {
  const groups = new Map();
  for (const item of manifest?.items ?? []) {
    const category = item?.category || "uncategorized";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  }
  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, items]) => ({
      category,
      total: items.length,
      firstValue: items[0]?.stableInternalID ?? null,
      middleValue: items[Math.floor((items.length - 1) / 2)]?.stableInternalID ?? null,
      finalValue: items[items.length - 1]?.stableInternalID ?? null
    }));
}

function formatPatchChangeMarkdown(workflow) {
  return [
    "# Catalog Patch-Change Report",
    "",
    `Generated: ${workflow.generatedAt}`,
    "",
    "## Update Context",
    "",
    `- Previous catalog: ${workflow.updateContext.previousCatalogVersionID}`,
    `- Next catalog: ${workflow.updateContext.nextCatalogVersionID}`,
    `- New game version: ${workflow.updateContext.nextGameVersion ?? "UNKNOWN"}`,
    `- New patch: ${workflow.updateContext.nextPatchVersion ?? "UNKNOWN"}`,
    "",
    "## Recommendation Gate",
    "",
    `- Compatible for recommendations: ${workflow.compatibilityGuard.compatibleForRecommendations ? "yes" : "no"}`,
    `- Recommendations blocked: ${workflow.compatibilityGuard.recommendationsBlocked ? "yes" : "no"}`,
    "",
    "## Summary",
    "",
    `- Category totals recounted: ${workflow.categoryTotals.length}`,
    `- Affected records: ${workflow.affectedRecords.length}`,
    `- Required re-verification tasks: ${workflow.requiredReverification.length}`,
    `- Count-preserving visual changes: ${workflow.countPreservingVisualChanges.length}`,
    "",
    "## Required Before Enablement",
    "",
    ...workflow.compatibilityGuard.requiredBeforeEnablement.map((item) => `- ${item}`),
    "",
    "This report is audit guidance only. It does not verify, publish, repair, rename, or invent catalog records."
  ].join("\n");
}

function recordsToCsv(records, columns) {
  const lines = [columns.join(",")];
  for (const record of records) {
    lines.push(columns.map((column) => csvEscape(record?.[column] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function csvEscape(value) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseArgs(argv) {
  const options = {
    previousPath: argv[0],
    nextPath: argv[1],
    outputDirectory: defaultOutputDirectory,
    newGameVersion: null,
    newPatchVersion: null
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out") options.outputDirectory = argv[++index];
    else if (arg === "--game-version") options.newGameVersion = argv[++index];
    else if (arg === "--patch") options.newPatchVersion = argv[++index];
  }
  return options;
}

function runCLI(argv) {
  const options = parseArgs(argv);
  if (!options.previousPath || !options.nextPath) {
    console.error("Usage: node scripts/catalog-patch-change-workflow.mjs <previous-manifest.json> <next-manifest.json> [--out output-directory] [--game-version value] [--patch value]");
    return 1;
  }
  const previousManifest = JSON.parse(fs.readFileSync(options.previousPath, "utf8"));
  const nextManifest = JSON.parse(fs.readFileSync(options.nextPath, "utf8"));
  const { workflow, files } = writePatchChangeWorkflowFiles({
    previousManifest,
    nextManifest,
    outputDirectory: options.outputDirectory,
    newGameVersion: options.newGameVersion,
    newPatchVersion: options.newPatchVersion
  });
  console.log(`Catalog patch-change workflow written to ${options.outputDirectory}`);
  console.log(`Recommendations blocked: ${workflow.compatibilityGuard.recommendationsBlocked ? "yes" : "no"}`);
  for (const file of files) console.log(file);
  return 0;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  process.exitCode = runCLI(process.argv.slice(2));
}
