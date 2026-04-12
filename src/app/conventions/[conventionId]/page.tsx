import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { conventions } from "@/lib/db/schema/conventions";
import { events } from "@/lib/db/schema/events";
import { conventionFollows } from "@/lib/db/schema/convention-follows";
import { storage } from "@/lib/storage";
import { FollowButton } from "@/components/conventions/follow-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ConventionDetailPageProps {
  params: Promise<{ conventionId: string }>;
}

export default async function ConventionDetailPage({
  params,
}: ConventionDetailPageProps) {
  const { conventionId } = await params;

  const [convention] = await db
    .select()
    .from(conventions)
    .where(eq(conventions.id, conventionId));

  if (!convention) {
    notFound();
  }

  const logoUrl = convention.logoPath
    ? storage.getUrl(convention.logoPath)
    : null;

  // Check session and fetch data in parallel
  const session = await auth();
  const isArtist =
    session?.user?.profileId && session.user.role === "artist";

  const [openEvents, followResult] = await Promise.all([
    db
      .select({
        id: events.id,
        name: events.name,
        eventStartDate: events.eventStartDate,
        eventEndDate: events.eventEndDate,
        venueCity: events.venueCity,
        venueCountry: events.venueCountry,
        applicationCloseDate: events.applicationCloseDate,
      })
      .from(events)
      .where(
        and(
          eq(events.conventionId, conventionId),
          eq(events.status, "accepting_applications")
        )
      ),
    isArtist
      ? db
          .select({ id: conventionFollows.id })
          .from(conventionFollows)
          .where(
            and(
              eq(conventionFollows.profileId, session.user.profileId!),
              eq(conventionFollows.conventionId, conventionId)
            )
          )
      : Promise.resolve([]),
  ]);

  const isFollowing = followResult.length > 0;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-4">
        <Link href="/conventions">
          <Button variant="ghost" size="sm">
            &larr; All Conventions
          </Button>
        </Link>
      </div>

      <div className="mt-4 flex items-start justify-between">
        <div className="flex items-center gap-4">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={`${convention.name} logo`}
              className="h-16 w-auto rounded-lg object-contain"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold">{convention.name}</h1>
            {convention.websiteUrl && (
              <a
                href={convention.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline underline-offset-4"
              >
                Website
              </a>
            )}
          </div>
        </div>
        {isArtist && (
          <FollowButton
            conventionId={conventionId}
            isFollowing={isFollowing}
          />
        )}
      </div>

      {convention.description && (
        <p className="mt-4 text-muted-foreground">{convention.description}</p>
      )}

      <Separator className="my-6" />

      <h2 className="text-xl font-semibold">Open Events</h2>

      {openEvents.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No events are currently accepting applications.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {openEvents.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="block"
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{event.name}</CardTitle>
                  <CardDescription>
                    {event.eventStartDate}
                    {event.eventEndDate && ` — ${event.eventEndDate}`}
                    {event.venueCity && ` · ${event.venueCity}`}
                    {event.venueCountry && `, ${event.venueCountry}`}
                    {event.applicationCloseDate &&
                      ` · Deadline: ${event.applicationCloseDate}`}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
