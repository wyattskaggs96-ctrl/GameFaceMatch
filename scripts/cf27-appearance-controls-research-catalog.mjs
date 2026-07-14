#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_APPEARANCE_CONTROLS_RESEARCH_SCHEMA_VERSION = "cf27-appearance-controls-research-catalog-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAtDefault = "2026-07-14T01:15:00-04:00";
const verificationStatus = "OBSERVED_PENDING_VERIFICATION";
const productionStatus = "NOT_PRODUCTION_DATA";

const defaultTimelinePath = "data/phase-zero/video_timeline.json";
const defaultEvidenceManifestPath = "data/phase-zero/evidence_manifest.json";
const defaultIssuesPath = "data/phase-zero/issues_register.research.json";
const defaultMenuMapPath = "data/phase-zero/menu_map.research.json";
const defaultAttributesJsonPath = "data/phase-zero/additional_attributes.research.json";
const defaultAttributesCsvPath = "data/phase-zero/additional_attributes.research.csv";
const defaultRecaptureJsonPath = "data/phase-zero/additional_attributes_recapture_requirements.research.json";
const defaultRecaptureCsvPath = "data/phase-zero/additional_attributes_recapture_requirements.research.csv";
const defaultSummaryDirectory = "docs/phase-zero/appearance-controls";

const categoryConfigs = [
  config({
    canonicalLabel: "Skin Tone",
    timelineLabel: "SKIN TONE",
    slug: "skin-tone",
    code: "SKINTONE",
    expectedVideoID: "phase0-video-004",
    parentMenu: "Head & Skin",
    controlTypeFallback: "color_selector_numbered_grid",
    stableOrder: "numericLabel",
    attributeFamily: "skinPresentation",
    effectProfile: {
      geometry: "not_supported_by_current_evidence",
      texture: "not_supported_by_current_evidence",
      color: "supported_by_visible_skin-presentation_change",
      presentationOnly: "supported_by_visible_skin-presentation_change"
    },
    effectNotes: [
      "Native Skin Tone labels and visible color/presentation changes are directly observable.",
      "Skin Tone must not influence geometric similarity."
    ],
    valueKind: "numbered_color_option"
  }),
  config({
    canonicalLabel: "Skin Details",
    timelineLabel: "SKIN DETAILS",
    slug: "skin-details",
    code: "SKINDETAILS",
    expectedVideoID: "phase0-video-005",
    parentMenu: "Head & Skin",
    controlTypeFallback: "named_option_grid",
    packagePath: "data/research/cf27/catalog-candidates/research/skin-details-options-001-010/skin_details_research_candidates.json",
    attributeFamily: "skinDetails",
    effectProfile: {
      geometry: "not_supported_by_current_evidence",
      texture: "supported_by_native_labels_and_visible_detail_category",
      color: "not_supported_by_current_evidence",
      presentationOnly: "supported_as_surface-detail_presentation"
    },
    effectNotes: [
      "Native labels such as Freckles, Scar, Redness, and Acne Scar support treating this as texture/presentation evidence.",
      "No geometry change or numerical texture measurement is claimed."
    ],
    valueKind: "named_texture_option"
  }),
  config({
    canonicalLabel: "Eye Shape",
    timelineLabel: "EYE SHAPE",
    slug: "eye-shape",
    code: "EYESHAPE",
    expectedVideoID: "phase0-video-006",
    parentMenu: "Head & Skin",
    controlTypeFallback: "named_option_grid",
    packagePath: "data/research/cf27/catalog-candidates/research/eye-shape-options-001-005/eye_shape_research_candidates.json",
    attributeFamily: "eyeShape",
    effectProfile: {
      geometry: "supported_by_native_shape_category_pending_measurement",
      texture: "not_supported_by_current_evidence",
      color: "not_supported_by_current_evidence",
      presentationOnly: "not_supported_by_current_evidence"
    },
    effectNotes: [
      "The native category is Eye Shape and selected thumbnails show eye-region shape options.",
      "No landmark measurement or production geometry suitability is claimed."
    ],
    valueKind: "named_geometry_option"
  }),
  config({
    canonicalLabel: "Eye Color",
    timelineLabel: "EYE COLOR",
    slug: "eye-color",
    code: "EYECOLOR",
    expectedVideoID: "phase0-video-007",
    parentMenu: "Head & Skin",
    controlTypeFallback: "color_selector_named_grid",
    packagePath: "data/research/cf27/catalog-candidates/research/eye-color-options-001-007/eye_color_research_candidates.json",
    attributeFamily: "eyeColor",
    effectProfile: {
      geometry: "not_supported_by_current_evidence",
      texture: "not_supported_by_current_evidence",
      color: "supported_by_native_color_labels",
      presentationOnly: "supported_by_native_color_labels"
    },
    effectNotes: [
      "Native color labels are directly readable.",
      "Current footage does not support geometry or texture conclusions."
    ],
    valueKind: "named_color_option"
  }),
  config({
    canonicalLabel: "Nose",
    timelineLabel: "NOSE",
    slug: "nose",
    code: "NOSE",
    expectedVideoID: "phase0-video-008",
    parentMenu: "Head & Skin",
    controlTypeFallback: "named_option_grid",
    packagePath: "data/research/cf27/catalog-candidates/research/nose-options-001-007/nose_research_candidates.json",
    attributeFamily: "noseShape",
    effectProfile: {
      geometry: "supported_by_native_shape_category_pending_measurement",
      texture: "not_supported_by_current_evidence",
      color: "not_supported_by_current_evidence",
      presentationOnly: "not_supported_by_current_evidence"
    },
    effectNotes: [
      "The native category is Nose and selected thumbnails show nose-shape options.",
      "No production geometric comparison or cross-domain accuracy is claimed."
    ],
    valueKind: "named_geometry_option"
  }),
  config({
    canonicalLabel: "Ear Shape",
    timelineLabel: "EAR SHAPE",
    slug: "ear-shape",
    code: "EARSHAPE",
    expectedVideoID: "phase0-video-009",
    parentMenu: "Head & Skin",
    controlTypeFallback: "named_option_grid",
    packagePath: "data/research/cf27/catalog-candidates/research/ear-shape-options-001-004/ear_shape_research_candidates.json",
    attributeFamily: "earShape",
    effectProfile: {
      geometry: "supported_by_native_shape_category_pending_measurement",
      texture: "not_supported_by_current_evidence",
      color: "not_supported_by_current_evidence",
      presentationOnly: "not_supported_by_current_evidence"
    },
    effectNotes: [
      "The native category is Ear Shape and selected thumbnails show ear-shape options.",
      "Current frames do not prove both ears or production-grade geometry."
    ],
    valueKind: "named_geometry_option"
  })
];

export function generateAppearanceControlsResearchCatalog(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const generatedAt = options.generatedAt ?? generatedAtDefault;
  const timeline = readJson(path.resolve(root, options.timelinePath ?? defaultTimelinePath));
  const evidenceManifest = readJson(path.resolve(root, options.evidenceManifestPath ?? defaultEvidenceManifestPath));
  const menuMap = readJson(path.resolve(root, options.menuMapPath ?? defaultMenuMapPath));
  const issuesRegister = readJson(path.resolve(root, options.issuesPath ?? defaultIssuesPath));
  const evidenceByTimelineID = new Map((evidenceManifest.entries ?? [])
    .filter((entry) => entry.timeline_record_id)
    .map((entry) => [entry.timeline_record_id, entry]));

  const categories = [];
  const records = [];
  const recaptureItems = [];
  const packageIndexes = loadPackageIndexes(root);

  for (const cfg of categoryConfigs) {
    const menuRecord = (menuMap.records ?? []).find((record) => record.displayLabel === cfg.canonicalLabel && record.recordType === "menu");
    const timelineRecords = (timeline.records ?? [])
      .filter((record) => record.visible_menu_label === cfg.timelineLabel)
      .filter((record) => record.event_type === "option_change" && record.visible_option_label)
      .sort((left, right) => left.start_timestamp - right.start_timestamp || left.timeline_record_id.localeCompare(right.timeline_record_id));
    const categoryRecords = buildCategoryRecords(cfg, timelineRecords, evidenceByTimelineID, menuRecord, packageIndexes.get(cfg.slug) ?? new Map(), generatedAt);
    const categorySummary = buildCategorySummary(cfg, timelineRecords, categoryRecords, menuRecord);
    const recapture = buildRecaptureRequirement(cfg, categorySummary, categoryRecords, generatedAt);
    categories.push(categorySummary);
    records.push(...categoryRecords);
    recaptureItems.push(recapture);
  }

  const catalog = {
    schemaVersion: CF27_APPEARANCE_CONTROLS_RESEARCH_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "RESEARCH_CANDIDATE",
    sourceType: "shippingGameVideoResearch",
    productionStatus,
    verificationStatus,
    productionRecommendationsEnabled: false,
    sourceTimeline: options.timelinePath ?? defaultTimelinePath,
    sourceEvidenceManifest: options.evidenceManifestPath ?? defaultEvidenceManifestPath,
    sourceMenuMap: options.menuMapPath ?? defaultMenuMapPath,
    summary: {
      categoryCount: categories.length,
      directlyObservedUniqueValues: records.length,
      selectedObservations: categories.reduce((sum, category) => sum + category.selectedObservationCount, 0),
      productionEligibleRecords: 0,
      categoriesWithUnknownTotalCount: categories.filter((category) => category.totalCountStatus === "COUNT_UNKNOWN").map((category) => category.category),
      categoriesWithDuplicateObservations: categories.filter((category) => category.duplicateObservedValues.length > 0).map((category) => category.category)
    },
    categories,
    records
  };

  const recaptureRequirements = {
    schemaVersion: `${CF27_APPEARANCE_CONTROLS_RESEARCH_SCHEMA_VERSION}-recapture-requirements`,
    generatedAt,
    dataClass: "RESEARCH_CANDIDATE",
    productionStatus,
    verificationStatus,
    summary: {
      itemCount: recaptureItems.length,
      allCategoriesRequireRecaptureBeforeProduction: true
    },
    items: recaptureItems
  };

  const updatedEvidenceManifest = annotateEvidenceManifest(evidenceManifest, records, categories, generatedAt);
  const updatedIssuesRegister = updateIssuesRegister(issuesRegister, recaptureItems, generatedAt);

  return { catalog, recaptureRequirements, updatedEvidenceManifest, updatedIssuesRegister };
}

export function writeAppearanceControlsResearchCatalog(outputs, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  writeText(root, options.attributesJsonPath ?? defaultAttributesJsonPath, `${JSON.stringify(outputs.catalog, null, 2)}\n`);
  writeText(root, options.attributesCsvPath ?? defaultAttributesCsvPath, formatAttributesCsv(outputs.catalog.records));
  writeText(root, options.recaptureJsonPath ?? defaultRecaptureJsonPath, `${JSON.stringify(outputs.recaptureRequirements, null, 2)}\n`);
  writeText(root, options.recaptureCsvPath ?? defaultRecaptureCsvPath, formatRecaptureCsv(outputs.recaptureRequirements.items));
  writeCategoryMarkdown(root, outputs.catalog, options.summaryDirectory ?? defaultSummaryDirectory);
  writeText(root, options.evidenceManifestPath ?? defaultEvidenceManifestPath, `${JSON.stringify(outputs.updatedEvidenceManifest, null, 2)}\n`);
  writeText(root, options.issuesPath ?? defaultIssuesPath, `${JSON.stringify(outputs.updatedIssuesRegister, null, 2)}\n`);
}

function buildCategoryRecords(cfg, timelineRecords, evidenceByTimelineID, menuRecord, packageIndex, generatedAt) {
  const observationsByKey = new Map();
  for (const record of timelineRecords) {
    const key = categoryValueKey(cfg, record.visible_option_label, record.visible_option_index);
    const evidence = evidenceByTimelineID.get(record.timeline_record_id);
    const observation = {
      timelineRecordID: record.timeline_record_id,
      videoID: record.video_id,
      sourceVideo: record.canonical_filename,
      originalFilename: record.original_filename,
      timestampRange: `${record.start_timestamp}-${record.end_timestamp}`,
      startTimestamp: record.start_timestamp,
      endTimestamp: record.end_timestamp,
      visibleOptionLabel: record.visible_option_label,
      visibleOptionIndex: record.visible_option_index ?? null,
      observedAction: record.observed_action,
      confidence: record.confidence,
      transitionActive: Boolean(record.transition_active),
      blurPresent: Boolean(record.blur_present),
      obstructionPresent: Boolean(record.obstruction_present),
      usableForCount: Boolean(record.usable_for_count),
      usableForOrder: Boolean(record.usable_for_order),
      usableForVisualAnalysis: Boolean(record.usable_for_visual_analysis),
      evidenceID: evidence?.evidence_id ?? null,
      evidenceFramePath: record.extracted_frame_path || evidence?.relative_path || null,
      evidenceFrameTimestamp: evidence?.timestamp ?? null,
      notes: record.notes ?? ""
    };
    if (!observationsByKey.has(key)) observationsByKey.set(key, []);
    observationsByKey.get(key).push(observation);
  }

  return [...observationsByKey.entries()]
    .map(([key, observations], index) => {
      const label = observations[0].visibleOptionLabel;
      const nativeOrder = nativeOrderFor(cfg, observations[0], packageIndex, index);
      const stableResearchCatalogID = `CF27_XBOXUNKNOWN_RTG_${cfg.code}_${String(nativeOrder).padStart(3, "0")}`;
      const primary = choosePrimaryObservation(observations, stableResearchCatalogID);
      const duplicateObservation = observations.length > 1;
      const frameIDMismatch = primary.evidenceFramePath && !primary.evidenceFramePath.includes(stableResearchCatalogID);
      const ambiguities = [
        ...(duplicateObservation ? ["Duplicate selected observations are preserved as provenance."] : []),
        ...(frameIDMismatch ? ["Evidence frame path was generated by an older research pass and does not match this direct stable ID."] : []),
        ...(cfg.stableOrder === "numericLabel" && !Number.isInteger(observations[0].visibleOptionIndex) ? ["Native numeric label is not visible."] : []),
        "Selector beginning, ending, wrap behavior, default, and complete count remain unverified unless stated otherwise in category summary."
      ];
      return {
        stableResearchCatalogID,
        nativeControlLabel: cfg.canonicalLabel,
        nativeDisplayLabel: label,
        nativeOptionNumber: Number.isInteger(observations[0].visibleOptionIndex) ? observations[0].visibleOptionIndex : null,
        nativeOrder,
        nativeOrderBasis: nativeOrderBasisFor(cfg, observations[0], packageIndex),
        parentMenu: menuRecord?.parentMenuID ?? cfg.parentMenu,
        parentMenuLabel: cfg.parentMenu,
        controlType: menuRecord?.controlType ?? cfg.controlTypeFallback,
        category: cfg.canonicalLabel,
        attributeFamily: cfg.attributeFamily,
        valueKind: cfg.valueKind,
        dataClass: "RESEARCH_CANDIDATE",
        sourceType: "shippingGameVideoResearch",
        productionStatus,
        verificationStatus,
        defaultStatus: "UNKNOWN_NOT_DIRECTLY_SHOWN",
        isVisibleDefault: false,
        selectorWrapObserved: false,
        totalCountSupported: false,
        totalCount: null,
        sourceVideo: primary.videoID,
        sourceTimestampRange: primary.timestampRange,
        sourceObservations: observations,
        evidenceFrame: {
          evidenceID: primary.evidenceID,
          timelineRecordID: primary.timelineRecordID,
          path: primary.evidenceFramePath,
          timestamp: primary.evidenceFrameTimestamp,
          pathMatchesStableID: !frameIDMismatch
        },
        evidenceSuitability: {
          menuPresence: observations.some((observation) => observation.usableForCount),
          ordering: observations.some((observation) => observation.usableForOrder),
          counting: "PARTIAL_OBSERVED_VALUE_ONLY_NOT_TOTAL_COUNT",
          preliminaryVisualAnnotation: observations.some((observation) => observation.usableForVisualAnalysis),
          productionGeometricComparison: false
        },
        effectProfile: cfg.effectProfile,
        effectNotes: cfg.effectNotes,
        automaticChangesOrDependencies: {
          automaticChangesObserved: "NONE_OBSERVED",
          dependenciesObserved: "NONE_OBSERVED",
          dependencyTestingStatus: "NOT_TESTED"
        },
        visualEvidenceQuality: visualQualityFor(cfg, observations, frameIDMismatch),
        confidence: {
          labelConfidence: observations.every((observation) => observation.confidence === "HIGH") ? "HIGH" : "MEDIUM",
          orderConfidence: orderConfidenceFor(cfg, observations[0], packageIndex, frameIDMismatch),
          countConfidence: "LOW_TOTAL_COUNT_NOT_PROVEN",
          visualEvidenceConfidence: observations.some((observation) => observation.usableForVisualAnalysis) ? "MEDIUM_RESEARCH_ONLY" : "LOW"
        },
        ambiguities,
        missingEvidence: [
          "No hard first-option proof.",
          "No hard final-option proof.",
          "No wrap proof.",
          "No visible default proof.",
          "No second-person verification.",
          "No standardized production comparison capture."
        ],
        productionEligibility: {
          eligible: false,
          reason: "Research-only appearance-control observation. Requires complete boundary proof, standardized evidence where applicable, second-person verification, and production publish gate approval."
        },
        createdAt: generatedAt,
        updatedAt: generatedAt
      };
    })
    .sort((left, right) => left.nativeOrder - right.nativeOrder || left.nativeDisplayLabel.localeCompare(right.nativeDisplayLabel));
}

function buildCategorySummary(cfg, timelineRecords, records, menuRecord) {
  const first = timelineRecords[0] ?? null;
  const last = timelineRecords.at(-1) ?? null;
  const duplicateObservedValues = records
    .filter((record) => record.sourceObservations.length > 1)
    .map((record) => record.nativeDisplayLabel);
  const observedNumbers = records.map((record) => record.nativeOptionNumber).filter(Number.isInteger).sort((left, right) => left - right);
  const missingObservedRangeValues = [];
  if (observedNumbers.length > 0) {
    for (let value = observedNumbers[0]; value <= observedNumbers.at(-1); value += 1) {
      if (!observedNumbers.includes(value)) missingObservedRangeValues.push(value);
    }
  }
  return {
    category: cfg.canonicalLabel,
    timelineLabel: cfg.timelineLabel,
    parentMenu: cfg.parentMenu,
    parentMenuID: menuRecord?.parentMenuID ?? null,
    menuID: menuRecord?.stableMenuID ?? null,
    controlType: menuRecord?.controlType ?? cfg.controlTypeFallback,
    sourceVideos: [...new Set(timelineRecords.map((record) => record.video_id))],
    selectedObservationCount: timelineRecords.length,
    directlyObservedUniqueValueCount: records.length,
    firstObservedValue: first?.visible_option_label ?? null,
    firstObservedTimestampRange: first ? `${first.start_timestamp}-${first.end_timestamp}` : null,
    lastObservedValue: last?.visible_option_label ?? null,
    lastObservedTimestampRange: last ? `${last.start_timestamp}-${last.end_timestamp}` : null,
    visibleDefault: null,
    visibleDefaultStatus: "UNKNOWN_NOT_DIRECTLY_SHOWN",
    selectorWrapObserved: false,
    selectorWrapStatus: menuRecord?.wrapBehavior === "POSSIBLE_WRAP_OBSERVED_UNVERIFIED"
      ? "POSSIBLE_WRAP_OBSERVED_UNVERIFIED"
      : "NOT_OBSERVED",
    totalCount: null,
    totalCountStatus: "COUNT_UNKNOWN",
    countExplanation: "The recording contains directly selected values, but does not prove both selector boundaries and wrap behavior. Total count is not claimed.",
    missingObservedRangeValues,
    duplicateObservedValues,
    automaticChangesOrDependencies: {
      automaticChangesObserved: "NONE_OBSERVED",
      dependenciesObserved: "NONE_OBSERVED",
      dependencyTestingStatus: "NOT_TESTED"
    },
    ambiguityAndMissingRanges: [
      ...(missingObservedRangeValues.length > 0 ? [`Observed numeric range has unobserved values: ${missingObservedRangeValues.join(", ")}.`] : []),
      ...(duplicateObservedValues.length > 0 ? [`Duplicate selected values observed: ${duplicateObservedValues.join(", ")}.`] : []),
      "Beginning boundary is not proven.",
      "Ending boundary is not proven.",
      "Wrap behavior is not proven.",
      "Default value is not proven.",
      "Do not infer unobserved values between observed values."
    ],
    productionEligibility: {
      eligible: false,
      reason: "Category is partial research evidence only and cannot feed production recommendations."
    }
  };
}

function buildRecaptureRequirement(cfg, categorySummary, records, generatedAt) {
  return {
    id: `appearance-control-${cfg.slug}-recapture`,
    category: cfg.canonicalLabel,
    priority: "P0",
    status: "open",
    title: `Complete ${cfg.canonicalLabel} selector evidence`,
    productionStatus,
    verificationStatus,
    affectedRecordIDs: records.map((record) => record.stableResearchCatalogID),
    reason: "Current evidence is directly observed but incomplete for production: no complete first-to-final selector run, wrap proof, visible default proof, second review, or production-standard capture.",
    exactRecordingRequirement: `Record ${cfg.canonicalLabel} from the first available value through the final available value, pausing on each selected value long enough for label and character state review. Include beginning boundary, final boundary, wrap/no-wrap evidence, default state evidence, and dependency notes.`,
    requiredEvidence: [
      "Menu label and selected native value visible for every deliberately selected option.",
      "First-value proof.",
      "Final-value proof.",
      "Wrap or no-wrap proof.",
      "Visible default proof.",
      "Second-person verification.",
      "Dependency check against platform, mode, creation path, head, skin presentation, and relevant account/entitlement state."
    ],
    existingEvidenceRemainsUsefulFor: [
      "Menu presence",
      "Native label transcription",
      "Partial ordering",
      "Preliminary annotation"
    ],
    existingEvidenceNotSuitableFor: [
      "Production recommendation",
      "Total-count claim",
      "Production geometric comparison"
    ],
    createdAt: generatedAt,
    updatedAt: generatedAt,
    categorySummary
  };
}

function annotateEvidenceManifest(evidenceManifest, records, categories, generatedAt) {
  const updated = structuredClone(evidenceManifest);
  updated.updatedAt = generatedAt;
  updated.additionalAttributesResearchCatalog = {
    generatedAt,
    catalogPath: defaultAttributesJsonPath,
    recordCount: records.length,
    categoryCount: categories.length,
    productionStatus,
    verificationStatus,
    note: "Annotations link existing derivative evidence to research-only appearance-control records. They do not promote evidence to production."
  };
  const recordByEvidenceID = new Map();
  for (const record of records) {
    for (const observation of record.sourceObservations) {
      if (observation.evidenceID) recordByEvidenceID.set(observation.evidenceID, record);
    }
  }
  updated.entries = (updated.entries ?? []).map((entry) => {
    const record = recordByEvidenceID.get(entry.evidence_id);
    if (!record) return entry;
    return {
      ...entry,
      additionalAttributeResearchCatalogID: record.stableResearchCatalogID,
      additionalAttributeCategory: record.category,
      additionalAttributeNativeDisplayLabel: record.nativeDisplayLabel,
      additionalAttributeProductionStatus: productionStatus
    };
  });
  return updated;
}

function updateIssuesRegister(issuesRegister, recaptureItems, generatedAt) {
  const updated = structuredClone(issuesRegister);
  updated.updatedAt = latestTimestamp(updated.updatedAt, generatedAt);
  const existing = new Map((updated.issues ?? []).map((issue) => [issue.issueID, issue]));
  for (const item of recaptureItems) {
    const issueID = `issue-phase0-${item.id}`;
    const existingIssue = existing.get(issueID);
    existing.set(issueID, {
      issueID,
      kind: "recaptureRequired",
      title: item.title,
      description: item.reason,
      owner: "wyatt-skaggs",
      severity: "blocking",
      status: "open",
      affectedRecordIDs: item.affectedRecordIDs,
      affectedEvidenceFileIDs: [],
      createdAt: existingIssue?.createdAt ?? generatedAt,
      updatedAt: latestTimestamp(existingIssue?.updatedAt, generatedAt),
      resolutionNotes: "",
      recaptureRequest: {
        required: true,
        queueStatus: "queued",
        requestedAngles: [],
        requestedEvidenceKinds: item.requiredEvidence,
        owner: "wyatt-skaggs",
        priority: "blocking",
        notes: item.exactRecordingRequirement
      }
    });
  }
  updated.issues = [...existing.values()].sort((left, right) => left.issueID.localeCompare(right.issueID));
  return updated;
}

function latestTimestamp(left, right) {
  if (!left) return right;
  if (!right) return left;
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) return leftTime >= rightTime ? left : right;
  return String(left) >= String(right) ? left : right;
}

function writeCategoryMarkdown(root, catalog, summaryDirectory) {
  for (const category of catalog.categories) {
    const records = catalog.records.filter((record) => record.category === category.category);
    const slug = categoryConfigs.find((cfg) => cfg.canonicalLabel === category.category)?.slug ?? slugify(category.category);
    const lines = [
      `# ${category.category} Research Summary`,
      "",
      "PRIMARY RESEARCH CANDIDATE - NOT PRODUCTION VERIFIED",
      "",
      "This summary contains only directly observed values from supplied College Football 27 video evidence. It must not be used for production recommendations.",
      "",
      "## Category Facts",
      "",
      `- Parent menu: ${category.parentMenu}`,
      `- Control type: ${category.controlType}`,
      `- Source videos: ${category.sourceVideos.join(", ") || "none"}`,
      `- Selected observations: ${category.selectedObservationCount}`,
      `- Directly observed unique values: ${category.directlyObservedUniqueValueCount}`,
      `- First observed value: ${category.firstObservedValue ?? "unknown"} (${category.firstObservedTimestampRange ?? "no timestamp"})`,
      `- Last observed value: ${category.lastObservedValue ?? "unknown"} (${category.lastObservedTimestampRange ?? "no timestamp"})`,
      `- Visible default: ${category.visibleDefaultStatus}`,
      `- Selector wrap: ${category.selectorWrapStatus}`,
      `- Total count: ${category.totalCountStatus}`,
      `- Count explanation: ${category.countExplanation}`,
      "",
      "## Directly Observed Values",
      "",
      "| Native order | Native display label | Source video | Timestamp | Evidence frame | Production geometry |",
      "| ---: | --- | --- | --- | --- | --- |"
    ];
    for (const record of records) {
      lines.push(`| ${record.nativeOrder} | ${record.nativeDisplayLabel} | ${record.sourceVideo} | ${record.sourceTimestampRange} | ${record.evidenceFrame.path ?? ""} | ${record.evidenceSuitability.productionGeometricComparison ? "yes" : "no"} |`);
    }
    lines.push(
      "",
      "## Effect Classification",
      "",
      ...categoryEffectLines(records[0]),
      "",
      "## Ambiguity And Missing Evidence",
      "",
      ...category.ambiguityAndMissingRanges.map((item) => `- ${item}`),
      "",
      "## Recapture Requirement",
      "",
      `Record ${category.category} from the first available value through the final available value, including boundary proof, wrap/no-wrap proof, default proof, dependency notes, and second-person verification.`
    );
    writeText(root, `${summaryDirectory}/${upperSnake(slug)}_RESEARCH_SUMMARY.md`, `${lines.join("\n")}\n`);
  }
}

function categoryEffectLines(record) {
  if (!record) return ["- No directly observed records."];
  return [
    `- Geometry: ${record.effectProfile.geometry}`,
    `- Texture: ${record.effectProfile.texture}`,
    `- Color: ${record.effectProfile.color}`,
    `- Presentation only: ${record.effectProfile.presentationOnly}`,
    ...record.effectNotes.map((note) => `- ${note}`)
  ];
}

function formatAttributesCsv(records) {
  const columns = [
    "stableResearchCatalogID",
    "category",
    "parentMenuLabel",
    "controlType",
    "nativeOrder",
    "nativeDisplayLabel",
    "nativeOptionNumber",
    "sourceVideo",
    "sourceTimestampRange",
    "evidenceID",
    "evidenceFramePath",
    "visibleDefaultStatus",
    "selectorWrapObserved",
    "totalCountSupported",
    "geometryEffect",
    "textureEffect",
    "colorEffect",
    "presentationOnlyEffect",
    "orderConfidence",
    "countConfidence",
    "productionGeometricComparison",
    "productionStatus",
    "verificationStatus"
  ];
  return toCsv(columns, records.map((record) => ({
    stableResearchCatalogID: record.stableResearchCatalogID,
    category: record.category,
    parentMenuLabel: record.parentMenuLabel,
    controlType: record.controlType,
    nativeOrder: record.nativeOrder,
    nativeDisplayLabel: record.nativeDisplayLabel,
    nativeOptionNumber: record.nativeOptionNumber,
    sourceVideo: record.sourceVideo,
    sourceTimestampRange: record.sourceTimestampRange,
    evidenceID: record.evidenceFrame.evidenceID,
    evidenceFramePath: record.evidenceFrame.path,
    visibleDefaultStatus: record.defaultStatus,
    selectorWrapObserved: record.selectorWrapObserved,
    totalCountSupported: record.totalCountSupported,
    geometryEffect: record.effectProfile.geometry,
    textureEffect: record.effectProfile.texture,
    colorEffect: record.effectProfile.color,
    presentationOnlyEffect: record.effectProfile.presentationOnly,
    orderConfidence: record.confidence.orderConfidence,
    countConfidence: record.confidence.countConfidence,
    productionGeometricComparison: record.evidenceSuitability.productionGeometricComparison,
    productionStatus: record.productionStatus,
    verificationStatus: record.verificationStatus
  })));
}

function formatRecaptureCsv(items) {
  const columns = ["id", "category", "priority", "status", "title", "reason", "exactRecordingRequirement", "requiredEvidence", "productionStatus", "verificationStatus"];
  return toCsv(columns, items.map((item) => ({
    ...item,
    requiredEvidence: item.requiredEvidence.join("|")
  })));
}

function loadPackageIndexes(root) {
  const indexes = new Map();
  for (const cfg of categoryConfigs) {
    if (!cfg.packagePath) continue;
    const filePath = path.resolve(root, cfg.packagePath);
    if (!fs.existsSync(filePath)) continue;
    const packageJson = readJson(filePath);
    const byLabel = new Map();
    for (const record of packageJson.records ?? []) {
      const label = record.visibleGameLabelOrIndex ?? record.nativeLabelOriginalText;
      if (!label) continue;
      byLabel.set(normalizeLabel(label), {
        nativeOrder: record.nativeOrder,
        stableInternalID: record.stableInternalID
      });
    }
    indexes.set(cfg.slug, byLabel);
  }
  return indexes;
}

function nativeOrderFor(cfg, observation, packageIndex, fallbackIndex) {
  if (cfg.stableOrder === "numericLabel" && Number.isInteger(observation.visibleOptionIndex)) {
    return observation.visibleOptionIndex;
  }
  return packageIndex.get(normalizeLabel(observation.visibleOptionLabel))?.nativeOrder ?? fallbackIndex + 1;
}

function nativeOrderBasisFor(cfg, observation, packageIndex) {
  if (cfg.stableOrder === "numericLabel" && Number.isInteger(observation.visibleOptionIndex)) {
    return "DIRECT_VISIBLE_NUMERIC_NATIVE_LABEL";
  }
  if (packageIndex.has(normalizeLabel(observation.visibleOptionLabel))) {
    return "EXISTING_RESEARCH_GRID_ORDER_PENDING_REVIEW";
  }
  return "FIRST_OBSERVED_SEQUENCE_PENDING_NATIVE_ORDER_REVIEW";
}

function orderConfidenceFor(cfg, observation, packageIndex, frameIDMismatch) {
  if (frameIDMismatch) return "MEDIUM_FRAME_ID_MISMATCH_REVIEW_REQUIRED";
  if (cfg.stableOrder === "numericLabel" && Number.isInteger(observation.visibleOptionIndex)) return "HIGH_VISIBLE_NATIVE_NUMBER";
  if (packageIndex.has(normalizeLabel(observation.visibleOptionLabel))) return "MEDIUM_EXISTING_RESEARCH_GRID_ORDER_PENDING_REVIEW";
  return "LOW_FIRST_OBSERVED_SEQUENCE_ONLY";
}

function choosePrimaryObservation(observations, stableID) {
  return observations.find((observation) => observation.evidenceFramePath?.includes(stableID)) ?? observations[0];
}

function visualQualityFor(cfg, observations, frameIDMismatch) {
  if (frameIDMismatch) return "LIMITED_RESEARCH_FRAME_ID_REVIEW_REQUIRED";
  if (observations.some((observation) => observation.usableForVisualAnalysis)) return "RESEARCH_MENU_AND_REPRESENTATIVE_FRAME";
  return "RESEARCH_MENU_EVIDENCE_ONLY";
}

function categoryValueKey(cfg, label, index) {
  if (cfg.stableOrder === "numericLabel" && Number.isInteger(index)) return `${cfg.slug}:${index}`;
  return `${cfg.slug}:${normalizeLabel(label)}`;
}

function config(input) {
  return input;
}

function normalizeLabel(label) {
  return String(label ?? "").trim().toLowerCase();
}

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function upperSnake(text) {
  return slugify(text).replaceAll("-", "_").toUpperCase();
}

function toCsv(columns, rows) {
  return `${[columns, ...rows.map((row) => columns.map((column) => row[column] ?? ""))]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n")}\n`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeText(root, relativePath, text) {
  const filePath = path.resolve(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
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
  console.log("Usage: node scripts/cf27-appearance-controls-research-catalog.mjs [--generated-at <iso>]");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }
    const outputs = generateAppearanceControlsResearchCatalog(options);
    writeAppearanceControlsResearchCatalog(outputs, options);
    console.log(`Appearance-control research catalog generated: ${outputs.catalog.records.length} records across ${outputs.catalog.categories.length} categories.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
