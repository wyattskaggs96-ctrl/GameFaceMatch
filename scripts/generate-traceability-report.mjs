#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const matrixPath = path.join(repositoryRoot, "data", "traceability", "requirements.json");
const checkOnly = process.argv.includes("--check");

const matrix = readMatrix();
validateMatrix(matrix);
const report = renderReport(matrix);
const reportPath = path.join(repositoryRoot, matrix.metadata.generatedReport);

if (checkOnly) {
  const current = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, "utf8") : "";
  if (current !== report) {
    console.error(`Traceability report is out of date: ${matrix.metadata.generatedReport}`);
    console.error("Run: node scripts/generate-traceability-report.mjs");
    process.exit(1);
  }
  console.log("Traceability report is current");
} else {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);
  console.log(`Generated ${matrix.metadata.generatedReport}`);
}

function readMatrix() {
  return JSON.parse(fs.readFileSync(matrixPath, "utf8"));
}

function validateMatrix(input) {
  const allowedStatuses = new Set(input.metadata?.statusValues ?? []);
  const requiredFields = [
    "id",
    "source",
    "section",
    "summary",
    "owningModule",
    "implementationFiles",
    "testFiles",
    "status",
    "evidence",
    "blocker",
    "owner",
    "lastCheckedDate"
  ];
  if (!input.metadata?.generatedReport) fail("metadata.generatedReport is required.");
  if (!Array.isArray(input.requirements) || input.requirements.length === 0) fail("requirements must be a non-empty array.");
  const seen = new Set();
  for (const requirement of input.requirements) {
    for (const field of requiredFields) {
      if (!(field in requirement)) fail(`${requirement.id ?? "unknown"} is missing required field: ${field}`);
    }
    if (seen.has(requirement.id)) fail(`Duplicate requirement ID: ${requirement.id}`);
    seen.add(requirement.id);
    if (!allowedStatuses.has(requirement.status)) fail(`${requirement.id} has invalid status: ${requirement.status}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requirement.lastCheckedDate)) fail(`${requirement.id} has invalid lastCheckedDate.`);
    for (const field of ["implementationFiles", "testFiles"]) {
      if (!Array.isArray(requirement[field])) fail(`${requirement.id}.${field} must be an array.`);
    }
  }
}

function renderReport(input) {
  const requirements = [...input.requirements].sort((first, second) => first.id.localeCompare(second.id));
  const counts = input.metadata.statusValues.map((status) => ({
    status,
    count: requirements.filter((requirement) => requirement.status === status).length
  }));
  const lines = [
    "# Requirement Traceability Matrix",
    "",
    "Generated from `data/traceability/requirements.json`. Do not edit this report by hand.",
    "",
    `Matrix version: ${input.metadata.version}`,
    `Last checked: ${input.metadata.lastCheckedDate}`,
    "",
    "## Status Summary",
    "",
    "| Status | Count |",
    "| --- | ---: |",
    ...counts.map((item) => `| ${item.status} | ${item.count} |`),
    "",
    "## Requirements",
    "",
    "| ID | Source / Section | Summary | Owner | Status | Evidence | Blocker | Implementation | Tests | Last checked |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...requirements.map((requirement) =>
      [
        requirement.id,
        `${requirement.source}<br>${requirement.section}`,
        requirement.summary,
        requirement.owner,
        requirement.status,
        requirement.evidence,
        requirement.blocker || "None",
        formatPaths(requirement.implementationFiles),
        formatPaths(requirement.testFiles),
        requirement.lastCheckedDate
      ]
        .map(escapeCell)
        .join(" | ")
        .replace(/^/, "| ")
        .replace(/$/, " |")
    ),
    ""
  ];
  return `${lines.join("\n")}`;
}

function formatPaths(paths) {
  return paths.length > 0 ? paths.map((file) => `\`${file}\``).join("<br>") : "None";
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
