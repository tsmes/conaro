import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import { getOrganizerEvent } from "@/lib/conventions/queries";
import { headerColorBodySchema } from "@/lib/validations/branding";

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

  const body = await request.json().catch(() => null);
  const parsed = headerColorBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid colour" },
      { status: 400 }
    );
  }

  await db
    .update(events)
    .set({ headerColor: parsed.data.color, updatedAt: new Date() })
    .where(
      and(
        eq(events.id, event.id),
        eq(events.conventionId, event.conventionId)
      )
    );

  return NextResponse.json({ ok: true, color: parsed.data.color });
}
