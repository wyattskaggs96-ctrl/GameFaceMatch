import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(process.cwd(), "..");
const webRoot = process.cwd();
const outputDir = path.join(repoRoot, "docs/status/visual-evidence/prompt140b");
const morphTargets = [
  "head_width",
  "head_height",
  "head_depth",
  "forehead_width",
  "forehead_height",
  "cheek_width",
  "cheek_fullness",
  "jaw_width",
  "jaw_angle",
  "jaw_depth",
  "chin_width",
  "chin_height",
  "chin_projection",
  "chin_roundness",
  "eye_spacing",
  "eye_size",
  "eye_depth",
  "brow_height",
  "nose_width",
  "nose_length",
  "nose_projection",
  "nose_bridge_height",
  "mouth_width",
  "upper_lip_fullness",
  "lower_lip_fullness",
  "ear_size",
  "ear_projection",
  "neck_width"
];

const zeroPreset = Object.fromEntries(morphTargets.map((id) => [id, 0]));
const wyattPreset = JSON.parse(fs.readFileSync(path.join(repoRoot, "data/avatar/wyatt_morph_preset_v1.json"), "utf8")).morphWeights;
const alternateA = {
  ...zeroPreset,
  head_width: -0.46,
  head_height: 0.28,
  forehead_width: -0.32,
  cheek_width: -0.24,
  jaw_width: -0.42,
  chin_width: -0.34,
  eye_spacing: -0.24,
  nose_length: 0.34,
  mouth_width: -0.16,
  neck_width: -0.18
};
const alternateB = {
  ...zeroPreset,
  head_width: 0.48,
  head_height: -0.18,
  cheek_width: 0.42,
  cheek_fullness: 0.32,
  jaw_width: 0.56,
  jaw_angle: 0.36,
  chin_width: 0.28,
  eye_spacing: 0.3,
  nose_width: 0.34,
  mouth_width: 0.4,
  neck_width: 0.32
};

fs.mkdirSync(outputDir, { recursive: true });

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const routes = new Map([
    ["/three.module.js", path.join(webRoot, "node_modules/three/build/three.module.js")],
    ["/three.core.js", path.join(webRoot, "node_modules/three/build/three.core.js")],
    ["/models/gameface/avatar/gameface_neutral_head_v1.glb", path.join(webRoot, "public/models/gameface/avatar/gameface_neutral_head_v1.glb")]
  ]);
  let filePath = routes.get(url.pathname);
  if (!filePath && url.pathname.startsWith("/examples/jsm/")) {
    filePath = path.join(webRoot, "node_modules/three", url.pathname);
  }
  if (!filePath || !fs.existsSync(filePath)) {
    response.writeHead(404);
    response.end("not found");
    return;
  }
  response.writeHead(200, { "content-type": contentType(filePath), "access-control-allow-origin": "*" });
  fs.createReadStream(filePath).pipe(response);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const browser = await chromium.launch();
try {
  await capturePortrait("01-neutral-head.png", zeroPreset, { skin: "#a96f4d", hair: "#191511", lip: "#6b3936", angle: 0 }, { width: 430, height: 430 });
  await capturePortrait("02-wyatt-from-morphs-front.png", wyattPreset, { skin: "#b87852", hair: "#201a15", lip: "#72403b", angle: 0 }, { width: 430, height: 430 });
  await capturePortrait("03-wyatt-from-morphs-threequarter.png", wyattPreset, { skin: "#b87852", hair: "#201a15", lip: "#72403b", angle: -0.36 }, { width: 430, height: 430 });
  await capturePortrait("04-alternate-person-a.png", alternateA, { skin: "#dfb589", hair: "#87562f", lip: "#92514f", angle: 0.14 }, { width: 430, height: 430 });
  await capturePortrait("05-alternate-person-b.png", alternateB, { skin: "#4e3224", hair: "#0e0c0b", lip: "#3a201e", facialHair: true, angle: -0.12 }, { width: 430, height: 430 });
  await capturePostScan("06-local-postscan-430x932.png", wyattPreset, { skin: "#b87852", hair: "#201a15", lip: "#72403b", angle: -0.18 }, { width: 430, height: 932 });
  await capturePostScan("07-local-postscan-390x844.png", wyattPreset, { skin: "#b87852", hair: "#201a15", lip: "#72403b", angle: -0.18 }, { width: 390, height: 844 });
} finally {
  await browser.close();
  server.close();
}

console.log(`Captured GameFace 3D evidence in ${path.relative(repoRoot, outputDir)}`);

async function capturePortrait(fileName, preset, appearance, viewport) {
  const page = await browser.newPage({ viewport });
  page.on("console", (message) => console.log(`[${fileName}] ${message.type()}: ${message.text()}`));
  page.on("pageerror", (error) => console.log(`[${fileName}] pageerror: ${error.message}`));
  await page.setContent(renderHtml({ preset, appearance, postScan: false, port }));
  await page.waitForFunction(() => window.__gameface3dReady === true, null, { timeout: 15000 });
  await page.screenshot({ path: path.join(outputDir, fileName), fullPage: true });
  await page.close();
}

async function capturePostScan(fileName, preset, appearance, viewport) {
  const page = await browser.newPage({ viewport });
  page.on("console", (message) => console.log(`[${fileName}] ${message.type()}: ${message.text()}`));
  page.on("pageerror", (error) => console.log(`[${fileName}] pageerror: ${error.message}`));
  await page.setContent(renderHtml({ preset, appearance, postScan: true, port }));
  await page.waitForFunction(() => window.__gameface3dReady === true, null, { timeout: 15000 });
  await page.screenshot({ path: path.join(outputDir, fileName), fullPage: true });
  await page.close();
}

function renderHtml({ preset, appearance, postScan, port }) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <script type="importmap">{"imports":{"three":"http://127.0.0.1:${port}/three.module.js"}}</script>
  <style>
    body { margin: 0; min-height: 100vh; background: ${postScan ? "#000" : "#080b12"}; color: #fff; font-family: Arial, sans-serif; }
    .portrait { width: 100vw; height: 100vh; display: grid; place-items: center; background: radial-gradient(circle at 50% 16%, #1e3a5f, #070a11 58%); }
    .circle { width: min(86vw, 360px); aspect-ratio: 1; border-radius: 999px; overflow: hidden; border: 2px solid rgba(48,209,88,.62); box-shadow: 0 0 52px rgba(48,209,88,.22); position: relative; background: #070a11; }
    canvas { width: 100%; height: 100%; display: block; }
    .screen { min-height: 100vh; padding: 52px 18px 34px; box-sizing: border-box; }
    .card { height: 320px; border-radius: 42px; background: linear-gradient(145deg, #151923, #080b10); display: grid; place-items: center; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); position: relative; }
    .card h1 { position: absolute; bottom: 23px; left: 0; right: 0; margin: 0; font-size: 28px; line-height: .95; text-align: center; }
    .dot { position: absolute; top: 34px; right: 36px; width: 14px; height: 14px; border-radius: 99px; background: #30d158; box-shadow: 0 0 18px rgba(48,209,88,.7); }
    .screen .circle { width: 164px; }
    h2 { font-size: 44px; line-height: .94; margin: 28px 0 22px; letter-spacing: 0; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .tile { min-height: 148px; border-radius: 24px; background: linear-gradient(145deg, #192132, #070a11); padding: 14px; display: flex; align-items: flex-end; font-weight: 800; box-shadow: inset 0 0 0 1px rgba(255,255,255,.1); }
  </style>
</head>
<body>
  ${
    postScan
      ? `<main class="screen"><section class="card"><span class="dot"></span><div class="circle"><canvas id="view" width="360" height="360"></canvas></div><h1>First Face ID<br/>scan complete.</h1></section><h2>See you in game players</h2><div class="grid">${["CFB game 2027", "Pro Football game 2026", "Pro Basketball game 2026", "Pro Golf game 2026", "Pro Bowling game 2026", "Pro Soccer game 2026"].map((label) => `<div class="tile">${label}</div>`).join("")}</div></main>`
      : `<main class="portrait"><div class="circle"><canvas id="view" width="360" height="360"></canvas></div></main>`
  }
  <script type="module">
    import * as THREE from "three";
    import { GLTFLoader } from "http://127.0.0.1:${port}/examples/jsm/loaders/GLTFLoader.js";
    const preset = ${JSON.stringify(preset)};
    const appearance = ${JSON.stringify(appearance)};
    const canvas = document.getElementById("view");
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(360, 360, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 20);
    camera.position.set(0, 0.22, 5.6);
    camera.lookAt(0, 0.18, 0);
    scene.add(new THREE.AmbientLight(0x2a3855, 1.3));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(-2.2, 3.3, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x65a3ff, 1.25);
    rim.position.set(1, 2, -3);
    scene.add(rim);
    const gltf = await new GLTFLoader().loadAsync("http://127.0.0.1:${port}/models/gameface/avatar/gameface_neutral_head_v1.glb");
    gltf.scene.rotation.set(-0.04, appearance.angle, 0);
    gltf.scene.position.set(0, -0.16, 0);
    gltf.scene.scale.setScalar(1.44);
    gltf.scene.traverse((object) => {
      if (!object.isMesh) return;
      if (object.morphTargetDictionary && object.morphTargetInfluences) {
        for (const [id, value] of Object.entries(preset)) {
          const index = object.morphTargetDictionary[id];
          if (typeof index === "number") object.morphTargetInfluences[index] = value;
        }
      }
      const lower = object.name.toLowerCase();
      if (lower.includes("facial") && !appearance.facialHair) object.visible = false;
      const color = lower.includes("mouth") || lower.includes("lip") ? appearance.lip : lower.includes("hair") ? appearance.hair : lower.includes("eye") ? "#151a20" : lower.includes("jersey") || lower.includes("shoulder") ? "#1f3149" : lower.includes("background") ? "#080b12" : appearance.skin;
      object.material = new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.02 });
    });
    scene.add(gltf.scene);
    renderer.render(scene, camera);
    window.__gameface3dReady = true;
  </script>
</body>
</html>`;
}

function contentType(filePath) {
  if (filePath.endsWith(".js")) return "text/javascript";
  if (filePath.endsWith(".glb")) return "model/gltf-binary";
  return "application/octet-stream";
}
