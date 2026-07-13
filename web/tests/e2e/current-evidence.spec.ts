import { expect, test, type Locator, type Page } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(process.cwd(), "..");
const now = "2026-07-13T16:00:00.000Z";

test.describe("GameFace Match current evidence E2E", () => {
  test("processes synthetic video intake, duplicate detection, extensionless media, and contact sheets without committing master media", async () => {
    const { inspectEvidenceVideo, sha256FileStream } = await importRootScript("scripts/cf27-media-inspect.mjs");
    const { classifyNewVideoBatch } = await importRootScript("scripts/cf27-new-video-classifier.mjs");
    const fixture = createVideoWorkspace();
    const video = writeGeneratedVideo(fixture.intakeDir, "owner-head-template-upload.MOV", "head-template-video");
    const extensionless = writeGeneratedVideo(fixture.intakeDir, "owner-skin-tone-extensionless", "skin-tone-video");
    const duplicate = writeGeneratedVideo(fixture.intakeDir, "duplicate-head-template.mov", "duplicate-head-template-video");
    const hashBefore = await sha256FileStream(video);
    const duplicateHash = await sha256FileStream(duplicate);
    writeCanonicalInventory(fixture.root, [
      {
        inventoryId: "video-existing-head",
        sha256: duplicateHash,
        fileSizeBytes: fs.statSync(duplicate).size,
        durationSeconds: 2,
        workingFilename: "Existing_Head_Template.mov",
        identifiedContent: "Head Template captures"
      }
    ]);

    const inspection = await inspectEvidenceVideo("intake/owner-head-template-upload.MOV", fixture.mediaOptions);
    expect(inspection).toMatchObject({ ok: true, status: "processed" });
    expect(fs.existsSync(path.join(fixture.root, inspection.outputs.contactSheet))).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, inspection.outputs.sceneChangeIndexJson))).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, inspection.outputs.stableFrameIndexJson))).toBe(true);

    const report = await classifyNewVideoBatch("intake", fixture.classifierOptions);
    const byName = Object.fromEntries(report.records.map((record: ClassifiedVideoRecord) => [record.originalFilename, record]));

    expect(report.totalFilesScanned).toBe(3);
    expect(byName["owner-head-template-upload.MOV"].visibleMenuHeading).toMatchObject({ heading: "Head Template" });
    expect(byName["owner-head-template-upload.MOV"].contactSheet).toBeTruthy();
    expect(byName["owner-skin-tone-extensionless"].suggestedWorkingFilename).toBe("03_Skin_Tone.mp4");
    expect(byName["duplicate-head-template.mov"].duplicateSignals).toMatchObject({
      exactDuplicate: true,
      exactDuplicateOf: ["video-existing-head"]
    });
    expect(report.records.every((record: ClassifiedVideoRecord) => record.acceptance.status === "pendingOperatorAcceptance")).toBe(true);
    expect(await sha256FileStream(video)).toBe(hashBefore);
    expect(fs.readdirSync(fixture.intakeDir).sort()).toEqual([
      "duplicate-head-template.mov",
      "owner-head-template-upload.MOV",
      "owner-skin-tone-extensionless"
    ]);
  });

  test("validates deterministic current research exports, research import, Face 12 overlap, and production promotion rejection", async () => {
    const { buildPartialResearchCatalogPackage, validatePartialResearchCatalogPackage } = await importRootScript("scripts/cf27-partial-research-catalog-export.mjs");
    const { importPartialResearchCatalog, loadPartialResearchCatalogExport, validateImportedResearchCatalogCannotPromote } = await importRootScript("scripts/cf27-partial-research-catalog-import.mjs");
    const firstExport = buildPartialResearchCatalogPackage({ root: repositoryRoot });
    const secondExport = buildPartialResearchCatalogPackage({ root: repositoryRoot });
    const firstDigest = sha256Text(JSON.stringify(firstExport.files.map((file: ExportFile) => [file.fileName, file.contentUtf8])));
    const secondDigest = sha256Text(JSON.stringify(secondExport.files.map((file: ExportFile) => [file.fileName, file.contentUtf8])));
    const exportValidation = validatePartialResearchCatalogPackage(firstExport);

    expect(firstDigest).toBe(secondDigest);
    expect(exportValidation.status).toBe("passed");
    expect(firstExport.manifest.counts).toMatchObject({
      heads: 29,
      totalResearchCatalogRecords: 86,
      evidenceManifestEntries: 335
    });
    expect(firstExport.manifest.counts.heads).toBe(29);

    const importResult = importPartialResearchCatalog({
      exportData: loadPartialResearchCatalogExport({ root: repositoryRoot })
    });
    const face12 = importResult.importedCatalog.records.find((record: ImportedResearchRecord) => record.stableInternalID === "CF27_XBOXUNKNOWN_RTG_HEAD_012");
    const promotionReport = validateImportedResearchCatalogCannotPromote(importResult.importedCatalog);

    expect(importResult.report.ok).toBe(true);
    expect(importResult.importedCatalog.productionRecommendationAccess).toBe(false);
    expect(face12).toBeDefined();
    expect(face12.overlapHandling).toContain("Face 12 overlap preserved");
    expect(face12.sourceTimestamps.map((entry: { sourceVideoID: string }) => entry.sourceVideoID)).toEqual(expect.arrayContaining(["video-002", "video-003"]));
    expect(importResult.importedCatalog.records.some((record: ImportedResearchRecord) => record.nativeLabel === "Face 30")).toBe(false);
    expect(promotionReport).toMatchObject({ ok: false, status: "failed" });
    expect(promotionReport.errors.map((error: { code: string }) => error.code)).toEqual(expect.arrayContaining([
      "nonProductionSource",
      "notProductionData",
      "notVerified",
      "recommendationAccessBlocked",
      "promotionEligibilityBlocked"
    ]));
  });

  test("serves current evidence gallery, source timestamp navigation, and recapture review actions in the browser", async ({ page, request }) => {
    const response = await request.get("/api/internal/current-research-catalog");
    expect(response.ok()).toBe(true);
    const researchData = await response.json();
    expect(researchData.importedRecords).toHaveLength(86);
    expect(researchData.evidenceEntries).toHaveLength(335);
    expect(researchData.captureEvents).toHaveLength(106);

    const face12 = researchData.importedRecords.find((record: ImportedResearchRecord) => record.stableInternalID === "CF27_XBOXUNKNOWN_RTG_HEAD_012");
    expect(face12.overlapHandling).toContain("Face 12 overlap preserved");
    expect(face12.sourceTimestamps.map((entry: { sourceVideoID: string }) => entry.sourceVideoID)).toEqual(expect.arrayContaining(["video-002", "video-003"]));
    expect(face12.missingViews).toEqual(expect.arrayContaining(["elevated", "lowered"]));
    expect(face12.incompleteFields).toEqual(expect.arrayContaining(["environment.gameExecutableVersion", "environment.patchLabel"]));

    await page.goto("/#evidence-gallery");
    await expect(page.getByRole("heading", { name: "Current video-derived evidence gallery" })).toBeVisible();
    await expect(page.getByText("PRIMARY RESEARCH CANDIDATE", { exact: false })).toBeVisible();
    await expect(sectionByHeading(page, "Research records").locator("dd").filter({ hasText: /^86$/ })).toBeVisible();
    await page.getByLabel("Category").selectOption("heads");
    await page.getByRole("button", { name: /Face 12/ }).click();
    await expect(page.getByText("Face 12 overlap", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /MENU video-002/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "video-003 @ 0s-5s" })).toBeVisible();
    await expect(page.getByText("Missing views 2")).toBeVisible();
    await page.getByRole("button", { name: "video-003 @ 0s-5s" }).click();
    await expect(sectionByHeading(page, "Research records").locator("dd").filter({ hasText: /^CF27_XBOXUNKNOWN_RTG_HEAD_012$/ })).toBeVisible();

    await page.goto("/#video-inspector");
    await expect(page.getByRole("heading", { name: "Source video evidence inspector" })).toBeVisible();
    await page.getByLabel("Category").selectOption("heads");
    await page.getByRole("button", { name: /Face 12/ }).click();
    await expect(page.getByRole("heading", { name: "Source video", exact: true })).toBeVisible();
    await expect(page.getByText("Source video preview is not supported by this browser.")).toBeVisible();
    await page.getByRole("button", { name: "Approve derivative" }).click();
    await page.getByRole("button", { name: "Request recapture" }).click();
    await expect(page.getByLabel("Local source-video review audit log")).toContainText("approvedDerivative");
    await expect(page.getByLabel("Local source-video review audit log")).toContainText("recaptureRequested");
  });

  test("records source-video intake metadata and creates recapture issues without storing raw video bytes", async ({ page }) => {
    await openPhaseZero(page);

    const sourceVideo = sectionByHeading(page, "Source-video intake");
    await sourceVideo.getByRole("button", { name: "Choose video" }).click();
    await sourceVideo.locator("input[type='file']").setInputFiles({
      name: "TESTONLY_current_evidence_video.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("SYNTHETIC TEST VIDEO BYTES - NOT GAME EVIDENCE")
    });
    await textFieldIn(sourceVideo, "Platform ID").fill("platform-xbox-unknown");
    await textFieldIn(sourceVideo, "Game version ID").fill("cf27-version-unknown-video-001");
    await textFieldIn(sourceVideo, "Patch ID").fill("cf27-patch-unknown-video-001");
    await textFieldIn(sourceVideo, "Mode").fill("Road to Glory");
    await textFieldIn(sourceVideo, "Creation path ID").fill("rtg-create-player-path");
    await textFieldIn(sourceVideo, "Environment ID").fill("env-cf27-research-video-001-rtg-path");
    await textFieldIn(sourceVideo, "Capture device").fill("synthetic-test-device");
    await textFieldIn(sourceVideo, "Duration seconds").fill("2");
    await textFieldIn(sourceVideo, "Width").fill("160");
    await textFieldIn(sourceVideo, "Height").fill("90");
    await textFieldIn(sourceVideo, "Frame rate").fill("30");
    await sourceVideo.getByRole("button", { name: "Register metadata" }).click();
    await expect(sourceVideo.getByText("Registered video")).toBeVisible();
    await textFieldIn(sourceVideo, "Catalog item ID").fill("CF27_XBOXUNKNOWN_RTG_HEAD_012");
    await textFieldIn(sourceVideo, "Timestamp seconds").fill("1.25");
    await textFieldIn(sourceVideo, "Label").fill("Face 12 overlap timestamp");
    await sourceVideo.getByRole("button", { name: "Add timestamp" }).click();
    await expect(sourceVideo.getByText("Preview: Face 12 overlap timestamp")).toBeVisible();
    await sourceVideo.getByRole("button", { name: "Save metadata only" }).click();
    await expect(sourceVideo.getByText("Saved source-video metadata records: 1")).toBeVisible();

    const issue = sectionByHeading(page, "Issue, exception, and recapture management");
    await issue.getByLabel("Issue kind").selectOption("missingEvidence");
    await issue.getByLabel("Title").fill("TESTONLY missing head view");
    await issue.getByLabel("Affected record IDs").fill("CF27_XBOXUNKNOWN_RTG_HEAD_012");
    await issue.getByLabel("Affected evidence IDs").fill("evidence-frame-cf27_xboxunknown_rtg_head_012-front");
    await issue.getByLabel("Recapture required").selectOption("yes");
    await issue.getByLabel("Queue status").selectOption("queued");
    await issue.getByLabel("Requested angles").fill("leftProfile,rightProfile");
    await issue.getByRole("button", { name: "Add issue" }).click();
    await expect(issue.getByText("TESTONLY missing head view")).toBeVisible();
    await expect(issue.locator("dd").filter({ hasText: /^queued$/ })).toBeVisible();

    const storageText = await page.evaluate(() => Object.values(localStorage).join("\n"));
    expect(storageText).toContain("TESTONLY_current_evidence_video.mp4");
    expect(storageText).not.toContain("SYNTHETIC TEST VIDEO BYTES");
  });
});

type ClassifiedVideoRecord = {
  originalFilename: string;
  visibleMenuHeading: { heading: string | null };
  suggestedWorkingFilename: string;
  contactSheet: string | null;
  duplicateSignals: { exactDuplicate: boolean; exactDuplicateOf: string[] };
  acceptance: { status: string };
};

type ExportFile = {
  fileName: string;
  contentUtf8: string;
};

type ImportedResearchRecord = {
  stableInternalID: string;
  nativeLabel: string;
  overlapHandling: string | null;
  sourceTimestamps: Array<{ sourceVideoID: string }>;
  missingViews: string[];
  incompleteFields: string[];
};

function sectionByHeading(page: Page, heading: string) {
  return page.getByRole("heading", { name: heading }).locator("xpath=ancestor::section[1]");
}

function textFieldIn(section: Locator, label: string) {
  return section.locator("label.form-field", { hasText: new RegExp(`^${escapeRegExp(label)}$`) }).locator("input");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function importRootScript(relativePath: string) {
  return import(pathToFileURL(path.join(repositoryRoot, relativePath)).href);
}

async function openPhaseZero(page: Page) {
  await page.goto("/#phase-0");
  await expect(page.getByRole("heading", { name: "Phase 0 readiness" })).toBeVisible();
}

function createVideoWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-current-evidence-e2e-"));
  const intakeDir = path.join(root, "intake");
  const tools = path.join(root, "tools");
  fs.mkdirSync(intakeDir, { recursive: true });
  fs.mkdirSync(tools, { recursive: true });
  const ffprobePath = path.join(tools, "ffprobe");
  const ffmpegPath = path.join(tools, "ffmpeg");
  fs.writeFileSync(ffprobePath, fakeFfprobeScript());
  fs.writeFileSync(ffmpegPath, fakeFfmpegScript());
  fs.chmodSync(ffprobePath, 0o755);
  fs.chmodSync(ffmpegPath, 0o755);
  writeCanonicalInventory(root, []);
  return {
    root,
    intakeDir,
    mediaOptions: {
      root,
      manifestRoot: "manifests/media-inspection",
      generatedRoot: "generated/media-inspections",
      portableRelativeEvidencePath: "TEST_INTAKE/owner-head-template-upload.MOV",
      ffprobePath,
      ffmpegPath,
      nowISO: now,
      force: true
    },
    classifierOptions: {
      root,
      outputRoot: "classification",
      canonicalInventoryPath: "video_inventory.json",
      mediaManifestRoot: "manifests/media-inspection",
      mediaGeneratedRoot: "generated/media-inspections",
      evidenceRootToken: "TEST_INTAKE",
      ffprobePath,
      ffmpegPath,
      nowISO: now,
      force: true
    }
  };
}

function writeGeneratedVideo(directory: string, filename: string, content: string) {
  const videoPath = path.join(directory, filename);
  fs.writeFileSync(videoPath, Buffer.from(content));
  return videoPath;
}

function writeCanonicalInventory(root: string, inventory: Array<Record<string, unknown>>) {
  fs.writeFileSync(path.join(root, "video_inventory.json"), `${JSON.stringify({ inventory }, null, 2)}\n`);
}

function sha256Text(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fakeFfprobeScript() {
  return `#!/bin/sh
for arg in "$@"; do
  if [ "$arg" = "-version" ]; then
    echo "ffprobe synthetic"
    exit 0
  fi
done
cat <<'JSON'
{
  "streams": [
    {
      "codec_type": "video",
      "codec_name": "h264",
      "width": 160,
      "height": 90,
      "avg_frame_rate": "30/1",
      "duration": "2.000000"
    },
    {
      "codec_type": "audio",
      "codec_name": "aac"
    }
  ],
  "format": {
    "duration": "2.000000",
    "format_name": "mov,mp4,m4a,3gp,3g2,mj2"
  }
}
JSON
`;
}

function fakeFfmpegScript() {
  return `#!/bin/sh
input=""
last=""
previous=""
for arg in "$@"; do
  if [ "$previous" = "-i" ]; then
    input="$arg"
  fi
  previous="$arg"
  last="$arg"
  if [ "$arg" = "-version" ]; then
    echo "ffmpeg synthetic"
    exit 0
  fi
done
if [ "$last" = "-" ]; then
  echo "[Parsed_showinfo_1 @ synthetic] n:0 pts:15 pts_time:0.5 pos:0 fmt:yuv420p" 1>&2
  echo "[Parsed_showinfo_1 @ synthetic] n:1 pts:37 pts_time:1.25 pos:0 fmt:yuv420p" 1>&2
  exit 0
fi
case "$input" in
  *skin*tone*|*Skin*Tone*)
    heading="Skin Tone"
    ;;
  *)
    heading="Head Template"
    ;;
esac
printf "<svg><text>%s</text><text>SYNTHETIC TEST FRAME - NOT GAME EVIDENCE</text></svg>" "$heading" > "$last"
exit 0
`;
}
