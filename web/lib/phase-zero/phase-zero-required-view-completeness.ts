import type { Phase0EntityID, Phase0VerificationState } from "./phase-zero-domain";
import type { Phase0EnvironmentWizardDraft, EnvironmentEvidenceSlotID } from "./phase-zero-environment-wizard";
import { requiredEvidenceSlotIDs } from "./phase-zero-environment-wizard";
import type { Phase0HeadCaptureEntry, Phase0HeadCaptureViewID } from "./phase-zero-head-capture-workspace";
import { PHASE0_REQUIRED_HEAD_CAPTURE_VIEW_IDS } from "./phase-zero-head-capture-workspace";
import type { Phase0HairstyleCaptureEntry, Phase0HairstyleCaptureViewID } from "./phase-zero-hairstyle-capture-workspace";
import { PHASE0_REQUIRED_HAIRSTYLE_CAPTURE_VIEW_IDS } from "./phase-zero-hairstyle-capture-workspace";
import type { Phase0FacialHairCaptureEntry, Phase0FacialHairCaptureViewID } from "./phase-zero-facial-hair-capture-workspace";
import { PHASE0_REQUIRED_FACIAL_HAIR_CAPTURE_VIEW_IDS } from "./phase-zero-facial-hair-capture-workspace";
import type { Phase0AdditionalAttributeEntry } from "./phase-zero-additional-attributes-workspace";
import type { Phase0MenuMap, Phase0MenuMapItem } from "./phase-zero-menu-map";

export const PHASE0_REQUIRED_VIEW_COMPLETENESS_SCHEMA_VERSION = "phase0-required-view-completeness-v1";

export type Phase0RequiredViewCategory =
  | "heads"
  | "hairstyles"
  | "facialHair"
  | "additionalAttributes"
  | "environmentEvidence"
  | "menuEvidence";

export type Phase0RequiredViewStatus = "missing" | "present" | "rejected" | "recaptureRequested" | "verified";

export interface Phase0RequiredViewRule {
  viewID: string;
  label: string;
  required: boolean;
}

export interface Phase0RequiredViewEvidenceInput {
  viewID: string;
  evidenceFileIDs: Phase0EntityID[];
  verificationStatus?: Phase0VerificationState;
  rejected?: boolean;
  recaptureRequested?: boolean;
  notes?: string;
}

export interface Phase0RequiredViewState {
  viewID: string;
  label: string;
  required: boolean;
  present: boolean;
  missing: boolean;
  rejected: boolean;
  recaptureRequested: boolean;
  verified: boolean;
  status: Phase0RequiredViewStatus;
  evidenceFileIDs: Phase0EntityID[];
  blocking: boolean;
  notes: string[];
}

export interface Phase0RequiredViewCompletenessReport {
  schemaVersion: typeof PHASE0_REQUIRED_VIEW_COMPLETENESS_SCHEMA_VERSION;
  category: Phase0RequiredViewCategory;
  entityID: Phase0EntityID;
  label: string;
  rows: Phase0RequiredViewState[];
  summary: {
    requiredCount: number;
    presentCount: number;
    missingCount: number;
    rejectedCount: number;
    recaptureRequestedCount: number;
    verifiedCount: number;
    blockingCount: number;
  };
  productionCompletionAllowed: boolean;
  productionBlockers: string[];
  notice: string;
}

export const PHASE0_REQUIRED_VIEW_RULES: Record<Phase0RequiredViewCategory, Phase0RequiredViewRule[]> = {
  heads: PHASE0_REQUIRED_HEAD_CAPTURE_VIEW_IDS.map((viewID) => rule(viewID, humanizeViewID(viewID))),
  hairstyles: PHASE0_REQUIRED_HAIRSTYLE_CAPTURE_VIEW_IDS.map((viewID) => rule(viewID, humanizeViewID(viewID))),
  facialHair: PHASE0_REQUIRED_FACIAL_HAIR_CAPTURE_VIEW_IDS.map((viewID) => rule(viewID, humanizeViewID(viewID))),
  additionalAttributes: [
    rule("boundaryEvidence", "Boundary evidence"),
    rule("representativeEvidence", "Representative evidence")
  ],
  environmentEvidence: requiredEvidenceSlotIDs().map((viewID) => rule(viewID, environmentEvidenceLabel(viewID))),
  menuEvidence: [
    rule("menuOverview", "Menu overview evidence"),
    rule("navigationEvidence", "Navigation evidence"),
    rule("scrollContinuation", "Scrolling-continuation evidence", false)
  ]
};

export function createRequiredViewCompletenessReport({
  category,
  entityID,
  label,
  evidence,
  rules = PHASE0_REQUIRED_VIEW_RULES[category]
}: {
  category: Phase0RequiredViewCategory;
  entityID: Phase0EntityID;
  label: string;
  evidence: Phase0RequiredViewEvidenceInput[];
  rules?: Phase0RequiredViewRule[];
}): Phase0RequiredViewCompletenessReport {
  const evidenceByView = new Map<string, Phase0RequiredViewEvidenceInput[]>();
  for (const item of evidence) {
    evidenceByView.set(item.viewID, [...(evidenceByView.get(item.viewID) ?? []), item]);
  }

  const rows = rules.map((viewRule) => {
    const matches = evidenceByView.get(viewRule.viewID) ?? [];
    const evidenceFileIDs = unique(matches.flatMap((item) => item.evidenceFileIDs).filter(hasText));
    const present = evidenceFileIDs.length > 0;
    const rejected = matches.some((item) => item.rejected || item.verificationStatus === "rejected");
    const recaptureRequested = matches.some((item) => item.recaptureRequested);
    const verified = present && matches.some((item) => item.verificationStatus === "verified");
    const missing = viewRule.required && !present;
    const status = statusFor({ missing, rejected, recaptureRequested, verified, present });
    const blocking = viewRule.required && (missing || rejected || recaptureRequested);
    return {
      viewID: viewRule.viewID,
      label: viewRule.label,
      required: viewRule.required,
      present,
      missing,
      rejected,
      recaptureRequested,
      verified,
      status,
      evidenceFileIDs,
      blocking,
      notes: matches.flatMap((item) => item.notes ? [item.notes] : [])
    };
  });

  const requiredRows = rows.filter((row) => row.required);
  const productionBlockers = rows.filter((row) => row.blocking).map((row) => `${row.label}: ${row.status}.`);
  return {
    schemaVersion: PHASE0_REQUIRED_VIEW_COMPLETENESS_SCHEMA_VERSION,
    category,
    entityID,
    label,
    rows,
    summary: {
      requiredCount: requiredRows.length,
      presentCount: requiredRows.filter((row) => row.present).length,
      missingCount: requiredRows.filter((row) => row.missing).length,
      rejectedCount: requiredRows.filter((row) => row.rejected).length,
      recaptureRequestedCount: requiredRows.filter((row) => row.recaptureRequested).length,
      verifiedCount: requiredRows.filter((row) => row.verified).length,
      blockingCount: productionBlockers.length
    },
    productionCompletionAllowed: productionBlockers.length === 0,
    productionBlockers,
    notice: "Required-view completeness blocks production when mandatory evidence is missing, rejected, or awaiting recapture; it does not auto-verify College Football 27 catalog records."
  };
}

export function checkHeadRequiredViews(entry: Phase0HeadCaptureEntry): Phase0RequiredViewCompletenessReport {
  return createRequiredViewCompletenessReport({
    category: "heads",
    entityID: entry.entryID,
    label: entry.stableInternalID,
    evidence: [
      ...entry.viewEvidence
        .filter((item): item is typeof item & { viewID: Phase0HeadCaptureViewID } => item.viewID !== "fullScreenMenu")
        .map((item) => ({
          viewID: item.viewID,
          evidenceFileIDs: [item.evidenceFileID],
          verificationStatus: entry.verificationStatus,
          rejected: entry.catalogManagerDisposition === "rejected",
          recaptureRequested: entry.captureCompletionStatus === "blocked",
          notes: item.notes
        })),
      ...entry.fullScreenMenuEvidenceIDs.map((evidenceFileID) => ({
        viewID: "menuOverview",
        evidenceFileIDs: [evidenceFileID],
        verificationStatus: entry.verificationStatus
      }))
    ]
  });
}

export function checkHairstyleRequiredViews(entry: Phase0HairstyleCaptureEntry): Phase0RequiredViewCompletenessReport {
  const openRequests = new Set(entry.recaptureRequests.filter((request) => request.status === "open").map((request) => request.viewID));
  const evidence: Phase0RequiredViewEvidenceInput[] = entry.viewEvidence
    .filter((item): item is typeof item & { viewID: Phase0HairstyleCaptureViewID } => item.viewID !== "fullScreenMenu")
    .map((item) => ({
      viewID: item.viewID,
      evidenceFileIDs: [item.evidenceFileID],
      verificationStatus: entry.verificationStatus,
      rejected: entry.catalogManagerDisposition === "rejected",
      recaptureRequested: openRequests.has(item.viewID),
      notes: item.notes
    }));
  const recaptureOnlyEvidence: Phase0RequiredViewEvidenceInput[] = Array.from(openRequests)
    .filter((viewID) => viewID !== "fullScreenMenu" && viewID !== "dependency" && viewID !== "canonicalHead")
    .map((viewID) => ({
      viewID,
      evidenceFileIDs: [],
      recaptureRequested: true
    }));
  return createRequiredViewCompletenessReport({
    category: "hairstyles",
    entityID: entry.entryID,
    label: entry.stableInternalID,
    evidence: [...evidence, ...recaptureOnlyEvidence]
  });
}

export function checkFacialHairRequiredViews(entry: Phase0FacialHairCaptureEntry): Phase0RequiredViewCompletenessReport {
  const openRequests = new Set(entry.recaptureRequests.filter((request) => request.status === "open").map((request) => request.viewID));
  const evidence: Phase0RequiredViewEvidenceInput[] = entry.viewEvidence
    .filter((item): item is typeof item & { viewID: Phase0FacialHairCaptureViewID } => item.viewID !== "fullScreenMenu")
    .map((item) => ({
      viewID: item.viewID,
      evidenceFileIDs: [item.evidenceFileID],
      verificationStatus: entry.verificationStatus,
      rejected: entry.catalogManagerDisposition === "rejected",
      recaptureRequested: openRequests.has(item.viewID),
      notes: item.notes
    }));
  const recaptureOnlyEvidence: Phase0RequiredViewEvidenceInput[] = Array.from(openRequests)
    .filter((viewID) => viewID !== "fullScreenMenu" && viewID !== "dependency" && viewID !== "observation" && viewID !== "canonicalSetup")
    .map((viewID) => ({
      viewID,
      evidenceFileIDs: [],
      recaptureRequested: true
    }));
  return createRequiredViewCompletenessReport({
    category: "facialHair",
    entityID: entry.entryID,
    label: entry.stableInternalID,
    evidence: [...evidence, ...recaptureOnlyEvidence]
  });
}

export function checkAdditionalAttributeRequiredViews(entry: Phase0AdditionalAttributeEntry): Phase0RequiredViewCompletenessReport {
  const verificationStatus = entry.verificationStatus;
  const rejected = entry.catalogManagerDisposition === "rejected";
  return createRequiredViewCompletenessReport({
    category: "additionalAttributes",
    entityID: entry.entryID,
    label: entry.stableInternalID ?? entry.entryID,
    evidence: [
      {
        viewID: "boundaryEvidence",
        evidenceFileIDs: entry.evidence.boundaryEvidenceIDs,
        verificationStatus,
        rejected,
        notes: entry.evidence.notes
      },
      {
        viewID: "representativeEvidence",
        evidenceFileIDs: entry.evidence.representativeEvidenceIDs,
        verificationStatus,
        rejected,
        notes: entry.evidence.notes
      }
    ]
  });
}

export function checkEnvironmentRequiredViews(draft: Phase0EnvironmentWizardDraft): Phase0RequiredViewCompletenessReport {
  return createRequiredViewCompletenessReport({
    category: "environmentEvidence",
    entityID: "environment-wizard-draft",
    label: "Environment evidence slots",
    evidence: requiredEvidenceSlotIDs().map((slotID) => ({
      viewID: slotID,
      evidenceFileIDs: hasText(draft.evidenceSlots[slotID].evidenceFileID) ? [draft.evidenceSlots[slotID].evidenceFileID] : [],
      notes: draft.evidenceSlots[slotID].fileName
    }))
  });
}

export function checkMenuMapRequiredViews(menuMap: Phase0MenuMap): Phase0RequiredViewCompletenessReport {
  const menuEvidence = menuMap.items.flatMap((item) => menuItemEvidence(item));
  return createRequiredViewCompletenessReport({
    category: "menuEvidence",
    entityID: menuMap.mapID,
    label: "Menu evidence",
    evidence: menuEvidence
  });
}

function menuItemEvidence(item: Phase0MenuMapItem): Phase0RequiredViewEvidenceInput[] {
  const directEvidence = item.evidence.map((evidence) => ({
    viewID: "menuOverview",
    evidenceFileIDs: [evidence.evidenceFileID],
    verificationStatus: item.verificationStatus,
    rejected: item.verificationStatus === "rejected",
    notes: evidence.description
  }));
  const navigationEvidence = item.evidence.map((evidence) => ({
    viewID: "navigationEvidence",
    evidenceFileIDs: [evidence.evidenceFileID],
    verificationStatus: item.verificationStatus,
    rejected: item.verificationStatus === "rejected",
    notes: evidence.description
  }));
  const scrollEvidence = item.scrollingContinuationEvidence.map((evidence) => ({
    viewID: "scrollContinuation",
    evidenceFileIDs: evidence.evidenceFileIDs,
    verificationStatus: item.verificationStatus,
    rejected: item.verificationStatus === "rejected",
    notes: evidence.notes
  }));
  return [...directEvidence, ...navigationEvidence, ...scrollEvidence];
}

function statusFor({
  missing,
  rejected,
  recaptureRequested,
  verified,
  present
}: {
  missing: boolean;
  rejected: boolean;
  recaptureRequested: boolean;
  verified: boolean;
  present: boolean;
}): Phase0RequiredViewStatus {
  if (rejected) return "rejected";
  if (recaptureRequested) return "recaptureRequested";
  if (missing) return "missing";
  if (verified) return "verified";
  return present ? "present" : "missing";
}

function rule(viewID: string, label: string, required = true): Phase0RequiredViewRule {
  return { viewID, label, required };
}

function environmentEvidenceLabel(slotID: EnvironmentEvidenceSlotID) {
  const labels: Record<EnvironmentEvidenceSlotID, string> = {
    titleScreen: "Title screen",
    versionBuildScreen: "Version/build screen",
    consoleUpdateScreen: "Console update screen",
    selectedMode: "Selected mode",
    creationWorkflowStart: "Creation-workflow start"
  };
  return labels[slotID];
}

function humanizeViewID(viewID: string) {
  return viewID.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function hasText(value: string | null | undefined): value is string {
  return Boolean(value && value.trim().length > 0);
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
