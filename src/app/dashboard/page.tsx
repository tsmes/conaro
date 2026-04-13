import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, desc, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema/profiles";
import { artistProfiles } from "@/lib/db/schema/artist-profiles";
import { portfolioImages } from "@/lib/db/schema/portfolio-images";
import { applications } from "@/lib/db/schema/applications";
import { events } from "@/lib/db/schema/events";
import { conventions } from "@/lib/db/schema/conventions";
import { conventionFollows } from "@/lib/db/schema/convention-follows";
import { computeCompleteness } from "@/lib/profile/completeness";
import { storage } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CompletenessIndicator } from "@/components/profile/completeness-indicator";
import { styleForStatus } from "@/lib/applications/status-styles";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "artist") {
    redirect("/login");
  }

  const profileId = session.user.profileId;

  const [
    profileResult,
    artistProfileResult,
    countResult,
    applicationList,
    followedConventions,
  ] = await Promise.all([
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
      .select({
        id: applications.id,
        status: applications.status,
        responseMessage: applications.responseMessage,
        createdAt: applications.createdAt,
        eventName: events.name,
        eventId: events.id,
        eventStatus: events.status,
        conventionName: conventions.name,
      })
      .from(applications)
      .innerJoin(events, eq(events.id, applications.eventId))
      .innerJoin(conventions, eq(conventions.id, events.conventionId))
      .where(eq(applications.profileId, profileId))
      .orderBy(desc(applications.createdAt)),
    db
      .select({
        id: conventionFollows.id,
        conventionId: conventionFollows.conventionId,
        conventionName: conventions.name,
        conventionLogoPath: conventions.logoPath,
      })
      .from(conventionFollows)
      .innerJoin(conventions, eq(conventions.id, conventionFollows.conventionId))
      .where(eq(conventionFollows.profileId, profileId)),
  ]);

  const [profile] = profileResult;
  const [artistProfile] = artistProfileResult;
  const [{ value: imageCount }] = countResult;

  const completeness = computeCompleteness(profile, artistProfile, imageCount);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Track your applications and manage your profile.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Applications — takes 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Applications</h2>
            <Link href="/events">
              <Badge variant="outline">Browse Events</Badge>
            </Link>
          </div>

          {applicationList.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No applications yet.{" "}
                <Link
                  href="/events"
                  className="text-primary underline underline-offset-4"
                >
                  Browse events
                </Link>{" "}
                to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {applicationList.map((app) => {
                // Mask in-progress decisions: show "Under Review" while
                // event is in reviewing status (before results published)
                const displayStatus =
                  app.eventStatus === "reviewing" &&
                  app.status !== "submitted"
                    ? "under_review"
                    : app.status;

                const statusInfo = styleForStatus(displayStatus);

                return (
                  <Card key={app.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {app.conventionName}
                          </p>
                          <CardTitle className="text-base">
                            <Link
                              href={`/events/${app.eventId}`}
                              className="hover:underline"
                            >
                              {app.eventName}
                            </Link>
                          </CardTitle>
                        </div>
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <CardDescription>
                        Applied{" "}
                        {app.createdAt.toISOString().slice(0, 10)}
                      </CardDescription>
                    </CardHeader>
                    {app.responseMessage &&
                      app.eventStatus === "results_published" && (
                      <CardContent className="pt-0">
                        <p className="whitespace-pre-line text-sm text-muted-foreground">
                          {app.responseMessage}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar — profile + follows */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <CompletenessIndicator completeness={completeness} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Following</CardTitle>
            </CardHeader>
            <CardContent>
              {followedConventions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You&apos;re not following any conventions yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {followedConventions.map((follow) => {
                    const logoUrl = follow.conventionLogoPath
                      ? storage.getUrl(follow.conventionLogoPath)
                      : null;

                    return (
                      <Link
                        key={follow.id}
                        href={`/conventions/${follow.conventionId}`}
                        className="flex items-center gap-2 rounded-md p-2 hover:bg-muted"
                      >
                        {logoUrl && (
                          <img
                            src={logoUrl}
                            alt=""
                            className="h-6 w-6 rounded object-contain"
                          />
                        )}
                        <span className="text-sm font-medium">
                          {follow.conventionName}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
