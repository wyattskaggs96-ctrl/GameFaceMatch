import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webDirectory = path.resolve(scriptDirectory, "..");
const repositoryRoot = path.resolve(webDirectory, "..");
const sourcePath = path.join(repositoryRoot, "data/catalog/production/catalog_manifest.json");
const outputPath = path.join(webDirectory, "lib/catalog/generated-production-manifest.ts");

const manifest = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const source = `import type { GameCatalogManifest } from "@/types/domain";

export const generatedProductionCatalogManifest = ${JSON.stringify(manifest, null, 2)} as GameCatalogManifest;
`;

fs.writeFileSync(outputPath, source);
console.log(`Generated ${path.relative(webDirectory, outputPath)} from ${path.relative(repositoryRoot, sourcePath)}`);
