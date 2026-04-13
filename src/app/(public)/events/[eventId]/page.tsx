import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
import { conventionFollows } from "@/lib/db/schema/convention-follows";
import { storage } from "@/lib/storage";
import {
  validateProfileForEvent,
  type ValidationResult,
} from "@/lib/applications/validation";
import { ApplyButton } from "@/components/events/apply-button";
import { FollowButton } from "@/components/conventions/follow-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface EventDetailPageProps {
  params: Promise<{ eventId: string }>;
}

function conventionInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function SectionCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6 md:p-8">
      <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </Card>
  );
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm">{children}</p>
    </div>
  );
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

  if (event.status === "draft") {
    notFound();
  }

  const amenities = event.amenities as Amenities | null;
  const conventionLogoUrl = event.conventionLogoPath
    ? storage.getUrl(event.conventionLogoPath)
    : null;

  const session = await auth();
  const isArtist =
    session?.user?.profileId && session.user.role === "artist";

  let hasExistingApplication = false;
  let isFollowingConvention = false;
  let validationResult: ValidationResult = { valid: true };

  if (isArtist) {
    const profileId = session.user.profileId!;

    const [[profile], [artistProfile], [{ value: imageCount }], [existingApp], [follow]] =
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
        db
          .select({ id: conventionFollows.id })
          .from(conventionFollows)
          .where(
            and(
              eq(conventionFollows.profileId, profileId),
              eq(conventionFollows.conventionId, event.conventionId)
            )
          ),
      ]);

    hasExistingApplication = !!existingApp;
    isFollowingConvention = !!follow;

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
    <div className="mx-auto max-w-4xl px-6 py-12 md:px-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={
            <Link href="/events" className="inline-flex items-center gap-1">
              <ArrowLeft className="size-4" />
              All events
            </Link>
          }
        />
      </div>

      <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-3">
          <Link
            href={`/conventions/${event.conventionId}`}
            className="group/conv inline-flex items-center gap-3"
          >
            <Avatar className="size-10 rounded-lg">
              {conventionLogoUrl && <AvatarImage src={conventionLogoUrl} alt="" />}
              <AvatarFallback className="rounded-lg bg-secondary text-xs font-semibold">
                {conventionInitials(event.conventionName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors group-hover/conv:text-primary">
              {event.conventionName}
            </span>
          </Link>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight md:text-5xl">
            {event.name}
          </h1>
          {event.status === "published" && event.applicationOpenDate && (
            <Badge variant="outline">
              Applications open {event.applicationOpenDate}
            </Badge>
          )}
          {event.status === "reviewing" && (
            <Badge variant="secondary">Applications under review</Badge>
          )}
          {event.status === "results_published" && (
            <Badge variant="success">Results published</Badge>
          )}
        </div>
        {isArtist && (
          <FollowButton
            conventionId={event.conventionId}
            isFollowing={isFollowingConvention}
          />
        )}
      </header>

      {event.description && (
        <div className="mt-8 max-w-3xl whitespace-pre-line text-base leading-relaxed text-muted-foreground">
          {event.description}
        </div>
      )}

      <div className="mt-12 space-y-6">
        <SectionCard label="Dates">
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Event">
              {event.eventStartDate}
              {event.eventEndDate && ` – ${event.eventEndDate}`}
            </DetailField>
            {event.applicationCloseDate && (
              <DetailField label="Application deadline">
                <span className="font-semibold text-destructive">
                  {event.applicationCloseDate}
                </span>
              </DetailField>
            )}
          </div>
        </SectionCard>

        {(event.venueName || event.venueCity) && (
          <SectionCard label="Location">
            <div className="space-y-1 text-sm">
              {event.venueName && (
                <p className="font-heading text-base font-bold">
                  {event.venueName}
                </p>
              )}
              {event.venueAddress && <p>{event.venueAddress}</p>}
              {(event.venueCity || event.venueCountry) && (
                <p className="text-muted-foreground">
                  {[event.venueCity, event.venueCountry]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>
          </SectionCard>
        )}

        {(event.availableStands || event.tableDimensions || event.priceInfo) && (
          <SectionCard label="Artist Logistics">
            <div className="grid gap-4 sm:grid-cols-2">
              {event.availableStands && (
                <DetailField label="Available stands">
                  {event.availableStands}
                </DetailField>
              )}
              {event.tableDimensions && (
                <DetailField label="Table dimensions">
                  {event.tableDimensions}
                </DetailField>
              )}
              {event.priceInfo && (
                <div className="sm:col-span-2">
                  <DetailField label="Price">{event.priceInfo}</DetailField>
                </div>
              )}
              {event.setupTime && (
                <DetailField label="Setup">{event.setupTime}</DetailField>
              )}
              {event.teardownTime && (
                <DetailField label="Teardown">{event.teardownTime}</DetailField>
              )}
            </div>
          </SectionCard>
        )}

        {amenities && (
          <SectionCard label="Provided Amenities">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {amenities.electricity && (
                  <Badge variant="outline">Electricity</Badge>
                )}
                {amenities.wifi && <Badge variant="outline">Wi-Fi</Badge>}
                {amenities.tables && <Badge variant="outline">Tables</Badge>}
                {amenities.chairs && <Badge variant="outline">Chairs</Badge>}
              </div>
              {amenities.other && (
                <p className="text-sm text-muted-foreground">
                  {amenities.other}
                </p>
              )}
            </div>
          </SectionCard>
        )}

        {isAccepting && (
          <SectionCard label="Apply">
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
                <Link
                  href="/login"
                  className="font-semibold text-primary underline underline-offset-4"
                >
                  Log in
                </Link>{" "}
                or{" "}
                <Link
                  href="/register"
                  className="font-semibold text-primary underline underline-offset-4"
                >
                  register
                </Link>{" "}
                as an artist to apply.
              </p>
            )}
          </SectionCard>
        )}
      </div>
    </div>
  );
}
