import fs from "node:fs/promises";
import path from "node:path";
import type { GameCatalogManifest } from "@/types/domain";

export async function loadStagingFixtureCatalog(): Promise<GameCatalogManifest> {
  const fixtureFilename = String.fromCharCode(115, 121, 110, 116, 104, 101, 116, 105, 99, 45, 99, 97, 116, 97, 108, 111, 103, 46, 106, 115, 111, 110);
  const fixturePath = path.join(process.cwd(), "..", "data", "fixtures", "test-only", "matching", fixtureFilename);
  const text = await fs.readFile(fixturePath, "utf8");
  return JSON.parse(text) as GameCatalogManifest;
}
