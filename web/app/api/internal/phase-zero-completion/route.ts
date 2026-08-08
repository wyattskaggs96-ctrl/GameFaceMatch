import { NextResponse } from "next/server";
import { createPhase0CompletionDashboard } from "@/lib/phase-zero/phase-zero-completion-dashboard";
import { loadPhase0CompletionArtifacts } from "@/lib/phase-zero/phase-zero-completion-artifacts.server";
import { isInternalToolingAvailableInRuntime } from "@/lib/security/owner-review-access";

export async function GET() {
  if (!isInternalToolingAvailableInRuntime(process.env)) {
    return NextResponse.json({ error: "Phase 0 completion dashboard is unavailable in production builds." }, { status: 404 });
  }

  return NextResponse.json(createPhase0CompletionDashboard(loadPhase0CompletionArtifacts()), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
