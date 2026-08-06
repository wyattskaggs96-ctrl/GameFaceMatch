import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "docs/status/visual-evidence/prompt104");
const PORT = Number(process.env.GFM_SETUP_SCREENSHOT_PORT ?? 3210);
const HOST = "127.0.0.1";
const SPAWN_BASE_URL = `http://${HOST}:${PORT}`;
const EXISTING_BASE_URL = process.env.GFM_SETUP_SCREENSHOT_BASE_URL;
const requireFromWeb = createRequire(path.join(ROOT, "web/package.json"));
const { chromium } = requireFromWeb("@playwright/test");

const states = [
  { id: "01-introduction", path: "/#start", waitFor: "Set Up Your GameFace Scan" },
  { id: "02-positioning", path: "/?setupVisualState=positioning#capture", waitFor: "Position your face within the frame." },
  { id: "03-zero-progress", path: "/?setupVisualState=scan-empty#capture", waitFor: "Move your head slowly to complete the circle." },
  { id: "04-partial-progress", path: "/?setupVisualState=scan-partial#capture", waitFor: "Move your head slowly to complete the circle." },
  { id: "05-near-completion", path: "/?setupVisualState=scan-near-complete#capture", waitFor: "Move your head slowly to complete the circle." },
  { id: "06-completed", path: "/?setupVisualState=complete#capture", waitFor: "First GameFace scan complete." },
  { id: "07-camera-denied", path: "/?setupVisualState=denied#capture", waitFor: "Camera access is needed to continue." },
  { id: "08-multiple-subjects", path: "/?setupVisualState=multiple#capture", waitFor: "Only one face can be in the frame." },
  { id: "09-reduced-motion", path: "/?setupVisualState=scan-partial#capture", waitFor: "Move your head slowly to complete the circle.", reducedMotion: "reduce" },
  { id: "10-accessibility-stepwise", path: "/?setupVisualState=accessibility#capture", waitFor: "Use assisted capture if circular movement is difficult." }
];

const viewports = [
  { id: "390x844", width: 390, height: 844 },
  { id: "430x932", width: 430, height: 932 },
  { id: "desktop-1440x900", width: 1440, height: 900 }
];

await mkdir(OUTPUT_DIR, { recursive: true });
let server = null;
let serverLog = "";
let baseUrl = EXISTING_BASE_URL ?? SPAWN_BASE_URL;

try {
  if (EXISTING_BASE_URL) {
    await waitForServer(baseUrl, 10_000);
  } else {
    await runCommand("npm", ["--prefix", "web", "run", "build"], {
      cwd: ROOT,
      env: {
        ...process.env,
        NEXT_PUBLIC_GFM_SETUP_VISUAL_TESTS: "1",
        NEXT_TELEMETRY_DISABLED: "1"
      }
    });
    server = spawn("npm", ["--prefix", "web", "run", "start", "--", "--hostname", HOST, "--port", String(PORT)], {
      cwd: ROOT,
      env: { ...process.env, NEXT_PUBLIC_GFM_SETUP_VISUAL_TESTS: "1", NEXT_TELEMETRY_DISABLED: "1" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    server.stdout.on("data", (chunk) => {
      serverLog += chunk.toString();
    });
    server.stderr.on("data", (chunk) => {
      serverLog += chunk.toString();
    });
    await waitForServer(baseUrl, 90_000);
  }
  const browser = await chromium.launch();
  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    states: [],
    notes: [
      "Deterministic setupVisualState query parameter is development/test-only and disabled in production code paths.",
      "Screenshots use local placeholders, not real camera imagery or user face media."
    ]
  };

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      colorScheme: "dark",
      reducedMotion: "no-preference"
    });
    for (const state of states) {
      const page = await context.newPage();
      if (state.reducedMotion) {
        await page.emulateMedia({ reducedMotion: state.reducedMotion });
      }
      await page.goto(`${baseUrl}${state.path}`, { waitUntil: "networkidle" });
      await page.getByText(state.waitFor).first().waitFor({ state: "visible", timeout: 20_000 });
      const filename = `${viewport.id}-${state.id}.jpg`;
      const outputPath = path.join(OUTPUT_DIR, filename);
      await page.screenshot({ path: outputPath, type: "jpeg", quality: 84, fullPage: false });
      manifest.states.push({
        state: state.id,
        viewport: viewport.id,
        path: state.path,
        screenshot: `docs/status/visual-evidence/prompt104/${filename}`
      });
      await page.close();
    }
    await context.close();
  }
  await browser.close();
  await writeFile(path.join(OUTPUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Captured ${manifest.states.length} setup-flow screenshots in ${path.relative(ROOT, OUTPUT_DIR)}.`);
} finally {
  if (server) {
    server.kill("SIGTERM");
    await new Promise((resolve) => {
      server.once("exit", resolve);
      setTimeout(resolve, 2_000);
    });
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
