import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import sharp from "sharp";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import { storage } from "@/lib/storage";
import { processImage } from "@/lib/storage/image";
import { getOrganizerEvent } from "@/lib/conventions/queries";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];
const ALLOWED_FORMATS = ["jpeg", "png", "webp", "avif", "heif"];

interface RouteParams {
  params: Promise<{ eventId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;
  const event = await getOrganizerEvent(session.user.profileId, eventId);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const raw = formData.get("file");
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
      { error: "File too large. Maximum size is 8 MB" },
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

  const storagePath = `events/${event.id}/banner-mobile.webp`;

  try {
    const processed = await processImage(buffer);
    await storage.upload(storagePath, processed.data, "image/webp");

    const oldPath = event.bannerMobilePath;

    await db
      .update(events)
      .set({ bannerMobilePath: storagePath, updatedAt: new Date() })
      .where(
        and(
          eq(events.id, event.id),
          eq(events.conventionId, event.conventionId)
        )
      );

    if (oldPath && oldPath !== storagePath) {
      await storage.delete(oldPath).catch(() => {});
    }
  } catch {
    await storage.delete(storagePath).catch(() => {});
    return NextResponse.json(
      { error: "Failed to upload banner. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: storage.getUrl(storagePath) });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;
  const event = await getOrganizerEvent(session.user.profileId, eventId);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (!event.bannerMobilePath) {
    return NextResponse.json({ ok: true });
  }

  await db
    .update(events)
    .set({ bannerMobilePath: null, updatedAt: new Date() })
    .where(
      and(
        eq(events.id, event.id),
        eq(events.conventionId, event.conventionId)
      )
    );

  await storage.delete(event.bannerMobilePath).catch(() => {});
  return NextResponse.json({ ok: true });
}
