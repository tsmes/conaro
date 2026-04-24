import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  eventThreads,
  eventThreadMessages,
} from "@/lib/db/schema/event-threads";
import { profiles } from "@/lib/db/schema/profiles";

export interface ThreadMessage {
  id: string;
  body: string;
  authorProfileId: string;
  createdAt: Date;
}

export interface Thread {
  id: string;
  eventId: string;
  artistProfileId: string;
  lastMessageAt: Date;
  artistLastReadAt: Date | null;
  organizerLastReadAt: Date | null;
  createdAt: Date;
}

export interface ThreadWithMessages {
  thread: Thread;
  messages: ThreadMessage[];
}

export interface OrganizerInboxRow {
  thread: Thread;
  artistDisplayName: string;
  lastMessagePreview: string | null;
  lastAuthorIsArtist: boolean;
  unreadForOrganizer: boolean;
}

// Artist-side read. Returns null when the artist hasn't posted yet.
export async function getThreadForArtist(
  eventId: string,
  artistProfileId: string
): Promise<ThreadWithMessages | null> {
  const [thread] = await db
    .select()
    .from(eventThreads)
    .where(
      and(
        eq(eventThreads.eventId, eventId),
        eq(eventThreads.artistProfileId, artistProfileId)
      )
    );

  if (!thread) return null;

  const messages = await db
    .select({
      id: eventThreadMessages.id,
      body: eventThreadMessages.body,
      authorProfileId: eventThreadMessages.authorProfileId,
      createdAt: eventThreadMessages.createdAt,
    })
    .from(eventThreadMessages)
    .where(eq(eventThreadMessages.threadId, thread.id))
    .orderBy(asc(eventThreadMessages.createdAt));

  return { thread, messages };
}

// Organizer inbox — every thread on the event, most-recent activity first.
// unreadForOrganizer is true when the artist is the last author and they
// posted after the organizer last opened the thread.
export async function getThreadsForOrganizer(
  eventId: string
): Promise<OrganizerInboxRow[]> {
  const rows = await db
    .select({
      thread: eventThreads,
      artistDisplayName: profiles.displayName,
    })
    .from(eventThreads)
    .innerJoin(profiles, eq(profiles.id, eventThreads.artistProfileId))
    .where(eq(eventThreads.eventId, eventId))
    .orderBy(desc(eventThreads.lastMessageAt));

  if (rows.length === 0) return [];

  // Fetch the latest message per thread so the inbox row can show a
  // preview without a second round-trip per row.
  const latestByThread = new Map<string, ThreadMessage>();
  for (const row of rows) {
    const [latest] = await db
      .select({
        id: eventThreadMessages.id,
        body: eventThreadMessages.body,
        authorProfileId: eventThreadMessages.authorProfileId,
        createdAt: eventThreadMessages.createdAt,
      })
      .from(eventThreadMessages)
      .where(eq(eventThreadMessages.threadId, row.thread.id))
      .orderBy(desc(eventThreadMessages.createdAt))
      .limit(1);
    if (latest) latestByThread.set(row.thread.id, latest);
  }

  return rows.map((row) => {
    const latest = latestByThread.get(row.thread.id) ?? null;
    const lastAuthorIsArtist =
      latest?.authorProfileId === row.thread.artistProfileId;
    const unreadForOrganizer =
      lastAuthorIsArtist &&
      (row.thread.organizerLastReadAt === null ||
        row.thread.lastMessageAt > row.thread.organizerLastReadAt);
    return {
      thread: row.thread,
      artistDisplayName: row.artistDisplayName,
      lastMessagePreview: latest?.body ?? null,
      lastAuthorIsArtist,
      unreadForOrganizer,
    };
  });
}

// Full thread + messages + artist identity for the dialog contents.
export async function getThreadByIdForOrganizer(
  eventId: string,
  threadId: string
): Promise<(ThreadWithMessages & { artistDisplayName: string }) | null> {
  const [row] = await db
    .select({
      thread: eventThreads,
      artistDisplayName: profiles.displayName,
    })
    .from(eventThreads)
    .innerJoin(profiles, eq(profiles.id, eventThreads.artistProfileId))
    .where(
      and(eq(eventThreads.id, threadId), eq(eventThreads.eventId, eventId))
    );

  if (!row) return null;

  const messages = await db
    .select({
      id: eventThreadMessages.id,
      body: eventThreadMessages.body,
      authorProfileId: eventThreadMessages.authorProfileId,
      createdAt: eventThreadMessages.createdAt,
    })
    .from(eventThreadMessages)
    .where(eq(eventThreadMessages.threadId, threadId))
    .orderBy(asc(eventThreadMessages.createdAt));

  return {
    thread: row.thread,
    artistDisplayName: row.artistDisplayName,
    messages,
  };
}
