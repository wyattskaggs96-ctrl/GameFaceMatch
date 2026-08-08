import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, process.env.GFM_BUDDY_TRIAL_SCREENSHOT_OUTPUT_DIR ?? "docs/status/visual-evidence/prompt131");
const PORT = Number(process.env.GFM_BUDDY_TRIAL_SCREENSHOT_PORT ?? 3213);
const HOST = "127.0.0.1";
const BASE_URL = process.env.GFM_BUDDY_TRIAL_SCREENSHOT_BASE_URL ?? `http://${HOST}:${PORT}`;
const INVITE_ID = "btv1_8f4c2a7d9e6b41c0a3f5d8e2b9c7a1f0";
const STORAGE_KEY = `gfm:buddy-trial:v1:${INVITE_ID}`;
const TIMESTAMP = process.env.GFM_BUDDY_TRIAL_POLISH_SCREENSHOT_TIMESTAMP ?? "2026-08-07T18:00:00.000Z";
const requireFromWeb = createRequire(path.join(ROOT, "web/package.json"));
const { chromium } = requireFromWeb("@playwright/test");

const viewports = [
  { id: "390x844", width: 390, height: 844 },
  { id: "430x932", width: 430, height: 932 }
];

const buildStepIds = [
  "demo-build-open-rtg",
  "demo-build-open-appearance",
  "demo-build-head",
  "demo-build-skin",
  "demo-build-skin-details",
  "demo-build-hair",
  "demo-build-hair-color",
  "demo-build-facial-hair",
  "demo-build-facial-hair-color",
  "demo-build-nose",
  "demo-build-jaw-chin"
];

const refinementStepIds = [
  "owner-demo-refinement-step-1-demo-jaw-width-slider",
  "owner-demo-refinement-step-2-demo-nose-height-slider",
  "owner-demo-refinement-step-3-demo-chin-projection-slider"
];

const states = [
  {
    id: "01-invite",
    path: `/trial/${INVITE_ID}`,
    setup: clearTrial,
    waitFor: "Build yourself in College Football 27."
  },
  {
    id: "02-consent",
    path: `/trial/${INVITE_ID}`,
    setup: async (page) => {
      await clearTrial(page);
      await page.goto(`${BASE_URL}/trial/${INVITE_ID}`, { waitUntil: "networkidle" });
      await disableMotion(page);
      await page.getByRole("button", { name: "Start My GameFace" }).click();
      return false;
    },
    waitFor: "Before we scan"
  },
  {
    id: "03-camera-handoff",
    path: `/trial/${INVITE_ID}`,
    setup: (page) => setTrialSession(page, "SCAN_IN_PROGRESS"),
    waitFor: "Continue guided scan"
  },
  {
    id: "04-guided-intro",
    path: `/?buddyTrialInvite=${INVITE_ID}#start`,
    setup: (page) => setTrialSession(page, "SCAN_IN_PROGRESS"),
    waitFor: "Set Up Your GameFace"
  },
  {
    id: "05-get-ready",
    path: `/?buddyTrialInvite=${INVITE_ID}#preparation`,
    setup: (page) => setTrialSession(page, "SCAN_IN_PROGRESS"),
    waitFor: "Get Ready"
  },
  {
    id: "06-guided-active",
    path: "/?setupVisualState=scan-partial#capture",
    waitFor: "Move your head slowly to complete the circle."
  },
  {
    id: "07-processing",
    path: `/trial/${INVITE_ID}`,
    setup: (page) => setTrialSession(page, "SCAN_COMPLETE"),
    waitFor: "Building your GameFace..."
  },
  {
    id: "08-result",
    path: `/trial/${INVITE_ID}`,
    setup: (page) => setTrialSession(page, "RECOMMENDATION_READY"),
    waitFor: "Your GameFace recommendation"
  },
  {
    id: "09-build-step",
    path: `/trial/${INVITE_ID}`,
    setup: (page) => setTrialSession(page, "BUILD_IN_PROGRESS", { buildGuide: buildGuideProgress({ currentStepIndex: 2 }) }),
    waitFor: "Build This in College Football 27"
  },
  {
    id: "10-build-all-settings",
    path: `/trial/${INVITE_ID}`,
    setup: (page) => setTrialSession(page, "BUILD_IN_PROGRESS", { buildGuide: buildGuideProgress({ viewMode: "summary", currentStepIndex: 2 }) }),
    waitFor: "Open Road to Glory"
  },
  {
    id: "11-video-one-required",
    path: `/trial/${INVITE_ID}`,
    setup: (page) =>
      setTrialSession(page, "VIDEO_1_REQUIRED", { buildGuide: buildGuideProgress({ completedStepIds: buildStepIds, currentStepIndex: buildStepIds.length - 1 }) }),
    waitFor: "LET'S SEE HOW WE DID"
  },
  {
    id: "12-video-error",
    path: `/trial/${INVITE_ID}`,
    setup: async (page) => {
      await setTrialSession(page, "VIDEO_1_REQUIRED", { buildGuide: buildGuideProgress({ completedStepIds: buildStepIds, currentStepIndex: buildStepIds.length - 1 }) });
      await page.goto(`${BASE_URL}/trial/${INVITE_ID}`, { waitUntil: "networkidle" });
      await disableMotion(page);
      await page.locator('input[type="file"]').setInputFiles({
        name: "not-a-video.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("not a playable video")
      });
      return false;
    },
    waitFor: "Try another video"
  },
  {
    id: "13-video-one-views",
    path: `/trial/${INVITE_ID}`,
    setup: (page) => setTrialSession(page, "VIDEO_1_PROCESSING", { videoOneReview: characterVideoReview(1) }),
    waitFor: "GameFace found these views"
  },
  {
    id: "14-refinement-review",
    path: `/trial/${INVITE_ID}`,
    setup: (page) => setTrialSession(page, "REFINEMENT_READY", { videoOneReview: characterVideoReview(1) }),
    waitFor: "GAMEFACE REVIEW"
  },
  {
    id: "15-refinement-guide",
    path: `/trial/${INVITE_ID}`,
    setup: (page) => setTrialSession(page, "VIDEO_2_REQUIRED", { refinementGuide: buildGuideProgress({ totalStepCount: 3, currentStepIndex: 1 }) }),
    waitFor: "Apply the recommended changes"
  },
  {
    id: "16-video-two-required",
    path: `/trial/${INVITE_ID}`,
    setup: (page) =>
      setTrialSession(page, "VIDEO_2_REQUIRED", {
        refinementGuide: buildGuideProgress({ totalStepCount: 3, currentStepIndex: 2, completedStepIds: refinementStepIds })
      }),
    waitFor: "SHOW US THE UPDATED PLAYER"
  },
  {
    id: "17-final-result",
    path: `/trial/${INVITE_ID}`,
    setup: (page) => setTrialSession(page, "FINAL_RESULT_READY", { videoOneReview: characterVideoReview(1), videoTwoReview: characterVideoReview(2) }),
    waitFor: "YOUR GAMEFACE RESULT"
  },
  {
    id: "18-complete",
    path: `/trial/${INVITE_ID}`,
    setup: (page) => setTrialSession(page, "COMPLETE", { finalOutcome: finalOutcome() }),
    waitFor: "GameFace complete."
  }
];

await mkdir(OUTPUT_DIR, { recursive: true });
let server = null;
let serverLog = "";

try {
  if (process.env.GFM_BUDDY_TRIAL_SCREENSHOT_BASE_URL) {
    await waitForServer(BASE_URL, 10_000);
  } else {
    const ownerReviewEnv = {
      ...process.env,
      NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO: "true",
      NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV: "development",
      NEXT_PUBLIC_GFM_SETUP_VISUAL_TESTS: "1",
      NEXT_TELEMETRY_DISABLED: "1"
    };
    await runCommand("npm", ["--prefix", "web", "run", "build"], {
      cwd: ROOT,
      env: ownerReviewEnv
    });
    server = spawn("npm", ["--prefix", "web", "run", "start", "--", "--hostname", HOST, "--port", String(PORT)], {
      cwd: ROOT,
      env: ownerReviewEnv,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    server.stdout.on("data", (chunk) => {
      serverLog += chunk.toString();
    });
    server.stderr.on("data", (chunk) => {
      serverLog += chunk.toString();
    });
    await waitForServer(BASE_URL, 90_000);
  }

  const browser = await chromium.launch();
  const manifest = {
    generatedAt: TIMESTAMP,
    prompt: "GFM | Q06 | Buddy Trial owner-review visual evidence",
    baseUrl: BASE_URL,
    notes: [
      "Screenshots use OWNER_REVIEW_DEMO browser-local fixture data.",
      "No production catalog records, verifier decisions, raw face media, or production recommendations are created."
    ],
    screenshots: []
  };

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      colorScheme: "dark",
      reducedMotion: "reduce"
    });
    for (const state of states) {
      const page = await context.newPage();
      await page.goto(`${BASE_URL}${state.path}`, { waitUntil: "networkidle" });
      await disableMotion(page);
      if (state.setup) {
        const shouldReload = await state.setup(page);
        if (shouldReload !== false) {
          await page.goto(`${BASE_URL}${state.path}`, { waitUntil: "networkidle" });
          await disableMotion(page);
        }
      }
      await page.getByText(state.waitFor).first().waitFor({ state: "visible", timeout: 20_000 });
      const filename = `${viewport.id}-${state.id}.png`;
      const outputPath = path.join(OUTPUT_DIR, filename);
      await page.screenshot({ path: outputPath, type: "png", fullPage: false, animations: "disabled" });
      manifest.screenshots.push({
        state: state.id,
        viewport: viewport.id,
        path: state.path,
        screenshot: path.relative(ROOT, outputPath)
      });
      await page.close();
    }
    await context.close();
  }
  await browser.close();
  await writeFile(path.join(OUTPUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Captured ${manifest.screenshots.length} Buddy Trial polish screenshots in ${path.relative(ROOT, OUTPUT_DIR)}.`);
} finally {
  if (server) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      server.kill("SIGTERM");
    }
    await new Promise((resolve) => {
      server.once("exit", resolve);
      setTimeout(resolve, 2_000);
    });
    if (server.exitCode === null) {
      try {
        process.kill(-server.pid, "SIGKILL");
      } catch {
        server.kill("SIGKILL");
      }
    }
  }
}

async function clearTrial(page) {
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
}

async function setTrialSession(page, state, patch = {}) {
  await page.evaluate(
    ({ key, inviteId, state, timestamp, patch }) => {
      const session = {
        schemaVersion: "buddy-trial-v1",
        inviteId,
        sessionId: "buddy-trial-polish-screenshot-session",
        state,
        createdAt: timestamp,
        updatedAt: timestamp,
        completedAt: state === "COMPLETE" ? timestamp : null,
        deletedAt: null,
        consent: {
          consentVersion: "gfm-consent-v1",
          acceptedAt: timestamp,
          acknowledgments: {
            ageEligibility: true,
            subjectPermission: true,
            cameraUse: true,
            currentFaceAnalysis: true,
            temporaryProcessing: true
          }
        },
        catalogGate: "owner_review_demo_available",
        buildGuide: null,
        refinementGuide: null,
        videoOneReview: null,
        videoTwoReview: null,
        finalOutcome: null,
        trialLearningRecord: null,
        history: [{ state, at: timestamp, note: "Prompt 131 deterministic visual evidence checkpoint." }],
        ...patch
      };
      window.localStorage.setItem(key, JSON.stringify(session));
    },
    { key: STORAGE_KEY, inviteId: INVITE_ID, state, timestamp: TIMESTAMP, patch }
  );
}

function buildGuideProgress({ totalStepCount = 11, currentStepIndex = 0, completedStepIds = [], viewMode = "step" } = {}) {
  return {
    schemaVersion: "buddy-trial-build-guide-progress-v1",
    totalStepCount,
    currentStepIndex,
    completedStepIds,
    viewMode,
    updatedAt: TIMESTAMP
  };
}

function characterVideoReview(iteration) {
  return {
    schemaVersion: "buddy-trial-character-video-review-v1",
    iteration,
    status: "usable",
    metadata: {
      fileName: iteration === 1 ? "prompt131-first-build.mp4" : "prompt131-updated-build.mp4",
      fileType: "video/mp4",
      fileSizeBytes: 12_000_000,
      durationSeconds: 12,
      width: 1280,
      height: 720,
      source: "fixture"
    },
    validation: { status: "usable", errors: [], warnings: [], retakeInstructions: [] },
    candidateFrames: [],
    standardizedViews: [
      { viewID: "front", selectedFrameID: `prompt131-video-${iteration}-front`, timestampSeconds: 1.2, qualityStatus: "usable", issues: [], thumbnailRetained: false },
      {
        viewID: "leftThreeQuarter",
        selectedFrameID: `prompt131-video-${iteration}-left`,
        timestampSeconds: 4.2,
        qualityStatus: "usable",
        issues: [],
        thumbnailRetained: false
      },
      {
        viewID: "rightThreeQuarter",
        selectedFrameID: `prompt131-video-${iteration}-right`,
        timestampSeconds: 8.2,
        qualityStatus: "usable",
        issues: [],
        thumbnailRetained: false
      }
    ],
    missingRequiredViews: [],
    manualSelectionRequired: false,
    processingSummary: "Player views are ready for comparison.",
    retention: {
      rawVideoPersisted: false,
      temporaryMediaRetention: "temporary_processing_only",
      objectUrlsRevokedAfterProcessing: true
    }
  };
}

function finalOutcome() {
  return {
    schemaVersion: "buddy-trial-final-outcome-v1",
    source: "owner_review_demo",
    initialRecommendationLabel: "Demo Head 12",
    finalSettingsSummary: [
      { label: "Head / face preset", value: "Demo Head 12", menuPath: ["Road to Glory", "Appearance", "Head / face preset"] },
      { label: "Hair", value: "Short Fade", menuPath: ["Road to Glory", "Appearance", "Hair"] },
      { label: "Jaw Width", value: "61", menuPath: ["Road to Glory", "Appearance", "Face", "Jaw and Chin"] }
    ],
    beforeScore: 82,
    afterScore: 91,
    scoreDelta: 9,
    trend: "improvement",
    improved: ["Jaw proportion", "Nose length", "Chin projection"],
    stillDifferent: ["Brow height"],
    scoreLanguage: "Build match is based on the appearance options available in this game.",
    userPreference: "refined",
    resemblanceRating: 8,
    stillLooksOff: "Brow still sits a little high.",
    productImprovementOptIn: true,
    productImprovementConsentVersion: "gfm-consent-v1",
    submittedAt: TIMESTAMP,
    rawMediaRetained: false
  };
}

async function disableMotion(page) {
  await page.addStyleTag({
    content:
      "*,*::before,*::after{transition-duration:0s!important;animation-duration:0s!important;animation-delay:0s!important;scroll-behavior:auto!important;caret-color:transparent!important;}"
  });
}

async function waitForServer(url, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (server && server.exitCode !== null) {
      throw new Error(`Dev server exited before it was ready.\n${serverLog}`);
    }
    if (await isServerReady(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}.\n${serverLog}`);
}

async function isServerReady(url) {
  try {
    const response = await fetch(url);
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}.\n${output}`));
    });
  });
}
