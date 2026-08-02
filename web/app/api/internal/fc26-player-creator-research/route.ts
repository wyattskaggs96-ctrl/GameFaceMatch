import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const repositoryRoot = path.resolve(process.cwd(), "..");
  const researchPath = path.resolve(repositoryRoot, "data/research/fc26/player_creator_research.json");
  try {
    const raw = await fs.readFile(researchPath, "utf8");
    const research = JSON.parse(raw) as { game?: { gameID?: string }; productionEligible?: boolean };
    if (research.game?.gameID !== "ea-sports-fc-26") {
      return NextResponse.json({ error: "FC 26 research data has the wrong game identifier." }, { status: 500 });
    }
    if (research.productionEligible !== false) {
      return NextResponse.json({ error: "FC 26 research endpoint only serves non-production research data." }, { status: 500 });
    }
    return NextResponse.json(research, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "FC 26 research data could not be read."
      },
      { status: 500 }
    );
  }
}
