// Local-storage serving route. Reachable only when STORAGE_DRIVER
// is "local" (or unset): LocalStorageAdapter.getUrl() returns
// "/api/uploads/${key}" which routes here. In R2 mode getUrl()
// returns absolute CDN URLs and this route is never hit. Kept
// alongside R2 because local mode remains a supported development
// backend.
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

import { resolveWithinDir } from "@/lib/storage/safe-path";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;

  // Reject path traversal, including sibling-directory prefix escapes.
  const filePath = resolveWithinDir(UPLOADS_DIR, ...segments);
  if (!filePath) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === ".webp"
        ? "image/webp"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".png"
            ? "image/png"
            : "application/octet-stream";

    return new NextResponse(data, {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000" },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
