#!/usr/bin/env node
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_EVIDENCE_INTAKE_SCHEMA_VERSION = "cf27-evidence-intake-agent-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultEvidenceManifestPath = "data/phase-zero/evidence_manifest.json";
const defaultVideoInventoryPath = "data/phase-zero/video_inventory.json";
const defaultCaptureRequestsPath = "data/phase-zero/capture_requests.json";
const defaultCaptureLogPath = "data/phase-zero/capture_log.json";
const defaultIssuesRegisterPath = "data/phase-zero/issues_register.research.json";
const defaultOutputJsonPath = "data/phase-zero/evidence_intake_report.json";
const defaultOutputCsvPath = "data/phase-zero/evidence_intake_report.csv";
const defaultOutputMarkdownPath = "docs/phase-zero/EVIDENCE_INTAKE_REPORT.md";
const defaultFfmpegWrapper = "scripts/media/ffmpeg-wrapper";

const supportedVideoExtensions = new Set([".mp4", ".mov", ".m4v", ".webm", ""]);
const supportedImageExtensions = new Set([".png", ".jpg", ".jpeg", ".heic", ".heif"]);
const ignoredFilenames = new Set([".gitkeep", "README.md", ".DS_Store"]);
const ignoredDirectoryNames = new Set([
  ".git",
  ".next",
  "node_modules",
  "generated",
  "derivative-frames",
  "keyframes",
  "label-crops",
  "label-sheets",
  "sample-frames",
  "classification",
  "reports"
]);

export async function runEvidenceIntake(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const evidenceManifestPath = path.resolve(root, options.evidenceManifestPath ?? defaultEvidenceManifestPath);
  const videoInventoryPath = path.resolve(root, options.videoInventoryPath ?? defaultVideoInventoryPath);
  const captureRequestsPath = path.resolve(root, options.captureRequestsPath ?? defaultCaptureRequestsPath);
  const captureLogPath = path.resolve(root, options.captureLogPath ?? defaultCaptureLogPath);
  const issuesRegisterPath = path.resolve(root, options.issuesRegisterPath ?? defaultIssuesRegisterPath);
  const ffmpegWrapper = path.resolve(root, options.ffmpegWrapper ?? defaultFfmpegWrapper);
  const sourceRoots = options.sourceRoots ?? defaultSourceRoots(root);

  const evidenceManifest = readJsonIfExists(evidenceManifestPath, { entries: [] });
  const videoInventory = readJsonIfExists(videoInventoryPath, { inventory: [] });
  const captureRequests = readJsonIfExists(captureRequestsPath, { requests: [] });
  const captureLog = readJsonIfExists(captureLogPath, { events: [] });
  const issuesRegister = readJsonIfExists(issuesRegisterPath, { issues: [] });

  const known = buildKnownEvidenceIndex({ evidenceManifest, videoInventory });
  const requests = captureRequests.requests ?? [];
  const candidates = discoverApprovedSourceCandidates({ root, sourceRoots, requests });
  const inspected = [];
  for (const candidate of candidates) {
    inspected.push(await inspectCandidate(candidate, {
      root,
      generatedAt,
      known,
      requests,
      ffmpegWrapper,
      mediaInspector: options.mediaInspector
    }));
  }

  const records = addIntraBatchDuplicateSignals(inspected);
  const newSourceRecords = records.filter((record) => record.intakeStatus === "NEW_SOURCE_EVIDENCE");
  const duplicateRecords = records.filter((record) => record.intakeStatus === "DUPLICATE_OF_EXISTING_EVIDENCE" || record.intakeStatus === "DUPLICATE_WITHIN_INTAKE_BATCH");
  const unmatchedNewRecords = newSourceRecords.filter((record) => !record.captureRequestMatch?.captureID);
  const requestMatches = newSourceRecords.filter((record) => record.captureRequestMatch?.captureID);

  const report = {
    schemaVersion: CF27_EVIDENCE_INTAKE_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PHASE_ZERO_EVIDENCE_INTAKE_REPORT",
    sourceType: "research",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "OBSERVED_PENDING_VERIFICATION",
    productionPromotion: {
      allowed: false,
      reason: "Evidence intake records are source observations only. They do not satisfy second-person verification or catalog-manager approval."
    },
    scanPolicy: {
      approvedRoots: sourceRoots.map((sourceRoot) => ({
        path: sourceRoot.path,
        rootToken: sourceRoot.rootToken,
        mode: sourceRoot.mode
      })),
      downloadsRule: "Downloads are scanned only for files named with an open capture-request ID such as GFM-CAP-001.",
      intakeDirectoryRule: "The dedicated research intake directory accepts supported media files for triage.",
      ignoredDerivativeRule: "Generated keyframes, contact sheets, derivative frames, and prior review crops are excluded from source intake."
    },
    summary: {
      candidateFilesScanned: records.length,
      newSourceEvidence: newSourceRecords.length,
      duplicateEvidence: duplicateRecords.length,
      matchedCaptureRequests: new Set(requestMatches.map((record) => record.captureRequestMatch.captureID)).size,
      unmatchedNewSourceEvidence: unmatchedNewRecords.length,
      captureRequestsClosed: 0,
      productionRecordsCreated: 0,
      catalogRecordsCreated: 0
    },
    records
  };

  const updates = buildArtifactUpdates({
    report,
    evidenceManifest,
    videoInventory,
    captureLog,
    issuesRegister,
    generatedAt
  });

  if (options.write !== false) {
    writeReportOutputs(root, report, {
      outputJsonPath: options.outputJsonPath ?? defaultOutputJsonPath,
      outputCsvPath: options.outputCsvPath ?? defaultOutputCsvPath,
      outputMarkdownPath: options.outputMarkdownPath ?? defaultOutputMarkdownPath
    });
    if (options.applyUpdates !== false && newSourceRecords.length > 0) {
      writeJson(evidenceManifestPath, updates.evidenceManifest);
      writeJson(videoInventoryPath, updates.videoInventory);
      writeJson(captureLogPath, updates.captureLog);
      writeJson(issuesRegisterPath, updates.issuesRegister);
    }
  }

  return { report, updates };
}

export function discoverApprovedSourceCandidates({ root, sourceRoots, requests }) {
  const requestIDs = new Set((requests ?? []).map((request) => request.captureID).filter(Boolean));
  const candidates = [];
  for (const sourceRoot of sourceRoots) {
    const absoluteRoot = path.resolve(root, expandHome(sourceRoot.path));
    if (!fs.existsSync(absoluteRoot)) continue;
    for (const filePath of walkFiles(absoluteRoot, sourceRoot.maxDepth ?? 6)) {
      const filename = path.basename(filePath);
      if (ignoredFilenames.has(filename)) continue;
      const extension = path.extname(filename).toLowerCase();
      if (!supportedVideoExtensions.has(extension) && !supportedImageExtensions.has(extension)) continue;
      if (sourceRoot.mode === "capture-request-named" && !matchesOpenCaptureRequest(filename, requestIDs)) continue;
      candidates.push({
        absolutePath: filePath,
        originalFilename: filename,
        rootToken: sourceRoot.rootToken,
        sourceRootAbsolutePath: absoluteRoot,
        sourceRootMode: sourceRoot.mode,
        portableRelativeEvidencePath: portableEvidencePath(sourceRoot, absoluteRoot, filePath),
        repositoryRelativePath: filePath.startsWith(`${root}${path.sep}`) ? normalizeRelativePath(path.relative(root, filePath)) : null
      });
    }
  }
  return candidates.sort((left, right) => left.portableRelativeEvidencePath.localeCompare(right.portableRelativeEvidencePath));
}

async function inspectCandidate(candidate, { root, generatedAt, known, requests, ffmpegWrapper, mediaInspector }) {
  const stat = fs.statSync(candidate.absolutePath);
  const sha256 = await sha256FileStream(candidate.absolutePath);
  const media = mediaInspector
    ? mediaInspector(candidate.absolutePath)
    : inspectMedia(candidate.absolutePath, ffmpegWrapper);
  const knownMatch = known.byHash.get(sha256) ?? null;
  const captureRequestMatch = matchCaptureRequest(candidate.originalFilename, requests);
  const sourceEvidenceID = `phase0-source-intake-${sha256.slice(0, 12)}`;
  const mediaKind = media.mimeType?.startsWith("video/") ? "video" : media.mimeType?.startsWith("image/") ? "image" : "unknown";
  const opensSuccessfully = mediaKind === "image"
    ? Boolean(media.dimensions?.width && media.dimensions?.height)
    : mediaKind === "video"
      ? media.opensSuccessfully !== false
      : false;
  const intakeStatus = knownMatch
    ? "DUPLICATE_OF_EXISTING_EVIDENCE"
    : opensSuccessfully
      ? "NEW_SOURCE_EVIDENCE"
      : "UNREADABLE_OR_UNSUPPORTED";
  const requestSatisfaction = evaluateCaptureRequestSatisfaction(captureRequestMatch, mediaKind, opensSuccessfully);

  return {
    sourceEvidenceID,
    originalFilename: candidate.originalFilename,
    canonicalFilename: suggestedCanonicalFilename(candidate.originalFilename, captureRequestMatch),
    sourceLocation: {
      rootToken: candidate.rootToken,
      portableRelativeEvidencePath: candidate.portableRelativeEvidencePath,
      repositoryRelativePath: candidate.repositoryRelativePath,
      absoluteDiscoveryPathInternal: candidate.absolutePath
    },
    sha256,
    sizeBytes: stat.size,
    mediaKind,
    media,
    fileOpenStatus: opensSuccessfully ? "opens" : "unreadable_or_unsupported",
    intakeStatus,
    duplicate: knownMatch ? {
      exactDuplicate: true,
      duplicateOfEvidenceID: knownMatch.evidenceID ?? null,
      duplicateOfInventoryID: knownMatch.inventoryID ?? null,
      duplicateOfPath: knownMatch.path ?? null
    } : {
      exactDuplicate: false,
      duplicateOfEvidenceID: null,
      duplicateOfInventoryID: null,
      duplicateOfPath: null
    },
    captureRequestMatch,
    requestSatisfaction,
    expectedProcessing: expectedProcessingFor(mediaKind, requestSatisfaction),
    catalogImpact: {
      researchCatalogRecordsCreated: 0,
      productionCatalogRecordsCreated: 0,
      productionPromotionAllowed: false,
      note: "Source evidence intake does not infer College Football 27 catalog facts. Timeline and catalog records require direct visual review."
    },
    preservationStatus: "original_preserved_unchanged",
    verificationStatus: "OBSERVED_PENDING_VERIFICATION",
    inspectedAt: generatedAt
  };
}

function inspectMedia(filePath, ffmpegWrapper) {
  const mimeType = detectMimeType(filePath);
  const extension = path.extname(filePath).toLowerCase();
  if (mimeType.startsWith("image/") || supportedImageExtensions.has(extension)) {
    return {
      mimeType,
      container: imageContainerFor(mimeType, extension),
      codec: imageContainerFor(mimeType, extension),
      durationSeconds: null,
      dimensions: readImageDimensions(filePath),
      frameRate: null,
      videoCodec: null,
      audioCodec: null,
      opensSuccessfully: Boolean(readImageDimensions(filePath)?.width),
      metadataSource: "file-header"
    };
  }
  if (mimeType.startsWith("video/") || supportedVideoExtensions.has(extension)) {
    return inspectVideoWithFfprobe(filePath, ffmpegWrapper, mimeType);
  }
  return {
    mimeType,
    container: null,
    codec: null,
    durationSeconds: null,
    dimensions: null,
    frameRate: null,
    videoCodec: null,
    audioCodec: null,
    opensSuccessfully: false,
    metadataSource: "unsupported"
  };
}

function inspectVideoWithFfprobe(filePath, ffmpegWrapper, mimeType) {
  const result = spawnSync(ffmpegWrapper, [
    "ffprobe",
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath
  ], { encoding: "utf8" });
  if (result.status !== 0 || result.error) {
    return {
      mimeType,
      container: containerFromMime(mimeType),
      codec: null,
      durationSeconds: null,
      dimensions: null,
      frameRate: null,
      videoCodec: null,
      audioCodec: null,
      opensSuccessfully: false,
      metadataSource: "ffprobe",
      error: result.error?.message ?? result.stderr?.trim() ?? "ffprobe failed"
    };
  }
  try {
    const parsed = JSON.parse(result.stdout);
    const video = parsed.streams?.find((stream) => stream.codec_type === "video");
    const audio = parsed.streams?.find((stream) => stream.codec_type === "audio");
    return {
      mimeType,
      container: parsed.format?.format_name ?? containerFromMime(mimeType),
      codec: video?.codec_name ?? null,
      durationSeconds: finiteNumber(parsed.format?.duration ?? video?.duration),
      dimensions: video?.width && video?.height ? { width: Number(video.width), height: Number(video.height) } : null,
      frameRate: frameRateFromString(video?.avg_frame_rate),
      videoCodec: video?.codec_name ?? null,
      audioCodec: audio?.codec_name ?? null,
      opensSuccessfully: Boolean(video?.codec_name),
      metadataSource: "ffprobe"
    };
  } catch {
    return {
      mimeType,
      container: containerFromMime(mimeType),
      codec: null,
      durationSeconds: null,
      dimensions: null,
      frameRate: null,
      videoCodec: null,
      audioCodec: null,
      opensSuccessfully: false,
      metadataSource: "ffprobe",
      error: "ffprobe returned unreadable JSON"
    };
  }
}

function buildArtifactUpdates({ report, evidenceManifest, videoInventory, captureLog, issuesRegister, generatedAt }) {
  const nextEvidenceManifest = structuredClone(evidenceManifest);
  const nextVideoInventory = structuredClone(videoInventory);
  const nextCaptureLog = structuredClone(captureLog);
  const nextIssuesRegister = structuredClone(issuesRegister);
  const existingEvidenceIDs = new Set((nextEvidenceManifest.entries ?? []).map((entry) => entry.evidence_id));
  const existingInventoryIDs = new Set((nextVideoInventory.inventory ?? []).map((entry) => entry.inventoryId));
  const existingCaptureEventIDs = new Set((nextCaptureLog.events ?? []).map((event) => event.capture_event_id));
  const existingIssueIDs = new Set((nextIssuesRegister.issues ?? []).map((issue) => issue.issueID ?? issue.issue_id));
  let inventoryCounter = (nextVideoInventory.inventory ?? []).length + 1;

  for (const record of report.records.filter((entry) => entry.intakeStatus === "NEW_SOURCE_EVIDENCE")) {
    if (!existingEvidenceIDs.has(record.sourceEvidenceID)) {
      nextEvidenceManifest.entries ??= [];
      nextEvidenceManifest.entries.push(sourceEvidenceManifestEntry(record));
      existingEvidenceIDs.add(record.sourceEvidenceID);
    }
    if (record.mediaKind === "video") {
      let inventoryID;
      do {
        inventoryID = `phase0-video-intake-${String(inventoryCounter).padStart(3, "0")}`;
        inventoryCounter += 1;
      } while (existingInventoryIDs.has(inventoryID));
      nextVideoInventory.inventory ??= [];
      nextVideoInventory.inventory.push(videoInventoryEntry(record, inventoryID));
      existingInventoryIDs.add(inventoryID);
    }
    const captureEventID = `capture-${record.sourceEvidenceID}`;
    if (!existingCaptureEventIDs.has(captureEventID)) {
      nextCaptureLog.events ??= [];
      nextCaptureLog.events.push(captureLogEntry(record, captureEventID));
      existingCaptureEventIDs.add(captureEventID);
    }
    const blockingIssue = issueForRecord(record, generatedAt);
    if (blockingIssue && !existingIssueIDs.has(blockingIssue.issueID)) {
      nextIssuesRegister.issues ??= [];
      nextIssuesRegister.issues.push(blockingIssue);
      existingIssueIDs.add(blockingIssue.issueID);
    }
  }

  nextEvidenceManifest.updatedAt = generatedAt;
  nextEvidenceManifest.summary = summarizeEvidenceManifest(nextEvidenceManifest.entries ?? []);
  nextVideoInventory.generatedAt = generatedAt;
  nextVideoInventory.summary = summarizeVideoInventory(nextVideoInventory.inventory ?? []);
  nextCaptureLog.updatedAt = generatedAt;
  nextCaptureLog.summary = summarizeCaptureLog(nextCaptureLog.events ?? []);
  nextIssuesRegister.updatedAt = generatedAt;
  return {
    evidenceManifest: nextEvidenceManifest,
    videoInventory: nextVideoInventory,
    captureLog: nextCaptureLog,
    issuesRegister: nextIssuesRegister
  };
}

function sourceEvidenceManifestEntry(record) {
  return {
    evidence_id: record.sourceEvidenceID,
    timeline_record_id: null,
    video_id: record.mediaKind === "video" ? record.sourceEvidenceID.replace("phase0-source-intake", "phase0-video-intake") : null,
    relative_path: record.sourceLocation.portableRelativeEvidencePath,
    master_or_derivative: "master",
    file_role: record.mediaKind === "video" ? "source_video_master_reference" : "source_screenshot_master_reference",
    sha256: record.sha256,
    size_bytes: record.sizeBytes,
    mime_type: record.media.mimeType,
    source_video: record.mediaKind === "video" ? record.canonicalFilename : null,
    timestamp: null,
    verification_state: "OBSERVED_PENDING_VERIFICATION",
    notes: "Portable reference to newly intaked source evidence. Original file is preserved unchanged and remains research-only."
  };
}

function videoInventoryEntry(record, inventoryID) {
  return {
    inventoryId: inventoryID,
    manifestSequence: null,
    originalFilename: record.originalFilename,
    discoveredFilename: record.originalFilename,
    canonicalFilename: record.canonicalFilename,
    sourceLocation: {
      rootToken: record.sourceLocation.rootToken,
      portableRelativeEvidencePath: record.sourceLocation.portableRelativeEvidencePath,
      absoluteDiscoveryPathInternal: record.sourceLocation.absoluteDiscoveryPathInternal
    },
    manifestMatch: {
      status: record.captureRequestMatch?.captureID ? "matched_to_capture_request" : "unmatched_intake",
      expectedDurationSeconds: null,
      manifestNotes: record.captureRequestMatch?.captureID ?? "Manual triage required"
    },
    sha256: record.sha256,
    fileSizeBytes: record.sizeBytes,
    mediaContainer: record.media.container,
    mediaContainerRaw: record.media.container,
    videoCodec: record.media.videoCodec,
    audioCodec: record.media.audioCodec,
    durationSeconds: record.media.durationSeconds,
    dimensions: record.media.dimensions,
    frameRate: record.media.frameRate,
    fileOpenStatus: record.fileOpenStatus,
    ffmpegStatus: record.media.opensSuccessfully ? "opens" : "ffprobe_failed",
    matchedManifestRow: false,
    exactDuplicate: false,
    exactDuplicateOf: null,
    likelyDuplicateOf: null,
    expectedContent: record.captureRequestMatch?.title ?? "New capture-request evidence pending review",
    observedContent: "Not yet timeline-reviewed. Direct visual review required before catalog conclusions.",
    conditionAssessment: "new_source_pending_timeline_review",
    suitability: {
      menuEvidence: "pending_review",
      countEvidence: "pending_review",
      orderingEvidence: "pending_review",
      visualComparison: "pending_review",
      productionQualityCatalogImagery: false
    },
    preservationStatus: "master_preserved_unchanged",
    productionUseStatus: "not_production_data"
  };
}

function captureLogEntry(record, captureEventID) {
  return {
    capture_event_id: captureEventID,
    timeline_record_id: null,
    video_id: record.mediaKind === "video" ? record.sourceEvidenceID.replace("phase0-source-intake", "phase0-video-intake") : null,
    start_timestamp: null,
    end_timestamp: null,
    category: record.captureRequestMatch?.exactCategory ?? "New evidence intake",
    native_option: null,
    action: "source_evidence_intake",
    evidence_generated: [record.sourceEvidenceID],
    issue_detected: record.requestSatisfaction.fullySatisfied ? [] : [`issue-${record.sourceEvidenceID}`],
    verification_state: "OBSERVED_PENDING_VERIFICATION",
    notes: record.requestSatisfaction.note
  };
}

function issueForRecord(record, generatedAt) {
  if (record.requestSatisfaction.fullySatisfied) return null;
  return {
    issueID: `issue-${record.sourceEvidenceID}`,
    issueType: record.captureRequestMatch?.captureID ? "EVIDENCE_REQUIRES_REVIEW" : "UNMATCHED_EVIDENCE_INTAKE",
    severity: record.captureRequestMatch?.captureID ? "medium" : "high",
    status: "OPEN",
    createdAt: generatedAt,
    updatedAt: generatedAt,
    affectedRecords: [record.sourceEvidenceID],
    evidence: [record.sourceLocation.portableRelativeEvidencePath],
    notes: record.requestSatisfaction.note,
    productionBlocker: true
  };
}

function evaluateCaptureRequestSatisfaction(match, mediaKind, opensSuccessfully) {
  if (!opensSuccessfully) {
    return {
      status: "REJECTED_UNREADABLE",
      fullySatisfied: false,
      closesCaptureRequest: false,
      note: "File could not be opened as supported source evidence."
    };
  }
  if (!match?.captureID) {
    return {
      status: "UNMATCHED_REQUIRES_MANUAL_TRIAGE",
      fullySatisfied: false,
      closesCaptureRequest: false,
      note: "No open capture-request ID was found in the filename. Manual triage is required before this evidence can satisfy a request."
    };
  }
  return {
    status: "MATCHED_PENDING_TIMELINE_AND_ACCEPTANCE_REVIEW",
    fullySatisfied: false,
    closesCaptureRequest: false,
    note: `${match.captureID} was matched by filename, but acceptance criteria require timeline review, evidence-frame extraction, and human confirmation before closure.`
  };
}

function expectedProcessingFor(mediaKind, requestSatisfaction) {
  if (requestSatisfaction.status === "REJECTED_UNREADABLE") return ["manual_file_repair_or_replace"];
  const base = mediaKind === "video"
    ? ["timeline_mapping", "representative_frame_extraction", "capture_log_update"]
    : ["screenshot_review", "evidence_manifest_update"];
  if (!requestSatisfaction.fullySatisfied) base.push("human_acceptance_criteria_review");
  return base;
}

function matchCaptureRequest(filename, requests) {
  for (const request of requests ?? []) {
    if (request.captureID && filename.includes(request.captureID)) {
      return {
        captureID: request.captureID,
        title: request.title,
        exactCategory: request.exactCategory,
        priority: request.priority,
        verificationStatus: request.verificationStatus,
        matchMethod: "filename_capture_id"
      };
    }
  }
  return null;
}

function matchesOpenCaptureRequest(filename, requestIDs) {
  for (const id of requestIDs) {
    if (filename.includes(id)) return true;
  }
  return false;
}

function addIntraBatchDuplicateSignals(records) {
  const firstByHash = new Map();
  return records.map((record) => {
    const first = firstByHash.get(record.sha256);
    if (!first) {
      firstByHash.set(record.sha256, record);
      return record;
    }
    return {
      ...record,
      intakeStatus: record.intakeStatus === "NEW_SOURCE_EVIDENCE" ? "DUPLICATE_WITHIN_INTAKE_BATCH" : record.intakeStatus,
      duplicate: {
        exactDuplicate: true,
        duplicateOfEvidenceID: first.sourceEvidenceID,
        duplicateOfInventoryID: null,
        duplicateOfPath: first.sourceLocation.portableRelativeEvidencePath
      }
    };
  });
}

function buildKnownEvidenceIndex({ evidenceManifest, videoInventory }) {
  const byHash = new Map();
  for (const entry of evidenceManifest.entries ?? []) {
    if (!entry.sha256) continue;
    byHash.set(entry.sha256, {
      evidenceID: entry.evidence_id,
      inventoryID: null,
      path: entry.relative_path
    });
  }
  for (const entry of videoInventory.inventory ?? []) {
    if (!entry.sha256) continue;
    byHash.set(entry.sha256, {
      evidenceID: null,
      inventoryID: entry.inventoryId,
      path: entry.sourceLocation?.portableRelativeEvidencePath ?? entry.originalFilename
    });
  }
  return { byHash };
}

function writeReportOutputs(root, report, paths) {
  writeText(path.resolve(root, paths.outputJsonPath), `${JSON.stringify(report, null, 2)}\n`);
  writeText(path.resolve(root, paths.outputCsvPath), reportCsv(report));
  writeText(path.resolve(root, paths.outputMarkdownPath), reportMarkdown(report));
}

function reportCsv(report) {
  const columns = [
    "sourceEvidenceID",
    "originalFilename",
    "portableRelativeEvidencePath",
    "sha256",
    "sizeBytes",
    "mediaKind",
    "mimeType",
    "durationSeconds",
    "width",
    "height",
    "frameRate",
    "codec",
    "intakeStatus",
    "duplicateOf",
    "captureRequestID",
    "requestSatisfaction",
    "closesCaptureRequest"
  ];
  return `${columns.join(",")}\n${report.records.map((record) => csvRow([
    record.sourceEvidenceID,
    record.originalFilename,
    record.sourceLocation.portableRelativeEvidencePath,
    record.sha256,
    record.sizeBytes,
    record.mediaKind,
    record.media.mimeType,
    record.media.durationSeconds ?? "",
    record.media.dimensions?.width ?? "",
    record.media.dimensions?.height ?? "",
    record.media.frameRate ?? "",
    record.media.codec ?? record.media.videoCodec ?? "",
    record.intakeStatus,
    record.duplicate.duplicateOfEvidenceID ?? record.duplicate.duplicateOfInventoryID ?? record.duplicate.duplicateOfPath ?? "",
    record.captureRequestMatch?.captureID ?? "",
    record.requestSatisfaction.status,
    record.requestSatisfaction.closesCaptureRequest
  ])).join("\n")}\n`;
}

function reportMarkdown(report) {
  const lines = [
    "# Evidence Intake Report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "This report is research-only. It does not promote any College Football 27 records to production.",
    "",
    "## Summary",
    "",
    `- Candidate files scanned: ${report.summary.candidateFilesScanned}`,
    `- New source evidence: ${report.summary.newSourceEvidence}`,
    `- Duplicate evidence: ${report.summary.duplicateEvidence}`,
    `- Matched capture requests: ${report.summary.matchedCaptureRequests}`,
    `- Capture requests closed: ${report.summary.captureRequestsClosed}`,
    `- Production records created: ${report.summary.productionRecordsCreated}`,
    "",
    "## Records",
    "",
    "| Evidence ID | File | Status | Capture request | Notes |",
    "| --- | --- | --- | --- | --- |"
  ];
  for (const record of report.records) {
    lines.push(`| ${record.sourceEvidenceID} | ${record.sourceLocation.portableRelativeEvidencePath} | ${record.intakeStatus} | ${record.captureRequestMatch?.captureID ?? "Unmatched"} | ${record.requestSatisfaction.note.replaceAll("|", "\\|")} |`);
  }
  if (report.records.length === 0) {
    lines.push("| None | No approved new source evidence files were found. | NO_NEW_APPROVED_SOURCE_EVIDENCE | n/a | Use the dedicated intake directory or GFM-CAP filename convention for new captures. |");
  }
  return `${lines.join("\n")}\n`;
}

function summarizeEvidenceManifest(entries) {
  return {
    entries: entries.length,
    sourceMasters: entries.filter((entry) => entry.master_or_derivative === "master").length,
    derivatives: entries.filter((entry) => entry.master_or_derivative === "derivative").length,
    generatedTimelineDerivatives: entries.filter((entry) => entry.file_role === "phase_zero_timeline_derivative").length
  };
}

function summarizeVideoInventory(inventory) {
  return {
    inventoryRows: inventory.length,
    filesOpenSuccessfully: inventory.filter((entry) => entry.fileOpenStatus === "opens").length,
    uniqueVideoFiles: inventory.filter((entry) => !entry.exactDuplicate && entry.fileOpenStatus === "opens").length,
    exactDuplicateFiles: inventory.filter((entry) => entry.exactDuplicate).length,
    productionQualityCatalogImageryFiles: inventory.filter((entry) => entry.suitability?.productionQualityCatalogImagery === true).length
  };
}

function summarizeCaptureLog(events) {
  return {
    events: events.length,
    eventsWithEvidence: events.filter((event) => event.evidence_generated?.length > 0).length,
    eventsWithIssues: events.filter((event) => event.issue_detected?.length > 0).length
  };
}

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return structuredClone(fallback);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function defaultSourceRoots(root) {
  return [
    {
      path: path.join("data", "research", "cf27", "imports", "tomorrow-additional-videos"),
      rootToken: "TOMORROW_UPLOADS",
      mode: "intake-directory",
      maxDepth: 2
    },
    {
      path: "~/Downloads",
      rootToken: "OWNER_DOWNLOADS",
      mode: "capture-request-named",
      maxDepth: 1
    }
  ].map((sourceRoot) => ({
    ...sourceRoot,
    path: sourceRoot.path.startsWith(root) ? normalizeRelativePath(path.relative(root, sourceRoot.path)) : sourceRoot.path
  }));
}

function walkFiles(directory, maxDepth, depth = 0, out = []) {
  if (depth > maxDepth) return out;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectoryNames.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, maxDepth, depth + 1, out);
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }
  return out;
}

function portableEvidencePath(sourceRoot, absoluteRoot, filePath) {
  return `${sourceRoot.rootToken}/${normalizeRelativePath(path.relative(absoluteRoot, filePath))}`;
}

function suggestedCanonicalFilename(filename, match) {
  if (!match?.captureID) return filename;
  return `${match.captureID}_${safeToken(match.exactCategory ?? match.title ?? "capture")}${path.extname(filename).toLowerCase() || ""}`;
}

function safeToken(value) {
  return String(value)
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80)
    .toUpperCase();
}

function detectMimeType(filePath) {
  const result = spawnSync("file", ["-b", "--mime-type", filePath], { encoding: "utf8" });
  const detected = result.status === 0 ? result.stdout.trim() : "";
  if (detected) return detected;
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".heic") return "image/heic";
  if (ext === ".heif") return "image/heif";
  if (ext === ".mov") return "video/quicktime";
  if (ext === ".mp4" || ext === ".m4v") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  return "application/octet-stream";
}

function readImageDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length >= 24 && buffer.toString("ascii", 1, 4) === "PNG") {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          width: buffer.readUInt16BE(offset + 7),
          height: buffer.readUInt16BE(offset + 5)
        };
      }
      offset += 2 + length;
    }
  }
  return null;
}

function imageContainerFor(mimeType, extension) {
  if (mimeType === "image/png" || extension === ".png") return "PNG";
  if (mimeType === "image/jpeg" || extension === ".jpg" || extension === ".jpeg") return "JPEG";
  if (mimeType === "image/heic" || extension === ".heic") return "HEIC";
  if (mimeType === "image/heif" || extension === ".heif") return "HEIF";
  return null;
}

function containerFromMime(mimeType) {
  if (mimeType === "video/mp4") return "MP4";
  if (mimeType === "video/quicktime") return "QuickTime";
  if (mimeType === "video/webm") return "WebM";
  return null;
}

function frameRateFromString(value) {
  if (typeof value !== "string" || value === "0/0") return null;
  const [numerator, denominator] = value.split("/").map((part) => Number.parseFloat(part));
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return Math.round((numerator / denominator) * 1000) / 1000;
}

function finiteNumber(value) {
  const number = Number.parseFloat(String(value));
  return Number.isFinite(number) ? Math.round(number * 1000) / 1000 : null;
}

function sha256FileStream(filePath, { highWaterMark = 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath, { highWaterMark });
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function csvRow(values) {
  return values.map((value) => {
    const text = String(value ?? "");
    if (/[",\n\r]/.test(text)) return `"${text.replaceAll("\"", "\"\"")}"`;
    return text;
  }).join(",");
}

function normalizeRelativePath(value) {
  return value.replaceAll("\\", "/").replace(/^\.\/+/, "").split("/").filter(Boolean).join("/");
}

function expandHome(value) {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

function printHelp() {
  console.log([
    "Usage:",
    "  node scripts/cf27-evidence-intake-agent.mjs [--no-apply]",
    "",
    "Scans approved College Football 27 source-evidence intake locations, compares hashes against",
    "the current Phase 0 evidence manifest and video inventory, and writes a research-only intake report.",
    "",
    "Default approved locations:",
    "  - data/research/cf27/imports/tomorrow-additional-videos",
    "  - ~/Downloads files named with an open GFM-CAP-* capture request ID",
    "",
    "Original source files are never renamed, recompressed, uploaded, or modified."
  ].join("\n"));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--help")) {
    printHelp();
    process.exit(0);
  }
  const { report } = await runEvidenceIntake({
    applyUpdates: !process.argv.includes("--no-apply")
  });
  console.log(JSON.stringify({
    schemaVersion: report.schemaVersion,
    generatedAt: report.generatedAt,
    summary: report.summary,
    report: defaultOutputJsonPath
  }, null, 2));
}
