import { notFound } from "next/navigation";

import {
  getCachedThreadForArtist,
  getEventViewerContext,
  hasAssignedTableForViewer,
} from "@/lib/events/event-context";
import { getEventAnnouncements } from "@/lib/events/announcements";
import { ApplicantContext } from "@/components/events/applicant-context";
import { EventThread } from "@/components/events/event-thread";
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { formatDateNo } from "@/lib/utils/format-date-no";

interface MessagesPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function MessagesPage({ params }: MessagesPageProps) {
  const { eventId } = await params;
  const ctx = await getEventViewerContext(eventId);

  // Only the accepted artist (with a thread) can reach this tab.
  if (!ctx.isAcceptedToEvent || !ctx.artistProfileId) notFound();
  const artistProfileId = ctx.artistProfileId;

  const [thread, announcements, hasAssignedTable] = await Promise.all([
    getCachedThreadForArtist(ctx.event.id, artistProfileId),
    getEventAnnouncements(ctx.event.id),
    hasAssignedTableForViewer(ctx),
  ]);
  if (!thread) notFound();

  const hasUnreadFromOrganizer = Boolean(
    thread.messages.length > 0 &&
      thread.messages[thread.messages.length - 1].authorProfileId !==
        artistProfileId &&
      (thread.thread.artistLastReadAt === null ||
        thread.messages[thread.messages.length - 1].createdAt >
          thread.thread.artistLastReadAt)
  );

  return (
    <div className="space-y-6">
      {ctx.ownApplicationStatus && (
        <ApplicantContext
          status={ctx.ownApplicationStatus}
          responseMessage={ctx.ownResponseMessage}
          eventId={ctx.event.id}
          hasAssignedTable={hasAssignedTable}
          waitlistEnabled={ctx.event.waitlistEnabled ?? false}
        />
      )}
      <Card className="p-6 md:p-8">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Messages
        </p>
        <EventThread
          eventId={ctx.event.id}
          threadId={thread.thread.id}
          messages={thread.messages.map((m) => ({
            id: m.id,
            body: m.body,
            authorIsArtist: m.authorProfileId === artistProfileId,
            createdAt: m.createdAt,
          }))}
          hasUnreadFromOrganizer={hasUnreadFromOrganizer}
        />
      </Card>

      {announcements.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Organizer updates
            </p>
            <span className="font-mono text-[11px] text-muted-foreground">
              {announcements.length}
            </span>
          </div>
          <div className="space-y-3">
            {announcements.map((a) => {
              const edited =
                a.updatedAt.getTime() - a.createdAt.getTime() > 1000;
              return (
                <Card key={a.id} className="p-5">
                  <h3 className="font-heading text-lg font-bold leading-tight">
                    {a.subject}
                  </h3>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {formatDateNo(a.createdAt.toISOString().slice(0, 10))}
                    {edited && " · edited"}
                  </p>
                  <Markdown source={a.body} className="mt-3 text-foreground" />
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
