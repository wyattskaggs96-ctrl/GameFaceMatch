import type { ISODateString } from "@/types/domain";
import type { Phase0EntityID, Phase0VersionID, Phase0VerificationState } from "./phase-zero-domain";

export const PHASE0_MENU_MAP_SCHEMA_VERSION = "phase0-menu-map-v1";

export type Phase0MenuControlType = "menu" | "submenu" | "list" | "carousel" | "slider" | "toggle" | "text" | "colorPicker" | "numericStepper" | "unknown";
export type Phase0MenuWrapBehavior = "wraps" | "clamps" | "none" | "unknown";
export type Phase0MenuVisibleLabelState = "visible" | "hidden" | "conditional" | "unknown";
export type Phase0MenuResetBehavior = "resetsToDefault" | "persists" | "resetsToPrevious" | "unknown";
export type Phase0MenuLaterEditability = "editableLater" | "lockedAfterCreation" | "conditional" | "unknown";

export const PHASE0_MENU_CONTROL_TYPES: Phase0MenuControlType[] = ["menu", "submenu", "list", "carousel", "slider", "toggle", "text", "colorPicker", "numericStepper", "unknown"];
export const PHASE0_MENU_WRAP_BEHAVIORS: Phase0MenuWrapBehavior[] = ["wraps", "clamps", "none", "unknown"];
export const PHASE0_MENU_VISIBLE_LABEL_STATES: Phase0MenuVisibleLabelState[] = ["visible", "hidden", "conditional", "unknown"];
export const PHASE0_MENU_RESET_BEHAVIORS: Phase0MenuResetBehavior[] = ["resetsToDefault", "persists", "resetsToPrevious", "unknown"];
export const PHASE0_MENU_LATER_EDITABILITY_STATES: Phase0MenuLaterEditability[] = ["editableLater", "lockedAfterCreation", "conditional", "unknown"];
export const PHASE0_MENU_VERIFICATION_STATES: Phase0VerificationState[] = [
  "draft",
  "firstReviewPending",
  "firstReviewApproved",
  "secondReviewPending",
  "verified",
  "rejected",
  "retired"
];

export interface Phase0MenuEvidenceReference {
  evidenceFileID: Phase0EntityID;
  description: string;
}

export interface Phase0ScrollingContinuationEvidence {
  fromMenuID: Phase0EntityID;
  toMenuID: Phase0EntityID;
  direction: "up" | "down" | "left" | "right";
  evidenceFileIDs: Phase0EntityID[];
  notes: string;
}

export interface Phase0MenuDependency {
  id: Phase0EntityID;
  dependsOnMenuID: Phase0EntityID;
  condition: string;
  evidenceFileIDs: Phase0EntityID[];
}

export interface Phase0MenuLock {
  id: Phase0EntityID;
  reason: string;
  evidenceFileIDs: Phase0EntityID[];
}

export interface Phase0MenuWarning {
  id: Phase0EntityID;
  message: string;
  evidenceFileIDs: Phase0EntityID[];
}

export interface Phase0MenuDefect {
  id: Phase0EntityID;
  description: string;
  severity: "minor" | "major" | "blocking";
  evidenceFileIDs: Phase0EntityID[];
}

export interface Phase0MenuMapItem {
  stableMenuID: Phase0EntityID;
  parentMenuID: Phase0EntityID | null;
  displayLabel: string;
  nativeLabel: string;
  nativeOrder: number;
  controlType: Phase0MenuControlType;
  minimum: number | null;
  maximum: number | null;
  step: number | null;
  defaultValue: string | number | boolean | null;
  totalValues: number | null;
  wrapBehavior: Phase0MenuWrapBehavior;
  visibleLabelState: Phase0MenuVisibleLabelState;
  advancedControl: boolean;
  resetBehavior: Phase0MenuResetBehavior;
  laterEditability: Phase0MenuLaterEditability;
  dependencies: Phase0MenuDependency[];
  locks: Phase0MenuLock[];
  warnings: Phase0MenuWarning[];
  defects: Phase0MenuDefect[];
  environmentID: Phase0EntityID;
  evidence: Phase0MenuEvidenceReference[];
  scrollingContinuationEvidence: Phase0ScrollingContinuationEvidence[];
  captureResearcher: string;
  verifier: string | null;
  verificationStatus: Phase0VerificationState;
  notes: string;
}

export interface Phase0MenuMap {
  schemaVersion: typeof PHASE0_MENU_MAP_SCHEMA_VERSION;
  mapID: Phase0EntityID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  gameID: Phase0EntityID;
  creationPathID: Phase0EntityID;
  catalogVersionID: Phase0VersionID | null;
  items: Phase0MenuMapItem[];
}

export interface Phase0MenuMapValidationIssue {
  code: string;
  message: string;
  menuID?: string;
}

export interface Phase0MenuMapValidationReport {
  ok: boolean;
  errors: Phase0MenuMapValidationIssue[];
  warnings: Phase0MenuMapValidationIssue[];
}

export interface Phase0MenuTreeNode {
  item: Phase0MenuMapItem;
  children: Phase0MenuTreeNode[];
}

export type Phase0MenuMapItemInput = Partial<Phase0MenuMapItem> & Pick<Phase0MenuMapItem, "stableMenuID" | "parentMenuID" | "displayLabel" | "nativeLabel" | "nativeOrder" | "controlType" | "environmentID" | "captureResearcher">;

export function createEmptyPhase0MenuMap({
  mapID,
  gameID,
  creationPathID,
  nowISO
}: {
  mapID: Phase0EntityID;
  gameID: Phase0EntityID;
  creationPathID: Phase0EntityID;
  nowISO: ISODateString;
}): Phase0MenuMap {
  return {
    schemaVersion: PHASE0_MENU_MAP_SCHEMA_VERSION,
    mapID,
    createdAt: nowISO,
    updatedAt: nowISO,
    gameID,
    creationPathID,
    catalogVersionID: null,
    items: []
  };
}

export function createPhase0MenuMapItem(input: Phase0MenuMapItemInput): Phase0MenuMapItem {
  return {
    minimum: null,
    maximum: null,
    step: null,
    defaultValue: null,
    totalValues: null,
    wrapBehavior: "unknown",
    visibleLabelState: "unknown",
    advancedControl: false,
    resetBehavior: "unknown",
    laterEditability: "unknown",
    dependencies: [],
    locks: [],
    warnings: [],
    defects: [],
    evidence: [],
    scrollingContinuationEvidence: [],
    verifier: null,
    verificationStatus: "draft",
    notes: "Research draft awaiting direct evidence.",
    ...input
  };
}

export function addPhase0MenuMapItem(menuMap: Phase0MenuMap, item: Phase0MenuMapItem, updatedAt: ISODateString): Phase0MenuMap {
  return {
    ...menuMap,
    updatedAt,
    items: [...menuMap.items, item]
  };
}

export function reorderPhase0MenuSiblings(menuMap: Phase0MenuMap, parentMenuID: Phase0EntityID | null, orderedMenuIDs: Phase0EntityID[], updatedAt: ISODateString): Phase0MenuMap {
  const orderLookup = new Map(orderedMenuIDs.map((menuID, index) => [menuID, index + 1]));
  return {
    ...menuMap,
    updatedAt,
    items: menuMap.items.map((item) => {
      if (item.parentMenuID !== parentMenuID) return item;
      const nextOrder = orderLookup.get(item.stableMenuID);
      return nextOrder ? { ...item, nativeOrder: nextOrder } : item;
    })
  };
}

export function buildPhase0MenuTree(menuMap: Phase0MenuMap): Phase0MenuTreeNode[] {
  function build(parentMenuID: Phase0EntityID | null): Phase0MenuTreeNode[] {
    return getPhase0MenuChildren(menuMap, parentMenuID).map((item) => ({
      item,
      children: build(item.stableMenuID)
    }));
  }
  return build(null);
}

export function exportReadablePhase0MenuTree(menuMap: Phase0MenuMap): string {
  const lines = [
    `Menu map: ${menuMap.mapID}`,
    `Game: ${menuMap.gameID}`,
    `Creation path: ${menuMap.creationPathID}`,
    `Catalog version: ${menuMap.catalogVersionID ?? "not assigned"}`,
    ""
  ];
  for (const node of buildPhase0MenuTree(menuMap)) {
    appendMenuTreeLines(node, 0, lines);
  }
  return lines.join("\n").trimEnd();
}

export function validatePhase0MenuMap(menuMap: Phase0MenuMap): Phase0MenuMapValidationReport {
  const errors: Phase0MenuMapValidationIssue[] = [];
  const warnings: Phase0MenuMapValidationIssue[] = [];
  if (menuMap.schemaVersion !== PHASE0_MENU_MAP_SCHEMA_VERSION) {
    errors.push({ code: "invalidSchemaVersion", message: `Expected ${PHASE0_MENU_MAP_SCHEMA_VERSION}.` });
  }
  if (!isISODate(menuMap.createdAt) || !isISODate(menuMap.updatedAt)) {
    errors.push({ code: "invalidTimestamp", message: "Menu map timestamps must be valid ISO strings." });
  }
  const ids = new Set<string>();
  for (const item of menuMap.items) {
    validateMenuItem(item, errors, warnings);
    if (ids.has(item.stableMenuID)) {
      errors.push({ code: "duplicateMenuID", message: `Duplicate stable menu ID: ${item.stableMenuID}.`, menuID: item.stableMenuID });
    }
    ids.add(item.stableMenuID);
  }
  for (const item of menuMap.items) {
    if (item.parentMenuID && !ids.has(item.parentMenuID)) {
      errors.push({ code: "invalidParentMenuID", message: `${item.stableMenuID} references missing parent ${item.parentMenuID}.`, menuID: item.stableMenuID });
    }
    if (item.parentMenuID === item.stableMenuID) {
      errors.push({ code: "invalidParentMenuID", message: `${item.stableMenuID} cannot be its own parent.`, menuID: item.stableMenuID });
    }
    for (const continuation of item.scrollingContinuationEvidence) {
      if (!ids.has(continuation.fromMenuID) || !ids.has(continuation.toMenuID)) {
        errors.push({ code: "invalidScrollingContinuation", message: `${item.stableMenuID} has continuation evidence for a missing menu item.`, menuID: item.stableMenuID });
      }
      if (continuation.evidenceFileIDs.length === 0) {
        errors.push({ code: "missingEvidence", message: `${item.stableMenuID} scrolling continuation requires evidence.`, menuID: item.stableMenuID });
      }
    }
  }
  for (const cycleID of findParentCycles(menuMap.items)) {
    errors.push({ code: "invalidParentCycle", message: `${cycleID} participates in a parent cycle.`, menuID: cycleID });
  }
  warnings.push(...findSiblingOrderWarnings(menuMap.items));
  warnings.push(...findDuplicateSiblingLabelWarnings(menuMap.items));
  return { ok: errors.length === 0, errors, warnings };
}

export function getPhase0MenuChildren(menuMap: Phase0MenuMap, parentMenuID: Phase0EntityID | null) {
  return menuMap.items.filter((item) => item.parentMenuID === parentMenuID).sort((a, b) => a.nativeOrder - b.nativeOrder);
}

function validateMenuItem(item: Phase0MenuMapItem, errors: Phase0MenuMapValidationIssue[], warnings: Phase0MenuMapValidationIssue[]) {
  for (const [field, value] of [
    ["stableMenuID", item.stableMenuID],
    ["displayLabel", item.displayLabel],
    ["nativeLabel", item.nativeLabel],
    ["environmentID", item.environmentID],
    ["captureResearcher", item.captureResearcher],
    ["notes", item.notes]
  ] as const) {
    if (!hasUsableText(value)) errors.push({ code: "missingMenuField", message: `${item.stableMenuID || "menu item"} is missing ${field}.`, menuID: item.stableMenuID });
  }
  if (!Number.isInteger(item.nativeOrder) || item.nativeOrder < 1) {
    errors.push({ code: "invalidNativeOrder", message: `${item.stableMenuID} nativeOrder must be a positive integer.`, menuID: item.stableMenuID });
  }
  if (item.evidence.length === 0) {
    errors.push({ code: "missingEvidence", message: `${item.stableMenuID} requires menu evidence.`, menuID: item.stableMenuID });
  }
  for (const evidence of item.evidence) {
    if (!hasUsableText(evidence.evidenceFileID) || !hasUsableText(evidence.description)) {
      errors.push({ code: "missingEvidence", message: `${item.stableMenuID} has incomplete evidence metadata.`, menuID: item.stableMenuID });
    }
  }
  for (const linked of [...item.dependencies, ...item.locks, ...item.warnings]) {
    if (linked.evidenceFileIDs.length === 0) {
      warnings.push({ code: "linkedMenuMetadataWithoutEvidence", message: `${item.stableMenuID} has dependency/lock/warning metadata without evidence.`, menuID: item.stableMenuID });
    }
  }
  for (const defect of item.defects) {
    if (defect.evidenceFileIDs.length === 0) {
      errors.push({ code: "missingEvidence", message: `${item.stableMenuID} defect requires evidence.`, menuID: item.stableMenuID });
    }
  }
  if (item.verificationStatus === "verified" && !hasUsableText(item.verifier ?? "")) {
    errors.push({ code: "missingVerifier", message: `${item.stableMenuID} cannot be verified without a verifier.`, menuID: item.stableMenuID });
  }
  if (item.visibleLabelState === "hidden" && item.evidence.length === 0) {
    errors.push({ code: "missingEvidence", message: `${item.stableMenuID} hidden control state requires evidence.`, menuID: item.stableMenuID });
  }
  if (item.advancedControl && item.evidence.length === 0) {
    errors.push({ code: "missingEvidence", message: `${item.stableMenuID} advanced-control marking requires evidence.`, menuID: item.stableMenuID });
  }
  validateControlRange(item, errors);
}

function validateControlRange(item: Phase0MenuMapItem, errors: Phase0MenuMapValidationIssue[]) {
  const rangeValues = [item.minimum, item.maximum, item.step].filter((value): value is number => value !== null);
  if (rangeValues.some((value) => !Number.isFinite(value))) {
    errors.push({ code: "invalidControlRange", message: `${item.stableMenuID} has non-finite numeric control metadata.`, menuID: item.stableMenuID });
  }
  if (item.minimum !== null && item.maximum !== null && item.minimum > item.maximum) {
    errors.push({ code: "invalidControlRange", message: `${item.stableMenuID} minimum cannot exceed maximum.`, menuID: item.stableMenuID });
  }
  if (item.step !== null && item.step <= 0) {
    errors.push({ code: "invalidControlRange", message: `${item.stableMenuID} step must be positive.`, menuID: item.stableMenuID });
  }
  if (item.totalValues !== null && (!Number.isInteger(item.totalValues) || item.totalValues < 1)) {
    errors.push({ code: "invalidControlRange", message: `${item.stableMenuID} totalValues must be a positive integer.`, menuID: item.stableMenuID });
  }
  if ((item.controlType === "slider" || item.controlType === "numericStepper") && (item.minimum === null || item.maximum === null || item.step === null)) {
    errors.push({ code: "missingNumericControlMetadata", message: `${item.stableMenuID} numeric control requires minimum, maximum, and step.`, menuID: item.stableMenuID });
  }
}

function findParentCycles(items: Phase0MenuMapItem[]) {
  const byID = new Map(items.map((item) => [item.stableMenuID, item]));
  const cycleIDs = new Set<string>();
  for (const item of items) {
    const seen = new Set<string>();
    let current: Phase0MenuMapItem | undefined = item;
    while (current?.parentMenuID) {
      if (seen.has(current.parentMenuID)) {
        cycleIDs.add(item.stableMenuID);
        break;
      }
      seen.add(current.stableMenuID);
      current = byID.get(current.parentMenuID);
    }
  }
  return Array.from(cycleIDs).sort();
}

function findSiblingOrderWarnings(items: Phase0MenuMapItem[]): Phase0MenuMapValidationIssue[] {
  const warnings: Phase0MenuMapValidationIssue[] = [];
  for (const [parentID, siblings] of groupByParent(items)) {
    const orders = siblings.map((item) => item.nativeOrder);
    const duplicateOrders = orders.filter((order, index) => orders.indexOf(order) !== index);
    for (const duplicateOrder of Array.from(new Set(duplicateOrders)).sort((a, b) => a - b)) {
      warnings.push({
        code: "duplicateNativeOrder",
        message: `Menu siblings under ${parentID ?? "root"} reuse native order ${duplicateOrder}. Confirm whether this reflects the shipping game.`,
        menuID: siblings.find((item) => item.nativeOrder === duplicateOrder)?.stableMenuID
      });
    }
    const uniqueOrders = Array.from(new Set(orders)).sort((a, b) => a - b);
    for (let expectedOrder = 1; expectedOrder <= uniqueOrders.length; expectedOrder += 1) {
      if (!uniqueOrders.includes(expectedOrder)) {
        warnings.push({
          code: "missingNativeOrderIndex",
          message: `Menu siblings under ${parentID ?? "root"} skip native order ${expectedOrder}. Record scroll evidence or reorder after audit.`,
          menuID: siblings[0]?.stableMenuID
        });
      }
    }
  }
  return warnings;
}

function findDuplicateSiblingLabelWarnings(items: Phase0MenuMapItem[]): Phase0MenuMapValidationIssue[] {
  const warnings: Phase0MenuMapValidationIssue[] = [];
  for (const [parentID, siblings] of groupByParent(items)) {
    for (const labelType of ["displayLabel", "nativeLabel"] as const) {
      const byLabel = siblings.reduce((map, item) => {
        const normalizedLabel = item[labelType].trim().toLowerCase();
        if (!normalizedLabel) return map;
        map.set(normalizedLabel, [...(map.get(normalizedLabel) ?? []), item]);
        return map;
      }, new Map<string, Phase0MenuMapItem[]>());
      for (const [label, duplicates] of byLabel) {
        if (duplicates.length > 1) {
          warnings.push({
            code: "duplicateSiblingLabel",
            message: `Menu siblings under ${parentID ?? "root"} share ${labelType} "${label}". This may be legitimate; attach evidence or notes.`,
            menuID: duplicates[0].stableMenuID
          });
        }
      }
    }
  }
  return warnings;
}

function groupByParent(items: Phase0MenuMapItem[]) {
  return items.reduce((groups, item) => {
    const siblings = groups.get(item.parentMenuID) ?? [];
    groups.set(item.parentMenuID, [...siblings, item]);
    return groups;
  }, new Map<Phase0EntityID | null, Phase0MenuMapItem[]>());
}

function appendMenuTreeLines(node: Phase0MenuTreeNode, depth: number, lines: string[]) {
  const prefix = "  ".repeat(depth);
  const hiddenLabel = node.item.visibleLabelState === "hidden" ? " hidden" : "";
  const advancedLabel = node.item.advancedControl ? " advanced" : "";
  const rangeLabel = formatRangeLabel(node.item);
  lines.push(
    `${prefix}${node.item.nativeOrder}. ${node.item.displayLabel} [${node.item.stableMenuID}] (${node.item.controlType}${hiddenLabel}${advancedLabel})${rangeLabel}`
  );
  if (node.item.dependencies.length > 0) {
    lines.push(`${prefix}   dependencies: ${node.item.dependencies.map((dependency) => dependency.condition).join("; ")}`);
  }
  if (node.item.locks.length > 0) {
    lines.push(`${prefix}   locks: ${node.item.locks.map((lock) => lock.reason).join("; ")}`);
  }
  if (node.item.defects.length > 0) {
    lines.push(`${prefix}   defects: ${node.item.defects.map((defect) => `${defect.severity}: ${defect.description}`).join("; ")}`);
  }
  for (const child of node.children) {
    appendMenuTreeLines(child, depth + 1, lines);
  }
}

function formatRangeLabel(item: Phase0MenuMapItem) {
  if (item.minimum === null && item.maximum === null && item.step === null && item.defaultValue === null && item.totalValues === null) return "";
  return ` range[min=${item.minimum ?? "n/a"}, max=${item.maximum ?? "n/a"}, step=${item.step ?? "n/a"}, default=${String(item.defaultValue ?? "n/a")}, total=${item.totalValues ?? "n/a"}]`;
}

function isISODate(value: string) {
  return value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function hasUsableText(value: string) {
  return value.trim().length > 0 && !/REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i.test(value);
}
