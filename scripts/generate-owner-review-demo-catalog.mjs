#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const sourcePath = path.join(repositoryRoot, "data/demo/owner-review-demo-catalog.json");
const outputPath = path.join(repositoryRoot, "web/lib/owner-review-demo/generated-owner-review-demo-catalog.ts");

const manifest = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const source = `import type { GameCatalogManifest } from "@/types/domain";

export const generatedOwnerReviewDemoCatalog = ${JSON.stringify(manifest, null, 2)} as GameCatalogManifest;
`;

fs.writeFileSync(outputPath, source);
console.log(`Generated ${path.relative(repositoryRoot, outputPath)} from ${path.relative(repositoryRoot, sourcePath)}`);
