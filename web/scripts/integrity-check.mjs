import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const repositoryRoot = path.resolve(root, "..");
const publicDir = path.join(root, "public");
const sourceRegistryPath = path.join(repositoryRoot, "docs", "governance", "SOURCE_REGISTRY.md");
const agentsPath = path.join(repositoryRoot, "AGENTS.md");
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

validateSourceGovernance();
validateDataClassSeparation();

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

function validateSourceGovernance() {
  if (!fs.existsSync(sourceRegistryPath)) {
    fail(`Source governance registry is missing: ${sourceRegistryPath}`);
  }
  const registry = safeRead(sourceRegistryPath);
  if (!registry.includes("Skaggs Systems First Customer Autopilot source") || !registry.includes("Unrelated") || !registry.includes("Excluded")) {
    fail("Source governance registry must explicitly classify the Skaggs Systems source as unrelated and excluded.");
  }
  if (!registry.includes("docs/GAMEFACE_MATCH_SOURCE_OF_TRUTH.md") || !registry.includes("EA Sports College Football 27")) {
    fail("Source governance registry must include GameFace Match binding source documents.");
  }
  const agents = safeRead(agentsPath);
  if (!agents.includes("docs/governance/SOURCE_REGISTRY.md")) {
    fail("AGENTS.md must require contributors to consult the source registry.");
  }
}

function validateDataClassSeparation() {
  const productionDir = path.join(repositoryRoot, "data", "catalog", "production");
  for (const file of listFiles(productionDir).filter((candidate) => candidate.endsWith(".json"))) {
    const json = readJSON(file);
    if (json.sourceType !== "production") {
      fail(`Production data file must use sourceType production: ${file}`);
    }
    if (/testFixture|researchDraft|demoData|localDeveloperSample|fixture|test-only/i.test(JSON.stringify(json))) {
      fail(`Production data file contains non-production markers: ${file}`);
    }
  }

  const fixtureDir = path.join(repositoryRoot, "data", "fixtures", "test-only");
  for (const file of listFiles(fixtureDir).filter((candidate) => candidate.endsWith(".json"))) {
    const json = readJSON(file);
    if (json.sourceType !== "testFixture") {
      fail(`Fixture data file must use sourceType testFixture: ${file}`);
    }
  }
}

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

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    fail(`Invalid JSON data file: ${file}`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
