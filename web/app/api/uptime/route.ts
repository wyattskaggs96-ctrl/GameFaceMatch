import { NextResponse } from "next/server";
import { getDeploymentRuntimeConfig } from "@/lib/config/deployment";

export async function GET() {
  const config = getDeploymentRuntimeConfig(process.env);
  return NextResponse.json(
    {
      service: "gameface-match-web",
      status: "ok",
      releaseID: config.releaseID,
      deploymentEnvironment: config.deploymentEnvironment,
      uptimeSeconds: Math.max(0, Math.round(process.uptime?.() ?? 0)),
      generatedAt: new Date().toISOString()
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
