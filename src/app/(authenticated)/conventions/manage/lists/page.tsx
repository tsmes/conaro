import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { conventionArtistLists } from "@/lib/db/schema/convention-artist-lists";
import { profiles } from "@/lib/db/schema/profiles";
import { artistProfiles } from "@/lib/db/schema/artist-profiles";
import { getOrganizerConvention } from "@/lib/conventions/queries";
import { ArtistListManager } from "@/components/conventions/artist-list-manager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-10 md:px-8">
      <div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={
            <Link href="/conventions/manage">
              <ArrowLeft className="size-4" />
              Back to workspace
            </Link>
          }
        />
      </div>

      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Curation controls
        </p>
        <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight">
          Allow &amp; Block Lists
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Persist across every event you run at {convention.name}. Artists on
          the block list can&apos;t submit applications; artists on the allow
          list bypass manual review.
        </p>
      </header>

      <Card className="p-8 md:p-10">
        <ArtistListManager allowList={allowList} blockList={blockList} />
      </Card>
    </div>
  );
}
