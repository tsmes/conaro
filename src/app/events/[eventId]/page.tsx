import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import type { Amenities, FieldRequirements } from "@/lib/db/schema/events";
import { conventions } from "@/lib/db/schema/conventions";
import { profiles } from "@/lib/db/schema/profiles";
import { artistProfiles } from "@/lib/db/schema/artist-profiles";
import { portfolioImages } from "@/lib/db/schema/portfolio-images";
import { applications } from "@/lib/db/schema/applications";
import { storage } from "@/lib/storage";
import { validateProfileForEvent } from "@/lib/applications/validation";
import { ApplyButton } from "@/components/events/apply-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface EventDetailPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  const { eventId } = await params;

  const [event] = await db
    .select({
      id: events.id,
      name: events.name,
      description: events.description,
      status: events.status,
      eventStartDate: events.eventStartDate,
      eventEndDate: events.eventEndDate,
      applicationOpenDate: events.applicationOpenDate,
      applicationCloseDate: events.applicationCloseDate,
      venueName: events.venueName,
      venueAddress: events.venueAddress,
      venueCity: events.venueCity,
      venueCountry: events.venueCountry,
      mapEmbedUrl: events.mapEmbedUrl,
      availableStands: events.availableStands,
      tableDimensions: events.tableDimensions,
      priceInfo: events.priceInfo,
      setupTime: events.setupTime,
      teardownTime: events.teardownTime,
      amenities: events.amenities,
      fieldRequirements: events.fieldRequirements,
      minPortfolioImages: events.minPortfolioImages,
      conventionId: events.conventionId,
      conventionName: conventions.name,
      conventionLogoPath: conventions.logoPath,
    })
    .from(events)
    .innerJoin(conventions, eq(conventions.id, events.conventionId))
    .where(eq(events.id, eventId));

  if (!event) {
    notFound();
  }

  const amenities = event.amenities as Amenities | null;
  const conventionLogoUrl = event.conventionLogoPath
    ? storage.getUrl(event.conventionLogoPath)
    : null;

  // Check artist session for apply section
  const session = await auth();
  const isArtist =
    session?.user?.profileId && session.user.role === "artist";

  let hasExistingApplication = false;
  let validationResult: { valid: true } | { valid: false; missingFields: Array<{ key: string; label: string; section: "basic" | "logistics" | "portfolio" }> } = {
    valid: true,
  };

  if (isArtist) {
    const profileId = session.user.profileId!;

    const [[profile], [artistProfile], [{ value: imageCount }], [existingApp]] =
      await Promise.all([
        db.select().from(profiles).where(eq(profiles.id, profileId)),
        db
          .select()
          .from(artistProfiles)
          .where(eq(artistProfiles.profileId, profileId)),
        db
          .select({ value: count() })
          .from(portfolioImages)
          .where(eq(portfolioImages.profileId, profileId)),
        db
          .select({ id: applications.id })
          .from(applications)
          .where(
            and(
              eq(applications.eventId, eventId),
              eq(applications.profileId, profileId)
            )
          ),
      ]);

    hasExistingApplication = !!existingApp;

    if (profile && artistProfile) {
      validationResult = validateProfileForEvent(
        event.fieldRequirements as FieldRequirements | null,
        event.minPortfolioImages,
        profile,
        artistProfile,
        imageCount
      );
    }
  }

  const isAccepting = event.status === "accepting_applications";

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-4">
        <Link href="/events">
          <Button variant="ghost" size="sm">
            &larr; All Events
          </Button>
        </Link>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-3">
          {conventionLogoUrl && (
            <img
              src={conventionLogoUrl}
              alt={`${event.conventionName} logo`}
              className="h-10 w-auto rounded object-contain"
            />
          )}
          <Link
            href={`/conventions/${event.conventionId}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            {event.conventionName}
          </Link>
        </div>
        <h1 className="mt-2 text-3xl font-bold">{event.name}</h1>
        {!isAccepting && (
          <Badge variant="secondary" className="mt-2">
            Not accepting applications
          </Badge>
        )}
      </div>

      {event.description && (
        <p className="mt-4 text-muted-foreground">{event.description}</p>
      )}

      <Separator className="my-6" />

      <div className="space-y-6">
        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dates</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="font-medium">Event: </span>
              {event.eventStartDate}
              {event.eventEndDate && ` — ${event.eventEndDate}`}
            </div>
            {event.applicationCloseDate && (
              <div>
                <span className="font-medium">Application deadline: </span>
                {event.applicationCloseDate}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location */}
        {(event.venueName || event.venueCity) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {event.venueName && <p className="font-medium">{event.venueName}</p>}
              {event.venueAddress && <p>{event.venueAddress}</p>}
              {(event.venueCity || event.venueCountry) && (
                <p>
                  {[event.venueCity, event.venueCountry]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Logistics */}
        {(event.availableStands || event.tableDimensions || event.priceInfo) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Artist Logistics</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              {event.availableStands && (
                <div>
                  <span className="font-medium">Available stands: </span>
                  {event.availableStands}
                </div>
              )}
              {event.tableDimensions && (
                <div>
                  <span className="font-medium">Table dimensions: </span>
                  {event.tableDimensions}
                </div>
              )}
              {event.priceInfo && (
                <div className="sm:col-span-2">
                  <span className="font-medium">Price: </span>
                  {event.priceInfo}
                </div>
              )}
              {event.setupTime && (
                <div>
                  <span className="font-medium">Setup: </span>
                  {event.setupTime}
                </div>
              )}
              {event.teardownTime && (
                <div>
                  <span className="font-medium">Teardown: </span>
                  {event.teardownTime}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Amenities */}
        {amenities && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Provided Amenities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-2">
                {amenities.electricity && <Badge variant="secondary">Electricity</Badge>}
                {amenities.wifi && <Badge variant="secondary">Wi-Fi</Badge>}
                {amenities.tables && <Badge variant="secondary">Tables</Badge>}
                {amenities.chairs && <Badge variant="secondary">Chairs</Badge>}
              </div>
              {amenities.other && (
                <p className="text-muted-foreground">{amenities.other}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Apply Section */}
        {isAccepting && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Apply</CardTitle>
            </CardHeader>
            <CardContent>
              {isArtist ? (
                <ApplyButton
                  eventId={event.id}
                  hasExistingApplication={hasExistingApplication}
                  validationResult={validationResult}
                />
              ) : session?.user ? (
                <p className="text-sm text-muted-foreground">
                  Only artist accounts can apply to events.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  <Link href="/login" className="text-primary underline underline-offset-4">
                    Log in
                  </Link>{" "}
                  or{" "}
                  <Link href="/register" className="text-primary underline underline-offset-4">
                    register
                  </Link>{" "}
                  as an artist to apply.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
