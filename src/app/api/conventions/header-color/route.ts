import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { conventions } from "@/lib/db/schema/conventions";
import { getOrganizerConvention } from "@/lib/conventions/queries";
import { headerColorBodySchema } from "@/lib/validations/branding";

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

  const body = await request.json().catch(() => null);
  const parsed = headerColorBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid colour" },
      { status: 400 }
    );
  }

  await db
    .update(conventions)
    .set({ headerColor: parsed.data.color, updatedAt: new Date() })
    .where(eq(conventions.id, convention.id));

  return NextResponse.json({ ok: true, color: parsed.data.color });
}
