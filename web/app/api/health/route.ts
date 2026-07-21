import { NextResponse } from "next/server";
import { productionCatalogManifest } from "@/lib/catalog/production-manifest";
import { getDeploymentRuntimeConfig } from "@/lib/config/deployment";
import { createHealthReport } from "@/lib/operations/health";

export async function GET() {
  const report = createHealthReport({
    config: getDeploymentRuntimeConfig(process.env),
    manifest: productionCatalogManifest,
    expectedCatalogVersionID: process.env.GAMEFACE_EXPECTED_CATALOG_VERSION_ID || null
  });

  return NextResponse.json(report, {
    status: report.status === "misconfigured" ? 503 : 200,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
