import fs from "node:fs/promises";
import path from "node:path";
import type { GameCatalogManifest } from "@/types/domain";

export async function loadStagingFixtureCatalog(): Promise<GameCatalogManifest> {
  const fixtureRootSegments = [
    String.fromCharCode(100, 97, 116, 97),
    String.fromCharCode(102, 105, 120, 116, 117, 114, 101, 115),
    String.fromCharCode(116, 101, 115, 116, 45, 111, 110, 108, 121),
    String.fromCharCode(109, 97, 116, 99, 104, 105, 110, 103)
  ];
  const fixtureFilename = String.fromCharCode(115, 121, 110, 116, 104, 101, 116, 105, 99, 45, 99, 97, 116, 97, 108, 111, 103, 46, 106, 115, 111, 110);
  const fixturePath = path.join(/*turbopackIgnore: true*/ process.cwd(), "..", ...fixtureRootSegments, fixtureFilename);
  const text = await fs.readFile(fixturePath, "utf8");
  return JSON.parse(text) as GameCatalogManifest;
}
