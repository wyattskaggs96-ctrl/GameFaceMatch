import { NextRequest, NextResponse } from "next/server";
import { isSafeResearchDerivativePath } from "@/lib/phase-zero/current-evidence-gallery";
import { isLocalFileBackedResearchRouteAvailable } from "@/lib/security/internal-research-routes";

const mimeTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

export async function GET(request: NextRequest) {
  if (!isLocalFileBackedResearchRouteAvailable(process.env)) {
    return NextResponse.json({ error: "Research evidence preview is unavailable in production builds." }, { status: 404 });
  }

  const relativePath = request.nextUrl.searchParams.get("path") ?? "";
  if (!isSafeResearchDerivativePath(relativePath)) {
    return NextResponse.json({ error: "Invalid research derivative path." }, { status: 400 });
  }

  const [fs, path] = await Promise.all([import("node:fs"), import("node:path")]);
  const repositoryRoot = path.resolve(/*turbopackIgnore: true*/ process.cwd(), "..");
  const absolutePath = path.resolve(repositoryRoot, relativePath);
  const allowedRoot = path.join(repositoryRoot, "data", "research", "cf27", "generated", "full-resolution-frames");
  if (!absolutePath.startsWith(`${allowedRoot}${path.sep}`)) {
    return NextResponse.json({ error: "Research derivative path is outside the allowed root." }, { status: 400 });
  }
  if (!fs.existsSync(absolutePath)) {
    return NextResponse.json({ error: "Research derivative file is not present in this local checkout." }, { status: 404 });
  }

  const buffer = fs.readFileSync(absolutePath);
  const contentType = mimeTypes[path.extname(absolutePath).toLowerCase()] ?? "application/octet-stream";
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store"
    }
  });
}
