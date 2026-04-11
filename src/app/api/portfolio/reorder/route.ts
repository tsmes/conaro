import { NextRequest, NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { portfolioImages } from "@/lib/db/schema/portfolio-images";

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "artist") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imageIds } = await request.json();
  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    return NextResponse.json(
      { error: "imageIds array is required" },
      { status: 400 }
    );
  }

  const profileId = session.user.profileId;

  // Verify all images belong to this artist
  const images = await db
    .select({ id: portfolioImages.id })
    .from(portfolioImages)
    .where(
      and(
        eq(portfolioImages.profileId, profileId),
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
