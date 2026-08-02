import { NextResponse } from "next/server";
import { createSupabaseStatusReport } from "@/lib/supabase/health";
import { assertNoSupabaseSecretsInPayload } from "@/lib/supabase/runtime-config";

export async function GET() {
  const report = createSupabaseStatusReport();
  const secretScan = assertNoSupabaseSecretsInPayload(report);

  return NextResponse.json(
    {
      ...report,
      secretScan
    },
    {
      status: report.runtime.mode === "supabase_unavailable" || !secretScan.ok ? 503 : 200,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
