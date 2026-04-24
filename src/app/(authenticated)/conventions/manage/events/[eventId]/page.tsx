import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ListChecks, Sliders } from "lucide-react";
import { eq, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applications } from "@/lib/db/schema/applications";
import type { Amenities } from "@/lib/db/schema/events";
import {
  getOrganizerConvention,
  getOrganizerEvent,
} from "@/lib/conventions/queries";
import {
  updateEvent,
  openApplications,
  closeApplications,
  publishEvent,
} from "@/app/(authenticated)/conventions/manage/events/actions";
import { EventForm } from "@/components/conventions/event-form";
import { EventStatusControls } from "@/components/conventions/event-status-controls";
import { AnnouncementsEditor } from "@/components/conventions/announcements-editor";
import { getEventAnnouncements } from "@/app/(authenticated)/conventions/manage/events/[eventId]/announcements/actions";
import { ThreadInbox } from "@/components/conventions/thread-inbox";
import { getOrganizerInboxWithMessages } from "@/lib/threads/queries";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface EventDetailPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  const { eventId } = await params;

  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    redirect("/login");
  }

  const event = await getOrganizerEvent(session.user.profileId, eventId);
  const convention = await getOrganizerConvention(session.user.profileId);
  if (!event || !convention) {
    notFound();
  }

  // Organizers can view the applications list in any status from
  // accepting_applications onwards — before reviewing it's read-only, which
  // is enforced inside SelectionWorkspace via eventStatus.
  const showReviewLink =
    event.status === "accepting_applications" ||
    event.status === "reviewing" ||
    event.status === "results_published";
  let applicationCount = 0;
  if (showReviewLink) {
    const [{ value }] = await db
      .select({ value: count() })
      .from(applications)
      .where(eq(applications.eventId, event.id));
    applicationCount = value;
  }

  const amenities = event.amenities as Amenities | null;
  const announcements = await getEventAnnouncements(event.id);
  const inboxRows = await getOrganizerInboxWithMessages(event.id);
  const inboxThreads = inboxRows.map((row) => ({
    threadId: row.thread.id,
    artistProfileId: row.thread.artistProfileId,
    artistDisplayName: row.artistDisplayName,
    lastMessageAt: row.thread.lastMessageAt,
    lastMessagePreview: row.lastMessagePreview,
    unreadForOrganizer: row.unreadForOrganizer,
    messages: row.messages.map((m) => ({
      id: m.id,
      body: m.body,
      authorIsArtist: m.authorProfileId === row.thread.artistProfileId,
      createdAt: m.createdAt,
    })),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-10 md:px-8">
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
          Event
        </p>
        <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight">
          {event.name}
        </h1>
      </header>

      <Card className="p-6 md:p-8">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Lifecycle
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <EventStatusControls
            eventId={event.id}
            currentStatus={event.status}
            publishAction={publishEvent}
            openAction={openApplications}
            closeAction={closeApplications}
          />
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link href={`/conventions/manage/events/${event.id}/fields`}>
                <Sliders className="size-4" />
                Field configuration
              </Link>
            }
          />
          {showReviewLink && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link href={`/conventions/manage/events/${event.id}/applications`}>
                  <ListChecks className="size-4" />
                  Review applications ({applicationCount})
                </Link>
              }
            />
          )}
        </div>
      </Card>

      {event.status === "results_published" && (
        <Card className="p-6 md:p-8">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Announcements
          </p>
          <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight">
            Messages to accepted artists
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use this for pre-event logistics, day-of updates, and anything
            else accepted artists need before or during the event.
          </p>
          <div className="mt-6">
            <AnnouncementsEditor
              eventId={event.id}
              announcements={announcements}
            />
          </div>
        </Card>
      )}

      {event.status === "results_published" && (
        <Card className="p-6 md:p-8">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Inbox
          </p>
          <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight">
            Questions from artists
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Private Q&A threads. Replies go to the asker; tick
            &ldquo;Also post as announcement&rdquo; to share an answer
            with every accepted artist in one go.
          </p>
          <div className="mt-6">
            <ThreadInbox eventId={event.id} threads={inboxThreads} />
          </div>
        </Card>
      )}

      <Card className="p-8 md:p-10">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Details
        </p>
        <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight">
          Edit event details
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Save changes anytime. Artists see the latest version on the public
          event page.
        </p>
        <div className="mt-8">
          <EventForm
            action={updateEvent}
            defaultValues={{
              eventId: event.id,
              name: event.name,
              description: event.description ?? "",
              eventStartDate: event.eventStartDate,
              eventEndDate: event.eventEndDate ?? "",
              applicationOpenDate: event.applicationOpenDate ?? "",
              applicationCloseDate: event.applicationCloseDate ?? "",
              venueName: event.venueName ?? "",
              venueAddress: event.venueAddress ?? "",
              venueCity: event.venueCity ?? "",
              venueCountry: event.venueCountry ?? "",
              mapEmbedUrl: event.mapEmbedUrl ?? "",
              availableStands: event.availableStands,
              tableDimensions: event.tableDimensions ?? "",
              priceInfo: event.priceInfo ?? "",
              setupTime: event.setupTime ?? "",
              teardownTime: event.teardownTime ?? "",
              amenities_electricity: amenities?.electricity ?? false,
              amenities_wifi: amenities?.wifi ?? false,
              amenities_tables: amenities?.tables ?? false,
              amenities_chairs: amenities?.chairs ?? false,
              amenities_other: amenities?.other ?? "",
              guidelinesOverride: event.guidelinesOverride ?? "",
              tableSizeOptions: event.tableSizeOptions ?? [],
              maxAssistants: event.maxAssistants ?? 0,
              assistantFeeNok: event.assistantFeeNok ?? null,
              acceptanceMessage: event.acceptanceMessage ?? "",
              rejectionMessage: event.rejectionMessage ?? "",
              conventionAcceptanceMessage: convention.acceptanceMessage,
              conventionRejectionMessage: convention.rejectionMessage,
              conventionName: convention.name,
              organizerName: session.user.name ?? undefined,
            }}
            submitLabel="Save changes"
          />
        </div>
      </Card>
    </div>
  );
}
