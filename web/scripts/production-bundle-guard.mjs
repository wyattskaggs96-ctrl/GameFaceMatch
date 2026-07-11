import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundleRoots = [path.join(root, ".next", "static"), path.join(root, ".next", "server")];
const blockedPatterns = [
  /data\/fixtures\/test-only/i,
  /synthetic-catalog/i,
  /synthetic-match/i,
  /SYNTHETIC_TEST_GAME/i,
  /Head\s+\d+/i,
  /Hair\s+\d+/i,
  /Facial Hair\s+\d+/i,
  /Slider\s+\d+/i
];

if (!bundleRoots.every((directory) => fs.existsSync(directory))) {
  console.error("Production bundle guard requires a completed Next.js build.");
  process.exit(1);
}

for (const file of bundleRoots.flatMap((directory) => listFiles(directory))) {
  if (file.endsWith(".map")) continue;
  const text = safeRead(file);
  if (!text) continue;
  for (const pattern of blockedPatterns) {
    if (pattern.test(text)) {
      console.error(`Production bundle contains blocked fixture or invented game-data token ${pattern} in ${file}`);
      process.exit(1);
    }
  }
}

console.log("Production bundle guard OK");

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

function safeRead(file) {
  try {
    const stat = fs.statSync(file);
    if (stat.size > 2 * 1024 * 1024) return "";
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}
