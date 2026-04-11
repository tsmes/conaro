import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { conventions } from "@/lib/db/schema/conventions";
import { storage } from "@/lib/storage";
import { processImage } from "@/lib/storage/image";
import { getOrganizerConvention } from "@/lib/conventions/queries";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_FORMATS = ["jpeg", "png", "webp"];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const convention = await getOrganizerConvention(session.user.profileId);
  if (!convention) {
    return NextResponse.json(
      { error: "Convention not found" },
      { status: 404 }
    );
  }

  const formData = await request.formData();
  const raw = formData.get("file");

  if (!raw || !(raw instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(raw.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Accepted: JPEG, PNG, WebP" },
      { status: 400 }
    );
  }

  if (raw.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5 MB" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await raw.arrayBuffer());

  const metadata = await sharp(buffer).metadata();
  if (!metadata.format || !ALLOWED_FORMATS.includes(metadata.format)) {
    return NextResponse.json(
      { error: "Invalid image format" },
      { status: 400 }
    );
  }

  const storagePath = `conventions/${convention.id}/logo.webp`;

  try {
    const processed = await processImage(buffer);

    // Upload new logo first, then update DB, then delete old
    await storage.upload(storagePath, processed.data, "image/webp");

    const oldLogoPath = convention.logoPath;

    await db
      .update(conventions)
      .set({ logoPath: storagePath, updatedAt: new Date() })
      .where(eq(conventions.id, convention.id));

    // Delete old logo after DB update succeeds (if it was a different path)
    if (oldLogoPath && oldLogoPath !== storagePath) {
      await storage.delete(oldLogoPath).catch(() => {});
    }
  } catch {
    // Clean up newly uploaded file on failure
    await storage.delete(storagePath).catch(() => {});
    return NextResponse.json(
      { error: "Failed to upload logo. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: storage.getUrl(storagePath) });
}
