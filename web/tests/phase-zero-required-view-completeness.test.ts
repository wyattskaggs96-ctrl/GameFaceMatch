import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PHASE0_REQUIRED_VIEW_COMPLETENESS_SCHEMA_VERSION,
  checkAdditionalAttributeRequiredViews,
  checkEnvironmentRequiredViews,
  checkFacialHairRequiredViews,
  checkHairstyleRequiredViews,
  checkHeadRequiredViews,
  checkMenuMapRequiredViews,
  createRequiredViewCompletenessReport
} from "@/lib/phase-zero/phase-zero-required-view-completeness";
import { createAdditionalAttributeEntry } from "@/lib/phase-zero/phase-zero-additional-attributes-workspace";
import { createEnvironmentEvidenceReference, createEnvironmentWizardDraft } from "@/lib/phase-zero/phase-zero-environment-wizard";
import { createFacialHairCaptureEntry, PHASE0_REQUIRED_FACIAL_HAIR_CAPTURE_VIEW_IDS } from "@/lib/phase-zero/phase-zero-facial-hair-capture-workspace";
import { createHairstyleCaptureEntry, PHASE0_REQUIRED_HAIRSTYLE_CAPTURE_VIEW_IDS } from "@/lib/phase-zero/phase-zero-hairstyle-capture-workspace";
import { createHeadCaptureEntry, PHASE0_REQUIRED_HEAD_CAPTURE_VIEW_IDS } from "@/lib/phase-zero/phase-zero-head-capture-workspace";
import { createEmptyPhase0MenuMap, createPhase0MenuMapItem } from "@/lib/phase-zero/phase-zero-menu-map";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 required view completeness", () => {
  it("documents required, present, missing, rejected, recapture, and verified states", () => {
    const schema = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/schemas/required-view-completeness.schema.json"), "utf8"));

    expect(schema.properties.schemaVersion.const).toBe(PHASE0_REQUIRED_VIEW_COMPLETENESS_SCHEMA_VERSION);
    expect(schema.$defs.requiredViewState.required).toEqual(expect.arrayContaining([
      "required",
      "present",
      "missing",
      "rejected",
      "recaptureRequested",
      "verified"
    ]));
    expect(schema.$defs.requiredViewState.properties.status.enum).toEqual(expect.arrayContaining(["missing", "present", "rejected", "recaptureRequested", "verified"]));
  });

  it("allows production completion when all required head views are verified", () => {
    const entry = createHeadCaptureEntry({
      platformCode: "PS5",
      modeCode: "RTG",
      nativeOrder: 1,
      visibleGameLabelOrIndex: "VERIFIED_LABEL_FROM_EVIDENCE",
      nowISO: now
    });
    entry.verificationStatus = "verified";
    entry.viewEvidence = PHASE0_REQUIRED_HEAD_CAPTURE_VIEW_IDS.map((viewID) => ({
      evidenceFileID: `evidence-head-${viewID}`,
      viewID,
      sourceVideoID: null,
      sourceVideoTimestamp: null,
      notes: `${viewID} evidence.`
    }));

    const report = checkHeadRequiredViews(entry);

    expect(report.productionCompletionAllowed).toBe(true);
    expect(report.summary.requiredCount).toBe(PHASE0_REQUIRED_HEAD_CAPTURE_VIEW_IDS.length);
    expect(report.summary.verifiedCount).toBe(PHASE0_REQUIRED_HEAD_CAPTURE_VIEW_IDS.length);
  });

  it("blocks production when a required head view is missing", () => {
    const entry = createHeadCaptureEntry({
      platformCode: "PS5",
      modeCode: "RTG",
      nativeOrder: 1,
      visibleGameLabelOrIndex: "VERIFIED_LABEL_FROM_EVIDENCE",
      nowISO: now
    });
    entry.viewEvidence = PHASE0_REQUIRED_HEAD_CAPTURE_VIEW_IDS.slice(1).map((viewID) => ({
      evidenceFileID: `evidence-head-${viewID}`,
      viewID,
      sourceVideoID: null,
      sourceVideoTimestamp: null,
      notes: `${viewID} evidence.`
    }));

    const report = checkHeadRequiredViews(entry);

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.rows.find((row) => row.viewID === "front")?.missing).toBe(true);
    expect(report.productionBlockers).toContain("Front: missing.");
  });

  it("marks open hairstyle recapture requests as production blocking", () => {
    const entry = createHairstyleCaptureEntry({
      platformCode: "PS5",
      modeCode: "RTG",
      nativeOrder: 2,
      nativeCategoryLabel: "VERIFIED_CATEGORY_FROM_EVIDENCE",
      visibleGameLabelOrIndex: "VERIFIED_LABEL_FROM_EVIDENCE",
      nowISO: now
    });
    entry.viewEvidence = PHASE0_REQUIRED_HAIRSTYLE_CAPTURE_VIEW_IDS.map((viewID) => ({
      evidenceFileID: `evidence-hair-${viewID}`,
      viewID,
      sourceVideoID: null,
      sourceVideoTimestamp: null,
      notes: `${viewID} evidence.`
    }));
    entry.recaptureRequests = [{
      requestID: "recapture-hair-front",
      viewID: "front",
      reason: "Framing drift.",
      status: "open",
      evidenceFileIDs: ["evidence-hair-front"],
      notes: "Needs a cleaner front view."
    }];

    const report = checkHairstyleRequiredViews(entry);

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.rows.find((row) => row.viewID === "front")?.recaptureRequested).toBe(true);
  });

  it("marks rejected facial-hair evidence as production blocking", () => {
    const entry = createFacialHairCaptureEntry({
      platformCode: "PS5",
      modeCode: "RTG",
      nativeOrder: 3,
      nativeCategoryLabel: "VERIFIED_CATEGORY_FROM_EVIDENCE",
      visibleGameLabelOrIndex: "VERIFIED_LABEL_FROM_EVIDENCE",
      isNoneOption: false,
      nowISO: now
    });
    entry.catalogManagerDisposition = "rejected";
    entry.viewEvidence = PHASE0_REQUIRED_FACIAL_HAIR_CAPTURE_VIEW_IDS.map((viewID) => ({
      evidenceFileID: `evidence-facial-${viewID}`,
      viewID,
      sourceVideoID: null,
      sourceVideoTimestamp: null,
      notes: `${viewID} evidence.`
    }));

    const report = checkFacialHairRequiredViews(entry);

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.summary.rejectedCount).toBe(PHASE0_REQUIRED_FACIAL_HAIR_CAPTURE_VIEW_IDS.length);
  });

  it("requires boundary and representative evidence for additional attributes", () => {
    const entry = createAdditionalAttributeEntry({
      platformCode: "PS5",
      modeCode: "RTG",
      attributeCode: "ATTRIBUTE",
      nativeCategoryLabel: "VERIFIED_CATEGORY_FROM_EVIDENCE",
      nativeControlLabel: "VERIFIED_CONTROL_FROM_EVIDENCE",
      nativeOrder: 1,
      controlType: "slider",
      stableIdentifierAvailability: "available",
      nowISO: now
    });
    entry.evidence.boundaryEvidenceIDs = ["evidence-boundary"];

    const report = checkAdditionalAttributeRequiredViews(entry);

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.rows.find((row) => row.viewID === "boundaryEvidence")?.present).toBe(true);
    expect(report.rows.find((row) => row.viewID === "representativeEvidence")?.missing).toBe(true);
  });

  it("blocks incomplete environment evidence slots", () => {
    const draft = createEnvironmentWizardDraft(now);
    draft.evidenceSlots.titleScreen = createEnvironmentEvidenceReference({
      slotID: "titleScreen",
      fileName: "title.png",
      mimeType: "image/png",
      sizeBytes: 12,
      draft
    });

    const report = checkEnvironmentRequiredViews(draft);

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.summary.presentCount).toBe(1);
    expect(report.summary.missingCount).toBeGreaterThan(0);
  });

  it("checks menu overview and navigation evidence without requiring scroll evidence", () => {
    const menuMap = createEmptyPhase0MenuMap({
      mapID: "menu-map-test",
      gameID: "game-test",
      creationPathID: "creation-path-test",
      nowISO: now
    });
    menuMap.items = [
      createPhase0MenuMapItem({
        stableMenuID: "menu-root",
        parentMenuID: null,
        displayLabel: "Verified Menu",
        nativeLabel: "Verified Menu",
        nativeOrder: 1,
        controlType: "menu",
        environmentID: "environment-test",
        captureResearcher: "researcher-test",
        evidence: [{ evidenceFileID: "evidence-menu-root", description: "Full menu screenshot." }],
        verificationStatus: "verified",
        verifier: "verifier-test"
      })
    ];

    const report = checkMenuMapRequiredViews(menuMap);

    expect(report.productionCompletionAllowed).toBe(true);
    expect(report.rows.find((row) => row.viewID === "scrollContinuation")?.required).toBe(false);
    expect(report.summary.verifiedCount).toBe(2);
  });

  it("supports generic rejected and recapture states", () => {
    const report = createRequiredViewCompletenessReport({
      category: "menuEvidence",
      entityID: "generic-test",
      label: "Generic test",
      rules: [{ viewID: "front", label: "Front", required: true }],
      evidence: [{ viewID: "front", evidenceFileIDs: ["evidence-front"], rejected: true, recaptureRequested: true }]
    });

    expect(report.rows[0].status).toBe("rejected");
    expect(report.rows[0].blocking).toBe(true);
  });
});
