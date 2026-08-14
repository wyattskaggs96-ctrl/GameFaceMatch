import { NextResponse } from "next/server";
import type { CurrentResearchCatalogData } from "@/lib/phase-zero/current-evidence-gallery";
import { isLocalFileBackedResearchRouteAvailable } from "@/lib/security/internal-research-routes";

const researchDataPathSegments = {
  importedCatalog: ["data", "research", "cf27", "catalog-candidates", "research", "partial-catalog-import-current", "imported_research_catalog.json"],
  evidenceManifest: ["data", "research", "cf27", "exports", "partial-research-catalog-current", "evidence_manifest.json"],
  captureLog: ["data", "research", "cf27", "exports", "partial-research-catalog-current", "capture_log.json"]
};

export async function GET() {
  if (!isLocalFileBackedResearchRouteAvailable(process.env)) {
    return NextResponse.json({ error: "Current research catalog metadata is unavailable in production builds." }, { status: 404 });
  }

  const [{ readFileSync }, path] = await Promise.all([import("node:fs"), import("node:path")]);
  const repositoryRoot = path.resolve(/*turbopackIgnore: true*/ process.cwd(), "..");
  const readJSON = (segments: string[]) => JSON.parse(readFileSync(path.join(repositoryRoot, ...segments), "utf8")) as unknown;
  const importedCatalog = readJSON(researchDataPathSegments.importedCatalog) as { records: CurrentResearchCatalogData["importedRecords"] };
  const evidenceManifest = readJSON(researchDataPathSegments.evidenceManifest) as { payload: { entries: CurrentResearchCatalogData["evidenceEntries"] } };
  const captureLog = readJSON(researchDataPathSegments.captureLog) as { payload: { events: CurrentResearchCatalogData["captureEvents"] } };

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
