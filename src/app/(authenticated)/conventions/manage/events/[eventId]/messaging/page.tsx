import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrganizerEvent } from "@/lib/conventions/queries";
import { AnnouncementsEditor } from "@/components/conventions/announcements-editor";
import { getEventAnnouncements } from "@/lib/events/announcements";
import { ThreadInbox } from "@/components/conventions/thread-inbox";
import { getOrganizerInboxWithMessages } from "@/lib/threads/queries";
import { Card } from "@/components/ui/card";

interface MessagingPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function MessagingPage({ params }: MessagingPageProps) {
  const { eventId } = await params;

  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    redirect("/login");
  }

  const event = await getOrganizerEvent(session.user.profileId, eventId);
  if (!event) notFound();
  if (event.status !== "results_published") {
    redirect(`/conventions/manage/events/${eventId}`);
  }

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
    <div className="mx-auto max-w-4xl space-y-10">
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

      <Card className="p-6 md:p-8">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Inbox
        </p>
        <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight">
          Questions from artists
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Private Q&amp;A threads. Replies go to the asker; tick
          &ldquo;Also post as announcement&rdquo; to share an answer with
          every accepted artist in one go.
        </p>
        <div className="mt-6">
          <ThreadInbox eventId={event.id} threads={inboxThreads} />
        </div>
      </Card>
    </div>
  );
}
