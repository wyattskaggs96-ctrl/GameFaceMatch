#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_HEAD_TEMPLATE_STANDARDIZATION_QA_SCHEMA_VERSION = "cf27-head-template-standardization-qa-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidatePackagePath = "data/research/cf27/catalog-candidates/research/head-templates-faces-001-029/head_template_research_candidates.json";
const frameManifestPath = "data/research/cf27/manifests/head-template-evidence-frames/head_template_evidence_frame_manifest.json";
const outputDirectory = "data/research/cf27/reports/head-template-standardization-qa";
const qaReportPath = `${outputDirectory}/head_template_standardization_qa_report.json`;
const recaptureQueuePath = `${outputDirectory}/head_template_recapture_queue.csv`;
const markdownReportPath = "docs/catalog/HEAD_TEMPLATE_STANDARDIZATION_AND_RECAPTURE_QA.md";

const requiredPrompt89Checks = [
  "eyeBlack",
  "facialHair",
  "hairstyleObstruction",
  "hairAndFacialHairChangeWithTemplate",
  "inconsistentZoom",
  "inconsistentRotation",
  "missingFrontView",
  "missingProfiles",
  "loadingAnimation",
  "cursorOrOverlayObstruction",
  "lightingConsistency",
  "cropConsistency",
  "entireHeadVisibility",
  "chinVisibility",
  "earVisibility"
];

if (import.meta.url === `file://${process.argv[1]}`) {
  generateHeadTemplateStandardizationQA();
}

export function generateHeadTemplateStandardizationQA({ root = repositoryRoot, generatedAt = new Date().toISOString() } = {}) {
  const candidatePackage = readJson(path.join(root, candidatePackagePath));
  const frameManifest = readJson(path.join(root, frameManifestPath));
  const framesByStableID = groupBy(frameManifest.frames, (frame) => frame.stableInternalID);

  const records = candidatePackage.records.map((record) => {
    const frames = framesByStableID.get(record.stableInternalID) ?? [];
    const extractedViews = frames.map((frame) => frame.view);
    const hasMenuFrame = extractedViews.includes("MENU");
    const hasFrontFrame = extractedViews.includes("FRONT");
    const hasLeftProfileFrame = extractedViews.includes("LEFT_PROFILE");
    const hasRightProfileFrame = extractedViews.includes("RIGHT_PROFILE");
    const prompt88ViewsAvailable = hasMenuFrame && hasFrontFrame && hasLeftProfileFrame && hasRightProfileFrame;

    return {
      stableInternalID: record.stableInternalID,
      nativeOrder: record.nativeOrder,
      visibleGameLabelOrIndex: record.visibleGameLabelOrIndex,
      dataClass: "RESEARCH_CANDIDATE",
      productionStatus: "NOT_PRODUCTION_DATA",
      verificationState: record.verificationState,
      evidenceClassification: {
        validIdentityOrderEvidence: true,
        validMenuEvidence: true,
        usableMatchingImage: false,
        limitedMatchingImage: true,
        recaptureRequiredForProductionComparison: true
      },
      sourceEvidence: record.selectedMenuEvidence,
      extractedFrameEvidence: {
        prompt88ViewsAvailable,
        extractedViews,
        angleLabelsVerified: false,
        frameLevelOverlayDetectionImplemented: false,
        generatedDerivativesPreserveOriginalAspectRatio: frames.every((frame) => frame.preservesOriginalAspectRatio === true),
        appearanceAltered: frames.some((frame) => frame.appearanceAltered === true),
        eyeBlackRemoved: frames.some((frame) => frame.eyeBlackRemoved === true)
      },
      standardizedCaptureChecks: buildStandardizedChecks(record, {
        hasFrontFrame,
        hasLeftProfileFrame,
        hasRightProfileFrame
      }),
      recaptureQueue: {
        priority: "HIGH",
        reason: "Current evidence is valid for selected Head Template identity, native order, and menu proof, but it is not standardized enough for production comparison or matching measurements.",
        recommendedAction: "Perform one continuous standardized head-template recapture pass for Face 1 through Face 29 using locked canonical settings, no eye black, canonical hair and facial-hair controls if the game allows, consistent zoom, consistent rotation stops, full head/chin/ear framing, and no notification overlays.",
        requiredViews: ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "RIGHT_3Q", "RIGHT_PROFILE", "REAR"],
        optionalViews: ["ELEVATED", "LOWERED"],
        preserveExistingEvidence: true,
        existingEvidenceUse: "Keep current recordings as research identity/order/menu evidence and provenance for selected labels."
      }
    };
  });

  const summary = {
    assessedHeadCount: records.length,
    validIdentityOrderEvidenceCount: countWhere(records, (record) => record.evidenceClassification.validIdentityOrderEvidence),
    validMenuEvidenceCount: countWhere(records, (record) => record.evidenceClassification.validMenuEvidence),
    usableMatchingImageCount: countWhere(records, (record) => record.evidenceClassification.usableMatchingImage),
    limitedMatchingImageCount: countWhere(records, (record) => record.evidenceClassification.limitedMatchingImage),
    recaptureRequiredForProductionComparisonCount: countWhere(records, (record) => record.evidenceClassification.recaptureRequiredForProductionComparison),
    oneStandardizedRecaptureRunCanRepairCurrentImageLimitations: true,
    oneRunRepairLimitations: [
      "A standardized pass can repair the recurring image-comparison defects for Faces 1-29 if the operator preserves native order and repeats every required view.",
      "It does not prove the complete Head Template category count beyond Face 29.",
      "It does not replace second-person verification.",
      "It does not fill unknown platform, patch, executable-version, or environment fields.",
      "It does not publish or enable production recommendations."
    ],
    productionGateStatus: "BLOCKED_RECAPTURE_AND_SECOND_VERIFICATION_REQUIRED"
  };

  const report = {
    schemaVersion: CF27_HEAD_TEMPLATE_STANDARDIZATION_QA_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "RESEARCH_CANDIDATE",
    sourceType: "researchCandidateStandardizationQA",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    sourcePackage: candidatePackagePath,
    sourceFrameManifest: frameManifestPath,
    assessmentMethod: [
      "Repository candidate metadata from Prompt 87.",
      "Prompt 88 derivative-frame manifest.",
      "Manual sample inspection of extracted frames to confirm menu UI, eye black, variable hair presentation, and overlay risk.",
      "No new College Football 27 option, label, count, or path is inferred."
    ],
    requiredPrompt89Checks,
    summary,
    records,
    recaptureQueue: records.map((record) => ({
      stableInternalID: record.stableInternalID,
      nativeOrder: record.nativeOrder,
      visibleGameLabelOrIndex: record.visibleGameLabelOrIndex,
      priority: record.recaptureQueue.priority,
      currentEvidenceUse: record.recaptureQueue.existingEvidenceUse,
      recaptureReason: record.recaptureQueue.reason,
      requiredViews: record.recaptureQueue.requiredViews,
      optionalViews: record.recaptureQueue.optionalViews
    }))
  };

  writeJson(path.join(root, qaReportPath), report);
  writeText(path.join(root, recaptureQueuePath), toRecaptureCsv(report.recaptureQueue));
  writeText(path.join(root, markdownReportPath), toMarkdown(report));

  return report;
}

function buildStandardizedChecks(record, views) {
  return {
    eyeBlack: {
      status: "PRESENT",
      severity: "PRODUCTION_COMPARISON_BLOCKER",
      evidence: record.eyeBlackObservation,
      requiredAction: "Recapture with eye black disabled or absent if the game workflow allows."
    },
    facialHair: {
      status: "NOT_STANDARDIZED",
      severity: "PRODUCTION_COMPARISON_BLOCKER",
      evidence: record.facialHairObservation,
      requiredAction: "Lock or record the canonical facial-hair state separately; do not infer a facial-hair option from this footage."
    },
    hairstyleObstruction: {
      status: "PRESENT_OR_VARIABLE",
      severity: "PRODUCTION_COMPARISON_BLOCKER",
      evidence: record.hairObservation,
      requiredAction: "Recapture with a canonical hairstyle or explicitly document that the head template forces the visible hair state."
    },
    hairAndFacialHairChangeWithTemplate: {
      status: "NOT_ISOLATED",
      severity: "PRODUCTION_COMPARISON_BLOCKER",
      evidence: "Visible hair presentation varies across the current selected Head Template evidence, but no hairstyle option label is inferred. Facial-hair change is not proven by this footage because facial-hair controls are not independently locked or audited here.",
      requiredAction: "Run a standardized pass after confirming whether hair and facial-hair controls can be held constant across Head Template selections."
    },
    inconsistentZoom: {
      status: "NOT_LOCKED",
      severity: "PRODUCTION_COMPARISON_BLOCKER",
      evidence: "The footage uses the live menu zoom/rotate view. Prompt 88 frames are deterministic derivatives, not a locked capture protocol.",
      requiredAction: "Use one approved zoom/camera distance for all views."
    },
    inconsistentRotation: {
      status: "NOT_LOCKED",
      severity: "PRODUCTION_COMPARISON_BLOCKER",
      evidence: "Non-menu angle labels are approximate from rotation sequence and require verifier confirmation.",
      requiredAction: "Stop at defined front, three-quarter, profile, and rear angles during recapture."
    },
    missingFrontView: {
      status: views.hasFrontFrame ? "RESEARCH_DERIVATIVE_PRESENT_BUT_NOT_PRODUCTION_STANDARD" : "MISSING",
      severity: "PRODUCTION_COMPARISON_BLOCKER",
      evidence: views.hasFrontFrame ? "A Prompt 88 FRONT derivative exists, but the angle label is approximate and not verifier-confirmed." : "No FRONT derivative exists.",
      requiredAction: "Capture a verified straight-on full-head production-comparison frame."
    },
    missingProfiles: {
      status: views.hasLeftProfileFrame && views.hasRightProfileFrame ? "RESEARCH_DERIVATIVES_PRESENT_BUT_NOT_PRODUCTION_STANDARD" : "MISSING",
      severity: "PRODUCTION_COMPARISON_BLOCKER",
      evidence: views.hasLeftProfileFrame && views.hasRightProfileFrame
        ? "Prompt 88 profile derivatives exist, but angle labels are approximate and not verifier-confirmed."
        : "One or both profile derivatives are missing.",
      requiredAction: "Capture verified left and right profile production-comparison frames."
    },
    loadingAnimation: {
      status: record.characterLoaded ? "NOT_OBSERVED_IN_RECORD_METADATA" : "POSSIBLE_OR_PRESENT",
      severity: record.characterLoaded ? "REVIEW_REQUIRED" : "PRODUCTION_COMPARISON_BLOCKER",
      evidence: record.characterLoaded
        ? "Prompt 87 metadata marks the character as loaded; no automated loading-animation detector exists."
        : "Prompt 87 metadata did not confirm a fully loaded character.",
      requiredAction: "During recapture, wait for loading to finish before every angle."
    },
    cursorOrOverlayObstruction: {
      status: record.notificationOverlayObserved ? "OBSERVED" : "RISK_PRESENT",
      severity: "PRODUCTION_COMPARISON_BLOCKER",
      evidence: record.notificationOverlayObserved
        ? "Prompt 87 observed a notification overlay for this record."
        : "Menu UI is present in every frame and frame-level overlay detection is not implemented.",
      requiredAction: "Recapture without notifications, cursor overlays, menu panels covering comparison regions, or lower-third interruptions."
    },
    lightingConsistency: {
      status: "NOT_MEASURED_AS_STANDARDIZED",
      severity: "PRODUCTION_COMPARISON_BLOCKER",
      evidence: "Lighting appears to come from the game menu scene; no environment-specific brightness/contrast tolerance pass has approved these images.",
      requiredAction: "Use the approved capture scene and repeatable exposure/display settings."
    },
    cropConsistency: {
      status: "LIMITED_BY_MENU_LAYOUT",
      severity: "PRODUCTION_COMPARISON_BLOCKER",
      evidence: "Frames preserve the full 1920x1080 menu image with selector grid and navigation chrome.",
      requiredAction: "Capture or derive standardized comparison frames with consistent full-head framing and documented crop rules."
    },
    entireHeadVisibility: {
      status: "MANUAL_REVIEW_REQUIRED",
      severity: "PRODUCTION_COMPARISON_BLOCKER",
      evidence: "Prompt 88 rejected mostly-outside-useful-crop extraction attempts but does not verify skull, hairline, ears, and lower-face visibility per frame.",
      requiredAction: "Verify full skull, hairline, ears, chin, and jaw are visible in each required production-comparison view."
    },
    chinVisibility: {
      status: "MANUAL_REVIEW_REQUIRED",
      severity: "PRODUCTION_COMPARISON_BLOCKER",
      evidence: "No automated chin-visibility check has approved these frames.",
      requiredAction: "Capture each required view with the chin fully visible."
    },
    earVisibility: {
      status: "VARIABLE_OR_OBSTRUCTED",
      severity: "PRODUCTION_COMPARISON_BLOCKER",
      evidence: "Visible hair and rotation can obstruct ears; no per-frame ear-visibility check has approved these frames.",
      requiredAction: "Capture profile and three-quarter views that expose ear shape where the selected template and hairstyle allow."
    }
  };
}

function toRecaptureCsv(queue) {
  const header = [
    "stableInternalID",
    "nativeOrder",
    "visibleGameLabelOrIndex",
    "priority",
    "currentEvidenceUse",
    "recaptureReason",
    "requiredViews",
    "optionalViews"
  ];
  const rows = queue.map((record) => [
    record.stableInternalID,
    record.nativeOrder,
    record.visibleGameLabelOrIndex,
    record.priority,
    record.currentEvidenceUse,
    record.recaptureReason,
    record.requiredViews.join("|"),
    record.optionalViews.join("|")
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

function toMarkdown(report) {
  const summary = report.summary;
  const lines = [
    "# Head Template Standardization and Recapture QA",
    "",
    `Last generated: ${report.generatedAt}`,
    "",
    "This report is **research-candidate evidence only**. It is not production catalog data and does not enable recommendations.",
    "",
    "## Summary",
    "",
    `- Assessed head records: ${summary.assessedHeadCount}`,
    `- Valid identity/order evidence: ${summary.validIdentityOrderEvidenceCount}`,
    `- Valid menu evidence: ${summary.validMenuEvidenceCount}`,
    `- Usable production matching images: ${summary.usableMatchingImageCount}`,
    `- Limited matching images for research review: ${summary.limitedMatchingImageCount}`,
    `- Recapture required for production comparison: ${summary.recaptureRequiredForProductionComparisonCount}`,
    `- Production gate status: ${summary.productionGateStatus}`,
    "",
    "The current recordings should be kept. They are useful selected-menu, identity, and native-order evidence for Face 1 through Face 29. They are not standardized enough to become production comparison imagery.",
    "",
    "## Standardization Findings",
    "",
    "- Eye black is present and preserved; it was not edited out.",
    "- Visible hair presentation varies across the selected Head Template evidence, but no hairstyle option label is inferred from this footage.",
    "- Facial-hair change is not proven here; facial-hair state is not independently standardized and no native facial-hair option is inferred from this footage.",
    "- Zoom and rotation are live menu interactions, not locked capture stops.",
    "- Prompt 88 derivative angle labels are approximate until verifier-confirmed.",
    "- Menu UI, navigation chrome, and possible notification overlays make the frames limited for matching.",
    "- Lighting and crop consistency have not passed a production capture-standard QA tolerance.",
    "- Full head, chin, and ear visibility require manual review and a standardized recapture pass.",
    "",
    "## Evidence Classification",
    "",
    "| Head | Stable ID | Identity/order | Menu evidence | Production matching image | Recapture |",
    "| --- | --- | --- | --- | --- | --- |",
    ...report.records.map((record) => [
      `| ${record.visibleGameLabelOrIndex}`,
      record.stableInternalID,
      record.evidenceClassification.validIdentityOrderEvidence ? "valid" : "not valid",
      record.evidenceClassification.validMenuEvidence ? "valid" : "not valid",
      record.evidenceClassification.usableMatchingImage ? "usable" : "limited only",
      record.evidenceClassification.recaptureRequiredForProductionComparison ? "required |" : "not required |"
    ].join(" | ")),
    "",
    "## Recapture Queue",
    "",
    "All 29 current records are in the recapture queue for production comparison imagery. A single continuous standardized recapture run can repair the shared image-standard defects if it preserves native order and records every required view for every selected Face 1 through Face 29 record.",
    "",
    "That one run would not prove the complete Head Template category count beyond Face 29, replace second-person verification, fill missing environment/version fields, or publish production data.",
    "",
    "Required recapture views: MENU, FRONT, LEFT_3Q, LEFT_PROFILE, RIGHT_3Q, RIGHT_PROFILE, REAR.",
    "",
    "Optional recommended views: ELEVATED, LOWERED.",
    "",
    "## Output Files",
    "",
    `- Machine-readable QA report: \`${qaReportPath}\``,
    `- CSV recapture queue: \`${recaptureQueuePath}\``
  ];
  return lines.join("\n") + "\n";
}

function groupBy(items, getKey) {
  const groups = new Map();
  for (const item of items) {
    const key = getKey(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

function countWhere(items, predicate) {
  return items.filter(predicate).length;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function csvCell(value) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
