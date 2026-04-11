import { NextRequest, NextResponse } from "next/server";
import { eq, and, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { portfolioImages } from "@/lib/db/schema/portfolio-images";
import { storage } from "@/lib/storage";
import { processImage } from "@/lib/storage/image";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGES = 20;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "artist") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profileId = session.user.profileId;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Accepted: JPEG, PNG, WebP" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10 MB" },
      { status: 400 }
    );
  }

  const [{ value: currentCount }] = await db
    .select({ value: count() })
    .from(portfolioImages)
    .where(eq(portfolioImages.profileId, profileId));

  if (currentCount >= MAX_IMAGES) {
    return NextResponse.json(
      { error: `Maximum of ${MAX_IMAGES} images allowed` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const processed = await processImage(buffer);

  const imageId = crypto.randomUUID();
  const storagePath = `portfolios/${profileId}/${imageId}.webp`;

  await storage.upload(storagePath, processed.data, "image/webp");

  const [image] = await db
    .insert(portfolioImages)
    .values({
      id: imageId,
      profileId,
      filename: file.name,
      storagePath,
      mimeType: "image/webp",
      width: processed.width,
      height: processed.height,
      sortOrder: currentCount,
    })
    .returning();

  return NextResponse.json({
    ...image,
    url: storage.getUrl(storagePath),
  });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "artist") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imageId } = await request.json();
  if (!imageId) {
    return NextResponse.json(
      { error: "Image ID is required" },
      { status: 400 }
    );
  }

  const [image] = await db
    .select()
    .from(portfolioImages)
    .where(
      and(
        eq(portfolioImages.id, imageId),
        eq(portfolioImages.profileId, session.user.profileId)
      )
    );

  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  await storage.delete(image.storagePath);
  await db.delete(portfolioImages).where(eq(portfolioImages.id, imageId));

  return NextResponse.json({ success: true });
}
