import { NextResponse } from "next/server";
import { createPhase0CompletionDashboard } from "@/lib/phase-zero/phase-zero-completion-dashboard";
import { loadPhase0CompletionArtifacts } from "@/lib/phase-zero/phase-zero-completion-artifacts.server";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Phase 0 completion dashboard is unavailable in production builds." }, { status: 404 });
  }

  return NextResponse.json(createPhase0CompletionDashboard(loadPhase0CompletionArtifacts()), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
