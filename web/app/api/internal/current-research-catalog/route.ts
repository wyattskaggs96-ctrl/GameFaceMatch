import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import type { CurrentResearchCatalogData } from "@/lib/phase-zero/current-evidence-gallery";
import { isInternalToolingAvailableInRuntime } from "@/lib/security/owner-review-access";

const researchDataPaths = {
  importedCatalog: "data/research/cf27/catalog-candidates/research/partial-catalog-import-current/imported_research_catalog.json",
  evidenceManifest: "data/research/cf27/exports/partial-research-catalog-current/evidence_manifest.json",
  captureLog: "data/research/cf27/exports/partial-research-catalog-current/capture_log.json"
};

export async function GET() {
  if (!isInternalToolingAvailableInRuntime(process.env)) {
    return NextResponse.json({ error: "Current research catalog metadata is unavailable in production builds." }, { status: 404 });
  }

  const repositoryRoot = path.resolve(process.cwd(), "..");
  const importedCatalog = readJSON(path.resolve(repositoryRoot, researchDataPaths.importedCatalog)) as { records: CurrentResearchCatalogData["importedRecords"] };
  const evidenceManifest = readJSON(path.resolve(repositoryRoot, researchDataPaths.evidenceManifest)) as { payload: { entries: CurrentResearchCatalogData["evidenceEntries"] } };
  const captureLog = readJSON(path.resolve(repositoryRoot, researchDataPaths.captureLog)) as { payload: { events: CurrentResearchCatalogData["captureEvents"] } };

  return NextResponse.json(
    {
      importedRecords: importedCatalog.records,
      evidenceEntries: evidenceManifest.payload.entries,
      captureEvents: captureLog.payload.events
    } satisfies CurrentResearchCatalogData,
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

function readJSON(absolutePath: string) {
  return JSON.parse(fs.readFileSync(absolutePath, "utf8")) as unknown;
}
