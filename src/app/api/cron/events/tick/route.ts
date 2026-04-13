import { NextRequest, NextResponse } from "next/server";
import { and, eq, lte, lt, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import { notifyEventOpened } from "@/lib/notifications/triggers";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayUtc = new Date().toISOString().slice(0, 10);

  // Transition published -> accepting_applications
  const toOpen = await db
    .select({
      id: events.id,
      name: events.name,
      conventionId: events.conventionId,
    })
    .from(events)
    .where(
      and(
        eq(events.status, "published"),
        isNotNull(events.applicationOpenDate),
        lte(events.applicationOpenDate, todayUtc)
      )
    );

  let opened = 0;
  for (const event of toOpen) {
    try {
      await db
        .update(events)
        .set({ status: "accepting_applications", updatedAt: new Date() })
        .where(eq(events.id, event.id));

      opened += 1;

      try {
        await notifyEventOpened(event.id, event.name, event.conventionId);
      } catch (error) {
        console.error(
          `Failed to send event opened notifications for event ${event.id}:`,
          error
        );
      }
    } catch (error) {
      console.error(`Failed to open applications for event ${event.id}:`, error);
    }
  }

  // Transition accepting_applications -> reviewing
  const toClose = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.status, "accepting_applications"),
        isNotNull(events.applicationCloseDate),
        lt(events.applicationCloseDate, todayUtc)
      )
    );

  let closed = 0;
  for (const event of toClose) {
    try {
      await db
        .update(events)
        .set({ status: "reviewing", updatedAt: new Date() })
        .where(eq(events.id, event.id));
      closed += 1;
    } catch (error) {
      console.error(`Failed to close applications for event ${event.id}:`, error);
    }
  }

  return NextResponse.json({ opened, closed });
}
