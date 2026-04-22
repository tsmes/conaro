import { NextRequest, NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  portfolioImages,
  portfolioSectionEnum,
} from "@/lib/db/schema/portfolio-images";

const reorderSchema = z.object({
  imageIds: z.array(z.string().min(1)).min(1),
  section: z.enum(portfolioSectionEnum.enumValues),
});

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "artist") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "imageIds array is required" },
      { status: 400 }
    );
  }

  const { imageIds, section } = parsed.data;

  if (new Set(imageIds).size !== imageIds.length) {
    return NextResponse.json(
      { error: "Duplicate image IDs" },
      { status: 400 }
    );
  }

  const profileId = session.user.profileId;

  // Verify all images belong to this artist AND live in the named section.
  const images = await db
    .select({ id: portfolioImages.id })
    .from(portfolioImages)
    .where(
      and(
        eq(portfolioImages.profileId, profileId),
        eq(portfolioImages.section, section),
        inArray(portfolioImages.id, imageIds)
      )
    );

  if (images.length !== imageIds.length) {
    return NextResponse.json(
      { error: "Some images not found or not owned" },
      { status: 400 }
    );
  }

  await db.transaction(async (tx) => {
    for (let i = 0; i < imageIds.length; i++) {
      await tx
        .update(portfolioImages)
        .set({ sortOrder: i })
        .where(eq(portfolioImages.id, imageIds[i]));
    }
  });

  return NextResponse.json({ success: true });
}
