import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { isSafeSourceVideoID } from "@/lib/phase-zero/source-video-evidence-inspector";

interface VideoInventoryFile {
  inventoryId: string;
  workingFilename: string;
  manifestOriginalFilename: string;
  discoveredFilename: string;
  absoluteDiscoveryPathInternal: string | null;
  portableRelativeEvidencePath: string;
}

interface VideoInventoryDocument {
  inventory: VideoInventoryFile[];
}

const videoMimeTypes: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".m4v": "video/mp4"
};

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Research source-video inspection is unavailable in production builds." }, { status: 404 });
  }

  const sourceVideoID = request.nextUrl.searchParams.get("sourceVideoID") ?? "";
  if (!isSafeSourceVideoID(sourceVideoID)) {
    return NextResponse.json({ error: "Invalid source video ID." }, { status: 400 });
  }

  const repositoryRoot = path.resolve(process.cwd(), "..");
  const inventory = readVideoInventory(repositoryRoot);
  const inventoryEntry = inventory.find((entry) => entry.inventoryId === sourceVideoID);
  if (!inventoryEntry) {
    return NextResponse.json({ error: "Source video ID is not present in the current research inventory." }, { status: 404 });
  }

  const absolutePath = resolveLocalVideoPath(repositoryRoot, inventoryEntry);
  if (!absolutePath) {
    return NextResponse.json(
      {
        error: "Source video master is not present in this local checkout.",
        sourceVideoID,
        portableRelativeEvidencePath: inventoryEntry.portableRelativeEvidencePath
      },
      { status: 404 }
    );
  }

  const stat = fs.statSync(absolutePath);
  const range = request.headers.get("range");
  const contentType = videoMimeTypes[path.extname(absolutePath).toLowerCase()] ?? "application/octet-stream";
  if (!range) {
    const stream = Readable.toWeb(fs.createReadStream(absolutePath)) as BodyInit;
    return new NextResponse(stream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store"
      }
    });
  }

  const rangeMatch = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!rangeMatch) {
    return NextResponse.json({ error: "Unsupported byte range." }, { status: 416 });
  }
  const start = rangeMatch[1] ? Number(rangeMatch[1]) : 0;
  const end = rangeMatch[2] ? Number(rangeMatch[2]) : stat.size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end >= stat.size || start > end) {
    return NextResponse.json({ error: "Requested byte range is not satisfiable." }, { status: 416 });
  }

  const stream = Readable.toWeb(fs.createReadStream(absolutePath, { start, end })) as BodyInit;
  return new NextResponse(stream, {
    status: 206,
    headers: {
      "Content-Type": contentType,
      "Content-Length": (end - start + 1).toString(),
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store"
    }
  });
}

function readVideoInventory(repositoryRoot: string) {
  const inventoryPath = path.resolve(repositoryRoot, "data/research/cf27/video_inventory.json");
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8")) as VideoInventoryDocument;
  return inventory.inventory;
}

function resolveLocalVideoPath(repositoryRoot: string, inventoryEntry: VideoInventoryFile) {
  const candidates = [
    process.env.GAMEFACE_RESEARCH_VIDEO_ROOT ? path.resolve(process.env.GAMEFACE_RESEARCH_VIDEO_ROOT, inventoryEntry.workingFilename) : null,
    process.env.GAMEFACE_RESEARCH_VIDEO_ROOT ? path.resolve(process.env.GAMEFACE_RESEARCH_VIDEO_ROOT, inventoryEntry.manifestOriginalFilename) : null,
    process.env.GAMEFACE_RESEARCH_VIDEO_ROOT ? path.resolve(process.env.GAMEFACE_RESEARCH_VIDEO_ROOT, inventoryEntry.discoveredFilename) : null,
    inventoryEntry.absoluteDiscoveryPathInternal,
    path.resolve(repositoryRoot, inventoryEntry.portableRelativeEvidencePath)
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (isSafeLocalVideoCandidate(repositoryRoot, candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function isSafeLocalVideoCandidate(repositoryRoot: string, candidate: string) {
  const normalized = path.resolve(candidate);
  if (normalized.includes(`${path.sep}node_modules${path.sep}`) || normalized.includes(`${path.sep}.next${path.sep}`)) return false;
  const repoRelative = path.relative(repositoryRoot, normalized);
  if (!repoRelative.startsWith("..") && !path.isAbsolute(repoRelative)) return true;
  const allowedExternalRoots = [process.env.GAMEFACE_RESEARCH_VIDEO_ROOT, path.join(process.env.HOME ?? "", "Downloads")]
    .filter((value): value is string => Boolean(value))
    .map((value) => path.resolve(value));
  return allowedExternalRoots.some((allowedRoot) => normalized === allowedRoot || normalized.startsWith(`${allowedRoot}${path.sep}`));
}
