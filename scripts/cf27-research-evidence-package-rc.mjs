#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_RESEARCH_EVIDENCE_PACKAGE_RC_SCHEMA_VERSION = "cf27-research-evidence-package-rc-v1";

export const defaultJsonOutputPath = "data/phase-zero/research_evidence_package_manifest.json";
export const defaultCsvOutputPath = "data/phase-zero/research_evidence_package_manifest.csv";
export const defaultPathResolutionOutputPath = "data/phase-zero/research_evidence_path_resolution.json";
export const defaultReportOutputPath = "docs/phase-zero/RESEARCH_EVIDENCE_PACKAGE_MANIFEST.md";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deterministicGeneratedAt = "2026-07-14T02:45:00-04:00";

const catalogArtifacts = [
  "data/phase-zero/heads.research.json",
  "data/phase-zero/additional_attributes.research.json",
  "data/phase-zero/detailed_facial_controls.research.json",
  "data/phase-zero/body_controls.research.json",
  "data/phase-zero/hairstyles.research.json",
  "data/phase-zero/hair_colors.research.json",
  "data/phase-zero/facial_hair.research.json",
  "data/phase-zero/facial_hair_colors.research.json"
];

const csvColumns = [
  "check",
  "status",
  "blocking",
  "warnings",
  "details"
];

export function generateResearchEvidencePackageManifest({
  root = repositoryRoot,
  generatedAt = deterministicGeneratedAt
} = {}) {
  const normalizedRoot = path.resolve(root);
  const inventory = readJSON(path.join(normalizedRoot, "data/phase-zero/video_inventory.json"));
  const evidenceManifest = readJSON(path.join(normalizedRoot, "data/phase-zero/evidence_manifest.json"));
  const captureLog = readJSON(path.join(normalizedRoot, "data/phase-zero/capture_log.json"));
  const issuesRegister = readJSON(path.join(normalizedRoot, "data/phase-zero/issues_register.research.json"));
  const videos = inventory.inventory ?? [];
  const evidenceEntries = evidenceManifest.entries ?? [];
  const evidenceByID = new Map(evidenceEntries.map((entry) => [entry.evidence_id, entry]));
  const evidenceByPath = new Map(evidenceEntries.map((entry) => [entry.relative_path, entry]));
  const inventoryByCanonical = new Map(videos.map((video) => [video.canonicalFilename, video]));
  const inventoryByPortablePath = new Map(videos.map((video) => [video.sourceLocation?.portableRelativeEvidencePath, video]));
  const sourceMasterEntries = evidenceEntries.filter((entry) => entry.master_or_derivative === "master");
  const derivativeEntries = evidenceEntries.filter((entry) => entry.master_or_derivative === "derivative");
  const checks = [];
  const blockers = [];
  const warnings = [];

  const masterInventory = videos.map((video) => summarizeMaster(video, sourceMasterEntries));
  const derivativeInventory = derivativeEntries.map((entry) => summarizeDerivative(entry, inventoryByCanonical));
  const duplicateEvidence = summarizeDuplicates(videos);
  const pathResolution = validatePathResolution({
    root: normalizedRoot,
    masterInventory,
    derivativeInventory,
    evidenceEntries
  });
  const catalogEvidenceLinks = validateCatalogEvidenceLinks({
    root: normalizedRoot,
    evidenceByID,
    evidenceByPath
  });
  const captureLogCheck = validateCaptureLog(captureLog, videos, evidenceByID);
  const issueLinkCheck = validateIssues(issuesRegister);
  const masterCheck = validateMasters(masterInventory, sourceMasterEntries);
  const derivativeCheck = validateDerivatives(derivativeInventory);
  const duplicateCheck = {
    check: "duplicateEvidenceDocumented",
    status: "passed",
    blocking: 0,
    warnings: 0,
    details: `${duplicateEvidence.exactDuplicateGroups.length} exact duplicate group(s) documented in video inventory.`
  };

  checks.push(
    masterCheck,
    derivativeCheck,
    pathResolution.summaryCheck,
    duplicateCheck,
    catalogEvidenceLinks.summaryCheck,
    captureLogCheck.summaryCheck,
    issueLinkCheck.summaryCheck
  );

  for (const check of checks) {
    if (check.blocking > 0) blockers.push(`${check.check}: ${check.blocking} blocking issue(s).`);
    if (check.warnings > 0) warnings.push(`${check.check}: ${check.warnings} warning(s).`);
  }

  const releaseCandidateStatus = blockers.length === 0
    ? "PASS_RESEARCH_PACKAGE_RC_PATH_RESOLUTION"
    : "BLOCKED_RESEARCH_PACKAGE_RC";

  return {
    schemaVersion: CF27_RESEARCH_EVIDENCE_PACKAGE_RC_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PHASE_ZERO_RESEARCH_EVIDENCE_PACKAGE_RELEASE_CANDIDATE",
    sourceType: "shippingGameVideoResearch",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "OBSERVED_PENDING_VERIFICATION",
    productionRecommendationsEnabled: false,
    releaseCandidateStatus,
    packagePolicy: {
      sourceMastersPreservedUnchanged: true,
      sourceMastersCommittedToRepository: false,
      sourceMasterReferenceRoot: "OWNER_DOWNLOADS",
      derivativesMustReferenceMaster: true,
      derivativesMustRecordSourceTimestamp: true,
      absoluteLocalPathMayNotBeSoleReference: true,
      missingFilesBlockReleaseCandidate: true,
      researchCandidatesMayNotReachProductionRecommendations: true
    },
    sourceArtifacts: {
      videoInventory: "data/phase-zero/video_inventory.json",
      evidenceManifest: "data/phase-zero/evidence_manifest.json",
      captureLog: "data/phase-zero/capture_log.json",
      issuesRegister: "data/phase-zero/issues_register.research.json",
      catalogArtifacts
    },
    summary: {
      sourceMastersInInventory: masterInventory.length,
      uniqueSourceMastersInEvidenceManifest: sourceMasterEntries.length,
      derivativeEvidenceEntries: derivativeInventory.length,
      exactDuplicateSourceFilesDocumented: duplicateEvidence.exactDuplicateFileCount,
      catalogRowsChecked: catalogEvidenceLinks.rowsChecked,
      catalogRowsWithInvalidEvidence: catalogEvidenceLinks.invalidRows.length,
      captureLogEvents: captureLogCheck.eventsChecked,
      captureLogChronological: captureLogCheck.isChronological,
      issueCount: issueLinkCheck.issuesChecked,
      issuesWithoutLinks: issueLinkCheck.unlinkedIssues.length,
      pathResolutionEntriesChecked: pathResolution.entriesChecked,
      missingResolvedFiles: pathResolution.missingFiles.length,
      blockingIssueCount: checks.reduce((total, check) => total + check.blocking, 0),
      warningCount: checks.reduce((total, check) => total + check.warnings, 0)
    },
    checks,
    masterInventory,
    derivativeInventory,
    duplicateEvidence,
    pathResolution,
    catalogEvidenceLinks,
    captureLogCheck,
    issueLinkCheck,
    blockers,
    warnings
  };
}

export function writeResearchEvidencePackageManifest(manifest, {
  root = repositoryRoot,
  jsonOutputPath = defaultJsonOutputPath,
  csvOutputPath = defaultCsvOutputPath,
  pathResolutionOutputPath = defaultPathResolutionOutputPath,
  reportOutputPath = defaultReportOutputPath
} = {}) {
  writeTextFile(root, jsonOutputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeTextFile(root, csvOutputPath, formatResearchEvidencePackageCSV(manifest));
  writeTextFile(root, pathResolutionOutputPath, `${JSON.stringify({
    schemaVersion: `${CF27_RESEARCH_EVIDENCE_PACKAGE_RC_SCHEMA_VERSION}-path-resolution`,
    generatedAt: manifest.generatedAt,
    productionStatus: manifest.productionStatus,
    releaseCandidateStatus: manifest.releaseCandidateStatus,
    summary: manifest.pathResolution.summary,
    records: manifest.pathResolution.records,
    missingFiles: manifest.pathResolution.missingFiles,
    unsafePaths: manifest.pathResolution.unsafePaths
  }, null, 2)}\n`);
  writeTextFile(root, reportOutputPath, formatResearchEvidencePackageReport(manifest));
}

export function formatResearchEvidencePackageCSV(manifest) {
  const rows = [csvColumns.join(",")];
  for (const check of manifest.checks) {
    rows.push(csvColumns.map((column) => csvEscape(check[column] ?? "")).join(","));
  }
  return `${rows.join("\n")}\n`;
}

export function formatResearchEvidencePackageReport(manifest) {
  const lines = [
    "# Research Evidence Package Manifest",
    "",
    "**Status:** Phase 0 research evidence package release candidate",
    "**Production status:** NOT PRODUCTION DATA",
    "**Verification status:** OBSERVED_PENDING_VERIFICATION",
    "",
    "This package is a local research-evidence integrity checkpoint. It does not approve a production catalog and does not enable user-facing College Football 27 recommendations.",
    "",
    "## Summary",
    "",
    `- Generated at: ${manifest.generatedAt}`,
    `- Release-candidate status: ${manifest.releaseCandidateStatus}`,
    `- Source masters in inventory: ${manifest.summary.sourceMastersInInventory}`,
    `- Unique source masters in canonical evidence manifest: ${manifest.summary.uniqueSourceMastersInEvidenceManifest}`,
    `- Derivative evidence entries: ${manifest.summary.derivativeEvidenceEntries}`,
    `- Exact duplicate source files documented: ${manifest.summary.exactDuplicateSourceFilesDocumented}`,
    `- Catalog rows checked: ${manifest.summary.catalogRowsChecked}`,
    `- Catalog rows with invalid evidence: ${manifest.summary.catalogRowsWithInvalidEvidence}`,
    `- Missing resolved files: ${manifest.summary.missingResolvedFiles}`,
    `- Capture log chronological: ${manifest.summary.captureLogChronological ? "yes" : "no"}`,
    `- Issues without links: ${manifest.summary.issuesWithoutLinks}`,
    `- Blocking issue count: ${manifest.summary.blockingIssueCount}`,
    "",
    "## Generated Artifacts",
    "",
    `- JSON manifest: \`${defaultJsonOutputPath}\``,
    `- CSV check summary: \`${defaultCsvOutputPath}\``,
    `- Path-resolution report: \`${defaultPathResolutionOutputPath}\``,
    "",
    "## Integrity Checks",
    ""
  ];

  for (const check of manifest.checks) {
    lines.push(`- ${check.status.toUpperCase()} ${check.check}: ${check.details}`);
  }

  lines.push(
    "",
    "## Duplicate Evidence",
    ""
  );

  if (manifest.duplicateEvidence.exactDuplicateGroups.length === 0) {
    lines.push("- No exact duplicate source files are documented in the current inventory.");
  } else {
    for (const group of manifest.duplicateEvidence.exactDuplicateGroups) {
      lines.push(`- ${group.duplicateInventoryId} is documented as an exact duplicate of ${group.duplicateOfInventoryId}; original filename: ${group.originalFilename}.`);
    }
  }

  lines.push(
    "",
    "## Blocking Items",
    ""
  );

  if (manifest.blockers.length === 0) {
    lines.push("- No blocking path-resolution, catalog-link, capture-log, or issue-link failures were found.");
  } else {
    for (const blocker of manifest.blockers) lines.push(`- ${blocker}`);
  }

  lines.push(
    "",
    "## Production Gate",
    "",
    "- Production recommendations remain disabled.",
    "- Current records are research candidates only.",
    "- Second-person verification and catalog-manager approval have not occurred."
  );

  return `${lines.join("\n")}\n`;
}

function summarizeMaster(video, sourceMasterEntries) {
  const matchingEvidenceEntry = sourceMasterEntries.find((entry) => {
    return entry.video_id === video.inventoryId ||
      entry.source_video === video.canonicalFilename ||
      entry.relative_path === video.sourceLocation?.portableRelativeEvidencePath;
  }) ?? null;
  return {
    inventoryId: video.inventoryId,
    originalFilename: video.originalFilename,
    canonicalFilename: video.canonicalFilename,
    portableRelativeEvidencePath: video.sourceLocation?.portableRelativeEvidencePath ?? null,
    sha256: video.sha256,
    fileSizeBytes: video.fileSizeBytes,
    mediaContainer: video.mediaContainer,
    mimeType: matchingEvidenceEntry?.mime_type ?? mimeTypeForVideo(video),
    durationSeconds: video.durationSeconds,
    dimensions: video.dimensions,
    frameRate: video.frameRate,
    fileOpenStatus: video.fileOpenStatus,
    preservationStatus: video.preservationStatus,
    exactDuplicate: Boolean(video.exactDuplicate),
    duplicateOfInventoryId: video.exactDuplicateOf ?? null,
    evidenceManifestEntryID: matchingEvidenceEntry?.evidence_id ?? null,
    evidenceManifestSha256: matchingEvidenceEntry?.sha256 ?? null,
    evidenceManifestSizeBytes: matchingEvidenceEntry?.size_bytes ?? null,
    hasPortableRelativeReference: Boolean(video.sourceLocation?.portableRelativeEvidencePath),
    hasSha256: isSha256(video.sha256),
    hasFileSize: Number.isFinite(video.fileSizeBytes) && video.fileSizeBytes > 0,
    hasMediaType: Boolean(video.mediaContainer || matchingEvidenceEntry?.mime_type),
    preservedUnchangedByInventory: video.preservationStatus === "master_preserved_unchanged",
    productionUseStatus: video.productionUseStatus
  };
}

function summarizeDerivative(entry, inventoryByCanonical) {
  const sourceMaster = inventoryByCanonical.get(entry.source_video) ?? null;
  return {
    evidenceID: entry.evidence_id,
    relativePath: entry.relative_path,
    fileRole: entry.file_role,
    sha256: entry.sha256,
    sizeBytes: entry.size_bytes,
    mimeType: entry.mime_type,
    sourceVideo: entry.source_video,
    sourceInventoryId: sourceMaster?.inventoryId ?? null,
    sourceMasterPortablePath: sourceMaster?.sourceLocation?.portableRelativeEvidencePath ?? null,
    sourceMasterSha256: sourceMaster?.sha256 ?? null,
    timestamp: entry.timestamp,
    verificationState: entry.verification_state,
    catalogReferences: {
      headResearchCatalogID: entry.headResearchCatalogID ?? null,
      additionalAttributeResearchCatalogID: entry.additionalAttributeResearchCatalogID ?? null
    },
    hasMasterReference: Boolean(sourceMaster),
    hasSourceTimestamp: typeof entry.timestamp === "number",
    hasSha256: isSha256(entry.sha256),
    hasFileSize: Number.isFinite(entry.size_bytes) && entry.size_bytes > 0,
    hasMediaType: Boolean(entry.mime_type)
  };
}

function validateMasters(masterInventory, sourceMasterEntries) {
  let blocking = 0;
  let warnings = 0;
  for (const master of masterInventory) {
    if (!master.hasPortableRelativeReference || !master.hasSha256 || !master.hasFileSize || !master.hasMediaType) blocking += 1;
    if (!master.preservedUnchangedByInventory) warnings += 1;
    if (master.evidenceManifestEntryID && (master.sha256 !== master.evidenceManifestSha256 || master.fileSizeBytes !== master.evidenceManifestSizeBytes)) {
      blocking += 1;
    }
  }
  const sourceMasterReferenceCount = sourceMasterEntries.length;
  return {
    check: "sourceMastersPreservedAndHashed",
    status: blocking === 0 ? "passed" : "failed",
    blocking,
    warnings,
    details: `${masterInventory.length} source inventory master(s) checked; ${sourceMasterReferenceCount} unique master reference(s) in canonical evidence manifest.`
  };
}

function validateDerivatives(derivativeInventory) {
  const blocking = derivativeInventory.filter((entry) => {
    return !entry.hasMasterReference || !entry.hasSourceTimestamp || !entry.hasSha256 || !entry.hasFileSize || !entry.hasMediaType;
  }).length;
  return {
    check: "derivativesHaveMasterTimestampAndMetadata",
    status: blocking === 0 ? "passed" : "failed",
    blocking,
    warnings: 0,
    details: `${derivativeInventory.length} derivative evidence entry/entries checked for master linkage, source timestamp, checksum, file size, and MIME type.`
  };
}

function validatePathResolution({ root, masterInventory, derivativeInventory, evidenceEntries }) {
  const records = [];
  const missingFiles = [];
  const unsafePaths = [];
  for (const master of masterInventory) {
    const pathStatus = validatePortablePath(master.portableRelativeEvidencePath);
    const record = {
      id: master.inventoryId,
      kind: "master",
      relativePath: master.portableRelativeEvidencePath,
      pathStatus: pathStatus.ok ? "portable_external_master_reference" : "unsafe_path",
      fileResolutionStatus: "external_owner_master_reference_not_repository_file",
      sha256: master.sha256,
      sizeBytes: master.fileSizeBytes,
      note: "Source masters are preserved outside the repository; the release candidate stores portable OWNER_DOWNLOADS references plus checksums."
    };
    records.push(record);
    if (!pathStatus.ok) unsafePaths.push({ id: master.inventoryId, relativePath: master.portableRelativeEvidencePath, reason: pathStatus.reason });
  }
  for (const derivative of derivativeInventory) {
    const pathStatus = validatePortablePath(derivative.relativePath);
    const absolutePath = path.resolve(root, derivative.relativePath ?? "");
    const underRoot = absolutePath === root || absolutePath.startsWith(`${root}${path.sep}`);
    const exists = pathStatus.ok && underRoot && fs.existsSync(absolutePath);
    const stat = exists ? fs.statSync(absolutePath) : null;
    const record = {
      id: derivative.evidenceID,
      kind: "derivative",
      relativePath: derivative.relativePath,
      pathStatus: pathStatus.ok && underRoot ? "portable_repository_relative_path" : "unsafe_path",
      fileResolutionStatus: exists ? "resolved" : "missing_blocking",
      expectedSizeBytes: derivative.sizeBytes,
      actualSizeBytes: stat?.size ?? null,
      sourceMasterPortablePath: derivative.sourceMasterPortablePath,
      sourceTimestamp: derivative.timestamp
    };
    records.push(record);
    if (!pathStatus.ok || !underRoot) unsafePaths.push({ id: derivative.evidenceID, relativePath: derivative.relativePath, reason: pathStatus.reason ?? "path escapes repository root" });
    if (!exists) missingFiles.push({ id: derivative.evidenceID, relativePath: derivative.relativePath, kind: "derivative" });
  }
  const absoluteOnlyEvidenceEntries = evidenceEntries.filter((entry) => {
    return containsAbsoluteLocalPath(entry) && !validatePortablePath(entry.relative_path).ok;
  });
  const blocking = missingFiles.length + unsafePaths.length + absoluteOnlyEvidenceEntries.length;
  return {
    summary: {
      entriesChecked: records.length,
      resolvedRepositoryDerivativeFiles: records.filter((record) => record.fileResolutionStatus === "resolved").length,
      externalMasterReferences: records.filter((record) => record.fileResolutionStatus === "external_owner_master_reference_not_repository_file").length,
      missingFiles: missingFiles.length,
      unsafePaths: unsafePaths.length,
      absoluteOnlyEvidenceEntries: absoluteOnlyEvidenceEntries.length
    },
    summaryCheck: {
      check: "completePathResolution",
      status: blocking === 0 ? "passed" : "failed",
      blocking,
      warnings: 0,
      details: `${records.length} path reference(s) checked; ${missingFiles.length} missing file(s), ${unsafePaths.length} unsafe path(s), ${absoluteOnlyEvidenceEntries.length} absolute-only evidence entry/entries.`
    },
    entriesChecked: records.length,
    records,
    missingFiles,
    unsafePaths,
    absoluteOnlyEvidenceEntries: absoluteOnlyEvidenceEntries.map((entry) => entry.evidence_id)
  };
}

function validateCatalogEvidenceLinks({ root, evidenceByID, evidenceByPath }) {
  const invalidRows = [];
  const validRows = [];
  let rowsChecked = 0;
  for (const artifactPath of catalogArtifacts) {
    const absolutePath = path.join(root, artifactPath);
    if (!fs.existsSync(absolutePath)) continue;
    const artifact = readJSON(absolutePath);
    const records = artifact.records ?? [];
    for (const record of records) {
      rowsChecked += 1;
      const recordID = record.stableResearchCatalogID ?? record.detailedControlID ?? record.stableResearchID ?? record.catalogID ?? `${artifactPath}#${rowsChecked}`;
      const evidenceIDs = [...new Set(collectEvidenceIDs(record))];
      const evidencePaths = [...new Set(collectEvidencePaths(record))];
      const missingIDs = evidenceIDs.filter((id) => !evidenceByID.has(id));
      const missingPaths = evidencePaths.filter((relativePath) => !evidenceByPath.has(relativePath) && !fs.existsSync(path.join(root, relativePath)));
      const hasEvidence = evidenceIDs.length > 0 || evidencePaths.length > 0;
      if (!hasEvidence || missingIDs.length > 0 || missingPaths.length > 0) {
        invalidRows.push({ artifactPath, recordID, missingIDs, missingPaths, hasEvidence });
      } else {
        validRows.push({ artifactPath, recordID, evidenceIDs, evidencePaths });
      }
    }
  }
  return {
    rowsChecked,
    validRows,
    invalidRows,
    summaryCheck: {
      check: "catalogRowsPointToValidEvidence",
      status: invalidRows.length === 0 ? "passed" : "failed",
      blocking: invalidRows.length,
      warnings: 0,
      details: `${rowsChecked} catalog row(s) checked across canonical research catalogs; ${invalidRows.length} invalid evidence linkage row(s).`
    }
  };
}

function validateCaptureLog(captureLog, videos, evidenceByID) {
  const events = captureLog.events ?? [];
  const videoOrder = new Map(videos.map((video, index) => [video.inventoryId, index]));
  const outOfOrder = [];
  const missingGeneratedEvidence = [];
  let previousKey = null;
  for (const event of events) {
    const key = [
      videoOrder.get(event.video_id) ?? Number.MAX_SAFE_INTEGER,
      Number.isFinite(event.start_timestamp) ? event.start_timestamp : Number.MAX_SAFE_INTEGER,
      Number.isFinite(event.end_timestamp) ? event.end_timestamp : Number.MAX_SAFE_INTEGER,
      event.capture_event_id ?? ""
    ];
    if (previousKey && compareTuple(previousKey, key) > 0) outOfOrder.push(event.capture_event_id);
    previousKey = key;
    for (const evidenceID of event.evidence_generated ?? []) {
      if (!evidenceByID.has(evidenceID)) missingGeneratedEvidence.push({ captureEventID: event.capture_event_id, evidenceID });
    }
  }
  const blocking = outOfOrder.length + missingGeneratedEvidence.length;
  return {
    eventsChecked: events.length,
    isChronological: outOfOrder.length === 0,
    outOfOrder,
    missingGeneratedEvidence,
    summaryCheck: {
      check: "captureLogChronologicalAndEvidenceLinked",
      status: blocking === 0 ? "passed" : "failed",
      blocking,
      warnings: 0,
      details: `${events.length} capture event(s) checked; ${outOfOrder.length} out of chronological order, ${missingGeneratedEvidence.length} missing generated evidence reference(s).`
    }
  };
}

function validateIssues(issuesRegister) {
  const issues = issuesRegister.issues ?? [];
  const unlinkedIssues = issues.filter((issue) => {
    return !(
      nonEmptyArray(issue.affectedRecordIDs) ||
      nonEmptyArray(issue.affectedEvidenceFileIDs) ||
      nonEmptyArray(issue.relatedIssueIDs) ||
      issue.recaptureRequest
    );
  });
  return {
    issuesChecked: issues.length,
    unlinkedIssues: unlinkedIssues.map((issue) => issue.issueID),
    summaryCheck: {
      check: "issuesAndExceptionsLinked",
      status: unlinkedIssues.length === 0 ? "passed" : "failed",
      blocking: unlinkedIssues.length,
      warnings: 0,
      details: `${issues.length} issue(s) checked; ${unlinkedIssues.length} issue(s) lack affected records, affected evidence, related issues, or a recapture request.`
    }
  };
}

function summarizeDuplicates(videos) {
  const exactDuplicateGroups = videos
    .filter((video) => video.exactDuplicate)
    .map((video) => ({
      duplicateInventoryId: video.inventoryId,
      duplicateOfInventoryId: video.exactDuplicateOf,
      originalFilename: video.originalFilename,
      canonicalFilename: video.canonicalFilename,
      sha256: video.sha256
    }));
  return {
    exactDuplicateFileCount: exactDuplicateGroups.length,
    exactDuplicateGroups,
    hashGroups: [...groupBy(videos, (video) => video.sha256).entries()]
      .filter(([, group]) => group.length > 1)
      .map(([sha256, group]) => ({
        sha256,
        inventoryIds: group.map((video) => video.inventoryId),
        originalFilenames: group.map((video) => video.originalFilename)
      }))
  };
}

function collectEvidenceIDs(value) {
  const ids = [];
  visit(value, (key, child) => {
    if (/evidenceID$|evidence_id$/i.test(key) && typeof child === "string") ids.push(child);
    if (key === "evidence_generated" && Array.isArray(child)) {
      for (const item of child) if (typeof item === "string") ids.push(item);
    }
  });
  return ids;
}

function collectEvidencePaths(value) {
  const paths = [];
  visit(value, (key, child) => {
    if (typeof child !== "string") return;
    if (/evidenceFramePath$|frameManifestPath$|relativePath$|path$/i.test(key) && child.startsWith("data/")) paths.push(child);
  });
  return paths;
}

function visit(value, callback, key = "") {
  if (Array.isArray(value)) {
    for (const item of value) visit(item, callback, key);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [childKey, child] of Object.entries(value)) {
    callback(childKey, child);
    visit(child, callback, childKey);
  }
}

function validatePortablePath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.trim() === "") return { ok: false, reason: "missing path" };
  if (path.isAbsolute(relativePath)) return { ok: false, reason: "absolute path" };
  if (/^[a-zA-Z]:[\\/]/.test(relativePath)) return { ok: false, reason: "windows absolute path" };
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(relativePath)) return { ok: false, reason: "url path" };
  if (relativePath.includes("\0")) return { ok: false, reason: "null byte" };
  if (relativePath.includes("\\")) return { ok: false, reason: "backslash path separator" };
  if (relativePath.split("/").some((segment) => segment === "" || segment === "..")) return { ok: false, reason: "empty or parent traversal segment" };
  return { ok: true, reason: null };
}

function containsAbsoluteLocalPath(value) {
  let found = false;
  visit(value, (_key, child) => {
    if (typeof child === "string" && (/\/Users\/|\/private\/|^[a-zA-Z]:[\\/]/.test(child))) found = true;
  });
  return found;
}

function mimeTypeForVideo(video) {
  const container = String(video.mediaContainer ?? "").toLowerCase();
  if (container.includes("quicktime") || container.includes("mov")) return "video/quicktime";
  if (container.includes("mp4")) return "video/mp4";
  return "application/octet-stream";
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function compareTuple(left, right) {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    if (left[index] < right[index]) return -1;
    if (left[index] > right[index]) return 1;
  }
  return 0;
}

function nonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function groupBy(values, keyFn) {
  const groups = new Map();
  for (const value of values) {
    const key = keyFn(value);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(value);
  }
  return groups;
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeTextFile(root, relativePath, contents) {
  const absolutePath = path.resolve(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents);
}

function csvEscape(value) {
  const normalized = value === null || value === undefined ? "" : String(value);
  if (!/[",\n]/.test(normalized)) return normalized;
  return `"${normalized.replaceAll('"', '""')}"`;
}

function manifestsAreEqual(left, right) {
  return JSON.stringify(left, null, 2) === JSON.stringify(right, null, 2);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const checkOnly = process.argv.includes("--check");
  const manifest = generateResearchEvidencePackageManifest();
  if (checkOnly) {
    const currentPath = path.resolve(repositoryRoot, defaultJsonOutputPath);
    if (!fs.existsSync(currentPath)) {
      console.error(`${defaultJsonOutputPath} does not exist. Run npm run cf27:research-evidence-package.`);
      process.exit(1);
    }
    const current = readJSON(currentPath);
    if (!manifestsAreEqual(current, manifest)) {
      console.error(`${defaultJsonOutputPath} is stale. Run npm run cf27:research-evidence-package.`);
      process.exit(1);
    }
  } else {
    writeResearchEvidencePackageManifest(manifest);
  }
  console.log(formatResearchEvidencePackageReport(manifest));
  if (manifest.releaseCandidateStatus.startsWith("BLOCKED")) process.exitCode = 1;
}
