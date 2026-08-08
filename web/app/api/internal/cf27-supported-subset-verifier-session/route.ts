import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isInternalToolingAvailableInRuntime } from "@/lib/security/owner-review-access";

const repositoryRoot = path.resolve(process.cwd(), "..");
const packageRoot = path.join(repositoryRoot, "data/phase-zero/supported-subset-verifier-session");

export async function GET() {
  if (!isInternalToolingAvailableInRuntime(process.env)) {
    return NextResponse.json({ error: "CF27 verifier workflow is unavailable in production builds." }, { status: 404 });
  }

  return NextResponse.json(
    {
      sessionManifest: readJSON("session_manifest.json"),
      candidateDetails: readRows("candidate_detail_reference.json"),
      recordDecisionTemplate: readRows("record_decisions_template.json"),
      menuCountTemplate: readRows("menu_counts_template.json"),
      secondaryAngleTemplate: readRows("secondary_angle_sample_review.json"),
      duplicateOrderTemplate: readRows("excluded_duplicate_order_review.json"),
      exportTemplate: readJSON("verifier_decision_export_template.json")
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

function readRows(fileName: string) {
  const json = readJSON(fileName);
  return Array.isArray(json) ? json : json.rows;
}

function readJSON(fileName: string) {
  const absolutePath = path.join(packageRoot, fileName);
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}
