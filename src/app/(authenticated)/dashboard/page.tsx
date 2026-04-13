import { redirect } from "next/navigation";
import { and, eq, desc, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema/profiles";
import { artistProfiles } from "@/lib/db/schema/artist-profiles";
import { portfolioImages } from "@/lib/db/schema/portfolio-images";
import { applications } from "@/lib/db/schema/applications";
import { events } from "@/lib/db/schema/events";
import { conventions } from "@/lib/db/schema/conventions";
import { conventionFollows } from "@/lib/db/schema/convention-follows";
import { notifications } from "@/lib/db/schema/notifications";
import { computeCompleteness } from "@/lib/profile/completeness";
import { storage } from "@/lib/storage";
import { DashboardView } from "@/components/dashboard/dashboard-view";

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
    unreadResult,
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
    db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientProfileId, profileId),
          eq(notifications.isRead, false)
        )
      ),
  ]);

  const [profile] = profileResult;
  const [artistProfile] = artistProfileResult;
  const [{ value: imageCount }] = countResult;
  const [{ value: unreadNotifications }] = unreadResult;

  const completeness = computeCompleteness(profile, artistProfile, imageCount);

  const firstName = (profile?.displayName ?? session.user.name ?? "")
    .trim()
    .split(/\s+/)[0] || "Artist";

  return (
    <DashboardView
      firstName={firstName}
      unreadNotifications={unreadNotifications}
      completeness={completeness}
      applications={applicationList.map((app) => ({
        id: app.id,
        status: app.status,
        eventStatus: app.eventStatus,
        createdAtISO: app.createdAt.toISOString(),
        eventName: app.eventName,
        eventId: app.eventId,
        conventionName: app.conventionName,
      }))}
      follows={followedConventions.map((f) => ({
        id: f.id,
        conventionId: f.conventionId,
        conventionName: f.conventionName,
        conventionLogoUrl: f.conventionLogoPath
          ? storage.getUrl(f.conventionLogoPath)
          : null,
      }))}
    />
  );
}
