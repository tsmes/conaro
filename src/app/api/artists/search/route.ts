import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema/profiles";
import { artistProfiles } from "@/lib/db/schema/artist-profiles";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const pattern = `%${query}%`;

  const results = await db
    .select({
      id: profiles.id,
      displayName: profiles.displayName,
      contactEmail: artistProfiles.contactEmail,
    })
    .from(profiles)
    .leftJoin(artistProfiles, eq(artistProfiles.profileId, profiles.id))
    .where(
      and(
        eq(profiles.role, "artist"),
        or(
          ilike(profiles.displayName, pattern),
          ilike(artistProfiles.contactEmail, pattern)
        )
      )
    )
    .limit(10);

  return NextResponse.json({
    results: results
      .filter((r) => r.id)
      .map((r) => ({
        id: r.id,
        displayName: r.displayName,
        contactEmail: r.contactEmail ?? null,
      })),
  });
}
