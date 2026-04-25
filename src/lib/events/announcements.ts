import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { eventAnnouncements } from "@/lib/db/schema/event-announcements";

export interface EventAnnouncement {
  id: string;
  subject: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getEventAnnouncements(
  eventId: string
): Promise<EventAnnouncement[]> {
  return db
    .select({
      id: eventAnnouncements.id,
      subject: eventAnnouncements.subject,
      body: eventAnnouncements.body,
      createdAt: eventAnnouncements.createdAt,
      updatedAt: eventAnnouncements.updatedAt,
    })
    .from(eventAnnouncements)
    .where(eq(eventAnnouncements.eventId, eventId))
    .orderBy(desc(eventAnnouncements.createdAt));
}
