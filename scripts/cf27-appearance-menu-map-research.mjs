#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_APPEARANCE_MENU_MAP_RESEARCH_VERSION = "cf27-appearance-menu-map-research-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultTimelinePath = "data/phase-zero/video_timeline.json";
const defaultEvidenceManifestPath = "data/phase-zero/evidence_manifest.json";
const defaultHierarchyPath = "data/research/cf27/catalog-candidates/research/appearance-menu-hierarchy/appearance_menu_hierarchy.json";
const defaultIssuesPath = "data/phase-zero/issues_register.research.json";
const defaultMenuMapJsonPath = "data/phase-zero/menu_map.research.json";
const defaultMenuMapCsvPath = "data/phase-zero/menu_map.research.csv";
const defaultMenuMapDocPath = "docs/phase-zero/APPEARANCE_MENU_MAP.md";
const defaultGapDocPath = "docs/phase-zero/MENU_CAPTURE_GAPS.md";

const generatedAtDefault = "2026-07-14T00:00:00-04:00";
const environmentID = "env-cf27-phase0-video-001-rtg-custom-qb";
const creationPathID = "creation-path-cf27-rtg-custom-qb-create-player-appearance-video-001";
const verificationStatus = "OBSERVED_PENDING_VERIFICATION";

const observedMenuOrder = [
  "Head Template",
  "Skin Tone",
  "Skin Details",
  "Eye Shape",
  "Eye Color",
  "Nose",
  "Ear Shape",
  "Mouth Shape",
  "Jaw Shape",
  "Chin"
];

const controlMetadataByLabel = new Map([
  ["Appearance", { stableMenuID: "cf27-menu-player-appearance", parentMenuID: "menu-cf27-create-player-player-tab", nativeOrder: 2, controlType: "top_level_appearance_category", recordKind: "top-level appearance category" }],
  ["Head & Skin", { stableMenuID: "cf27-menu-appearance-head-skin", parentMenuID: "cf27-menu-player-appearance", nativeOrder: 1, controlType: "submenu", recordKind: "submenu" }],
  ["Hair", { stableMenuID: "cf27-menu-appearance-hair", parentMenuID: "cf27-menu-player-appearance", nativeOrder: 2, controlType: "submenu", recordKind: "submenu" }],
  ["Head Template", { stableMenuID: "cf27-menu-head-skin-head-template", parentMenuID: "cf27-menu-appearance-head-skin", nativeOrder: 1, controlType: "numbered_option_grid", recordKind: "numbered option selector" }],
  ["Skin Tone", { stableMenuID: "cf27-menu-head-skin-skin-tone", parentMenuID: "cf27-menu-appearance-head-skin", nativeOrder: 2, controlType: "color_selector_numbered_grid", recordKind: "color selector" }],
  ["Skin Details", { stableMenuID: "cf27-menu-head-skin-skin-details", parentMenuID: "cf27-menu-appearance-head-skin", nativeOrder: 3, controlType: "named_option_grid", recordKind: "named option selector" }],
  ["Eye Shape", { stableMenuID: "cf27-menu-head-skin-eye-shape", parentMenuID: "cf27-menu-appearance-head-skin", nativeOrder: 4, controlType: "named_option_grid", recordKind: "named option selector" }],
  ["Eye Color", { stableMenuID: "cf27-menu-head-skin-eye-color", parentMenuID: "cf27-menu-appearance-head-skin", nativeOrder: 5, controlType: "color_selector_named_grid", recordKind: "color selector" }],
  ["Nose", { stableMenuID: "cf27-menu-head-skin-nose", parentMenuID: "cf27-menu-appearance-head-skin", nativeOrder: 6, controlType: "named_option_grid", recordKind: "named option selector" }],
  ["Ear Shape", { stableMenuID: "cf27-menu-head-skin-ear-shape", parentMenuID: "cf27-menu-appearance-head-skin", nativeOrder: 7, controlType: "named_option_grid", recordKind: "named option selector" }],
  ["Mouth Shape", { stableMenuID: "cf27-menu-head-skin-mouth-shape", parentMenuID: "cf27-menu-appearance-head-skin", nativeOrder: 8, controlType: "unknown_selector", recordKind: "submenu/selector visible only" }],
  ["Jaw Shape", { stableMenuID: "cf27-menu-head-skin-jaw-shape", parentMenuID: "cf27-menu-appearance-head-skin", nativeOrder: 9, controlType: "unknown_selector", recordKind: "submenu/selector visible only" }],
  ["Chin", { stableMenuID: "cf27-menu-head-skin-chin", parentMenuID: "cf27-menu-appearance-head-skin", nativeOrder: 10, controlType: "unknown_selector", recordKind: "submenu/selector visible only" }]
]);

const labelByTimelineMenu = new Map([
  ["HEAD TEMPLATE", "Head Template"],
  ["SKIN TONE", "Skin Tone"],
  ["SKIN DETAILS", "Skin Details"],
  ["EYE SHAPE", "Eye Shape"],
  ["EYE COLOR", "Eye Color"],
  ["NOSE", "Nose"],
  ["EAR SHAPE", "Ear Shape"]
]);

const optionPrefixByMenu = new Map([
  ["Head Template", "head-template"],
  ["Skin Tone", "skin-tone"],
  ["Skin Details", "skin-details"],
  ["Eye Shape", "eye-shape"],
  ["Eye Color", "eye-color"],
  ["Nose", "nose"],
  ["Ear Shape", "ear-shape"]
]);

export function generateAppearanceMenuMapResearch(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const generatedAt = options.generatedAt ?? generatedAtDefault;
  const timeline = readJson(path.resolve(root, options.timelinePath ?? defaultTimelinePath));
  const evidenceManifest = readJson(path.resolve(root, options.evidenceManifestPath ?? defaultEvidenceManifestPath));
  const hierarchy = readOptionalJson(path.resolve(root, options.hierarchyPath ?? defaultHierarchyPath));
  const existingIssues = readOptionalJson(path.resolve(root, options.issuesPath ?? defaultIssuesPath));
  const evidenceByTimelineID = evidenceIndex(evidenceManifest);
  const sourceEvidenceByVideoID = sourceEvidenceIndex(evidenceManifest);
  const hierarchyByLabel = hierarchyIndex(hierarchy);
  const optionGroups = optionGroupsFromTimeline(timeline.records ?? [], evidenceByTimelineID, sourceEvidenceByVideoID);

  const menuRecords = buildMenuRecords({
    hierarchyByLabel,
    optionGroups,
    sourceEvidenceByVideoID,
    generatedAt
  });
  const optionRecords = buildOptionRecords(optionGroups, generatedAt);
  const records = [...menuRecords, ...optionRecords].sort((left, right) => {
    if (left.recordType !== right.recordType) return left.recordType === "menu" ? -1 : 1;
    if (left.parentMenuID !== right.parentMenuID) return String(left.parentMenuID).localeCompare(String(right.parentMenuID));
    return left.nativeOrder - right.nativeOrder || left.stableMenuID.localeCompare(right.stableMenuID);
  });
  validateMenuRecords(records);

  const gaps = buildGapRecords(menuRecords, optionGroups);
  const issues = mergeIssueRegister(existingIssues, menuGapIssues(gaps, generatedAt), generatedAt);

  const menuMap = {
    schemaVersion: CF27_APPEARANCE_MENU_MAP_RESEARCH_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "RESEARCH_CANDIDATE",
    sourceType: "research",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus,
    environmentID,
    creationPathID,
    sourceTimeline: options.timelinePath ?? defaultTimelinePath,
    sourceEvidenceManifest: options.evidenceManifestPath ?? defaultEvidenceManifestPath,
    directObservationPolicy: "Only menu labels, option labels, indices, and relationships directly visible in current footage are recorded. Neighboring thumbnails are not treated as selected options.",
    productionPolicy: "No menu or option record in this research map is production eligible without complete capture, resolved gaps, catalog-manager approval, and independent second-person verification.",
    summary: {
      menuRecords: menuRecords.length,
      optionRecords: optionRecords.length,
      directlyObservedOptionRecords: optionRecords.length,
      partialMenus: menuRecords.filter((record) => record.captureStatus === "PARTIAL").length,
      recaptureRequiredMenus: menuRecords.filter((record) => record.gapFlags.includes("RECAPTURE_REQUIRED")).length,
      productionEligibleRecords: 0
    },
    records,
    gaps
  };

  return { menuMap, issues };
}

export function writeAppearanceMenuMapResearch(outputs, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  writeText(root, options.menuMapJsonPath ?? defaultMenuMapJsonPath, `${JSON.stringify(outputs.menuMap, null, 2)}\n`);
  writeText(root, options.menuMapCsvPath ?? defaultMenuMapCsvPath, formatMenuMapCsv(outputs.menuMap));
  writeText(root, options.menuMapDocPath ?? defaultMenuMapDocPath, formatMenuMapMarkdown(outputs.menuMap));
  writeText(root, options.gapDocPath ?? defaultGapDocPath, formatGapMarkdown(outputs.menuMap));
  writeText(root, options.issuesPath ?? defaultIssuesPath, `${JSON.stringify(outputs.issues, null, 2)}\n`);
}

function buildMenuRecords({ hierarchyByLabel, optionGroups, sourceEvidenceByVideoID, generatedAt }) {
  const records = [];
  for (const label of ["Appearance", "Head & Skin", "Hair", ...observedMenuOrder]) {
    const metadata = controlMetadataByLabel.get(label);
    const hierarchyRecord = hierarchyByLabel.get(label);
    const group = optionGroups.get(label);
    const inspected = Boolean(group?.uniqueOptions.length);
    const visibleOnly = ["Hair", "Mouth Shape", "Jaw Shape", "Chin"].includes(label);
    const evidence = evidenceForMenu(label, hierarchyRecord, group, sourceEvidenceByVideoID);
    const numericIndices = group?.uniqueOptions.map((option) => option.visibleOptionIndex).filter(Number.isFinite) ?? [];
    const repeatedLabels = group?.repeatedLabels ?? [];
    const observedUniqueLabels = group?.uniqueOptions.map((option) => option.displayLabel) ?? [];
    const gapFlags = gapFlagsForMenu(label, inspected, visibleOnly, group);
    const directFacts = [];
    const interpretations = [];
    const missingEvidence = [];

    if (label === "Appearance") {
      directFacts.push("Appearance is visible and entered from the Create Player Player tab.");
      missingEvidence.push("Full Appearance boundary capture proving first and final top-level appearance categories.");
    } else if (label === "Head & Skin") {
      directFacts.push("Head & Skin is visible and selected under Appearance.");
      directFacts.push("Current footage directly shows child rows through Head Template, Skin Tone, Skin Details, Eye Shape, Eye Color, Nose, Ear Shape, Mouth Shape, Jaw Shape, and Chin.");
      missingEvidence.push("Dedicated boundary recording proving whether Head & Skin has additional rows above or below the visible set.");
    } else if (label === "Hair") {
      directFacts.push("Hair is visible as an Appearance submenu row.");
      missingEvidence.push("Open Hair and record its child controls, boundaries, defaults, counts, dependencies, and evidence.");
    } else if (visibleOnly) {
      directFacts.push(`${label} is visible as a Head & Skin row.`);
      missingEvidence.push(`Open ${label} and record selected values, count/order boundaries, defaults, dependencies, and required evidence.`);
    } else {
      directFacts.push(`${label} selector has directly selected values in the current video timeline.`);
      if (observedUniqueLabels.length > 0) directFacts.push(`Directly observed selected values: ${observedUniqueLabels.join(", ")}.`);
      if (numericIndices.length > 0) directFacts.push(`Visible numeric/index range observed: ${Math.min(...numericIndices)} through ${Math.max(...numericIndices)}.`);
      missingEvidence.push(`Complete first-to-final ${label} selector recording with count, wrap, default, and dependency checks.`);
    }

    if (repeatedLabels.length > 0) {
      interpretations.push(`Repeated selected value(s) preserved as continuity/wrap evidence, not merged as proof of total count: ${repeatedLabels.join(", ")}.`);
    }
    if (label === "Nose" && repeatedLabels.includes("Aquiline")) {
      interpretations.push("Aquiline appears again after Roman, suggesting possible wrap behavior; this remains unverified until a controlled boundary recording confirms it.");
    }
    if (label === "Head Template") {
      interpretations.push("Head Template selected labels are numeric, but current navigation is non-monotonic and does not prove selector completeness.");
    }

    records.push({
      recordType: "menu",
      stableMenuID: metadata.stableMenuID,
      parentMenuID: metadata.parentMenuID,
      displayLabel: label,
      nativeLabel: hierarchyRecord?.nativeLabel ?? label,
      nativeOrder: metadata.nativeOrder,
      recordKind: metadata.recordKind,
      controlType: metadata.controlType,
      captureStatus: "PARTIAL",
      gapFlags,
      inspected,
      complete: false,
      firstValue: null,
      finalValue: null,
      countStatus: "COUNT_UNKNOWN",
      orderStatus: inspected ? "ORDER_INCOMPLETE" : "ORDER_NOT_INSPECTED",
      visibleValueCount: observedUniqueLabels.length || null,
      visibleMinimum: numericIndices.length ? Math.min(...numericIndices) : null,
      visibleMaximum: numericIndices.length ? Math.max(...numericIndices) : null,
      defaultValue: null,
      wrapBehavior: label === "Nose" && repeatedLabels.includes("Aquiline") ? "POSSIBLE_WRAP_OBSERVED_UNVERIFIED" : "UNKNOWN",
      dependencies: [],
      automaticReset: "UNKNOWN",
      warnings: gapFlags.includes("RECAPTURE_REQUIRED") ? ["Research candidate only; recapture required before production use."] : [],
      locks: [],
      defects: [],
      ambiguities: ambiguitiesForMenu(label, group),
      directlyObservedFacts: directFacts,
      researcherInterpretations: interpretations,
      missingEvidence,
      productionEligibility: {
        eligible: false,
        reason: "Research-only observation; requires complete capture, resolved gaps, second-person verification, and production publish gate approval."
      },
      evidence,
      verificationStatus,
      createdAt: generatedAt,
      updatedAt: generatedAt
    });
  }
  return records;
}

function buildOptionRecords(optionGroups, generatedAt) {
  const records = [];
  for (const [menuLabel, group] of optionGroups.entries()) {
    const metadata = controlMetadataByLabel.get(menuLabel);
    const nativeOrderBasis = group.usesVisibleIndex ? "visible_game_index" : "observed_selection_sequence";
    for (const option of group.uniqueOptions) {
      records.push({
        recordType: "option",
        stableMenuID: optionID(menuLabel, option.displayLabel, option.visibleOptionIndex),
        parentMenuID: metadata.stableMenuID,
        displayLabel: option.displayLabel,
        nativeLabel: option.displayLabel,
        nativeOrder: option.visibleOptionIndex ?? option.firstObservedSequence,
        recordKind: Number.isFinite(option.visibleOptionIndex) ? "numbered option" : "named option",
        controlType: Number.isFinite(option.visibleOptionIndex) ? "numbered_option" : "named_option",
        captureStatus: "PARTIAL",
        gapFlags: ["PARTIAL", "RECAPTURE_REQUIRED"],
        inspected: true,
        complete: false,
        firstValue: null,
        finalValue: null,
        countStatus: "COUNT_UNKNOWN",
        orderStatus: "ORDER_INCOMPLETE",
        visibleValueCount: null,
        visibleMinimum: option.visibleOptionIndex ?? null,
        visibleMaximum: option.visibleOptionIndex ?? null,
        defaultValue: null,
        wrapBehavior: "UNKNOWN",
        dependencies: [],
        automaticReset: "UNKNOWN",
        warnings: [],
        locks: [],
        defects: [],
        ambiguities: option.observations.length > 1 ? ["Repeated selected observation preserved with all evidence references."] : [],
        directlyObservedFacts: [
          `${option.displayLabel} is directly observed as the selected value for ${menuLabel}.`,
          `Native-order basis: ${nativeOrderBasis}.`
        ],
        researcherInterpretations: [],
        missingEvidence: [
          `Production-quality standardized evidence and second-person verification for ${menuLabel} > ${option.displayLabel}.`
        ],
        productionEligibility: {
          eligible: false,
          reason: "Selected value is a primary research observation only and is not second-person verified."
        },
        evidence: option.observations.map((observation) => ({
          evidenceID: observation.evidenceID,
          timelineRecordID: observation.timelineRecordID,
          videoID: observation.videoID,
          startTimestamp: observation.startTimestamp,
          endTimestamp: observation.endTimestamp,
          extractedFramePath: observation.extractedFramePath || null,
          confidence: observation.confidence
        })),
        verificationStatus,
        createdAt: generatedAt,
        updatedAt: generatedAt
      });
    }
  }
  return records;
}

function optionGroupsFromTimeline(records, evidenceByTimelineID, sourceEvidenceByVideoID) {
  const groups = new Map();
  let sequence = 0;
  for (const record of records) {
    if (record.event_type !== "option_change" || record.parent_menu !== "Head & Skin") continue;
    const menuLabel = labelByTimelineMenu.get(record.visible_menu_label);
    if (!menuLabel) continue;
    sequence += 1;
    if (!groups.has(menuLabel)) {
      groups.set(menuLabel, {
        menuLabel,
        observations: [],
        byOptionKey: new Map(),
        uniqueOptions: [],
        repeatedLabels: [],
        usesVisibleIndex: false
      });
    }
    const group = groups.get(menuLabel);
    const evidenceEntry = evidenceByTimelineID.get(record.timeline_record_id) ?? sourceEvidenceByVideoID.get(record.video_id);
    const displayLabel = record.visible_option_label;
    const key = `${displayLabel}::${record.visible_option_index ?? ""}`;
    const observation = {
      timelineRecordID: record.timeline_record_id,
      evidenceID: evidenceEntry?.evidence_id ?? null,
      videoID: record.video_id,
      startTimestamp: record.start_timestamp,
      endTimestamp: record.end_timestamp,
      extractedFramePath: record.extracted_frame_path,
      confidence: record.confidence,
      visibleOptionIndex: record.visible_option_index,
      notes: record.notes
    };
    group.observations.push(observation);
    if (Number.isFinite(record.visible_option_index)) group.usesVisibleIndex = true;
    if (!group.byOptionKey.has(key)) {
      const option = {
        displayLabel,
        visibleOptionIndex: record.visible_option_index,
        firstObservedSequence: group.uniqueOptions.length + 1,
        observations: []
      };
      group.byOptionKey.set(key, option);
      group.uniqueOptions.push(option);
    } else if (!group.repeatedLabels.includes(displayLabel)) {
      group.repeatedLabels.push(displayLabel);
    }
    const option = group.byOptionKey.get(key);
    option.observations.push(observation);
  }

  for (const group of groups.values()) {
    group.uniqueOptions.sort((left, right) => {
      const leftIndex = Number.isFinite(left.visibleOptionIndex) ? left.visibleOptionIndex : left.firstObservedSequence;
      const rightIndex = Number.isFinite(right.visibleOptionIndex) ? right.visibleOptionIndex : right.firstObservedSequence;
      return leftIndex - rightIndex || left.displayLabel.localeCompare(right.displayLabel);
    });
  }
  return groups;
}

function evidenceForMenu(label, hierarchyRecord, group, sourceEvidenceByVideoID) {
  const evidence = [];
  if (hierarchyRecord?.sourceVideoID) {
    const sourceEvidence = sourceEvidenceByVideoID.get(`phase0-${hierarchyRecord.sourceVideoID}`) ?? sourceEvidenceByVideoID.get(hierarchyRecord.sourceVideoID);
    evidence.push({
      evidenceID: sourceEvidence?.evidence_id ?? `evidence-${hierarchyRecord.sourceVideoID}-source`,
      timelineRecordID: null,
      videoID: hierarchyRecord.sourceVideoID,
      startTimestamp: hierarchyRecord.startSeconds ?? null,
      endTimestamp: hierarchyRecord.endSeconds ?? null,
      extractedFramePath: null,
      confidence: "MEDIUM"
    });
  }
  if (group) {
    for (const observation of group.observations) {
      evidence.push({
        evidenceID: observation.evidenceID,
        timelineRecordID: observation.timelineRecordID,
        videoID: observation.videoID,
        startTimestamp: observation.startTimestamp,
        endTimestamp: observation.endTimestamp,
        extractedFramePath: observation.extractedFramePath || null,
        confidence: observation.confidence
      });
    }
  }
  if (evidence.length === 0) {
    const fallback = sourceEvidenceByVideoID.get("phase0-video-001") ?? sourceEvidenceByVideoID.get("phase0-video-002");
    evidence.push({
      evidenceID: fallback?.evidence_id ?? "phase0-source-phase0-video-001",
      timelineRecordID: null,
      videoID: fallback?.video_id ?? "phase0-video-001",
      startTimestamp: null,
      endTimestamp: null,
      extractedFramePath: null,
      confidence: "LOW_VISIBLE_ONLY"
    });
  }
  return stableEvidence(evidence);
}

function buildGapRecords(menuRecords, optionGroups) {
  const gaps = [];
  for (const record of menuRecords) {
    if (!record.gapFlags.includes("RECAPTURE_REQUIRED")) continue;
    gaps.push({
      gapID: `gap-${record.stableMenuID}`,
      stableMenuID: record.stableMenuID,
      displayLabel: record.displayLabel,
      flags: record.gapFlags,
      missingEvidence: record.missingEvidence,
      productionImpact: record.productionEligibility.reason,
      recommendedNextAction: record.displayLabel === "Hair"
        ? "Open Hair and record a complete boundary/count/order pass before creating any Hair catalog records."
        : record.inspected
          ? `Recapture ${record.displayLabel} from first value through final value with count, wrap, default, and dependency checks.`
          : `Open ${record.displayLabel} and record its full selector before any catalog item records are created.`,
      observedValueCount: optionGroups.get(record.displayLabel)?.uniqueOptions.length ?? 0
    });
  }
  return gaps;
}

function menuGapIssues(gaps, generatedAt) {
  return gaps.map((gap) => ({
    issueID: `issue-phase0-menu-${slug(gap.displayLabel)}`,
    kind: "missingEvidence",
    title: `Incomplete appearance menu capture: ${gap.displayLabel}`,
    description: `${gap.displayLabel} is ${gap.flags.join(", ")}. ${gap.missingEvidence.join(" ")}`,
    owner: "wyatt-skaggs",
    severity: gap.flags.includes("ORDER_NOT_INSPECTED") ? "blocking" : "warning",
    status: "open",
    affectedRecordIDs: [gap.stableMenuID],
    affectedEvidenceFileIDs: [],
    createdAt: generatedAt,
    updatedAt: generatedAt,
    resolutionNotes: "",
    recaptureRequest: {
      required: true,
      queueStatus: "queued",
      requestedAngles: [],
      requestedEvidenceKinds: [gap.recommendedNextAction],
      owner: "wyatt-skaggs",
      priority: gap.flags.includes("ORDER_NOT_INSPECTED") ? "blocking" : "warning",
      notes: gap.productionImpact
    }
  }));
}

function mergeIssueRegister(existingIssues, newIssues, generatedAt) {
  const base = existingIssues?.schemaVersion === "phase0-issue-register-v1"
    ? structuredClone(existingIssues)
    : {
        schemaVersion: "phase0-issue-register-v1",
        registerID: "phase0-research-issues",
        createdAt: generatedAt,
        updatedAt: generatedAt,
        issues: []
      };
  const existing = base.issues ?? [];
  const byID = new Map(existing.map((issue) => [issue.issueID, issue]));
  for (const issue of newIssues) byID.set(issue.issueID, issue);
  base.updatedAt = generatedAt;
  const existingIDs = new Set(existing.map((issue) => issue.issueID));
  base.issues = [
    ...existing.map((issue) => byID.get(issue.issueID)),
    ...newIssues
      .filter((issue) => !existingIDs.has(issue.issueID))
      .sort((left, right) => left.issueID.localeCompare(right.issueID))
  ];
  return base;
}

function gapFlagsForMenu(label, inspected, visibleOnly, group) {
  const flags = ["PARTIAL", "COUNT_UNKNOWN", "RECAPTURE_REQUIRED"];
  if (visibleOnly || !inspected) {
    flags.push("FIRST_VALUE_UNKNOWN", "FINAL_VALUE_UNKNOWN", "ORDER_NOT_INSPECTED");
    return flags;
  }
  flags.push("FIRST_VALUE_UNKNOWN", "FINAL_VALUE_UNKNOWN", "ORDER_INCOMPLETE");
  const numericIndices = group?.uniqueOptions.map((option) => option.visibleOptionIndex).filter(Number.isFinite) ?? [];
  if (numericIndices.length > 1) {
    const min = Math.min(...numericIndices);
    const max = Math.max(...numericIndices);
    const missing = [];
    for (let value = min; value <= max; value += 1) {
      if (!numericIndices.includes(value)) missing.push(value);
    }
    if (missing.length > 0) flags.push("VISIBLE_INDEX_GAPS");
  }
  return [...new Set(flags)];
}

function ambiguitiesForMenu(label, group) {
  const ambiguities = [];
  if (!group) {
    ambiguities.push("Visible row only; selector values and boundaries are not captured.");
    return ambiguities;
  }
  if (group.repeatedLabels.length > 0) ambiguities.push(`Repeated selected labels: ${group.repeatedLabels.join(", ")}.`);
  if (group.usesVisibleIndex) {
    const values = group.uniqueOptions.map((option) => option.visibleOptionIndex).filter(Number.isFinite);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const missing = [];
    for (let value = min; value <= max; value += 1) {
      if (!values.includes(value)) missing.push(value);
    }
    if (missing.length > 0) ambiguities.push(`Visible index gaps between observed minimum and maximum: ${missing.join(", ")}.`);
  }
  if (label === "Head Template") ambiguities.push("Current recordings are not standardized for production visual comparison.");
  return ambiguities;
}

function evidenceIndex(evidenceManifest) {
  return new Map((evidenceManifest.entries ?? [])
    .filter((entry) => entry.timeline_record_id)
    .map((entry) => [entry.timeline_record_id, entry]));
}

function sourceEvidenceIndex(evidenceManifest) {
  return new Map((evidenceManifest.entries ?? [])
    .filter((entry) => entry.master_or_derivative === "master")
    .map((entry) => [entry.video_id, entry]));
}

function hierarchyIndex(hierarchy) {
  return new Map((hierarchy?.records ?? []).map((record) => [record.displayLabel, record]));
}

function stableEvidence(evidence) {
  const seen = new Set();
  const unique = [];
  for (const entry of evidence) {
    const key = `${entry.evidenceID}|${entry.timelineRecordID}|${entry.videoID}|${entry.startTimestamp}|${entry.endTimestamp}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(entry);
  }
  return unique;
}

function validateMenuRecords(records) {
  const ids = new Set();
  for (const record of records) {
    if (ids.has(record.stableMenuID)) throw new Error(`Duplicate menu record ID: ${record.stableMenuID}`);
    ids.add(record.stableMenuID);
    if (record.productionEligibility?.eligible !== false) throw new Error(`Research record is production eligible: ${record.stableMenuID}`);
    if (record.verificationStatus !== verificationStatus) throw new Error(`Unexpected verification status for ${record.stableMenuID}`);
  }
}

function formatMenuMapCsv(menuMap) {
  const columns = [
    "record_type",
    "stable_menu_id",
    "parent_menu_id",
    "display_label",
    "native_label",
    "native_order",
    "record_kind",
    "control_type",
    "capture_status",
    "gap_flags",
    "inspected",
    "complete",
    "visible_value_count",
    "visible_minimum",
    "visible_maximum",
    "default_value",
    "wrap_behavior",
    "production_eligible",
    "evidence_count",
    "verification_status"
  ];
  const rows = menuMap.records.map((record) => ({
    record_type: record.recordType,
    stable_menu_id: record.stableMenuID,
    parent_menu_id: record.parentMenuID ?? "",
    display_label: record.displayLabel,
    native_label: record.nativeLabel,
    native_order: record.nativeOrder,
    record_kind: record.recordKind,
    control_type: record.controlType,
    capture_status: record.captureStatus,
    gap_flags: record.gapFlags.join("|"),
    inspected: record.inspected,
    complete: record.complete,
    visible_value_count: record.visibleValueCount ?? "",
    visible_minimum: record.visibleMinimum ?? "",
    visible_maximum: record.visibleMaximum ?? "",
    default_value: record.defaultValue ?? "",
    wrap_behavior: record.wrapBehavior,
    production_eligible: record.productionEligibility.eligible,
    evidence_count: record.evidence.length,
    verification_status: record.verificationStatus
  }));
  return `${[columns, ...rows.map((row) => columns.map((column) => row[column] ?? ""))]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n")}\n`;
}

function formatMenuMapMarkdown(menuMap) {
  const menuRecords = menuMap.records.filter((record) => record.recordType === "menu");
  const optionRecords = menuMap.records.filter((record) => record.recordType === "option");
  const lines = [
    "# Appearance Menu Map",
    "",
    "This is a Phase 0 research menu map built only from directly observable video timeline evidence. It is not production verified and does not enable recommendations.",
    "",
    "## Summary",
    "",
    `- Generated: ${menuMap.generatedAt}`,
    `- Menu records: ${menuMap.summary.menuRecords}`,
    `- Observed option records: ${menuMap.summary.optionRecords}`,
    `- Production-eligible records: ${menuMap.summary.productionEligibleRecords}`,
    "",
    "## Directly Observed Menu Facts",
    "",
    "| Native order | Menu | Parent | Control | Status | Visible count | Visible min | Visible max |",
    "| ---: | --- | --- | --- | --- | ---: | --- | --- |"
  ];
  for (const record of menuRecords) {
    lines.push(`| ${record.nativeOrder} | ${record.displayLabel} | ${record.parentMenuID ?? ""} | ${record.controlType} | ${record.captureStatus} | ${record.visibleValueCount ?? ""} | ${record.visibleMinimum ?? ""} | ${record.visibleMaximum ?? ""} |`);
  }
  lines.push("", "## Observed Selected Options", "", "| Parent | Option | Native order | Evidence count | Production eligible |", "| --- | --- | ---: | ---: | --- |");
  lines.push("", "For numbered selectors, native order comes from the visible game index. For named selectors without visible numeric indices, the order shown is the directly observed selection sequence and remains incomplete until a boundary recording proves the full native order.", "");
  for (const record of optionRecords) {
    lines.push(`| ${record.parentMenuID} | ${record.displayLabel} | ${record.nativeOrder} | ${record.evidence.length} | ${record.productionEligibility.eligible ? "yes" : "no"} |`);
  }
  lines.push("", "## Researcher Interpretations", "");
  for (const record of menuRecords.filter((item) => item.researcherInterpretations.length > 0)) {
    lines.push(`- ${record.displayLabel}: ${record.researcherInterpretations.join(" ")}`);
  }
  lines.push("", "## Production Eligibility", "", "Every record in this menu map is marked research-only. Production eligibility remains blocked until complete capture, resolved gaps, independent second-person verification, and the production publish gate.");
  return `${lines.join("\n")}\n`;
}

function formatGapMarkdown(menuMap) {
  const lines = [
    "# Menu Capture Gaps",
    "",
    "These gaps identify what is missing before the current appearance menu map can support production catalog publication.",
    "",
    "| Menu | Flags | Missing evidence | Next action |",
    "| --- | --- | --- | --- |"
  ];
  for (const gap of menuMap.gaps) {
    lines.push(`| ${gap.displayLabel} | ${gap.flags.join(", ")} | ${gap.missingEvidence.join(" ")} | ${gap.recommendedNextAction} |`);
  }
  return `${lines.join("\n")}\n`;
}

function optionID(menuLabel, displayLabel, index) {
  const prefix = optionPrefixByMenu.get(menuLabel) ?? slug(menuLabel);
  if (Number.isFinite(index)) return `cf27-menu-option-${prefix}-${String(index).padStart(3, "0")}`;
  return `cf27-menu-option-${prefix}-${slug(displayLabel)}`;
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readOptionalJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return readJson(filePath);
}

function writeText(root, relativePath, text) {
  const filePath = path.resolve(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function parseCliArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--generated-at") options.generatedAt = argv[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log("Usage: node scripts/cf27-appearance-menu-map-research.mjs [--generated-at <iso>]");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }
    const outputs = generateAppearanceMenuMapResearch(options);
    writeAppearanceMenuMapResearch(outputs, options);
    console.log(`Appearance menu map generated: ${outputs.menuMap.summary.menuRecords} menus, ${outputs.menuMap.summary.optionRecords} selected option records, ${outputs.menuMap.gaps.length} gaps.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
