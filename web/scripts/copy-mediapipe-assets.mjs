import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const destination = path.join(root, "public", "mediapipe", "tasks-vision", "wasm");

if (!fs.existsSync(source)) {
  console.error("MediaPipe WASM assets are unavailable. Run npm install before starting or building the web app.");
  process.exit(1);
}

fs.mkdirSync(destination, { recursive: true });
for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  fs.copyFileSync(path.join(source, entry.name), path.join(destination, entry.name));
}

console.log("MediaPipe WASM assets copied");
