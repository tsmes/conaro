import { notFound } from "next/navigation";

import {
  getCachedThreadForArtist,
  getEventViewerContext,
} from "@/lib/events/event-context";
import { EventThread } from "@/components/events/event-thread";
import { Card } from "@/components/ui/card";

interface MessagesPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function MessagesPage({ params }: MessagesPageProps) {
  const { eventId } = await params;
  const ctx = await getEventViewerContext(eventId);

  // Only the accepted artist (with a thread) can reach this tab.
  if (!ctx.isAcceptedToEvent || !ctx.artistProfileId) notFound();
  const artistProfileId = ctx.artistProfileId;

  const thread = await getCachedThreadForArtist(ctx.event.id, artistProfileId);
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
  );
}
