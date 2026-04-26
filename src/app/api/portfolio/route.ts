import { NextRequest, NextResponse } from "next/server";
import { eq, and, count } from "drizzle-orm";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  portfolioImages,
  portfolioSectionEnum,
  type PortfolioSection,
} from "@/lib/db/schema/portfolio-images";
import { storage } from "@/lib/storage";
import { processImage } from "@/lib/storage/image";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGES = 20;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];
// sharp's metadata().format reports "heif" for AVIF files on some
// versions (AVIF is a HEIF variant). Whitelist both so we don't
// reject valid AVIF uploads.
const ALLOWED_FORMATS = ["jpeg", "png", "webp", "avif", "heif"];
const VALID_SECTIONS = portfolioSectionEnum.enumValues as readonly PortfolioSection[];

function parseSection(value: FormDataEntryValue | null): PortfolioSection {
  const v = value?.toString();
  return (VALID_SECTIONS as readonly string[]).includes(v ?? "")
    ? (v as PortfolioSection)
    : "product";
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "artist") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profileId = session.user.profileId;

  const formData = await request.formData();
  const raw = formData.get("file");
  const section = parseSection(formData.get("section"));

  if (!raw || !(raw instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(raw.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Accepted: JPEG, PNG, WebP, AVIF" },
      { status: 400 }
    );
  }

  if (raw.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10 MB" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await raw.arrayBuffer());

  // Verify actual image format via magic bytes
  const metadata = await sharp(buffer).metadata();
  if (!metadata.format || !ALLOWED_FORMATS.includes(metadata.format)) {
    return NextResponse.json(
      { error: "Invalid image format" },
      { status: 400 }
    );
  }

  // Count + insert in a transaction to prevent exceeding limit
  const imageId = crypto.randomUUID();
  const storagePath = `portfolios/${profileId}/${imageId}.webp`;
  let image;

  try {
    const processed = await processImage(buffer);

    image = await db.transaction(async (tx) => {
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(portfolioImages)
        .where(eq(portfolioImages.profileId, profileId));

      if (totalCount >= MAX_IMAGES) {
        throw new Error("MAX_IMAGES");
      }

      // sortOrder is per-section so each section's drag order is independent.
      const [{ value: sectionCount }] = await tx
        .select({ value: count() })
        .from(portfolioImages)
        .where(
          and(
            eq(portfolioImages.profileId, profileId),
            eq(portfolioImages.section, section)
          )
        );

      await storage.upload(storagePath, processed.data, "image/webp");

      const [inserted] = await tx
        .insert(portfolioImages)
        .values({
          id: imageId,
          profileId,
          filename: raw.name,
          storagePath,
          mimeType: "image/webp",
          width: processed.width,
          height: processed.height,
          sortOrder: sectionCount,
          section,
        })
        .returning();

      return inserted;
    });
  } catch (error) {
    // Clean up storage if file was uploaded but DB insert failed
    if (error instanceof Error && error.message !== "MAX_IMAGES") {
      await storage.delete(storagePath).catch(() => {});
    }
    if (error instanceof Error && error.message === "MAX_IMAGES") {
      return NextResponse.json(
        { error: `Maximum of ${MAX_IMAGES} images allowed` },
        { status: 400 }
      );
    }
    throw error;
  }

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

  let body: { imageId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { imageId } = body;
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

  // Delete DB record first, then storage (orphaned file is better than orphaned record)
  await db.delete(portfolioImages).where(eq(portfolioImages.id, imageId));
  await storage.delete(image.storagePath).catch(() => {});

  return NextResponse.json({ success: true });
}

// PATCH updates an image's caption (only meaningful for the previous_stand
// section, but the API accepts it for any image owned by the artist).
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "artist") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { imageId?: string; caption?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { imageId, caption } = body;
  if (!imageId) {
    return NextResponse.json(
      { error: "Image ID is required" },
      { status: 400 }
    );
  }

  const trimmed = caption?.trim() ?? "";
  const value = trimmed === "" ? null : trimmed.slice(0, 280);

  const result = await db
    .update(portfolioImages)
    .set({ caption: value })
    .where(
      and(
        eq(portfolioImages.id, imageId),
        eq(portfolioImages.profileId, session.user.profileId)
      )
    )
    .returning({ id: portfolioImages.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, caption: value });
}
