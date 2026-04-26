import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { auth } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { processImage } from "@/lib/storage/image";
import { getOrganizerEvent } from "@/lib/conventions/queries";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_FORMATS = ["jpeg", "png", "webp"];

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

  // Generate the storage key server-side so a caller can't address
  // an arbitrary path within this event's guests directory and
  // overwrite a different guest's image. Each upload is a fresh
  // key; the saveGuests action's orphan-cleanup pass deletes
  // anything no longer referenced by the persisted guests array.
  const uploadId = crypto.randomUUID();
  const storagePath = `events/${event.id}/guests/${uploadId}.webp`;
  try {
    const processed = await processImage(buffer);
    await storage.upload(storagePath, processed.data, "image/webp");
  } catch {
    await storage.delete(storagePath).catch(() => {});
    return NextResponse.json(
      { error: "Failed to upload image. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    storagePath,
    url: storage.getUrl(storagePath),
  });
}
