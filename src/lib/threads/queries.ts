import { and, asc, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
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

  // Batch-fetch the latest message per thread so the inbox is 2 queries
  // total regardless of the number of threads.
  const threadIds = rows.map((r) => r.thread.id);
  const latestMessages = await db
    .select({
      id: eventThreadMessages.id,
      threadId: eventThreadMessages.threadId,
      body: eventThreadMessages.body,
      authorProfileId: eventThreadMessages.authorProfileId,
      createdAt: eventThreadMessages.createdAt,
    })
    .from(eventThreadMessages)
    .where(inArray(eventThreadMessages.threadId, threadIds))
    .orderBy(desc(eventThreadMessages.createdAt));

  const latestByThread = new Map<string, ThreadMessage>();
  for (const m of latestMessages) {
    if (!latestByThread.has(m.threadId)) {
      latestByThread.set(m.threadId, {
        id: m.id,
        body: m.body,
        authorProfileId: m.authorProfileId,
        createdAt: m.createdAt,
      });
    }
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

// Scalar "how many unread Q&A threads on this event?" for the organizer
// dashboard. A thread is unread when its latest message was authored by
// the artist AND the organizer hasn't opened the thread since (or ever).
// Single round-trip; correlated subquery picks the latest message.
export async function getUnreadThreadCountForEvent(
  eventId: string
): Promise<number> {
  const latestAuthorSubquery = sql<string>`(
    SELECT ${eventThreadMessages.authorProfileId}
    FROM ${eventThreadMessages}
    WHERE ${eventThreadMessages.threadId} = ${eventThreads.id}
    ORDER BY ${eventThreadMessages.createdAt} DESC
    LIMIT 1
  )`;

  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(eventThreads)
    .where(
      and(
        eq(eventThreads.eventId, eventId),
        or(
          isNull(eventThreads.organizerLastReadAt),
          gt(
            eventThreads.lastMessageAt,
            eventThreads.organizerLastReadAt
          )
        ),
        eq(latestAuthorSubquery, eventThreads.artistProfileId)
      )
    );

  return row?.value ?? 0;
}

// Full organizer inbox — threads + all messages per thread — fetched in
// exactly two queries regardless of N. Used by the organizer event page
// to prepopulate every thread dialog up front, avoiding the per-row
// `getThreadByIdForOrganizer` fan-out that previously created an
// O(N) query storm on page load.
export interface OrganizerInboxThread extends OrganizerInboxRow {
  messages: ThreadMessage[];
}

export async function getOrganizerInboxWithMessages(
  eventId: string
): Promise<OrganizerInboxThread[]> {
  const inbox = await getThreadsForOrganizer(eventId);
  if (inbox.length === 0) return [];

  const threadIds = inbox.map((r) => r.thread.id);
  const allMessages = await db
    .select({
      id: eventThreadMessages.id,
      threadId: eventThreadMessages.threadId,
      body: eventThreadMessages.body,
      authorProfileId: eventThreadMessages.authorProfileId,
      createdAt: eventThreadMessages.createdAt,
    })
    .from(eventThreadMessages)
    .where(inArray(eventThreadMessages.threadId, threadIds))
    .orderBy(asc(eventThreadMessages.createdAt));

  const messagesByThread = new Map<string, ThreadMessage[]>();
  for (const m of allMessages) {
    const bucket = messagesByThread.get(m.threadId);
    const entry = {
      id: m.id,
      body: m.body,
      authorProfileId: m.authorProfileId,
      createdAt: m.createdAt,
    };
    if (bucket) bucket.push(entry);
    else messagesByThread.set(m.threadId, [entry]);
  }

  return inbox.map((row) => ({
    ...row,
    messages: messagesByThread.get(row.thread.id) ?? [],
  }));
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
