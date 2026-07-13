#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const nextDirectory = path.resolve(process.cwd(), ".next");
const expectedParent = path.resolve(process.cwd());

if (!nextDirectory.startsWith(`${expectedParent}${path.sep}`)) {
  console.error(`Refusing to clean unexpected build directory: ${nextDirectory}`);
  process.exit(1);
}

fs.rmSync(nextDirectory, { recursive: true, force: true });
console.log("Cleaned generated .next build output");
