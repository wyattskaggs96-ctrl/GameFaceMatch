import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = listFiles(root).filter((file) => /\.(ts|tsx|mjs)$/.test(file) && !file.includes(`${path.sep}node_modules${path.sep}`) && !file.includes(`${path.sep}.next${path.sep}`));
const explicitAnyPattern = new RegExp(":\\s*" + "a" + "ny\\b|as\\s+" + "a" + "ny\\b|<" + "a" + "ny>");
let failed = false;

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  if (/\t/.test(text)) report(file, "Tabs are not used in web source.");
  if (/console\.log\(/.test(text) && !file.includes(`${path.sep}scripts${path.sep}`)) report(file, "Avoid console.log in application source.");
  if (explicitAnyPattern.test(text)) report(file, "Avoid explicit TypeScript escape-hatch types.");
}

if (failed) {
  process.exit(1);
}
console.log("Lint OK");

function report(file, message) {
  failed = true;
  console.error(`${file}: ${message}`);
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}
