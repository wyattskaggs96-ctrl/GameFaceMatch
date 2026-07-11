import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "public");
const suspiciousPatterns = [
  new RegExp("api[_-]?key\\s*[:=]", "i"),
  new RegExp("client[_-]?secret\\s*[:=]", "i"),
  new RegExp("BEGIN " + "PRIVATE KEY"),
  new RegExp("AWS_" + "SECRET_ACCESS_KEY"),
  new RegExp("SUPA" + "BASE_"),
  new RegExp("FIRE" + "BASE_"),
  new RegExp("STRIPE_" + "SECRET_KEY"),
  new RegExp("STRIPE_" + "WEBHOOK_SECRET"),
  new RegExp("PAYPAL_" + "CLIENT_SECRET"),
  new RegExp("SQUARE_" + "ACCESS_TOKEN"),
  new RegExp("sk_" + "live_"),
  new RegExp("rk_" + "live_")
];
const fakeGameDataPatterns = [
  /Head\s+\d+/i,
  /Hair\s+\d+/i,
  /Facial Hair\s+\d+/i,
  /menu path:\s*.+/i
];

const files = listFiles(root).filter((file) => !file.includes(`${path.sep}node_modules${path.sep}`) && !file.includes(`${path.sep}.next${path.sep}`));
const publicFiles = fs.existsSync(publicDir) ? listFiles(publicDir) : [];

const bundledFixture = publicFiles.find((file) => file.includes(`${path.sep}fixtures${path.sep}`) || file.includes("test-only"));
if (bundledFixture) {
  fail(`Test fixture appears in production bundle surface: ${bundledFixture}`);
}

for (const file of files) {
  const text = safeRead(file);
  if (!text) continue;
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(text)) fail(`Potential secret pattern ${pattern} in ${file}`);
  }
}

for (const file of files.filter((file) => file.includes(`${path.sep}public${path.sep}`) || file.includes(`${path.sep}app${path.sep}`) || file.includes(`${path.sep}features${path.sep}`))) {
  const text = safeRead(file);
  if (!text) continue;
  for (const pattern of fakeGameDataPatterns) {
    if (pattern.test(text)) fail(`Possible invented production game data pattern ${pattern} in ${file}`);
  }
}

console.log("Integrity OK");

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

function safeRead(file) {
  try {
    const stat = fs.statSync(file);
    if (stat.size > 1024 * 1024) return "";
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
