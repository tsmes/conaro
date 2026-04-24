import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import { profiles } from "@/lib/db/schema/profiles";
import {
  getApplicationCounts,
  getCurrentEventForConvention,
  getOrganizerConvention,
} from "@/lib/conventions/queries";
import { getUnreadThreadCountForEvent } from "@/lib/threads/queries";
import { getRecentAnnouncementsForConvention } from "@/app/(authenticated)/conventions/manage/events/[eventId]/announcements/actions";
import { OrganizerDashboardView } from "@/components/conventions/organizer-dashboard-view";

export default async function ConventionManagePage() {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    redirect("/login");
  }
  const profileId = session.user.profileId;

  const convention = await getOrganizerConvention(profileId);
  if (!convention) {
    redirect("/login");
  }

  // Stage 1 — run every non-event-scoped fetch in parallel.
  const [profileRow, currentEvent, recentAnnouncements, allEvents] =
    await Promise.all([
      db
        .select({ displayName: profiles.displayName })
        .from(profiles)
        .where(eq(profiles.id, profileId))
        .then((rows) => rows[0] ?? null),
      getCurrentEventForConvention(convention.id),
      getRecentAnnouncementsForConvention(convention.id, 3),
      db
        .select()
        .from(events)
        .where(eq(events.conventionId, convention.id))
        .orderBy(desc(events.createdAt)),
    ]);

  // Stage 2 — only if we have a current event, fetch its per-event counts.
  const eventAggregates = currentEvent
    ? await Promise.all([
        getApplicationCounts(currentEvent.id),
        getUnreadThreadCountForEvent(currentEvent.id),
      ])
    : null;

  const firstName =
    (profileRow?.displayName ?? session.user.name ?? "")
      .trim()
      .split(/\s+/)[0] || "Organizer";

  return (
    <OrganizerDashboardView
      firstName={firstName}
      conventionName={convention.name}
      currentEvent={
        currentEvent && eventAggregates
          ? {
              id: currentEvent.id,
              name: currentEvent.name,
              status: currentEvent.status,
              eventStartDate: currentEvent.eventStartDate,
              eventEndDate: currentEvent.eventEndDate,
              applicationCount: eventAggregates[0].total,
              acceptedCount: eventAggregates[0].accepted,
              unreadThreadCount: eventAggregates[1],
            }
          : null
      }
      recentAnnouncements={recentAnnouncements}
      events={allEvents.map((e) => ({
        id: e.id,
        name: e.name,
        status: e.status,
        eventStartDate: e.eventStartDate,
        eventEndDate: e.eventEndDate,
        venueCity: e.venueCity,
        venueCountry: e.venueCountry,
        availableStands: e.availableStands,
      }))}
    />
  );
}
