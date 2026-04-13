import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { conventionArtistLists } from "@/lib/db/schema/convention-artist-lists";
import { profiles } from "@/lib/db/schema/profiles";
import { artistProfiles } from "@/lib/db/schema/artist-profiles";
import { getOrganizerConvention } from "@/lib/conventions/queries";
import { ArtistListManager } from "@/components/conventions/artist-list-manager";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default async function ListsPage() {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    redirect("/login");
  }

  const convention = await getOrganizerConvention(session.user.profileId);
  if (!convention) {
    redirect("/login");
  }

  const entries = await db
    .select({
      id: conventionArtistLists.id,
      profileId: conventionArtistLists.profileId,
      listType: conventionArtistLists.listType,
      displayName: profiles.displayName,
      contactEmail: artistProfiles.contactEmail,
    })
    .from(conventionArtistLists)
    .innerJoin(profiles, eq(profiles.id, conventionArtistLists.profileId))
    .leftJoin(artistProfiles, eq(artistProfiles.profileId, profiles.id))
    .where(eq(conventionArtistLists.conventionId, convention.id));

  const allowList = entries
    .filter((e) => e.listType === "allow")
    .map((e) => ({
      id: e.id,
      profileId: e.profileId,
      displayName: e.displayName,
      contactEmail: e.contactEmail,
    }));

  const blockList = entries
    .filter((e) => e.listType === "block")
    .map((e) => ({
      id: e.id,
      profileId: e.profileId,
      displayName: e.displayName,
      contactEmail: e.contactEmail,
    }));

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-4">
        <Link href="/conventions/manage">
          <Button variant="ghost" size="sm">
            &larr; Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Manage Lists</h1>
      </div>
      <p className="mt-1 text-muted-foreground">
        Manage your convention&apos;s allow and block lists. These lists persist
        across all events.
      </p>

      <Separator className="my-6" />

      <ArtistListManager allowList={allowList} blockList={blockList} />
    </div>
  );
}
