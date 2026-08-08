import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import type { Cf27ProductionVerificationQueue } from "@/lib/phase-zero/cf27-production-verification-queue";
import { isInternalToolingAvailableInRuntime } from "@/lib/security/owner-review-access";

const queuePath = "data/phase-zero/production_verification_queue.json";

export async function GET() {
  if (!isInternalToolingAvailableInRuntime(process.env)) {
    return NextResponse.json({ error: "CF27 production-verification queue is unavailable in production builds." }, { status: 404 });
  }

  const repositoryRoot = path.resolve(process.cwd(), "..");
  const queue = JSON.parse(fs.readFileSync(path.resolve(repositoryRoot, queuePath), "utf8")) as Cf27ProductionVerificationQueue;
  return NextResponse.json(queue, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
